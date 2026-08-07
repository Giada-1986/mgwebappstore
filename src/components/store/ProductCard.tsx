import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import {
  type Product,
  formatPrice,
  productName,
  productShort,
} from "@/lib/platform";
import { ProductTypeBadge, PurchasedBadge } from "@/components/store/Badges";

/** Generic catalogue card — no product-specific logic lives here. */
export function ProductCard({ product, owned }: { product: Product; owned?: boolean }) {
  const { t, lang } = useI18n();

  return (
    <article className="card-store flex flex-col overflow-hidden">
      <div className="relative aspect-[16/9] w-full bg-secondary">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={productName(product, lang)}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-muted-foreground">
            {productName(product, lang).slice(0, 2)}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <ProductTypeBadge type={product.product_type} />
          {owned && <PurchasedBadge />}
          {product.status === "coming_soon" && (
            <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              {t("store.comingSoon")}
            </span>
          )}
        </div>
        <h3 translate="no" className="notranslate text-lg font-semibold tracking-tight">
          {productName(product, lang)}
        </h3>
        <p className="flex-1 text-sm text-muted-foreground">{productShort(product, lang)}</p>
        <div className="flex items-center justify-between gap-3 pt-1">
          <div>
            <p className="text-base font-semibold">
              {formatPrice(Number(product.price), product.currency, lang)}
            </p>
            <p className="text-xs text-muted-foreground">{t("store.oneTime")}</p>
          </div>
          <Link
            to="/apps/$slug"
            params={{ slug: product.slug }}
            className="rounded-full border border-border px-4 py-2 text-sm transition-colors hover:bg-accent"
          >
            {t("store.discover")}
          </Link>
        </div>
      </div>
    </article>
  );
}
