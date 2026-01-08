import type { Database } from "@/integrations/supabase/types";

// Single source of truth for collaboration statuses
export type CollaborationStatus = Database["public"]["Enums"]["collaboration_status"];

export const COLLABORATION_STATUSES = [
  "invited",
  "intake_completed", 
  "scheduled",
  "recorded",
  "editing",
  "ready",
  "completed",
  "cancelled",
] as const;

export const STATUS_LABELS: Record<CollaborationStatus, string> = {
  invited: "Invited",
  intake_completed: "Intake Completed",
  scheduled: "Scheduled",
  recorded: "Recorded",
  editing: "Editing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

// Define allowed transitions (from -> to[])
const ALLOWED_TRANSITIONS: Record<CollaborationStatus, CollaborationStatus[]> = {
  invited: ["intake_completed", "cancelled"],
  intake_completed: ["scheduled", "cancelled"],
  scheduled: ["recorded", "cancelled"],
  recorded: ["editing", "cancelled"],
  editing: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

// Define who is responsible for action at each status
export type ResponsibleParty = "guest" | "host" | "editor" | "none";

export interface StatusInfo {
  waitingOn: ResponsibleParty;
  label: string;
  action: string;
}

// Role-specific action info
export interface RoleActionInfo {
  hasAction: boolean;
  actionTitle: string;
  actionDescription: string;
  waitingOnLabel: string | null;
}

// Determine who is waiting and what action is needed
export function getStatusInfo(collaboration: {
  status: string;
  guest_profile_id?: string | null;
  scheduled_date?: string | null;
  recorded_date?: string | null;
}): StatusInfo {
  const status = collaboration.status as CollaborationStatus;

  switch (status) {
    case "invited":
      return {
        waitingOn: "guest",
        label: "Guest",
        action: "Complete intake form",
      };

    case "intake_completed":
      return {
        waitingOn: "guest",
        label: "Guest",
        action: "Schedule recording",
      };

    case "scheduled":
      return {
        waitingOn: "host",
        label: "Host",
        action: "Complete recording",
      };

    case "recorded":
      return {
        waitingOn: "editor",
        label: "Editor",
        action: "Begin editing",
      };

    case "editing":
      return {
        waitingOn: "editor",
        label: "Editor",
        action: "Finish editing",
      };

    case "ready":
      return {
        waitingOn: "host",
        label: "Host",
        action: "Publish content",
      };

    case "completed":
      return {
        waitingOn: "none",
        label: "Complete",
        action: "All done!",
      };

    case "cancelled":
      return {
        waitingOn: "none",
        label: "Cancelled",
        action: "No action needed",
      };

    default:
      return {
        waitingOn: "none",
        label: "Unknown",
        action: "No action needed",
      };
  }
}

// Get role-specific action information
export function getRoleActionInfo(
  collaboration: {
    status: string;
    guest_profile_id?: string | null;
    scheduled_date?: string | null;
    recorded_date?: string | null;
  },
  role: "host" | "guest" | "editor"
): RoleActionInfo {
  const statusInfo = getStatusInfo(collaboration);
  const status = collaboration.status as CollaborationStatus;

  // Check if this role has an action
  const hasAction = statusInfo.waitingOn === role;

  // Role-specific messaging
  if (role === "guest") {
    if (status === "invited") {
      return {
        hasAction: true,
        actionTitle: "Complete Your Profile",
        actionDescription: "Fill out the intake form so the host can prepare for your session.",
        waitingOnLabel: null,
      };
    }
    if (status === "intake_completed") {
      return {
        hasAction: true,
        actionTitle: "Schedule Your Session",
        actionDescription: "Pick a time that works for your recording session.",
        waitingOnLabel: null,
      };
    }
    if (status === "scheduled") {
      return {
        hasAction: false,
        actionTitle: "",
        actionDescription: "",
        waitingOnLabel: "Waiting for recording session",
      };
    }
    if (["recorded", "editing"].includes(status)) {
      return {
        hasAction: false,
        actionTitle: "",
        actionDescription: "",
        waitingOnLabel: "Content is being edited",
      };
    }
    if (status === "ready") {
      return {
        hasAction: false,
        actionTitle: "",
        actionDescription: "",
        waitingOnLabel: "Content is ready for publishing",
      };
    }
    if (status === "completed") {
      return {
        hasAction: false,
        actionTitle: "",
        actionDescription: "",
        waitingOnLabel: null, // All done
      };
    }
  }

  if (role === "host") {
    if (["invited", "intake_completed"].includes(status)) {
      return {
        hasAction: false,
        actionTitle: "",
        actionDescription: "",
        waitingOnLabel: `Waiting on guest to ${status === "invited" ? "complete intake" : "schedule"}`,
      };
    }
    if (status === "scheduled") {
      return {
        hasAction: true,
        actionTitle: "Record Session",
        actionDescription: "Complete the recording and mark it as recorded.",
        waitingOnLabel: null,
      };
    }
    if (["recorded", "editing"].includes(status)) {
      return {
        hasAction: false,
        actionTitle: "",
        actionDescription: "",
        waitingOnLabel: "Waiting on editor to complete editing",
      };
    }
    if (status === "ready") {
      return {
        hasAction: true,
        actionTitle: "Publish Content",
        actionDescription: "Review the edited content and publish it.",
        waitingOnLabel: null,
      };
    }
    if (status === "completed") {
      return {
        hasAction: false,
        actionTitle: "",
        actionDescription: "",
        waitingOnLabel: null, // All done
      };
    }
  }

  if (role === "editor") {
    if (["invited", "intake_completed", "scheduled"].includes(status)) {
      return {
        hasAction: false,
        actionTitle: "",
        actionDescription: "",
        waitingOnLabel: "Waiting for recording to complete",
      };
    }
    if (status === "recorded") {
      return {
        hasAction: true,
        actionTitle: "Start Editing",
        actionDescription: "Begin editing the recorded content.",
        waitingOnLabel: null,
      };
    }
    if (status === "editing") {
      return {
        hasAction: true,
        actionTitle: "Complete Editing",
        actionDescription: "Finish editing and mark as ready for review.",
        waitingOnLabel: null,
      };
    }
    if (["ready", "completed"].includes(status)) {
      return {
        hasAction: false,
        actionTitle: "",
        actionDescription: "",
        waitingOnLabel: status === "ready" ? "Waiting on host to publish" : null,
      };
    }
  }

  // Default fallback
  return {
    hasAction,
    actionTitle: hasAction ? statusInfo.action : "",
    actionDescription: "",
    waitingOnLabel: hasAction ? null : `Waiting on ${statusInfo.label}`,
  };
}

// Check if a transition is valid
export function isValidTransition(
  fromStatus: CollaborationStatus,
  toStatus: CollaborationStatus
): boolean {
  return ALLOWED_TRANSITIONS[fromStatus]?.includes(toStatus) ?? false;
}

// Get allowed next statuses from current status
export function getAllowedTransitions(currentStatus: CollaborationStatus): CollaborationStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus] ?? [];
}

