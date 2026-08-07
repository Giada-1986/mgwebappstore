import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { StoreShell } from "@/components/store/StoreShell";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import { setMarketingConsent } from "@/lib/marketing.functions";
import { track } from "@/lib/analytics";
import {
  formatPrice,
  productName,
  useProducts,
  useProfile,
  usePurchases,
  useSession,
} from "@/lib/platform";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Account — Mini Apps Store" },
      { name: "description", content: "Gestisci il tuo account, la lingua e i tuoi acquisti." },
      { property: "og:title", content: "Account — Mini Apps Store" },
      { property: "og:description", content: "Il tuo account dello store." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { t, lang } = useI18n();
  const { session } = useSession();
  const { data: profile } = useProfile(session?.user.id);
  const { data: purchases } = usePurchases(session?.user.id);
  const { data: products } = useProducts();

  return (
    <StoreShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t("store.accountTitle")}</h1>

      <section className="card-store mt-7 space-y-5 p-7">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {t("store.email")}
          </p>
          <p className="mt-1">{profile?.email ?? session?.user.email}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {t("store.language")}
          </p>
          <LanguageSwitcher className="mt-2" />
        </div>
      </section>

      <section className="card-store mt-5 p-7">
        <h2 className="text-lg font-semibold">{t("store.purchases")}</h2>
        {(purchases ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("store.noPurchases")}</p>
        ) : (
          <ul className="mt-4 divide-y divide-border text-sm">
            {(purchases ?? []).map((p) => {
              const product = products?.find((x) => x.id === p.product_id);
              return (
                <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                  <span>{product ? productName(product, lang) : p.product_id}</span>
                  <span className="text-muted-foreground">
                    {p.amount_paid != null
                      ? formatPrice(Number(p.amount_paid), p.currency, lang)
                      : "—"}{" "}
                    · {p.status}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </StoreShell>
  );
}
