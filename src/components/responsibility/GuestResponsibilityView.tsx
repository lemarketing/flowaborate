import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, RefreshCw, CheckCircle2 } from "lucide-react";
import { format, isFuture, addHours, isBefore } from "date-fns";
import { ResponsibilityPanel, NoCollaborationsPanel } from "./ResponsibilityPanel";
import { getRoleActionInfo } from "@/lib/collaborationStateMachine";
import { useGuestCollaborations, GuestCollaboration } from "@/hooks/useGuestCollaborations";

export function GuestResponsibilityView() {
  const navigate = useNavigate();
  const { data: collaborations, isLoading } = useGuestCollaborations();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!collaborations || collaborations.length === 0) {
    return <NoCollaborationsPanel role="guest" />;
  }

  // Find collaborations requiring action
  const actionRequired = collaborations.filter((c) => {
    const info = getRoleActionInfo({ status: c.status }, "guest");
    return info.hasAction;
  });

  // Find upcoming scheduled sessions
  const upcomingSessions = collaborations.filter(
    (c) => c.scheduled_date && isFuture(new Date(c.scheduled_date)) && c.status === "scheduled"
  );

  // Priority: Show action items first, then upcoming session
  const primaryAction = actionRequired[0];
  const nextSession = upcomingSessions[0];

  return (
    <div className="space-y-6">
      {/* Primary action if any */}
      {primaryAction && (
        <section>
          <h3 className="font-medium text-foreground mb-3">Action Required</h3>
          <ResponsibilityPanel
            collaboration={{
              id: primaryAction.id,
              status: primaryAction.status,
              scheduled_date: primaryAction.scheduled_date,
              workspace: primaryAction.workspace,
              host: primaryAction.host,
            }}
            role="guest"
            // Guest actions typically happen via invite links, not direct navigation
          />
        </section>
      )}

      {/* Upcoming session card */}
      {nextSession && !primaryAction && (
        <section>
          <h3 className="font-medium text-foreground mb-3">Your Next Session</h3>
          <UpcomingSessionCard collaboration={nextSession} />
        </section>
      )}

      {/* All set state */}
      {!primaryAction && !nextSession && (
        <NoCollaborationsPanel role="guest" />
      )}

      {/* Additional upcoming sessions */}
      {upcomingSessions.length > 1 && (
        <section>
          <h3 className="font-medium text-foreground mb-3">Other Upcoming</h3>
          <div className="space-y-2">
            {upcomingSessions.slice(1, 4).map((session) => (
              <CompactSessionCard key={session.id} collaboration={session} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function UpcomingSessionCard({ collaboration }: { collaboration: GuestCollaboration }) {
  const navigate = useNavigate();
  const scheduledDate = new Date(collaboration.scheduled_date!);
  
  const cutoffTime = addHours(new Date(), collaboration.workspace.reschedule_cutoff_hours);
  const withinCutoff = isBefore(scheduledDate, cutoffTime);
  const maxReschedulesReached = collaboration.reschedule_count >= collaboration.workspace.max_reschedules;
  const canReschedule = !withinCutoff && !maxReschedulesReached;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="py-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">
              {format(scheduledDate, "EEEE, MMMM d")}
            </p>
            <p className="text-muted-foreground">
              {format(scheduledDate, "h:mm a")} • {collaboration.workspace.name}
            </p>
          </div>
        </div>

        {collaboration.prep_date && (
          <div className="mt-4 pt-3 border-t border-border flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Prep call: {format(new Date(collaboration.prep_date), "MMM d 'at' h:mm a")}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {canReschedule 
              ? `${collaboration.workspace.max_reschedules - collaboration.reschedule_count} reschedule(s) remaining`
              : maxReschedulesReached 
                ? "No reschedules remaining"
                : `Cannot reschedule within ${collaboration.workspace.reschedule_cutoff_hours}h`
            }
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!canReschedule}
            onClick={() => navigate(`/reschedule/${collaboration.id}`)}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reschedule
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CompactSessionCard({ collaboration }: { collaboration: GuestCollaboration }) {
  const scheduledDate = new Date(collaboration.scheduled_date!);
  
  return (
    <Card>
      <CardContent className="py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">{collaboration.workspace.name}</p>
            <p className="text-xs text-muted-foreground">
              {format(scheduledDate, "MMM d 'at' h:mm a")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
