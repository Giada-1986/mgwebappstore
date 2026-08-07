DROP INDEX IF EXISTS public.purchases_stripe_session_unique;
ALTER TABLE public.purchases DROP CONSTRAINT IF EXISTS purchases_stripe_session_unique;
ALTER TABLE public.purchases ADD CONSTRAINT purchases_stripe_session_unique UNIQUE (stripe_checkout_session_id);