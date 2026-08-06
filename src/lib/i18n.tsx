import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import it from "@/i18n/it.json";
import en from "@/i18n/en.json";

export type Lang = "it" | "en";
const dicts = { it, en } as const;

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
  dict: typeof it;
};

const I18nContext = createContext<Ctx | null>(null);

function detect(): Lang {
  if (typeof window === "undefined") return "it";
  const stored = window.localStorage.getItem("fof-lang");
  if (stored === "it" || stored === "en") return stored;
  return navigator.language?.toLowerCase().startsWith("it") ? "it" : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("it");

  useEffect(() => {
    setLangState(detect());
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") window.localStorage.setItem("fof-lang", l);
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
    return { lang, setLang, t, dict };
  }, [lang, setLang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}
