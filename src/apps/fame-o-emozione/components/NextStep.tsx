import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TenMinuteTimer } from "./TenMinuteTimer";
import {
  microActionsFor,
  type ActionKey,
  type Answers,
  type CravingChangeKey,
} from "@/apps/fame-o-emozione/lib/checkin";
import { useI18n } from "@/apps/fame-o-emozione/lib/i18n";

type Mode = "choose" | "eat" | "timer" | "care";

export function NextStep({
  answers,
  onFinish,
}: {
  answers: Answers;
  onFinish: (choice: ActionKey, cravingChange?: CravingChangeKey) => void;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("choose");
  const actions = microActionsFor(t, answers.emotion);

  if (mode === "choose") {
    return (
      <div className="step-in flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-semibold leading-tight">{t.next.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t.next.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={() => setMode("eat")}
          className="flex w-full flex-col gap-1.5 rounded-2xl border border-border bg-card px-5 py-5 text-left transition-all hover:border-gold/60 hover:shadow-calm"
        >
          <h2 className="text-lg font-semibold">{t.next.eatCard}</h2>
          <p className="text-sm text-muted-foreground">{t.next.eatCardText}</p>
        </button>

        <button
          type="button"
          onClick={() => setMode("timer")}
          className="flex w-full flex-col gap-1.5 rounded-2xl border border-border bg-card px-5 py-5 text-left transition-all hover:border-gold/60 hover:shadow-calm"
        >
          <h2 className="text-lg font-semibold">{t.next.timerCard}</h2>
          <p className="text-sm text-muted-foreground">{t.next.timerCardText}</p>
        </button>

        <button
          type="button"
          onClick={() => setMode("care")}
          className="flex w-full flex-col gap-1.5 rounded-2xl border border-border bg-card px-5 py-5 text-left transition-all hover:border-gold/60 hover:shadow-calm"
        >
          <h2 className="text-lg font-semibold">{t.next.careCard}</h2>
          <p className="text-sm text-muted-foreground">{t.next.careCardText}</p>
        </button>
      </div>
    );
  }

  if (mode === "eat") {
    return (
      <div className="step-in flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold leading-tight">{t.next.eatTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t.next.eatCardText}</p>
        </div>
        <ol className="flex flex-col gap-3">
          {t.mindfulEatingSteps.map((s, i) => (
            <li
              key={s}
              className="flex gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-[15px]"
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                {i + 1}
              </span>
              <span className="min-w-0">{s}</span>
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-2">
          <Button size="lg" onClick={() => onFinish("mindful")}>
            {t.next.eatConfirm}
          </Button>
          <Button variant="ghost" onClick={() => setMode("choose")}>
            {t.next.backToOptions}
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "timer") {
    return <TenMinuteTimer onDone={(cravingChange) => onFinish("tenMinutes", cravingChange)} />;
  }

  return (
    <div className="step-in flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold leading-tight">{t.next.careTitle}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t.next.careSubtitle}</p>
      </div>
      <div className="flex flex-col gap-3">
        {actions.map((a) => (
          <Card key={a.title} className="gap-1 px-5 py-4">
            <h2 className="text-base font-semibold">{a.title}</h2>
            <p className="text-sm text-muted-foreground">{a.detail}</p>
          </Card>
        ))}
      </div>

      <div className="rounded-2xl bg-blush px-5 py-4">
        <h2 className="font-display text-base font-semibold text-blush-foreground">
          {t.next.careQuestion}
        </h2>
        <div className="mt-3 flex flex-col gap-2">
          <Button size="lg" onClick={() => onFinish("microThenEat")}>
            {t.next.careEat}
          </Button>
          <Button variant="outline" size="lg" onClick={() => onFinish("microStay")}>
            {t.next.careStay}
          </Button>
          <Button variant="ghost" onClick={() => setMode("timer")}>
            {t.next.careTimer}
          </Button>
        </div>
      </div>
    </div>
  );
}
