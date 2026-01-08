import { supabase } from "@/integrations/supabase/client";
import { type CollaborationStatus } from "@/lib/collaborationStateMachine";

interface StatusChangeNotificationParams {
  collaborationId: string;
  oldStatus: CollaborationStatus;
  newStatus: CollaborationStatus;
}

/**
 * Sends notifications when collaboration status changes.
 * This is the ONLY entry point for status-change notifications.
 * All notification logic is handled server-side in the notification-service edge function.
 */
export async function sendStatusChangeNotification({
  collaborationId,
  oldStatus,
  newStatus,
}: StatusChangeNotificationParams): Promise<{ success: boolean; error?: string }> {
  // Don't send notifications if status didn't change
  if (oldStatus === newStatus) {
    return { success: true };
  }

  // Don't send notifications for terminal states (except when transitioning to them)
  const terminalStatuses: CollaborationStatus[] = ["completed", "cancelled"];
  if (terminalStatuses.includes(oldStatus)) {
    return { success: true };
  }

  try {
    const { data, error } = await supabase.functions.invoke("notification-service", {
      body: {
        type: "status_change",
        collaboration_id: collaborationId,
        old_status: oldStatus,
        new_status: newStatus,
      },
    });

    if (error) {
      console.error("Failed to send status change notification:", error);
      return { success: false, error: error.message };
    }

    console.log("Status change notification sent:", data);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending status change notification:", message);
    return { success: false, error: message };
  }
}

/**
 * Helper to check if notifications should be sent for a status transition
 */
export function shouldSendNotification(
  oldStatus: CollaborationStatus,
  newStatus: CollaborationStatus
): boolean {
  // Don't notify if no change
  if (oldStatus === newStatus) return false;

  // Don't notify if already in terminal state
  const terminalStatuses: CollaborationStatus[] = ["completed", "cancelled"];
  if (terminalStatuses.includes(oldStatus)) return false;

  return true;
}
