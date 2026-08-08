import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import {
  type Product,
  isFreeProduct,
  priceLabel,
  productName,
  productShort,
  useIsAdmin,
  useSession,
} from "@/lib/platform";
import {
  AdminAccessBadge,
  CustomBadge,
  FreeBadge,
  ProductTypeBadge,
  PurchasedBadge,
} from "@/components/store/Badges";

/** Generic catalogue card — works for any kind of digital product. */
export function ProductCard({ product, owned }: { product: Product; owned?: boolean }) {
  const { t, lang } = useI18n();
  const { session } = useSession();
  const { data: isAdmin } = useIsAdmin(session?.user.id);
  const free = isFreeProduct(product);
  // Administrators already have access to every active product (role-based),
  // so the card shows a discreet marker instead of a purchase invitation.
  const adminAccess = isAdmin === true && product.status === "active" && !owned;


  return (
    <article className="card-store group flex flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-1">
      <div className="relative aspect-[16/9] w-full bg-secondary">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={productName(product, lang)}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl font-semibold tracking-[0.1em] text-primary/70">
            {productName(product, lang).slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="store-hairline absolute inset-x-0 bottom-0" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <ProductTypeBadge type={product.product_type} />
          {free && <FreeBadge />}
          {product.badge && <CustomBadge label={product.badge} />}
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
        <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
          {productShort(product, lang)}
        </p>
        <div className="mt-2 flex items-center justify-between gap-3 border-t border-border/70 pt-4">
          <div>
            <p className="text-base font-semibold">
              {priceLabel(product, lang, t("store.free"))}
            </p>
            <p className="text-xs text-muted-foreground">
              {free ? t("store.freeAccess") : t("store.oneTime")}
            </p>
          </div>
          <Link
            to="/apps/$slug"
            params={{ slug: product.slug }}
            className="btn-store-ghost text-sm"
          >
            {t("store.discover")}
          </Link>
        </div>
      </div>
    </article>
  );
}
