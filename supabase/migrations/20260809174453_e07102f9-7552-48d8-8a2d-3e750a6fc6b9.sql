CREATE POLICY "owners can see their paused products"
ON public.products
FOR SELECT
TO authenticated
USING (
  status = 'paused'
  AND EXISTS (
    SELECT 1 FROM public.entitlements e
    WHERE e.product_id = products.id
      AND e.user_id = auth.uid()
      AND e.is_active
      AND e.revoked_at IS NULL
  )
);