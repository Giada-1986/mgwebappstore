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

      {/* The catalogue headings only exist when the store really has something
          to show: the condition reads the live product list, so publishing a
          product makes the sections reappear on their own. */}
      {isLoading ? (
        <p className="mt-14 text-muted-foreground">{t("common.loading")}</p>
      ) : featured.length > 0 ? (
        <section className="mt-14">
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-xl font-semibold tracking-tight">{t("store.featured")}</h2>
            <Link to="/apps" className="text-sm text-muted-foreground hover:text-foreground">
              {t("store.allApps")}
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} owned={owned.has(p.id)} />
            ))}
          </div>
        </section>
      ) : (
        <section className="panel-pearl panel-pearl-hairline mt-14 px-7 py-10 text-center sm:px-10">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
            {t("store.soon.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-store-muted">
            {t("store.soon.text")}
          </p>
          <Link to="/suggest" className="btn-store mt-7 w-full text-sm sm:w-auto">
            {t("store.suggest.cta")}
          </Link>
        </section>
      )}

    </StoreShell>
  );
}
