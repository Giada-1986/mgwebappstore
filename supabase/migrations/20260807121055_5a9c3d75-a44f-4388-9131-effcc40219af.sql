ALTER TABLE public.profiles DROP COLUMN IF EXISTS has_paid;
ALTER TABLE public.entitlements DROP CONSTRAINT IF EXISTS entitlements_user_product_env_key;
CREATE UNIQUE INDEX IF NOT EXISTS entitlements_user_product_env_uidx ON public.entitlements (user_id, product_id, environment);