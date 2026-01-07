import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTasks } from "@/hooks/useTasks";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { TaskList } from "@/components/tasks/TaskList";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, User, Mail, Copy, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface CollaborationDetail {
  id: string;
  status: string;
  scheduled_date: string | null;
  prep_date: string | null;
  recorded_date: string | null;
  delivery_date: string | null;
  notes: string | null;
  invite_token: string | null;
  reschedule_count: number;
  created_at: string;
  workspace: {
    id: string;
    name: string;
  };
  guest_profile: {
    id: string;
    name: string;
    email: string;
    bio: string | null;
    headshot_url: string | null;
  } | null;
  host: {
    full_name: string | null;
  } | null;
}

export default function CollaborationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [collaboration, setCollaboration] = useState<CollaborationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: tasks, isLoading: tasksLoading } = useTasks(id);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    async function fetchCollaboration() {
      if (!id || !user) return;

      const { data, error: fetchError } = await supabase
        .from("collaborations")
        .select(`
          id,
          status,
          scheduled_date,
          prep_date,
          recorded_date,
          delivery_date,
          notes,
          invite_token,
          reschedule_count,
          created_at,
          workspace:workspaces(id, name),
          guest_profile:guest_profiles(id, name, email, bio, headshot_url),
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
        ...data,
        workspace: Array.isArray(data.workspace) ? data.workspace[0] : data.workspace,
        guest_profile: Array.isArray(data.guest_profile) ? data.guest_profile[0] : data.guest_profile,
        host: Array.isArray(data.host) ? data.host[0] : data.host,
      } as CollaborationDetail);
      setLoading(false);
    }

    if (!authLoading && user) {
      fetchCollaboration();
    }
  }, [id, user, authLoading]);

  const copyInviteLink = () => {
    if (!collaboration?.invite_token) return;
    const link = `${window.location.origin}/invite/${collaboration.invite_token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copied!",
      description: "Share this link with your guest.",
    });
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64" />
          <Skeleton className="h-96" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) return null;

  if (error || !collaboration) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard/collaborations")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Collaborations
          </Button>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{error || "Collaboration not found"}</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Button variant="ghost" onClick={() => navigate("/dashboard/collaborations")} className="mb-2 -ml-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-2xl font-bold text-foreground">
                {collaboration.guest_profile?.name || "Guest Pending"}
              </h1>
              <StatusBadge status={collaboration.status as any} />
            </div>
            <p className="mt-1 text-muted-foreground">
              {collaboration.workspace.name} • Created {format(new Date(collaboration.created_at), "MMMM d, yyyy")}
            </p>
          </div>
          {collaboration.invite_token && collaboration.status === "invited" && (
            <Button variant="outline" onClick={copyInviteLink}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Invite Link
            </Button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content - Tasks */}
          <div className="lg:col-span-2">
            <TaskList
              collaborationId={collaboration.id}
              tasks={tasks || []}
              isLoading={tasksLoading}
            />
          </div>

          {/* Sidebar - Details */}
          <div className="space-y-6">
            {/* Guest Info */}
            {collaboration.guest_profile && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Guest</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    {collaboration.guest_profile.headshot_url ? (
                      <img
                        src={collaboration.guest_profile.headshot_url}
                        alt={collaboration.guest_profile.name}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                        <User className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{collaboration.guest_profile.name}</p>
                      <p className="text-sm text-muted-foreground">{collaboration.guest_profile.email}</p>
                    </div>
                  </div>
                  {collaboration.guest_profile.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {collaboration.guest_profile.bio}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Schedule Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {collaboration.prep_date && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">Prep Session</p>
                    <p className="text-sm">{format(new Date(collaboration.prep_date), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                )}
                {collaboration.scheduled_date && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">Recording</p>
                    <p className="text-sm">{format(new Date(collaboration.scheduled_date), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                )}
                {collaboration.recorded_date && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">Recorded</p>
                    <p className="text-sm">{format(new Date(collaboration.recorded_date), "MMM d, yyyy")}</p>
                  </div>
                )}
                {collaboration.delivery_date && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">Delivery</p>
                    <p className="text-sm">{format(new Date(collaboration.delivery_date), "MMM d, yyyy")}</p>
                  </div>
                )}
                {!collaboration.scheduled_date && !collaboration.prep_date && (
                  <p className="text-sm text-muted-foreground">Not yet scheduled</p>
                )}
                {collaboration.reschedule_count > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Rescheduled {collaboration.reschedule_count} time{collaboration.reschedule_count > 1 ? "s" : ""}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {collaboration.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {collaboration.notes}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}