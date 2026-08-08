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
      <section className="card-store overflow-hidden px-6 py-14 text-center sm:px-12">
        <StoreLogo
          priority
          className="mx-auto h-36 w-36 rounded-3xl ring-1 ring-primary/25 sm:h-44 sm:w-44"
        />
        <p
          translate="no"
          className="notranslate mt-8 text-xs uppercase tracking-[0.42em] text-primary"
        >
          {t("store.brand")}
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
          {t("store.heroTitle")}
        </h1>
        <p className="mx-auto mt-5 max-w-xl leading-relaxed text-muted-foreground">
          {t("store.heroText")}
        </p>
        <div className="store-hairline mx-auto mt-9 w-40" />
        <Link to="/apps" className="btn-store mt-9">
          {t("store.heroCta")}
        </Link>
      </section>

      <section className="panel-pearl mt-6 px-8 py-8 text-center">
        <p className="text-base font-medium sm:text-lg">{t("store.promise")}</p>
      </section>

      <section className="panel-pearl mt-6 flex flex-wrap items-center justify-between gap-4 px-8 py-7">
        <div className="min-w-0">
          <h2 className="text-base font-semibold sm:text-lg">{t("store.suggest.homeTitle")}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">{t("store.suggest.homeText")}</p>
        </div>
        <Link to="/suggest" className="btn-store-ghost text-sm">
          {t("store.suggest.cta")}
        </Link>
      </section>

      <section className="mt-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-xl font-semibold tracking-tight">{t("store.featured")}</h2>
          <Link to="/apps" className="text-sm text-muted-foreground hover:text-foreground">
            {t("store.allApps")}
          </Link>
        </div>
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
