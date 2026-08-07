-- ============ CATEGORIES ============
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_it text NOT NULL,
  name_en text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories are public" ON public.categories FOR SELECT TO anon, authenticated USING (true);

-- ============ PRODUCTS ============
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_it text NOT NULL,
  name_en text NOT NULL,
  short_description_it text NOT NULL DEFAULT '',
  short_description_en text NOT NULL DEFAULT '',
  description_it text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url text,
  accent_color text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  stripe_price_id text,
  product_type text NOT NULL DEFAULT 'mini_app',
  status text NOT NULL DEFAULT 'draft',
  app_path text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_status_check CHECK (status IN ('draft','active','coming_soon','archived')),
  CONSTRAINT products_type_check CHECK (product_type IN ('mini_app','premium_app','professional_app'))
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active products are public" ON public.products FOR SELECT TO anon, authenticated
  USING (status IN ('active','coming_soon'));

-- ============ PURCHASES ============
CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text,
  amount_paid numeric(10,2),
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'pending',
  purchased_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchases_status_check CHECK (status IN ('pending','paid','refunded','cancelled','failed'))
);
CREATE INDEX idx_purchases_user ON public.purchases(user_id);
GRANT SELECT ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own purchases select" ON public.purchases FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ ENTITLEMENTS ============
CREATE TABLE public.entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  access_type text NOT NULL DEFAULT 'lifetime',
  is_active boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'purchase',
  purchase_id uuid REFERENCES public.purchases(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entitlements_unique_user_product UNIQUE (user_id, product_id),
  CONSTRAINT entitlements_access_type_check CHECK (access_type IN ('lifetime','subscription','trial','grant'))
);
CREATE INDEX idx_entitlements_user ON public.entitlements(user_id);
GRANT SELECT ON public.entitlements TO authenticated;
GRANT ALL ON public.entitlements TO service_role;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own entitlements select" ON public.entitlements FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ============ USER PRODUCT STATE ============
CREATE TABLE public.user_product_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  onboarding_completed boolean NOT NULL DEFAULT false,
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ups_unique_user_product UNIQUE (user_id, product_id)
);
CREATE INDEX idx_ups_user ON public.user_product_state(user_id);
GRANT SELECT, INSERT, UPDATE ON public.user_product_state TO authenticated;
GRANT ALL ON public.user_product_state TO service_role;
ALTER TABLE public.user_product_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own product state select" ON public.user_product_state FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own product state insert" ON public.user_product_state FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own product state update" ON public.user_product_state FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ PROFILES ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'it',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
UPDATE public.profiles SET preferred_language = COALESCE(language, 'it');

-- ============ UPDATED_AT TRIGGER ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated;

CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_purchases_updated BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_entitlements_updated BEFORE UPDATE ON public.entitlements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ups_updated BEFORE UPDATE ON public.user_product_state FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ ACCESS HELPER ============
CREATE OR REPLACE FUNCTION public.has_product_access(_user_id uuid, _slug text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.entitlements e
    JOIN public.products p ON p.id = e.product_id
    WHERE e.user_id = _user_id AND p.slug = _slug AND e.is_active AND e.revoked_at IS NULL
  );
$$;
REVOKE EXECUTE ON FUNCTION public.has_product_access(uuid, text) FROM anon;

-- ============ SEED: CATEGORIES + FIRST PRODUCT ============
INSERT INTO public.categories (slug, name_it, name_en, sort_order) VALUES
  ('benessere','Benessere','Wellbeing',1),
  ('casa','Casa','Home',2),
  ('famiglia','Famiglia','Family',3),
  ('organizzazione','Organizzazione','Organisation',4),
  ('studio','Studio','Study',5),
  ('lavoro','Lavoro','Work',6),
  ('social','Social','Social',7),
  ('viaggi','Viaggi','Travel',8),
  ('vita-quotidiana','Vita quotidiana','Everyday life',9);

INSERT INTO public.products (
  slug, name_it, name_en, short_description_it, short_description_en,
  description_it, description_en, category_id, price, currency, stripe_price_id,
  product_type, status, app_path, accent_color, sort_order
) VALUES (
  'fame-o-fame',
  'Fame o Fame?',
  'Hungry, or Hungry?',
  'Distingui la fame fisica da quella emotiva, con gentilezza.',
  'Tell physical hunger from emotional hunger, gently.',
  'Un check-in di un minuto, dieci micro-esercizi e report personali per capire quando e perché arriva la fame emotiva. Nessuna caloria, nessuna bilancia.',
  'A one-minute check-in, ten micro-exercises and personal reports to understand when and why emotional hunger shows up. No calories, no scales.',
  (SELECT id FROM public.categories WHERE slug = 'benessere'),
  9.90, 'EUR', 'lifetime_onetime', 'mini_app', 'active', '/app/fame-o-fame', 'sakura', 1
);

-- ============ MIGRATE EXISTING TEST ACCESS ============
INSERT INTO public.entitlements (user_id, product_id, access_type, source, granted_at)
SELECT pr.id, p.id, 'lifetime', 'migration', now()
FROM public.profiles pr
CROSS JOIN public.products p
WHERE p.slug = 'fame-o-fame' AND pr.has_paid = true
ON CONFLICT (user_id, product_id) DO NOTHING;

INSERT INTO public.user_product_state (user_id, product_id, onboarding_completed)
SELECT pr.id, p.id, COALESCE(pr.onboarding_done, false)
FROM public.profiles pr
CROSS JOIN public.products p
WHERE p.slug = 'fame-o-fame' AND pr.onboarding_done = true
ON CONFLICT (user_id, product_id) DO NOTHING;

COMMENT ON COLUMN public.profiles.has_paid IS 'DEPRECATED: replaced by entitlements. Kept temporarily for rollback safety.';