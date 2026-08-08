ALTER TABLE public.gifts
  ADD COLUMN IF NOT EXISTS email_last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_last_message_id text;