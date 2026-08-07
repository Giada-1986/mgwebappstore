import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AppAccessGuard } from "@/components/store/AppAccessGuard";
import { SakuraDivider } from "@/components/Sakura";
import { useI18n } from "@/lib/i18n";
import { FAME_O_FAME_SLUG, useFameState } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/app/fame-o-fame/onboarding")({
  component: OnboardingPage,
});

const TRIGGERS = ["evening", "work", "boredom", "argument", "night", "alone"] as const;

function OnboardingPage() {
  return (
    <AppAccessGuard slug={FAME_O_FAME_SLUG}>
      <Onboarding />
    </AppAccessGuard>
  );
}

function Onboarding() {
  const { t } = useI18n();
  const { triggers, triggerOther, updateState, settings } = useFameState();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>(triggers);
  const [other, setOther] = useState(triggerOther);
  const [busy, setBusy] = useState(false);

  function toggle(key: string) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function finish() {
    setBusy(true);
    await updateState({
      onboarding_completed: true,
      settings: { ...settings, triggers: selected, trigger_other: other || null },
    });
    navigate({ to: "/app/fame-o-fame", replace: true });
  }

  return (
    <AppShell nav={false}>
      <div className="card-pearl mx-auto max-w-xl p-8">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">
          {t("onboarding.step")} {step + 1}/3
        </p>

        {step === 0 && (
          <>
            <h1 className="mt-3 font-display text-3xl">{t("onboarding.s1Title")}</h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t("onboarding.s1Text")}</p>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="mt-3 font-display text-3xl">{t("onboarding.s2Title")}</h1>
            <p className="mt-3 text-sm text-muted-foreground">{t("onboarding.s2Text")}</p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {TRIGGERS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggle(key)}
                  aria-pressed={selected.includes(key)}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${
                    selected.includes(key)
                      ? "border-gold bg-gold/15 text-foreground"
                      : "border-gold/30 bg-background/50 text-muted-foreground hover:border-gold/60"
                  }`}
                >
                  {t(`onboarding.triggers.${key}`)}
                </button>
              ))}
            </div>
            <label className="mt-4 block text-sm">
              <span className="text-muted-foreground">{t("onboarding.s2Other")}</span>
              <input
                value={other}
                onChange={(e) => setOther(e.target.value)}
                placeholder={t("onboarding.s2OtherPlaceholder")}
                className="mt-1 w-full rounded-xl border border-gold/35 bg-background/60 px-4 py-2.5 outline-none focus:border-gold"
              />
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="mt-3 font-display text-3xl">{t("onboarding.s3Title")}</h1>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t("onboarding.s3Text")}</p>
          </>
        )}

        <SakuraDivider className="py-5" />

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="text-sm text-muted-foreground disabled:opacity-40"
          >
            {t("common.back")}
          </button>
          {step < 2 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="rounded-full bg-[image:var(--gradient-gold)] px-7 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-gold)]"
            >
              {t("common.continue")}
            </button>
          ) : (
            <button
              type="button"
              onClick={finish}
              disabled={busy}
              className="rounded-full bg-[image:var(--gradient-gold)] px-7 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-gold)] disabled:opacity-60"
            >
              {t("onboarding.s3Cta")}
            </button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
