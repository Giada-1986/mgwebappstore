import type { Dict } from "./i18n/types";

export type QuestionId =
  | "lastMeal"
  | "body"
  | "onset"
  | "craving"
  | "emotion"
  | "context"
  | "waiting";

export type Question = {
  id: QuestionId;
  title: string;
  hint?: string;
  multiple?: boolean;
  options: { value: string; label: string }[];
};

export const questionIds: QuestionId[] = [
  "lastMeal",
  "body",
  "onset",
  "craving",
  "emotion",
  "context",
  "waiting",
];

export const optionValues: Record<QuestionId, string[]> = {
  lastMeal: ["lt1", "1-3", "3-5", "gt5", "unknown"],
  body: ["empty", "energy", "weak", "none", "tension", "unclear"],
  onset: ["gradual", "quick", "sudden", "unknown"],
  craving: ["flexible", "sweet", "salty", "specific", "unknown"],
  emotion: [
    "serena",
    "stressata",
    "ansiosa",
    "annoiata",
    "triste",
    "arrabbiata",
    "sola",
    "stanca",
    "sopraffatta",
    "non-saprei",
  ],
  context: ["work", "conflict", "stop", "screen", "alone", "foodcue", "nothing", "other"],
  waiting: ["calm", "uneasy", "agitated", "now", "unknown"],
};

const multipleQuestions: QuestionId[] = ["body"];

export function getQuestions(t: Dict): Question[] {
  return questionIds.map((id) => {
    const q = t.questions[id] as { title: string; hint?: string; options: Record<string, string> };
    return {
      id,
      title: q.title,
      ...(q.hint ? { hint: q.hint } : {}),
      ...(multipleQuestions.includes(id) ? { multiple: true } : {}),
      options: (optionValues[id] ?? []).map((value) => ({
        value,
        label: q.options[value] ?? value,
      })),
    };
  });
}

export function optionLabel(t: Dict, id: QuestionId, value: string | null | undefined): string {
  if (!value) return "—";
  const q = t.questions[id] as { options: Record<string, string> };
  return q.options[value] ?? value;
}

export type Answers = {
  lastMeal?: string;
  body?: string[];
  onset?: string;
  craving?: string;
  emotion?: string;
  context?: string;
  waiting?: string;
};

export type ResultKind = "A" | "B" | "C";

export type CheckinResult = {
  kind: ResultKind;
  title: string;
  description: string;
  physical: number;
  emotional: number;
};

export function computeResult(a: Answers, t: Dict): CheckinResult {
  let physical = 0;
  let emotional = 0;

  switch (a.lastMeal) {
    case "gt5":
      physical += 3;
      break;
    case "3-5":
      physical += 2;
      break;
    case "1-3":
      physical += 1;
      break;
    case "lt1":
      emotional += 2;
      break;
    default:
      emotional += 1;
  }

  const body = a.body ?? [];
  if (body.includes("empty")) physical += 3;
  if (body.includes("energy")) physical += 2;
  if (body.includes("weak")) physical += 2;
  if (body.includes("none")) emotional += 2;
  if (body.includes("tension")) emotional += 2;
  if (body.includes("unclear")) emotional += 1;

  if (a.onset === "gradual") physical += 2;
  if (a.onset === "quick") physical += 1;
  if (a.onset === "sudden") emotional += 2;

  if (a.craving === "flexible") physical += 3;
  if (a.craving === "sweet" || a.craving === "salty") emotional += 1;
  if (a.craving === "specific") emotional += 2;
  if (a.craving === "unknown") emotional += 2;

  if (a.emotion && !["serena", "non-saprei"].includes(a.emotion)) emotional += 3;
  if (a.emotion === "serena") physical += 1;

  if (a.context && !["nothing", "other"].includes(a.context)) emotional += 2;

  if (a.waiting === "calm") physical += 1;
  if (a.waiting === "agitated") emotional += 2;
  if (a.waiting === "now") emotional += 2;

  const total = physical + emotional;
  const emotionalShare = total === 0 ? 0.5 : emotional / total;

  let kind: ResultKind = "B";
  if (emotionalShare <= 0.38) kind = "A";
  else if (emotionalShare >= 0.62) kind = "C";

  if (kind === "A") {
    return { kind, physical, emotional, ...t.results.A };
  }

  if (kind === "B") {
    return { kind, physical, emotional, ...t.results.B };
  }

  const emotionPhrases = t.emotionPhrases as Record<string, string>;
  const contextPhrases = t.contextPhrases as Record<string, string>;
  const emo = emotionPhrases[a.emotion ?? "non-saprei"] ?? t.results.C.fallbackEmotion;
  const trg = contextPhrases[a.context ?? "nothing"] ?? t.results.C.fallbackTrigger;

  return {
    kind,
    physical,
    emotional,
    title: t.results.C.title,
    description: t.results.C.description(emo, trg),
  };
}

export type MicroAction = { title: string; detail: string };

export function microActionsFor(t: Dict, emotion?: string | null): MicroAction[] {
  const map = t.microActions as Record<string, MicroAction[]>;
  const fallback = map["non-saprei"] as MicroAction[];
  return map[emotion ?? "non-saprei"] ?? fallback;
}

export const cravingChangeKeys = ["stronger", "same", "weaker", "changed", "gone"] as const;
export type CravingChangeKey = (typeof cravingChangeKeys)[number];

export const actionKeys = ["mindful", "tenMinutes", "microThenEat", "microStay"] as const;
export type ActionKey = (typeof actionKeys)[number];

export type ResultInsight = { key: string; label: string; text: string };

const physicalBody = ["empty", "energy", "weak"];

export function buildInsights(a: Answers, t: Dict): ResultInsight[] {
  const L = t.results.insightLabels;
  const T = t.results.insightText;
  const items: ResultInsight[] = [];

  const body = (a.body ?? []).filter((v) => v !== "none");
  if (body.length > 0) {
    const list = body.map((v) => optionLabel(t, "body", v).toLowerCase()).join(", ");
    items.push({ key: "body", label: L.body, text: T.body(list) });
  } else if ((a.body ?? []).includes("none")) {
    items.push({ key: "body", label: L.body, text: T.bodyNone });
  }

  if (a.emotion && !["serena", "non-saprei"].includes(a.emotion)) {
    items.push({
      key: "emotion",
      label: L.emotion,
      text: T.emotion(optionLabel(t, "emotion", a.emotion).toLowerCase()),
    });
  }

  if (a.context && !["nothing", "other"].includes(a.context)) {
    items.push({
      key: "context",
      label: L.context,
      text: T.context(optionLabel(t, "context", a.context).toLowerCase()),
    });
  }

  if (a.craving && ["sweet", "salty", "specific"].includes(a.craving)) {
    items.push({
      key: "craving",
      label: L.craving,
      text: T.craving(optionLabel(t, "craving", a.craving).toLowerCase()),
    });
  }

  if (items.length < 2 && a.lastMeal && a.lastMeal !== "unknown") {
    items.push({
      key: "timing",
      label: L.timing,
      text: T.timing(optionLabel(t, "lastMeal", a.lastMeal).toLowerCase()),
    });
  }

  return items.slice(0, 4);
}

export function conclusionFor(kind: ResultKind, t: Dict): string {
  return t.results.conclusion[kind];
}
