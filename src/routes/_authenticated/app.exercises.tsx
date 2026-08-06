import { createFileRoute } from "@tanstack/react-router";
import { Gated } from "@/components/Gated";
import { ExerciseCard } from "@/components/ExerciseCard";
import { useI18n } from "@/lib/i18n";
import { useExercises } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/app/exercises")({
  component: ExercisesPage,
});

function ExercisesPage() {
  const { t } = useI18n();
  const { data: exercises = [], isLoading } = useExercises();

  return (
    <Gated>
      <h1 className="font-display text-3xl">{t("exercises.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("exercises.subtitle")}</p>
      <div className="mt-6 grid gap-4">
        {isLoading && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
        {exercises.map((ex) => (
          <ExerciseCard key={ex.id} exercise={ex} />
        ))}
      </div>
    </Gated>
  );
}
