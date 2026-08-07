import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { StoreShell } from "@/components/store/StoreShell";
import { useI18n } from "@/lib/i18n";
import { redeemGift } from "@/lib/gifts.functions";

export const Route = createFileRoute("/_authenticated/redeem/$token")({
  head: () => ({
    meta: [
      { title: "Riscatta il regalo — MINI WEB APPS" },
      {
        name: "description",
        content: "Riscatta il codice regalo e aggiungi la mini app alla tua libreria.",
      },
      { property: "og:title", content: "Riscatta il regalo — MINI WEB APPS" },
      { property: "og:description", content: "Un codice regalo, una singola mini app." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RedeemPage,
});

function RedeemPage() {
  const { t } = useI18n();
  const { token } = Route.useParams();
  const redeem = useServerFn(redeemGift);
  const [state, setState] = useState<
    { kind: "idle" } | { kind: "busy" } | { kind: "done"; slug: string | null } | { kind: "error"; reason: string }
  >({ kind: "idle" });

  const onRedeem = async () => {
    setState({ kind: "busy" });
    try {
      const res = await redeem({ data: { token } });
      if (res.ok) setState({ kind: "done", slug: res.productSlug });
      else setState({ kind: "error", reason: res.reason });
    } catch {
      setState({ kind: "error", reason: "error" });
    }
  };

  return (
    <StoreShell>
      <div className="mx-auto max-w-lg py-10">
        <h1 className="text-3xl font-semibold tracking-tight">{t("store.gift.title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("store.gift.intro")}</p>

        {state.kind === "done" ? (
          <div className="mt-8 space-y-4">
            <p>{t("store.gift.success")}</p>
            <Link to="/my-apps" className="btn-store inline-flex">
              {t("store.nav.myApps")}
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {state.kind === "error" && (
              <p className="text-destructive">{t(`store.gift.${state.reason}`)}</p>
            )}
            <button
              type="button"
              className="btn-store"
              disabled={state.kind === "busy"}
              onClick={onRedeem}
            >
              {t("store.gift.redeem")}
            </button>
          </div>
        )}
      </div>
    </StoreShell>
  );
}
