import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { formatPrice, useCategories } from "@/lib/platform";
import {
  type AdminProduct,
  type ProductInput,
  listAdminProducts,
  saveAdminProduct,
} from "@/lib/products.functions";

/**
 * Catalog editor. Everything the store renders (card, product page, price,
 * buy button) is generated from these rows, so publishing a new mini app
 * never requires a code change.
 *
 * The internal route / external URL saved here is only a link. Opening a mini
 * app is still authorised server-side against the user's active entitlement.
 */

const EMPTY: ProductInput = {
  id: null,
  slug: "",
  name_it: "",
  name_en: "",
  short_description_it: "",
  short_description_en: "",
  description_it: "",
  description_en: "",
  category_id: null,
  image_url: null,
  accent_color: null,
  price: 0,
  currency: "EUR",
  stripe_price_id: null,
  product_type: "mini_app",
  status: "draft",
  app_path: null,
  app_url: null,
  sort_order: 0,
};

export function ProductsPanel() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const { data: categories } = useCategories();
  const [draft, setDraft] = useState<ProductInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const products = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () => listAdminProducts(),
  });

  function edit(p: AdminProduct) {
    setFeedback(null);
    setDraft({ ...p });
  }

  function set<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await saveAdminProduct({ data: draft });
      if (res.ok) {
        setFeedback(t("store.admin.products.saved"));
        setDraft(null);
        await qc.invalidateQueries({ queryKey: ["admin", "products"] });
        await qc.invalidateQueries({ queryKey: ["products"] });
      } else {
        setFeedback(t("store.admin.products.saveFailed", { error: res.error ?? "" }));
      }
    } catch (err) {
      setFeedback(
        t("store.admin.products.saveFailed", {
          error: err instanceof Error ? err.message : "",
        }),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-7 space-y-5">
      <section className="card-store p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("store.admin.products.productsTitle")}</h2>
          <button
            type="button"
            onClick={() => {
              setFeedback(null);
              setDraft({ ...EMPTY });
            }}
            className="btn-store px-4 py-2 text-sm"
          >
            {t("store.admin.products.newProduct")}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {t("store.admin.products.visibilityNote")}
        </p>

        {products.isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : (products.data ?? []).length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            {t("store.admin.products.noProducts")}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border text-sm">
            {(products.data ?? []).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span translate="no" className="notranslate">
                  {lang === "en" ? p.name_en : p.name_it}
                  <span className="ml-2 text-xs text-muted-foreground">/{p.slug}</span>
                </span>
                <span className="flex items-center gap-3 text-muted-foreground">
                  <span>{formatPrice(Number(p.price), p.currency, lang)}</span>
                  <span className="rounded-full border border-border px-2.5 py-0.5 text-xs">
                    {t(`store.admin.products.status${statusKey(p.status)}`)}
                  </span>
                  <button
                    type="button"
                    onClick={() => edit(p)}
                    className="btn-store-ghost px-3 py-1 text-xs"
                  >
                    {t("store.admin.products.edit")}
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
        {feedback && <p className="mt-4 text-sm text-muted-foreground">{feedback}</p>}
      </section>

      {draft && (
        <section className="card-store space-y-4 p-6">
          <p className="text-xs text-muted-foreground">
            {t("store.admin.products.securityNote")}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("store.admin.products.fSlug")}>
              <input
                value={draft.slug}
                onChange={(e) => set("slug", e.target.value)}
                className="input-store mt-1.5"
                placeholder="nome-app"
              />
            </Field>
            <Field label={t("store.admin.products.fSort")}>
              <input
                type="number"
                value={draft.sort_order}
                onChange={(e) => set("sort_order", Number(e.target.value))}
                className="input-store mt-1.5"
              />
            </Field>
            <Field label={t("store.admin.products.fNameIt")}>
              <input
                value={draft.name_it}
                onChange={(e) => set("name_it", e.target.value)}
                className="input-store mt-1.5"
              />
            </Field>
            <Field label={t("store.admin.products.fNameEn")}>
              <input
                value={draft.name_en}
                onChange={(e) => set("name_en", e.target.value)}
                className="input-store mt-1.5"
              />
            </Field>
            <Field label={t("store.admin.products.fShortIt")}>
              <input
                value={draft.short_description_it}
                onChange={(e) => set("short_description_it", e.target.value)}
                className="input-store mt-1.5"
              />
            </Field>
            <Field label={t("store.admin.products.fShortEn")}>
              <input
                value={draft.short_description_en}
                onChange={(e) => set("short_description_en", e.target.value)}
                className="input-store mt-1.5"
              />
            </Field>
          </div>

          <Field label={t("store.admin.products.fDescIt")}>
            <textarea
              rows={5}
              value={draft.description_it}
              onChange={(e) => set("description_it", e.target.value)}
              className="input-store mt-1.5"
            />
          </Field>
          <Field label={t("store.admin.products.fDescEn")}>
            <textarea
              rows={5}
              value={draft.description_en}
              onChange={(e) => set("description_en", e.target.value)}
              className="input-store mt-1.5"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("store.admin.products.fCategory")}>
              <select
                value={draft.category_id ?? ""}
                onChange={(e) => set("category_id", e.target.value || null)}
                className="input-store mt-1.5"
              >
                <option value="">—</option>
                {(categories ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {lang === "en" ? c.name_en : c.name_it}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("store.admin.products.fImage")}>
              <input
                value={draft.image_url ?? ""}
                onChange={(e) => set("image_url", e.target.value || null)}
                className="input-store mt-1.5"
                placeholder="https://…"
              />
            </Field>
            <Field label={t("store.admin.products.fPrice")}>
              <input
                type="number"
                step="0.01"
                min="0"
                value={draft.price}
                onChange={(e) => set("price", Number(e.target.value))}
                className="input-store mt-1.5"
              />
            </Field>
            <Field label={t("store.admin.products.fCurrency")}>
              <input
                value={draft.currency}
                onChange={(e) => set("currency", e.target.value.toUpperCase())}
                maxLength={3}
                className="input-store mt-1.5"
              />
            </Field>
            <Field label={t("store.admin.products.fType")}>
              <select
                value={draft.product_type}
                onChange={(e) => set("product_type", e.target.value)}
                className="input-store mt-1.5"
              >
                <option value="mini_app">{t("store.admin.products.typeMini")}</option>
                <option value="premium_app">{t("store.admin.products.typePremium")}</option>
                <option value="professional_app">{t("store.admin.products.typePro")}</option>
              </select>
            </Field>
            <Field label={t("store.admin.products.fStatus")}>
              <select
                value={draft.status}
                onChange={(e) => set("status", e.target.value)}
                className="input-store mt-1.5"
              >
                <option value="draft">{t("store.admin.products.statusDraft")}</option>
                <option value="active">{t("store.admin.products.statusActive")}</option>
                <option value="hidden">{t("store.admin.products.statusHidden")}</option>
                <option value="coming_soon">{t("store.admin.products.statusComingSoon")}</option>
              </select>
            </Field>
            <Field label={t("store.admin.products.fStripe")}>
              <input
                translate="no"
                value={draft.stripe_price_id ?? ""}
                onChange={(e) => set("stripe_price_id", e.target.value || null)}
                className="notranslate input-store mt-1.5"
                placeholder="price_…"
              />
            </Field>
            <Field label={t("store.admin.products.fAccent")}>
              <input
                value={draft.accent_color ?? ""}
                onChange={(e) => set("accent_color", e.target.value || null)}
                className="input-store mt-1.5"
                placeholder="#c9a227"
              />
            </Field>
            <Field label={t("store.admin.products.fPath")}>
              <input
                value={draft.app_path ?? ""}
                onChange={(e) => set("app_path", e.target.value || null)}
                className="input-store mt-1.5"
                placeholder="/app/nome-app"
              />
            </Field>
            <Field label={t("store.admin.products.fUrl")}>
              <input
                value={draft.app_url ?? ""}
                onChange={(e) => set("app_url", e.target.value || null)}
                className="input-store mt-1.5"
                placeholder="https://…"
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={busy || !draft.slug.trim() || !draft.name_it.trim() || !draft.name_en.trim()}
              onClick={save}
              className="btn-store px-5 py-2 text-sm disabled:opacity-60"
            >
              {busy ? t("store.admin.products.saving") : t("store.admin.products.save")}
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="btn-store-ghost px-4 py-2 text-sm"
            >
              {t("store.admin.products.cancel")}
            </button>
            {feedback && <span className="text-sm text-muted-foreground">{feedback}</span>}
          </div>
        </section>
      )}
    </div>
  );
}

function statusKey(status: string) {
  if (status === "active") return "Active";
  if (status === "hidden") return "Hidden";
  if (status === "coming_soon") return "ComingSoon";
  return "Draft";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