// Get the next action required for a specific role
export function getNextActionForRole(
  status: CollaborationStatus,
  role: "host" | "guest" | "editor"
): string | null {
  const info = getStatusInfo({ status });
  
  if (info.waitingOn === role) {
    return info.action;
  }
  
  return null;
}

// Determine if automations should fire for a status change
export interface AutomationTriggers {
  notifyGuest: boolean;
  notifyHost: boolean;
  notifyEditor: boolean;
}

export function getAutomationTriggers(
  oldStatus: CollaborationStatus,
  newStatus: CollaborationStatus
): AutomationTriggers {
  const newStatusInfo = getStatusInfo({ status: newStatus });
  
  // Base triggers on who needs to take action
  const triggers: AutomationTriggers = {
    notifyGuest: newStatusInfo.waitingOn === "guest",
    notifyHost: newStatusInfo.waitingOn === "host",
    notifyEditor: newStatusInfo.waitingOn === "editor",
  };

  // Additional notifications for significant status changes
  // Guest should know when recording is done or content is ready
  if (["recorded", "ready", "completed"].includes(newStatus)) {
    triggers.notifyGuest = true;
  }

  // Host should know when guest completes intake or schedules
  if (["intake_completed", "scheduled"].includes(newStatus)) {
    triggers.notifyHost = true;
  }

  // Host should know when editing is complete
  if (newStatus === "ready") {
    triggers.notifyHost = true;
  }

  return triggers;
}

// Check if collaboration is in a terminal state
export function isTerminalStatus(status: CollaborationStatus): boolean {
  return status === "completed" || status === "cancelled";
}

// Check if collaboration requires action (not in terminal state)
export function requiresAction(status: CollaborationStatus): boolean {
  return !isTerminalStatus(status);
}

// Get status options for UI dropdowns
export function getStatusOptions(): Array<{ value: CollaborationStatus; label: string }> {
  return COLLABORATION_STATUSES.map((status) => ({
    value: status,
    label: STATUS_LABELS[status],
  }));
}

// Exception detection for hosts
export interface CollaborationException {
  type: "stalled" | "missed_deadline" | "no_show";
  message: string;
  severity: "warning" | "error";
}

export function detectExceptions(collaboration: {
  status: string;
  scheduled_date?: string | null;
  recorded_date?: string | null;
  created_at?: string;
  updated_at?: string;
}): CollaborationException | null {
  const status = collaboration.status as CollaborationStatus;
  const now = new Date();

  // Check for missed recording (scheduled date passed but not recorded)
  if (status === "scheduled" && collaboration.scheduled_date) {
    const scheduledDate = new Date(collaboration.scheduled_date);
    if (scheduledDate < now) {
      const hoursSince = (now.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60);
      if (hoursSince > 24) {
        return {
          type: "no_show",
          message: "Recording was scheduled but not marked complete",
          severity: "error",
        };
      }
    }
  }

  // Check for stalled collaborations (no activity for 7+ days in active states)
  if (["invited", "intake_completed"].includes(status) && collaboration.updated_at) {
    const updatedAt = new Date(collaboration.updated_at);
    const daysSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate > 7) {
      return {
        type: "stalled",
        message: `No activity for ${Math.floor(daysSinceUpdate)} days`,
        severity: "warning",
      };
    }
  }

  // Check for editing taking too long (14+ days)
  if (status === "editing" && collaboration.recorded_date) {
    const recordedDate = new Date(collaboration.recorded_date);
    const daysSinceRecording = (now.getTime() - recordedDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceRecording > 14) {
      return {
        type: "missed_deadline",
        message: `Editing in progress for ${Math.floor(daysSinceRecording)} days`,
        severity: "warning",
      };
    }
  }

  return null;
}
