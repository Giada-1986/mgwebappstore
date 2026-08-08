import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { OptionCard } from "./OptionCard";
import { cravingChangeKeys, type CravingChangeKey } from "@/apps/fame-o-emozione/lib/checkin";
import { useI18n } from "@/apps/fame-o-emozione/lib/i18n";

const TOTAL = 10 * 60;

export function TenMinuteTimer({ onDone }: { onDone: (cravingChange: CravingChangeKey) => void }) {
  const { t } = useI18n();
  const [remaining, setRemaining] = useState(TOTAL);
  const [running, setRunning] = useState(true);
  const [finished, setFinished] = useState(false);
  const [choice, setChoice] = useState<CravingChangeKey | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running || finished) return;
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setFinished(true);
          setRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, finished]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  if (finished) {
    return (
      <div className="step-in flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-semibold leading-tight">{t.timer.afterTitle}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t.timer.afterSubtitle}</p>
        </div>
        <div className="flex flex-col gap-3">
          {cravingChangeKeys.map((key) => (
            <OptionCard
              key={key}
              label={t.cravingChange[key]}
              selected={choice === key}
              onSelect={() => setChoice(key)}
            />
          ))}
        </div>
        <Button size="lg" disabled={!choice} onClick={() => onDone(choice!)}>
          {t.common.continue}
        </Button>
      </div>
    );
  }

  return (
    <div className="step-in flex flex-col gap-6">
      <Card className="items-center gap-3 border-gold/25 bg-blush-soft/70 px-6 py-8 text-center">
        <span className="font-display text-5xl font-semibold tabular-nums text-secondary-foreground">
          {mm}:{ss}
        </span>
        <Progress value={((TOTAL - remaining) / TOTAL) * 100} className="h-1.5 w-full" />
        <p className="text-sm text-secondary-foreground/90">{t.timer.caption}</p>
      </Card>

      <div>
        <h2 className="text-base font-semibold">{t.timer.activitiesTitle}</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {t.timer.activities.map((a) => (
            <li key={a} className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
              {a}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <Button variant="outline" size="lg" onClick={() => setRunning((r) => !r)}>
          {running ? t.timer.pause : t.timer.resume}
        </Button>
        <Button variant="ghost" onClick={() => setFinished(true)}>
          {t.timer.skip}
        </Button>
      </div>
    </div>
  );
}
