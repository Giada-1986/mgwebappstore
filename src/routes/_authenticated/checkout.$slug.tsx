import { createFileRoute, Link } from "@tanstack/react-router";
import { StoreShell } from "@/components/store/StoreShell";
import { StripeEmbeddedCheckout } from "@/components/store/StripeEmbeddedCheckout";
import { useI18n } from "@/lib/i18n";
import { productName, useProduct } from "@/lib/platform";

export const Route = createFileRoute("/_authenticated/checkout/$slug")({
  head: () => ({
    meta: [
      { title: "Checkout — Mini Apps Store" },
      { name: "description", content: "Completa in sicurezza l'acquisto della tua mini app." },
      { property: "og:title", content: "Checkout — Mini Apps Store" },
      { property: "og:description", content: "Pagamento sicuro con Stripe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { slug } = Route.useParams();
  const { t, lang } = useI18n();
  const { data: product } = useProduct(slug);

  const returnUrl =
    typeof window !== "undefined" ? `${window.location.origin}/my-apps?purchase=${slug}` : "";

  return (
    <StoreShell>
      <Link
        to="/apps/$slug"
        params={{ slug }}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← {t("store.checkoutBack")}
      </Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        {product ? productName(product, lang) : t("store.checkoutTitle")}
      </h1>
      <div className="card-store mt-6 overflow-hidden p-2">
        {returnUrl && <StripeEmbeddedCheckout productSlug={slug} returnUrl={returnUrl} />}
      </div>
    </StoreShell>
  );
}
