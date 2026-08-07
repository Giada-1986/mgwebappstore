import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AccessResult = {
  userId: string;
  productId: string | null;
  hasAccess: boolean;
};

/**
 * Server-side access check for a mini app.
 *
 * The browser can never be trusted: the bearer token is validated on the server,
 * the user is identified through the token claims (auth.uid()), the product is
 * resolved from the slug and the entitlement is read with RLS applied as that
 * user. Knowing or sharing the URL grants nothing.
 */
export const checkProductAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { slug: string }) => {
    if (!/^[a-z0-9-]{1,64}$/.test(data.slug)) throw new Error("Invalid product slug");
    return data;
  })
  .handler(async ({ data, context }): Promise<AccessResult> => {
    const { supabase, userId } = context;

    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, access_mode, status")
      .eq("slug", data.slug)
      .maybeSingle();

    if (productError || !product) return { userId, productId: null, hasAccess: false };

    const p = product as unknown as Record<string, unknown>;

    // Only products the administrator explicitly published as fully public
    // skip the entitlement check. Everything else stays gated.
    if (p["access_mode"] === "free_public" && p["status"] === "active") {
      return { userId, productId: p["id"] as string, hasAccess: true };
    }


    const { resolveServerStripeEnv } = await import("@/lib/payments-env.server");
    const environment = resolveServerStripeEnv();

    const { data: entitlement, error } = await supabase
      .from("entitlements")
      .select("id, source, purchase_id, purchases(status, environment)")
      .eq("user_id", userId)
      .eq("product_id", product.id)
      .eq("is_active", true)
      .is("revoked_at", null)
      .eq("environment", environment)
      .maybeSingle();

    if (error) return { userId, productId: product.id, hasAccess: false };

    if (!entitlement) return { userId, productId: product.id, hasAccess: false };

    const row = entitlement as unknown as {
      source: string;
      purchase_id: string | null;
      purchases: { status: string; environment: string } | { status: string; environment: string }[] | null;
    };

    // Paid and bundle access must still be backed by the exact paid purchase.
    // This is a second server-side barrier: even if entitlement revocation were
    // delayed, a refunded/cancelled purchase can no longer authorise the app.
    if (row.source === "purchase" || row.source === "bundle") {
      const relatedPurchase = Array.isArray(row.purchases) ? row.purchases[0] : row.purchases;
      const purchaseIsValid =
        !!row.purchase_id &&
        relatedPurchase?.status === "paid" &&
        relatedPurchase.environment === environment;
      if (!purchaseIsValid) return { userId, productId: product.id, hasAccess: false };
    }

    return { userId, productId: product.id, hasAccess: true };
  });
