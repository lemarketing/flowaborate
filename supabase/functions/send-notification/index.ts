import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type NotificationType = 
  | "scheduled" 
  | "rescheduled" 
  | "reminder" 
  | "status_change_guest" 
  | "status_change_host";

interface NotificationRequest {
  type: NotificationType;
  collaboration_id: string;
  guest_email?: string;
  guest_name?: string;
  host_email?: string;
  host_name?: string;
  workspace_name: string;
  scheduled_date?: string;
  prep_date?: string | null;
  // Status change specific
  old_status?: string;
  new_status?: string;
  waiting_on?: "guest" | "host" | "editor" | "none";
  action_required?: string;
}

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

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    invited: "Invited",
    intake_completed: "Intake Completed",
    scheduled: "Scheduled",
    recorded: "Recorded",
    editing: "In Editing",
    edited: "Editing Complete",
    ready_to_publish: "Ready to Publish",
    completed: "Completed",
    delivered: "Delivered",
  };
  return labels[status] || status;
}

function getEmailContent(data: NotificationRequest): { subject: string; html: string; to: string } | null {
  const formattedDate = data.scheduled_date ? formatDate(data.scheduled_date) : null;
  const prepInfo = data.prep_date 
    ? `<p style="margin: 16px 0; color: #666;"><strong>Prep Session:</strong> ${formatDate(data.prep_date)}</p>` 
    : "";

  switch (data.type) {
    case "scheduled":
      if (!data.guest_email || !data.scheduled_date) return null;
      return {
        to: data.guest_email,
        subject: `Recording Scheduled - ${data.workspace_name}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #0d9488; margin-bottom: 24px;">Recording Confirmed!</h1>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Hi ${data.guest_name},
            </p>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Your recording session with <strong>${data.host_name}</strong> for <strong>${data.workspace_name}</strong> has been scheduled.
            </p>
            <div style="background-color: #f0fdfa; border-left: 4px solid #0d9488; padding: 16px; margin: 24px 0;">
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #0d9488;">
                📅 ${formattedDate}
              </p>
            </div>
            ${prepInfo}
            <p style="font-size: 14px; color: #666; margin-top: 24px;">
              If you need to reschedule, you can do so from your dashboard. Please note that rescheduling limits may apply.
            </p>
            <p style="font-size: 14px; color: #666; margin-top: 16px;">
              Looking forward to your session!
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
            <p style="font-size: 12px; color: #999;">
              This email was sent from ${data.workspace_name}. If you have questions, please contact your host.
            </p>
          </div>
        `,
      };

    case "rescheduled":
      if (!data.guest_email || !data.scheduled_date) return null;
      return {
        to: data.guest_email,
        subject: `Recording Rescheduled - ${data.workspace_name}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #f59e0b; margin-bottom: 24px;">Recording Rescheduled</h1>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Hi ${data.guest_name},
            </p>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Your recording session with <strong>${data.host_name}</strong> for <strong>${data.workspace_name}</strong> has been rescheduled.
            </p>
            <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0;">
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #d97706;">
                📅 New Date: ${formattedDate}
              </p>
            </div>
            ${prepInfo}
            <p style="font-size: 14px; color: #666; margin-top: 24px;">
              Please make a note of the new date and time.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
            <p style="font-size: 12px; color: #999;">
              This email was sent from ${data.workspace_name}.
            </p>
          </div>
        `,
      };

    case "reminder":
      if (!data.guest_email || !data.scheduled_date) return null;
      return {
        to: data.guest_email,
        subject: `Reminder: Recording Tomorrow - ${data.workspace_name}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #0d9488; margin-bottom: 24px;">Recording Reminder</h1>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Hi ${data.guest_name},
            </p>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              This is a friendly reminder that your recording session with <strong>${data.host_name}</strong> is coming up!
            </p>
            <div style="background-color: #f0fdfa; border-left: 4px solid #0d9488; padding: 16px; margin: 24px 0;">
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #0d9488;">
                📅 ${formattedDate}
              </p>
            </div>
            <h3 style="color: #333; margin-top: 24px;">Quick Checklist:</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>Test your microphone and camera</li>
              <li>Find a quiet space with good lighting</li>
              <li>Have water nearby</li>
              <li>Review your talking points</li>
            </ul>
            <p style="font-size: 14px; color: #666; margin-top: 24px;">
              See you soon!
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
            <p style="font-size: 12px; color: #999;">
              This email was sent from ${data.workspace_name}.
            </p>
          </div>
        `,
      };

    case "status_change_guest":
      if (!data.guest_email || !data.new_status) return null;
      return {
        to: data.guest_email,
        subject: `Update: ${getStatusLabel(data.new_status)} - ${data.workspace_name}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #0d9488; margin-bottom: 24px;">Collaboration Update</h1>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Hi ${data.guest_name || "there"},
            </p>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Your collaboration with <strong>${data.workspace_name}</strong> has been updated.
            </p>
            <div style="background-color: #f0fdfa; border-left: 4px solid #0d9488; padding: 16px; margin: 24px 0;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">
                Status changed to:
              </p>
              <p style="margin: 0; font-size: 20px; font-weight: 600; color: #0d9488;">
                ${getStatusLabel(data.new_status)}
              </p>
            </div>
            ${data.waiting_on === "guest" && data.action_required ? `
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #92400e;">
                  ⚡ Action Required
                </p>
                <p style="margin: 0; font-size: 16px; color: #92400e;">
                  ${data.action_required}
                </p>
              </div>
            ` : ""}
            ${formattedDate ? `
              <p style="font-size: 14px; color: #666; margin-top: 16px;">
                <strong>Scheduled:</strong> ${formattedDate}
              </p>
            ` : ""}
            <p style="font-size: 14px; color: #666; margin-top: 24px;">
              Log in to your dashboard to see more details.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
            <p style="font-size: 12px; color: #999;">
              This email was sent from ${data.workspace_name}.
            </p>
          </div>
        `,
      };

    case "status_change_host":
      if (!data.host_email || !data.new_status) return null;
      return {
        to: data.host_email,
        subject: `${data.guest_name || "Guest"}: ${getStatusLabel(data.new_status)} - ${data.workspace_name}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #3b82f6; margin-bottom: 24px;">Collaboration Update</h1>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Hi ${data.host_name || "there"},
            </p>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              The collaboration with <strong>${data.guest_name || "your guest"}</strong> has been updated.
            </p>
            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0;">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #666;">
                Status changed to:
              </p>
              <p style="margin: 0; font-size: 20px; font-weight: 600; color: #1d4ed8;">
                ${getStatusLabel(data.new_status)}
              </p>
            </div>
            ${data.waiting_on === "host" && data.action_required ? `
              <div style="background-color: #dbeafe; border-left: 4px solid #2563eb; padding: 16px; margin: 24px 0;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1e40af;">
                  ⚡ Action Required From You
                </p>
                <p style="margin: 0; font-size: 16px; color: #1e40af;">
                  ${data.action_required}
                </p>
              </div>
            ` : data.waiting_on === "guest" ? `
              <div style="background-color: #fef9c3; border-left: 4px solid #eab308; padding: 16px; margin: 24px 0;">
                <p style="margin: 0; font-size: 14px; color: #854d0e;">
                  ⏳ Waiting on guest: ${data.action_required || "to take the next step"}
                </p>
              </div>
            ` : ""}
            ${formattedDate ? `
              <p style="font-size: 14px; color: #666; margin-top: 16px;">
                <strong>Scheduled:</strong> ${formattedDate}
              </p>
            ` : ""}
            <p style="font-size: 14px; color: #666; margin-top: 24px;">
              View your dashboard for more details.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
            <p style="font-size: 12px; color: #999;">
              This email was sent from Flowaborate for ${data.workspace_name}.
            </p>
          </div>
        `,
      };

    default:
      return null;
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: NotificationRequest = await req.json();
    
    console.log("Sending notification:", {
      type: data.type,
      collaboration_id: data.collaboration_id,
      guest_email: data.guest_email,
      host_email: data.host_email,
    });

    const emailContent = getEmailContent(data);

    if (!emailContent) {
      console.error("Could not generate email content - missing required fields:", data);
      return new Response(
        JSON.stringify({ error: "Missing required fields for email type" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Flowaborate <onboarding@resend.dev>",
        to: [emailContent.to],
        subject: emailContent.subject,
        html: emailContent.html,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const emailResponse = await res.json();
    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, ...emailResponse }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending notification:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);