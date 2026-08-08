import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, createStripeClient, verifyWebhook } from "@/lib/stripe.server";
import { resolveServerStripeEnv } from "@/lib/payments-env.server";

let _supabase: any = null;
function getSupabase(): any {
  if (!_supabase) {
    _supabase = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
    );
  }
  return _supabase;
}

/** Single source of truth for access: only the webhook grants entitlements. */
async function fulfil(sessionFromEvent: any, env: StripeEnv) {
  // Re-read the session from Stripe with this environment's credentials.
  // A signed event is already trusted, but re-fetching guarantees the payment
  // state is the current one held by Stripe and that the session really
  // belongs to this environment's account.
  let session: any;
  try {
    session = await createStripeClient(env).checkout.sessions.retrieve(sessionFromEvent.id, {
      expand: ["line_items.data.price"],
    });
  } catch (e) {
    console.error("Could not retrieve checkout session from Stripe", sessionFromEvent?.id, e);
    return;
  }

  if (session.mode !== "payment") {
    console.error("Ignoring non one-time checkout session", session.id, session.mode);
    return;
  }

  // The user_id comes exclusively from the server-side checkout metadata
  // (derived from the authenticated Supabase token). The Stripe customer
  // email is never used as an identity proof.
  const userId = session.metadata?.user_id;
  const productId = session.metadata?.product_id;
  const sessionEnv = session.metadata?.environment;
  if (!userId || !productId) {
    console.error("Checkout session without user_id/product_id metadata", session.id);
    return;
  }
  if (sessionEnv && sessionEnv !== env) {
    console.error("Session environment mismatch", session.id, sessionEnv, env);
    return;
  }

  const supabase = getSupabase();

  // The product must exist and still be the one the session was created for.
  const { data: product, error: productLookupError } = await supabase
    .from("products")
    .select("id, price, currency, stripe_price_id, status")
    .eq("id", productId)
    .maybeSingle();

  if (productLookupError || !product) {
    console.error("Unknown product in session metadata", session.id, productId);
    return;
  }

  const isFree = Number(product["price"]) <= 0;

  // Paid products require an actually received payment. `no_payment_required`
  // is only acceptable for genuinely free products (explicit, separate logic).
  if (isFree) {
    if (!["paid", "no_payment_required"].includes(session.payment_status)) {
      console.error("Refusing to fulfil free product session", session.id, session.payment_status);
      return;
    }
  } else if (session.payment_status !== "paid") {
    console.error("Refusing to fulfil unpaid session", session.id, session.payment_status);
    return;
  }

  // What was actually paid must match the price registered for the product.
  const lineItems = session.line_items?.data ?? [];
  if (lineItems.length !== 1) {
    console.error("Unexpected line item count", session.id, lineItems.length);
    return;
  }
  const paidPrice = lineItems[0]?.price;
  const expectedPriceId = product["stripe_price_id"];
  const paidPriceIdentifiers = [paidPrice?.lookup_key, paidPrice?.metadata?.lovable_external_id, paidPrice?.id]
    .filter(Boolean);
  if (!expectedPriceId || !paidPriceIdentifiers.includes(expectedPriceId)) {
    console.error("Price mismatch for session", session.id, paidPriceIdentifiers, expectedPriceId);
    return;
  }
  if (paidPrice?.livemode !== undefined && paidPrice.livemode !== (env === "live")) {
    console.error("Price livemode mismatch", session.id, paidPrice.livemode, env);
    return;
  }
  // Amount check: compare the PRODUCT price, not the session total.
  // With tax collection enabled `amount_total` includes tax/fees, so the
  // authoritative figure is the unit amount of the paid price (falling back to
  // the pre-tax subtotal when the price is metered/absent).
  const expectedCents = Math.round(Number(product["price"]) * 100);
  const paidUnitAmount =
    typeof paidPrice?.unit_amount === "number"
      ? paidPrice.unit_amount * Number(lineItems[0]?.quantity ?? 1)
      : typeof session.amount_subtotal === "number"
        ? session.amount_subtotal
        : null;
  if (!isFree && typeof paidUnitAmount === "number" && expectedCents !== paidUnitAmount) {
    console.error("Amount mismatch", session.id, paidUnitAmount, product["price"]);
    return;
  }

  if (
    !isFree &&
    session.currency &&
    String(product["currency"]).toLowerCase() !== String(session.currency).toLowerCase()
  ) {
    console.error("Currency mismatch", session.id, session.currency, product["currency"]);
    return;
  }

  const amount = typeof session.amount_total === "number" ? session.amount_total / 100 : null;

  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .upsert(
      {
        user_id: userId,
        product_id: productId,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? null),
        amount_paid: amount,
        currency: (session.currency ?? "eur").toUpperCase(),
        status: "paid",
        environment: env,
        purchased_at: new Date().toISOString(),
      },
      { onConflict: "stripe_checkout_session_id" },
    )
    .select("id")
    .maybeSingle();

  if (purchaseError) {
    console.error("Failed to record purchase", purchaseError);
    return;
  }

  const { grantEntitlement, grantBundleContents } = await import("@/lib/entitlements.server");

  await grantEntitlement(supabase, {
    userId,
    productId,
    environment: env,
    source: "purchase",
    purchaseId: purchase?.["id"] ?? null,
  });

  // A bundle also unlocks the products explicitly listed for it (server-side
  // list only); a normal product simply has no rows here.
  await grantBundleContents(supabase, {
    userId,
    bundleProductId: productId,
    environment: env,
    purchaseId: purchase?.["id"] ?? null,
  });

  // Confirmation email — strictly after the entitlement exists.
  await deliverPurchaseEmail({
    supabase,
    purchaseId: purchase?.["id"] ?? null,
    userId,
    productId,
    env,
  });
}

