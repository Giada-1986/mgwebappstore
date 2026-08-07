ALTER TABLE public.gifts DROP CONSTRAINT gifts_redeemed_consistency;

ALTER TABLE public.gifts ADD CONSTRAINT gifts_redeemed_consistency CHECK (
  (status = 'redeemed' AND redeemed_by_user_id IS NOT NULL AND redeemed_at IS NOT NULL)
  OR (status IN ('pending','cancelled') AND redeemed_by_user_id IS NULL)
  OR (status = 'refunded')
);