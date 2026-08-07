import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createStripeClient, getStripeErrorMessage } from "@/lib/stripe.server";
import { resolveServerStripeEnv } from "@/lib/payments-env.server";

type CheckoutSessionResult = { clientSecret: string } | { error: string };

/**
 * Platform-wide checkout: creates a ONE-TIME (mode: payment) Stripe session for
 * any product in the catalog. Access is never granted here — only the webhook
 * may create a purchase/entitlement.
 */
export const createProductCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { productSlug: string; returnUrl: string }) => {
      if (!/^[a-z0-9-]+$/.test(data.productSlug)) throw new Error("Invalid product slug");
      return data;
    },
  )
  .handler(async ({ data, context }): Promise<CheckoutSessionResult> => {
    const { supabase, userId } = context;
    // The environment is derived on the server only — never from client input.
    const environment = resolveServerStripeEnv();

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, slug, name_it, name_en, price, currency, stripe_price_id, status")
      .eq("slug", data.productSlug)
      .maybeSingle();

    if (productError || !product) return { error: "Prodotto non disponibile." };
    if (product.status !== "active") return { error: "Prodotto non ancora acquistabile." };
    if (!product.stripe_price_id) return { error: "Prezzo non configurato per questo prodotto." };

    const { data: existing } = await supabase
      .from("entitlements")
      .select("id")
      .eq("user_id", userId)
      .eq("product_id", product.id)
      .eq("is_active", true)
      .eq("environment", environment)
      .maybeSingle();
    if (existing) return { error: "Hai già accesso a questo prodotto." };

    const {
      data: { user },
    } = await supabase.auth.getUser();

    try {
      const stripe = createStripeClient(environment);

      const prices = await stripe.prices.list({ lookup_keys: [product.stripe_price_id] });
      const stripePrice = prices.data[0];
      if (!stripePrice) return { error: "Prezzo non trovato." };

      const customerId = await resolveOrCreateCustomer(stripe, {
        userId,
        ...(user?.email ? { email: user.email } : {}),
      });

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: stripePrice.id, quantity: 1 }],
        mode: "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        payment_intent_data: { description: product.name_it },
        metadata: {
          user_id: userId,
          product_id: product.id,
          product_slug: product.slug,
          environment,
        },
        managed_payments: { enabled: true },
      } as any);

      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId: string },
): Promise<string> {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.userId)) throw new Error("Invalid userId");

  const found = await stripe.customers.search({
    query: `metadata['userId']:'${options.userId}'`,
    limit: 1,
  });
  if (found.data.length && found.data[0]) return found.data[0].id;

  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    const customer = existing.data[0];
    if (customer) {
      if (customer.metadata?.["userId"] !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }

  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    metadata: { userId: options.userId },
  });
  return created.id;
}
