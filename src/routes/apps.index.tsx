import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { StoreShell } from "@/components/store/StoreShell";
import { ProductCard } from "@/components/store/ProductCard";
import { useI18n } from "@/lib/i18n";
import {
  categoryName,
  useCategories,
  useEntitlements,
  useProducts,
  useSession,
} from "@/lib/platform";

export const Route = createFileRoute("/apps/")({
  head: () => ({
    meta: [
      { title: "Catalogo — Mini Apps Store" },
      {
        name: "description",
        content: "Tutte le mini app disponibili: benessere, produttività e crescita personale.",
      },
      { property: "og:title", content: "Catalogo — Mini Apps Store" },
      { property: "og:description", content: "Sfoglia tutte le mini app dello store." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CatalogPage,
});

function CatalogPage() {
  const { t, lang } = useI18n();
  const { session } = useSession();
  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const { data: entitlements } = useEntitlements(session?.user.id);
  const [category, setCategory] = useState<string | null>(null);

  const owned = new Set((entitlements ?? []).map((e) => e.product_id));
  const visible = (products ?? []).filter((p) => !category || p.category_id === category);

  return (
    <StoreShell>
      <h1 className="text-2xl font-semibold tracking-tight">{t("store.allApps")}</h1>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={() => setCategory(null)}
          className={`rounded-full border px-4 py-1.5 text-sm ${
            category === null ? "border-primary bg-primary text-primary-foreground" : "border-border"
          }`}
        >
          {t("store.allCategories")}
        </button>
        {(categories ?? []).map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              category === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border"
            }`}
          >
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
