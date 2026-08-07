/**
 * Single server-side source of truth for the payments environment.
 *
 * The browser NEVER decides which Stripe environment is used: a tampered
 * client could otherwise force `sandbox` on a live deployment, pay with a test
 * card and obtain a real entitlement. The value is derived exclusively from
 * server secrets provisioned by the platform.
 */
export type StripeEnv = "sandbox" | "live";

export function resolveServerStripeEnv(): StripeEnv {
  const hasLive =
    !!process.env["STRIPE_LIVE_API_KEY"] && !!process.env["PAYMENTS_LIVE_WEBHOOK_SECRET"];
  return hasLive ? "live" : "sandbox";
}
