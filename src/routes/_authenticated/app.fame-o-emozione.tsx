import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { AppAccessGuard } from "@/components/store/AppAccessGuard";
import { useI18n as useStoreI18n } from "@/lib/i18n";
import { Quiz } from "@/apps/fame-o-emozione/components/Quiz";
import { Reflection } from "@/apps/fame-o-emozione/components/Reflection";
import { ResultView } from "@/apps/fame-o-emozione/components/ResultView";
import { NextStep } from "@/apps/fame-o-emozione/components/NextStep";
import { History } from "@/apps/fame-o-emozione/components/History";
import { Monogram } from "@/apps/fame-o-emozione/components/Monogram";
import {
  computeResult,
  type ActionKey,
  type Answers,
  type CheckinResult,
  type CravingChangeKey,
} from "@/apps/fame-o-emozione/lib/checkin";
import {
  answersToStored,
  clearSessions,
  createSession,
  deleteSession,
  loadSessions,
  saveSession,
  type CheckinSession,
} from "@/apps/fame-o-emozione/lib/checkin-storage";
import { I18nProvider, isLang, useI18n } from "@/apps/fame-o-emozione/lib/i18n";

export const Route = createFileRoute("/_authenticated/app/fame-o-emozione")({
  head: () => ({
    meta: [
      { title: "Fame o Emozione? — MINI WEB APPS" },
      {
        name: "description",
        content:
          "Check-in di 90 secondi per distinguere la fame fisica da quella emotiva e scegliere il passo successivo.",
      },
      { property: "og:title", content: "Fame o Emozione? — MINI WEB APPS" },
      {
        property: "og:description",
        content:
          "Check-in di 90 secondi per distinguere la fame fisica da quella emotiva e scegliere il passo successivo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: FameOEmozioneRoute,
});

function FameOEmozioneRoute() {
  // Lingua dello store: l'app la eredita, l'utente non deve riselezionarla.
  const { lang: storeLang } = useStoreI18n();
  const lang = isLang(storeLang) ? storeLang : "en";

  return (
    <AppAccessGuard slug="fame-o-emozione">
      <AppShell>
        <I18nProvider lang={lang}>
          <div className="foe-scope rounded-3xl px-4 py-6 sm:px-6">
            <CheckinApp />
          </div>
        </I18nProvider>
      </AppShell>
    </AppAccessGuard>
  );
}

type Screen = "home" | "reflection" | "quiz" | "result" | "next" | "final" | "history";

function CheckinApp() {
  const { t, lang } = useI18n();
  const [screen, setScreen] = useState<Screen>("home");
  const [answers, setAnswers] = useState<Answers>({});
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [session, setSession] = useState<CheckinSession | null>(null);
  const [sessions, setSessions] = useState<CheckinSession[]>([]);

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  const startCheckin = () => {
    setAnswers({});
    setResult(null);
    setSession(createSession(lang));
    setScreen("reflection");
  };

  const handleReflection = (data: {
    cravingFood: string | null;
    initialReason: string | null;
  }) => {
    setSession((s) => (s ? { ...s, ...data } : s));
    setScreen("quiz");
  };

  const handleComplete = (a: Answers) => {
    const r = computeResult(a, t);
    setAnswers(a);
    setResult(r);
    setSession((s) => {
      if (!s) return s;
      const next: CheckinSession = {
        ...s,
        answers: answersToStored(a),
        mainEmotion: a.emotion ?? null,
        mainTrigger: a.context ?? null,
        resultType: r.kind,
      };
      setSessions(saveSession(next));
      return next;
    });
    setScreen("result");
  };

  const handleFinish = (choice: ActionKey, cravingChange?: CravingChangeKey) => {
    setSession((s) => {
      if (!s) return s;
      const next: CheckinSession = {
        ...s,
        selectedAction: choice,
        cravingAfterPause: cravingChange ?? null,
      };
      setSessions(saveSession(next));
      return next;
    });
    setScreen("final");
  };

  return (
    <main className="mx-auto flex w-full max-w-[600px] flex-col px-1">
      <header className="flex items-center justify-center pt-2">
        <Monogram />
      </header>

      {screen === "home" && (
        <section className="step-in flex flex-1 flex-col justify-center py-10">
          <div className="mb-6 flex items-center justify-between gap-3">
            <Badge variant="secondary">{t.home.badge}</Badge>
          </div>
          <h1 className="text-[2.1rem] font-semibold leading-[1.15]">{t.home.h1}</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{t.home.intro}</p>

          <Button size="lg" className="mt-8 w-full" onClick={startCheckin}>
            {t.home.start}
          </Button>
          <p className="mt-4 text-center text-[13px] leading-relaxed text-muted-foreground">
            {t.home.note}
          </p>

          <Card className="mt-10 gap-2 px-5 py-5">
            <p className="text-sm font-semibold">{t.home.historyTitle}</p>
            <p className="text-sm text-muted-foreground">
              {sessions.length > 0 ? t.home.historyCount(sessions.length) : t.home.historyEmpty}
            </p>
            <p className="text-[13px] text-muted-foreground">{t.home.privacy}</p>
            {sessions.length > 0 && (
              <Button
                variant="ghost"
                className="mt-1 self-start px-0"
                onClick={() => setScreen("history")}
              >
                {t.home.openHistory}
              </Button>
            )}
          </Card>
        </section>
      )}

      {screen === "reflection" && (
        <Reflection onContinue={handleReflection} onExit={() => setScreen("home")} />
      )}

      {screen === "quiz" && (
        <Quiz onComplete={handleComplete} onExit={() => setScreen("reflection")} />
      )}

      {screen === "result" && result && (
        <section className="flex flex-1 flex-col justify-center py-10">
          <ResultView result={result} answers={answers} onContinue={() => setScreen("next")} />
        </section>
      )}

      {screen === "next" && (
        <section className="flex flex-1 flex-col justify-center py-10">
          <NextStep answers={answers} onFinish={handleFinish} />
        </section>
      )}

      {screen === "history" && (
        <History
          sessions={sessions}
          onBack={() => setScreen("home")}
          onDelete={(id) => {
            setSessions(deleteSession(id));
            toast(t.history.deletedOne);
          }}
          onClearAll={() => {
            clearSessions();
            setSessions([]);
            toast(t.history.clearedAll);
            setScreen("home");
          }}
        />
      )}

      {screen === "final" && (
        <section className="step-in flex flex-1 flex-col justify-center py-10">
          <h1 className="text-2xl font-semibold leading-tight">{t.final.title}</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{t.final.text}</p>
          <Button size="lg" className="mt-8" onClick={() => setScreen("home")}>
            {t.final.close}
          </Button>
          <button
            type="button"
            onClick={() => setScreen("history")}
            className="mt-4 text-sm text-gold-deep underline underline-offset-4"
          >
            {t.final.seeHistory}
          </button>
          <button
            type="button"
            onClick={startCheckin}
            className="mt-3 text-sm text-gold-deep underline underline-offset-4"
          >
            {t.final.again}
          </button>
        </section>
      )}

      <footer className="mt-auto py-6">
        <div className="gold-rule mb-5 w-full" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">{t.footer}</p>
      </footer>
    </main>
  );
}
