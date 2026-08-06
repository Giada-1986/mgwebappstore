import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Gated } from "@/components/Gated";
import { ExerciseCard } from "@/components/ExerciseCard";
import { SakuraDivider } from "@/components/Sakura";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useCheckins, useExercises, useSession, type Exercise } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/app/")({
  component: CheckinPage,
});

const EMOTIONS = [
  { key: "stress", emoji: "😖" },
  { key: "boredom", emoji: "🥱" },
  { key: "sadness", emoji: "😢" },
  { key: "anger", emoji: "😠" },
  { key: "anxiety", emoji: "😰" },
  { key: "loneliness", emoji: "🫂" },
  { key: "tiredness", emoji: "😴" },
  { key: "other", emoji: "✨" },
] as const;

const HUNGER = ["physical", "unsure", "emotional"] as const;

type Stage = "idle" | 1 | 2 | 3 | 4 | "wait" | "exercise" | "eat";

function Countdown({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [left, setLeft] = useState(600);

  useEffect(() => {
    if (left <= 0) {
      onDone();
      return;
    }
    const id = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(id);
  }, [left, onDone]);

  const m = Math.floor(left / 60);
  const s = left % 60;
  const pct = ((600 - left) / 600) * 100;

  return (
    <div className="text-center">
      <h2 className="font-display text-2xl">{t("checkin.waitTitle")}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{t("checkin.waitBreath")}</p>
      <div className="mx-auto mt-6 flex h-40 w-40 items-center justify-center rounded-full border-2 border-gold/40 bg-pearl/70 shadow-[var(--shadow-gold)]">
        <span className="font-display text-4xl text-gold tabular-nums">
          {m}:{String(s).padStart(2, "0")}
        </span>
      </div>
      <div className="mx-auto mt-6 h-1 w-56 overflow-hidden rounded-full bg-gold/15">
        <div className="h-full bg-[image:var(--gradient-gold)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CheckinPage() {
  const { t } = useI18n();
  const { session } = useSession();
  const qc = useQueryClient();
  const { data: checkins = [] } = useCheckins(session?.user.id);
  const { data: exercises = [] } = useExercises();

  const [stage, setStage] = useState<Stage>("idle");
  const [hunger, setHunger] = useState<string | null>(null);
  const [emotion, setEmotion] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [waitDone, setWaitDone] = useState(false);

  const randomExercise = useMemo<Exercise | undefined>(
    () => (exercises.length ? exercises[Math.floor(Math.random() * exercises.length)] : undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exercises.length, stage],
  );

  function reset() {
    setStage("idle");
    setHunger(null);
    setEmotion(null);
    setNote("");
    setWaitDone(false);
  }

  async function save(action: string) {
    if (!session) return;
    await supabase.from("checkins").insert({
      user_id: session.user.id,
      hunger_type: hunger ?? "unsure",
      emotion,
      note: note || null,
      action_chosen: action,
    });
    await qc.invalidateQueries({ queryKey: ["checkins", session.user.id] });
  }

  return (
    <Gated>
      {stage === "idle" && (
        <div className="text-center">
          <h1 className="font-display text-3xl">{t("checkin.greeting")}</h1>
          <button
            type="button"
            onClick={() => setStage(1)}
            className="mt-8 w-full rounded-3xl bg-[image:var(--gradient-gold)] px-8 py-8 font-display text-2xl leading-snug text-primary-foreground shadow-[var(--shadow-gold)] transition-transform hover:-translate-y-0.5"
          >
            {t("checkin.big")}
          </button>
          <SakuraDivider />
          <p className="text-sm text-muted-foreground">
            {checkins.length} {t("checkin.count")}
          </p>
        </div>
      )}

      {stage === 1 && (
        <div className="card-pearl p-8">
          <h2 className="font-display text-2xl">{t("checkin.q1")}</h2>
          <div className="mt-6 grid gap-3">
            {HUNGER.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setHunger(key);
                  setStage(2);
                }}
                className="rounded-2xl border border-gold/35 bg-background/50 px-5 py-4 text-left transition-colors hover:border-gold hover:bg-gold/10"
              >
                {t(`checkin.q1a.${key}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      {stage === 2 && (
        <div className="card-pearl p-8">
          <h2 className="font-display text-2xl">{t("checkin.q2")}</h2>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {EMOTIONS.map((e) => (
              <button
                key={e.key}
                type="button"
                onClick={() => {
                  setEmotion(e.key);
                  setStage(3);
                }}
                className="rounded-2xl border border-gold/35 bg-background/50 px-3 py-4 text-center text-sm transition-colors hover:border-gold hover:bg-gold/10"
              >
                <span className="block text-2xl">{e.emoji}</span>
                <span className="mt-1 block">{t(`checkin.emotions.${e.key}`)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {stage === 3 && (
        <div className="card-pearl p-8">
          <h2 className="font-display text-2xl">{t("checkin.q3")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("checkin.q3Optional")}</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={t("checkin.q3Placeholder")}
            className="mt-4 w-full rounded-2xl border border-gold/35 bg-background/60 px-4 py-3 outline-none focus:border-gold"
          />
          <button
            type="button"
            onClick={() => setStage(4)}
            className="mt-5 w-full rounded-full bg-[image:var(--gradient-gold)] px-6 py-3 font-medium text-primary-foreground shadow-[var(--shadow-gold)]"
          >
            {t("common.continue")}
          </button>
        </div>
      )}

      {stage === 4 && (
        <div className="card-pearl p-8">
          <h2 className="font-display text-2xl">{t("checkin.q4")}</h2>
          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={async () => {
                await save("wait");
                setStage("wait");
              }}
              className="rounded-2xl border border-gold/35 bg-background/50 px-5 py-4 text-left transition-colors hover:border-gold hover:bg-gold/10"
            >
              {t("checkin.q4wait")}
            </button>
            <button
              type="button"
              onClick={async () => {
                await save("exercise");
                setStage("exercise");
              }}
              className="rounded-2xl border border-gold/35 bg-background/50 px-5 py-4 text-left transition-colors hover:border-gold hover:bg-gold/10"
            >
              {t("checkin.q4exercise")}
            </button>
            <button
              type="button"
              onClick={async () => {
                await save("eat");
                setStage("eat");
              }}
              className="rounded-2xl border border-gold/35 bg-background/50 px-5 py-4 text-left transition-colors hover:border-gold hover:bg-gold/10"
            >
              {t("checkin.q4eat")}
            </button>
          </div>
        </div>
      )}

      {stage === "wait" && (
        <div className="card-pearl p-8">
          <Countdown onDone={() => setWaitDone(true)} />
          {waitDone && <p className="mt-6 text-center text-sm">{t("checkin.waitDone")}</p>}
          <button
            type="button"
            onClick={reset}
            className="mx-auto mt-6 block rounded-full border border-gold/50 px-6 py-2 text-sm hover:bg-gold/10"
          >
            {t("common.close")}
          </button>
        </div>
      )}

      {stage === "exercise" && (
        <div className="space-y-4">
          {randomExercise && <ExerciseCard exercise={randomExercise} />}
          <button
            type="button"
            onClick={reset}
            className="mx-auto block rounded-full border border-gold/50 px-6 py-2 text-sm hover:bg-gold/10"
          >
            {t("common.close")}
          </button>
        </div>
      )}

      {stage === "eat" && (
        <div className="card-pearl p-10 text-center">
          <p className="font-display text-2xl">{t("checkin.eatMessage")}</p>
          <button
            type="button"
            onClick={reset}
            className="mx-auto mt-8 block rounded-full border border-gold/50 px-6 py-2 text-sm hover:bg-gold/10"
          >
            {t("common.close")}
          </button>
        </div>
      )}
    </Gated>
  );
}
