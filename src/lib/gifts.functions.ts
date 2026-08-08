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

type GiftCheckoutResult =
  | { clientSecret: string; giftId: string; redemptionToken: string }
  | { error: string };

/** Cryptographically unpredictable, URL-safe token (256 bits of entropy). */
function generateRedemptionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** SHA-256 hex digest — only the digest is ever persisted. */
async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

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

    const token = generateRedemptionToken();
    const tokenHash = await hashToken(token);
    // The plaintext is never stored: only its SHA-256 (single-use check) and an
    // AES-GCM ciphertext, needed to build the email link after payment.
    const { encryptGiftToken } = await import("@/lib/gift-token.server");
    const tokenEncrypted = await encryptGiftToken(token);

    // Created as `pending` with no payment reference: it becomes usable only
    // when the signed webhook confirms the payment for THIS product.
    const { data: gift, error: giftError } = await admin
      .from("gifts")
      .insert({
        product_id: product.id,
        recipient_email: data.recipientEmail.toLowerCase(),
        purchaser_email: data.purchaserEmail?.toLowerCase() ?? null,
        gift_message: data.giftMessage ?? null,
        redemption_token_hash: tokenHash,
        redemption_token_encrypted: tokenEncrypted,
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

      return { clientSecret: session.client_secret ?? "", giftId: gift.id, redemptionToken: token };
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
    if (!/^[a-f0-9]{64}$/.test(data.token)) throw new Error("Invalid token");
    return data;
  })
  .handler(async ({ data, context }): Promise<RedeemResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { resolveServerStripeEnv } = await import("@/lib/payments-env.server");
    const admin = supabaseAdmin as any;

    // Sandbox/live separation is enforced inside the RPC, from a server-derived
    // environment: a gift bought in another environment can never be redeemed.
    const environment = resolveServerStripeEnv();
    const tokenHash = await hashToken(data.token);

    const { data: result, error } = await admin.rpc("redeem_gift", {
      _token_hash: tokenHash,
      _user_id: context.userId,
      _environment: environment,
    });

    if (error) return { ok: false, reason: "error" };
    if (!result?.ok) return { ok: false, reason: String(result?.reason ?? "error") };
    return { ok: true, productSlug: result.product_slug ?? null };
  });

/** Read-only status of a token, for the redeem screen (no side effects). */
export const getGiftByToken = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => {
    if (!/^[a-f0-9]{64}$/.test(data.token)) throw new Error("Invalid token");
    return data;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { resolveServerStripeEnv } = await import("@/lib/payments-env.server");
    const admin = supabaseAdmin as any;
    const environment = resolveServerStripeEnv();

    const { data: gift } = await admin
      .from("gifts")
      .select("status, purchased_at, environment, gift_message, products(slug, name_it, name_en)")
      .eq("redemption_token_hash", await hashToken(data.token))
      .maybeSingle();

    if (!gift || gift.environment !== environment) return null;
    return {
      status: gift.purchased_at ? gift.status : "pending_payment",
      product: gift.products ?? null,
      // Only the free-text message is exposed; buyer email and payment ids stay server-side.
      giftMessage: typeof gift.gift_message === "string" ? gift.gift_message : null,
    };
  });

/* ------------------------------------------------------------------ *
 * In-account delivery: a paid gift is visible to whoever owns the
 * account with the recipient email, even if the email never arrived.
 * ------------------------------------------------------------------ */

/** Authoritative email of the caller, read server-side (never from input). */
async function callerEmail(admin: any, userId: string): Promise<string | null> {
  const { data } = await admin.auth.admin.getUserById(userId);
  const email = data?.user?.email;
  return typeof email === "string" ? email.toLowerCase() : null;
}

export type ReceivedGift = {
  id: string;
  productSlug: string | null;
  nameIt: string | null;
  nameEn: string | null;
  giftMessage: string | null;
  purchasedAt: string | null;
};

export const listReceivedGifts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReceivedGift[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { resolveServerStripeEnv } = await import("@/lib/payments-env.server");
    const admin = supabaseAdmin as any;

    const email = await callerEmail(admin, context.userId);
    if (!email) return [];

    const { data } = await admin
      .from("gifts")
      .select("id, gift_message, purchased_at, products(slug, name_it, name_en)")
      .eq("recipient_email", email)
      .eq("status", "pending")
      .eq("environment", resolveServerStripeEnv())
      .not("purchased_at", "is", null)
      .order("purchased_at", { ascending: false });

    return (data ?? []).map((g: any) => ({
      id: g.id,
      productSlug: g.products?.slug ?? null,
      nameIt: g.products?.name_it ?? null,
      nameEn: g.products?.name_en ?? null,
      giftMessage: typeof g.gift_message === "string" ? g.gift_message : null,
      purchasedAt: g.purchased_at ?? null,
    }));
  });

/**
 * Redeems a gift addressed to the caller's own email, without the link.
 * The token never leaves the server: only its stored hash is used, and the
 * same atomic single-use RPC guarantees one redemption per gift.
 */
export const redeemReceivedGift = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { giftId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data.giftId)) throw new Error("Invalid gift id");
    return data;
  })
  .handler(async ({ data, context }): Promise<RedeemResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { resolveServerStripeEnv } = await import("@/lib/payments-env.server");
    const admin = supabaseAdmin as any;
    const environment = resolveServerStripeEnv();

    const email = await callerEmail(admin, context.userId);
    if (!email) return { ok: false, reason: "not_authenticated" };

    const { data: gift } = await admin
      .from("gifts")
      .select("id, recipient_email, status, purchased_at, environment, redemption_token_hash")
      .eq("id", data.giftId)
      .maybeSingle();

    // The gift must be paid, unredeemed, in this environment, and addressed
    // exactly to the authenticated account's email.
    if (!gift) return { ok: false, reason: "invalid_token" };
    if (gift.environment !== environment) return { ok: false, reason: "invalid_token" };
    if (String(gift.recipient_email).toLowerCase() !== email)
      return { ok: false, reason: "invalid_token" };
    if (!gift.purchased_at) return { ok: false, reason: "not_paid" };
    if (gift.status !== "pending") return { ok: false, reason: "already_redeemed" };

    const { data: result, error } = await admin.rpc("redeem_gift", {
      _token_hash: gift.redemption_token_hash,
      _user_id: context.userId,
      _environment: environment,
    });

    if (error) return { ok: false, reason: "error" };
    if (!result?.ok) return { ok: false, reason: String(result?.reason ?? "error") };
    return { ok: true, productSlug: result.product_slug ?? null };
  });

/* ------------------------------------------------------------------ *
 * Post-redemption: which owned products came from a gift, and the
 * personal message that came with them. RLS-scoped to the redeemer.
 * ------------------------------------------------------------------ */

export type RedeemedGift = { productId: string; giftMessage: string | null };

export const listRedeemedGifts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RedeemedGift[]> => {
    // context.supabase acts as the user: the "redeemer can view redeemed gift"
    // policy already restricts rows to redeemed_by_user_id = auth.uid().
    const { data } = await (context.supabase as any)
      .from("gifts")
      .select("product_id, gift_message")
      .eq("redeemed_by_user_id", context.userId)
      .eq("status", "redeemed");

    return (data ?? []).map((g: any) => ({
      productId: g.product_id as string,
      giftMessage: typeof g.gift_message === "string" && g.gift_message.trim() ? g.gift_message : null,
    }));
  });
