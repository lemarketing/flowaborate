import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// STATUS LABELS (single source of truth)
// ============================================
const STATUS_LABELS: Record<string, string> = {
  invited: "Invited",
  intake_completed: "Intake Completed",
  scheduled: "Scheduled",
  recorded: "Recorded",
  editing: "In Editing",
  ready: "Ready for Review",
  completed: "Completed",
  cancelled: "Cancelled",
};

// ============================================
// NOTIFICATION PHILOSOPHY
// ============================================
// Hosts: Only exceptions/failures (stalled, no-shows, missed deadlines)
// Guests: Only when action is required from them
// Editors: Only for delivery deadlines or assignment changes

type ResponsibleParty = "guest" | "host" | "editor" | "none";

interface StatusInfo {
  waitingOn: ResponsibleParty;
  action: string;
}

function getStatusInfo(status: string): StatusInfo {
  switch (status) {
    case "invited":
      return { waitingOn: "guest", action: "Complete intake form" };
    case "intake_completed":
      return { waitingOn: "guest", action: "Schedule recording" };
    case "scheduled":
      return { waitingOn: "host", action: "Complete recording" };
    case "recorded":
      return { waitingOn: "editor", action: "Begin editing" };
    case "editing":
      return { waitingOn: "editor", action: "Finish editing" };
    case "ready":
      return { waitingOn: "host", action: "Publish content" };
    case "completed":
    case "cancelled":
      return { waitingOn: "none", action: "No action needed" };
    default:
      return { waitingOn: "none", action: "No action needed" };
  }
}

// Determine if notifications should be sent based on philosophy
function shouldNotifyGuest(oldStatus: string, newStatus: string): boolean {
  // Only notify guests when they need to take action
  const guestActionStatuses = ["invited", "intake_completed"];
  if (guestActionStatuses.includes(newStatus)) return true;
  
  // Also notify for completion (final update)
  if (newStatus === "completed") return true;
  
  return false;
}

function shouldNotifyHost(oldStatus: string, newStatus: string): boolean {
  // Only notify hosts for exceptions or when they need to act
  const hostActionStatuses = ["scheduled", "ready"];
  return hostActionStatuses.includes(newStatus);
}

function shouldNotifyEditor(oldStatus: string, newStatus: string): boolean {
  // Only notify editors when content is ready for editing
  return newStatus === "recorded";
}

// ============================================
// EMAIL TEMPLATES
// ============================================
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

interface CollaborationData {
  id: string;
  status: string;
  scheduled_date: string | null;
  guest_name: string;
  guest_email: string;
  host_name: string;
  host_email: string | null;
  editor_email: string | null;
  workspace_name: string;
}

function getGuestActionEmail(data: CollaborationData, action: string): { subject: string; html: string } {
  return {
    subject: `Action Required: ${action} - ${data.workspace_name}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0d9488; margin-bottom: 24px;">Action Required</h1>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          Hi ${data.guest_name},
        </p>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          Your collaboration with <strong>${data.workspace_name}</strong> needs your attention.
        </p>
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #92400e;">
            ⚡ Next Step
          </p>
          <p style="margin: 0; font-size: 18px; font-weight: 600; color: #92400e;">
            ${action}
          </p>
        </div>
        <p style="font-size: 14px; color: #666; margin-top: 24px;">
          Log in to complete this step.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="font-size: 12px; color: #999;">
          This email was sent from ${data.workspace_name}.
        </p>
      </div>
    `,
  };
}

function getGuestCompletionEmail(data: CollaborationData): { subject: string; html: string } {
  return {
    subject: `Completed: ${data.workspace_name}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #10b981; margin-bottom: 24px;">🎉 All Done!</h1>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          Hi ${data.guest_name},
        </p>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          Your collaboration with <strong>${data.workspace_name}</strong> is complete!
        </p>
        <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0;">
          <p style="margin: 0; font-size: 16px; color: #065f46;">
            Thank you for your participation. The content has been published.
          </p>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="font-size: 12px; color: #999;">
          This email was sent from ${data.workspace_name}.
        </p>
      </div>
    `,
  };
}

function getHostActionEmail(data: CollaborationData, action: string): { subject: string; html: string } {
  return {
    subject: `${data.guest_name}: ${action} - ${data.workspace_name}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #3b82f6; margin-bottom: 24px;">Action Required</h1>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          Hi ${data.host_name},
        </p>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          The collaboration with <strong>${data.guest_name}</strong> needs your attention.
        </p>
        <div style="background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1e40af;">
            ⚡ Your Next Step
          </p>
          <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1e40af;">
            ${action}
          </p>
        </div>
        ${data.scheduled_date ? `
          <p style="font-size: 14px; color: #666; margin-top: 16px;">
            <strong>Scheduled:</strong> ${formatDate(data.scheduled_date)}
          </p>
        ` : ""}
        <p style="font-size: 14px; color: #666; margin-top: 24px;">
          View your dashboard for details.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="font-size: 12px; color: #999;">
          This email was sent from Flowaborate.
        </p>
      </div>
    `,
  };
}

