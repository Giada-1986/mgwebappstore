import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/platform";
import { checkProductAccess } from "@/lib/access.functions";

/**
 * Entitlement gate for any mini app.
 *
 * The decision is taken server-side (`checkProductAccess`): the Supabase bearer
 * token is validated on the server, the user is identified from its claims and
 * the entitlement is read for that user_id + product_id pair. Editing the URL,
 * localStorage or any frontend state cannot grant access, and the mini app data
 * itself is protected by RLS scoped to auth.uid().
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
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const verify = useServerFn(checkProductAccess);

  const { data, isLoading } = useQuery({
    queryKey: ["product-access", slug, session?.user.id],
    enabled: !!session?.user.id,
    staleTime: 30_000,
    retry: false,
    queryFn: () => verify({ data: { slug } }),
  });

  const pending = loading || (!!session && isLoading);
  const hasAccess = data?.hasAccess === true;

  useEffect(() => {
    if (!pending && session && data && !hasAccess) {
      navigate({ to: "/apps/$slug", params: { slug }, replace: true });
    }
  }, [pending, session, data, hasAccess, navigate, slug]);

  if (pending || !hasAccess) {
    return (
      fallback ?? (
        <p className="py-20 text-center text-muted-foreground">{t("common.loading")}</p>
      )
    );
  }

  return <>{children}</>;
}
