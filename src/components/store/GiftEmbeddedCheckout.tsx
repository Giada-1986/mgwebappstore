import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import { createGiftCheckoutSession } from "@/lib/gifts.functions";

/**
 * Gift checkout. The buyer may be anonymous: no entitlement is ever created
 * for them — the webhook only marks the gift as paid.
 */
export function GiftEmbeddedCheckout({
  productSlug,
  recipientEmail,
  purchaserEmail,
  giftMessage,
  returnUrl,
}: {
  productSlug: string;
  recipientEmail: string;
  purchaserEmail?: string;
  giftMessage?: string;
  returnUrl: string;
}) {
  const fetchClientSecret = async (): Promise<string> => {
    const result = await createGiftCheckoutSession({
      data: {
        productSlug,
        recipientEmail,
        ...(purchaserEmail ? { purchaserEmail } : {}),
        ...(giftMessage ? { giftMessage } : {}),
        returnUrl,
      },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Stripe did not return a client secret");
    return result.clientSecret;
  };

  return (
    <div id="gift-checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
