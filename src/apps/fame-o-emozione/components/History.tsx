import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { optionLabel } from "@/apps/fame-o-emozione/lib/checkin";
import { formatDate, formatTime, sortedSessions, type CheckinSession } from "@/apps/fame-o-emozione/lib/checkin-storage";
import { useI18n } from "@/apps/fame-o-emozione/lib/i18n";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-[15px] leading-relaxed">{value}</p>
    </div>
  );
}

export function History({
  sessions,
  onBack,
  onClearAll,
  onDelete,
}: {
  sessions: CheckinSession[];
  onBack: () => void;
  onClearAll: () => void;
  onDelete: (id: string) => void;
}) {
  const { t, lang } = useI18n();
  const [openId, setOpenId] = useState<string | null>(null);
  const list = sortedSessions(sessions);
  const selected = list.find((s) => s.id === openId) ?? null;

  const actionLabel = (key: string | null) => {
    if (!key) return null;
    const map = t.actions as Record<string, string>;
    return map[key] ?? key;
  };

  const cravingAfterLabel = (key: string | null) => {
    if (!key) return null;
    const map = t.cravingChange as Record<string, string>;
    return map[key] ?? key;
  };

  if (selected) {
    return (
      <div className="step-in flex flex-1 flex-col py-10">
        <button
          type="button"
          onClick={() => setOpenId(null)}
          className="mb-8 inline-flex items-center gap-1 self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {t.history.backToHistory}
        </button>

        <p className="text-sm text-muted-foreground">
          {formatDate(selected.createdAt, lang)} · {formatTime(selected.createdAt, lang)}
        </p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">{t.history.detailTitle}</h1>

        <div className="mt-8 flex flex-col gap-5">
          <Field
            label={t.history.cravingLabel}
            value={selected.cravingFood ?? t.common.notProvided}
          />
          <Field
            label={t.history.reasonLabel}
            value={selected.initialReason ?? t.common.notProvided}
          />
          <Field
            label={t.history.emotionLabel}
            value={optionLabel(t, "emotion", selected.mainEmotion)}
          />
          <Field
            label={t.history.triggerLabel}
            value={optionLabel(t, "context", selected.mainTrigger)}
          />
          <Field
            label={t.history.resultLabel}
            value={
              selected.resultType ? t.results.kindLabels[selected.resultType] : t.history.noResult
            }
          />
          <Field
            label={t.history.actionLabel}
            value={actionLabel(selected.selectedAction) ?? t.history.noAction}
          />
          {selected.cravingAfterPause && (
            <Field
              label={t.history.cravingAfterLabel}
              value={cravingAfterLabel(selected.cravingAfterPause) ?? ""}
            />
          )}
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" className="mt-10 self-start px-0 text-muted-foreground">
              {t.history.deleteOne}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.history.deleteOneTitle}</DialogTitle>
              <DialogDescription>{t.history.deleteOneText}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">{t.common.cancel}</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button
                  variant="destructive"
                  onClick={() => {
                    onDelete(selected.id);
                    setOpenId(null);
                  }}
                >
                  {t.common.delete}
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="step-in flex flex-1 flex-col py-10">
      <button
        type="button"
        onClick={onBack}
        className="mb-8 inline-flex items-center gap-1 self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t.common.back}
      </button>

      <h1 className="text-2xl font-semibold leading-tight">{t.history.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {list.length > 0 ? t.home.historyCount(list.length) : t.home.historyEmpty}
      </p>
      <p className="mt-1 text-[13px] text-muted-foreground">{t.home.privacy}</p>

      <div className="mt-8 flex flex-col gap-3">
        {list.map((s) => (
          <button
            type="button"
            key={s.id}
            onClick={() => setOpenId(s.id)}
            className="flex w-full flex-col gap-2 rounded-2xl border border-border bg-card px-5 py-5 text-left transition-all hover:border-gold/60 hover:shadow-calm"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {formatDate(s.createdAt, lang)} · {formatTime(s.createdAt, lang)}
              </p>
              <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            </div>
            {s.cravingFood && <p className="text-base font-semibold">{s.cravingFood}</p>}
            {s.initialReason && (
              <p className="text-sm italic leading-relaxed text-muted-foreground">
                “{s.initialReason}”
              </p>
            )}
            <div className="mt-1 flex flex-col gap-0.5 text-sm">
              {s.mainEmotion && (
                <p>
                  <span className="text-muted-foreground">{t.history.cardEmotion} </span>
                  {optionLabel(t, "emotion", s.mainEmotion)}
                </p>
              )}
              {s.mainTrigger && (
                <p>
                  <span className="text-muted-foreground">{t.history.cardPattern} </span>
                  {optionLabel(t, "context", s.mainTrigger)}
                </p>
              )}
              {s.selectedAction && (
                <p>
                  <span className="text-muted-foreground">{t.history.cardAction} </span>
                  {actionLabel(s.selectedAction)}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      {list.length > 0 && (
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" className="mt-10 self-start px-0 text-muted-foreground">
              {t.history.clearAll}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.history.clearAllTitle}</DialogTitle>
              <DialogDescription>{t.history.clearAllText}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">{t.common.cancel}</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="destructive" onClick={onClearAll}>
                  {t.history.clearAllConfirm}
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
