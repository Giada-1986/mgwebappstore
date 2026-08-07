CREATE TABLE public.gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id),
  purchaser_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  purchaser_email text,
  recipient_email text NOT NULL,
  gift_message text,
  redemption_token text NOT NULL UNIQUE,
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text,
  amount_paid numeric,
  currency text NOT NULL DEFAULT 'EUR',
  environment text NOT NULL DEFAULT 'sandbox',
  status text NOT NULL DEFAULT 'pending',
  purchased_at timestamptz,
  expires_at timestamptz,
  redeemed_at timestamptz,
  redeemed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gifts_status_check CHECK (status IN ('pending','redeemed','refunded','cancelled')),
  CONSTRAINT gifts_environment_check CHECK (environment IN ('sandbox','live')),
  CONSTRAINT gifts_redeemed_consistency CHECK (
    (status = 'redeemed' AND redeemed_by_user_id IS NOT NULL AND redeemed_at IS NOT NULL)
    OR (status <> 'redeemed' AND redeemed_by_user_id IS NULL)
  )
);

CREATE INDEX idx_gifts_product ON public.gifts(product_id);
CREATE INDEX idx_gifts_purchaser ON public.gifts(purchaser_user_id);
CREATE INDEX idx_gifts_recipient_user ON public.gifts(redeemed_by_user_id);
CREATE INDEX idx_gifts_status_env ON public.gifts(status, environment);

GRANT SELECT ON public.gifts TO authenticated;
GRANT ALL ON public.gifts TO service_role;

ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "purchaser can view own gifts"
  ON public.gifts FOR SELECT TO authenticated
  USING (auth.uid() = purchaser_user_id);

CREATE POLICY "redeemer can view redeemed gift"
  ON public.gifts FOR SELECT TO authenticated
  USING (auth.uid() = redeemed_by_user_id);

CREATE TRIGGER trg_gifts_updated
  BEFORE UPDATE ON public.gifts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Atomic, single-use redemption. Grants ONLY the entitlement for gift.product_id
-- in the gift's own environment. No global flag, no cross-product access.
CREATE OR REPLACE FUNCTION public.redeem_gift(_token text, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g public.gifts%ROWTYPE;
  p_slug text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  END IF;

  SELECT * INTO g FROM public.gifts
   WHERE redemption_token = _token
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_token');
  END IF;

  IF g.status = 'redeemed' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_redeemed');
  END IF;

  IF g.status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'reason', g.status);
  END IF;

  IF g.purchased_at IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_paid');
  END IF;

  IF g.expires_at IS NOT NULL AND g.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  INSERT INTO public.entitlements (user_id, product_id, access_type, is_active, source, environment)
  VALUES (_user_id, g.product_id, 'lifetime', true, 'gift', g.environment)
  ON CONFLICT (user_id, product_id, environment)
  DO UPDATE SET is_active = true, revoked_at = NULL, updated_at = now();

  UPDATE public.gifts
     SET status = 'redeemed',
         redeemed_at = now(),
         redeemed_by_user_id = _user_id,
         updated_at = now()
   WHERE id = g.id;

  SELECT slug INTO p_slug FROM public.products WHERE id = g.product_id;

  RETURN jsonb_build_object('ok', true, 'product_id', g.product_id, 'product_slug', p_slug);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.redeem_gift(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_gift(text, uuid) TO service_role;