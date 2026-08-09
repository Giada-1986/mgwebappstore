import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { formatPrice } from "@/lib/platform";
import { listMyPurchases, getPurchaseReceiptUrl, type MyPurchase } from "@/lib/purchases.functions";

/** Customer purchase history — server-scoped to the authenticated account. */
export function MyPurchases() {
  const { t, lang } = useI18n();
  const fetchPurchases = useServerFn(listMyPurchases);
  const { data, isLoading } = useQuery({
    queryKey: ["my-purchases"],
    queryFn: () => fetchPurchases({ data: undefined }),
    staleTime: 30_000,
  });

  return (
    <section className="card-store mt-5 p-7">
      <h2 className="text-lg font-semibold">{t("store.myPurchases.title")}</h2>
      {isLoading ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : (data ?? []).length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t("store.noPurchases")}</p>
      ) : (
        <ul className="mt-5 space-y-4">
          {(data ?? []).map((p) => (
            <PurchaseRow key={p.id} purchase={p} lang={lang} />
          ))}
        </ul>
      )}
    </section>
  );
}

function PurchaseRow({ purchase, lang }: { purchase: MyPurchase; lang: string }) {
  const { t } = useI18n();
  const fetchReceipt = useServerFn(getPurchaseReceiptUrl);
  const [receiptState, setReceiptState] = useState<"idle" | "loading" | "error">("idle");

  const refunded = purchase.status === "refunded";
  const name =
    (lang === "en" ? purchase.productNameEn : purchase.productNameIt) ?? purchase.productSlug ?? "—";
  const target = purchase.appPath ?? purchase.appUrl;
  const external = !purchase.appPath && !!purchase.appUrl;
  const date = purchase.purchasedAt ?? purchase.createdAt;

  async function openReceipt() {
    setReceiptState("loading");
    const res = await fetchReceipt({ data: { purchaseId: purchase.id } });
    if ("url" in res) {
      setReceiptState("idle");
      window.open(res.url, "_blank", "noopener,noreferrer");
    } else {
      setReceiptState("error");
    }
  }

  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-border p-4 sm:flex-row sm:items-center">
      {purchase.productImageUrl ? (
        <img
          src={purchase.productImageUrl}
          alt={name}
          loading="lazy"
          className="h-16 w-16 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div className="h-16 w-16 shrink-0 rounded-xl bg-muted" aria-hidden />
      )}

      <div className="min-w-0 flex-1">
        <p translate="no" className="notranslate font-medium">
          {name}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("store.myPurchases.date")}:{" "}
          {new Date(date).toLocaleDateString(lang === "en" ? "en-IE" : "it-IT")} ·{" "}
          {purchase.amountPaid != null
            ? formatPrice(purchase.amountPaid, purchase.currency, lang as never)
            : "—"}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`rounded-full px-3 py-1 font-medium ${
              refunded
                ? "bg-muted text-muted-foreground"
                : "border border-primary/40 bg-primary/10 text-primary"
            }`}
          >
            {refunded ? t("store.myPurchases.refunded") : t("store.myPurchases.paid")}
          </span>
          {purchase.hasAccess ? (
            <span className="rounded-full border border-border px-3 py-1 text-muted-foreground">
              {t("store.myPurchases.lifetime")}
            </span>
          ) : (
            <span className="rounded-full border border-border px-3 py-1 text-muted-foreground">
              {t("store.myPurchases.accessRevoked")}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        {purchase.hasAccess && target ? (
          <a
            href={target}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="btn-store px-4 py-1.5 text-sm"
          >
            {t("store.myPurchases.openApp")}
          </a>
        ) : null}
        {purchase.receiptAvailable ? (
          <button
            type="button"
            onClick={openReceipt}
            disabled={receiptState === "loading"}
            className="btn-store-ghost px-4 py-1.5 text-sm"
          >
            {receiptState === "loading" ? t("common.loading") : t("store.myPurchases.receipt")}
          </button>
        ) : null}
        {receiptState === "error" ? (
          <p className="text-xs text-muted-foreground">
            {t("store.myPurchases.receiptUnavailable")}
          </p>
        ) : null}
      </div>
    </li>
  );
}
