REVOKE EXECUTE ON FUNCTION public.redeem_gift(text, uuid, text) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.redeem_gift(text, uuid, text) TO service_role;