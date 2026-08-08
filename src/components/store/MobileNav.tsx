import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/platform";
import { supabase } from "@/integrations/supabase/client";

type NavItem = { to: string; label: string; exact?: boolean };

/**
 * Compact mobile navigation drawer. Every nav entry is stacked full-width so
 * the layout stays stable no matter how long a translated label becomes.
 */
export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useI18n();
  const { session } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const items: NavItem[] = [
    { to: "/", label: t("store.nav.store"), exact: true },
    { to: "/apps", label: t("store.nav.catalog") },
    { to: "/my-apps", label: t("store.nav.myApps") },
    { to: "/faq", label: t("store.faq.nav") },
  ];
  if (session) items.push({ to: "/account", label: t("store.account") });
  if (isAdmin) items.push({ to: "/admin", label: t("store.admin.nav") });

  async function signOut() {
    setOpen(false);
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={t("store.nav.menu")}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card/70 text-foreground backdrop-blur transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden"
        >
          <Menu size={20} aria-hidden="true" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="store-scope w-[88vw] max-w-sm overflow-y-auto p-0">
        <SheetHeader className="border-b border-border/60 px-5 py-4 text-left">
          <SheetTitle className="text-sm font-semibold uppercase tracking-[0.22em]">
            {t("store.nav.menu")}
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-4">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact ?? false }}
              onClick={() => setOpen(false)}
              className="min-h-12 break-words rounded-xl px-4 py-3 text-base font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-accent-foreground"
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-3 border-t border-border/60 pt-3">
            {session ? (
              <button
                type="button"
                onClick={signOut}
                className="min-h-12 w-full break-words rounded-xl px-4 py-3 text-left text-base font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
              >
                {t("store.signOut")}
              </button>
            ) : (
              <Link
                to="/auth"
                search={{ redirect: "/my-apps" }}
                onClick={() => setOpen(false)}
                className="btn-store-ghost flex min-h-12 w-full items-center justify-center break-words px-4 py-3 text-base"
              >
                {t("store.signIn")}
              </Link>
            )}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
