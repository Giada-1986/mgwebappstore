import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { StoreLogo } from "@/components/store/StoreLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/platform";
import { track } from "@/lib/analytics";
import { PENDING_CONSENT_KEY } from "@/components/store/AnalyticsProvider";

function safeRedirect(value: unknown): string {
  // Only same-origin app paths are accepted, never an external URL.
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/my-apps";
  }
  return value;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: safeRedirect(search["redirect"]),
  }),
  head: () => ({
    meta: [
      { title: "Accedi — Mini Web Apps" },
      { name: "description", content: "Accedi o crea il tuo account Mini Web Apps." },
      { property: "og:title", content: "Accedi — Mini Web Apps" },
      { property: "og:description", content: "Accedi o crea il tuo account Mini Web Apps." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const { session } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Never pre-selected: marketing consent must be an explicit action.
  const [marketing, setMarketing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: redirectTo, replace: true });
  }, [session, navigate, redirectTo]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === "signup") {
        track("signup_started");
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (err) throw err;
        // Stored until a session exists (double opt-in creates it only later).
        window.localStorage.setItem(PENDING_CONSENT_KEY, marketing ? "true" : "false");
        track("signup_completed");
        if (!data.session) setMessage(t("auth.checkEmail"));
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        track("login_completed");
      }
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
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          {mode === "signin" ? t("auth.title") : t("auth.titleSignUp")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin" ? t("auth.subtitle") : t("auth.subtitleSignUp")}
        </p>

        <div className="store-hairline mx-auto mt-7 w-24" />

        <form onSubmit={submit} className="mt-7 space-y-4 text-left">
          <label className="block text-sm">
            <span className="text-muted-foreground">{t("auth.email")}</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-store mt-1.5"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">{t("auth.password")}</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-store mt-1.5"
            />
          </label>

          {mode === "signup" && (
            <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                />
                <span>{t("auth.marketingLabel")}</span>
              </label>
              <p className="mt-2 text-xs text-muted-foreground">{t("auth.marketingHint")}</p>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-foreground">{message}</p>}

          <button type="submit" disabled={busy} className="btn-store w-full disabled:opacity-60">
            {mode === "signin" ? t("auth.signIn") : t("auth.signUp")}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-5 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {mode === "signin" ? t("auth.toSignUp") : t("auth.toSignIn")}
        </button>
      </div>

      <p className="mt-6 max-w-md text-center text-xs text-muted-foreground">
        {t("store.footer")}
      </p>
    </div>
  );
}
