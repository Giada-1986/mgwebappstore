import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { StoreShell } from "@/components/store/StoreShell";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MySuggestions } from "@/components/store/MySuggestions";
import { MyPurchases } from "@/components/store/MyPurchases";

import { useI18n } from "@/lib/i18n";
import { setMarketingConsent } from "@/lib/marketing.functions";
import { track } from "@/lib/analytics";
import { useProfile, useSession } from "@/lib/platform";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Account — Mini Apps Store" },
      { name: "description", content: "Gestisci il tuo account, la lingua e i tuoi acquisti." },
      { property: "og:title", content: "Account — Mini Apps Store" },
      { property: "og:description", content: "Il tuo account dello store." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { t, lang } = useI18n();
  const { session } = useSession();
  const { data: profile } = useProfile(session?.user.id);
  const { data: purchases } = usePurchases(session?.user.id);
  const { data: products } = useProducts();
  const qc = useQueryClient();

  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (profile) setConsent(!!profile.marketing_consent);
  }, [profile?.marketing_consent]);

  async function toggleConsent(next: boolean) {
    setConsent(next);
    setState("saving");
    try {
      const res = await setMarketingConsent({ data: { consent: next, language: lang } });
      if (!res.ok) throw new Error(res.error);
      if (next) track("marketing_consent_given", { source: "account" });
      setState("saved");
      await qc.invalidateQueries({ queryKey: ["profile", session?.user.id] });
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setConsent(!next);
      setState("error");
    }
  }

  return (
    <StoreShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t("store.accountTitle")}</h1>

      <section className="card-store mt-7 space-y-5 p-7">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {t("store.email")}
          </p>
          <p className="mt-1">{profile?.email ?? session?.user.email}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {t("store.language")}
          </p>
          <LanguageSwitcher className="mt-2" />
        </div>
      </section>

      <section className="card-store mt-5 space-y-3 p-7">
        <h2 className="text-lg font-semibold">{t("store.marketing.title")}</h2>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={consent}
            disabled={state === "saving"}
            onChange={(e) => toggleConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
          />
          <span>{t("store.marketing.consent")}</span>
        </label>
        <p className="text-xs text-muted-foreground">{t("store.marketing.hint")}</p>
        {consent && profile?.marketing_consent_at && (
          <p className="text-xs text-muted-foreground">
            {t("store.marketing.since", {
              date: new Date(profile.marketing_consent_at).toLocaleDateString(
                lang === "en" ? "en-IE" : "it-IT",
              ),
            })}
          </p>
        )}
        {state === "saving" && (
          <p className="text-xs text-muted-foreground">{t("store.marketing.saving")}</p>
        )}
        {state === "saved" && <p className="text-xs text-primary">{t("store.marketing.saved")}</p>}
        {state === "error" && (
          <p className="text-xs text-destructive">{t("store.marketing.error")}</p>
        )}
      </section>

      <MySuggestions />




      <MyPurchases />

    </StoreShell>
  );
}
