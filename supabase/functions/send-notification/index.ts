import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "scheduled" | "rescheduled" | "reminder";
  collaboration_id: string;
  guest_email: string;
  guest_name: string;
  host_name: string;
  workspace_name: string;
  scheduled_date: string;
  prep_date?: string | null;
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

function getEmailContent(data: NotificationRequest): { subject: string; html: string } {
  const formattedDate = formatDate(data.scheduled_date);
  const prepInfo = data.prep_date 
    ? `<p style="margin: 16px 0; color: #666;"><strong>Prep Session:</strong> ${formatDate(data.prep_date)}</p>` 
    : "";

  switch (data.type) {
    case "scheduled":
      return {
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
      return {
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
      return {
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
      to: data.guest_email,
      collaboration_id: data.collaboration_id,
    });

    // Validate required fields
    if (!data.guest_email || !data.type || !data.scheduled_date) {
      console.error("Missing required fields:", data);
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { subject, html } = getEmailContent(data);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Podcast Workflow <onboarding@resend.dev>",
        to: [data.guest_email],
        subject,
        html,
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