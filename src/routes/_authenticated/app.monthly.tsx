import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Gated } from "@/components/Gated";
import { useI18n } from "@/lib/i18n";
import { useCheckins, useSession, type Checkin } from "@/lib/data";
import { mockCheckins } from "@/lib/mock";

export const Route = createFileRoute("/_authenticated/app/monthly")({
  component: MonthlyPage,
});

function stats(items: Checkin[]) {
  const total = items.length;
  const waited = items.filter((c) => c.action_chosen === "wait" || c.action_chosen === "exercise").length;
  return { total, pct: total ? Math.round((waited / total) * 100) : 0 };
}

function MonthlyPage() {
  const { t } = useI18n();
  const { session } = useSession();
  const { data: real = [] } = useCheckins(session?.user.id);

  const daysSinceFirst = useMemo(() => {
    if (!real.length) return 0;
    const first = new Date(real[real.length - 1]!.created_at).getTime();
    return Math.floor((Date.now() - first) / 86400000);
  }, [real]);

  const unlocked = daysSinceFirst >= 30;
  const items = unlocked ? real : mockCheckins();

  const { first, last } = useMemo(() => {
    const sorted = [...items].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const start = new Date(sorted[0]?.created_at ?? Date.now()).getTime();
    const cut = start + 15 * 86400000;
    return {
      first: stats(sorted.filter((c) => new Date(c.created_at).getTime() < cut)),
      last: stats(sorted.filter((c) => new Date(c.created_at).getTime() >= cut)),
    };
  }, [items]);

  const verdict = last.pct > first.pct + 3 ? "better" : last.pct < first.pct - 3 ? "lower" : "same";

  return (
    <Gated>
      <h1 className="font-display text-3xl">{t("monthly.title")}</h1>

      {!unlocked && (
        <div className="card-pearl mt-4 p-6">
          <h2 className="font-display text-xl">{t("monthly.lockedTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("monthly.locked", { n: Math.max(0, 30 - daysSinceFirst) })}
          </p>
          <p className="mt-3 text-xs text-gold">{t("report.demoNote")}</p>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {[
          { label: t("monthly.first15"), s: first },
          { label: t("monthly.last15"), s: last },
        ].map((block) => (
          <section key={block.label} className="card-pearl p-6">
            <h2 className="font-display text-xl">{block.label}</h2>
            <p className="mt-4 text-sm text-muted-foreground">{t("monthly.total")}</p>
            <p className="font-display text-4xl text-gold">{block.s.total}</p>
            <p className="mt-4 text-sm text-muted-foreground">{t("monthly.waitRate")}</p>
            <p className="font-display text-4xl text-gold">{block.s.pct}%</p>
          </section>
        ))}
      </div>

      <section className="card-pearl mt-4 p-6">
        <p className="text-sm leading-relaxed">{t(`monthly.${verdict}`)}</p>
      </section>
    </Gated>
  );
}
