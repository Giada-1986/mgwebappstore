import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listAdminGifts, resendGiftEmail } from "@/lib/gift-admin.functions";
import { useI18n } from "@/lib/i18n";

/** Admin-only view of gifts in the current environment, with a safe resend action. */
export function GiftsPanel() {
  const { t } = useI18n();
  const gifts = useQuery({ queryKey: ["admin", "gifts"], queryFn: () => listAdminGifts() });
  const resend = useServerFn(resendGiftEmail);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, { ok: boolean; text: string }>>({});

  const onResend = async (id: string) => {
    if (!window.confirm(t("store.admin.gifts.confirm"))) return;
    setBusyId(id);
    try {
      const result = await resend({ data: { giftId: id } });
      setFeedback((f) => ({
        ...f,
        [id]: result.ok
          ? { ok: true, text: t("store.admin.gifts.accepted") }
          : {
              ok: false,
              text:
                result.reason === "already_redeemed"
                  ? t("store.admin.gifts.alreadyRedeemed")
                  : result.reason === "cooldown"
                    ? t("store.admin.gifts.cooldown")
                    : result.reason === "not_paid"
                      ? t("store.admin.gifts.notPaid")
                      : (result.detail ?? result.reason),
            },
      }));
      await gifts.refetch();
    } catch (error) {
      setFeedback((f) => ({
        ...f,
        [id]: { ok: false, text: error instanceof Error ? error.message : "error" },
      }));
    } finally {
      setBusyId(null);
    }
  };

  if (gifts.isLoading) return <p className="text-sm text-muted-foreground">{t("common.loading")}</p>;
  const rows = gifts.data ?? [];
  if (rows.length === 0)
    return <p className="text-sm text-muted-foreground">{t("store.admin.gifts.empty")}</p>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("store.admin.gifts.hint")}</p>
      {rows.map((g) => {
        const fb = feedback[g.id];
        return (
          <div key={g.id} className="rounded-2xl border border-border/70 bg-card/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{g.recipientEmail}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {g.productName} · {g.status} · {g.environment}
                  {g.emailSentAt ? ` · ${t("store.admin.gifts.sentAt")} ${new Date(g.emailSentAt).toLocaleString()}` : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={!g.canResend || busyId === g.id}
                onClick={() => onResend(g.id)}
                className="rounded-full border border-primary/40 px-4 py-1.5 text-sm text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busyId === g.id ? t("store.admin.gifts.sending") : t("store.admin.gifts.resend")}
              </button>
            </div>
            {fb ? (
              <p className={`mt-2 text-xs ${fb.ok ? "text-primary" : "text-destructive"}`}>
                {fb.text}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
