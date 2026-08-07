import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Gifting layer.
 *
 * Hard rules enforced here (and in the DB):
 *  - a gift ALWAYS points at exactly one product_id;
 *  - the buyer may be anonymous, and an anonymous purchase grants NOTHING;
 *  - no entitlement is ever created at purchase time — only redemption creates
 *    one, for the redeeming account, for gift.product_id, in gift.environment;
 *  - a token can be redeemed once (atomic, single-use, DB-side).
 */

type GiftCheckoutResult = { clientSecret: string; giftId: string } | { error: string };

const EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/;

export const createGiftCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      productSlug: string;
      recipientEmail: string;
      purchaserEmail?: string;
      giftMessage?: string;
      returnUrl: string;
    }) => {
      if (!/^[a-z0-9-]{1,64}$/.test(data.productSlug)) throw new Error("Invalid product slug");
      if (!EMAIL_RE.test(data.recipientEmail)) throw new Error("Invalid recipient email");
      if (data.purchaserEmail && !EMAIL_RE.test(data.purchaserEmail))
        throw new Error("Invalid purchaser email");
      if (data.giftMessage && data.giftMessage.length > 500)
        throw new Error("Gift message too long");
      if (!/^https?:\/\//.test(data.returnUrl)) throw new Error("Invalid return url");
      return data;
    },
  )
  .handler(async ({ data }): Promise<GiftCheckoutResult> => {
    const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
    const { resolveServerStripeEnv } = await import("@/lib/payments-env.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // The environment is derived from server secrets only, never from input.
    const environment = resolveServerStripeEnv();
    const admin = supabaseAdmin as any;

    const { data: product, error: productError } = await admin
      .from("products")
      .select("id, slug, name_it, price, currency, stripe_price_id, status")
      .eq("slug", data.productSlug)
      .maybeSingle();

    if (productError || !product) return { error: "Prodotto non disponibile." };
    if (product.status !== "active") return { error: "Prodotto non ancora acquistabile." };
    if (!product.stripe_price_id) return { error: "Prezzo non configurato per questo prodotto." };

    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

    // Created as `pending` with no payment reference: it becomes usable only
    // when the signed webhook confirms the payment for THIS product.
    const { data: gift, error: giftError } = await admin
      .from("gifts")
      .insert({
        product_id: product.id,
        recipient_email: data.recipientEmail.toLowerCase(),
        purchaser_email: data.purchaserEmail?.toLowerCase() ?? null,
        gift_message: data.giftMessage ?? null,
        redemption_token: token,
        currency: product.currency,
        environment,
        status: "pending",
      })
      .select("id")
      .single();

    if (giftError || !gift) return { error: "Impossibile creare il regalo." };

    try {
      const stripe = createStripeClient(environment);
      const prices = await stripe.prices.list({ lookup_keys: [product.stripe_price_id] });
      const stripePrice = prices.data[0];
      if (!stripePrice) return { error: "Prezzo non trovato." };

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        ...(data.purchaserEmail ? { customer_email: data.purchaserEmail } : {}),
        payment_intent_data: { description: `Regalo — ${product.name_it}` },
        metadata: {
          kind: "gift",
          gift_id: gift.id,
          product_id: product.id,
          product_slug: product.slug,
          environment,
        },
        managed_payments: { enabled: true },
      } as any);

      await admin
        .from("gifts")
        .update({ stripe_checkout_session_id: session.id })
        .eq("id", gift.id);

      return { clientSecret: session.client_secret ?? "", giftId: gift.id };
    } catch (error) {
      await admin.from("gifts").update({ status: "cancelled" }).eq("id", gift.id);
      return { error: getStripeErrorMessage(error) };
    }
  });

export type RedeemResult =
  | { ok: true; productSlug: string | null }
  | { ok: false; reason: string };

/**
 * Redemption. Requires an authenticated account: the entitlement is bound to
 * auth.uid() from the validated bearer token, never to a client-supplied id.
 */
export const redeemGift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { token: string }) => {
    if (!/^[a-zA-Z0-9]{16,128}$/.test(data.token)) throw new Error("Invalid token");
    return data;
  })
  .handler(async ({ data, context }): Promise<RedeemResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { resolveServerStripeEnv } = await import("@/lib/payments-env.server");
    const admin = supabaseAdmin as any;

    // Sandbox/live separation: a gift bought in another environment is invisible.
    const environment = resolveServerStripeEnv();
    const { data: gift } = await admin
      .from("gifts")
      .select("id, environment")
      .eq("redemption_token", data.token)
      .maybeSingle();

    if (!gift || gift.environment !== environment) return { ok: false, reason: "invalid_token" };

    const { data: result, error } = await admin.rpc("redeem_gift", {
      _token: data.token,
      _user_id: context.userId,
    });

    if (error) return { ok: false, reason: "error" };
    if (!result?.ok) return { ok: false, reason: String(result?.reason ?? "error") };
    return { ok: true, productSlug: result.product_slug ?? null };
  });

/** Read-only status of a token, for the redeem screen (no side effects). */
export const getGiftByToken = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => {
    if (!/^[a-zA-Z0-9]{16,128}$/.test(data.token)) throw new Error("Invalid token");
    return data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { resolveServerStripeEnv } = await import("@/lib/payments-env.server");
    const admin = supabaseAdmin as any;
    const environment = resolveServerStripeEnv();

    const { data: gift } = await admin
      .from("gifts")
      .select("status, purchased_at, environment, products(slug, name_it, name_en)")
      .eq("redemption_token", data.token)
      .maybeSingle();

    if (!gift || gift.environment !== environment) return null;
    return {
      status: gift.purchased_at ? gift.status : "pending_payment",
      product: gift.products ?? null,
    };
  });
