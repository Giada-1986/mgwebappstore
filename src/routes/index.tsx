import { createFileRoute, Link } from "@tanstack/react-router";
import { StoreShell } from "@/components/store/StoreShell";
import { StoreLogo } from "@/components/store/StoreLogo";
import { ProductCard } from "@/components/store/ProductCard";
import { useI18n } from "@/lib/i18n";
import { useEntitlements, useProducts, useSession } from "@/lib/platform";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mini Web Apps — Piccole app. Soluzioni immediate." },
      {
        name: "description",
        content:
          "Mini Web Apps: acquisti una volta, la tua app resta tua, nessun abbonamento. Un solo account per tutti i tuoi strumenti quotidiani.",
      },
      { property: "og:title", content: "Mini Web Apps" },
      {
        property: "og:description",
        content: "Piccole app. Soluzioni immediate. Acquisto unico, accesso a vita.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StoreHome,
});


function StoreHome() {
  const { t } = useI18n();
  const { session } = useSession();
  const { data: products, isLoading } = useProducts();
  const { data: entitlements } = useEntitlements(session?.user.id);
  const owned = new Set((entitlements ?? []).map((e) => e.product_id));
  const featured = (products ?? []).filter((p) => p.status === "active").slice(0, 3);

  return (
    <StoreShell>
      <section className="card-store px-8 py-12 text-center">
        <StoreLogo priority className="mx-auto h-40 w-40 rounded-2xl sm:h-48 sm:w-48" />
        <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("store.heroTitle")}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">{t("store.heroText")}</p>
        <p className="mx-auto mt-4 max-w-xl font-medium">{t("store.promise")}</p>
        <Link to="/apps" className="btn-store mt-8">
          {t("store.heroCta")}
        </Link>
      </section>


      <section className="mt-12">
        <h2 className="mb-5 text-xl font-semibold tracking-tight">{t("store.featured")}</h2>
        {isLoading ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} owned={owned.has(p.id)} />
            ))}
          </div>
        )}
      </section>
    </StoreShell>
  );
}
