import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AccountMenu } from "@/components/store/AccountMenu";
import { StoreLogo } from "@/components/store/StoreLogo";
import { MobileNav } from "@/components/store/MobileNav";

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
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-5 sm:py-4">
          <Link to="/" className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
            <StoreLogo className="h-10 w-10 shrink-0 rounded-xl ring-1 ring-primary/25" priority />
            <span className="flex min-w-0 flex-col leading-tight">
              <span
                translate="no"
                className="notranslate truncate text-sm font-semibold uppercase tracking-[0.22em]"
              >
                {t("store.brand")}
              </span>
              <span translate="no" className="notranslate truncate text-xs text-muted-foreground">
                {t("store.tagline")}
              </span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitcher />
            <div className="hidden md:block">
              <AccountMenu />
            </div>
            <MobileNav isAdmin={!!admin?.isAdmin} />
          </div>
        </div>
        <nav className="mx-auto hidden max-w-5xl flex-wrap gap-1 px-4 pb-3 text-sm md:flex">
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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-5 sm:py-12">{children}</main>
      <footer className="mt-auto border-t border-border/60">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-xs text-muted-foreground">
          <span translate="no" className="notranslate uppercase tracking-[0.22em] text-foreground/80">
            {t("store.brand")}
          </span>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/suggest"
              className="transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {t("store.suggest.nav")}
            </Link>
            <Link
              to="/faq"
              className="transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {t("store.faq.nav")}
            </Link>
            <span>{t("store.footer")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
