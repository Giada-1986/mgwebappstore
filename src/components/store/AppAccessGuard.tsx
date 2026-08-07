import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { useHasAccess, useSession } from "@/lib/platform";

/**
 * Entitlement gate for any mini app. A user without an active entitlement
 * for `slug` is sent to the product page instead of the app.
 */
export function AppAccessGuard({
  slug,
  children,
  fallback,
}: {
  slug: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { t } = useI18n();
  const { session } = useSession();
  const { hasAccess, isLoading } = useHasAccess(slug, session?.user.id);

  if (isLoading) {
    return (
      fallback ?? (
        <p className="py-20 text-center text-muted-foreground">{t("common.loading")}</p>
      )
    );
  }

  if (!hasAccess) {
    return (
      <div className="store-scope flex min-h-screen items-center justify-center px-5">
        <div className="card-store max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold">{t("store.noAccessTitle")}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{t("store.noAccessText")}</p>
          <Link to="/apps/$slug" params={{ slug }} className="btn-store mt-6">
            {t("store.seeProduct")}
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
