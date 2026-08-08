import { useEffect } from "react";
import { useI18n, isLang, type Lang } from "@/lib/i18n";
import { useProfile, useSession, useUpdateProfile } from "@/lib/platform";

/**
 * Keeps the chosen language in sync with the account, so it survives
 * a new login on any device. Local explicit choices always win.
 */
export function LanguagePersistence() {
  const { lang, applyRemoteLang, hasExplicitChoice } = useI18n();
  const { session } = useSession();
  const { data: profile } = useProfile(session?.user.id);
  const updateProfile = useUpdateProfile(session?.user.id);

  const remote = profile?.preferred_language as Lang | undefined;

  useEffect(() => {
    if (!profile) return;
    if (!hasExplicitChoice && isLang(remote) && remote !== lang) {
      applyRemoteLang(remote);
      return;
    }
    if (remote !== lang) updateProfile({ preferred_language: lang });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, remote, lang, hasExplicitChoice]);

  return null;
}


  return null;
}
