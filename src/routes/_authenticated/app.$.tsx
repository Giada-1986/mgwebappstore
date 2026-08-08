import { createFileRoute, Link } from "@tanstack/react-router";
import { StoreShell } from "@/components/store/StoreShell";
import { useI18n } from "@/lib/i18n";

/**
 * Catch-all for mini app URLs (/app/*).
 * A mini app is mounted only when its own route exists; anything else —
 * including apps that were retired from the store — lands here instead of
 * rendering an application. No entitlement or access logic is involved.
 */
export const Route = createFileRoute("/_authenticated/app/$")({
  head: () => ({
    meta: [
      { title: "App non disponibile — Mini Apps Store" },
      { name: "description", content: "Questa mini app non è disponibile." },
      { property: "og:title", content: "App non disponibile — Mini Apps Store" },
      { property: "og:description", content: "Questa mini app non è disponibile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppUnavailablePage,
});

function AppUnavailablePage() {
  const { t } = useI18n();

  return (
    <StoreShell>
      <div className="panel-pearl mx-auto max-w-xl p-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t("store.appUnavailable")}</h1>
        <p className="mt-3 text-muted-foreground">{t("store.appUnavailableText")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/my-apps" className="btn-store">
            {t("store.openLibrary")}
          </Link>
          <Link to="/apps" className="btn-store-ghost px-4 py-2 text-sm">
            {t("store.nav.catalog")}
          </Link>
        </div>
      </div>
    </StoreShell>
  );
}
