import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { type Product, productName, productShort } from "@/lib/platform";
import { LifetimeAccessBadge, ProductTypeBadge } from "@/components/store/Badges";
import { ProductContents } from "@/components/store/ProductContents";
import { BundleContents } from "@/components/store/BundleContents";
import { track } from "@/lib/analytics";

const APP_TYPES = ["mini_app", "premium_app", "professional_app"];

/**
 * Personal library — every kind of owned product, not just mini apps.
 * The grid only renders what the entitlement query already returned.
 */
export function MyAppsGrid({ apps }: { apps: Product[] }) {
  const { t, lang } = useI18n();

  if (apps.length === 0) {
    return (
      <div className="card-store p-12 text-center">
        <p className="text-muted-foreground">{t("store.emptyLibrary")}</p>
        <Link to="/apps" className="btn-store mt-6">
          {t("store.discoverMiniApps")}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {apps.map((app) => {
        // Internal route first; an external address is only a link — access is
        // still verified server-side when the mini app is opened.
        const target = app.app_path ?? app.app_url;
        const external = !app.app_path && !!app.app_url;
        const isApp = APP_TYPES.includes(app.product_type);
        const isBundle = app.product_type === "bundle";

        return (
          <article key={app.id} className="card-store flex flex-col gap-3 p-7">
            <div className="flex flex-wrap items-center gap-2">
              <ProductTypeBadge type={app.product_type} />
              <LifetimeAccessBadge />
            </div>
            <h3 translate="no" className="notranslate text-lg font-semibold tracking-tight">
              {productName(app, lang)}
            </h3>
            <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
              {productShort(app, lang)}
            </p>

            {isBundle && <BundleContents bundleId={app.id} />}

            <ProductContents product={app} />

            {isApp && target ? (
              <a
                href={target}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                onClick={() => track("product_opened", { product: app.slug })}
                className="btn-store mt-3 self-start"
              >
                {t("store.open")}
              </a>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
