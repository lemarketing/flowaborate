import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StatusHistoryEntry {
  id: string;
  collaboration_id: string;
  old_status: string | null;
  new_status: string;
  changed_by_user_id: string | null;
  changed_at: string;
  notes: string | null;
  changed_by_name?: string;
}

export const useStatusHistory = (collaborationId: string | undefined) => {
  return useQuery({
    queryKey: ["status-history", collaborationId],
    queryFn: async () => {
      if (!collaborationId) return [];
      
      const { data, error } = await supabase
        .from("collaboration_status_history")
        .select("*")
        .eq("collaboration_id", collaborationId)
        .order("changed_at", { ascending: false });

      if (error) throw error;
      
      // Fetch user names for changed_by_user_id
      const userIds = [...new Set(data?.filter(h => h.changed_by_user_id).map(h => h.changed_by_user_id) || [])];
      
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        
        profileMap = (profiles || []).reduce((acc, p) => {
          acc[p.user_id] = p.full_name || "Unknown";
          return acc;
        }, {} as Record<string, string>);
      }
      
      return (data || []).map(entry => ({
        ...entry,
        changed_by_name: entry.changed_by_user_id ? profileMap[entry.changed_by_user_id] || "System" : "System"
      })) as StatusHistoryEntry[];
    },
    enabled: !!collaborationId,
  });
};
