import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ResponsibilityPanel, NoCollaborationsPanel } from "./ResponsibilityPanel";
import { detectExceptions, getStatusInfo, isTerminalStatus } from "@/lib/collaborationStateMachine";
import { useCollaborationsNeedingAction } from "@/hooks/useCollaborations";
import { useWorkspaces } from "@/hooks/useWorkspaces";

export function HostResponsibilityView() {
  const { data: collaborations, isLoading } = useCollaborationsNeedingAction();
  const { data: workspaces } = useWorkspaces();
  
  const hasWorkspaces = workspaces && workspaces.length > 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  // Separate into actions, exceptions, and waiting
  const hostActions: typeof collaborations = [];
  const exceptions: typeof collaborations = [];
  const waiting: typeof collaborations = [];

  collaborations?.forEach((collab) => {
    const exception = detectExceptions(collab);
    const statusInfo = getStatusInfo(collab);
    
    if (exception) {
      exceptions.push(collab);
    } else if (statusInfo.waitingOn === "host") {
      hostActions.push(collab);
    } else if (!isTerminalStatus(collab.status as any)) {
      waiting.push(collab);
    }
  });

  const hasContent = hostActions.length > 0 || exceptions.length > 0 || waiting.length > 0;

  return (
    <div className="space-y-6">
      {/* Exceptions first - these need attention */}
      {exceptions.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h3 className="font-medium text-foreground">Needs Attention</h3>
          </div>
          <div className="space-y-3">
            {exceptions.map((collab) => {
              const workspace = Array.isArray(collab.workspace) ? collab.workspace[0] : collab.workspace;
              const guestProfile = Array.isArray(collab.guest_profile) ? collab.guest_profile[0] : collab.guest_profile;
              
              return (
                <ResponsibilityPanel
                  key={collab.id}
                  collaboration={{
                    ...collab,
                    workspace,
                    guest_profile: guestProfile,
                  }}
                  role="host"
                  linkTo={`/dashboard/collaborations/${collab.id}`}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Your actions */}
      {hostActions.length > 0 && (
        <section>
          <h3 className="font-medium text-foreground mb-3">Your Next Action</h3>
          <div className="space-y-3">
            {hostActions.slice(0, 3).map((collab) => {
              const workspace = Array.isArray(collab.workspace) ? collab.workspace[0] : collab.workspace;
              const guestProfile = Array.isArray(collab.guest_profile) ? collab.guest_profile[0] : collab.guest_profile;
              
              return (
                <ResponsibilityPanel
                  key={collab.id}
                  collaboration={{
                    ...collab,
                    workspace,
                    guest_profile: guestProfile,
                  }}
                  role="host"
                  linkTo={`/dashboard/collaborations/${collab.id}`}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Waiting on others - condensed view */}
      {waiting.length > 0 && (
        <section>
          <h3 className="font-medium text-foreground mb-3">Waiting On Others</h3>
          <Card>
            <CardContent className="py-4">
              <div className="space-y-3">
                {waiting.slice(0, 5).map((collab) => {
                  const workspace = Array.isArray(collab.workspace) ? collab.workspace[0] : collab.workspace;
                  const guestProfile = Array.isArray(collab.guest_profile) ? collab.guest_profile[0] : collab.guest_profile;
                  const statusInfo = getStatusInfo(collab);
                  
                  return (
                    <Link
                      key={collab.id}
                      to={`/dashboard/collaborations/${collab.id}`}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {guestProfile?.name || "Guest Pending"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {workspace?.name}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground ml-3">
                        Waiting on {statusInfo.label}
                      </span>
                    </Link>
                  );
                })}
                {waiting.length > 5 && (
                  <Button variant="ghost" size="sm" className="w-full" asChild>
                    <Link to="/dashboard/collaborations">
                      View all {waiting.length} waiting
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Empty state */}
      {!hasContent && (
        <div className="space-y-4">
          <NoCollaborationsPanel role="host" />
          <div className="text-center">
            <Button asChild>
              <Link to={hasWorkspaces ? "/dashboard/collaborations" : "/dashboard/workspaces"}>
                <Plus className="mr-2 h-4 w-4" />
                {hasWorkspaces ? "New Collaboration" : "Create Workspace"}
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
