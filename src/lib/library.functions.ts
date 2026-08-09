import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Library / delivery layer.
 *
 * Two things happen here and both are decided server-side:
 *  - claiming a `free_account` product (an entitlement is written only after
 *    the server has read the product's access_mode from the database);
 *  - handing out a short-lived signed URL for a private file, only after the
 *    entitlement has been verified for that exact product.
 *
 * Knowing an asset id or a product URL never grants a download.
 */

const SLUG_RE = /^[a-z0-9-]{1,64}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUCKET = "product-files";
const SIGNED_URL_TTL = 300;

export type ClaimResult = { ok: boolean; error?: string };

/** Free products that require an account. Stripe is never involved. */
export const claimFreeProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { slug: string }) => {
    if (!SLUG_RE.test(data.slug)) throw new Error("Invalid product slug");
    return data;
  })
  .handler(async ({ data, context }): Promise<ClaimResult> => {
    const { supabase, userId } = context;

    const { data: product } = await supabase
      .from("products")
      .select("id, status, access_mode")
      .eq("slug", data.slug)
      .maybeSingle();

    if (!product) return { ok: false, error: "not_found" };
    const p = product as unknown as Record<string, unknown>;
    // The access mode is the database's decision, never the client's.
    if (p["access_mode"] !== "free_account") return { ok: false, error: "not_free" };
    if (p["status"] !== "active") return { ok: false, error: "not_available" };

    const { resolveServerStripeEnv } = await import("@/lib/payments-env.server");
    const environment = resolveServerStripeEnv();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { grantEntitlement, grantBundleContents } = await import("@/lib/entitlements.server");

    const productId = p["id"] as string;
    const granted = await grantEntitlement(supabaseAdmin as any, {
      userId,
      productId,
      environment,
      source: "free",
    });
    if (!granted) return { ok: false, error: "grant_failed" };

    // A free bundle unlocks exactly the products it lists, nothing more.
    await grantBundleContents(supabaseAdmin as any, {
      userId,
      bundleProductId: productId,
      environment,
    });

    return { ok: true };
  });

export type DownloadResult = { ok: boolean; url?: string; error?: string };

async function signPath(storagePath: string): Promise<DownloadResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any).storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL);
  if (error || !data?.signedUrl) return { ok: false, error: "signing_failed" };
  return { ok: true, url: data.signedUrl as string };
}

/** Download link for an owned product's file. Requires a live entitlement. */
export const getAssetDownloadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { assetId: string }) => {
    if (!UUID_RE.test(data.assetId)) throw new Error("Invalid asset id");
    return data;
  })
  .handler(async ({ data, context }): Promise<DownloadResult> => {
    const { supabase, userId } = context;

    const { data: asset } = await supabase
      .from("product_assets")
      .select("id, product_id, storage_path, is_active")
      .eq("id", data.assetId)
      .maybeSingle();

    if (!asset) return { ok: false, error: "not_found" };
    const a = asset as unknown as Record<string, unknown>;
    if (!a["is_active"] || !a["storage_path"]) return { ok: false, error: "not_available" };

    const { data: product } = await supabase
      .from("products")
      .select("id, status, access_mode")
      .eq("id", a["product_id"] as string)
      .maybeSingle();
    if (!product) return { ok: false, error: "not_found" };
    const p = product as unknown as Record<string, unknown>;
    // Paused products remain downloadable for who already owns them.
    if (p["status"] !== "active" && p["status"] !== "paused")
      return { ok: false, error: "not_available" };

    if (p["access_mode"] !== "free_public") {
      // Admin role (verified in the database) opens every product's files.
      const { data: isAdmin } = await (supabase as any).rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });

      if (isAdmin !== true) {
        const { resolveServerStripeEnv } = await import("@/lib/payments-env.server");
        const environment = resolveServerStripeEnv();

        const { data: entitlement } = await supabase
          .from("entitlements")
          .select("id")
          .eq("user_id", userId)
          .eq("product_id", a["product_id"] as string)
          .eq("is_active", true)
          .is("revoked_at", null)
          .eq("environment", environment)
          .maybeSingle();

        if (!entitlement) return { ok: false, error: "forbidden" };
      }
    }


    return signPath(a["storage_path"] as string);
  });

/**
 * Download link for a product the administrator explicitly published as
 * `free_public`. Any other product is rejected here.
 */
export const getPublicAssetDownloadUrl = createServerFn({ method: "POST" })
  .inputValidator((data: { assetId: string }) => {
    if (!UUID_RE.test(data.assetId)) throw new Error("Invalid asset id");
    return data;
  })
  .handler(async ({ data }): Promise<DownloadResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const { data: asset } = await admin
      .from("product_assets")
      .select("id, product_id, storage_path, is_active, products!inner(status, access_mode)")
      .eq("id", data.assetId)
      .maybeSingle();

    if (!asset || !asset.is_active || !asset.storage_path) return { ok: false, error: "not_found" };
    const product = asset.products;
    if (product?.access_mode !== "free_public" || product?.status !== "active") {
      return { ok: false, error: "forbidden" };
    }

    return signPath(asset.storage_path as string);
  });
