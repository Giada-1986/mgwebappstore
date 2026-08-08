import type { Checkin } from "@/lib/data";

const emotions = ["stress", "boredom", "sadness", "anxiety", "tiredness", "loneliness", "anger"];
const notesByLang: Record<string, string[]> = {
  it: [
    "discussione con un collega",
    "giornata lunga in ufficio",
    "serata da sola sul divano",
    "riunione stressante",
    "discussione con un collega",
    "giornata lunga in ufficio",
  ],
  en: [
    "argument with a colleague",
    "long day at the office",
    "evening alone on the sofa",
    "stressful meeting",
    "argument with a colleague",
    "long day at the office",
  ],
};
const actions = ["wait", "exercise", "eat", "wait", "eat", "wait"];

/** Deterministic-ish sample check-ins used to preview the reports. */
export function mockCheckins(lang: string = "it", count = 34): Checkin[] {
  const notes = notesByLang[lang] ?? notesByLang["it"]!;
  const out: Checkin[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor((i / count) * 30);
    const hour = [16, 18, 21, 22, 21, 15][i % 6]!;
    const d = new Date(now - daysAgo * 86400000);
    d.setHours(hour, (i * 7) % 60, 0, 0);
    out.push({
      id: `mock-${i}`,
      user_id: "mock",
      created_at: d.toISOString(),
      hunger_type: i % 4 === 0 ? "physical" : i % 3 === 0 ? "unsure" : "emotional",
      emotion: emotions[i % emotions.length]!,
      note: i % 2 === 0 ? notes[i % notes.length]! : null,
      action_chosen: i < count / 2 ? actions[i % actions.length]! : i % 3 === 0 ? "eat" : "wait",
    });
  }
  return out.sort((a, b) => b.created_at.localeCompare(a.created_at));
}
