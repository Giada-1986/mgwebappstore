-- 1) Column-level privileges: authenticated may only update safe self-service columns
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, preferred_language, language, onboarding_done, triggers, trigger_other) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 2) Defense in depth: reject protected column changes for non-privileged roles
CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('role', true) IN ('service_role', 'postgres')
     OR current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email
     OR NEW.marketing_consent IS DISTINCT FROM OLD.marketing_consent
     OR NEW.marketing_consent_at IS DISTINCT FROM OLD.marketing_consent_at
     OR NEW.marketing_language IS DISTINCT FROM OLD.marketing_language
     OR NEW.brevo_synced_at IS DISTINCT FROM OLD.brevo_synced_at THEN
    RAISE EXCEPTION 'Protected profile columns can only be modified by the server';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_protect_columns ON public.profiles;
CREATE TRIGGER trg_profiles_protect_columns
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_columns();