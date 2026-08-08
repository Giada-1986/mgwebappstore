import posthog from "posthog-js";

/**
 * Product analytics for the store.
 *
 * Only the publishable PostHog project token is used, so nothing secret ever
 * reaches the browser. Never pass passwords, card data or Stripe secrets here.
 */

export type StoreEvent =
  | "store_viewed"
  | "product_viewed"
  | "signup_started"
  | "signup_completed"
  | "login_completed"
  | "checkout_started"
  | "purchase_completed"
  | "product_opened"
  | "product_claimed"
  | "marketing_consent_given";

let ready = false;
/** True while the current session belongs to a store administrator. */
let blocked = false;

function token() {
  return import.meta.env["VITE_LOVABLE_CONNECTOR_POSTHOG_API_KEY"] as string | undefined;
}

/**
 * Commercial analytics must measure customers only. When the signed-in user
 * has the `admin` role (decided by the database, never by an email), capturing
 * is disabled and any previously stored opt-out is cleared again on sign-out,
 * so the same browser keeps tracking normal visitors.
 */
export function setAnalyticsBlocked(next: boolean) {
  blocked = next;
  if (!ready || typeof window === "undefined") return;
  if (next) {
    posthog.opt_out_capturing();
    posthog.reset();
  } else if (posthog.has_opted_out_capturing?.()) {
    posthog.opt_in_capturing();
  }
}

export function isAnalyticsBlocked() {
  return blocked;
}

export function initAnalytics() {
  if (ready || blocked || typeof window === "undefined") return;
  const key = token();
  if (!key) return;
  const region = (import.meta.env["VITE_LOVABLE_CONNECTOR_POSTHOG_REGION"] as string) || "eu";
  posthog.init(key, {
    api_host: region === "us" ? "https://us.i.posthog.com" : "https://eu.i.posthog.com",
    capture_pageview: false,
    persistence: "localStorage+cookie",
  });
  ready = true;
  if (posthog.has_opted_out_capturing?.()) posthog.opt_in_capturing();
}

export function track(event: StoreEvent, properties: Record<string, unknown> = {}) {
  if (!ready || blocked) return;
  posthog.capture(event, properties);
}

export function trackPageView(path: string) {
  if (!ready || blocked) return;
  posthog.capture("$pageview", { $current_url: path });
}


/** Bind events to the internal Supabase user id. */
export function identifyUser(userId: string, properties: Record<string, unknown> = {}) {
  if (!ready) return;
  posthog.identify(userId, properties);
}

export function resetAnalytics() {
  if (!ready) return;
  posthog.reset();
}
