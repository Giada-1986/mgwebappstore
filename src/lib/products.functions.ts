import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Catalog management for the admin dashboard.
 *
 * Only the catalog metadata lives here. Nothing in this file grants access to
 * a mini app: an internal route or an external `app_url` is just a link, and
 * opening a product is still authorised server-side by
 * `checkProductAccess` (user_id + product_id + environment + active
 * entitlement). Stripe, purchases and entitlements are never touched here.
 */

export type AdminProduct = {
  id: string;
  slug: string;
  name_it: string;
  name_en: string;
  short_description_it: string;
  short_description_en: string;
  description_it: string;
  description_en: string;
  category_id: string | null;
  image_url: string | null;
  accent_color: string | null;
  price: number;
  currency: string;
  stripe_price_id: string | null;
  product_type: string;
  status: string;
  /** How the product is obtained: paid | free_account | free_public. */
  access_mode: string;
  badge: string | null;
  app_path: string | null;
  app_url: string | null;
  sort_order: number;
};

export type ProductInput = Omit<AdminProduct, "id"> & { id?: string | null };

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const STATUSES = ["draft", "active", "hidden", "coming_soon", "archived"];
const TYPES = [
  "mini_app",
  "premium_app",
  "professional_app",
  "checklist",
  "template",
  "ebook",
  "guide",
  "bundle",
];
const ACCESS_MODES = ["paid", "free_account", "free_public"];

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || data !== true) throw new Error("Forbidden");
}

/** Internal route: must stay inside this app, no protocol, no traversal. */
function normaliseAppPath(value: string | null): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  if (!v.startsWith("/") || v.startsWith("//") || v.includes("..") || v.includes(":"))
    throw new Error("Invalid app path");
  if (v.length > 200) throw new Error("Invalid app path");
  return v;
}

/** External app or image address: https only, never javascript:/data:. */
function normaliseHttpsUrl(value: string | null, field: string): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  if (v.length > 500) throw new Error(`Invalid ${field}`);
  let url: URL;
  try {
    url = new URL(v);
  } catch {
    throw new Error(`Invalid ${field}`);
  }
  if (url.protocol !== "https:") throw new Error(`Invalid ${field}`);
  return url.toString();
}

function text(value: string | null | undefined, max: number, field: string, required = false) {
  const v = (value ?? "").trim();
  if (required && !v) throw new Error(`Missing ${field}`);
  if (v.length > max) throw new Error(`Invalid ${field}`);
  return v;
}

function validate(data: ProductInput): ProductInput {
  const slug = text(data.slug, 60, "slug", true).toLowerCase();
  if (!SLUG_RE.test(slug)) throw new Error("Invalid slug");
  if (!STATUSES.includes(data.status)) throw new Error("Invalid status");
  if (!TYPES.includes(data.product_type)) throw new Error("Invalid product type");
  if (!ACCESS_MODES.includes(data.access_mode)) throw new Error("Invalid access mode");

  const price = data.access_mode === "paid" ? Number(data.price) : 0;
  if (!Number.isFinite(price) || price < 0 || price > 100000) throw new Error("Invalid price");
  const currency = text(data.currency, 3, "currency", true).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Invalid currency");

  const accent = text(data.accent_color, 30, "accent color");
  if (accent && !/^(#[0-9a-fA-F]{3,8}|[0-9.\s%a-z()]+)$/.test(accent))
    throw new Error("Invalid accent color");

  return {
    id: data.id ?? null,
    slug,
    name_it: text(data.name_it, 120, "name_it", true),
    name_en: text(data.name_en, 120, "name_en", true),
    short_description_it: text(data.short_description_it, 300, "short_description_it"),
    short_description_en: text(data.short_description_en, 300, "short_description_en"),
    description_it: text(data.description_it, 6000, "description_it"),
    description_en: text(data.description_en, 6000, "description_en"),
    category_id: data.category_id || null,
    image_url: normaliseHttpsUrl(data.image_url, "image url"),
    accent_color: accent || null,
    price,
    currency,
    // Free products never carry Stripe data, whatever the form sends.
    stripe_price_id:
      data.access_mode === "paid" ? text(data.stripe_price_id, 120, "stripe price id") || null : null,
    product_type: data.product_type,
    status: data.status,
    access_mode: data.access_mode,
    badge: text(data.badge, 40, "badge") || null,
    app_path: normaliseAppPath(data.app_path),
    app_url: normaliseHttpsUrl(data.app_url, "app url"),
    sort_order: Number.isFinite(Number(data.sort_order)) ? Number(data.sort_order) : 0,
  };
}

export const listAdminProducts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminProduct[]> => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await (supabaseAdmin as any)
      .from("products")
      .select("*")
      .order("sort_order")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as AdminProduct[];
  });

