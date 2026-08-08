import logo from "@/assets/logo-store.png.asset.json";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Official MINI WEB APPS brand mark. Identical in every language:
 * the logo carries no slogan, so nothing inside it needs translating.
 */
export function StoreLogo({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  const { t } = useI18n();

  return (
    <img
      src={logo.url}
      alt={t("store.brand")}
      width={1024}
      height={1024}
      translate="no"
      loading={priority ? "eager" : "lazy"}
      className={cn("notranslate object-contain", className)}
    />
  );
}
