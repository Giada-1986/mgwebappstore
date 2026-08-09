import { createFileRoute, Link } from "@tanstack/react-router";
import { StoreShell } from "@/components/store/StoreShell";
import { BuyButton } from "@/components/store/BuyButton";
import {
  AdminAccessBadge,
  CustomBadge,
  FreeBadge,
  LifetimeAccessBadge,
  ProductTypeBadge,
} from "@/components/store/Badges";
import { ProductContents } from "@/components/store/ProductContents";
import { BundleContents } from "@/components/store/BundleContents";
import { useI18n } from "@/lib/i18n";
import {
  isFreeProduct,
  priceLabel,
  productDescription,
  productName,
  productShort,
  useEntitlements,
  useIsAdmin,
  useProduct,
  useSession,
} from "@/lib/platform";
import { track } from "@/lib/analytics";
import { useEffect } from "react";

export const Route = createFileRoute("/apps/$slug")({
  head: () => ({
    meta: [
      { title: "Dettaglio app — Mini Apps Store" },
      { name: "description", content: "Scopri cosa include questa mini app e sbloccala a vita." },
      { property: "og:title", content: "Dettaglio app — Mini Apps Store" },
      { property: "og:description", content: "Acquisto unico, accesso a vita." },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { t, lang } = useI18n();
  const { session } = useSession();
  const { data: product, isLoading } = useProduct(slug);
  const { data: entitlements } = useEntitlements(session?.user.id);
  const { data: isAdmin } = useIsAdmin(session?.user.id);
  const owned = !!product && (entitlements ?? []).some((e) => e.product_id === product.id);
  // Role-based access: administrators open every active product without any
  // purchase, entitlement or gift being created for them.
  const adminAccess =
    isAdmin === true && !!product && (product.status === "active" || product.status === "paused") && !owned;

  useEffect(() => {
    if (product) track("product_viewed", { product: product.slug });
  }, [product?.slug]);

  if (isLoading) {
    return (
      <StoreShell>
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </StoreShell>
    );
  }

  // Archived products are invisible in the store: the direct URL behaves as if
  // the product did not exist (history stays untouched in the database).
  // Paused products leave the commercial surface too: only who already owns
  // them (and the admin) can still open this page.
  if (!product || product.status === "archived" || (product.status === "paused" && !owned && isAdmin !== true)) {
    return (
      <StoreShell>
        <p className="text-muted-foreground">{t("store.notFound")}</p>
      </StoreShell>
    );
  }

  return (
    <StoreShell>
      <article className="card-store overflow-hidden">
        {product.image_url && (
          <img
            src={product.image_url}
            alt={productName(product, lang)}
            className="h-56 w-full object-cover"
          />
        )}
        <div className="p-8 sm:p-10">
          <div className="flex flex-wrap items-center gap-2">
            <ProductTypeBadge type={product.product_type} />
            {isFreeProduct(product) ? <FreeBadge /> : <LifetimeAccessBadge />}
            {product.badge && <CustomBadge label={product.badge} />}
            {adminAccess && <AdminAccessBadge />}
          </div>
          <h1 translate="no" className="notranslate mt-5 text-3xl sm:text-4xl font-semibold tracking-tight">
            {productName(product, lang)}
          </h1>
          <p className="mt-2 text-muted-foreground">{productShort(product, lang)}</p>

          <h2 className="mt-8 text-lg font-semibold">{t("store.whatYouGet")}</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {productDescription(product, lang)}
          </p>

          {product.product_type === "bundle" && (
            <div className="mt-8">
              <BundleContents bundleId={product.id} />
            </div>
          )}

          {(owned || adminAccess || product.access_mode === "free_public") && (
            <div className="mt-8">
              <ProductContents product={product} />
            </div>
          )}

          <div className="store-hairline mt-9" />

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <p className="text-2xl font-semibold">
              {adminAccess ? t("store.adminAccess") : priceLabel(product, lang, t("store.free"))}
            </p>
            <BuyButton product={product} owned={owned} />
            {product.status === "active" && !isFreeProduct(product) && (
              <Link
                to="/gift/$slug"
                params={{ slug: product.slug }}
                className="btn-store-ghost px-4 py-2 text-sm"
              >
                {t("store.gift.cta")}
              </Link>
            )}
            <span className="text-xs text-muted-foreground">
              {adminAccess
                ? t("store.adminAccessHint")
                : `${isFreeProduct(product) ? t("store.freeAccess") : t("store.oneTime")} · ${t("store.securePayment")}`}
            </span>
          </div>
        </div>
      </article>
    </StoreShell>
  );
}