function getEditorAssignmentEmail(data: CollaborationData): { subject: string; html: string } {
  return {
    subject: `New Content Ready: ${data.guest_name} - ${data.workspace_name}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #8b5cf6; margin-bottom: 24px;">🎬 Content Ready for Editing</h1>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          A new recording is ready for editing.
        </p>
        <div style="background-color: #ede9fe; border-left: 4px solid #8b5cf6; padding: 16px; margin: 24px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b21a8;">
            <strong>Guest:</strong> ${data.guest_name}
          </p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b21a8;">
            <strong>Show:</strong> ${data.workspace_name}
          </p>
          ${data.scheduled_date ? `
            <p style="margin: 0; font-size: 14px; color: #6b21a8;">
              <strong>Recorded:</strong> ${formatDate(data.scheduled_date)}
            </p>
          ` : ""}
        </div>
        <p style="font-size: 14px; color: #666; margin-top: 24px;">
          Log in to begin editing.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="font-size: 12px; color: #999;">
          This email was sent from Flowaborate.
        </p>
      </div>
    `,
  };
}

function getReminderEmail(data: CollaborationData, reminderType: "24h" | "1h"): { subject: string; html: string } {
  const timeframe = reminderType === "24h" ? "tomorrow" : "in 1 hour";
  return {
    subject: `Reminder: Recording ${reminderType === "24h" ? "Tomorrow" : "Soon"} - ${data.workspace_name}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0d9488; margin-bottom: 24px;">📅 Recording Reminder</h1>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          Hi ${data.guest_name},
        </p>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          Your recording session with <strong>${data.host_name}</strong> is ${timeframe}!
        </p>
        ${data.scheduled_date ? `
          <div style="background-color: #f0fdfa; border-left: 4px solid #0d9488; padding: 16px; margin: 24px 0;">
            <p style="margin: 0; font-size: 18px; font-weight: 600; color: #0d9488;">
              ${formatDate(data.scheduled_date)}
            </p>
          </div>
        ` : ""}
        ${reminderType === "24h" ? `
          <h3 style="color: #333; margin-top: 24px;">Quick Checklist:</h3>
          <ul style="color: #666; line-height: 1.8;">
            <li>Test your microphone and camera</li>
            <li>Find a quiet space with good lighting</li>
            <li>Have water nearby</li>
            <li>Review your talking points</li>
          </ul>
        ` : ""}
        <p style="font-size: 14px; color: #666; margin-top: 24px;">
          See you soon! 🎙️
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="font-size: 12px; color: #999;">
          This reminder was sent from ${data.workspace_name}.
        </p>
      </div>
    `,
  };
}

// ============================================
// MAIN HANDLER
// ============================================
type NotificationType = 
  | "status_change"
  | "reminder"
  | "exception";

interface NotificationRequest {
  type: NotificationType;
  collaboration_id: string;
  old_status?: string;
  new_status?: string;
  reminder_type?: "24h" | "1h";
  exception_type?: "stalled" | "no_show" | "missed_deadline";
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Flowaborate <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Failed to send email to ${to}:`, errorText);
      return false;
    }

    console.log(`Email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ============================================
    // AUTHENTICATION CHECK
    // ============================================
    const authHeader = req.headers.get("Authorization");
    
    // For cron jobs, we use service role. For user requests, validate JWT.
    const isCronJob = req.headers.get("x-cron-job") === "true";
    
    let userId: string | null = null;
    let supabase;

    if (isCronJob) {
      // Service role for cron jobs (internal)
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    } else {
      // Validate user authentication for regular requests
      if (!authHeader?.startsWith("Bearer ")) {
        console.error("Missing or invalid authorization header");
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });

      // Validate the JWT
      const token = authHeader.replace("Bearer ", "");
      const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
      
      if (claimsError || !claimsData?.claims) {
        console.error("Invalid JWT:", claimsError);
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      userId = claimsData.claims.sub as string;
    }

    const data: NotificationRequest = await req.json();
    
    console.log("Processing notification:", {
      type: data.type,
      collaboration_id: data.collaboration_id,
      userId,
      isCronJob,
    });

    // ============================================
    // FETCH COLLABORATION DATA
    // ============================================
    const { data: collab, error: fetchError } = await supabase
      .from("collaborations")
      .select(`
        id,
        status,
        scheduled_date,
        host_id,
        editor_id,
        guest_profile:guest_profiles(name, email, user_id),
        host:profiles!collaborations_host_id_fkey(full_name, user_id),
        workspace:workspaces(name)
      `)
      .eq("id", data.collaboration_id)
      .single();

