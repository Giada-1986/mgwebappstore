import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { StoreLogo } from "@/components/store/StoreLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SakuraCorners } from "@/components/Sakura";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/platform";

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
  const { t } = useI18n();
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const { session } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (err) throw err;
        if (!data.session) setMessage(t("auth.checkEmail"));
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.error"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <SakuraCorners />
      <div className="absolute right-5 top-5 z-10">
        <LanguageSwitcher />
      </div>
      <div className="card-pearl relative z-10 w-full max-w-md p-8 text-center">
        <StoreLogo priority className="mx-auto h-24 w-24 rounded-2xl shadow-[var(--shadow-gold)]" />

        <h1 className="mt-5 font-display text-3xl">{t("auth.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("auth.subtitle")}</p>

        <form onSubmit={submit} className="mt-6 space-y-3 text-left">
          <label className="block text-sm">
            <span className="text-muted-foreground">{t("auth.email")}</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gold/35 bg-background/60 px-4 py-2.5 outline-none focus:border-gold"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">{t("auth.password")}</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gold/35 bg-background/60 px-4 py-2.5 outline-none focus:border-gold"
            />
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-foreground">{message}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-[image:var(--gradient-gold)] px-6 py-3 font-medium text-primary-foreground shadow-[var(--shadow-gold)] disabled:opacity-60"
          >
            {mode === "signin" ? t("auth.signIn") : t("auth.signUp")}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-4 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {mode === "signin" ? t("auth.toSignUp") : t("auth.toSignIn")}
        </button>
      </div>
    </div>
  );
}