/**
 * One-time post-purchase confirmation email.
 *
 * Duplicate protection: a unique row per purchase in `purchase_emails` is
 * inserted BEFORE sending; a webhook retry hits the unique constraint and
 * exits. Admins (role-based access) are skipped, and gifts never reach here.
 */
async function deliverPurchaseEmail(args: {
  supabase: any;
  purchaseId: string | null;
  userId: string;
  productId: string;
  env: StripeEnv;
}) {
  const { supabase, purchaseId, userId, productId, env } = args;
  if (!purchaseId) return;

  try {
    // Entitlement must really exist and be active before anything is sent.
    const { data: entitlement } = await supabase
      .from("entitlements")
      .select("id")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .eq("environment", env)
      .eq("is_active", true)
      .maybeSingle();
    if (!entitlement) return;

    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (adminRole) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, display_name, preferred_language")
      .eq("id", userId)
      .maybeSingle();

    const recipient = profile?.["email"];
    if (!recipient) return;

    // State machine: pending → sent | failed. A row is created (or reused)
    // before sending; only `sent` blocks a retry. A `locked_at` lease prevents
    // two concurrent webhook deliveries from sending the same email twice.
    await supabase.from("purchase_emails").insert({
      purchase_id: purchaseId,
      user_id: userId,
      product_id: productId,
      environment: env,
      recipient_email: recipient,
      status: "pending",
      attempts: 0,
    });

    const staleLock = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: claimed } = await supabase
      .from("purchase_emails")
      .update({
        status: "pending",
        recipient_email: recipient,
        locked_at: new Date().toISOString(),
      })
      .eq("purchase_id", purchaseId)
      .neq("status", "sent")
      .or(`locked_at.is.null,locked_at.lt.${staleLock}`)
      .select("id, attempts");

    // Already sent, or another delivery is in flight → nothing to do.
    if (!claimed || claimed.length === 0) return;
    const attempts = Number(claimed[0]?.["attempts"] ?? 0) + 1;

    const { data: product } = await supabase
      .from("products")
      .select("name_it, name_en")
      .eq("id", productId)
      .maybeSingle();

    const { sendPurchaseEmail, resolvePurchaseEmailLang } = await import(
      "@/lib/purchase-email.server"
    );
    const lang = resolvePurchaseEmailLang(profile?.["preferred_language"]);
    const productName =
      (lang === "it" ? product?.["name_it"] : (product?.["name_en"] ?? product?.["name_it"])) ??
      "MINI WEB APPS";

    let result: { sent: boolean; error?: string; messageId?: string | null };
    try {
      result = await sendPurchaseEmail({
        recipientEmail: String(recipient),
        productName: String(productName),
        firstName: (profile?.["display_name"] as string | null) ?? null,
        lang,
      });
    } catch (e) {
      result = { sent: false, error: e instanceof Error ? e.message : String(e) };
    }

    await supabase
      .from("purchase_emails")
      .update(
        result.sent
          ? {
              status: "sent",
              sent_at: new Date().toISOString(),
              message_id: result.messageId ?? null,
              error: null,
              attempts,
              locked_at: null,
            }
          : {
              status: "failed",
              sent_at: null,
              error: (result.error ?? "unknown_error").slice(0, 500),
              attempts,
              locked_at: null,
            },
      )
      .eq("purchase_id", purchaseId);

    if (!result.sent) console.error("Purchase email not delivered", purchaseId, result.error);
  } catch (e) {
    console.error("Purchase email step failed", purchaseId, e);
    // Release the lease so a later webhook retry can attempt again.
    try {
      await supabase
        .from("purchase_emails")
        .update({ status: "failed", locked_at: null, error: String(e).slice(0, 500) })
        .eq("purchase_id", purchaseId)
        .neq("status", "sent");
    } catch {
      /* best effort */
    }
  }
}



