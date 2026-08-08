import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  identifyUser,
  initAnalytics,
  resetAnalytics,
  setAnalyticsBlocked,
  track,
  trackPageView,
} from "@/lib/analytics";
import { setMarketingConsent } from "@/lib/marketing.functions";
import { useI18n } from "@/lib/i18n";
import { useIsAdmin, useSession } from "@/lib/platform";

export const PENDING_CONSENT_KEY = "mwa.pendingMarketingConsent";

/**
 * Boots product analytics, binds events to the internal user id and applies a
 * marketing consent captured at signup once the session finally exists
 * (double opt-in flows create the session only after email confirmation).
 *
 * Nothing is captured before the Supabase session AND the `admin` role are
 * resolved: administrator visits must never inflate store analytics. The role
 * comes from the database (`has_role`), never from an email address.
 */
export function AnalyticsProvider() {
  const { session, loading } = useSession();
  const { lang } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const lastPath = useRef<string | null>(null);
  const identified = useRef<string | null>(null);

  const userId = session?.user.id;
  const adminQuery = useIsAdmin(userId);
  // Anonymous visitors resolve instantly; signed-in users wait for the role.
  const roleResolved = !loading && (!userId || !adminQuery.isLoading);
  const isAdmin = adminQuery.data === true;
  const excluded = !!userId && isAdmin;

  useEffect(() => {
    if (!roleResolved) return;
    setAnalyticsBlocked(excluded);
    if (!excluded) initAnalytics();
  }, [roleResolved, excluded]);

  useEffect(() => {
    if (!roleResolved || excluded) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    trackPageView(pathname);
    if (pathname === "/" || pathname.startsWith("/apps")) track("store_viewed", { path: pathname });
  }, [pathname, roleResolved, excluded]);

  useEffect(() => {
    if (!roleResolved) return;
    if (!userId) {
      if (identified.current) {
        resetAnalytics();
        identified.current = null;
      }
      // Signing out of an admin session must restore tracking for the browser.
      lastPath.current = null;
      return;
    }
    if (excluded || identified.current === userId) return;
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
  }, [userId, excluded, roleResolved, lang]);

  return null;
}
