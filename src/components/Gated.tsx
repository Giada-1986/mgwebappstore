import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useProfile, useSession } from "@/lib/data";

/**
 * Wraps the paid area: sends the user to the paywall or onboarding when needed.
 */
export function Gated({ children, nav = true }: { children: ReactNode; nav?: boolean }) {
  const { session } = useSession();
  const { data: profile, isLoading } = useProfile(session?.user.id);
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    if (!profile) return;
    if (!profile.has_paid) navigate({ to: "/unlock", replace: true });
    else if (!profile.onboarding_done) navigate({ to: "/onboarding", replace: true });
  }, [profile, navigate]);

  if (isLoading || !profile || !profile.has_paid || !profile.onboarding_done) {
    return (
      <AppShell nav={false}>
        <p className="py-16 text-center text-muted-foreground">{t("common.loading")}</p>
      </AppShell>
    );
  }

  return <AppShell nav={nav}>{children}</AppShell>;
}
