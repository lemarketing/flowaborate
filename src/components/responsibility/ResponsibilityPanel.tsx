import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  AlertTriangle,
  Calendar,
  Edit3,
  Send,
  FileText,
  User
} from "lucide-react";
import { 
  getRoleActionInfo, 
  detectExceptions,
  type CollaborationException 
} from "@/lib/collaborationStateMachine";

interface CollaborationData {
  id: string;
  status: string;
  scheduled_date?: string | null;
  recorded_date?: string | null;
  created_at?: string;
  updated_at?: string;
  guest_profile_id?: string | null;
  workspace?: { name: string } | null;
  guest_profile?: { name: string; email?: string } | null;
  host?: { full_name: string | null } | null;
}

interface ResponsibilityPanelProps {
  collaboration: CollaborationData;
  role: "host" | "guest" | "editor";
  linkTo?: string;
}

const getActionIcon = (status: string, role: string) => {
  if (role === "guest") {
    if (status === "invited") return User;
    if (status === "intake_completed") return Calendar;
    return Clock;
  }
  if (role === "host") {
    if (status === "scheduled") return Calendar;
    if (status === "ready") return Send;
    return Clock;
  }
  if (role === "editor") {
    if (["recorded", "editing"].includes(status)) return Edit3;
    return Clock;
  }
  return FileText;
};

export function ResponsibilityPanel({ collaboration, role, linkTo }: ResponsibilityPanelProps) {
  const actionInfo = getRoleActionInfo(collaboration, role);
  const exception = role === "host" ? detectExceptions(collaboration) : null;
  
  const workspaceName = collaboration.workspace?.name || "Collaboration";
  const guestName = collaboration.guest_profile?.name || "Guest";
  const hostName = collaboration.host?.full_name || "Host";
  
  const contextLabel = role === "guest" 
    ? `${workspaceName} with ${hostName}`
    : `${guestName} • ${workspaceName}`;

  const Icon = getActionIcon(collaboration.status, role);

  // Action required state
  if (actionInfo.hasAction) {
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{actionInfo.actionTitle}</CardTitle>
              <CardDescription>{contextLabel}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {actionInfo.actionDescription}
          </p>
          {linkTo && (
            <Button asChild className="w-full">
              <Link to={linkTo}>
                Take Action
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Exception state (host only)
  if (exception) {
    return (
      <ExceptionAlert 
        exception={exception} 
        contextLabel={contextLabel}
        linkTo={linkTo}
      />
    );
  }

  // Waiting state
  if (actionInfo.waitingOnLabel) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-foreground">{actionInfo.waitingOnLabel}</p>
              <p className="text-sm text-muted-foreground">{contextLabel}</p>
            </div>
            {linkTo && (
              <Button variant="ghost" size="sm" asChild>
                <Link to={linkTo}>
                  View
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // All done state
  return (
    <Card className="border-green-200 bg-green-50/50">
      <CardContent className="py-6">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-foreground">All Done!</p>
            <p className="text-sm text-muted-foreground">{contextLabel}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ExceptionAlert({ 
  exception, 
  contextLabel,
  linkTo 
}: { 
  exception: CollaborationException; 
  contextLabel: string;
  linkTo?: string;
}) {
  const isError = exception.severity === "error";
  
  return (
    <Card className={isError ? "border-destructive/50 bg-destructive/5" : "border-amber-200 bg-amber-50/50"}>
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
            isError ? "bg-destructive/10" : "bg-amber-100"
          }`}>
            <AlertTriangle className={`h-5 w-5 ${isError ? "text-destructive" : "text-amber-600"}`} />
          </div>
          <div className="flex-1">
            <p className={`font-medium ${isError ? "text-destructive" : "text-amber-700"}`}>
              {exception.message}
            </p>
            <p className="text-sm text-muted-foreground">{contextLabel}</p>
          </div>
          {linkTo && (
            <Button variant={isError ? "destructive" : "outline"} size="sm" asChild>
              <Link to={linkTo}>
                Resolve
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Empty state for when there are no collaborations
export function NoCollaborationsPanel({ role }: { role: "host" | "guest" | "editor" }) {
  const messages = {
    host: {
      title: "All Set For Now",
      description: "No pending actions. Create a new collaboration to get started.",
    },
    guest: {
      title: "All Set For Now",
      description: "No upcoming sessions. You'll be notified when there's something new.",
    },
    editor: {
      title: "All Set For Now",
      description: "No content waiting for editing.",
    },
  };

  const { title, description } = messages[role];

  return (
    <Card className="border-border/50">
      <CardContent className="py-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mx-auto">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="mt-4 font-medium text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
