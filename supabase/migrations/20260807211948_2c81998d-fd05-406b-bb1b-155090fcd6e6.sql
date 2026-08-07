ALTER TABLE public.products ADD COLUMN IF NOT EXISTS app_url text;

CREATE UNIQUE INDEX IF NOT EXISTS products_slug_key ON public.products (slug);

-- Only admins may write the catalog. Public read policy is unchanged, so
-- draft/hidden products stay invisible to anon and normal users.
DROP POLICY IF EXISTS "admins manage products" ON public.products;
CREATE POLICY "admins manage products"
  ON public.products FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;