import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

export { useSession } from "@/lib/platform";
