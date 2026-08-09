import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { formatPrice, useCategories } from "@/lib/platform";
import {
  type AdminProduct,
  type ProductInput,
  deleteProductAsset,
  listAdminProducts,
  listBundleItems,
  listProductAssets,
  saveAdminProduct,
  saveProductAsset,
  setBundleItem,
  setProductStatus,
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
  access_mode: "paid",
  badge: null,
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

  /**
   * Quick lifecycle switch. Only the status column changes: purchases,
   * entitlements, gifts and Stripe are untouched.
   */
  async function changeStatus(p: AdminProduct, status: string) {
    setBusy(true);
    setFeedback(null);
    try {
      const res = await setProductStatus({ data: { id: p.id, status } });
      if (res.ok) {
        setFeedback(t("store.admin.products.saved"));
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
                <span className="flex flex-wrap items-center gap-2 text-muted-foreground">
                  <span>{formatPrice(Number(p.price), p.currency, lang)}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs ${statusTone(p.status)}`}>
                    {t(`store.admin.products.status${statusKey(p.status)}`)}
                  </span>
                  {p.status !== "paused" && p.status !== "archived" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => changeStatus(p, "paused")}
                      className="btn-store-ghost px-3 py-1 text-xs disabled:opacity-60"
                    >
                      {t("store.admin.products.pause")}
                    </button>
                  )}
                  {p.status !== "active" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => changeStatus(p, "active")}
                      className="btn-store-ghost px-3 py-1 text-xs disabled:opacity-60"
                    >
                      {t("store.admin.products.resume")}
                    </button>
                  )}
                  {p.status !== "archived" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => changeStatus(p, "archived")}
                      className="btn-store-ghost px-3 py-1 text-xs disabled:opacity-60"
                    >
                      {t("store.admin.products.archive")}
                    </button>
                  )}
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
                <option value="checklist">{t("store.admin.products.typeChecklist")}</option>
                <option value="template">{t("store.admin.products.typeTemplate")}</option>
                <option value="ebook">{t("store.admin.products.typeEbook")}</option>
                <option value="guide">{t("store.admin.products.typeGuide")}</option>
                <option value="bundle">{t("store.admin.products.typeBundle")}</option>
              </select>
            </Field>
            <Field label={t("store.admin.products.fAccessMode")}>
              <select
                value={draft.access_mode}
                onChange={(e) => set("access_mode", e.target.value)}
                className="input-store mt-1.5"
              >
                <option value="paid">{t("store.admin.products.accessPaid")}</option>
                <option value="free_account">{t("store.admin.products.accessFreeAccount")}</option>
                <option value="free_public">{t("store.admin.products.accessFreePublic")}</option>
              </select>
            </Field>
            <Field label={t("store.admin.products.fBadge")}>
              <input
                value={draft.badge ?? ""}
                onChange={(e) => set("badge", e.target.value || null)}
                maxLength={40}
                className="input-store mt-1.5"
              />
            </Field>
            <Field label={t("store.admin.products.fStatus")}>
              <select
                value={draft.status}
                onChange={(e) => set("status", e.target.value)}
                className="input-store mt-1.5"
              >
                <option value="draft">{t("store.admin.products.statusDraft")}</option>
                <option value="active">{t("store.admin.products.statusActive")}</option>
                <option value="paused">{t("store.admin.products.statusPaused")}</option>
                <option value="coming_soon">{t("store.admin.products.statusComingSoon")}</option>
                <option value="archived">{t("store.admin.products.statusArchived")}</option>
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

      {draft?.id && <AssetsEditor productId={draft.id} />}
      {draft?.id && draft.product_type === "bundle" && (
        <BundleEditor bundleId={draft.id} products={products.data ?? []} />
      )}
    </div>
  );
}

/** Files, PDFs, templates and links delivered with a product. */
function AssetsEditor({ productId }: { productId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [type, setType] = useState("pdf");
  const [title, setTitle] = useState("");
  const [storagePath, setStoragePath] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assets = useQuery({
    queryKey: ["admin", "assets", productId],
    queryFn: () => listProductAssets({ data: { productId } }),
  });

  async function add() {
    setBusy(true);
    setError(null);
    try {
      const res = await saveProductAsset({
        data: {
          id: null,
          product_id: productId,
          asset_type: type,
          storage_path: storagePath || null,
          external_url: url || null,
          title,
          sort_order: (assets.data ?? []).length,
          is_active: true,
        },
      });
      if (!res.ok) setError(res.error ?? "");
      else {
        setTitle("");
        setStoragePath("");
        setUrl("");
        await qc.invalidateQueries({ queryKey: ["admin", "assets", productId] });
        await qc.invalidateQueries({ queryKey: ["product-assets", productId] });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await deleteProductAsset({ data: { id } });
    await qc.invalidateQueries({ queryKey: ["admin", "assets", productId] });
    await qc.invalidateQueries({ queryKey: ["product-assets", productId] });
  }

  return (
    <section className="card-store space-y-4 p-6">
      <h3 className="text-base font-semibold">{t("store.admin.products.assetsTitle")}</h3>
      <p className="text-xs text-muted-foreground">{t("store.admin.products.assetsHint")}</p>

      {(assets.data ?? []).length > 0 && (
        <ul className="divide-y divide-border text-sm">
          {(assets.data ?? []).map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <span>
                {a.title || "—"}
                <span className="ml-2 text-xs text-muted-foreground">
                  {a.asset_type} · {a.storage_path ?? a.external_url ?? "—"}
                </span>
              </span>
              <button
                type="button"
                onClick={() => remove(a.id)}
                className="btn-store-ghost px-3 py-1 text-xs"
              >
                {t("store.admin.products.remove")}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("store.admin.products.fAssetType")}>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="input-store mt-1.5"
          >
            <option value="pdf">PDF</option>
            <option value="file">File</option>
            <option value="image">Image</option>
            <option value="template_url">Template URL</option>
            <option value="app_route">App route</option>
            <option value="external_url">External URL</option>
          </select>
        </Field>
        <Field label={t("store.admin.products.fAssetTitle")}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-store mt-1.5"
          />
        </Field>
        <Field label={t("store.admin.products.fAssetPath")}>
          <input
            value={storagePath}
            onChange={(e) => setStoragePath(e.target.value)}
            className="input-store mt-1.5"
            placeholder="slug/file.pdf"
          />
        </Field>
        <Field label={t("store.admin.products.fAssetUrl")}>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="input-store mt-1.5"
            placeholder="https://…"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || (!storagePath.trim() && !url.trim())}
          onClick={add}
          className="btn-store px-4 py-2 text-sm disabled:opacity-60"
        >
          {t("store.admin.products.addAsset")}
        </button>
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
    </section>
  );
}

/** Which products a bundle unlocks. The webhook expands this list server-side. */
function BundleEditor({ bundleId, products }: { bundleId: string; products: AdminProduct[] }) {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const items = useQuery({
    queryKey: ["admin", "bundle", bundleId],
    queryFn: () => listBundleItems({ data: { bundleId } }),
  });
  const included = new Set((items.data ?? []).map((i) => i.included_product_id));

  async function toggle(includedId: string, include: boolean) {
    await setBundleItem({ data: { bundleId, includedId, include } });
    await qc.invalidateQueries({ queryKey: ["admin", "bundle", bundleId] });
    await qc.invalidateQueries({ queryKey: ["bundle-contents", bundleId] });
  }

  return (
    <section className="card-store space-y-3 p-6">
      <h3 className="text-base font-semibold">{t("store.admin.products.bundleTitle")}</h3>
      <p className="text-xs text-muted-foreground">{t("store.admin.products.bundleHint")}</p>
      <ul className="divide-y divide-border text-sm">
        {products
          .filter((p) => p.id !== bundleId && p.product_type !== "bundle")
          .map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
              <span translate="no" className="notranslate">
                {lang === "en" ? p.name_en : p.name_it}
              </span>
              <input
                type="checkbox"
                checked={included.has(p.id)}
                onChange={(e) => toggle(p.id, e.target.checked)}
                className="h-4 w-4"
              />
            </li>
          ))}
      </ul>
    </section>
  );
}

function statusTone(status: string) {
  if (status === "active") return "border border-primary/40 bg-primary/10 text-primary";
  if (status === "paused") return "border border-amber-500/40 bg-amber-500/10 text-amber-600";
  if (status === "archived") return "border border-border bg-muted text-muted-foreground";
  return "border border-border text-muted-foreground";
}

function statusKey(status: string) {
  if (status === "active") return "Active";
  if (status === "paused") return "Paused";
  if (status === "coming_soon") return "ComingSoon";
  if (status === "archived") return "Archived";
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
