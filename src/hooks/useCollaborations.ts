import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";

export type Collaboration = Tables<"collaborations">;
export type CollaborationInsert = TablesInsert<"collaborations">;
export type CollaborationUpdate = TablesUpdate<"collaborations">;

export type CollaborationWithDetails = Collaboration & {
  workspace: Tables<"workspaces"> | null;
  guest_profile: Tables<"guest_profiles"> | null;
};

export function useCollaborations(workspaceId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["collaborations", user?.id, workspaceId],
    queryFn: async () => {
      let query = supabase
        .from("collaborations")
        .select(`
          *,
          workspace:workspaces(*),
          guest_profile:guest_profiles(*)
        `)
        .order("created_at", { ascending: false });

      if (workspaceId) {
        query = query.eq("workspace_id", workspaceId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as CollaborationWithDetails[];
    },
    enabled: !!user,
  });
}

export function useCollaboration(id: string | undefined) {
  return useQuery({
    queryKey: ["collaboration", id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from("collaborations")
        .select(`
          *,
          workspace:workspaces(*),
          guest_profile:guest_profiles(*)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as CollaborationWithDetails | null;
    },
    enabled: !!id,
  });
}

export function useCollaborationByToken(token: string | undefined) {
  return useQuery({
    queryKey: ["collaboration-token", token],
    queryFn: async () => {
      if (!token) return null;

      const { data, error } = await supabase
        .from("collaborations")
        .select(`
          *,
          workspace:workspaces(*)
        `)
        .eq("invite_token", token)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });
}

export function useCreateCollaboration() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      collaboration: Omit<CollaborationInsert, "host_id" | "invite_token">
    ) => {
      if (!user) throw new Error("Must be logged in");

      const { data, error } = await supabase
        .from("collaborations")
        .insert({
          ...collaboration,
          host_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Collaboration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborations"] });
    },
  });
}

export function useUpdateCollaboration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: CollaborationUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("collaborations")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Collaboration;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["collaborations"] });
      queryClient.invalidateQueries({ queryKey: ["collaboration", data.id] });
    },
  });
}

export function useCollaborationStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["collaboration-stats", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collaborations")
        .select("status");

      if (error) throw error;

      const stats = {
        active: 0,
        scheduled: 0,
        editing: 0,
        completed: 0,
      };

      data?.forEach((c) => {
        if (["invited", "intake_completed", "scheduled", "recorded"].includes(c.status)) {
          stats.active++;
        }
        if (c.status === "scheduled") {
          stats.scheduled++;
        }
        if (c.status === "editing") {
          stats.editing++;
        }
        if (c.status === "completed") {
          stats.completed++;
        }
      });

      return stats;
    },
    enabled: !!user,
  });
}