/**
 * Gift fulfilment. Runs the SAME validations as a normal purchase
 * (product identity, payment_status, price id, livemode, amount, currency)
 * but grants NO entitlement: the gift only becomes redeemable.
 */
async function fulfilGift(sessionFromEvent: any, env: StripeEnv, origin: string) {
  let session: any;
  try {
    session = await createStripeClient(env).checkout.sessions.retrieve(sessionFromEvent.id, {
      expand: ["line_items.data.price"],
    });
  } catch (e) {
    console.error("Could not retrieve gift session", sessionFromEvent?.id, e);
    return;
  }

  if (session.mode !== "payment") return;

  const giftId = session.metadata?.gift_id;
  const productId = session.metadata?.product_id;
  const sessionEnv = session.metadata?.environment;
  if (!giftId || !productId) {
    console.error("Gift session without gift_id/product_id", session.id);
    return;
  }
  if (sessionEnv && sessionEnv !== env) {
    console.error("Gift session environment mismatch", session.id, sessionEnv, env);
    return;
  }

  const supabase = getSupabase();

  const { data: gift } = await supabase
    .from("gifts")
    .select("id, product_id, status, environment")
    .eq("id", giftId)
    .maybeSingle();

  if (!gift) {
    console.error("Unknown gift", giftId);
    return;
  }
  if (gift["environment"] !== env) {
    console.error("Gift environment mismatch", giftId, gift["environment"], env);
    return;
  }
  // The product is taken from the gift row (server-side truth) and must match
  // the product the session was created for.
  if (gift["product_id"] !== productId) {
    console.error("Gift product mismatch", giftId, gift["product_id"], productId);
    return;
  }
  if (gift["status"] !== "pending") {
    console.error("Gift not pending, ignoring", giftId, gift["status"]);
    return;
  }

  const { data: product } = await supabase
    .from("products")
    .select("id, price, currency, stripe_price_id")
    .eq("id", gift["product_id"])
    .maybeSingle();

  if (!product) {
    console.error("Unknown product for gift", giftId);
    return;
  }

  if (session.payment_status !== "paid") {
    console.error("Refusing to fulfil unpaid gift session", session.id, session.payment_status);
    return;
  }

  const lineItems = session.line_items?.data ?? [];
  if (lineItems.length !== 1) {
    console.error("Unexpected gift line item count", session.id, lineItems.length);
    return;
  }
  const paidPrice = lineItems[0]?.price;
  const expectedPriceId = product["stripe_price_id"];
  const paidPriceIdentifiers = [
    paidPrice?.lookup_key,
    paidPrice?.metadata?.lovable_external_id,
    paidPrice?.id,
  ].filter(Boolean);
  if (!expectedPriceId || !paidPriceIdentifiers.includes(expectedPriceId)) {
    console.error("Gift price mismatch", session.id, paidPriceIdentifiers, expectedPriceId);
    return;
  }
  if (paidPrice?.livemode !== undefined && paidPrice.livemode !== (env === "live")) {
    console.error("Gift price livemode mismatch", session.id, paidPrice.livemode, env);
    return;
  }
  // Same rule as a normal purchase: tax is excluded from the comparison.
  const giftPaidUnitAmount =
    typeof paidPrice?.unit_amount === "number"
      ? paidPrice.unit_amount * Number(lineItems[0]?.quantity ?? 1)
      : typeof session.amount_subtotal === "number"
        ? session.amount_subtotal
        : null;
  if (
    typeof giftPaidUnitAmount === "number" &&
    Math.round(Number(product["price"]) * 100) !== giftPaidUnitAmount
  ) {
    console.error("Gift amount mismatch", session.id, giftPaidUnitAmount, product["price"]);
    return;
  }

  if (
    session.currency &&
    String(product["currency"]).toLowerCase() !== String(session.currency).toLowerCase()
  ) {
    console.error("Gift currency mismatch", session.id, session.currency, product["currency"]);
    return;
  }

  const { error } = await supabase
    .from("gifts")
    .update({
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent?.id ?? null),
      amount_paid: typeof session.amount_total === "number" ? session.amount_total / 100 : null,
      currency: (session.currency ?? "eur").toUpperCase(),
      purchased_at: new Date().toISOString(),
      status: "pending",
    })
    .eq("id", giftId)
    .eq("environment", env);

  // NOTE: intentionally no entitlement here — the gift stays `pending` until
  // the recipient redeems the token with an authenticated account.
  if (error) {
    console.error("Failed to mark gift as paid", error);
    return;
  }

  // Delivery happens only now, after a signed confirmation of THIS payment.
  await deliverGiftEmail(giftId, origin);
}

