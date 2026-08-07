-- 1) Products: non-destructive extension
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS access_mode text NOT NULL DEFAULT 'paid',
  ADD COLUMN IF NOT EXISTS badge text;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_access_mode_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_access_mode_check
  CHECK (access_mode IN ('paid', 'free_account', 'free_public'));

-- 2) Product assets
CREATE TABLE IF NOT EXISTS public.product_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  asset_type text NOT NULL DEFAULT 'file',
  storage_path text,
  external_url text,
  title text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_assets_type_check
    CHECK (asset_type IN ('file', 'pdf', 'image', 'template_url', 'app_route', 'external_url'))
);

CREATE INDEX IF NOT EXISTS product_assets_product_idx ON public.product_assets(product_id);

GRANT SELECT ON public.product_assets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_assets TO authenticated;
GRANT ALL ON public.product_assets TO service_role;

ALTER TABLE public.product_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins manage product assets" ON public.product_assets;
CREATE POLICY "admins manage product assets" ON public.product_assets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Entitled users may list the assets of products they actually own.
DROP POLICY IF EXISTS "entitled users read product assets" ON public.product_assets;
CREATE POLICY "entitled users read product assets" ON public.product_assets
  FOR SELECT TO authenticated
  USING (
    is_active AND EXISTS (
      SELECT 1 FROM public.entitlements e
      WHERE e.product_id = product_assets.product_id
        AND e.user_id = auth.uid()
        AND e.is_active
        AND e.revoked_at IS NULL
    )
  );

-- Explicitly public products only.
DROP POLICY IF EXISTS "public assets of free_public products" ON public.product_assets;
CREATE POLICY "public assets of free_public products" ON public.product_assets
  FOR SELECT TO anon, authenticated
  USING (
    is_active AND EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_assets.product_id
        AND p.access_mode = 'free_public'
        AND p.status = 'active'
    )
  );

DROP TRIGGER IF EXISTS trg_product_assets_updated ON public.product_assets;
CREATE TRIGGER trg_product_assets_updated
  BEFORE UPDATE ON public.product_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Bundle composition
CREATE TABLE IF NOT EXISTS public.bundle_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  included_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bundle_products_not_self CHECK (bundle_product_id <> included_product_id),
  CONSTRAINT bundle_products_unique UNIQUE (bundle_product_id, included_product_id)
);

CREATE INDEX IF NOT EXISTS bundle_products_bundle_idx ON public.bundle_products(bundle_product_id);

GRANT SELECT ON public.bundle_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bundle_products TO authenticated;
GRANT ALL ON public.bundle_products TO service_role;

ALTER TABLE public.bundle_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bundle contents are public" ON public.bundle_products;
CREATE POLICY "bundle contents are public" ON public.bundle_products
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admins manage bundle contents" ON public.bundle_products;
CREATE POLICY "admins manage bundle contents" ON public.bundle_products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));