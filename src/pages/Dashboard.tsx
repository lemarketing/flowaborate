import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCollaborationStats } from "@/hooks/useCollaborations";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useUserRole } from "@/hooks/useUserRole";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { HostResponsibilityView } from "@/components/responsibility/HostResponsibilityView";
import { EditorResponsibilityView } from "@/components/responsibility/EditorResponsibilityView";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, Calendar, FileText, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useCollaborationStats();
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const { isHost, isEditor, isLoading: roleLoading } = useUserRole();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading || roleLoading) {
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

  const hasWorkspaces = workspaces && workspaces.length > 0;

  const dashboardStats = [
    { label: "Active Collaborations", value: stats?.active ?? 0, icon: Users },
    { label: "Scheduled This Week", value: stats?.scheduled ?? 0, icon: Calendar },
    { label: "In Editing", value: stats?.editing ?? 0, icon: FileText },
    { label: "Completed", value: stats?.completed ?? 0, icon: CheckCircle2 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Welcome back{user.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {isHost && "Here's what needs your attention."}
            {isEditor && !isHost && "Here's what's ready for editing."}
          </p>
        </div>

        {/* Stats Grid - Host only */}
        {isHost && (
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
        )}

        {/* Role-based Responsibility View */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Your Responsibility</CardTitle>
              <CardDescription>
                What needs to happen next
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isHost && <HostResponsibilityView />}
              {isEditor && !isHost && <EditorResponsibilityView />}
            </CardContent>
          </Card>

          {/* Quick Actions - Host only */}
          {isHost && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks to get things moving</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasWorkspaces ? (
                  <>
                    <Button className="w-full justify-start" variant="outline" asChild>
                      <Link to="/dashboard/collaborations">
                        <Plus className="mr-2 h-4 w-4" />
                        Create New Collaboration
                      </Link>
                    </Button>
                    <Button className="w-full justify-start" variant="outline" asChild>
                      <Link to="/dashboard/workspaces">
                        <Users className="mr-2 h-4 w-4" />
                        Manage Workspaces
                      </Link>
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Create a workspace to get started
                    </p>
                    <Button asChild>
                      <Link to="/dashboard/workspaces">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Workspace
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
