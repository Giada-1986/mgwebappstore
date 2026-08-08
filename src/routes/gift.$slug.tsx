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

  // A retired product can never be gifted (the server refuses it as well).
  if (product && product.status === "archived") {
    return (
      <StoreShell>
        <p className="text-muted-foreground">{t("store.notFound")}</p>
      </StoreShell>
    );
  }

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
          className="panel-pearl mt-6 space-y-5 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            setConfirmed({ recipientEmail, purchaserEmail, giftMessage });
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="gift-recipient" className="block text-sm font-medium">
              {t("store.gift.recipientEmail")}
            </label>
            <input
              id="gift-recipient"
              type="email"
              required
              autoComplete="email"
              placeholder={t("store.gift.recipientPlaceholder")}
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              className="field-pearl"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="gift-purchaser" className="block text-sm font-medium">
              {t("store.gift.purchaserEmail")}
            </label>
            <input
              id="gift-purchaser"
              type="email"
              autoComplete="email"
              placeholder={t("store.gift.purchaserPlaceholder")}
              value={purchaserEmail}
              onChange={(e) => setPurchaserEmail(e.target.value)}
              className="field-pearl"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="gift-message" className="block text-sm font-medium">
              {t("store.gift.message")}
            </label>
            <p className="text-xs opacity-70">{t("store.gift.messageHelp")}</p>
            <textarea
              id="gift-message"
              maxLength={500}
              rows={4}
              placeholder={t("store.gift.messagePlaceholder")}
              value={giftMessage}
              onChange={(e) => setGiftMessage(e.target.value)}
              className="field-pearl resize-y whitespace-pre-wrap"
            />
            <p className="text-right text-xs tabular-nums opacity-60" aria-live="polite">
              {giftMessage.length} / 500
            </p>
          </div>
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
