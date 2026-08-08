import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { StoreShell } from "@/components/store/StoreShell";
import { MyAppsGrid } from "@/components/store/MyAppsGrid";
import { ReceivedGifts } from "@/components/store/ReceivedGifts";
import { useI18n } from "@/lib/i18n";
import { track } from "@/lib/analytics";
import { useMyApps, useSession } from "@/lib/platform";

export const Route = createFileRoute("/_authenticated/my-apps")({
  head: () => ({
    meta: [
      { title: "Le mie app — Mini Apps Store" },
      { name: "description", content: "La tua libreria personale di mini app sbloccate." },
      { property: "og:title", content: "Le mie app — Mini Apps Store" },
      { property: "og:description", content: "Tutte le mini app che hai sbloccato." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MyAppsPage,
});

function MyAppsPage() {
  const { t } = useI18n();
  const { session } = useSession();
  const { apps, isLoading, isAdminOnly } = useMyApps(session?.user.id);

  // The purchase is confirmed server-side by the webhook; this only reports it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const slug = new URLSearchParams(window.location.search).get("purchase");
    if (slug && apps.some((a) => a.slug === slug)) track("purchase_completed", { product: slug });
  }, [apps]);


  return (
    <StoreShell>
      <h1 className="text-3xl font-semibold tracking-tight">{t("store.myAppsTitle")}</h1>
      <p className="mt-2 text-muted-foreground">{t("store.myAppsText")}</p>
      <div className="mt-8">
        <ReceivedGifts />
        {isLoading ? (
          <p className="text-muted-foreground">{t("common.loading")}</p>
        ) : (
          <MyAppsGrid apps={apps} isAdminOnly={isAdminOnly} />
        )}
      </div>
    </StoreShell>
  );
}
