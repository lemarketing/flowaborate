import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface GuestCollaboration {
  id: string;
  scheduled_date: string | null;
  prep_date: string | null;
  recorded_date: string | null;
  status: string;
  reschedule_count: number;
  workspace: {
    name: string;
    max_reschedules: number;
    reschedule_cutoff_hours: number;
  };
  host: {
    full_name: string | null;
  } | null;
}

export function useGuestCollaborations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["guest-collaborations", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // First get guest profiles for this user
      const { data: profiles } = await supabase
        .from("guest_profiles")
        .select("id")
        .eq("user_id", user.id);

      if (!profiles || profiles.length === 0) return [];

      const profileIds = profiles.map((p) => p.id);

      // Then get collaborations for those profiles
      const { data, error } = await supabase
        .from("collaborations")
        .select(`
          id,
          scheduled_date,
          prep_date,
          recorded_date,
          status,
          reschedule_count,
          workspace:workspaces(name, max_reschedules, reschedule_cutoff_hours),
          host:profiles!collaborations_host_id_fkey(full_name)
        `)
        .in("guest_profile_id", profileIds)
        .order("scheduled_date", { ascending: true, nullsFirst: false });

      if (error) throw error;

      return (data || []).map((item) => ({
        id: item.id,
        scheduled_date: item.scheduled_date,
        prep_date: item.prep_date,
        recorded_date: item.recorded_date,
        status: item.status,
        reschedule_count: item.reschedule_count || 0,
        workspace: Array.isArray(item.workspace) ? item.workspace[0] : item.workspace,
        host: Array.isArray(item.host) ? item.host[0] : item.host,
      })) as GuestCollaboration[];
    },
    enabled: !!user,
  });
}
