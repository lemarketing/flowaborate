import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Collaborations() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">Collaborations</h1>
            <p className="mt-1 text-muted-foreground">
              Manage all your guest collaborations in one place.
            </p>
          </div>
          <Button asChild>
            <Link to="/dashboard/collaborations/new">
              <Plus className="mr-2 h-4 w-4" />
              New Collaboration
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-6 text-lg font-medium text-foreground">No collaborations yet</h3>
            <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
              Create your first collaboration to invite a guest and start the workflow.
            </p>
            <Button className="mt-6" asChild>
              <Link to="/dashboard/collaborations/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Collaboration
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
