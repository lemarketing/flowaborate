import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCollaborationStats, useCollaborationsNeedingAction } from "@/hooks/useCollaborations";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Calendar, FileText, CheckCircle2, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { WaitingOnBadge, getWaitingOnInfo } from "@/components/collaborations/WaitingOnBadge";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useCollaborationStats();
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const { data: needingAction, isLoading: actionLoading } = useCollaborationsNeedingAction();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const dashboardStats = [
    { label: "Active Collaborations", value: stats?.active ?? 0, icon: Users },
    { label: "Scheduled This Week", value: stats?.scheduled ?? 0, icon: Calendar },
    { label: "In Editing", value: stats?.editing ?? 0, icon: FileText },
    { label: "Completed", value: stats?.completed ?? 0, icon: CheckCircle2 },
  ];

  const hasWorkspaces = workspaces && workspaces.length > 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Welcome back{user.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Here's what's happening with your collaborations.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {dashboardStats.map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <div className="text-2xl font-bold">{stat.value}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions & Waiting On */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Waiting On Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Waiting On</CardTitle>
              <CardDescription>
                Who needs to take the next action
              </CardDescription>
            </CardHeader>
            <CardContent>
              {actionLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : needingAction && needingAction.length > 0 ? (
                <div className="space-y-3">
                  {needingAction.slice(0, 5).map((collab) => {
                    const info = getWaitingOnInfo(collab);
                    const workspace = Array.isArray(collab.workspace) ? collab.workspace[0] : collab.workspace;
                    const guestProfile = Array.isArray(collab.guest_profile) ? collab.guest_profile[0] : collab.guest_profile;
                    
                    return (
                      <Link
                        key={collab.id}
                        to={`/dashboard/collaborations/${collab.id}`}
                        className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {guestProfile?.name || "Guest Pending"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {workspace?.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <WaitingOnBadge collaboration={collab} />
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                    );
                  })}
                  {needingAction.length > 5 && (
                    <Button variant="ghost" className="w-full" asChild>
                      <Link to="/dashboard/collaborations">
                        View all {needingAction.length} active collaborations
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
                    <CheckCircle2 className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <h3 className="mt-4 font-medium text-foreground">All set for now</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {hasWorkspaces 
                      ? "No pending actions. Create a new collaboration to get started."
                      : "Create a workspace first, then invite guests."
                    }
                  </p>
                  <Button className="mt-4" asChild>
                    <Link to={hasWorkspaces ? "/dashboard/collaborations" : "/dashboard/workspaces"}>
                      <Plus className="mr-2 h-4 w-4" />
                      {hasWorkspaces ? "New Collaboration" : "Create Workspace"}
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Your Next Action */}
          <Card>
            <CardHeader>
              <CardTitle>Your Next Action</CardTitle>
              <CardDescription>
                What needs your attention right now
              </CardDescription>
            </CardHeader>
            <CardContent>
              {actionLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <Skeleton className="h-5 w-32 mt-4" />
                  <Skeleton className="h-4 w-48 mt-2" />
                </div>
              ) : (() => {
                // Find first collaboration waiting on host
                const hostAction = needingAction?.find((c) => {
                  const info = getWaitingOnInfo(c);
                  return info.waitingOn === "host";
                });
                
                if (hostAction) {
                  const info = getWaitingOnInfo(hostAction);
                  const workspace = Array.isArray(hostAction.workspace) ? hostAction.workspace[0] : hostAction.workspace;
                  const guestProfile = Array.isArray(hostAction.guest_profile) ? hostAction.guest_profile[0] : hostAction.guest_profile;
                  
                  return (
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                        <Calendar className="h-6 w-6 text-blue-600" />
                      </div>
                      <h3 className="mt-4 font-medium text-foreground">
                        {info.action}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {guestProfile?.name || "Guest"} • {workspace?.name}
                      </p>
                      <Button className="mt-4" asChild>
                        <Link to={`/dashboard/collaborations/${hostAction.id}`}>
                          View Collaboration
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  );
                }
                
                return (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="mt-4 font-medium text-foreground">All caught up!</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      No actions needed from you right now.
                    </p>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Getting Started Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Follow these steps to set up your first collaboration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <Link 
                to="/dashboard/workspaces" 
                className="rounded-lg border border-border p-4 transition-colors hover:bg-accent/50"
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${hasWorkspaces ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                  {hasWorkspaces ? "✓" : "1"}
                </div>
                <h4 className="mt-3 font-medium">Create a Workspace</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Set up your show or project workspace first.
                </p>
              </Link>
              <Link 
                to="/dashboard/collaborations" 
                className="rounded-lg border border-border p-4 transition-colors hover:bg-accent/50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                  2
                </div>
                <h4 className="mt-3 font-medium">Invite a Guest</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a collaboration and send an invite link.
                </p>
              </Link>
              <div className="rounded-lg border border-border p-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                  3
                </div>
                <h4 className="mt-3 font-medium">Track Progress</h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  Watch as the workflow guides everyone through.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
