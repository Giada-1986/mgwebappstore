import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import { createProductCheckoutSession } from "@/utils/payments.functions";

export function StripeEmbeddedCheckout({
  productSlug,
  returnUrl,
}: {
  productSlug: string;
  returnUrl: string;
}) {
  const fetchClientSecret = async (): Promise<string> => {
    const result = await createProductCheckoutSession({
      data: { productSlug, returnUrl },
    });
    if ("error" in result) throw new Error(result.error);
    if (!result.clientSecret) throw new Error("Stripe did not return a client secret");
    return result.clientSecret;
  };

  return (
    <div id="checkout">
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
