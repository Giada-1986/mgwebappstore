import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * "Propose a solution" — public idea collection.
 *
 * Every write happens server-side with the privileged client AFTER validation
 * and sanitisation, so the table needs no anon/authenticated INSERT policy.
 * Reads are admin-only (RLS + explicit has_role check). Nothing here touches
 * payments, entitlements, gifts or marketing consent.
 */

/** Q1 — areas of life/work the solution would serve (multi-select). */
export const DOMAINS = [
  "daily",
  "work",
  "business",
  "productivity",
  "home",
  "study",
  "clients",
  "content",
  "money",
  "wellbeing",
  "other",
] as const;

/** Q8 — how the person copes with the problem today (multi-select). */
export const CURRENT_APPROACHES = [
  "manual",
  "spreadsheets",
  "notes",
  "app",
  "multiple",
  "online",
  "help",
  "stuck",
  "not_searched",
  "other",
] as const;

/** Legacy Q1 values, kept only to render proposals submitted before the rework. */
export const SOLUTION_TYPES = [
  "mini_app",
  "checklist",
  "template",
  "ebook",
  "guide",
  "planner",
  "calculator",
  "bundle",
  "unsure",
  "other",
] as const;


export const AUDIENCES = [
  "me",
  "work",
  "business",
  "family",
  "students",
  "professionals",
  "creators",
  "clients",
  "other",
] as const;

export const FREQUENCIES = ["daily", "weekly", "monthly", "occasional", "once", "unsure"] as const;

export const FORMATS = [
  "interactive",
  "fillable",
  "checklist",
  "template",
  "stepbystep",
  "ebook",
  "automatic",
  "none",
] as const;

/** Legacy Q8 values, kept only to render older proposals. */
export const PURCHASE_INTENTS = ["yes", "maybe", "cheap", "free", "no"] as const;

export const PRICE_RANGES = [
  "upto5",
  "5to10",
  "10to25",
  "25to50",
  "50to100",
  "over100",
  "unsure",
] as const;

/** "free" is no longer offered, but old rows may still carry it. */
const PRICE_RANGES_STORED = [...PRICE_RANGES, "free"] as const;

export const TRIED_OPTIONS = [
  "yes_unsatisfied",
  "yes_expensive",
  "yes_complex",
  "yes_missing",
  "no",
] as const;

export const SUGGESTION_STATUSES = [
  "new",
  "interesting",
  "explore",
  "evaluating",
  "building",
  "done",
  "archived",
] as const;

export type SuggestionInput = {
  domains: string[];
  domainOther?: string;
  goal: string;
  problem?: string;
  audience: string[];
  audienceOther?: string;
  frequency?: string;
  formats: string[];
  importance: number;
  currentApproach: string[];
  currentApproachTool?: string;
  currentApproachOther?: string;
  priceRange?: string;
  tried?: string;
  triedDetail?: string;
  notify: boolean;
  notifyEmail?: string;
  language: string;
};


/** Strips tags/control chars: free text is stored as plain text, never HTML. */
function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
    .slice(0, max);
}

function pick(value: unknown, allowed: readonly string[]): string | null {
  return typeof value === "string" && allowed.includes(value) ? value : null;
}

function pickMany(value: unknown, allowed: readonly string[], max = 12): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((v): v is string => typeof v === "string" && allowed.includes(v)))].slice(0, max);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function hashSubmitter(): Promise<string | null> {
  try {
    const request = getRequest();
    const ip =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      null;
    if (!ip) return null;
    const bytes = new TextEncoder().encode(`suggestion:${ip}`);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

/** Best-effort identity: the form is public, a signed-in user just gets linked. */
async function resolveUser(): Promise<{ id: string; email: string | null } | null> {
  try {
    const token = getRequest().headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return null;
    const { createClient } = await import("@supabase/supabase-js");
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!;
    const client = createClient(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input: any, init: any) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data } = await client.auth.getUser(token);
    return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
  } catch {
    return null;
  }
}

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;

export type SubmitResult = { ok: true } | { ok: false; reason: "invalid" | "rate_limited" };

export const submitSuggestion = createServerFn({ method: "POST" })
  .inputValidator((input: SuggestionInput) => input)
  .handler(async ({ data }): Promise<SubmitResult> => {
    const domains = pickMany(data?.domains, DOMAINS);
    const goal = clean(data?.goal, 1000);
    if (domains.length === 0 || goal.length < 5) return { ok: false, reason: "invalid" };


    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const submitterHash = await hashSubmitter();
    const user = await resolveUser();

    // Reasonable anti-spam: per IP and per account, sliding hourly window.
    const since = new Date(Date.now() - WINDOW_MS).toISOString();
    for (const [column, value] of [
      ["submitter_hash", submitterHash],
      ["user_id", user?.id ?? null],
    ] as const) {
      if (!value) continue;
      const { count } = await admin
        .from("suggestions")
        .select("id", { count: "exact", head: true })
        .eq(column, value)
        .gte("created_at", since);
      if ((count ?? 0) >= MAX_PER_WINDOW) return { ok: false, reason: "rate_limited" };
    }

    const notify = data?.notify === true;
    const providedEmail = clean(data?.notifyEmail, 255).toLowerCase();
    // Signed-in users never have to retype (or expose) their address.
    const notifyEmail = notify
      ? (user?.email ?? (EMAIL_RE.test(providedEmail) ? providedEmail : null))
      : null;

    const { error } = await admin.from("suggestions").insert({
      user_id: user?.id ?? null,
      solution_type: null,
      solution_type_other: null,
      domains,
      domain_other: domains.includes("other") ? clean(data?.domainOther, 120) || null : null,
      goal,
      problem: clean(data?.problem, 1000) || null,
      audience: pickMany(data?.audience, AUDIENCES),
      audience_other: clean(data?.audienceOther, 120) || null,
      frequency: pick(data?.frequency, FREQUENCIES),
      formats: pickMany(data?.formats, FORMATS),
      importance: Math.min(5, Math.max(1, Math.round(Number(data?.importance) || 3))),
      current_approach: pickMany(data?.currentApproach, CURRENT_APPROACHES),
      current_approach_tool: clean(data?.currentApproachTool, 160) || null,
      current_approach_other: clean(data?.currentApproachOther, 160) || null,
      price_range: pick(data?.priceRange, PRICE_RANGES_STORED),

      tried: pick(data?.tried, TRIED_OPTIONS),
      tried_detail: clean(data?.triedDetail, 500) || null,
      notify,
      notify_email: notifyEmail,
      language: clean(data?.language, 5) || "it",
      submitter_hash: submitterHash,
    });
    if (error) return { ok: false, reason: "invalid" };
    return { ok: true };
  });

/* ---------------- admin ---------------- */

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || data !== true) throw new Error("Forbidden");
}

