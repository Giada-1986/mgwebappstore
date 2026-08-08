import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { StoreShell } from "@/components/store/StoreShell";
import { ProductCard } from "@/components/store/ProductCard";
import { useI18n } from "@/lib/i18n";
import {
  categoryName,
  isFreeProduct,
  useCategories,
  useEntitlements,
  useProducts,
  useSession,
} from "@/lib/platform";

export const Route = createFileRoute("/apps/")({
  head: () => ({
    meta: [
      { title: "Catalogo — Mini Web Apps" },
      {
        name: "description",
        content:
          "Mini web app, checklist, template, ebook e guide: piccole soluzioni digitali pronte all'uso.",
      },
      { property: "og:title", content: "Catalogo — Mini Web Apps" },
      {
        property: "og:description",
        content: "Sfoglia app, checklist, template ed ebook dello store.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CatalogPage,
});

/** Product-type sections. `free` cuts across every type. */
type TypeFilter = "all" | "mini_apps" | "checklist" | "template" | "ebooks" | "bundle" | "free";

const TYPE_FILTERS: { key: TypeFilter; labelKey: string }[] = [
  { key: "all", labelKey: "store.filters.all" },
  { key: "mini_apps", labelKey: "store.filters.miniApps" },
  { key: "checklist", labelKey: "store.filters.checklist" },
  { key: "template", labelKey: "store.filters.template" },
  { key: "ebooks", labelKey: "store.filters.ebooks" },
  { key: "bundle", labelKey: "store.filters.bundle" },
  { key: "free", labelKey: "store.filters.free" },
];

const APP_TYPES = ["mini_app", "premium_app", "professional_app"];

function matchesType(productType: string, filter: TypeFilter) {
  if (filter === "mini_apps") return APP_TYPES.includes(productType);
  if (filter === "ebooks") return productType === "ebook" || productType === "guide";
  return productType === filter;
}

function CatalogPage() {
  const { t, lang } = useI18n();
  const { session } = useSession();
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const { data: entitlements } = useEntitlements(session?.user.id);
  const [category, setCategory] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const owned = new Set((entitlements ?? []).map((e) => e.product_id));
  const visible = (products ?? []).filter((p) => {
    // Retired products stay in the database for history, never in the catalogue.
    if (p.status === "archived") return false;
    if (category && p.category_id !== category) return false;
    if (typeFilter === "all") return true;
    if (typeFilter === "free") return isFreeProduct(p);
    return matchesType(p.product_type, typeFilter);
  });

  const pill = (active: boolean) =>
    `rounded-full border px-4 py-1.5 text-sm transition-colors ${
      active
        ? "border-primary bg-primary font-medium text-primary-foreground"
        : "border-border text-muted-foreground hover:text-foreground"
    }`;

  return (
    <StoreShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t("store.allApps")}</h1>
      <p className="mt-2 text-muted-foreground">{t("store.catalogIntro")}</p>

      <div className="mt-7 flex flex-wrap gap-2">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setTypeFilter(f.key)}
            className={pill(typeFilter === f.key)}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      <p className="mt-7 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {t("store.themes")}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => setCategory(null)} className={pill(category === null)}>
          {t("store.allCategories")}
        </button>
        {(categories ?? []).map((c) => (
          <button key={c.id} onClick={() => setCategory(c.id)} className={pill(category === c.id)}>
            {categoryName(c, lang)}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p) => (
          <ProductCard key={p.id} product={p} owned={owned.has(p.id)} />
        ))}
      </div>

      {!isLoading && visible.length === 0 && (
        <p className="mt-10 text-muted-foreground">{t("store.noProducts")}</p>
      )}
    </StoreShell>
  );
}
