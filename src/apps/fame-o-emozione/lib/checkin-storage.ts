import { type Lang } from "./i18n/types";
import { localeTags } from "./i18n";
import type { QuestionId } from "./checkin";

export type StoredAnswer = {
  id: QuestionId;
  value: string | string[];
};

export type CheckinSession = {
  id: string;
  createdAt: string; // ISO timestamp
  date: string; // es. "8 agosto 2026"
  time: string; // es. "21:34"
  lang: Lang;
  cravingFood: string | null;
  initialReason: string | null;
  answers: StoredAnswer[];
  mainEmotion: string | null;
  mainTrigger: string | null;
  resultType: "A" | "B" | "C" | null;
  selectedAction: string | null;
  cravingAfterPause: string | null;
};

const KEY = "mindfulBiteCheckins";
const LEGACY_KEY = "fame-o-emozione:checkins";

export function formatDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(localeTags[lang], {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatTime(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleTimeString(localeTags[lang], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function newCheckinId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createSession(lang: Lang): CheckinSession {
  const now = new Date();
  const createdAt = now.toISOString();
  return {
    id: newCheckinId(),
    createdAt,
    date: formatDate(createdAt, lang),
    time: formatTime(createdAt, lang),
    lang,
    cravingFood: null,
    initialReason: null,
    answers: [],
    mainEmotion: null,
    mainTrigger: null,
    resultType: null,
    selectedAction: null,
    cravingAfterPause: null,
  };
}

export function loadSessions(): CheckinSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CheckinSession[]) : [];
  } catch {
    return [];
  }
}

function save(sessions: CheckinSession[]) {
  window.localStorage.setItem(KEY, JSON.stringify(sessions));
}

export function saveSession(session: CheckinSession): CheckinSession[] {
  const existing = loadSessions();
  const idx = existing.findIndex((s) => s.id === session.id);
  const next =
    idx >= 0 ? existing.map((s, i) => (i === idx ? session : s)) : [...existing, session];
  save(next);
  return next;
}

export function deleteSession(id: string): CheckinSession[] {
  const next = loadSessions().filter((s) => s.id !== id);
  save(next);
  return next;
}

export function clearSessions() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.localStorage.removeItem(LEGACY_KEY);
}

export function sortedSessions(sessions: CheckinSession[]): CheckinSession[] {
  return [...sessions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function answersToStored(answers: Record<string, unknown>): StoredAnswer[] {
  return Object.entries(answers)
    .filter(([, v]) => v !== undefined)
    .map(([id, value]) => ({ id: id as QuestionId, value: value as string | string[] }));
}
