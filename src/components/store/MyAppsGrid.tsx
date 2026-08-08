import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { type Product, productName, productShort } from "@/lib/platform";
import { LifetimeAccessBadge, ProductTypeBadge } from "@/components/store/Badges";
import { ProductContents } from "@/components/store/ProductContents";
import { BundleContents } from "@/components/store/BundleContents";
import { listRedeemedGifts } from "@/lib/gifts.functions";
import { track } from "@/lib/analytics";

const APP_TYPES = ["mini_app", "premium_app", "professional_app"];

/** Discreet, permanent marker for products obtained through a gift. */
function GiftReceivedBadge() {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium tracking-wide text-primary">
      {t("store.gift.receivedBadge")}
    </span>
  );
}

function GiftMessage({ message }: { message: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        {open ? t("store.gift.hideMessage") : t("store.gift.viewMessage")}
      </button>
      {open ? (
        <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-medium">{t("store.gift.giftedTitle")}</p>
          <blockquote className="mt-2 whitespace-pre-wrap break-words border-l-2 border-primary/50 pl-3 text-sm text-muted-foreground">
            {message}
          </blockquote>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Personal library — every kind of owned product, not just mini apps.
 * The grid only renders what the entitlement query already returned.
 */
export function MyAppsGrid({ apps }: { apps: Product[] }) {
  const { t, lang } = useI18n();
  const fetchRedeemed = useServerFn(listRedeemedGifts);
  const { data: gifted } = useQuery({
    queryKey: ["redeemed-gifts"],
    queryFn: () => fetchRedeemed({ data: undefined }),
    staleTime: 60_000,
  });


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
