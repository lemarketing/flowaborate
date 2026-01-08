import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useGuestCollaborations, GuestCollaboration } from "@/hooks/useGuestCollaborations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, Clock, RefreshCw, CheckCircle2, History, LogOut } from "lucide-react";
import { format, isPast, isFuture, addHours, isBefore } from "date-fns";
import flowaborateLogo from "@/assets/flowaborate-logo.svg";

export default function GuestDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const { data: collaborations, isLoading } = useGuestCollaborations();

  if (authLoading || isLoading) {
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

  // Split into upcoming and past
  const now = new Date();
  const upcoming = collaborations?.filter(
    (c) => c.scheduled_date && isFuture(new Date(c.scheduled_date))
  ) || [];
  const past = collaborations?.filter(
    (c) => c.scheduled_date && isPast(new Date(c.scheduled_date))
  ) || [];
  const pending = collaborations?.filter((c) => !c.scheduled_date) || [];

  // Get the next action item
  const nextSession = upcoming[0];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={flowaborateLogo} alt="Flowaborate" className="h-8" />
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* What's Next Section */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            What's Next
          </h2>

          {nextSession ? (
            <NextSessionCard collaboration={nextSession} />
          ) : pending.length > 0 ? (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="py-6 text-center">
                <p className="text-foreground font-medium">
                  You have {pending.length} session{pending.length > 1 ? "s" : ""} pending scheduling.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Check your email for invite links to complete scheduling.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50">
              <CardContent className="py-8 text-center">
                <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-foreground font-medium">All Set For Now</p>
                <p className="text-sm text-muted-foreground mt-1">
                  No upcoming sessions. You'll be notified when there's something new.
                </p>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Upcoming Sessions */}
        {upcoming.length > 1 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Upcoming Sessions
            </h2>
            <div className="space-y-3">
              {upcoming.slice(1).map((collab) => (
                <SessionCard key={collab.id} collaboration={collab} />
              ))}
            </div>
          </section>
        )}

        {/* Session History */}
        {past.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              Session History
            </h2>
            <div className="space-y-3">
              {past.map((collab) => (
                <SessionCard key={collab.id} collaboration={collab} isPast />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function NextSessionCard({ collaboration }: { collaboration: GuestCollaboration }) {
  const navigate = useNavigate();
  const scheduledDate = new Date(collaboration.scheduled_date!);
  
  // Check if can reschedule
  const cutoffTime = addHours(new Date(), collaboration.workspace.reschedule_cutoff_hours);
  const withinCutoff = isBefore(scheduledDate, cutoffTime);
  const maxReschedulesReached = collaboration.reschedule_count >= collaboration.workspace.max_reschedules;
  const canReschedule = !withinCutoff && !maxReschedulesReached;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">{collaboration.workspace.name}</CardTitle>
            <CardDescription>
              with {collaboration.host?.full_name || "Host"}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Upcoming
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-card rounded-lg p-4 border border-border">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {format(scheduledDate, "EEEE, MMMM d")}
              </p>
              <p className="text-muted-foreground">
                {format(scheduledDate, "h:mm a")}
              </p>
            </div>
          </div>

          {collaboration.prep_date && (
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Prep call: {format(new Date(collaboration.prep_date), "MMM d 'at' h:mm a")}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {canReschedule ? (
              <span>
                {collaboration.workspace.max_reschedules - collaboration.reschedule_count} reschedule
                {collaboration.workspace.max_reschedules - collaboration.reschedule_count !== 1 ? "s" : ""} remaining
              </span>
            ) : maxReschedulesReached ? (
              <span className="text-destructive">No reschedules remaining</span>
            ) : (
              <span className="text-amber-600">Cannot reschedule within {collaboration.workspace.reschedule_cutoff_hours}h</span>
            )}
          </div>
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

function SessionCard({ collaboration, isPast }: { collaboration: GuestCollaboration; isPast?: boolean }) {
  const navigate = useNavigate();
  const scheduledDate = collaboration.scheduled_date ? new Date(collaboration.scheduled_date) : null;

  // Check if can reschedule (only for future sessions)
  let canReschedule = false;
  if (!isPast && scheduledDate) {
    const cutoffTime = addHours(new Date(), collaboration.workspace.reschedule_cutoff_hours);
    const withinCutoff = isBefore(scheduledDate, cutoffTime);
    const maxReschedulesReached = collaboration.reschedule_count >= collaboration.workspace.max_reschedules;
    canReschedule = !withinCutoff && !maxReschedulesReached;
  }

  const getStatusBadge = () => {
    if (isPast) {
      if (collaboration.status === "completed" || collaboration.status === "delivered") {
        return <Badge variant="secondary" className="bg-green-100 text-green-700">Completed</Badge>;
      }
      return <Badge variant="secondary">Past</Badge>;
    }
    return null;
  };

  return (
    <Card className={isPast ? "opacity-75" : ""}>
      <CardContent className="py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isPast ? "bg-muted" : "bg-primary/10"}`}>
              <Calendar className={`h-5 w-5 ${isPast ? "text-muted-foreground" : "text-primary"}`} />
            </div>
            <div>
              <p className="font-medium text-foreground">{collaboration.workspace.name}</p>
              {scheduledDate && (
                <p className="text-sm text-muted-foreground">
                  {format(scheduledDate, "MMM d, yyyy 'at' h:mm a")}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {!isPast && canReschedule && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/reschedule/${collaboration.id}`)}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
