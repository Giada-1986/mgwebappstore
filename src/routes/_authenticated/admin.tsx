import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { StoreShell } from "@/components/store/StoreShell";
import { ProductsPanel } from "@/components/store/admin/ProductsPanel";
import { useI18n } from "@/lib/i18n";
import { formatPrice, useCategories } from "@/lib/platform";
import {
  getAdminOverview,
  getIsAdmin,
  listAdminUsers,
  listCampaigns,
  sendNewAppAnnouncement,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Mini Web Apps" },
      { name: "description", content: "Dashboard riservata all'amministratore dello store." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Admin — Mini Web Apps" },
      { property: "og:description", content: "Area riservata." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

type Tab = "overview" | "products" | "users" | "sales" | "marketing" | "analytics";

function AdminPage() {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<Tab>("overview");

  // Authorisation is decided server-side; this only drives what we render.
  const access = useQuery({ queryKey: ["admin", "access"], queryFn: () => getIsAdmin() });
  const isAdmin = access.data?.isAdmin === true;

  const overview = useQuery({
    queryKey: ["admin", "overview"],
    enabled: isAdmin,
    queryFn: () => getAdminOverview(),
  });
  const users = useQuery({
    queryKey: ["admin", "users"],
    enabled: isAdmin && tab === "users",
    queryFn: () => listAdminUsers(),
  });
  const campaigns = useQuery({
    queryKey: ["admin", "campaigns"],
    enabled: isAdmin && tab === "marketing",
    queryFn: () => listCampaigns(),
  });

  if (access.isLoading) {
    return (
      <StoreShell>
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </StoreShell>
    );
  }

  if (!isAdmin) {
    return (
      <StoreShell>
        <h1 className="text-2xl font-semibold tracking-tight">{t("store.admin.title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("store.admin.denied")}</p>
      </StoreShell>
    );
  }

  const tabs: Tab[] = ["overview", "products", "users", "sales", "marketing", "analytics"];
  const o = overview.data;

  return (
    <StoreShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t("store.admin.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("store.admin.subtitle")}</p>

      <div className="mt-7 flex flex-wrap gap-1.5">
        {tabs.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-pressed={tab === key}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              tab === key
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(`store.admin.tabs.${key}`)}
          </button>
        ))}
      </div>

      {overview.isLoading && (
        <p className="mt-8 text-sm text-muted-foreground">{t("common.loading")}</p>
      )}

      {tab === "overview" && o && (
        <div className="mt-7 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label={t("store.admin.kpi.users")} value={o.users.total} />
            <Kpi label={t("store.admin.kpi.new7")} value={o.users.last7} />
            <Kpi label={t("store.admin.kpi.new30")} value={o.users.last30} />
            <Kpi label={t("store.admin.kpi.consent")} value={o.users.marketing} />
            <Kpi label={t("store.admin.kpi.sales")} value={o.purchases.count} />
            <Kpi
              label={t("store.admin.kpi.revenue")}
              value={formatPrice(o.purchases.revenue, o.purchases.currency, lang)}
            />
            <Kpi label={t("store.admin.kpi.activeProducts")} value={o.products.active} />
            <Kpi
              label={t("store.admin.kpi.conversion")}
              value={`${(o.funnel.signupToPurchase * 100).toFixed(1)}%`}
            />
          </div>

          <section className="card-store p-6">
            <h2 className="text-lg font-semibold">{t("store.admin.salesByProduct")}</h2>
            {o.salesByProduct.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">—</p>
            ) : (
              <ul className="mt-3 divide-y divide-border text-sm">
                {o.salesByProduct.map((s) => (
                  <li key={s.slug} className="flex items-center justify-between gap-4 py-2.5">
                    <span translate="no" className="notranslate">
                      {s.name}
                    </span>
                    <span className="text-muted-foreground">
                      {s.count} · {formatPrice(s.revenue, o.purchases.currency, lang)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === "sales" && o && (
        <section className="card-store mt-7 overflow-x-auto p-6">
          <h2 className="text-lg font-semibold">{t("store.admin.latestPurchases")}</h2>
          <table className="mt-4 w-full min-w-[560px] text-left text-sm">
            <thead className="text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="py-2">{t("store.admin.colEmail")}</th>
                <th className="py-2">{t("store.admin.colProduct")}</th>
                <th className="py-2">{t("store.admin.colAmount")}</th>
                <th className="py-2">{t("store.admin.colStatus")}</th>
                <th className="py-2">{t("store.admin.colDate")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {o.latestPurchases.map((p) => (
                <tr key={p.id}>
                  <td className="py-2.5">{p.email ?? "—"}</td>
                  <td className="py-2.5">{p.product}</td>
                  <td className="py-2.5">
                    {p.amount == null ? "—" : formatPrice(p.amount, p.currency, lang)}
                  </td>
                  <td className="py-2.5 text-muted-foreground">{p.status}</td>
                  <td className="py-2.5 text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString(lang === "en" ? "en-IE" : "it-IT")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === "users" && (
        <section className="card-store mt-7 overflow-x-auto p-6">
          <h2 className="text-lg font-semibold">{t("store.admin.usersTitle")}</h2>
          {users.isLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : (
            <table className="mt-4 w-full min-w-[620px] text-left text-sm">
              <thead className="text-xs uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="py-2">{t("store.admin.colEmail")}</th>
                  <th className="py-2">{t("store.admin.colLanguage")}</th>
                  <th className="py-2">{t("store.admin.colConsent")}</th>
                  <th className="py-2">{t("store.admin.colApps")}</th>
                  <th className="py-2">{t("store.admin.colDate")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(users.data ?? []).map((u) => (
                  <tr key={u.id}>
                    <td className="py-2.5">{u.email ?? "—"}</td>
                    <td translate="no" className="notranslate py-2.5 uppercase">
                      {u.language}
                    </td>
                    <td className="py-2.5">
                      {u.marketing_consent ? t("store.admin.yes") : t("store.admin.no")}
                    </td>
                    <td className="py-2.5">{u.apps}</td>
                    <td className="py-2.5 text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString(lang === "en" ? "en-IE" : "it-IT")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {tab === "products" && <ProductsPanel />}

      {tab === "marketing" && (
        <CampaignPanel campaigns={campaigns.data ?? []} loading={campaigns.isLoading} />
      )}

      {tab === "analytics" && (
        <section className="card-store mt-7 space-y-3 p-6 text-sm">
          <h2 className="text-lg font-semibold">{t("store.admin.analyticsTitle")}</h2>
          <p className="text-muted-foreground">{t("store.admin.analyticsText")}</p>
          <p className="text-muted-foreground">{t("store.admin.analyticsEvents")}</p>
          <p className="text-xs text-muted-foreground">{t("store.admin.analyticsPrivacy")}</p>
        </section>
      )}
    </StoreShell>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card-store p-5">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

type Campaign = Awaited<ReturnType<typeof listCampaigns>>[number];

function CampaignPanel({ campaigns, loading }: { campaigns: Campaign[]; loading: boolean }) {
  const { t, lang } = useI18n();
  const { data: categories } = useCategories();
  const [audience, setAudience] = useState<"all" | "it" | "en" | "category">("all");
  const [categoryId, setCategoryId] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [senderName, setSenderName] = useState("MINI WEB APPS");
  const [senderEmail, setSenderEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const payload = useMemo(
    () => ({
      subject,
      htmlContent: content,
      audience,
      categoryId: audience === "category" ? categoryId : null,
      senderName,
      senderEmail,
    }),
    [subject, content, audience, categoryId, senderName, senderEmail],
  );

  async function run(dryRun: boolean) {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await sendNewAppAnnouncement({ data: { ...payload, dryRun } });
      if (dryRun) setFeedback(t("store.admin.recipients", { count: res.recipients }));
      else if (res.ok) setFeedback(t("store.admin.sent", { count: res.recipients }));
      else setFeedback(t("store.admin.failed", { error: res.error ?? "" }));
    } catch (err) {
      setFeedback(t("store.admin.failed", { error: err instanceof Error ? err.message : "" }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-7 space-y-5">
      <section className="card-store space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">{t("store.admin.campaignTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("store.admin.campaignHint")}</p>
        </div>

        <label className="block text-sm">
          <span className="text-muted-foreground">{t("store.admin.audience")}</span>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as typeof audience)}
            className="input-store mt-1.5"
          >
            <option value="all">{t("store.admin.audienceAll")}</option>
            <option value="it">{t("store.admin.audienceIt")}</option>
            <option value="en">{t("store.admin.audienceEn")}</option>
            <option value="category">{t("store.admin.audienceCategory")}</option>
          </select>
        </label>

        {audience === "category" && (
          <label className="block text-sm">
            <span className="text-muted-foreground">{t("store.admin.category")}</span>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="input-store mt-1.5"
            >
              <option value="">—</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {lang === "en" ? c.name_en : c.name_it}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-muted-foreground">{t("store.admin.senderName")}</span>
            <input
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              maxLength={80}
              className="input-store mt-1.5"
            />
          </label>
          <label className="block text-sm">
            <span className="text-muted-foreground">{t("store.admin.senderEmail")}</span>
            <input
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              className="input-store mt-1.5"
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="text-muted-foreground">{t("store.admin.subject")}</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            className="input-store mt-1.5"
          />
        </label>

        <label className="block text-sm">
          <span className="text-muted-foreground">{t("store.admin.content")}</span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            maxLength={20000}
            className="input-store mt-1.5 font-mono text-xs"
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => run(true)}
            className="btn-store-ghost px-4 py-2 text-sm disabled:opacity-60"
          >
            {t("store.admin.preview")}
          </button>
          <button
            type="button"
            disabled={busy || !subject.trim() || !content.trim() || !senderEmail.trim()}
            onClick={() => run(false)}
            className="btn-store px-5 py-2 text-sm disabled:opacity-60"
          >
            {busy ? t("store.admin.sending") : t("store.admin.send")}
          </button>
          {feedback && <span className="text-sm text-muted-foreground">{feedback}</span>}
        </div>
      </section>

      <section className="card-store p-6">
        <h2 className="text-lg font-semibold">{t("store.admin.history")}</h2>
        {loading ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : campaigns.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("store.admin.noCampaigns")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {campaigns.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span>{c.subject}</span>
                <span className="text-muted-foreground">
                  {c.audience} · {c.recipients_count} · {c.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
