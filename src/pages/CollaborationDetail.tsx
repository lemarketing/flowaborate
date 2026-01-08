import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useUpdateCollaboration } from "@/hooks/useCollaborations";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { CollaborationTimeline } from "@/components/collaborations/CollaborationTimeline";
import { ResponsibilityPanel } from "@/components/responsibility/ResponsibilityPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Calendar, User, Copy, History } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getStatusOptions, type CollaborationStatus } from "@/lib/collaborationStateMachine";

interface CollaborationDetailData {
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
  updated_at: string;
  host_id: string;
  editor_id: string | null;
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
    user_id: string | null;
  } | null;
  host: {
    full_name: string | null;
  } | null;
}

const STATUS_OPTIONS = getStatusOptions();

export default function CollaborationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isHost, isEditor } = useUserRole();
  const { toast } = useToast();
  const updateCollaboration = useUpdateCollaboration();
  
  const [collaboration, setCollaboration] = useState<CollaborationDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          updated_at,
          host_id,
          editor_id,
          workspace:workspaces(id, name),
          guest_profile:guest_profiles(id, name, email, bio, headshot_url, user_id),
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
      } as CollaborationDetailData);
      setLoading(false);
    }

    if (!authLoading && user) {
      fetchCollaboration();
    }
  }, [id, user, authLoading]);

  // Determine user's role in this collaboration
  const isCollaborationHost = user && collaboration?.host_id === user.id;
  const isCollaborationEditor = user && collaboration?.editor_id === user.id;
  const isCollaborationGuest = user && collaboration?.guest_profile?.user_id === user.id;

  // Determine which role view to show
  const viewRole: "host" | "guest" | "editor" = 
    isCollaborationHost ? "host" :
    isCollaborationEditor ? "editor" :
    isCollaborationGuest ? "guest" :
    isHost ? "host" : // Fallback to user's general role
    isEditor ? "editor" : "guest";

  // Only hosts can change status
  const canChangeStatus = isCollaborationHost;

  const copyInviteLink = () => {
    if (!collaboration?.invite_token) return;
    const link = `${window.location.origin}/invite/${collaboration.invite_token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copied!",
      description: "Share this link with your guest.",
    });
  };

  const handleStatusChange = async (newStatus: CollaborationStatus) => {
    if (!collaboration || newStatus === collaboration.status || !canChangeStatus) return;

    const previousStatus = collaboration.status as CollaborationStatus;
    
    try {
      await updateCollaboration.mutateAsync({
        id: collaboration.id,
        status: newStatus,
        previousStatus,
      });

      setCollaboration((prev) => prev ? { ...prev, status: newStatus } : null);

      toast({
        title: "Status updated",
        description: `Collaboration status changed to ${STATUS_OPTIONS.find(s => s.value === newStatus)?.label}. Notifications sent.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64" />
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
              <StatusBadge status={collaboration.status as CollaborationStatus} />
            </div>
            <p className="mt-1 text-muted-foreground">
              {collaboration.workspace.name} • Created {format(new Date(collaboration.created_at), "MMMM d, yyyy")}
            </p>
          </div>
          {/* Host-only actions */}
          {canChangeStatus && (
            <div className="flex items-center gap-2">
              {collaboration.invite_token && collaboration.status === "invited" && (
                <Button variant="outline" onClick={copyInviteLink}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Invite Link
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Your Responsibility Panel - Role-specific */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your Responsibility</CardTitle>
            <CardDescription>
              What you need to do for this collaboration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsibilityPanel
              collaboration={{
                ...collaboration,
                workspace: collaboration.workspace,
                guest_profile: collaboration.guest_profile,
                host: collaboration.host,
              }}
              role={viewRole}
            />
          </CardContent>
        </Card>

        {/* Host-only: Status Change Control */}
        {canChangeStatus && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Update Status</CardTitle>
              <CardDescription>
                Change the collaboration status to notify the relevant party
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Select
                  value={collaboration.status}
                  onValueChange={handleStatusChange}
                  disabled={updateCollaboration.isPending}
                >
                  <SelectTrigger className="w-[240px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {updateCollaboration.isPending && (
                  <span className="text-sm text-muted-foreground">Updating...</span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Schedule Info - visible to all */}
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

            {/* Notes - Host only */}
            {collaboration.notes && canChangeStatus && (
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Guest Info - Host and Editor only */}
            {collaboration.guest_profile && (canChangeStatus || isCollaborationEditor) && (
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
                      {canChangeStatus && (
                        <p className="text-sm text-muted-foreground">{collaboration.guest_profile.email}</p>
                      )}
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

            {/* Timeline - All roles can see history */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Status History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CollaborationTimeline collaborationId={collaboration.id} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
