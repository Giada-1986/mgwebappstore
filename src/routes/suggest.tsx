import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { StoreShell } from "@/components/store/StoreShell";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/platform";
import {
  AUDIENCES,
  CURRENT_APPROACHES,
  DOMAINS,
  FORMATS,
  FREQUENCIES,
  PRICE_RANGES,
  TRIED_OPTIONS,
  submitSuggestion,
} from "@/lib/suggestions.functions";


export const Route = createFileRoute("/suggest")({
  head: () => ({
    meta: [
      { title: "Proponi una soluzione — Mini Web Apps" },
      {
        name: "description",
        content:
          "Suggerisci un problema da risolvere o una risorsa digitale — mini web app, checklist, template, ebook o guida — che vorresti trovare nello store MINI WEB APPS.",
      },
      { property: "og:title", content: "Proponi una soluzione — Mini Web Apps" },
      {
        property: "og:description",
        content: "Le idee più richieste possono diventare i prossimi prodotti MINI WEB APPS.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SuggestPage,
});

const GOAL_MAX = 1000;
const PROBLEM_MAX = 1000;
const DETAIL_MAX = 500;

function Question({
  n,
  title,
  hint,
  badge,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-store p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary"
        >
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-medium leading-snug text-foreground">
            {title}
            {badge && (
              <span className="ml-2 align-middle text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                {badge}
              </span>
            )}
          </h2>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-2 text-left text-sm transition-colors ${
        active
          ? "border-primary/60 bg-primary/15 text-foreground"
          : "border-border/70 bg-card/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function SuggestPage() {
  const { t, lang } = useI18n();
  const { session } = useSession();
  const send = useServerFn(submitSuggestion);

  const [domains, setDomains] = useState<string[]>([]);
  const [domainOther, setDomainOther] = useState("");
  const [goal, setGoal] = useState("");
  const [problem, setProblem] = useState("");
  const [audience, setAudience] = useState<string[]>([]);
  const [audienceOther, setAudienceOther] = useState("");
  const [frequency, setFrequency] = useState("");
  const [formats, setFormats] = useState<string[]>([]);
  const [importance, setImportance] = useState(3);
  const [currentApproach, setCurrentApproach] = useState<string[]>([]);
  const [currentApproachTool, setCurrentApproachTool] = useState("");
  const [currentApproachOther, setCurrentApproachOther] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [tried, setTried] = useState("");
  const [triedDetail, setTriedDetail] = useState("");
  const [notify, setNotify] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");


  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const toggle = (list: string[], set: (v: string[]) => void, value: string) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const canSubmit = useMemo(
    () => domains.length > 0 && goal.trim().length >= 5 && !busy,
    [domains, goal, busy],
  );

  const reset = () => {
    setDomains([]);
    setDomainOther("");
    setGoal("");
    setProblem("");
    setAudience([]);
    setAudienceOther("");
    setFrequency("");
    setFormats([]);
    setImportance(3);
    setCurrentApproach([]);
    setCurrentApproachTool("");
    setCurrentApproachOther("");
    setPriceRange("");
    setTried("");
    setTriedDetail("");
    setNotify(false);
    setNotifyEmail("");
    setDone(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const result = await send({
        data: {
          domains,
          domainOther,
          goal,
          problem,
          audience,
          audienceOther,
          frequency,
          formats,
          importance,
          currentApproach,
          currentApproachTool: currentApproach.includes("app") ? currentApproachTool : "",
          currentApproachOther: currentApproach.includes("other") ? currentApproachOther : "",
          priceRange,
          tried,
          triedDetail,
          notify,
          notifyEmail,
          language: lang,
        },
      });

      if (result.ok) {
        setDone(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setError(
          result.reason === "rate_limited"
            ? t("store.suggest.errorRate")
            : t("store.suggest.errorInvalid"),
        );
      }
    } catch {
      setError(t("store.suggest.errorGeneric"));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <StoreShell>
        <section className="card-store mx-auto max-w-2xl px-6 py-14 text-center sm:px-10">
          <span aria-hidden className="text-4xl">
            ✦
          </span>
          <h1 className="mt-5 font-display text-3xl">{t("store.suggest.successTitle")}</h1>
          <p className="mx-auto mt-4 max-w-lg leading-relaxed text-muted-foreground">
            {t("store.suggest.successText")}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">{t("store.suggest.successNote")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/apps" className="btn-store text-sm">
              {t("store.suggest.backCatalog")}
            </Link>
            <button type="button" onClick={reset} className="btn-store-ghost text-sm">
              {t("store.suggest.another")}
            </button>
          </div>
        </section>
      </StoreShell>
    );
  }

  const triedIsYes = tried.startsWith("yes");

  return (
    <StoreShell>
      <div className="mx-auto max-w-3xl">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
            <span translate="no" className="notranslate">
              {t("store.brand")}
            </span>
          </p>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl">{t("store.suggest.title")}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t("store.suggest.intro")}
          </p>
        </header>

        <form onSubmit={onSubmit} className="space-y-4">
          <Question
            n={1}
            title={t("store.suggest.q1")}
            hint={t("store.suggest.q1Hint")}
            badge={t("store.suggest.required")}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {DOMAINS.map((key) => (
                <Chip
                  key={key}
                  active={domains.includes(key)}
                  onClick={() => toggle(domains, setDomains, key)}
                >
                  {t(`store.suggest.domains.${key}`)}
                </Chip>
              ))}
            </div>
            {domains.includes("other") && (
              <input
                className="field-pearl mt-3 w-full rounded-xl px-3.5 py-2.5 text-sm"
                maxLength={120}
                placeholder={t("store.suggest.q1Other")}
                aria-label={t("store.suggest.q1Other")}
                value={domainOther}
                onChange={(e) => setDomainOther(e.target.value)}
              />
            )}
          </Question>


          <Question n={2} title={t("store.suggest.q2")} badge={t("store.suggest.required")}>
            <textarea
              className="field-pearl min-h-32 w-full rounded-xl px-3.5 py-2.5 text-sm"
              maxLength={GOAL_MAX}
              placeholder={t("store.suggest.q2Placeholder")}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
            <p className="mt-1.5 text-right text-xs text-muted-foreground">
              {t("store.suggest.chars", { n: goal.length, max: GOAL_MAX })}
            </p>
          </Question>

          <Question n={3} title={t("store.suggest.q3")} badge={t("store.suggest.optional")}>
            <textarea
              className="field-pearl min-h-28 w-full rounded-xl px-3.5 py-2.5 text-sm"
              maxLength={PROBLEM_MAX}
              placeholder={t("store.suggest.q3Placeholder")}
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
            />
            <p className="mt-1.5 text-right text-xs text-muted-foreground">
              {t("store.suggest.chars", { n: problem.length, max: PROBLEM_MAX })}
            </p>
          </Question>

          <Question n={4} title={t("store.suggest.q4")} hint={t("store.suggest.q4Hint")}>
            <div className="grid gap-2 sm:grid-cols-2">
              {AUDIENCES.map((key) => (
                <Chip
                  key={key}
                  active={audience.includes(key)}
                  onClick={() => toggle(audience, setAudience, key)}
                >
                  {t(`store.suggest.audiences.${key}`)}
                </Chip>
              ))}
            </div>
            {audience.includes("other") && (
              <input
                className="field-pearl mt-3 w-full rounded-xl px-3.5 py-2.5 text-sm"
                maxLength={120}
                placeholder={t("store.suggest.q4Other")}
                aria-label={t("store.suggest.q4Other")}
                value={audienceOther}
                onChange={(e) => setAudienceOther(e.target.value)}
              />
            )}
          </Question>

          <Question n={5} title={t("store.suggest.q5")}>
            <div className="grid gap-2 sm:grid-cols-2">
              {FREQUENCIES.map((key) => (
                <Chip key={key} active={frequency === key} onClick={() => setFrequency(key)}>
                  {t(`store.suggest.frequencies.${key}`)}
                </Chip>
              ))}
            </div>
          </Question>

          <Question n={6} title={t("store.suggest.q6")} hint={t("store.suggest.q6Hint")}>
            <div className="grid gap-2 sm:grid-cols-2">
              {FORMATS.map((key) => (
                <Chip
                  key={key}
                  active={formats.includes(key)}
                  onClick={() => toggle(formats, setFormats, key)}
                >
                  {t(`store.suggest.formats.${key}`)}
                </Chip>
              ))}
            </div>
          </Question>

          <Question n={7} title={t("store.suggest.q7")}>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={importance}
              aria-label={t("store.suggest.q7")}
              onChange={(e) => setImportance(Number(e.target.value))}
              className="w-full accent-[var(--primary)]"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>1 · {t("store.suggest.q7Min")}</span>
              <span className="text-sm font-semibold text-primary">{importance}</span>
              <span>5 · {t("store.suggest.q7Max")}</span>
            </div>
          </Question>

          <Question n={8} title={t("store.suggest.q8")} hint={t("store.suggest.q8Hint")}>
            <div className="grid gap-2 sm:grid-cols-2">
              {CURRENT_APPROACHES.map((key) => (
                <Chip
                  key={key}
                  active={currentApproach.includes(key)}
                  onClick={() => toggle(currentApproach, setCurrentApproach, key)}
                >
                  {t(`store.suggest.approaches.${key}`)}
                </Chip>
              ))}
            </div>
            {currentApproach.includes("app") && (
              <div className="mt-3">
                <label className="mb-1.5 block text-xs text-muted-foreground">
                  {t("store.suggest.q8Tool")} · {t("store.suggest.optional")}
                </label>
                <input
                  className="field-pearl w-full rounded-xl px-3.5 py-2.5 text-sm"
                  maxLength={160}
                  aria-label={t("store.suggest.q8Tool")}
                  value={currentApproachTool}
                  onChange={(e) => setCurrentApproachTool(e.target.value)}
                />
              </div>
            )}
            {currentApproach.includes("other") && (
              <input
                className="field-pearl mt-3 w-full rounded-xl px-3.5 py-2.5 text-sm"
                maxLength={160}
                placeholder={t("store.suggest.q8Other")}
                aria-label={t("store.suggest.q8Other")}
                value={currentApproachOther}
                onChange={(e) => setCurrentApproachOther(e.target.value)}
              />
            )}
          </Question>


          <Question
            n={9}
            title={t("store.suggest.q9")}
            hint={t("store.suggest.q9Hint")}
            badge={t("store.suggest.optional")}
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {PRICE_RANGES.map((key) => (
                <Chip key={key} active={priceRange === key} onClick={() => setPriceRange(key)}>
                  {t(`store.suggest.prices.${key}`)}
                </Chip>
              ))}
            </div>
          </Question>

          <Question n={10} title={t("store.suggest.q10")}>
            <div className="grid gap-2 sm:grid-cols-2">
              {TRIED_OPTIONS.map((key) => (
                <Chip key={key} active={tried === key} onClick={() => setTried(key)}>
                  {t(`store.suggest.tried.${key}`)}
                </Chip>
              ))}
            </div>
            {triedIsYes && (
              <div className="mt-3">
                <label className="mb-1.5 block text-xs text-muted-foreground">
                  {t("store.suggest.q10Detail")} · {t("store.suggest.optional")}
                </label>
                <textarea
                  className="field-pearl min-h-24 w-full rounded-xl px-3.5 py-2.5 text-sm"
                  maxLength={DETAIL_MAX}
                  value={triedDetail}
                  onChange={(e) => setTriedDetail(e.target.value)}
                />
              </div>
            )}
          </Question>

          <Question n={11} title={t("store.suggest.q11")} hint={t("store.suggest.q11Hint")}>
            <div className="flex flex-wrap gap-2">
              <Chip active={notify} onClick={() => setNotify(true)}>
                {t("store.suggest.yes")}
              </Chip>
              <Chip active={!notify} onClick={() => setNotify(false)}>
                {t("store.suggest.no")}
              </Chip>
            </div>
            {notify &&
              (session ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  {t("store.suggest.q11Account")}
                </p>
              ) : (
                <div className="mt-3">
                  <label className="mb-1.5 block text-xs text-muted-foreground">
                    {t("store.suggest.q11Email")} · {t("store.suggest.optional")}
                  </label>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    maxLength={255}
                    className="field-pearl w-full rounded-xl px-3.5 py-2.5 text-sm"
                    placeholder={t("store.suggest.q11EmailPlaceholder")}
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                  />
                </div>
              ))}
          </Question>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button type="submit" disabled={!canSubmit} className="btn-store text-sm disabled:opacity-50">
              {busy ? t("store.suggest.sending") : t("store.suggest.submit")}
            </button>
            <p className="text-xs text-muted-foreground">{t("store.suggest.privacy")}</p>
          </div>
        </form>
      </div>
    </StoreShell>
  );
}
