ALTER TABLE public.gifts
  ADD COLUMN IF NOT EXISTS redemption_token_encrypted text,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_error text,
  ADD COLUMN IF NOT EXISTS email_attempts integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_gifts_recipient_email_status
  ON public.gifts (lower(recipient_email), status, environment);