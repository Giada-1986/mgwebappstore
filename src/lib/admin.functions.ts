import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin dashboard data layer.
 *
 * Admin status is decided by the database (`public.has_role`), never by a URL
 * parameter or any client-side value. Only after that check succeeds do we use
 * the privileged client to aggregate store-wide data.
 */

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || data !== true) throw new Error("Forbidden");
}

export const getIsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ isAdmin: boolean }> => {
    const { data } = await (context.supabase as any).rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: data === true };
  });

export type AdminOverview = {
  users: { total: number; last7: number; last30: number; marketing: number; byLanguage: Record<string, number> };
  products: { active: number; total: number };
  purchases: { count: number; revenue: number; currency: string };
  salesByProduct: { slug: string; name: string; count: number; revenue: number }[];
  latestPurchases: {
    id: string;
    email: string | null;
    product: string;
    amount: number | null;
    currency: string;
    status: string;
    created_at: string;
  }[];
  funnel: { registrations: number; buyers: number; signupToPurchase: number };
};

export const getAdminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOverview> => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const [{ data: profiles }, { data: products }, { data: purchases }] = await Promise.all([
      admin.from("profiles").select("id, email, created_at, preferred_language, marketing_consent"),
      admin.from("products").select("id, slug, name_it, status"),
      admin
        .from("purchases")
        .select("id, user_id, product_id, amount_paid, currency, status, created_at")
        .order("created_at", { ascending: false }),
    ]);

    const allProfiles = profiles ?? [];
    const allProducts = products ?? [];
    const allPurchases = purchases ?? [];
    const now = Date.now();
    const days = (n: number) => now - n * 86_400_000;

    const byLanguage: Record<string, number> = {};
    for (const p of allProfiles) {
      const key = (p.preferred_language as string) || "it";
      byLanguage[key] = (byLanguage[key] ?? 0) + 1;
    }

    const paid = allPurchases.filter((p: any) => p.status === "paid" || p.status === "completed");
    const revenue = paid.reduce((sum: number, p: any) => sum + Number(p.amount_paid ?? 0), 0);

    const salesMap = new Map<string, { count: number; revenue: number }>();
    for (const p of paid) {
      const entry = salesMap.get(p.product_id) ?? { count: 0, revenue: 0 };
      entry.count += 1;
      entry.revenue += Number(p.amount_paid ?? 0);
      salesMap.set(p.product_id, entry);
    }

    const emailById = new Map(allProfiles.map((p: any) => [p.id, p.email]));
    const productById = new Map(allProducts.map((p: any) => [p.id, p]));

    const buyers = new Set(paid.map((p: any) => p.user_id)).size;

    return {
      users: {
        total: allProfiles.length,
        last7: allProfiles.filter((p: any) => new Date(p.created_at).getTime() > days(7)).length,
        last30: allProfiles.filter((p: any) => new Date(p.created_at).getTime() > days(30)).length,
        marketing: allProfiles.filter((p: any) => p.marketing_consent).length,
        byLanguage,
      },
      products: {
        active: allProducts.filter((p: any) => p.status === "active").length,
        total: allProducts.length,
      },
      purchases: { count: paid.length, revenue, currency: (paid[0]?.currency as string) ?? "EUR" },
      salesByProduct: [...salesMap.entries()]
        .map(([productId, v]) => ({
          slug: (productById.get(productId)?.slug as string) ?? productId,
          name: (productById.get(productId)?.name_it as string) ?? productId,
          count: v.count,
          revenue: v.revenue,
        }))
        .sort((a, b) => b.count - a.count),
      latestPurchases: allPurchases.slice(0, 12).map((p: any) => ({
        id: p.id,
        email: emailById.get(p.user_id) ?? null,
        product: (productById.get(p.product_id)?.name_it as string) ?? p.product_id,
        amount: p.amount_paid == null ? null : Number(p.amount_paid),
        currency: p.currency,
        status: p.status,
        created_at: p.created_at,
      })),
      funnel: {
        registrations: allProfiles.length,
        buyers,
        signupToPurchase: allProfiles.length ? buyers / allProfiles.length : 0,
      },
    };
  });

export type AdminUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  language: string;
  marketing_consent: boolean;
  marketing_consent_at: string | null;
  created_at: string;
  apps: number;
};

export const listAdminUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminUser[]> => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    const [{ data: profiles }, { data: entitlements }] = await Promise.all([
      admin
        .from("profiles")
        .select(
          "id, email, display_name, preferred_language, marketing_consent, marketing_consent_at, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(500),
      admin.from("entitlements").select("user_id").eq("is_active", true).is("revoked_at", null),
    ]);

    const counts = new Map<string, number>();
    for (const e of entitlements ?? []) counts.set(e.user_id, (counts.get(e.user_id) ?? 0) + 1);

    return (profiles ?? []).map((p: any) => ({
      id: p.id,
      email: p.email,
      display_name: p.display_name,
      language: p.preferred_language ?? "it",
      marketing_consent: !!p.marketing_consent,
      marketing_consent_at: p.marketing_consent_at,
      created_at: p.created_at,
      apps: counts.get(p.id) ?? 0,
    }));
  });

