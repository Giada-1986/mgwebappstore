import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Gated } from "@/components/Gated";
import { SakuraDivider } from "@/components/Sakura";
import { useI18n } from "@/lib/i18n";
import { useCheckins, useSession, type Checkin } from "@/lib/data";
import { mockCheckins } from "@/lib/mock";

export const Route = createFileRoute("/_authenticated/app/fame-o-fame/report")({
  component: ReportPage,
});

const STOPWORDS = new Set([
  "con","una","uno","del","della","dei","the","and","with","that","from","dopo","per","non","dei","alla","mio","mia","molto","poco","stato","stata","been","have","just","very","this","were","about",
]);

function topTriggers(items: Checkin[]) {
  const counts = new Map<string, number>();
  for (const c of items) {
    if (!c.note) continue;
    const words = c.note
      .toLowerCase()
      .replace(/[^\p{L}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOPWORDS.has(w));
    for (const w of new Set(words)) counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
}

function ReportPage() {
  const { t, dict, lang } = useI18n();
  const { session } = useSession();
  const { data: real = [] } = useCheckins(session?.user.id);
  const [demo, setDemo] = useState(false);
  const unlocked = real.length >= 7;
  const items = unlocked && !demo ? real : mockCheckins(lang);

  const emotionData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of items) if (c.emotion) counts.set(c.emotion, (counts.get(c.emotion) ?? 0) + 1);
    return [...counts.entries()]
      .map(([key, value]) => ({ name: t(`checkin.emotions.${key}`), value }))
      .sort((a, b) => b.value - a.value);
  }, [items, t]);

  const hourData = useMemo(() => {
    const buckets = [
      { name: "6-11", value: 0 },
      { name: "11-15", value: 0 },
      { name: "15-19", value: 0 },
      { name: "19-23", value: 0 },
      { name: "23-6", value: 0 },
    ];
    for (const c of items) {
      const h = new Date(c.created_at).getHours();
      const idx = h >= 6 && h < 11 ? 0 : h >= 11 && h < 15 ? 1 : h >= 15 && h < 19 ? 2 : h >= 19 && h < 23 ? 3 : 4;
      buckets[idx]!.value++;
    }
    return buckets;
  }, [items]);

  const dayData = useMemo(() => {
    const days = dict.days as string[];
    const counts = days.map((name) => ({ name: name.slice(0, 3), value: 0, full: name }));
    for (const c of items) counts[new Date(c.created_at).getDay()]!.value++;
    return counts;
  }, [items, dict]);

  const triggers = useMemo(() => topTriggers(items), [items]);

  const summary = useMemo(() => {
    const lines: string[] = [];
    if (emotionData[0]) lines.push(t("summary.top", { emotion: emotionData[0].name.toLowerCase() }));
    const topHour = [...hourData].sort((a, b) => b.value - a.value)[0];
    if (topHour) lines.push(t("summary.hour", { hour: topHour.name }));
    const topDay = [...dayData].sort((a, b) => b.value - a.value)[0];
    if (topDay) lines.push(t("summary.day", { day: topDay.full }));
    const waited = items.filter((c) => c.action_chosen === "wait" || c.action_chosen === "exercise").length;
    if (items.length) lines.push(t("summary.wait", { pct: Math.round((waited / items.length) * 100) }));
    lines.push(t("summary.kind"));
    return lines;
  }, [emotionData, hourData, dayData, items, t]);

  const chart = (data: { name: string; value: number }[]) => (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" width={24} />
          <Tooltip
            cursor={{ fill: "var(--gold-soft)", opacity: 0.25 }}
            contentStyle={{ background: "var(--pearl)", border: "1px solid var(--gold)", borderRadius: 12 }}
          />
          <Bar dataKey="value" fill="var(--gold)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <Gated>
      <h1 className="font-display text-3xl">{t("report.title")}</h1>

      {!unlocked && (
        <div className="card-pearl mt-4 p-6">
          <h2 className="font-display text-xl">{t("report.lockedTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("report.locked", { n: 7 - real.length })}</p>
          <p className="mt-3 text-xs text-gold">{t("report.demoNote")}</p>
        </div>
      )}

      {unlocked && (
        <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
          {t("report.demoToggle")}
        </label>
      )}

      <section className="card-pearl mt-6 p-6">
        <h2 className="font-display text-xl">{t("report.emotions")}</h2>
        <div className="mt-4">{chart(emotionData)}</div>
      </section>

      <section className="card-pearl mt-4 p-6">
        <h2 className="font-display text-xl">{t("report.times")}</h2>
        <p className="mt-4 text-sm text-muted-foreground">{t("report.hours")}</p>
        {chart(hourData)}
        <p className="mt-4 text-sm text-muted-foreground">{t("report.days")}</p>
        {chart(dayData)}
      </section>

      <section className="card-pearl mt-4 p-6">
        <h2 className="font-display text-xl">{t("report.triggers")}</h2>
        {triggers.length ? (
          <ol className="mt-3 space-y-2 text-sm">
            {triggers.map(([word, n]) => (
              <li key={word} className="flex items-center justify-between border-b border-gold/20 pb-2">
                <span className="capitalize">{word}</span>
                <span className="text-gold">×{n}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{t("report.noTriggers")}</p>
        )}
      </section>

      <SakuraDivider />

      <section className="card-pearl p-6">
        <h2 className="font-display text-xl">{t("report.summary")}</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
          {summary.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
    </Gated>
  );
}
