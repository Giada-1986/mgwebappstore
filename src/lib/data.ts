import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useProduct,
  useProductState,
  useSession,
  useUpdateProductState,
} from "@/lib/platform";

/** Data specific to the "Fame o Fame?" mini app. */

export const FAME_O_FAME_SLUG = "fame-o-fame";

export type Checkin = {
  id: string;
  user_id: string;
  created_at: string;
  hunger_type: string;
  emotion: string | null;
  note: string | null;
  action_chosen: string | null;
};

export type Exercise = {
  id: string;
  slug: string;
  title: string;
  title_en: string;
  instructions: string;
  instructions_en: string;
  duration_seconds: number;
  sort_order: number;
};

export type FameSettings = {
  triggers?: string[];
  trigger_other?: string | null;
};

export function useCheckins(userId?: string) {
  return useQuery({
    queryKey: ["checkins", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Checkin[]> => {
      const { data, error } = await supabase
        .from("checkins")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Checkin[];
    },
  });
}

export function useExercises() {
  return useQuery({
    queryKey: ["exercises"],
    queryFn: async (): Promise<Exercise[]> => {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Exercise[];
    },
  });
}

/** Per-user state of this mini app (onboarding + triggers), stored on the platform table. */
export function useFameState() {
  const { session } = useSession();
  const product = useProduct(FAME_O_FAME_SLUG);
  const userId = session?.user.id;
  const productId = product.data?.id;
  const state = useProductState(userId, productId);
  const updateState = useUpdateProductState(userId, productId);

  const settings = (state.data?.settings ?? {}) as FameSettings;

  return {
    userId,
    productId,
    state: state.data ?? null,
    settings,
    triggers: settings.triggers ?? [],
    triggerOther: settings.trigger_other ?? "",
    isLoading: product.isLoading || state.isLoading || !productId,
    updateState,
    updateSettings: async (patch: FameSettings) =>
      updateState({ settings: { ...settings, ...patch } as Record<string, unknown> }),
  };
}

export { useSession } from "@/lib/platform";
