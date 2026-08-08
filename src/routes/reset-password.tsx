import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { StoreLogo } from "@/components/store/StoreLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nuova password — Mini Web Apps" },
      { name: "description", content: "Imposta una nuova password per il tuo account Mini Web Apps." },
      { property: "og:title", content: "Nuova password — Mini Web Apps" },
      { property: "og:description", content: "Imposta una nuova password per il tuo account Mini Web Apps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

/**
 * Landing page for the Supabase recovery link. Supabase itself validates the
 * one-time token (either the PKCE `code` or the legacy recovery hash) and
 * hands us a short-lived recovery session; we only call updateUser({password}).
 * No profile, purchase, entitlement or role data is touched here.
 */
function ResetPasswordPage() {
  const { t } = useI18n();
  const [state, setState] = useState<"checking" | "ready" | "invalid" | "done">("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function verifyLink() {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ""));

      // An expired/consumed link comes back as an error, never as a session.
      if (url.searchParams.get("error") || hash.get("error")) {
        if (!cancelled) setState("invalid");
        return;
      }

      const code = url.searchParams.get("code");
      if (code) {
        const { error: err } = await supabase.auth.exchangeCodeForSession(code);
        if (!cancelled) setState(err ? "invalid" : "ready");
        // Keep the one-time token out of the address bar and out of any log.
        window.history.replaceState({}, "", url.pathname);
        return;
      }

      // Legacy hash flow: the client library sets the recovery session itself.
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        setState("ready");
        if (url.hash) window.history.replaceState({}, "", url.pathname);
        return;
      }
      setState("invalid");
    }

    void verifyLink();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError(t("auth.resetTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.resetMismatch"));
      return;
    }
    setBusy(true);
    try {
      // Password only: email, role and user id are never part of this call.
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      await supabase.auth.signOut();
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="store-scope flex min-h-screen flex-col items-center justify-center px-5 py-14">
      <div className="absolute right-5 top-5 z-10">
        <LanguageSwitcher />
      </div>

      <div className="card-store w-full max-w-md p-9 text-center">
        <StoreLogo priority className="mx-auto h-20 w-20 rounded-2xl ring-1 ring-primary/25" />
        <p
          translate="no"
          className="notranslate mt-5 text-[0.65rem] uppercase tracking-[0.42em] text-primary"
        >
          {t("store.brand")}
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{t("auth.resetTitle")}</h1>

        <div className="store-hairline mx-auto mt-7 w-24" />

        {state === "checking" && (
          <p className="mt-7 text-sm text-muted-foreground">{t("auth.resetChecking")}</p>
        )}

        {state === "invalid" && (
          <>
            <p className="mt-7 text-sm text-destructive">{t("auth.resetInvalid")}</p>
            <Link
              to="/auth"
              search={{ redirect: "/my-apps" }}
              className="btn-store mt-6 inline-flex w-full items-center justify-center"
            >
              {t("auth.goToSignIn")}
            </Link>
          </>
        )}

        {state === "done" && (
          <>
            <p className="mt-7 text-sm text-foreground">{t("auth.resetDone")}</p>
            <Link
              to="/auth"
              search={{ redirect: "/my-apps" }}
              className="btn-store mt-6 inline-flex w-full items-center justify-center"
            >
              {t("auth.goToSignIn")}
            </Link>
          </>
        )}

        {state === "ready" && (
          <>
            <p className="mt-4 text-sm text-muted-foreground">{t("auth.resetSubtitle")}</p>
            <form onSubmit={submit} className="mt-7 space-y-4 text-left">
              <label className="block text-sm">
                <span className="text-muted-foreground">{t("auth.newPassword")}</span>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-store mt-1.5"
                />
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">{t("auth.confirmPassword")}</span>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="input-store mt-1.5"
                />
              </label>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <button type="submit" disabled={busy} className="btn-store w-full disabled:opacity-60">
                {t("auth.resetSubmit")}
              </button>
            </form>
          </>
        )}
      </div>

      <p className="mt-6 max-w-md text-center text-xs text-muted-foreground">{t("store.footer")}</p>
    </div>
  );
}
