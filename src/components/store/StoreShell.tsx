import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AccountMenu } from "@/components/store/AccountMenu";
import { StoreLogo } from "@/components/store/StoreLogo";

import { PaymentTestModeBanner } from "@/components/store/PaymentTestModeBanner";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/platform";
import { getIsAdmin } from "@/lib/admin.functions";

const links = [
  { to: "/", key: "store.nav.store", exact: true },
  { to: "/apps", key: "store.nav.catalog", exact: false },
  { to: "/my-apps", key: "store.nav.myApps", exact: false },
] as const;

/** Common chrome for every platform (non mini-app) page. */
export function StoreShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { session } = useSession();
  // Admin status always comes from the server; the link is chrome only.
  const { data: admin } = useQuery({
    queryKey: ["admin", "access"],
    enabled: !!session,
    queryFn: () => getIsAdmin(),
    staleTime: 5 * 60_000,
  });


  return (
    <div className="store-scope flex min-h-screen flex-col">
      <PaymentTestModeBanner />
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <Link to="/" className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
            <StoreLogo className="h-10 w-10 rounded-xl ring-1 ring-primary/25" priority />
            <span className="flex flex-col leading-tight">
              <span
                translate="no"
                className="notranslate text-sm font-semibold uppercase tracking-[0.22em]"
              >
                {t("store.brand")}
              </span>
              <span translate="no" className="notranslate text-xs text-muted-foreground">
                {t("store.tagline")}
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <AccountMenu />
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-4 pb-3 text-sm">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.exact }}
              className="rounded-full px-3.5 py-1.5 text-muted-foreground transition-colors hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-accent-foreground"
            >
              {t(l.key)}
            </Link>
          ))}
          {admin?.isAdmin && (
            <Link
              to="/admin"
              className="rounded-full px-3.5 py-1.5 text-muted-foreground transition-colors hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-accent-foreground"
            >
              {t("store.admin.nav")}
            </Link>
          )}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-12">{children}</main>
      <footer className="mt-auto border-t border-border/60">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-xs text-muted-foreground">
          <span translate="no" className="notranslate uppercase tracking-[0.22em] text-foreground/80">
            {t("store.brand")}
          </span>
          <span>{t("store.footer")}</span>
        </div>
      </footer>
    </div>
  );
}
