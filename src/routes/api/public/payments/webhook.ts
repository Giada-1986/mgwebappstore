import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { type StripeEnv, createStripeClient, verifyWebhook } from "@/lib/stripe.server";
import { resolveServerStripeEnv } from "@/lib/payments-env.server";

/** Stripe payment_status values that mean the money is (or will never be) due. */
const PAID_STATUSES = new Set(["paid", "no_payment_required"]);

let _supabase: any = null;
function getSupabase(): any {
  if (!_supabase) {
    _supabase = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
    );
  }
  return _supabase;
}

/** Single source of truth for access: only the webhook grants entitlements. */
async function fulfil(sessionFromEvent: any, env: StripeEnv) {
  // Re-read the session from Stripe with this environment's credentials.
  // A signed event is already trusted, but re-fetching guarantees the payment
  // state is the current one held by Stripe and that the session really
  // belongs to this environment's account.
  let session: any;
  try {
    session = await createStripeClient(env).checkout.sessions.retrieve(sessionFromEvent.id);
  } catch (e) {
    console.error("Could not retrieve checkout session from Stripe", sessionFromEvent?.id, e);
    return;
  }

  if (session.mode !== "payment") {
    console.error("Ignoring non one-time checkout session", session.id, session.mode);
    return;
  }
  if (!PAID_STATUSES.has(session.payment_status)) {
    console.error("Refusing to fulfil unpaid session", session.id, session.payment_status);
    return;
  }

  const userId = session.metadata?.user_id;
  const productId = session.metadata?.product_id;
  if (!userId || !productId) {
    console.error("Checkout session without user_id/product_id metadata", session.id);
    return;
  }

  const supabase = getSupabase();
  const amount = typeof session.amount_total === "number" ? session.amount_total / 100 : null;

  const { data: purchase, error: purchaseError } = await supabase
    .from("purchases")
    .upsert(
      {
        user_id: userId,
        product_id: productId,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id:
          typeof session.payment_intent === "string" ? session.payment_intent : null,
        amount_paid: amount,
        currency: (session.currency ?? "eur").toUpperCase(),
        status: "paid",
        environment: env,
        purchased_at: new Date().toISOString(),
      },
      { onConflict: "stripe_checkout_session_id" },
    )
    .select("id")
    .maybeSingle();

  if (purchaseError) {
    console.error("Failed to record purchase", purchaseError);
    return;
  }

  const { error: entitlementError } = await supabase.from("entitlements").upsert(
    {
      user_id: userId,
      product_id: productId,
      access_type: "lifetime",
      is_active: true,
      source: "purchase",
      environment: env,
      purchase_id: purchase?.["id"] ?? null,
      granted_at: new Date().toISOString(),
      revoked_at: null,
    },
    { onConflict: "user_id,product_id,environment" },
  );

  if (entitlementError) console.error("Failed to grant entitlement", entitlementError);
}

async function markStatus(session: any, status: string, env: StripeEnv) {
  if (!session?.id) return;
  await getSupabase()
    .from("purchases")
    .update({ status })
    .eq("stripe_checkout_session_id", session.id)
    .eq("environment", env);
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.type) {
    case "checkout.session.completed": {
      await fulfil(event.data.object, env);
      break;
    }
    case "checkout.session.async_payment_succeeded":
      await fulfil(event.data.object, env);
      break;
    case "checkout.session.async_payment_failed":
      await markStatus(event.data.object, "failed", env);
      break;
    case "checkout.session.expired":
      await markStatus(event.data.object, "cancelled", env);
      break;
    default:
      console.log("Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("Webhook with invalid env:", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        // Hard separation: on a live deployment, sandbox events are ignored
        // (and vice versa) so test payments can never grant live access.
        const serverEnv = resolveServerStripeEnv();
        if (rawEnv !== serverEnv) {
          console.error(`Ignoring ${rawEnv} webhook on ${serverEnv} deployment`);
          return Response.json({ received: true, ignored: "environment mismatch" });
        }
        try {
          await handleWebhook(request, rawEnv as StripeEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