export type SaveProductResult = { ok: boolean; id?: string; error?: string };

export const saveAdminProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: ProductInput) => validate(data))
  .handler(async ({ data, context }): Promise<SaveProductResult> => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const { id, ...fields } = data;

    if (id) {
      const { error } = await admin.from("products").update(fields).eq("id", id);
      if (error) return { ok: false, error: error.message };
      return { ok: true, id };
    }

    const { data: created, error } = await admin
      .from("products")
      .insert(fields)
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: created?.id };
  });

/* ---------------- product assets & bundle composition ---------------- */

export type ProductAsset = {
  id: string;
  product_id: string;
  asset_type: string;
  storage_path: string | null;
  external_url: string | null;
  title: string;
  sort_order: number;
  is_active: boolean;
};

export type AssetInput = Omit<ProductAsset, "id"> & { id?: string | null };

const ASSET_TYPES = ["file", "pdf", "image", "template_url", "app_route", "external_url"];

export const listProductAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { productId: string }) => data)
  .handler(async ({ data, context }): Promise<ProductAsset[]> => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await (supabaseAdmin as any)
      .from("product_assets")
      .select("*")
      .eq("product_id", data.productId)
      .order("sort_order");
    if (error) throw new Error(error.message);
    return (rows ?? []) as ProductAsset[];
  });

export const saveProductAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: AssetInput) => {
    if (!ASSET_TYPES.includes(data.asset_type)) throw new Error("Invalid asset type");
    const storage = text(data.storage_path, 400, "storage path");
    if (storage && (storage.startsWith("/") || storage.includes("..")))
      throw new Error("Invalid storage path");
    return {
      id: data.id ?? null,
      product_id: text(data.product_id, 40, "product", true),
      asset_type: data.asset_type,
      storage_path: storage || null,
      // Only https, never javascript:/data:
      external_url:
        data.asset_type === "app_route"
          ? normaliseAppPath(data.external_url)
          : normaliseHttpsUrl(data.external_url, "asset url"),
      title: text(data.title, 160, "title"),
      sort_order: Number.isFinite(Number(data.sort_order)) ? Number(data.sort_order) : 0,
      is_active: data.is_active !== false,
    } as AssetInput;
  })
  .handler(async ({ data, context }): Promise<SaveProductResult> => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { id, ...fields } = data;
    if (id) {
      const { error } = await admin.from("product_assets").update(fields).eq("id", id);
      if (error) return { ok: false, error: error.message };
      return { ok: true, id };
    }
    const { data: created, error } = await admin
      .from("product_assets")
      .insert(fields)
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: created?.id };
  });

export const deleteProductAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }): Promise<SaveProductResult> => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("product_assets")
      .delete()
      .eq("id", data.id);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });

export type BundleItem = { id: string; included_product_id: string };

export const listBundleItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { bundleId: string }) => data)
  .handler(async ({ data, context }): Promise<BundleItem[]> => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await (supabaseAdmin as any)
      .from("bundle_products")
      .select("id, included_product_id")
      .eq("bundle_product_id", data.bundleId)
      .order("sort_order");
    if (error) throw new Error(error.message);
    return (rows ?? []) as BundleItem[];
  });

export const setBundleItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { bundleId: string; includedId: string; include: boolean }) => data)
  .handler(async ({ data, context }): Promise<SaveProductResult> => {
    await assertAdmin(context as any);
    if (data.bundleId === data.includedId) return { ok: false, error: "self_reference" };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    if (!data.include) {
      const { error } = await admin
        .from("bundle_products")
        .delete()
        .eq("bundle_product_id", data.bundleId)
        .eq("included_product_id", data.includedId);
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }
    const { error } = await admin
      .from("bundle_products")
      .upsert(
        { bundle_product_id: data.bundleId, included_product_id: data.includedId },
        { onConflict: "bundle_product_id,included_product_id" },
      );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  });
