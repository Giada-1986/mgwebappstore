/**
 * Gift redemption token — encryption at rest (server only).
 *
 * The database keeps ONLY:
 *  - `redemption_token_hash`  → SHA-256, used for the atomic single-use check;
 *  - `redemption_token_encrypted` → AES-256-GCM ciphertext, needed to build the
 *    redeem link inside the delivery email AFTER the payment is confirmed.
 *
 * The plaintext token is never persisted. The decryption key lives only in the
 * server environment (`GIFT_TOKEN_ENC_KEY`), so a database read alone can never
 * produce a usable redemption link.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function getKey(): Promise<CryptoKey | null> {
  const secret = process.env["GIFT_TOKEN_ENC_KEY"];
  if (!secret) return null;
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function encryptGiftToken(token: string): Promise<string | null> {
  const key = await getKey();
  if (!key) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(token)),
  );
  return `v1.${toBase64(iv)}.${toBase64(cipher)}`;
}

export async function decryptGiftToken(payload: string | null): Promise<string | null> {
  if (!payload) return null;
  const parts = payload.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return null;
  const key = await getKey();
  if (!key) return null;
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(parts[1]!) },
      key,
      fromBase64(parts[2]!),
    );
    return decoder.decode(plain);
  } catch {
    return null;
  }
}
