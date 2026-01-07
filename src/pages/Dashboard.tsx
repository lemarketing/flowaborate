import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCollaborationStats } from "@/hooks/useCollaborations";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Calendar, FileText, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useCollaborationStats();
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces();

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

        {/* Quick Actions & Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Your Next Action */}
          <Card>
            <CardHeader>
              <CardTitle>Your Next Action</CardTitle>
              <CardDescription>
                What needs your attention right now
              </CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Recent Collaborations */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Collaborations</CardTitle>
              <CardDescription>Your latest collaboration activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 font-medium text-foreground">No collaborations yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start by creating your first collaboration.
                </p>
              </div>
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
