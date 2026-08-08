import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/apps/fame-o-emozione/lib/i18n";

export function Reflection({
  onContinue,
  onExit,
}: {
  onContinue: (data: { cravingFood: string | null; initialReason: string | null }) => void;
  onExit: () => void;
}) {
  const { t } = useI18n();
  const [cravingFood, setCravingFood] = useState("");
  const [initialReason, setInitialReason] = useState("");

  const submit = () => {
    onContinue({
      cravingFood: cravingFood.trim() || null,
      initialReason: initialReason.trim() || null,
    });
  };

  return (
    <div className="step-in flex flex-1 flex-col py-10">
      <button
        type="button"
        onClick={onExit}
        className="mb-8 inline-flex items-center gap-1 self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t.common.back}
      </button>

      <h1 className="text-2xl font-semibold leading-tight">{t.reflection.title}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        {t.reflection.subtitle}
      </p>

      <div className="mt-10 flex flex-col gap-3">
        <Label htmlFor="cravingFood" className="text-[15px] font-semibold">
          {t.reflection.cravingLabel}
        </Label>
        <Input
          id="cravingFood"
          value={cravingFood}
          onChange={(e) => setCravingFood(e.target.value)}
          placeholder={t.reflection.cravingPlaceholder}
          className="h-12 max-w-[420px] rounded-xl"
        />
      </div>

      <div className="mt-10 flex flex-col gap-3">
        <Label htmlFor="initialReason" className="text-[15px] font-semibold">
          {t.reflection.reasonLabel}
        </Label>
        <Textarea
          id="initialReason"
          value={initialReason}
          onChange={(e) => setInitialReason(e.target.value)}
          placeholder={t.reflection.reasonPlaceholder}
          rows={5}
          className="min-h-32 rounded-xl"
        />
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {t.reflection.reasonHint}
        </p>
        <button
          type="button"
          onClick={() => setInitialReason(t.reflection.dontKnow)}
          className="self-start text-sm text-gold-deep underline underline-offset-4"
        >
          {t.reflection.dontKnow}
        </button>
      </div>

      <div className="mt-12">
        <Button size="lg" className="w-full" onClick={submit}>
          {t.reflection.submit}
        </Button>
      </div>
    </div>
  );
}
