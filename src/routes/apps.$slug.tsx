import { createFileRoute } from "@tanstack/react-router";
import { StoreShell } from "@/components/store/StoreShell";
import { BuyButton } from "@/components/store/BuyButton";
import { LifetimeAccessBadge, ProductTypeBadge } from "@/components/store/Badges";
import { useI18n } from "@/lib/i18n";
import {
  formatPrice,
  productDescription,
  productName,
  productShort,
  useEntitlements,
  useProduct,
  useSession,
} from "@/lib/platform";

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
  const owned = !!product && (entitlements ?? []).some((e) => e.product_id === product.id);

  if (isLoading) {
    return (
      <StoreShell>
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </StoreShell>
    );
  }

  if (!product) {
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
        <div className="p-8">
          <div className="flex flex-wrap items-center gap-2">
            <ProductTypeBadge type={product.product_type} />
            <LifetimeAccessBadge />
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            {productName(product, lang)}
          </h1>
          <p className="mt-2 text-muted-foreground">{productShort(product, lang)}</p>

          <h2 className="mt-8 text-lg font-semibold">{t("store.whatYouGet")}</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {productDescription(product, lang)}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <p className="text-2xl font-semibold">
              {formatPrice(Number(product.price), product.currency, lang)}
            </p>
            <BuyButton product={product} owned={owned} />
            <span className="text-xs text-muted-foreground">{t("store.oneTime")}</span>
          </div>
        </div>
      </article>
    </StoreShell>
  );
}
