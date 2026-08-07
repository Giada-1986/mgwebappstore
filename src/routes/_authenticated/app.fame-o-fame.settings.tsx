import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Gated } from "@/components/Gated";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useFameState } from "@/lib/data";
import { useProfile, useSession } from "@/lib/platform";

export const Route = createFileRoute("/_authenticated/app/fame-o-fame/settings")({
  component: SettingsPage,
});

const TRIGGERS = ["evening", "work", "boredom", "argument", "night", "alone"] as const;

function SettingsPage() {
  const { t } = useI18n();
  const { session } = useSession();
  const { data: profile } = useProfile(session?.user.id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { triggers, updateState, updateSettings } = useFameState();
  const [selected, setSelected] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSelected(triggers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggers.join(",")]);

  async function toggle(key: string) {
    const next = selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key];
    setSelected(next);
    await updateSettings({ triggers: next });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <Gated>
      <h1 className="font-display text-3xl">{t("settings.title")}</h1>

      <section className="card-pearl mt-6 space-y-4 p-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("settings.email")}</p>
          <p className="mt-1">{profile?.email ?? session?.user.email}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("settings.access")}</p>
          <p className="mt-1 text-gold">{t("settings.lifetime")}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{t("settings.language")}</p>
          <LanguageSwitcher className="mt-2" />
        </div>
      </section>

      <section className="card-pearl mt-4 p-6">
        <h2 className="font-display text-xl">{t("settings.triggersTitle")}</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
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
        {saved && <p className="mt-3 text-xs text-gold">{t("common.saved")}</p>}
      </section>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={async () => {
            await updateState({ onboarding_completed: false });
            navigate({ to: "/app/fame-o-fame/onboarding" });
          }}
          className="rounded-full border border-gold/50 px-5 py-2 text-sm hover:bg-gold/10"
        >
          {t("settings.resetOnboarding")}
        </button>
        <button
          type="button"
          onClick={signOut}
          className="rounded-full border border-gold/50 px-5 py-2 text-sm hover:bg-gold/10"
        >
          {t("settings.signOut")}
        </button>
      </div>
    </Gated>
  );
}
