CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- Trusted backend roles keep full lookup capability.
  IF current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
  END IF;

  -- End users may only ask about themselves (this is all RLS policies need).
  IF _user_id IS NULL OR auth.uid() IS NULL OR _user_id <> auth.uid() THEN
    RETURN false;
  END IF;

  RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = _role);
END;
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.has_product_access(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_product_access(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.redeem_gift(text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile_columns() FROM PUBLIC, anon, authenticated;