export type AdminSuggestion = {
  id: string;
  createdAt: string;
  status: string;
  solutionType: string;
  solutionTypeOther: string | null;
  goal: string;
  problem: string | null;
  audience: string[];
  audienceOther: string | null;
  frequency: string | null;
  formats: string[];
  importance: number;
  purchaseInterest: string | null;
  priceRange: string | null;
  tried: string | null;
  triedDetail: string | null;
  notifyEmail: string | null;
  language: string;
};

export type SuggestionsDigest = {
  rows: AdminSuggestion[];
  stats: {
    total: number;
    byType: { key: string; count: number }[];
    byFormat: { key: string; count: number }[];
    byAudience: { key: string; count: number }[];
    byStatus: { key: string; count: number }[];
    avgImportance: number;
  };
};

function tally(values: string[]): { key: string; count: number }[] {
  const map = new Map<string, number>();
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

export const listSuggestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SuggestionsDigest> => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("suggestions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    const rows: AdminSuggestion[] = (data ?? []).map((r: any) => ({
      id: r.id,
      createdAt: r.created_at,
      status: r.status,
      solutionType: r.solution_type,
      solutionTypeOther: r.solution_type_other,
      goal: r.goal,
      problem: r.problem,
      audience: r.audience ?? [],
      audienceOther: r.audience_other,
      frequency: r.frequency,
      formats: r.formats ?? [],
      importance: r.importance,
      purchaseInterest: r.purchase_interest,
      priceRange: r.price_range,
      tried: r.tried,
      triedDetail: r.tried_detail,
      notifyEmail: r.notify ? r.notify_email : null,
      language: r.language,
    }));

    return {
      rows,
      stats: {
        total: rows.length,
        byType: tally(rows.map((r) => r.solutionType)),
        byFormat: tally(rows.flatMap((r) => r.formats)),
        byAudience: tally(rows.flatMap((r) => r.audience)),
        byStatus: tally(rows.map((r) => r.status)),
        avgImportance: rows.length
          ? Math.round((rows.reduce((s, r) => s + r.importance, 0) / rows.length) * 10) / 10
          : 0,
      },
    };
  });

export const setSuggestionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: string }) => input)
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    await assertAdmin(context as any);
    const status = pick(data.status, SUGGESTION_STATUSES);
    if (!status || typeof data.id !== "string") return { ok: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any)
      .from("suggestions")
      .update({ status })
      .eq("id", data.id);
    return { ok: !error };
  });

/* ---------------- personal ("My proposals") ---------------- */

/** Statuses the user sees; internal triage values collapse into "evaluating". */
export const USER_VISIBLE_STATUSES = ["new", "evaluating", "building", "done", "archived"] as const;

export function publicStatus(status: string): (typeof USER_VISIBLE_STATUSES)[number] {
  switch (status) {
    case "new":
      return "new";
    case "building":
      return "building";
    case "done":
      return "done";
    case "archived":
      return "archived";
    default:
      return "evaluating";
  }
}

export type MySuggestion = {
  id: string;
  createdAt: string;
  status: (typeof USER_VISIBLE_STATUSES)[number];
  solutionType: string;
  solutionTypeOther: string | null;
  preview: string;
};

/**
 * Own proposals only: rows are matched on the authenticated user_id captured at
 * submission time (never on e-mail), and admin-only columns are never returned.
 */
export const listMySuggestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ rows: MySuggestion[] }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("suggestions")
      .select("id, created_at, status, solution_type, solution_type_other, problem, goal")
      .eq("user_id", (context as any).userId)
      .order("created_at", { ascending: false })
      .limit(100);

    return {
      rows: (data ?? []).map((r: any) => ({
        id: r.id,
        createdAt: r.created_at,
        status: publicStatus(r.status),
        solutionType: r.solution_type,
        solutionTypeOther: r.solution_type_other,
        preview: String(r.problem || r.goal || "").slice(0, 160),
      })),
    };
  });
