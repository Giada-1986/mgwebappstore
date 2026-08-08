import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import it from "@/i18n/it.json";
import en from "@/i18n/en.json";
import es from "@/i18n/es.json";
import de from "@/i18n/de.json";
import fr from "@/i18n/fr.json";

export type Lang = "it" | "en" | "es" | "de" | "fr";
const dicts = { it, en, es, de, fr } as const;

/** Ordered list used by the language menu. Native names, never translated. */
export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: "it", label: "Italiano" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
];

const STORAGE_KEY = "platform-lang";
const LEGACY_KEY = "fof-lang";
const COOKIE_KEY = "platform-lang";

type Ctx = {
  lang: Lang;
  /** Explicit user choice (persisted). */
  setLang: (l: Lang) => void;
  /** Applies a language coming from the account profile, without marking it as an explicit choice. */
  applyRemoteLang: (l: Lang) => void;
  /** True when the user (or a restored preference) explicitly picked a language on this device. */
  hasExplicitChoice: boolean;
  t: (path: string, vars?: Record<string, string | number>) => string;
  dict: typeof it;
};

const I18nContext = createContext<Ctx | null>(null);

export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && LANGUAGES.some((l) => l.code === v);
}

function readStored(): Lang | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_KEY);
  if (isLang(stored)) return stored;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([a-z]{2})`));
  return isLang(match?.[1]) ? (match![1] as Lang) : null;
}

/** First visit: browser language when supported, English otherwise. */
function detect(): Lang {
  if (typeof window === "undefined") return "en";
  const stored = readStored();
  if (stored) return stored;
  const candidates = [navigator.language, ...(navigator.languages ?? [])];
  for (const c of candidates) {
    const base = c?.toLowerCase().split("-")[0];
    if (isLang(base)) return base;
  }
  return "en";
}

function persist(l: Lang) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, l);
  window.localStorage.setItem(LEGACY_KEY, l);
  document.cookie = `${COOKIE_KEY}=${l}; path=/; max-age=31536000; samesite=lax`;
}

function lookup(dict: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, dict);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("it");
  const [hasExplicitChoice, setHasExplicitChoice] = useState(false);

  // Runs on hydration: restores the stored language before the user can interact.
  useEffect(() => {
    const stored = readStored();
    setLangState(stored ?? detect());
    setHasExplicitChoice(!!stored);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    setHasExplicitChoice(true);
    persist(l);
  }, []);

  const applyRemoteLang = useCallback((l: Lang) => {
    setLangState(l);
    persist(l);
  }, []);

  const value = useMemo<Ctx>(() => {
    const dict = dicts[lang] ?? en;
    const t = (path: string, vars?: Record<string, string | number>) => {
      // Missing strings never show a raw key: English is the safety net.
      const raw = lookup(dict, path) ?? lookup(en, path);
      let out = typeof raw === "string" ? raw : path;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
      }
      return out;
    };
    return { lang, setLang, applyRemoteLang, hasExplicitChoice, t, dict: dict as typeof it };
  }, [lang, setLang, applyRemoteLang, hasExplicitChoice]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
