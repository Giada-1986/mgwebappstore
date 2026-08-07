import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Marketing consent + Brevo synchronisation.
 *
 * Consent is always explicit and stored on the profile. Operational emails
 * (account verification, password reset, purchase information) are sent by the
 * platform regardless of this flag and are never gated by it.
 */

export type ConsentResult = { ok: boolean; synced: boolean; error?: string };

export const setMarketingConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { consent: boolean; language?: string }) => ({
    consent: !!data.consent,
    language: data.language === "en" ? "en" : "it",
  }))
  .handler(async ({ data, context }): Promise<ConsentResult> => {
    const { supabase, userId } = context;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, display_name, created_at")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !profile) return { ok: false, synced: false, error: "profile_not_found" };

    const patch = {
      marketing_consent: data.consent,
      marketing_consent_at: data.consent ? new Date().toISOString() : null,
      marketing_language: data.language,
    } as never;

    const { error: updateError } = await supabase.from("profiles").update(patch).eq("id", userId);
    if (updateError) return { ok: false, synced: false, error: "update_failed" };

    const email = profile.email;
    if (!email) return { ok: true, synced: false };

    try {
      const brevo = await import("@/lib/brevo.server");
      if (!brevo.isBrevoConfigured()) return { ok: true, synced: false, error: "brevo_not_configured" };

      if (data.consent) {
        // Owned products power Brevo segmentation; nothing sensitive is sent.
        const { data: entitlements } = await supabase
          .from("entitlements")
          .select("product_id, products(slug)")
          .eq("user_id", userId)
          .eq("is_active", true)
          .is("revoked_at", null);

        const products = (entitlements ?? [])
          .map((e: { products?: { slug?: string } | null }) => e.products?.slug)
          .filter((s): s is string => !!s);

        await brevo.upsertBrevoContact({
          email,
          userId,
          language: data.language,
          firstName: profile.display_name,
          signupDate: profile.created_at,
          products,
        });
      } else {
        await brevo.blacklistBrevoContact(email);
      }

      await supabase
        .from("profiles")
        .update({ brevo_synced_at: new Date().toISOString() } as never)
        .eq("id", userId);

      return { ok: true, synced: true };
    } catch (error) {
      console.error("[marketing] Brevo sync failed", error);
      return { ok: true, synced: false, error: "brevo_sync_failed" };
    }
  });
