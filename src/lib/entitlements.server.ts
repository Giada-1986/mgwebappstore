/**
 * Server-only entitlement helpers shared by the Stripe webhook and the
 * free-product claim server function.
 *
 * Nothing here decides *whether* access is deserved: the caller must have
 * already verified the payment (webhook) or the product's access_mode
 * (free claim). These helpers only write the row, always scoped to
 * user_id + product_id + environment, so a product never unlocks another one.
 */

type Client = {
  from: (table: string) => any;
};

export type GrantInput = {
  userId: string;
  productId: string;
  environment: string;
  source: "purchase" | "free" | "gift" | "bundle";
  purchaseId?: string | null;
  accessType?: string;
};

export async function grantEntitlement(supabase: Client, input: GrantInput) {
  const { error } = await supabase.from("entitlements").upsert(
    {
      user_id: input.userId,
      product_id: input.productId,
      access_type: input.accessType ?? "lifetime",
      is_active: true,
      source: input.source,
      environment: input.environment,
      purchase_id: input.purchaseId ?? null,
      granted_at: new Date().toISOString(),
      revoked_at: null,
    },
    { onConflict: "user_id,product_id,environment" },
  );
  if (error) console.error("Failed to grant entitlement", input.productId, error);
  return !error;
}

/**
 * Bundles unlock ONLY the products explicitly listed in bundle_products for
 * that exact bundle. The list is read server-side; the client never supplies it.
 */
export async function grantBundleContents(
  supabase: Client,
  input: { userId: string; bundleProductId: string; environment: string; purchaseId?: string | null },
) {
  const { data, error } = await supabase
    .from("bundle_products")
    .select("included_product_id")
    .eq("bundle_product_id", input.bundleProductId);

  if (error) {
    console.error("Failed to read bundle contents", input.bundleProductId, error);
    return;
  }

  for (const row of data ?? []) {
    const includedId = row["included_product_id"] as string;
    if (!includedId || includedId === input.bundleProductId) continue;
    await grantEntitlement(supabase, {
      userId: input.userId,
      productId: includedId,
      environment: input.environment,
      source: "bundle",
      purchaseId: input.purchaseId ?? null,
    });
  }
}
