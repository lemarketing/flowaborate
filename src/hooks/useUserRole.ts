import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppRole = "host" | "guest" | "editor";

interface UserRoleInfo {
  roles: AppRole[];
  isHost: boolean;
  isGuest: boolean;
  isEditor: boolean;
  primaryRole: AppRole | null;
}

export function useUserRole(): UserRoleInfo & { isLoading: boolean } {
  const { user } = useAuth();

  const { data: roles, isLoading } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) throw error;
      return (data || []).map((r) => r.role as AppRole);
    },
    enabled: !!user,
  });

  const roleList = roles || [];

  return {
    roles: roleList,
    isHost: roleList.includes("host"),
    isGuest: roleList.includes("guest"),
    isEditor: roleList.includes("editor"),
    primaryRole: roleList[0] || null,
    isLoading,
  };
}
