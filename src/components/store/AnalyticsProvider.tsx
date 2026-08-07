import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { identifyUser, initAnalytics, resetAnalytics, track, trackPageView } from "@/lib/analytics";
import { setMarketingConsent } from "@/lib/marketing.functions";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/platform";

export const PENDING_CONSENT_KEY = "mwa.pendingMarketingConsent";

/**
 * Boots product analytics, binds events to the internal user id and applies a
 * marketing consent captured at signup once the session finally exists
 * (double opt-in flows create the session only after email confirmation).
 */
export function AnalyticsProvider() {
  const { session } = useSession();
  const { lang } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lastPath = useRef<string | null>(null);
  const identified = useRef<string | null>(null);

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    trackPageView(pathname);
    if (pathname === "/" || pathname.startsWith("/apps")) track("store_viewed", { path: pathname });
  }, [pathname]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) {
      if (identified.current) {
        resetAnalytics();
        identified.current = null;
      }
      return;
    }
    if (identified.current === userId) return;
    identified.current = userId;
    identifyUser(userId, { language: lang });

    if (typeof window === "undefined") return;
    const pending = window.localStorage.getItem(PENDING_CONSENT_KEY);
    if (pending === "true") {
      window.localStorage.removeItem(PENDING_CONSENT_KEY);
      setMarketingConsent({ data: { consent: true, language: lang } })
        .then(() => track("marketing_consent_given", { source: "signup" }))
        .catch(() => undefined);
    } else if (pending === "false") {
      window.localStorage.removeItem(PENDING_CONSENT_KEY);
    }
  }, [session, lang]);

  return null;
}
