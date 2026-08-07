REVOKE EXECUTE ON FUNCTION public.has_product_access(uuid, text) FROM anon, authenticated, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_product_access(uuid, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, PUBLIC;