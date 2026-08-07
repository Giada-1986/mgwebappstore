import logoIt from "@/assets/logo-store-it.png.asset.json";
import logoEn from "@/assets/logo-store-en.png.asset.json";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Store-wide brand mark (MINI WEB APPS).
 * Not to be confused with the per-app logos (e.g. Fame o Fame?).
 * The asset itself is localised: the browser must never translate it.
 */
export function StoreLogo({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  const { lang, t } = useI18n();
  const asset = lang === "it" ? logoIt : logoEn;

  return (
    <img
      src={asset.url}
      alt={`${t("store.brand")} — ${t("store.tagline")}`}
      width={1024}
      height={1024}
      translate="no"
      loading={priority ? "eager" : "lazy"}
      className={cn("notranslate object-contain", className)}
    />
  );
}
