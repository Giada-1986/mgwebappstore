CREATE TABLE public.suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  solution_type text NOT NULL,
  solution_type_other text,
  goal text NOT NULL,
  problem text,
  audience text[] NOT NULL DEFAULT '{}',
  audience_other text,
  frequency text,
  formats text[] NOT NULL DEFAULT '{}',
  importance integer NOT NULL DEFAULT 3,
  purchase_interest text,
  price_range text,
  tried text,
  tried_detail text,
  notify boolean NOT NULL DEFAULT false,
  notify_email text,
  language text NOT NULL DEFAULT 'it',
  status text NOT NULL DEFAULT 'new',
  admin_note text,
  submitter_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT suggestions_importance_range CHECK (importance BETWEEN 1 AND 5),
  CONSTRAINT suggestions_status_valid CHECK (status IN ('new','interesting','explore','evaluating','building','done','archived'))
);

CREATE INDEX suggestions_created_at_idx ON public.suggestions (created_at DESC);
CREATE INDEX suggestions_status_idx ON public.suggestions (status);
CREATE INDEX suggestions_type_idx ON public.suggestions (solution_type);
CREATE INDEX suggestions_hash_idx ON public.suggestions (submitter_hash, created_at DESC);

GRANT SELECT, UPDATE, DELETE ON public.suggestions TO authenticated;
GRANT ALL ON public.suggestions TO service_role;

ALTER TABLE public.suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read suggestions" ON public.suggestions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins update suggestions" ON public.suggestions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins delete suggestions" ON public.suggestions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_suggestions_updated
  BEFORE UPDATE ON public.suggestions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();