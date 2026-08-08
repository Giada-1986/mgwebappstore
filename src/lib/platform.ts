import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "@/lib/i18n";

/**
 * Platform layer shared by every mini app of the store:
 * account, catalog, purchases, entitlements and per-product state.
 * Nothing here is specific to a single product.
 */

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  preferred_language: string;
  created_at: string;
  /** Explicit opt-in for promotional email. Service emails never depend on it. */
  marketing_consent: boolean;
  marketing_consent_at: string | null;
  marketing_language: string | null;
};

export type Category = {
  id: string;
  slug: string;
  name_it: string;
  name_en: string;
  sort_order: number;
};

export type Product = {
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
  product_type:
    | "mini_app"
    | "premium_app"
    | "professional_app"
    | "checklist"
    | "template"
    | "ebook"
    | "guide"
    | "bundle"
    | string;
  status: string;
  /** paid | free_account | free_public — decided by the admin, enforced server-side. */
  access_mode: "paid" | "free_account" | "free_public" | string;
  badge: string | null;
  /** Internal route of the mini app (preferred). */
  app_path: string | null;
  /** Optional external app address. A URL alone never authorises access. */
  app_url: string | null;
  sort_order: number;
};

export type Entitlement = {
  id: string;
  user_id: string;
  product_id: string;
  access_type: string;
  is_active: boolean;
  granted_at: string;
  revoked_at: string | null;
};

export type Purchase = {
  id: string;
  product_id: string;
  amount_paid: number | null;
  currency: string;
  status: string;
  purchased_at: string | null;
  created_at: string;
};

export type ProductState = {
  id: string;
  user_id: string;
  product_id: string;
  onboarding_completed: boolean;
  first_opened_at: string | null;
  last_opened_at: string | null;
  settings: Record<string, unknown>;
};

/**
 * Localised helpers so store components never hardcode a language.
 * Catalogue content only exists in IT/EN: other UI languages fall back to
 * English copy, while product names keep the official Italian title
 * (only English has an approved localised product name).
 */
export function productName(p: Product, lang: Lang) {
  return lang === "en" ? p.name_en : p.name_it;
}
export function productShort(p: Product, lang: Lang) {
  return lang === "it" ? p.short_description_it : p.short_description_en;
}
export function productDescription(p: Product, lang: Lang) {
  return lang === "it" ? p.description_it : p.description_en;
}
export function categoryName(c: Category, lang: Lang) {
  return lang === "it" ? c.name_it : c.name_en;
}

/** A product is free when the admin marked it as such, not because price = 0. */
export function isFreeProduct(p: Pick<Product, "access_mode">) {
  return p.access_mode === "free_account" || p.access_mode === "free_public";
}

/** Never render 0,00 € — free products show a label instead. */
export function priceLabel(p: Product, lang: Lang, freeText: string) {
  return isFreeProduct(p) || Number(p.price) <= 0
    ? freeText
    : formatPrice(Number(p.price), p.currency, lang);
}

export function formatPrice(price: number, currency: string, lang: Lang) {
  return new Intl.NumberFormat(lang === "en" ? "en-IE" : "it-IT", {
    style: "currency",
    currency: currency || "EUR",
  }).format(price);
}

/* ---------------- session & profile ---------------- */

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading };
}

export function useProfile(userId?: string) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, email, display_name, preferred_language, created_at, marketing_consent, marketing_consent_at, marketing_language",
        )
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

export function useUpdateProfile(userId?: string) {
  const qc = useQueryClient();
  return async (patch: Partial<Profile>) => {
    if (!userId) return;
    const { error } = await supabase.from("profiles").update(patch as never).eq("id", userId);
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["profile", userId] });
  };
}

/* ---------------- catalog ---------------- */

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: async (): Promise<Product | null> => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as Product | null;
    },
  });
}

/* ---------------- entitlements & purchases ---------------- */

