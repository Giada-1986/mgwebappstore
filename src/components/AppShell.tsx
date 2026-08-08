import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SakuraCorners } from "@/components/Sakura";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

const navItems = [
  { to: "/app/fame-o-fame", key: "nav.checkin" },
  { to: "/app/fame-o-fame/exercises", key: "nav.exercises" },
  { to: "/app/fame-o-fame/report", key: "nav.report" },
  { to: "/app/fame-o-fame/monthly", key: "nav.monthly" },
  { to: "/app/fame-o-fame/settings", key: "nav.settings" },
] as const;

export function AppShell({ children, nav = true }: { children: ReactNode; nav?: boolean }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="relative min-h-screen">
      <SakuraCorners />
      <header className="relative z-10 border-b border-gold/25 bg-pearl/60 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 pt-2">
          <Link
            to="/my-apps"
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-background/50 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-gold hover:text-foreground"
          >
            <span aria-hidden="true">←</span>
            <span className="whitespace-nowrap">{t("common.backToApps")}</span>
          </Link>
        </div>
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/app/fame-o-fame" className="flex items-center gap-3">
            <Logo className="h-11 w-11 shadow-[var(--shadow-gold)]" />
            <span translate="no" className="notranslate font-display text-lg tracking-wide">
              {t("brand")}
            </span>
          </Link>
          <div className="flex items-center gap-2">

            <LanguageSwitcher />
            <button
              onClick={signOut}
              className="rounded-full border border-gold/40 px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("settings.signOut")}
            </button>
          </div>
        </div>
        {nav && (
          <nav className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-3 pb-2 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: item.to === "/app/fame-o-fame" }}
                className="whitespace-nowrap rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground data-[status=active]:bg-gold/15 data-[status=active]:text-foreground"
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main className="relative z-10 mx-auto w-full max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
