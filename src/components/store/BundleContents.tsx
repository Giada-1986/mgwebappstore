import { useI18n } from "@/lib/i18n";
import { productName, useBundleContents } from "@/lib/platform";

/** Lists the products a bundle contains. Purely informative. */
export function BundleContents({ bundleId }: { bundleId: string }) {
  const { t, lang } = useI18n();
  const { included, isLoading } = useBundleContents(bundleId);

  if (isLoading || included.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {t("store.bundleIncludes")}
      </p>
      <ul className="space-y-1 text-sm text-muted-foreground">
        {included.map((p) => (
          <li key={p.id} translate="no" className="notranslate">
            · {productName(p, lang)}
          </li>
        ))}
      </ul>
    </div>
  );
}
