import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { type Product, type ProductAsset, useProductAssets } from "@/lib/platform";
import { getAssetDownloadUrl, getPublicAssetDownloadUrl } from "@/lib/library.functions";

/**
 * Renders the deliverables of a product (files, PDFs, templates, routes).
 *
 * Private files are never linked directly: the component asks the server for a
 * short-lived signed URL, and the server issues it only after checking the
 * entitlement (or that the product is explicitly free_public).
 */
export function ProductContents({ product }: { product: Product }) {
  const { t } = useI18n();
  const { data: assets, isLoading } = useProductAssets(product.id);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPublic = product.access_mode === "free_public";

  async function download(asset: ProductAsset) {
    setBusy(asset.id);
    setError(null);
    try {
      const res = isPublic
        ? await getPublicAssetDownloadUrl({ data: { assetId: asset.id } })
        : await getAssetDownloadUrl({ data: { assetId: asset.id } });
      if (res.ok && res.url) window.open(res.url, "_blank", "noopener,noreferrer");
      else setError(t("store.downloadFailed"));
    } catch {
      setError(t("store.downloadFailed"));
    } finally {
      setBusy(null);
    }
  }

  if (isLoading || !assets || assets.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {t("store.contents")}
      </p>
      <ul className="space-y-2">
        {assets.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm">{a.title || t("store.download")}</span>
            {a.storage_path ? (
              <button
                type="button"
                disabled={busy === a.id}
                onClick={() => download(a)}
                className="btn-store-ghost px-3 py-1 text-xs disabled:opacity-60"
              >
                {t("store.download")}
              </button>
            ) : a.external_url ? (
              <a
                href={a.external_url}
                {...(a.external_url.startsWith("http")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="btn-store-ghost px-3 py-1 text-xs"
              >
                {a.asset_type === "template_url" ? t("store.openTemplate") : t("store.open")}
              </a>
            ) : null}
          </li>
        ))}
      </ul>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
