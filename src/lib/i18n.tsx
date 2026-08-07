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

export type Lang = "it" | "en";
const dicts = { it, en } as const;

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

function isLang(v: unknown): v is Lang {
  return v === "it" || v === "en";
}

function readStored(): Lang | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_KEY);
  if (isLang(stored)) return stored;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=(it|en)`));
  return isLang(match?.[1]) ? (match![1] as Lang) : null;
}

function detect(): Lang {
  if (typeof window === "undefined") return "it";
  const stored = readStored();
  if (stored) return stored;
  return navigator.language?.toLowerCase().startsWith("it") ? "it" : "en";
}

function persist(l: Lang) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, l);
  window.localStorage.setItem(LEGACY_KEY, l);
  document.cookie = `${COOKIE_KEY}=${l}; path=/; max-age=31536000; samesite=lax`;
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
    const dict = dicts[lang];
    const t = (path: string, vars?: Record<string, string | number>) => {
      const raw = path.split(".").reduce<unknown>((acc, key) => {
        if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
        return undefined;
      }, dict);
      let out = typeof raw === "string" ? raw : path;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
      }
      return out;
    };
    return { lang, setLang, applyRemoteLang, hasExplicitChoice, t, dict };
  }, [lang, setLang, applyRemoteLang, hasExplicitChoice]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
