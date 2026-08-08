/**
 * Central place for the public store URL used in outgoing links (emails, etc.).
 *
 * When the definitive domain is connected, set the STORE_BASE_URL environment
 * variable (or change the fallback below) — no template needs to be touched.
 */
export const STORE_BASE_URL = (
  (typeof process !== "undefined" ? process.env?.["STORE_BASE_URL"] : undefined) ??
  "https://mgwebappstore.lovable.app"
).replace(/\/+$/, "");

export const STORE_LIBRARY_URL = `${STORE_BASE_URL}/my-apps`;
