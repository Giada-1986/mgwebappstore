import { useI18n } from "@/lib/i18n";

export function LifetimeAccessBadge() {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
      {t("store.lifetime")}
    </span>
  );
}

export function PurchasedBadge() {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
      {t("store.owned")}
    </span>
  );
}

export function ProductTypeBadge({ type }: { type: string }) {
  const { t } = useI18n();
  const label =
    type === "premium_app"
      ? t("store.type.premium")
      : type === "professional_app"
        ? t("store.type.professional")
        : t("store.type.mini");
  return (
    <span className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
      {label}
    </span>
  );
}
