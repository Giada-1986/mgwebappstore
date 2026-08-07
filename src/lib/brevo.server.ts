/**
 * Brevo integration — server only.
 *
 * Every call goes through the Lovable connector gateway, so the provider
 * credentials never leave the server and are never present in the client
 * bundle. Marketing consent is always checked by the caller before syncing.
 */

const GATEWAY_URL = "https://connector-gateway.lovable.dev/brevo";

function gatewayHeaders() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const brevoKey = process.env["BREVO_API_KEY"];
  if (!lovableKey || !brevoKey) return null;
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": brevoKey,
  };
}

export function isBrevoConfigured() {
  return !!gatewayHeaders();
}

async function brevoFetch(path: string, init: RequestInit & { method: string }) {
  const headers = gatewayHeaders();
  if (!headers) throw new Error("Brevo is not connected");
  const response = await fetch(`${GATEWAY_URL}/${path}`, { ...init, headers });
  const text = await response.text();
  if (!response.ok) {
    console.error(`[brevo] ${init.method} ${path} failed [${response.status}]: ${text}`);
    throw new Error(`Brevo request failed [${response.status}]: ${text}`);
  }
  return text ? (JSON.parse(text) as unknown) : null;
}

export type BrevoContactInput = {
  email: string;
  userId: string;
  language: string;
  firstName?: string | null;
  signupDate?: string | null;
  products?: string[];
};

/** Create or update a marketing contact (consent already verified by caller). */
export async function upsertBrevoContact(input: BrevoContactInput) {
  const attributes: Record<string, unknown> = {
    USER_ID: input.userId,
    LANGUAGE: input.language.toUpperCase(),
  };
  if (input.firstName) attributes["FIRSTNAME"] = input.firstName;
  if (input.signupDate) attributes["SIGNUP_DATE"] = input.signupDate.slice(0, 10);
  if (input.products?.length) attributes["PRODUCTS"] = input.products.join(",");

  return brevoFetch("contacts", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      attributes,
      updateEnabled: true,
      emailBlacklisted: false,
    }),
  });
}

/** Opt the contact out of every promotional campaign. Transactional email is unaffected. */
export async function blacklistBrevoContact(email: string) {
  try {
    await brevoFetch(`contacts/${encodeURIComponent(email)}`, {
      method: "PUT",
      body: JSON.stringify({ emailBlacklisted: true }),
    });
  } catch (error) {
    // A contact that never existed in Brevo is already "not receiving campaigns".
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("404")) throw error;
  }
}

export type AnnouncementRecipient = { email: string; name?: string | null };

/**
 * Sends a one-off announcement to an explicit recipient list.
 * Called only from the admin dashboard — never automatically.
 */
export async function sendBrevoAnnouncement(params: {
  senderEmail: string;
  senderName: string;
  subject: string;
  htmlContent: string;
  recipients: AnnouncementRecipient[];
}) {
  const chunks: AnnouncementRecipient[][] = [];
  for (let i = 0; i < params.recipients.length; i += 500) {
    chunks.push(params.recipients.slice(i, i + 500));
  }

  let sent = 0;
  for (const chunk of chunks) {
    await brevoFetch("smtp/email", {
      method: "POST",
      body: JSON.stringify({
        sender: { name: params.senderName, email: params.senderEmail },
        subject: params.subject,
        htmlContent: params.htmlContent,
        to: [{ email: chunk[0]!.email }],
        messageVersions: chunk.slice(1).map((r) => ({
          to: [r.name ? { email: r.email, name: r.name } : { email: r.email }],
        })),
      }),
    });
    sent += chunk.length;
  }
  return sent;
}
