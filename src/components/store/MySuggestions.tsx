import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { listMySuggestions } from "@/lib/suggestions.functions";

/** Personal, read-only view of the proposals submitted by the signed-in user. */
export function MySuggestions() {
  const { t, lang } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: ["my-suggestions"],
    queryFn: () => listMySuggestions(),
    staleTime: 60_000,
  });

  const rows = data?.rows ?? [];
  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat(lang === "it" ? "it-IT" : lang, { dateStyle: "medium" }).format(
      new Date(iso),
    );

  return (
    <section className="card-store mt-5 p-7">
      <h2 className="text-lg font-semibold">{t("store.mySuggestions.title")}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">{t("store.mySuggestions.text")}</p>

      <Link to="/suggest" className="btn-store-ghost mt-4 inline-flex text-sm">
        {t("store.mySuggestions.cta")}
      </Link>

      {isLoading ? (
        <p className="mt-5 text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : rows.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">{t("store.mySuggestions.empty")}</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl border border-border/70 bg-card/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {t(`store.suggest.types.${r.solutionType}`)}
                  {r.solutionTypeOther ? ` — ${r.solutionTypeOther}` : ""}
                </p>
                <span className="rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground">
                  {t(`store.mySuggestions.statuses.${r.status}`)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{fmtDate(r.createdAt)}</p>
              {r.preview && (
                <p className="mt-2 line-clamp-2 whitespace-pre-wrap break-words text-sm">
                  {r.preview}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
