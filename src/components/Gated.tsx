import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AppAccessGuard } from "@/components/store/AppAccessGuard";
import { useI18n } from "@/lib/i18n";
import { FAME_O_FAME_SLUG, useFameState } from "@/lib/data";

/**
 * Fame o Fame? area: entitlement is checked by the platform guard,
 * the app-specific onboarding is checked here.
 */
export function Gated({ children, nav = true }: { children: ReactNode; nav?: boolean }) {
  return (
    <AppAccessGuard slug={FAME_O_FAME_SLUG}>
      <OnboardingGate nav={nav}>{children}</OnboardingGate>
    </AppAccessGuard>
  );
}

function OnboardingGate({ children, nav }: { children: ReactNode; nav: boolean }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { state, isLoading } = useFameState();

  const done = state?.onboarding_completed ?? false;

  useEffect(() => {
    if (!isLoading && !done) {
      navigate({ to: "/app/fame-o-fame/onboarding", replace: true });
    }
  }, [isLoading, done, navigate]);

  if (isLoading || !done) {
    return (
      <AppShell nav={false}>
        <p className="py-16 text-center text-muted-foreground">{t("common.loading")}</p>
      </AppShell>
    );
  }

  return <AppShell nav={nav}>{children}</AppShell>;
}
