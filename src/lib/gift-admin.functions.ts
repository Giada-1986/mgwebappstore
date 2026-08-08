import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequest } from "@tanstack/react-start/server";

/**
 * Admin-only gift email resend.
 *
 * Deliberately narrow: it re-sends the SAME transactional email for a gift that
 * was really paid. It never creates gifts, entitlements or tokens, never
 * touches recipient_email / product_id / environment / payment state, and never
 * returns tokens, hashes, keys or payment identifiers to the browser.
 */

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || data !== true) throw new Error("Forbidden");
}

/** Guard against accidental double sends from the dashboard. */
const RESEND_COOLDOWN_MS = 60_000;

export type AdminGift = {
  id: string;
  recipientEmail: string;
  productName: string;
  status: string;
  environment: string;
  purchasedAt: string | null;
  hasMessage: boolean;
  emailSentAt: string | null;
  emailLastAttemptAt: string | null;
  emailLastMessageId: string | null;
  emailError: string | null;
  emailAttempts: number;
  canResend: boolean;
};

export const listAdminGifts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminGift[]> => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { resolveServerStripeEnv } = await import("@/lib/payments-env.server");
    const environment = resolveServerStripeEnv();

    // Sandbox and live stay strictly separated: only the current environment.
    const { data } = await (supabaseAdmin as any)
      .from("gifts")
      .select(
        "id, recipient_email, gift_message, status, environment, purchased_at, email_sent_at, email_last_attempt_at, email_last_message_id, email_error, email_attempts, products(name_it)",
      )
      .eq("environment", environment)
      .order("created_at", { ascending: false })
      .limit(50);

    return (data ?? []).map((g: any) => ({
      id: g.id,
      recipientEmail: g.recipient_email,
      productName: g.products?.name_it ?? "—",
      status: g.status,
      environment: g.environment,
      purchasedAt: g.purchased_at ?? null,
      hasMessage: typeof g.gift_message === "string" && g.gift_message.trim().length > 0,
      emailSentAt: g.email_sent_at ?? null,
      emailLastAttemptAt: g.email_last_attempt_at ?? null,
      emailLastMessageId: g.email_last_message_id ?? null,
      emailError: g.email_error ?? null,
      emailAttempts: Number(g.email_attempts ?? 0),
      canResend: !!g.purchased_at && g.status === "pending",
    }));
  });

export type ResendGiftEmailResult =
  | { ok: true; recipient: string; messageId: string | null; mode: "link" | "account" }
  | { ok: false; reason: string; detail?: string };

export const resendGiftEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { giftId: string }) => {
    if (!/^[0-9a-f-]{36}$/i.test(data.giftId)) throw new Error("Invalid gift id");
    return data;
  })
  .handler(async ({ data, context }): Promise<ResendGiftEmailResult> => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { resolveServerStripeEnv } = await import("@/lib/payments-env.server");
    const admin = supabaseAdmin as any;
    const environment = resolveServerStripeEnv();

    const { data: gift } = await admin
      .from("gifts")
      .select(
        "id, recipient_email, gift_message, status, environment, purchased_at, redemption_token_encrypted, email_attempts, email_last_attempt_at, products(name_it, name_en)",
      )
      .eq("id", data.giftId)
      .maybeSingle();

    if (!gift) return { ok: false, reason: "not_found" };
    if (gift.environment !== environment) return { ok: false, reason: "wrong_environment" };
    // Only a payment really confirmed by the signed webhook can be re-notified.
    if (!gift.purchased_at) return { ok: false, reason: "not_paid" };
    // An already redeemed gift must never receive a usable redemption link again.
    if (gift.status === "redeemed") return { ok: false, reason: "already_redeemed" };
    if (gift.status !== "pending") return { ok: false, reason: gift.status };

    const lastAttempt = gift.email_last_attempt_at
      ? new Date(gift.email_last_attempt_at).getTime()
      : 0;
    if (Date.now() - lastAttempt < RESEND_COOLDOWN_MS) return { ok: false, reason: "cooldown" };

    const request = getRequest();
    const origin = new URL(request.url).origin;

    // The plaintext token exists only in memory, decrypted server-side. When no
    // ciphertext is stored we do NOT mint a new token: the recipient is pointed
    // at their own account, where this same gift is already waiting.
    const { decryptGiftToken } = await import("@/lib/gift-token.server");
    const token = await decryptGiftToken(gift.redemption_token_encrypted ?? null);
    const mode: "link" | "account" = token ? "link" : "account";
    const redeemUrl = token ? `${origin}/redeem/${token}` : `${origin}/my-apps`;

    const recipient = String(gift.recipient_email);
    const { data: profile } = await admin
      .from("profiles")
      .select("preferred_language")
      .eq("email", recipient)
      .maybeSingle();
    const lang = profile?.preferred_language === "en" ? "en" : "it";
    const product: any = gift.products ?? {};

    const { sendGiftEmail } = await import("@/lib/gift-email.server");
    const result = await sendGiftEmail({
      recipientEmail: recipient,
      productName: (lang === "en" ? product.name_en : product.name_it) ?? "MINI WEB APPS",
      giftMessage: gift.gift_message ?? null,
      redeemUrl,
      lang,
      mode,
    });

    const nowIso = new Date().toISOString();
    await admin
      .from("gifts")
      .update({
        email_attempts: Number(gift.email_attempts ?? 0) + 1,
        email_last_attempt_at: nowIso,
        email_last_message_id: result.messageId ?? null,
        email_sent_at: result.sent ? nowIso : null,
        email_error: result.sent ? null : (result.error ?? "unknown_error"),
      })
      .eq("id", gift.id);

    if (!result.sent) {
      return { ok: false, reason: "provider_error", detail: (result.error ?? "").slice(0, 300) };
    }
    return { ok: true, recipient, messageId: result.messageId ?? null, mode };
  });
