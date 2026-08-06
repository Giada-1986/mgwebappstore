import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SakuraCorners, SakuraDivider } from "@/components/Sakura";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fame o Fame? — Riconosci la fame emotiva" },
      {
        name: "description",
        content:
          "App gentile per distinguere fame fisica e fame emotiva: check-in guidati, micro-esercizi e report personali. Pagamento unico, accesso a vita.",
      },
      { property: "og:title", content: "Fame o Fame? — Riconosci la fame emotiva" },
      {
        property: "og:description",
        content: "Non tutta la fame viene dallo stomaco. Check-in guidati, esercizi brevi e report personali.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useI18n();
  const features = [
    { title: t("landing.f1Title"), text: t("landing.f1Text") },
    { title: t("landing.f2Title"), text: t("landing.f2Text") },
    { title: t("landing.f3Title"), text: t("landing.f3Text") },
  ];

  return (
    <div className="relative min-h-screen">
      <SakuraCorners />
      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-3">
          <Logo priority className="h-14 w-14 shadow-[var(--shadow-gold)]" />
          <div className="leading-tight">
            <p className="font-display text-xl">{t("brand")}</p>
            <p className="text-xs text-muted-foreground">{t("tagline")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link
            to="/auth"
            className="hidden rounded-full border border-gold/50 px-4 py-1.5 text-sm text-foreground transition-colors hover:bg-gold/10 sm:inline-flex"
          >
            {t("landing.login")}
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-5 pb-20 text-center">
        <section className="pt-10">
          <h1 className="font-display text-4xl leading-tight sm:text-5xl">{t("landing.heroTitle")}</h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">{t("landing.heroText")}</p>
          <Link
            to="/auth"
            className="mt-8 inline-flex items-center justify-center rounded-full bg-[image:var(--gradient-gold)] px-8 py-3 text-base font-medium text-primary-foreground shadow-[var(--shadow-gold)] transition-transform hover:-translate-y-0.5"
          >
            {t("landing.cta")}
          </Link>
          <p className="mt-4 text-xs tracking-wide text-muted-foreground">{t("landing.noScales")}</p>
        </section>

        <SakuraDivider />

        <section className="grid gap-4 sm:grid-cols-3">
          {features.map((f) => (
            <article key={f.title} className="card-pearl p-6 text-left">
              <h2 className="font-display text-xl">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
            </article>
          ))}
        </section>

        <SakuraDivider />

        <section className="card-pearl mx-auto max-w-xl p-8">
          <h2 className="font-display text-2xl">{t("landing.priceTitle")}</h2>
          <p className="mt-3 text-sm text-muted-foreground">{t("landing.priceText")}</p>
          <Link
            to="/auth"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-[image:var(--gradient-gold)] px-7 py-2.5 text-sm font-medium text-primary-foreground shadow-[var(--shadow-gold)]"
          >
            {t("landing.cta")}
          </Link>
        </section>
      </main>
    </div>
  );
}
