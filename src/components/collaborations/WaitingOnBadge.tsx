import { Badge } from "@/components/ui/badge";
import { User, Clock, CheckCircle2 } from "lucide-react";

export type WaitingOn = "guest" | "host" | "editor" | "none";

export interface WaitingOnInfo {
  waitingOn: WaitingOn;
  label: string;
  action: string;
}

export function getWaitingOnInfo(collaboration: {
  status: string;
  guest_profile_id?: string | null;
  scheduled_date?: string | null;
  recorded_date?: string | null;
  delivery_date?: string | null;
}): WaitingOnInfo {
  const status = collaboration.status;

  // Invited - waiting on guest to complete intake
  if (status === "invited") {
    return {
      waitingOn: "guest",
      label: "Guest",
      action: "Complete intake form",
    };
  }

  // Intake completed - waiting on guest to schedule
  if (status === "intake_completed" && !collaboration.scheduled_date) {
    return {
      waitingOn: "guest",
      label: "Guest",
      action: "Schedule recording",
    };
  }

  // Scheduled - waiting for the recording to happen
  if (status === "scheduled") {
    if (!collaboration.recorded_date) {
      return {
        waitingOn: "host",
        label: "Host",
        action: "Complete recording",
      };
    }
  }

  // Recorded - waiting on editor to edit
  if (status === "recorded") {
    return {
      waitingOn: "editor",
      label: "Editor",
      action: "Complete editing",
    };
  }

  // Editing - still in progress
  if (status === "editing") {
    return {
      waitingOn: "editor",
      label: "Editor",
      action: "Finish editing",
    };
  }

  // Edited - waiting on host to review/approve
  if (status === "edited") {
    return {
      waitingOn: "host",
      label: "Host",
      action: "Review & approve",
    };
  }

  // Ready to publish - waiting on host
  if (status === "ready_to_publish") {
    return {
      waitingOn: "host",
      label: "Host",
      action: "Publish content",
    };
  }

  // Completed or delivered
  if (status === "completed" || status === "delivered") {
    return {
      waitingOn: "none",
      label: "Complete",
      action: "All done!",
    };
  }

  // Default fallback
  return {
    waitingOn: "none",
    label: "All Set",
    action: "No action needed",
  };
}

interface WaitingOnBadgeProps {
  collaboration: {
    status: string;
    guest_profile_id?: string | null;
    scheduled_date?: string | null;
    recorded_date?: string | null;
    delivery_date?: string | null;
  };
  showAction?: boolean;
}

export function WaitingOnBadge({ collaboration, showAction = false }: WaitingOnBadgeProps) {
  const info = getWaitingOnInfo(collaboration);

  const getVariantStyles = () => {
    switch (info.waitingOn) {
      case "guest":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "host":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "editor":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "none":
        return "bg-green-100 text-green-800 border-green-200";
    }
  };

  const getIcon = () => {
    switch (info.waitingOn) {
      case "guest":
        return <User className="h-3 w-3" />;
      case "host":
        return <Clock className="h-3 w-3" />;
      case "editor":
        return <Clock className="h-3 w-3" />;
      case "none":
        return <CheckCircle2 className="h-3 w-3" />;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={`${getVariantStyles()} flex items-center gap-1`}>
        {getIcon()}
        <span>Waiting on {info.label}</span>
      </Badge>
      {showAction && (
        <span className="text-xs text-muted-foreground">{info.action}</span>
      )}
    </div>
  );
}