/**
 * Sends the redemption email. The plaintext token exists only in memory here,
 * decrypted from the ciphertext stored at checkout time.
 */
export async function deliverGiftEmail(giftId: string, origin: string) {
  const supabase = getSupabase();
  const { data: gift } = await supabase
    .from("gifts")
    .select(
      "id, recipient_email, gift_message, redemption_token_encrypted, purchased_at, status, email_sent_at, email_attempts, products(name_it, name_en)",
    )
    .eq("id", giftId)
    .maybeSingle();

  if (!gift || !gift["purchased_at"] || gift["status"] !== "pending") return;
  if (gift["email_sent_at"]) return;

  const { decryptGiftToken } = await import("@/lib/gift-token.server");
  const { sendGiftEmail } = await import("@/lib/gift-email.server");

  const token = await decryptGiftToken((gift["redemption_token_encrypted"] as string) ?? null);
  const attempts = Number(gift["email_attempts"] ?? 0) + 1;

  if (!token) {
    await supabase
      .from("gifts")
      .update({ email_error: "token_unavailable", email_attempts: attempts })
      .eq("id", giftId);
    return;
  }

  const recipient = String(gift["recipient_email"]);
  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_language")
    .eq("email", recipient)
    .maybeSingle();
  const lang = profile?.["preferred_language"] === "en" ? "en" : "it";
  const product: any = (gift as any).products ?? {};

  const result = await sendGiftEmail({
    recipientEmail: recipient,
    productName: (lang === "en" ? product.name_en : product.name_it) ?? "MINI WEB APPS",
    giftMessage: (gift["gift_message"] as string) ?? null,
    redeemUrl: `${origin}/redeem/${token}`,
    lang,
  });

  await supabase
    .from("gifts")
    .update({
      email_attempts: attempts,
      email_sent_at: result.sent ? new Date().toISOString() : null,
      email_error: result.sent ? null : (result.error ?? "unknown_error"),
    })
    .eq("id", giftId);

  if (!result.sent) console.error("Gift email not delivered", giftId, result.error);
}

