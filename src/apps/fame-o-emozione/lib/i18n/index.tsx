import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { it } from "./it";
import { en } from "./en";
import { es } from "./es";
import { de } from "./de";
import { fr } from "./fr";
import { isLang, languages, type Dict, type Lang } from "./types";

export { languages, isLang };
export type { Dict, Lang };

export const dictionaries: Record<Lang, Dict> = { it, en, es, de, fr };

export const DEFAULT_LANG: Lang = "it";
const STORAGE_KEY = "miniapps:lang";

/**
 * Risoluzione della lingua, in ordine di priorità:
 * 1. parametro URL (?lang= / ?lng= / ?locale= / hash #lang=)
 * 2. configurazione condivisa iniettata dallo store (window.MINI_APPS_CONFIG.language
 *    oppure window.__MINI_APP_LANG__)
 * 3. attributo lang su <html> impostato dal contenitore
 * 4. lingua salvata in localStorage
 * 5. lingua del dispositivo
 * 6. italiano
 */
function normalize(value: unknown): Lang | null {
  if (typeof value !== "string") return null;
  const base = value.trim().toLowerCase().split(/[-_]/)[0];
  return isLang(base) ? base : null;
}

type SharedConfig = { language?: string; lang?: string; locale?: string };

function readSharedConfig(): Lang | null {
  const w = window as unknown as {
    MINI_APPS_CONFIG?: SharedConfig;
    __MINI_APP_LANG__?: string;
  };
  return (
    normalize(w.MINI_APPS_CONFIG?.language) ??
    normalize(w.MINI_APPS_CONFIG?.lang) ??
    normalize(w.MINI_APPS_CONFIG?.locale) ??
    normalize(w.__MINI_APP_LANG__)
  );
}

export function readLangFromUrl(): Lang | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const fromSearch =
    normalize(params.get("lang")) ?? normalize(params.get("lng")) ?? normalize(params.get("locale"));
  if (fromSearch) return fromSearch;
  const hash = window.location.hash.replace(/^#/, "");
  if (hash) {
    const hashParams = new URLSearchParams(hash.includes("=") ? hash : "");
    return normalize(hashParams.get("lang")) ?? normalize(hash);
  }
  return null;
}

export function resolveLang(): Lang {
  if (typeof window === "undefined") return DEFAULT_LANG;
  let stored: string | null = null;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    stored = null;
  }
  return (
    readLangFromUrl() ??
    readSharedConfig() ??
    normalize(document.documentElement.getAttribute("lang")) ??
    normalize(stored) ??
    normalize(navigator.language) ??
    DEFAULT_LANG
  );
}

type I18nValue = { lang: Lang; t: Dict; setLang: (lang: Lang) => void };

const I18nContext = createContext<I18nValue>({
  lang: DEFAULT_LANG,
  t: it,
  setLang: () => {},
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    setLangState(resolveLang());

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; language?: string; lang?: string } | null;
      if (!data || typeof data !== "object") return;
      if (data.type !== "set-language" && data.type !== "language") return;
      const next = normalize(data.language) ?? normalize(data.lang);
      if (next) setLangState(next);
    };
    window.addEventListener("message", onMessage);

    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const next = normalize(event.newValue);
      if (next) setLangState(next);
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      t: dictionaries[lang],
      setLang: (next: Lang) => {
        setLangState(next);
        try {
          window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
          /* storage non disponibile */
        }
      },
    }),
    [lang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export const localeTags: Record<Lang, string> = {
  it: "it-IT",
  en: "en-GB",
  es: "es-ES",
  de: "de-DE",
  fr: "fr-FR",
};
