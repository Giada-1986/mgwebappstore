import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  email: string | null;
  has_paid: boolean;
  language: string;
  onboarding_done: boolean;
  triggers: string[];
  trigger_other: string | null;
  created_at: string;
};

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

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading };
}

export function useProfile(userId?: string) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

export function useUpdateProfile(userId?: string) {
  const qc = useQueryClient();
  return async (patch: Partial<Profile>) => {
    if (!userId) return;
    const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
    if (error) throw error;
    await qc.invalidateQueries({ queryKey: ["profile", userId] });
  };
}

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
