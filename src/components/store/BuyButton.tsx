import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { type Product, isFreeProduct, priceLabel, useIsAdmin, useSession } from "@/lib/platform";
import { claimFreeProduct } from "@/lib/library.functions";
import { track } from "@/lib/analytics";

const APP_TYPES = ["mini_app", "premium_app", "professional_app"];

/**
 * Entry point of every acquisition flow. It never grants access by itself:
 *  - paid  → routes to the Stripe checkout page (webhook grants access);
 *  - free_account → asks the server to create the entitlement, which is
 *    written only after the server has read access_mode from the database;
 *  - free_public → simply opens the product, no account and no entitlement.
 *
 * Store administrators already have access to every active product through the
 * `admin` role, so they never see a purchase call to action and can never start
 * a Stripe checkout for themselves. No purchase or entitlement is created.
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
  const { data: isAdmin } = useIsAdmin(session?.user.id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const adminAccess = isAdmin === true && product.status === "active" && !owned;

  if (adminAccess) {
    const target = product.app_path ?? product.app_url;
    const isApp = APP_TYPES.includes(product.product_type);
    if (isApp && target) {
      return (
        <a
          href={target}
          {...(product.app_path ? {} : { target: "_blank", rel: "noopener noreferrer" })}
          className={`btn-store ${className}`}
        >
          {t("store.open")}
        </a>
      );
    }
    return (
      <Link to="/my-apps" className={`btn-store ${className}`}>
        {t("store.view")}
      </Link>
    );
  }

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


  // Fully public resource: nothing to unlock, the contents are already listed.
  if (product.access_mode === "free_public") {
    const target = product.app_path ?? product.app_url;
    if (target) {
      return (
        <a
          href={target}
          {...(product.app_path ? {} : { target: "_blank", rel: "noopener noreferrer" })}
          onClick={() => track("product_opened", { product: product.slug })}
          className={`btn-store ${className}`}
        >
          {t("store.open")}
        </a>
      );
    }
    return (
      <span className={`btn-store pointer-events-none opacity-70 ${className}`}>
        {t("store.downloadFree")}
      </span>
    );
  }

  if (product.access_mode === "free_account") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled={busy}
          className={`btn-store hover:-translate-y-0.5 disabled:opacity-60 ${className}`}
          onClick={async () => {
            if (!session) {
              navigate({ to: "/auth", search: { redirect: `/apps/${product.slug}` } });
              return;
            }
            setBusy(true);
            setFeedback(null);
            try {
              const res = await claimFreeProduct({ data: { slug: product.slug } });
              if (res.ok) {
                track("product_claimed", { product: product.slug });
                await qc.invalidateQueries({ queryKey: ["entitlements"] });
                navigate({ to: "/my-apps" });
              } else {
                setFeedback(t("store.claimFailed"));
              }
            } catch {
              setFeedback(t("store.claimFailed"));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? t("store.claiming") : t("store.getFree")}
        </button>
        {feedback && <span className="text-sm text-muted-foreground">{feedback}</span>}
      </div>
    );
  }

  return (
    <button
      className={`btn-store hover:-translate-y-0.5 ${className}`}
      onClick={() => {
        if (!session) {
          navigate({ to: "/auth", search: { redirect: `/apps/${product.slug}` } });
          return;
        }
        track("checkout_started", { product: product.slug, price: Number(product.price) });
        navigate({ to: "/checkout/$slug", params: { slug: product.slug } });
      }}
    >
      {isFreeProduct(product)
        ? t("store.getFree")
        : t("store.buyFor", { price: priceLabel(product, lang, t("store.free")) })}
    </button>
  );
}
