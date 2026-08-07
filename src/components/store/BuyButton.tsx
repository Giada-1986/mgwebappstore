import { Link, useNavigate } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { type Product, formatPrice, useSession } from "@/lib/platform";

/**
 * Starts the purchase flow for any product. It never grants access:
 * it only routes the user to the Stripe checkout page.
 */
export function BuyButton({
  product,
  owned,
  className = "",
}: {
  product: Product;
  owned?: boolean;
  className?: string;
}) {
  const { t, lang } = useI18n();
  const { session } = useSession();
  const navigate = useNavigate();

  if (owned) {
    return (
      <Link to="/my-apps" className={`btn-store ${className}`}>
        {t("store.openLibrary")}
      </Link>
    );
  }

  if (product.status !== "active") {
    return (
      <button disabled className={`btn-store opacity-50 ${className}`}>
        {t("store.comingSoon")}
      </button>
    );
  }

  return (
    <button
      className={`btn-store hover:-translate-y-0.5 ${className}`}
      onClick={() => {
        if (!session) {
          navigate({ to: "/auth", search: { redirect: `/checkout/${product.slug}` } });
          return;
        }
        navigate({ to: "/checkout/$slug", params: { slug: product.slug } });
      }}
    >
      {t("store.buyFor", { price: formatPrice(Number(product.price), product.currency, lang) })}
    </button>
  );
}
