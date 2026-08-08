ALTER TABLE public.purchase_emails
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS message_id text,
  ADD COLUMN IF NOT EXISTS locked_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

UPDATE public.purchase_emails
   SET status = CASE
     WHEN sent_at IS NOT NULL THEN 'sent'
     WHEN error IS NOT NULL THEN 'failed'
     ELSE 'pending'
   END;

ALTER TABLE public.purchase_emails
  DROP CONSTRAINT IF EXISTS purchase_emails_status_check;

ALTER TABLE public.purchase_emails
  ADD CONSTRAINT purchase_emails_status_check
  CHECK (status IN ('pending', 'sent', 'failed'));

DROP TRIGGER IF EXISTS trg_purchase_emails_updated ON public.purchase_emails;
CREATE TRIGGER trg_purchase_emails_updated
  BEFORE UPDATE ON public.purchase_emails
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();