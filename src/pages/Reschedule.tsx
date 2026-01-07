import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import GuestSchedulingForm from "@/components/guest/GuestSchedulingForm";
import { format } from "date-fns";

interface CollaborationData {
  id: string;
  workspace_id: string;
  scheduled_date: string | null;
  prep_date: string | null;
  reschedule_count: number;
  workspace: {
    name: string;
  };
  guest_profile: {
    name: string;
    email: string;
  } | null;
  host: {
    full_name: string | null;
  } | null;
}

export default function Reschedule() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [collaboration, setCollaboration] = useState<CollaborationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCollaboration() {
      if (!id || !user) return;

      const { data, error: fetchError } = await supabase
        .from("collaborations")
        .select(`
          id,
          workspace_id,
          scheduled_date,
          prep_date,
          reschedule_count,
          workspace:workspaces(name),
          guest_profile:guest_profiles(name, email),
          host:profiles!collaborations_host_id_fkey(full_name)
        `)
        .eq("id", id)
        .single();

      if (fetchError || !data) {
        setError("Collaboration not found or you don't have access.");
        setLoading(false);
        return;
      }

      setCollaboration({
        id: data.id,
        workspace_id: data.workspace_id,
        scheduled_date: data.scheduled_date,
        prep_date: data.prep_date,
        reschedule_count: data.reschedule_count || 0,
        workspace: Array.isArray(data.workspace) ? data.workspace[0] : data.workspace,
        guest_profile: Array.isArray(data.guest_profile) ? data.guest_profile[0] : data.guest_profile,
        host: Array.isArray(data.host) ? data.host[0] : data.host,
      });
      setLoading(false);
    }

    if (!authLoading && user) {
      fetchCollaboration();
    }
  }, [id, user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  if (error || !collaboration) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error || "Unable to load collaboration."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border py-4 px-4">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-semibold text-foreground">
            Reschedule - {collaboration.workspace.name}
          </h1>
          {collaboration.scheduled_date && (
            <p className="text-sm text-muted-foreground mt-1">
              Currently scheduled: {format(new Date(collaboration.scheduled_date), "EEEE, MMMM d 'at' h:mm a")}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 py-8">
        <GuestSchedulingForm
          collaborationId={collaboration.id}
          workspaceId={collaboration.workspace_id}
          guestEmail={collaboration.guest_profile?.email}
          guestName={collaboration.guest_profile?.name}
          hostName={collaboration.host?.full_name || undefined}
          workspaceName={collaboration.workspace.name}
          existingSchedule={{
            scheduled_date: collaboration.scheduled_date,
            prep_date: collaboration.prep_date,
            reschedule_count: collaboration.reschedule_count,
          }}
          onComplete={() => navigate("/dashboard")}
          isRescheduling={true}
        />
      </div>
    </div>
  );
}