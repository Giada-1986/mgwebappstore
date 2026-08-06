import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { Exercise } from "@/lib/data";

function format(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ExerciseCard({ exercise }: { exercise: Exercise }) {
  const { lang, t } = useI18n();
  const [left, setLeft] = useState<number | null>(null);
  const title = lang === "it" ? exercise.title : exercise.title_en;
  const text = lang === "it" ? exercise.instructions : exercise.instructions_en;

  useEffect(() => {
    if (left === null) return;
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((v) => (v === null ? null : v - 1)), 1000);
    return () => clearTimeout(id);
  }, [left]);

  const done = left === 0;

  return (
    <article className="card-pearl p-6">
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-display text-xl">{title}</h3>
        <span className="whitespace-nowrap text-xs text-gold">
          {exercise.duration_seconds} {t("common.seconds")}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
      <div className="mt-4 flex items-center gap-3">
        {left === null || done ? (
          <button
            type="button"
            onClick={() => setLeft(exercise.duration_seconds)}
            className="rounded-full border border-gold/50 px-4 py-1.5 text-sm transition-colors hover:bg-gold/10"
          >
            {t("exercises.startTimer")}
          </button>
        ) : (
          <>
            <span className="font-display text-2xl text-gold tabular-nums">{format(left)}</span>
            <button
              type="button"
              onClick={() => setLeft(null)}
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              {t("exercises.stopTimer")}
            </button>
          </>
        )}
        {done && <span className="text-sm text-foreground">{t("exercises.done")}</span>}
      </div>
    </article>
  );
}