/** Refund of a gift: revoke it, and any entitlement it already produced. */
async function handleGiftRefund(paymentIntentId: string, env: StripeEnv) {
  const supabase = getSupabase();
  const { data: gift } = await supabase
    .from("gifts")
    .select("id, product_id, status, redeemed_by_user_id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .eq("environment", env)
    .maybeSingle();

  if (!gift) return;

  if (gift["redeemed_by_user_id"]) {
    await supabase
      .from("entitlements")
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq("user_id", gift["redeemed_by_user_id"])
      .eq("product_id", gift["product_id"])
      .eq("environment", env);
  }

  await supabase.from("gifts").update({ status: "refunded" }).eq("id", gift["id"]);
}

async function markStatus(session: any, status: string, env: StripeEnv) {
  if (!session?.id) return;
  await getSupabase()
    .from("purchases")
    .update({ status })
    .eq("stripe_checkout_session_id", session.id)
    .eq("environment", env);
}

/**
 * Full refund / chargeback handling. Idempotent: the purchase row is kept for
 * audit and only its status changes, and the entitlement is deactivated.
 */
async function handleRefund(charge: any, env: StripeEnv, status: "refunded") {
  const paymentIntentId =
    typeof charge?.payment_intent === "string" ? charge.payment_intent : charge?.payment_intent?.id;
  if (!paymentIntentId) return;

  const supabase = getSupabase();
  const { data: purchase } = await supabase
    .from("purchases")
    .select("id, user_id, product_id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .eq("environment", env)
    .maybeSingle();

  if (!purchase) {
    console.error("Refund for unknown purchase", paymentIntentId);
    return;
  }

  await supabase
    .from("purchases")
    .update({ status })
    .eq("id", purchase["id"])
    .eq("environment", env);

  const revokedAt = new Date().toISOString();

  // Revoke the entitlement produced by THIS purchase only (same user, same
  // product, same environment). Entitlements for other products, or granted
  // by another purchase/gift, are never touched.
  await supabase
    .from("entitlements")
    .update({ is_active: false, revoked_at: revokedAt })
    .eq("user_id", purchase["user_id"])
    .eq("product_id", purchase["product_id"])
    .eq("environment", env);

  // If the refunded purchase was a bundle, the products it unlocked are
  // linked to the same purchase_id and must be revoked as well.
  await supabase
    .from("entitlements")
    .update({ is_active: false, revoked_at: revokedAt })
    .eq("purchase_id", purchase["id"])
    .eq("environment", env);
}

/** Only a FULL refund revokes access; partial refunds keep the entitlement. */
function isFullyRefunded(charge: any): boolean {
  if (charge?.refunded === true) return true;
  const amount = Number(charge?.amount ?? 0);
  const refunded = Number(charge?.amount_refunded ?? 0);
  return amount > 0 && refunded >= amount;
}


async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  const origin = process.env["PUBLIC_SITE_URL"] ?? new URL(req.url).origin;

  const isGift = (s: any) => s?.metadata?.kind === "gift";

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      if (isGift(s)) await fulfilGift(s, env, origin);
      else await fulfil(s, env);
      break;
    }
    case "checkout.session.async_payment_succeeded": {
      const s = event.data.object;
      if (isGift(s)) await fulfilGift(s, env, origin);
      else await fulfil(s, env);
      break;
    }
    case "checkout.session.async_payment_failed":
      if (isGift(event.data.object)) {
        await getSupabase()
          .from("gifts")
          .update({ status: "cancelled" })
          .eq("stripe_checkout_session_id", (event.data.object as any).id)
          .eq("environment", env);
      } else {
        await markStatus(event.data.object, "failed", env);
      }
      break;
    case "charge.refunded":
    case "charge.refund.updated":
    case "refund.created":
    case "refund.updated": {
      // `charge.refunded` carries a Charge; the refund events carry a Refund.
      // In both cases the charge is re-read from Stripe so the decision is
      // based on the authoritative refunded totals, never on the payload.
      let charge: any = event.data.object;
      if (event.type !== "charge.refunded") {
        const chargeId = typeof charge?.charge === "string" ? charge.charge : charge?.charge?.id;
        if (!chargeId) break;
        try {
          charge = await createStripeClient(env).charges.retrieve(chargeId);
        } catch (e) {
          console.error("Could not retrieve charge for refund", chargeId, e);
          break;
        }
      }
      if (isFullyRefunded(charge)) {
        await handleRefund(charge, env, "refunded");
        const pi =
          typeof charge?.payment_intent === "string"
            ? charge.payment_intent
            : charge?.payment_intent?.id;
        if (pi) await handleGiftRefund(pi, env);
      } else {
        console.log("Partial refund, entitlement kept", charge?.id);
      }
      break;
    }
    case "charge.dispute.closed": {
      const dispute: any = event.data.object;
      if (dispute?.status !== "lost") break;
      const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;
      if (chargeId) {
        await handleRefund({ payment_intent: dispute.payment_intent }, env, "refunded");
        if (dispute.payment_intent) {
          const pi =
            typeof dispute.payment_intent === "string"
              ? dispute.payment_intent
              : dispute.payment_intent.id;
          if (pi) await handleGiftRefund(pi, env);
        }
      }
      break;
    }

    case "checkout.session.expired":
      if (isGift(event.data.object)) {
        await getSupabase()
          .from("gifts")
          .update({ status: "cancelled" })
          .eq("stripe_checkout_session_id", (event.data.object as any).id)
          .eq("environment", env)
          .eq("status", "pending")
          .is("purchased_at", null);
      } else {
        await markStatus(event.data.object, "cancelled", env);
      }
      break;

    default:
      console.log("Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook with invalid env:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        // Hard separation: on a live deployment, sandbox events are ignored
        // (and vice versa) so test payments can never grant live access.
        const serverEnv = resolveServerStripeEnv();
        if (rawEnv !== serverEnv) {
          console.error(`Ignoring ${rawEnv} webhook on ${serverEnv} deployment`);
          return Response.json({ received: true, ignored: "environment mismatch" });
        }
        try {
          await handleWebhook(request, rawEnv as StripeEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
