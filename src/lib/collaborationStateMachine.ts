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
