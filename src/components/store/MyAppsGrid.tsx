import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { type Product, productName, productShort } from "@/lib/platform";
import { LifetimeAccessBadge } from "@/components/store/Badges";
import { track } from "@/lib/analytics";

/** Personal library grid — shows only products the user is entitled to. */
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
        return (
          <article key={app.id} className="card-store flex flex-col gap-3 p-7">
            <LifetimeAccessBadge />
            <h3 translate="no" className="notranslate text-lg font-semibold tracking-tight">
              {productName(app, lang)}
            </h3>
            <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
              {productShort(app, lang)}
            </p>
            {target ? (
              <a
                href={target}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                onClick={() => track("product_opened", { product: app.slug })}
                className="btn-store mt-3 self-start"
              >
                {t("store.open")}
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">{t("store.comingSoon")}</span>
            )}
          </article>
        );
      })}
    </div>
  );
}
