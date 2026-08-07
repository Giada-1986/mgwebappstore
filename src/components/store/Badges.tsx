import { useI18n } from "@/lib/i18n";

export function LifetimeAccessBadge() {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center rounded-full border border-primary/40 bg-primary/12 px-3 py-1 text-xs font-medium tracking-wide text-accent-foreground">
      {t("store.lifetime")}
    </span>
  );
}

export function PurchasedBadge() {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
      {t("store.owned")}
    </span>
  );
}

export function FreeBadge() {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center rounded-full border border-primary/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
      {t("store.freeAccess")}
    </span>
  );
}

/** Free-form label the admin can attach to a product (e.g. "Novità"). */
export function CustomBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
      {label}
    </span>
  );
}

const TYPE_KEYS: Record<string, string> = {
  mini_app: "store.type.mini",
  premium_app: "store.type.premium",
  professional_app: "store.type.professional",
  checklist: "store.type.checklist",
  template: "store.type.template",
  ebook: "store.type.ebook",
  guide: "store.type.guide",
  bundle: "store.type.bundle",
};

export function ProductTypeBadge({ type }: { type: string }) {
  const { t } = useI18n();
  return (
    <span className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
      {t(TYPE_KEYS[type] ?? "store.type.mini")}
    </span>
  );
}
