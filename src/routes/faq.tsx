import { createFileRoute, Link } from "@tanstack/react-router";
import { StoreShell } from "@/components/store/StoreShell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "Domande frequenti — Mini Web Apps" },
      {
        name: "description",
        content:
          "FAQ dello store MINI WEB APPS: account, acquisti una tantum, prodotti gratuiti, regali, pagamenti Stripe, assistenza e privacy.",
      },
      { property: "og:title", content: "Domande frequenti — Mini Web Apps" },
      {
        property: "og:description",
        content: "Risposte rapide su account, acquisti, regali, pagamenti e assistenza.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FaqPage,
});

function FaqPage() {
  const { t, dict } = useI18n();
  const faq = dict.store.faq;

  return (
    <StoreShell>
      <section className="mx-auto max-w-3xl">
        <header className="mb-10">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
            {t("store.faq.nav")}
          </p>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl">{t("store.faq.title")}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{t("store.faq.intro")}</p>
        </header>

        <div className="space-y-10">
          {faq.groups.map((group) => (
            <div key={group.title}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-foreground/80">
                {group.title}
              </h2>
              <div className="card-store divide-y divide-border/60 overflow-hidden">
                {group.items.map((item) => (
                  <details key={item.q} className="group px-5">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                      <span>{item.q}</span>
                      <span
                        aria-hidden
                        className="shrink-0 text-lg leading-none text-primary transition-transform duration-200 group-open:rotate-45"
                      >
                        +
                      </span>
                    </summary>
                    <p className="pb-5 pr-8 text-sm leading-relaxed text-muted-foreground">
                      {item.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="card-store mt-12 p-6 sm:p-8">
          <h2 className="font-display text-2xl">{t("store.faq.contactTitle")}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {t("store.faq.contactText")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/account" className="btn-store text-sm">
              {t("store.faq.contactAccount")}
            </Link>
            <Link to="/apps" className="btn-store-ghost text-sm">
              {t("store.faq.contactCatalog")}
            </Link>
          </div>
          <p className="mt-6 text-xs text-muted-foreground">{t("store.faq.legalNote")}</p>
        </div>
      </section>
    </StoreShell>
  );
}
