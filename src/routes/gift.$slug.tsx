import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { StoreShell } from "@/components/store/StoreShell";
import { GiftEmbeddedCheckout } from "@/components/store/GiftEmbeddedCheckout";
import { useI18n } from "@/lib/i18n";
import { formatPrice, productName, useProduct } from "@/lib/platform";

export const Route = createFileRoute("/gift/$slug")({
  head: () => ({
    meta: [
      { title: "Regala questa app — Mini Web Apps" },
      {
        name: "description",
        content: "Regala una singola mini app: il destinatario la sblocca con un codice.",
      },
      { property: "og:title", content: "Regala questa app — Mini Web Apps" },
      { property: "og:description", content: "Un regalo, una sola app, accesso a vita." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GiftPage,
});

function GiftPage() {
  const { slug } = Route.useParams();
  const { t, lang } = useI18n();
  const { data: product } = useProduct(slug);

  const [recipientEmail, setRecipientEmail] = useState("");
  const [purchaserEmail, setPurchaserEmail] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [confirmed, setConfirmed] = useState<null | {
    recipientEmail: string;
    purchaserEmail: string;
    giftMessage: string;
  }>(null);

  const returnUrl =
    typeof window !== "undefined" ? `${window.location.origin}/gift/${slug}?done=1` : "";

  return (
    <StoreShell>
      <Link
        to="/apps/$slug"
        params={{ slug }}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← {t("store.checkoutBack")}
      </Link>

      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{t("store.gift.buyTitle")}</h1>
      <p className="mt-2 text-muted-foreground">
        {product ? productName(product, lang) : null}
        {product ? ` — ${formatPrice(Number(product.price), product.currency, lang)}` : null}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{t("store.gift.buyIntro")}</p>

      {!confirmed ? (
        <form
          className="panel-pearl mt-6 space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            setConfirmed({ recipientEmail, purchaserEmail, giftMessage });
          }}
        >
          <label className="block text-sm">
            {t("store.gift.recipientEmail")}
            <input
              type="email"
              required
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            {t("store.gift.purchaserEmail")}
            <input
              type="email"
              value={purchaserEmail}
              onChange={(e) => setPurchaserEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            {t("store.gift.message")}
            <textarea
              maxLength={500}
              value={giftMessage}
              onChange={(e) => setGiftMessage(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              rows={3}
            />
          </label>
          <button type="submit" className="btn-store">
            {t("store.gift.continue")}
          </button>
        </form>
      ) : (
        <div className="panel-pearl mt-6 overflow-hidden p-3">
          {returnUrl && (
            <GiftEmbeddedCheckout
              productSlug={slug}
              recipientEmail={confirmed.recipientEmail}
              purchaserEmail={confirmed.purchaserEmail}
              giftMessage={confirmed.giftMessage}
              returnUrl={returnUrl}
            />
          )}
        </div>
      )}
    </StoreShell>
  );
}