/** Environment of this build, derived from the pub Stripe token. */
function clientPaymentsEnvironment(): "sandbox" | "live" {
  const token = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] as string | undefined;
  return token?.startsWith("pk_live_") ? "live" : "sandbox";
}

export function useEntitlements(userId?: string) {
  return useQuery({
    queryKey: ["entitlements", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Entitlement[]> => {
      const { data, error } = await supabase
        .from("entitlements")
        .select("*")
        .eq("user_id", userId!)
        .eq("is_active", true)
        // Refunded / revoked access must disappear from the library too.
        .is("revoked_at", null)
        // Display-level filter only; the authoritative check is server-side.
        .eq("environment", clientPaymentsEnvironment());
      if (error) throw error;
      return (data ?? []) as unknown as Entitlement[];
    },
  });
}

/** Products the user owns, joined with the catalog. */
export function useMyApps(userId?: string) {
  const entitlements = useEntitlements(userId);
  const products = useProducts();
  const owned = (entitlements.data ?? [])
    .map((e) => products.data?.find((p) => p.id === e.product_id))
    .filter((p): p is Product => !!p);
  return {
    apps: owned,
    isLoading: entitlements.isLoading || products.isLoading,
  };
}

/** Access check for a single product slug — always entitlement-based. */
export function useHasAccess(slug: string, userId?: string) {
  const entitlements = useEntitlements(userId);
  const product = useProduct(slug);
  const hasAccess = !!(
    product.data && entitlements.data?.some((e) => e.product_id === product.data!.id)
  );
  return {
    hasAccess,
    product: product.data ?? null,
    isLoading: entitlements.isLoading || product.isLoading,
  };
}

export function usePurchases(userId?: string) {
  return useQuery({
    queryKey: ["purchases", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Purchase[]> => {
      const { data, error } = await supabase
        .from("purchases")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Purchase[];
    },
  });
}

/* ---------------- per-product user state ---------------- */

export function useProductState(userId?: string, productId?: string) {
  return useQuery({
    queryKey: ["product-state", userId, productId],
    enabled: !!userId && !!productId,
    queryFn: async (): Promise<ProductState | null> => {
      const { data, error } = await supabase
        .from("user_product_state")
        .select("*")
        .eq("user_id", userId!)
        .eq("product_id", productId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as ProductState | null;
    },
  });
}

export function useUpdateProductState(userId?: string, productId?: string) {
  const qc = useQueryClient();
  return async (patch: Partial<Omit<ProductState, "id" | "user_id" | "product_id">>) => {
    if (!userId || !productId) return;
    const { error } = await supabase
      .from("user_product_state")
      .upsert({ user_id: userId, product_id: productId, ...patch } as never, {
        onConflict: "user_id,product_id",
      });
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["product-state", userId, productId] });
  };
}

/* ---------------- product contents (assets & bundles) ---------------- */

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

/**
 * Assets are read through RLS: a row is visible only for a product the user
 * actually owns, or for a product explicitly published as free_public.
 */
export function useProductAssets(productId?: string) {
  return useQuery({
    queryKey: ["product-assets", productId],
    enabled: !!productId,
    queryFn: async (): Promise<ProductAsset[]> => {
      const { data, error } = await supabase
        .from("product_assets")
        .select("*")
        .eq("product_id", productId!)
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as ProductAsset[];
    },
  });
}

/** Products included in a bundle (public composition, no access implied). */
export function useBundleContents(bundleId?: string) {
  const products = useProducts();
  const items = useQuery({
    queryKey: ["bundle-contents", bundleId],
    enabled: !!bundleId,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("bundle_products")
        .select("included_product_id")
        .eq("bundle_product_id", bundleId!)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []).map((r) => (r as { included_product_id: string }).included_product_id);
    },
  });
  const included = (items.data ?? [])
    .map((id) => products.data?.find((p) => p.id === id))
    .filter((p): p is Product => !!p);
  return { included, isLoading: items.isLoading || products.isLoading };
}
