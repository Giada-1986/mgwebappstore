import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AccountMenu } from "@/components/store/AccountMenu";
import { PaymentTestModeBanner } from "@/components/store/PaymentTestModeBanner";
import { useI18n } from "@/lib/i18n";

const links = [
  { to: "/", key: "store.nav.store", exact: true },
  { to: "/apps", key: "store.nav.catalog", exact: false },
  { to: "/my-apps", key: "store.nav.myApps", exact: false },
] as const;

/** Common chrome for every platform (non mini-app) page. */
export function StoreShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();

  return (
    <div className="store-scope">
      <PaymentTestModeBanner />
      <header className="border-b border-border/70 bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="text-lg font-semibold tracking-tight">Mini Apps</span>
            <span className="text-xs text-muted-foreground">{t("store.tagline")}</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <AccountMenu />
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-4 pb-2 text-sm">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.exact }}
              className="rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-accent-foreground"
            >
              {t(l.key)}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl px-5 py-10">{children}</main>
      <footer className="mx-auto max-w-5xl px-5 pb-10 text-xs text-muted-foreground">
        {t("store.footer")}
      </footer>
    </div>
  );
}