    if (fetchError || !collab) {
      console.error("Failed to fetch collaboration:", fetchError);
      return new Response(
        JSON.stringify({ error: "Collaboration not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ============================================
    // AUTHORIZATION CHECK - Only participants can trigger notifications
    // ============================================
    if (!isCronJob && userId) {
      const guestProfile = Array.isArray(collab.guest_profile) ? collab.guest_profile[0] : collab.guest_profile;
      const isHost = collab.host_id === userId;
      const isEditor = collab.editor_id === userId;
      const isGuest = guestProfile?.user_id === userId;

      if (!isHost && !isEditor && !isGuest) {
        console.error("User not authorized for this collaboration:", userId);
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // ============================================
    // CHECK TERMINAL STATES - Stop notifications for completed/cancelled
    // ============================================
    const terminalStatuses = ["completed", "cancelled"];
    if (terminalStatuses.includes(collab.status) && data.type !== "status_change") {
      console.log("Collaboration in terminal state, skipping notification");
      return new Response(
        JSON.stringify({ message: "Collaboration is in terminal state, no notifications sent" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ============================================
    // PREPARE COLLABORATION DATA
    // ============================================
    const guestProfile = Array.isArray(collab.guest_profile) ? collab.guest_profile[0] : collab.guest_profile;
    const host = Array.isArray(collab.host) ? collab.host[0] : collab.host;
    const workspace = Array.isArray(collab.workspace) ? collab.workspace[0] : collab.workspace;

    // Get host email using service role (only in edge function, not client-side)
    const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    let hostEmail: string | null = null;
    let editorEmail: string | null = null;

    if (host?.user_id) {
      const { data: hostUser } = await serviceSupabase.auth.admin.getUserById(host.user_id);
      hostEmail = hostUser?.user?.email || null;
    }

    if (collab.editor_id) {
      const { data: editorUser } = await serviceSupabase.auth.admin.getUserById(collab.editor_id);
      editorEmail = editorUser?.user?.email || null;
    }

    const collabData: CollaborationData = {
      id: collab.id,
      status: collab.status,
      scheduled_date: collab.scheduled_date,
      guest_name: guestProfile?.name || "Guest",
      guest_email: guestProfile?.email || "",
      host_name: host?.full_name || "Host",
      host_email: hostEmail,
      editor_email: editorEmail,
      workspace_name: workspace?.name || "Collaboration",
    };

    // ============================================
    // PROCESS NOTIFICATION TYPE
    // ============================================
    const results: { sent: string[]; failed: string[] } = { sent: [], failed: [] };

    if (data.type === "status_change" && data.old_status && data.new_status) {
      const statusInfo = getStatusInfo(data.new_status);

      // Guest notification (only when action required)
      if (shouldNotifyGuest(data.old_status, data.new_status) && collabData.guest_email) {
        let email;
        if (data.new_status === "completed") {
          email = getGuestCompletionEmail(collabData);
        } else {
          email = getGuestActionEmail(collabData, statusInfo.action);
        }
        
        const success = await sendEmail(collabData.guest_email, email.subject, email.html);
        if (success) results.sent.push(`guest:${collabData.guest_email}`);
        else results.failed.push(`guest:${collabData.guest_email}`);
      }

      // Host notification (only when they need to act)
      if (shouldNotifyHost(data.old_status, data.new_status) && collabData.host_email) {
        const email = getHostActionEmail(collabData, statusInfo.action);
        const success = await sendEmail(collabData.host_email, email.subject, email.html);
        if (success) results.sent.push(`host:${collabData.host_email}`);
        else results.failed.push(`host:${collabData.host_email}`);
      }

      // Editor notification (only when content is ready)
      if (shouldNotifyEditor(data.old_status, data.new_status) && collabData.editor_email) {
        const email = getEditorAssignmentEmail(collabData);
        const success = await sendEmail(collabData.editor_email, email.subject, email.html);
        if (success) results.sent.push(`editor:${collabData.editor_email}`);
        else results.failed.push(`editor:${collabData.editor_email}`);
      }
    }

    if (data.type === "reminder" && data.reminder_type && collabData.guest_email) {
      const email = getReminderEmail(collabData, data.reminder_type);
      const success = await sendEmail(collabData.guest_email, email.subject, email.html);
      if (success) results.sent.push(`guest:${collabData.guest_email}`);
      else results.failed.push(`guest:${collabData.guest_email}`);
    }

    console.log("Notification results:", results);

    return new Response(
      JSON.stringify({ success: true, ...results }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in notification service:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
