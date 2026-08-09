import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Customer-facing purchase history.
 *
 * Every read is scoped by RLS to auth.uid() through the request-bound
 * `context.supabase` client: the client never supplies a user id, and no
 * cross-user row can be reached by tampering with the request.
 *
 * `purchase_emails` stays service_role-only and is never read here.
 */

export type MyPurchase = {
  id: string;
  productId: string;
  productSlug: string | null;
  productNameIt: string | null;
  productNameEn: string | null;
  productImageUrl: string | null;
  productStatus: string | null;
  appPath: string | null;
  appUrl: string | null;
  amountPaid: number | null;
  currency: string;
  status: string;
  purchasedAt: string | null;
  createdAt: string;
  /** Lifetime access still valid for this product (same environment). */
  hasAccess: boolean;
  /** True when a refund/chargeback revoked the lifetime access. */
  accessRevoked: boolean;
  /** A receipt can be fetched server-side for this purchase. */
  receiptAvailable: boolean;
};

export const listMyPurchases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyPurchase[]> => {
    const { supabase, userId } = context;

    const { data: purchases, error } = await supabase
      .from("purchases")
      .select(
        "id, product_id, amount_paid, currency, status, purchased_at, created_at, environment, stripe_payment_intent_id",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !purchases) return [];

    const { data: entitlements } = await supabase
      .from("entitlements")
      .select("product_id, environment, is_active, revoked_at")
      .eq("user_id", userId);

    // Product metadata (name, cover, route) must stay visible in the history
    // even when the product has been archived and is no longer readable
    // through the public catalog policy. Only products the user actually
    // purchased are looked up, and only non-sensitive columns are returned.
    const productIds = [...new Set(purchases.map((p) => p["product_id"] as string))];
    const products = new Map<string, Record<string, unknown>>();
    if (productIds.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: rows } = await supabaseAdmin
        .from("products")
        .select("id, slug, name_it, name_en, image_url, status, app_path, app_url")
        .in("id", productIds);
      for (const row of rows ?? []) products.set(row["id"] as string, row);
    }

    return purchases.map((p) => {
      const product = products.get(p["product_id"] as string);
      const ent = (entitlements ?? []).find(
        (e) =>
          e["product_id"] === p["product_id"] && e["environment"] === p["environment"],
      );
      const hasAccess = !!ent && ent["is_active"] === true && ent["revoked_at"] === null;
      const productStatus = (product?.["status"] as string | undefined) ?? null;

      return {
        id: p["id"] as string,
        productId: p["product_id"] as string,
        productSlug: (product?.["slug"] as string | undefined) ?? null,
        productNameIt: (product?.["name_it"] as string | undefined) ?? null,
        productNameEn: (product?.["name_en"] as string | undefined) ?? null,
        productImageUrl: (product?.["image_url"] as string | undefined) ?? null,
        productStatus,
        appPath: (product?.["app_path"] as string | undefined) ?? null,
        appUrl: (product?.["app_url"] as string | undefined) ?? null,
        amountPaid: p["amount_paid"] === null ? null : Number(p["amount_paid"]),
        currency: (p["currency"] as string) ?? "EUR",
        status: p["status"] as string,
        purchasedAt: (p["purchased_at"] as string | null) ?? null,
        createdAt: p["created_at"] as string,
        hasAccess,
        accessRevoked: !!ent && !hasAccess,
        // The Stripe identifier itself is NEVER sent to the browser.
        receiptAvailable: !!p["stripe_payment_intent_id"],
      };
    });
  });

/**
 * Resolves the Stripe-hosted receipt for one purchase, on demand.
 * The purchase is re-read through RLS first, so a forged id can only ever
 * match a row already owned by the caller. Stripe secrets stay server-side.
 */
export const getPurchaseReceiptUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { purchaseId: string }) => {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.purchaseId)
    ) {
      throw new Error("Invalid purchase id");
    }
    return data;
  })
  .handler(async ({ data, context }): Promise<{ url: string } | { error: string }> => {
    const { supabase, userId } = context;

    const { data: purchase } = await supabase
      .from("purchases")
      .select("id, user_id, stripe_payment_intent_id, environment")
      .eq("id", data.purchaseId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!purchase || purchase["user_id"] !== userId) return { error: "not_found" };

    const paymentIntentId = purchase["stripe_payment_intent_id"] as string | null;
    if (!paymentIntentId) return { error: "unavailable" };

    try {
      const { createStripeClient } = await import("@/lib/stripe.server");
      const stripe = createStripeClient(
        (purchase["environment"] as string) === "live" ? "live" : "sandbox",
      );
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["latest_charge"],
      });
      const charge = intent.latest_charge as { receipt_url?: string | null } | null;
      const url = charge?.receipt_url ?? null;
      return url ? { url } : { error: "unavailable" };
    } catch {
      return { error: "unavailable" };
    }
  });
