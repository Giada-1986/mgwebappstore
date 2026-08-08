import { createFileRoute, Link } from "@tanstack/react-router";
import { StoreShell } from "@/components/store/StoreShell";
import { StripeEmbeddedCheckout } from "@/components/store/StripeEmbeddedCheckout";
import { useI18n } from "@/lib/i18n";
import { productName, useIsAdmin, useProduct, useSession } from "@/lib/platform";

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
  const { session } = useSession();
  // Safety net: an administrator already has role-based access, so no Stripe
  // checkout is ever started for them (not even by opening this URL directly).
  const { data: isAdmin } = useIsAdmin(session?.user.id);

  const returnUrl =
    typeof window !== "undefined" ? `${window.location.origin}/my-apps?purchase=${slug}` : "";

  // Retired products cannot start a payment (the server rejects them too).
  const unavailable = !!product && product.status === "archived";

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
      <div className="panel-pearl mt-6 overflow-hidden p-3">
        {unavailable ? (
          <div className="p-6 text-center">
            <p className="text-sm text-muted-foreground">{t("store.appUnavailableText")}</p>
            <Link to="/apps" className="btn-store mt-4 inline-flex">
              {t("store.nav.catalog")}
            </Link>
          </div>
        ) : isAdmin === true ? (
          <div className="p-6 text-center">
            <p className="text-sm text-muted-foreground">{t("store.adminAccessHint")}</p>
            <Link to="/my-apps" className="btn-store mt-4 inline-flex">
              {t("store.openLibrary")}
            </Link>
          </div>
        ) : (
          returnUrl && <StripeEmbeddedCheckout productSlug={slug} returnUrl={returnUrl} />
        )}
      </div>
    </StoreShell>
  );
}
