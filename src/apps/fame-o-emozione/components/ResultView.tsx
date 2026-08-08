import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { buildInsights, conclusionFor, type Answers, type CheckinResult } from "@/apps/fame-o-emozione/lib/checkin";
import { useI18n } from "@/apps/fame-o-emozione/lib/i18n";

export function ResultView({
  result,
  answers,
  onContinue,
}: {
  result: CheckinResult;
  answers: Answers;
  onContinue: () => void;
}) {
  const { t } = useI18n();
  const insights = buildInsights(answers, t);

  return (
    <div className="step-in flex flex-col gap-6">
      <div>
        <Badge variant="secondary" className="mb-4">
          {t.results.kindLabels[result.kind]}
        </Badge>
        <h1 className="text-2xl font-semibold leading-tight">{result.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          {result.description}
        </p>
      </div>

      {insights.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">{t.results.insightsTitle}</h2>
          {insights.map((item) => (
            <Card key={item.key} className="gap-1 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-deep">
                {item.label}
              </p>
              <p className="text-sm leading-relaxed text-foreground">{item.text}</p>
            </Card>
          ))}
        </div>
      )}

      <p className="text-[15px] leading-relaxed text-muted-foreground">
        {conclusionFor(result.kind, t)}
      </p>

      <p className="text-sm text-muted-foreground">{t.results.footnote}</p>

      <Button size="lg" onClick={onContinue}>
        {t.results.cta}
      </Button>
    </div>
  );
}
