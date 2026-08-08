import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { listReceivedGifts, redeemReceivedGift } from "@/lib/gifts.functions";

/**
 * Second delivery channel for gifts: any account whose email matches the
 * recipient email of a PAID gift sees it here, even if the email never
 * arrived. Redemption still goes through the same single-use server check.
 */
export function ReceivedGifts() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const fetchGifts = useServerFn(listReceivedGifts);
  const redeem = useServerFn(redeemReceivedGift);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: gifts } = useQuery({
    queryKey: ["received-gifts"],
    queryFn: () => fetchGifts({ data: undefined }),
    staleTime: 0,
  });

  if (!gifts?.length) return null;

  const onRedeem = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await redeem({ data: { giftId: id } });
      if (res.ok) {
        await qc.invalidateQueries();
      } else {
        setError(res.reason);
      }
    } catch {
      setError("error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="card-store mb-8 p-6">
      <h2 className="text-xl font-semibold tracking-tight">{t("store.gift.inboxTitle")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("store.gift.inboxIntro")}</p>

      <ul className="mt-5 space-y-4">
        {gifts.map((gift) => (
          <li key={gift.id} className="rounded-xl border border-border/60 p-4">
            <p className="font-medium">{(lang === "en" ? gift.nameEn : gift.nameIt) ?? "—"}</p>
            {gift.giftMessage ? (
              <blockquote className="mt-2 whitespace-pre-wrap break-words border-l-2 border-primary/50 pl-3 text-sm text-muted-foreground">
                {gift.giftMessage}
              </blockquote>
            ) : null}
            <button
              type="button"
              className="btn-store mt-4"
              disabled={busyId === gift.id}
              onClick={() => onRedeem(gift.id)}
            >
              {t("store.gift.redeem")}
            </button>
          </li>
        ))}
      </ul>

      {error ? <p className="mt-4 text-destructive">{t(`store.gift.${error}`)}</p> : null}
    </section>
  );
}
