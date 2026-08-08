/**
 * Post-purchase confirmation email — server only.
 *
 * Sent ONLY after the signed Stripe webhook confirmed a normal (non-gift)
 * purchase AND the lifetime entitlement was actually created. Never for
 * failed payments, abandoned checkouts, refunds or gift purchases.
 *
 * The link target comes from the central store URL config (src/lib/site.ts).
 */

import { sendBrevoTransactional, isBrevoConfigured } from "@/lib/brevo.server";
import { STORE_LIBRARY_URL } from "@/lib/site";

export type PurchaseEmailLang = "it" | "en" | "es" | "fr" | "de";

const LANGS: PurchaseEmailLang[] = ["it", "en", "es", "fr", "de"];

export function resolvePurchaseEmailLang(value: unknown): PurchaseEmailLang {
  const v = typeof value === "string" ? value.slice(0, 2).toLowerCase() : "";
  return (LANGS as string[]).includes(v) ? (v as PurchaseEmailLang) : "it";
}

const COPY: Record<
  PurchaseEmailLang,
  {
    subject: string;
    greeting: (name?: string | null) => string;
    intro: (product: string) => string;
    available: string;
    cta: string;
    secondary: string;
    thanks: string;
  }
> = {
  it: {
    subject: "Il tuo acquisto è pronto ✨",
    greeting: (n) => (n ? `Ciao ${n},` : "Ciao,"),
    intro: (p) => `il tuo acquisto di <strong>${p}</strong> è stato completato con successo.`,
    available: "La tua mini web app è ora disponibile nella tua Libreria MINI WEB APPS.",
    cta: "Vai alle mie app",
    secondary:
      "Il tuo accesso è a vita. Puoi tornare alla tua Libreria in qualsiasi momento effettuando l'accesso con lo stesso account utilizzato per l'acquisto.",
    thanks: "Grazie per aver scelto MINI WEB APPS.",
  },
  en: {
    subject: "Your purchase is ready ✨",
    greeting: (n) => (n ? `Hi ${n},` : "Hi,"),
    intro: (p) => `your purchase of <strong>${p}</strong> was completed successfully.`,
    available: "Your mini web app is now available in your MINI WEB APPS Library.",
    cta: "Go to my apps",
    secondary:
      "Your access is lifetime. You can return to your Library at any time by signing in with the same account you used for the purchase.",
    thanks: "Thank you for choosing MINI WEB APPS.",
  },
  es: {
    subject: "Tu compra está lista ✨",
    greeting: (n) => (n ? `Hola ${n},` : "Hola,"),
    intro: (p) => `tu compra de <strong>${p}</strong> se ha completado correctamente.`,
    available: "Tu mini web app ya está disponible en tu Biblioteca MINI WEB APPS.",
    cta: "Ir a mis apps",
    secondary:
      "Tu acceso es de por vida. Puedes volver a tu Biblioteca cuando quieras iniciando sesión con la misma cuenta que usaste para la compra.",
    thanks: "Gracias por elegir MINI WEB APPS.",
  },
  fr: {
    subject: "Votre achat est prêt ✨",
    greeting: (n) => (n ? `Bonjour ${n},` : "Bonjour,"),
    intro: (p) => `votre achat de <strong>${p}</strong> a bien été finalisé.`,
    available: "Votre mini web app est désormais disponible dans votre Bibliothèque MINI WEB APPS.",
    cta: "Accéder à mes apps",
    secondary:
      "Votre accès est à vie. Vous pouvez revenir à votre Bibliothèque à tout moment en vous connectant avec le compte utilisé pour l'achat.",
    thanks: "Merci d'avoir choisi MINI WEB APPS.",
  },
  de: {
    subject: "Dein Kauf ist bereit ✨",
    greeting: (n) => (n ? `Hallo ${n},` : "Hallo,"),
    intro: (p) => `dein Kauf von <strong>${p}</strong> wurde erfolgreich abgeschlossen.`,
    available: "Deine Mini Web App ist jetzt in deiner MINI WEB APPS Bibliothek verfügbar.",
    cta: "Zu meinen Apps",
    secondary:
      "Dein Zugang gilt lebenslang. Du kannst jederzeit in deine Bibliothek zurückkehren, indem du dich mit demselben Konto anmeldest, das du für den Kauf verwendet hast.",
    thanks: "Danke, dass du dich für MINI WEB APPS entschieden hast.",
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHtml(lang: PurchaseEmailLang, productName: string, firstName?: string | null) {
  const c = COPY[lang];
  return `<!doctype html><html lang="${lang}"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#faf8f4;font-family:Arial,Helvetica,sans-serif;color:#1c1b18">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff">
    <p style="margin:0 0 24px;font-size:13px;letter-spacing:.22em;text-transform:uppercase;color:#c9a227" translate="no">MINI WEB APPS</p>
    <p style="margin:0 0 12px;font-size:16px;line-height:1.6">${escapeHtml(c.greeting(firstName ?? null))}</p>
    <p style="margin:0 0 8px;font-size:16px;line-height:1.6">${c.intro(escapeHtml(productName))}</p>
    <p style="margin:0;font-size:16px;line-height:1.6">${c.available}</p>
    <p style="margin:28px 0">
      <a href="${STORE_LIBRARY_URL}" style="display:inline-block;background:#16213e;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:16px;border:1px solid #c9a227">${c.cta}</a>
    </p>
    <p style="margin:0 0 18px;font-size:13px;line-height:1.6;color:#6b6659">${c.secondary}</p>
    <hr style="border:none;border-top:1px solid #efe9dc;margin:24px 0">
    <p style="margin:0;font-size:14px;line-height:1.6;color:#1c1b18">${c.thanks}</p>
  </div>
</body></html>`;
}

export async function sendPurchaseEmail(input: {
  recipientEmail: string;
  productName: string;
  firstName?: string | null;
  lang: PurchaseEmailLang;
}): Promise<{ sent: boolean; error?: string }> {
  const senderEmail = process.env["GIFT_SENDER_EMAIL"];
  const senderName = process.env["GIFT_SENDER_NAME"] ?? "MINI WEB APPS";

  if (!isBrevoConfigured()) return { sent: false, error: "email_provider_not_configured" };
  if (!senderEmail) return { sent: false, error: "sender_not_configured" };

  try {
    await sendBrevoTransactional({
      senderEmail,
      senderName,
      to: input.recipientEmail,
      subject: COPY[input.lang].subject,
      htmlContent: renderHtml(input.lang, input.productName, input.firstName ?? null),
    });
    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { sent: false, error: message.slice(0, 500) };
  }
}
