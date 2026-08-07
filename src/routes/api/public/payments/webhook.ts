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
  if (
    !isFree &&
    typeof session.amount_total === "number" &&
    Math.round(Number(product["price"]) * 100) !== session.amount_total
  ) {
    console.error("Amount mismatch", session.id, session.amount_total, product["price"]);
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

  const { error: entitlementError } = await supabase.from("entitlements").upsert(
    {
      user_id: userId,
      product_id: productId,
      access_type: "lifetime",
      is_active: true,
      source: "purchase",
      environment: env,
      purchase_id: purchase?.["id"] ?? null,
      granted_at: new Date().toISOString(),
      revoked_at: null,
    },
    { onConflict: "user_id,product_id,environment" },
  );

  if (entitlementError) console.error("Failed to grant entitlement", entitlementError);
}

/**
 * Gift fulfilment. Runs the SAME validations as a normal purchase
 * (product identity, payment_status, price id, livemode, amount, currency)
 * but grants NO entitlement: the gift only becomes redeemable.
 */
async function fulfilGift(sessionFromEvent: any, env: StripeEnv) {
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
  if (
    typeof session.amount_total === "number" &&
    Math.round(Number(product["price"]) * 100) !== session.amount_total
  ) {
    console.error("Gift amount mismatch", session.id, session.amount_total, product["price"]);
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
  if (error) console.error("Failed to mark gift as paid", error);
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

  await supabase
    .from("entitlements")
    .update({ is_active: false, revoked_at: new Date().toISOString() })
    .eq("user_id", purchase["user_id"])
    .eq("product_id", purchase["product_id"])
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

  const isGift = (s: any) => s?.metadata?.kind === "gift";

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object;
      if (isGift(s)) await fulfilGift(s, env);
      else await fulfil(s, env);
      break;
    }
    case "checkout.session.async_payment_succeeded": {
      const s = event.data.object;
      if (isGift(s)) await fulfilGift(s, env);
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
    case "charge.refund.updated": {
      // `charge.refund.updated` carries a Refund; re-read its charge from Stripe
      // so the decision is based on the authoritative refunded totals.
      let charge: any = event.data.object;
      if (event.type === "charge.refund.updated") {
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
