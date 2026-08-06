import logoIt from "@/assets/logo-it.png.asset.json";
import logoEn from "@/assets/logo-en.png.asset.json";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function Logo({ className, priority = false }: { className?: string; priority?: boolean }) {
  const { lang, t } = useI18n();
  const asset = lang === "it" ? logoIt : logoEn;

  return (
    <img
      src={asset.url}
      alt={`${t("brand")} — ${t("tagline")}`}
      width={1024}
      height={1024}
      loading={priority ? "eager" : "lazy"}
      className={cn("rounded-2xl border border-gold/25 object-contain", className)}
    />

  );
}
