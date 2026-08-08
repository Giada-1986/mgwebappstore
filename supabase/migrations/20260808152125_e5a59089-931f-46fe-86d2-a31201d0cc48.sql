CREATE TABLE public.purchase_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  environment text NOT NULL,
  recipient_email text NOT NULL,
  sent_at timestamptz,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.purchase_emails TO service_role;

ALTER TABLE public.purchase_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages purchase emails"
  ON public.purchase_emails FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');