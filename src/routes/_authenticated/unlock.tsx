import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Logo } from "@/components/Logo";
import { useI18n } from "@/lib/i18n";
import { useProfile, useSession, useUpdateProfile } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/unlock")({
  component: Unlock,
});

function Unlock() {
  const { t } = useI18n();
  const { session } = useSession();
  const { data: profile } = useProfile(session?.user.id);
  const update = useUpdateProfile(session?.user.id);
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (profile?.has_paid) {
      navigate({ to: profile.onboarding_done ? "/app" : "/onboarding", replace: true });
    }
  }, [profile, navigate]);

  async function demoUnlock() {
    setBusy(true);
    await update({ has_paid: true });
    navigate({ to: "/onboarding", replace: true });
  }

  return (
    <AppShell nav={false}>
      <div className="card-pearl mx-auto max-w-lg p-8 text-center">
        <Logo className="mx-auto h-24 w-24 shadow-[var(--shadow-gold)]" />
        <h1 className="mt-6 font-display text-3xl">{t("paywall.title")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("paywall.text")}</p>
        <button
          type="button"
          onClick={demoUnlock}
          disabled={busy}
          className="mt-7 w-full rounded-full bg-[image:var(--gradient-gold)] px-6 py-3 font-medium text-primary-foreground shadow-[var(--shadow-gold)] disabled:opacity-60"
        >
          {t("paywall.cta")}
        </button>
        <p className="mt-3 text-xs text-muted-foreground">{t("paywall.note")}</p>
      </div>
    </AppShell>
  );
}
