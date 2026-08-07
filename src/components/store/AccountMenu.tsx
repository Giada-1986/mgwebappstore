import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/platform";
import { supabase } from "@/integrations/supabase/client";

/** Account entry point shared by every platform surface. */
export function AccountMenu() {
  const { t } = useI18n();
  const { session } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  if (!session) {
    return (
      <Link
        to="/auth"
        className="rounded-full border border-border px-4 py-1.5 text-sm transition-colors hover:bg-accent"
      >
        {t("store.signIn")}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        to="/account"
        className="rounded-full border border-border px-4 py-1.5 text-sm transition-colors hover:bg-accent"
      >
        {t("store.account")}
      </Link>
      <button
        onClick={signOut}
        className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {t("store.signOut")}
      </button>
    </div>
  );
}
