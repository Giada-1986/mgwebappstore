import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import {
  SUGGESTION_STATUSES,
  listSuggestions,
  setSuggestionStatus,
} from "@/lib/suggestions.functions";

/** Admin-only view of the "Suggest a solution" submissions, with light aggregation. */
export function SuggestionsPanel() {
  const { t, lang } = useI18n();
  const query = useQuery({ queryKey: ["admin", "suggestions"], queryFn: () => listSuggestions() });
  const update = useServerFn(setSuggestionStatus);
  const [filter, setFilter] = useState<string>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const rows = query.data?.rows ?? [];
  const stats = query.data?.stats;
  const visible = useMemo(
    () => (filter === "all" ? rows : rows.filter((r) => r.status === filter)),
    [rows, filter],
  );

  const onStatus = async (id: string, status: string) => {
    setBusyId(id);
    try {
      await update({ data: { id, status } });
      await query.refetch();
    } finally {
      setBusyId(null);
    }
  };

  if (query.isLoading) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;
  if (rows.length === 0)
    return <p className="text-sm text-muted-foreground">{t("store.admin.suggestions.empty")}</p>;

  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(lang === "it" ? "it-IT" : lang, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">{t("store.admin.suggestions.hint")}</p>

      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card label={t("store.admin.suggestions.total")} value={String(stats.total)} />
          <Card
            label={t("store.admin.suggestions.avgImportance")}
            value={String(stats.avgImportance)}
          />
          <Tally
            label={t("store.admin.suggestions.byDomain")}
            items={stats.byDomain.slice(0, 4)}
            render={(k) => t(`store.suggest.domains.${k}`)}
          />
          <Tally
            label={t("store.admin.suggestions.byApproach")}
            items={stats.byApproach.slice(0, 4)}
            render={(k) => t(`store.suggest.approaches.${k}`)}
          />
          <Tally
            label={t("store.admin.suggestions.byFormat")}
            items={stats.byFormat.slice(0, 4)}
            render={(k) => t(`store.suggest.formats.${k}`)}
          />
          <Tally
            label={t("store.admin.suggestions.byAudience")}
            items={stats.byAudience.slice(0, 4)}
            render={(k) => t(`store.suggest.audiences.${k}`)}
          />
          <Tally
            label={t("store.admin.suggestions.byPrice")}
            items={stats.byPrice.slice(0, 4)}
            render={(k) => t(`store.suggest.prices.${k}`)}
          />
          <Tally
            label={t("store.admin.suggestions.byStatus")}
            items={stats.byStatus}
            render={(k) => t(`store.admin.suggestions.statuses.${k}`)}
          />
        </div>
      )}


      <div className="flex flex-wrap gap-1.5">
        {["all", ...SUGGESTION_STATUSES].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            aria-pressed={filter === key}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              filter === key
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {key === "all" ? "—" : t(`store.admin.suggestions.statuses.${key}`)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {visible.map((r) => (
          <article key={r.id} className="rounded-2xl border border-border/70 bg-card/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {[
                    ...r.domains.map((d) => t(`store.suggest.domains.${d}`)),
                    r.domainOther ?? "",
                    r.solutionType ? t(`store.suggest.types.${r.solutionType}`) : "",
                    r.solutionTypeOther ?? "",
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </p>

                <p className="text-xs text-muted-foreground">
                  {fmtDate(r.createdAt)} · {t("store.admin.suggestions.language")}:{" "}
                  <span className="uppercase">{r.language}</span> ·{" "}
                  {t("store.admin.suggestions.importance")}: {r.importance}/5
                </p>
              </div>
              <select
                value={r.status}
                disabled={busyId === r.id}
                onChange={(e) => onStatus(r.id, e.target.value)}
                aria-label={t("store.admin.suggestions.status")}
                className="field-pearl rounded-xl px-3 py-1.5 text-xs"
              >
                {SUGGESTION_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`store.admin.suggestions.statuses.${s}`)}
                  </option>
                ))}
              </select>
            </div>

            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <Row label={t("store.admin.suggestions.goal")} value={r.goal} wide />
              {r.problem && (
                <Row label={t("store.admin.suggestions.problem")} value={r.problem} wide />
              )}
              <Row
                label={t("store.admin.suggestions.audience")}
                value={
                  [
                    ...r.audience.map((a) => t(`store.suggest.audiences.${a}`)),
                    r.audienceOther ?? "",
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"
                }
              />
              <Row
                label={t("store.admin.suggestions.frequency")}
                value={r.frequency ? t(`store.suggest.frequencies.${r.frequency}`) : "—"}
              />
              <Row
                label={t("store.admin.suggestions.formats")}
                value={
                  r.formats.map((f) => t(`store.suggest.formats.${f}`)).join(", ") || "—"
                }
              />
              <Row
                label={t("store.admin.suggestions.intent")}
                value={r.purchaseInterest ? t(`store.suggest.intents.${r.purchaseInterest}`) : "—"}
              />
              <Row
                label={t("store.admin.suggestions.price")}
                value={r.priceRange ? t(`store.suggest.prices.${r.priceRange}`) : "—"}
              />
              <Row
                label={t("store.admin.suggestions.tried")}
                value={
                  [r.tried ? t(`store.suggest.tried.${r.tried}`) : "", r.triedDetail ?? ""]
                    .filter(Boolean)
                    .join(" — ") || "—"
                }
                wide
              />
              <Row label={t("store.admin.suggestions.email")} value={r.notifyEmail ?? "—"} />
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Tally({
  label,
  items,
  render,
}: {
  label: string;
  items: { key: string; count: number }[];
  render: (key: string) => string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/60 p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {items.length === 0 && <li className="text-muted-foreground">—</li>}
        {items.map((i) => (
          <li key={i.key} className="flex justify-between gap-3">
            <span className="truncate">{render(i.key)}</span>
            <span className="text-muted-foreground">{i.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Row({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap break-words text-sm">{value}</dd>
    </div>
  );
}
