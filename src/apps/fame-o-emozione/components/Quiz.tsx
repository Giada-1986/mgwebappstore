import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { OptionCard } from "./OptionCard";
import { getQuestions, type Answers, type QuestionId } from "@/apps/fame-o-emozione/lib/checkin";
import { useI18n } from "@/apps/fame-o-emozione/lib/i18n";
import { ArrowLeft } from "lucide-react";

export function Quiz({
  onComplete,
  onExit,
}: {
  onComplete: (answers: Answers) => void;
  onExit: () => void;
}) {
  const { t } = useI18n();
  const questions = getQuestions(t);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const q = questions[step]!;
  const qid = q.id as QuestionId;
  const value = answers[qid];
  const selectedMulti = Array.isArray(value) ? value : [];
  const canContinue = q.multiple ? selectedMulti.length > 0 : typeof value === "string";

  const select = (optionValue: string) => {
    setAnswers((prev) => {
      if (q.multiple) {
        const current = (prev[qid] as string[] | undefined) ?? [];
        const next = current.includes(optionValue)
          ? current.filter((v) => v !== optionValue)
          : [...current, optionValue];
        return { ...prev, [qid]: next };
      }
      return { ...prev, [qid]: optionValue };
    });
  };

  const next = () => {
    if (step === questions.length - 1) {
      onComplete(answers);
      return;
    }
    setStep((s) => s + 1);
  };

  const back = () => {
    if (step === 0) {
      onExit();
      return;
    }
    setStep((s) => s - 1);
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-0 z-10 -mx-5 mb-6 bg-background/90 px-5 pb-4 pt-5 backdrop-blur">
        <div className="mb-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={back}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            {t.common.back}
          </button>
          <span className="text-sm text-muted-foreground">
            {t.quiz.progress(step + 1, questions.length)}
          </span>
        </div>
        <Progress value={((step + 1) / questions.length) * 100} className="h-1.5" />
      </div>

      <div key={q.id} className="step-in flex flex-1 flex-col">
        <h1 className="text-2xl font-semibold leading-tight">{q.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{q.hint ?? t.quiz.defaultHint}</p>

        <div className="mt-6 flex flex-col gap-3">
          {q.options.map((opt) => (
            <OptionCard
              key={opt.value}
              label={opt.label}
              multiple={q.multiple}
              selected={q.multiple ? selectedMulti.includes(opt.value) : value === opt.value}
              onSelect={() => select(opt.value)}
            />
          ))}
        </div>
      </div>

      <div className="sticky bottom-0 -mx-5 mt-8 bg-gradient-to-t from-background via-background to-transparent px-5 pb-6 pt-4">
        <Button size="lg" className="w-full" disabled={!canContinue} onClick={next}>
          {step === questions.length - 1 ? t.quiz.finish : t.quiz.next}
        </Button>
      </div>
    </div>
  );
}
