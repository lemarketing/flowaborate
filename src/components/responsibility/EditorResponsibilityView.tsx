import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit3, Clock } from "lucide-react";
import { ResponsibilityPanel, NoCollaborationsPanel } from "./ResponsibilityPanel";
import { getRoleActionInfo } from "@/lib/collaborationStateMachine";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface EditorCollaboration {
  id: string;
  status: string;
  recorded_date: string | null;
  workspace: { name: string } | null;
  guest_profile: { name: string } | null;
}

export function EditorResponsibilityView() {
  const { user } = useAuth();
  
  const { data: collaborations, isLoading } = useQuery({
    queryKey: ["editor-collaborations", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("collaborations")
        .select(`
          id,
          status,
          recorded_date,
          workspace:workspaces(name),
          guest_profile:guest_profiles(name)
        `)
        .eq("editor_id", user.id)
        .not("status", "in", '("completed","cancelled")')
        .order("recorded_date", { ascending: true });

      if (error) throw error;

      return (data || []).map((item) => ({
        id: item.id,
        status: item.status,
        recorded_date: item.recorded_date,
        workspace: Array.isArray(item.workspace) ? item.workspace[0] : item.workspace,
        guest_profile: Array.isArray(item.guest_profile) ? item.guest_profile[0] : item.guest_profile,
      })) as EditorCollaboration[];
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!collaborations || collaborations.length === 0) {
    return <NoCollaborationsPanel role="editor" />;
  }

  // Separate into actions and waiting
  const needsEditing = collaborations.filter((c) => {
    const info = getRoleActionInfo({ status: c.status }, "editor");
    return info.hasAction;
  });

  const waitingForRecording = collaborations.filter((c) => {
    return ["invited", "intake_completed", "scheduled"].includes(c.status);
  });

  return (
    <div className="space-y-6">
      {/* Items needing editing */}
      {needsEditing.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Edit3 className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-foreground">Ready for Editing</h3>
          </div>
          <div className="space-y-3">
            {needsEditing.map((collab) => (
              <ResponsibilityPanel
                key={collab.id}
                collaboration={collab}
                role="editor"
                linkTo={`/dashboard/collaborations/${collab.id}`}
              />
            ))}
          </div>
        </section>
      )}

      {/* Waiting for recording */}
      {waitingForRecording.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium text-foreground">Upcoming</h3>
          </div>
          <Card>
            <CardContent className="py-4">
              <div className="space-y-2">
                {waitingForRecording.map((collab) => (
                  <Link
                    key={collab.id}
                    to={`/dashboard/collaborations/${collab.id}`}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {collab.guest_profile?.name || "Guest"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {collab.workspace?.name}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Awaiting recording
                    </span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* All done */}
      {needsEditing.length === 0 && waitingForRecording.length === 0 && (
        <NoCollaborationsPanel role="editor" />
      )}
    </div>
  );
}
