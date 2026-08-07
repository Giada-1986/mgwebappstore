ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'sandbox';
ALTER TABLE public.entitlements ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'sandbox';

ALTER TABLE public.purchases DROP CONSTRAINT IF EXISTS purchases_environment_check;
ALTER TABLE public.purchases ADD CONSTRAINT purchases_environment_check CHECK (environment IN ('sandbox','live'));
ALTER TABLE public.entitlements DROP CONSTRAINT IF EXISTS entitlements_environment_check;
ALTER TABLE public.entitlements ADD CONSTRAINT entitlements_environment_check CHECK (environment IN ('sandbox','live'));

ALTER TABLE public.entitlements DROP CONSTRAINT IF EXISTS entitlements_unique_user_product;
ALTER TABLE public.entitlements DROP CONSTRAINT IF EXISTS entitlements_unique_user_product_env;
ALTER TABLE public.entitlements ADD CONSTRAINT entitlements_unique_user_product_env UNIQUE (user_id, product_id, environment);

CREATE UNIQUE INDEX IF NOT EXISTS purchases_stripe_session_unique ON public.purchases(stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.has_product_access(_user_id uuid, _slug text, _env text DEFAULT 'sandbox')
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.entitlements e
    JOIN public.products p ON p.id = e.product_id
    WHERE e.user_id = _user_id AND p.slug = _slug AND e.is_active AND e.revoked_at IS NULL
      AND e.environment = _env
  );
$$;