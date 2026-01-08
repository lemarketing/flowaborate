import { supabase } from "@/integrations/supabase/client";
import { getWaitingOnInfo } from "@/components/collaborations/WaitingOnBadge";

interface StatusChangeNotificationParams {
  collaborationId: string;
  oldStatus: string;
  newStatus: string;
}

export async function sendStatusChangeNotifications({
  collaborationId,
  oldStatus,
  newStatus,
}: StatusChangeNotificationParams): Promise<void> {
  // Don't send notifications if status didn't change
  if (oldStatus === newStatus) return;

  try {
    // Fetch collaboration details including guest, host, and workspace info
    const { data: collab, error } = await supabase
      .from("collaborations")
      .select(`
        id,
        status,
        scheduled_date,
        guest_profile:guest_profiles(name, email),
        host:profiles!collaborations_host_id_fkey(full_name, user_id),
        workspace:workspaces(name)
      `)
      .eq("id", collaborationId)
      .single();

    if (error || !collab) {
      console.error("Failed to fetch collaboration for notification:", error);
      return;
    }

    const guestProfile = Array.isArray(collab.guest_profile) 
      ? collab.guest_profile[0] 
      : collab.guest_profile;
    const host = Array.isArray(collab.host) ? collab.host[0] : collab.host;
    const workspace = Array.isArray(collab.workspace) ? collab.workspace[0] : collab.workspace;

    // Get waiting on info for the new status
    const waitingInfo = getWaitingOnInfo({
      status: newStatus,
      guest_profile_id: guestProfile?.email ? "exists" : null,
      scheduled_date: collab.scheduled_date,
    });

    // Get host email from auth
    let hostEmail: string | null = null;
    if (host?.user_id) {
      const { data: authData } = await supabase.auth.admin?.getUserById?.(host.user_id) || {};
      hostEmail = authData?.user?.email || null;
    }

    // If we can't get host email through admin, we'll skip host notification
    // In production, you'd want to store email in profiles table

    const basePayload = {
      collaboration_id: collaborationId,
      workspace_name: workspace?.name || "Collaboration",
      old_status: oldStatus,
      new_status: newStatus,
      waiting_on: waitingInfo.waitingOn,
      action_required: waitingInfo.action,
      scheduled_date: collab.scheduled_date,
    };

    // Send notification to guest if they need to take action or status changed significantly
    if (guestProfile?.email && (waitingInfo.waitingOn === "guest" || shouldNotifyGuest(oldStatus, newStatus))) {
      try {
        await supabase.functions.invoke("send-notification", {
          body: {
            type: "status_change_guest",
            guest_email: guestProfile.email,
            guest_name: guestProfile.name,
            host_name: host?.full_name,
            ...basePayload,
          },
        });
        console.log("Guest notification sent for status change:", newStatus);
      } catch (e) {
        console.error("Failed to send guest notification:", e);
      }
    }

    // Send notification to host if they need to take action or should be informed
    if (hostEmail && (waitingInfo.waitingOn === "host" || shouldNotifyHost(oldStatus, newStatus))) {
      try {
        await supabase.functions.invoke("send-notification", {
          body: {
            type: "status_change_host",
            host_email: hostEmail,
            host_name: host?.full_name,
            guest_name: guestProfile?.name,
            guest_email: guestProfile?.email,
            ...basePayload,
          },
        });
        console.log("Host notification sent for status change:", newStatus);
      } catch (e) {
        console.error("Failed to send host notification:", e);
      }
    }
  } catch (error) {
    console.error("Error sending status change notifications:", error);
  }
}

// Determine if guest should be notified even if not waiting on them
function shouldNotifyGuest(oldStatus: string, newStatus: string): boolean {
  // Notify guest when recording is complete or content is delivered
  const guestInterestStatuses = ["recorded", "edited", "completed", "delivered"];
  return guestInterestStatuses.includes(newStatus);
}

// Determine if host should be notified even if not waiting on them
function shouldNotifyHost(oldStatus: string, newStatus: string): boolean {
  // Notify host when guest completes intake or schedules
  const hostInterestStatuses = ["intake_completed", "scheduled"];
  return hostInterestStatuses.includes(newStatus);
}
