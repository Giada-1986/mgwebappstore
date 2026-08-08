import { it } from "./it";

export type Dict = typeof it;

export const languages = ["it", "en", "es", "de", "fr"] as const;
export type Lang = (typeof languages)[number];

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (languages as readonly string[]).includes(value);
}
