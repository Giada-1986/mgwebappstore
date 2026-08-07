-- 1) Store only a hash of the redemption token
ALTER TABLE public.gifts ADD COLUMN IF NOT EXISTS redemption_token_hash text;

UPDATE public.gifts
   SET redemption_token_hash = encode(digest(redemption_token, 'sha256'), 'hex')
 WHERE redemption_token_hash IS NULL AND redemption_token IS NOT NULL;

ALTER TABLE public.gifts DROP COLUMN redemption_token;
ALTER TABLE public.gifts ALTER COLUMN redemption_token_hash SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS gifts_redemption_token_hash_key
  ON public.gifts (redemption_token_hash);

-- 2) Redemption RPC now works on the hash only, and is server-only
DROP FUNCTION IF EXISTS public.redeem_gift(text, uuid);

CREATE OR REPLACE FUNCTION public.redeem_gift(_token_hash text, _user_id uuid, _environment text)
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

  IF _token_hash IS NULL OR length(_token_hash) <> 64 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_token');
  END IF;

  -- Atomic: the row is locked for the whole transaction.
  SELECT * INTO g FROM public.gifts
   WHERE redemption_token_hash = _token_hash
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_token');
  END IF;

  IF g.environment IS DISTINCT FROM _environment THEN
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

  -- Entitlement strictly for the gift's own product, environment and redeemer.
  INSERT INTO public.entitlements (user_id, product_id, access_type, is_active, source, environment)
  VALUES (_user_id, g.product_id, 'lifetime', true, 'gift', g.environment)
  ON CONFLICT (user_id, product_id, environment)
  DO UPDATE SET is_active = true, revoked_at = NULL, updated_at = now();

  UPDATE public.gifts
     SET status = 'redeemed',
         redeemed_at = now(),
         redeemed_by_user_id = _user_id,
         -- the token is definitively invalidated: its hash can never match again
         redemption_token_hash = 'redeemed:' || g.id::text,
         updated_at = now()
   WHERE id = g.id
     AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_redeemed');
  END IF;

  SELECT slug INTO p_slug FROM public.products WHERE id = g.product_id;

  RETURN jsonb_build_object('ok', true, 'product_id', g.product_id, 'product_slug', p_slug);
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_gift(text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_gift(text, uuid, text) TO service_role;

-- 3) Explicit admin-only write policies (clients still cannot write)
DROP POLICY IF EXISTS "admins manage gifts" ON public.gifts;
CREATE POLICY "admins manage gifts" ON public.gifts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "admins manage campaigns" ON public.marketing_campaigns;
CREATE POLICY "admins manage campaigns" ON public.marketing_campaigns
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

GRANT ALL ON public.gifts TO service_role;
GRANT ALL ON public.marketing_campaigns TO service_role;