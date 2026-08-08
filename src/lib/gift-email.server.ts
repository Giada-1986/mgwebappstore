/**
 * Delivery email for a gift — server only.
 *
 * Sent ONLY after the signed Stripe webhook confirmed the payment.
 * It never exposes Stripe ids, payment data or the buyer's address; the buyer's
 * personal message is included only when they wrote one.
 *
 * The project has no Lovable Emails domain configured, so the transactional
 * send goes through the already connected Brevo account. When no verified
 * sender address is configured the send is NOT simulated: the failure is
 * recorded on the gift row and the in-account delivery (Mode 2) takes over.
 */

import { sendBrevoTransactional, isBrevoConfigured } from "@/lib/brevo.server";

export type GiftEmailInput = {
  recipientEmail: string;
  productName: string;
  giftMessage?: string | null;
  redeemUrl: string;
  lang: "it" | "en";
};

const COPY = {
  it: {
    subject: (p: string) => `Hai ricevuto in regalo ${p}`,
    title: "Hai ricevuto un regalo",
    intro: (p: string) => `Qualcuno ti ha regalato <strong>${p}</strong> su MINI WEB APPS.`,
    messageLabel: "Il messaggio per te",
    cta: "Riscatta il tuo regalo",
    note: "Il link è personale e utilizzabile una sola volta. Per riscattare il regalo ti verrà chiesto di accedere o creare un account.",
  },
  en: {
    subject: (p: string) => `You received ${p} as a gift`,
    title: "You received a gift",
    intro: (p: string) => `Someone gifted you <strong>${p}</strong> on MINI WEB APPS.`,
    messageLabel: "Their message for you",
    cta: "Redeem your gift",
    note: "This link is personal and can be used only once. You will be asked to sign in or create an account to redeem it.",
  },
} as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHtml(input: GiftEmailInput): string {
  const c = COPY[input.lang];
  const product = escapeHtml(input.productName);
  const message = input.giftMessage?.trim()
    ? `<div style="margin:24px 0;padding:16px 18px;background:#faf7f0;border-left:3px solid #c9a227;border-radius:8px">
         <p style="margin:0 0 6px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#7a7361">${c.messageLabel}</p>
         <p style="margin:0;font-size:16px;line-height:1.6;color:#1c1b18;white-space:pre-wrap">${escapeHtml(input.giftMessage!)}</p>
       </div>`
    : "";

  return `<!doctype html><html lang="${input.lang}"><body style="margin:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#1c1b18">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <p style="margin:0 0 24px;font-size:13px;letter-spacing:.22em;text-transform:uppercase;color:#c9a227" translate="no">MINI WEB APPS</p>
    <h1 style="margin:0 0 12px;font-size:26px;line-height:1.25">🎁 ${c.title}</h1>
    <p style="margin:0;font-size:16px;line-height:1.6">${c.intro(product)}</p>
    ${message}
    <p style="margin:28px 0">
      <a href="${input.redeemUrl}" style="display:inline-block;background:#16213e;color:#ffffff;text-decoration:none;padding:14px 26px;border-radius:999px;font-size:16px">${c.cta}</a>
    </p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#6b6659">${c.note}</p>
  </div>
</body></html>`;
}

export async function sendGiftEmail(
  input: GiftEmailInput,
): Promise<{ sent: boolean; error?: string }> {
  const senderEmail = process.env["GIFT_SENDER_EMAIL"];
  const senderName = process.env["GIFT_SENDER_NAME"] ?? "MINI WEB APPS";

  if (!isBrevoConfigured()) return { sent: false, error: "email_provider_not_configured" };
  if (!senderEmail) return { sent: false, error: "sender_not_configured" };

  const c = COPY[input.lang];
  try {
    await sendBrevoTransactional({
      senderEmail,
      senderName,
      to: input.recipientEmail,
      subject: c.subject(input.productName),
      htmlContent: renderHtml(input),
    });
    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { sent: false, error: message.slice(0, 500) };
  }
}