export type AdminCampaign = {
  id: string;
  subject: string;
  audience: string;
  language: string | null;
  status: string;
  recipients_count: number;
  sent_at: string | null;
  created_at: string;
  error_message: string | null;
};

export const listCampaigns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminCampaign[]> => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await (supabaseAdmin as any)
      .from("marketing_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    return (data ?? []) as AdminCampaign[];
  });

const EMAIL_RE = /^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/;

export type SendAnnouncementResult = { ok: boolean; recipients: number; error?: string };

/**
 * Explicit, manual campaign send. Nothing here runs automatically:
 * it is only triggered by an admin pressing "send" in the dashboard.
 */
export const sendNewAppAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      subject: string;
      htmlContent: string;
      audience: "all" | "it" | "en" | "category";
      categoryId?: string | null;
      productId?: string | null;
      senderEmail: string;
      senderName: string;
      dryRun?: boolean;
    }) => {
      if (!data.subject.trim() || data.subject.length > 200) throw new Error("Invalid subject");
      if (!data.htmlContent.trim() || data.htmlContent.length > 20000)
        throw new Error("Invalid content");
      if (!["all", "it", "en", "category"].includes(data.audience))
        throw new Error("Invalid audience");
      if (!EMAIL_RE.test(data.senderEmail)) throw new Error("Invalid sender email");
      if (!data.senderName.trim() || data.senderName.length > 80)
        throw new Error("Invalid sender name");
      return data;
    },
  )
  .handler(async ({ data, context }): Promise<SendAnnouncementResult> => {
    await assertAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;

    let query = admin
      .from("profiles")
      .select("id, email, display_name, marketing_language")
      .eq("marketing_consent", true)
      .not("email", "is", null);

    if (data.audience === "it") query = query.eq("marketing_language", "it");
    if (data.audience === "en") query = query.eq("marketing_language", "en");

    const { data: profiles, error } = await query;
    if (error) return { ok: false, recipients: 0, error: "query_failed" };

    let recipients = (profiles ?? []) as { id: string; email: string; display_name: string | null }[];

    // Category segmentation: keep only users owning a product of that category.
    if (data.audience === "category" && data.categoryId) {
      const { data: catProducts } = await admin
        .from("products")
        .select("id")
        .eq("category_id", data.categoryId);
      const productIds = (catProducts ?? []).map((p: any) => p.id);
      if (productIds.length === 0) recipients = [];
      else {
        const { data: ents } = await admin
          .from("entitlements")
          .select("user_id")
          .in("product_id", productIds)
          .eq("is_active", true)
          .is("revoked_at", null);
        const owners = new Set((ents ?? []).map((e: any) => e.user_id));
        recipients = recipients.filter((r) => owners.has(r.id));
      }
    }

    if (data.dryRun) return { ok: true, recipients: recipients.length };
    if (recipients.length === 0) return { ok: false, recipients: 0, error: "no_recipients" };

    const { data: campaign } = await admin
      .from("marketing_campaigns")
      .insert({
        created_by: context.userId,
        subject: data.subject,
        html_content: data.htmlContent,
        audience: data.audience,
        language: data.audience === "it" || data.audience === "en" ? data.audience : null,
        category_id: data.audience === "category" ? (data.categoryId ?? null) : null,
        product_id: data.productId ?? null,
        status: "sending",
      })
      .select("id")
      .single();

    try {
      const { sendBrevoAnnouncement, isBrevoConfigured } = await import("@/lib/brevo.server");
      if (!isBrevoConfigured()) throw new Error("Brevo is not connected");

      const sent = await sendBrevoAnnouncement({
        senderEmail: data.senderEmail,
        senderName: data.senderName,
        subject: data.subject,
        htmlContent: data.htmlContent,
        recipients: recipients.map((r) => ({ email: r.email, name: r.display_name })),
      });

      await admin
        .from("marketing_campaigns")
        .update({ status: "sent", recipients_count: sent, sent_at: new Date().toISOString() })
        .eq("id", campaign?.id);

      return { ok: true, recipients: sent };
    } catch (err) {
      const message = err instanceof Error ? err.message : "send_failed";
      await admin
        .from("marketing_campaigns")
        .update({ status: "failed", error_message: message.slice(0, 500) })
        .eq("id", campaign?.id);
      return { ok: false, recipients: 0, error: message };
    }
  });
