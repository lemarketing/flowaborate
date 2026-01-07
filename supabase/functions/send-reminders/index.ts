import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

function getReminderEmailHtml(data: {
  guest_name: string;
  host_name: string;
  workspace_name: string;
  scheduled_date: string;
}): string {
  const formattedDate = formatDate(data.scheduled_date);
  
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #0d9488; margin-bottom: 24px;">📅 Recording Reminder</h1>
      <p style="font-size: 16px; color: #333; line-height: 1.6;">
        Hi ${data.guest_name},
      </p>
      <p style="font-size: 16px; color: #333; line-height: 1.6;">
        This is a friendly reminder that your recording session with <strong>${data.host_name}</strong> is coming up tomorrow!
      </p>
      <div style="background-color: #f0fdfa; border-left: 4px solid #0d9488; padding: 16px; margin: 24px 0;">
        <p style="margin: 0; font-size: 18px; font-weight: 600; color: #0d9488;">
          ${formattedDate}
        </p>
      </div>
      <h3 style="color: #333; margin-top: 24px;">Quick Checklist:</h3>
      <ul style="color: #666; line-height: 1.8;">
        <li>Test your microphone and camera</li>
        <li>Find a quiet space with good lighting</li>
        <li>Have water nearby</li>
        <li>Review your talking points</li>
        <li>Close unnecessary applications</li>
      </ul>
      <p style="font-size: 14px; color: #666; margin-top: 24px;">
        See you soon! 🎙️
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
      <p style="font-size: 12px; color: #999;">
        This reminder was sent from ${data.workspace_name}.
      </p>
    </div>
  `;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting reminder check...");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find collaborations scheduled in the next 24-25 hours (to catch them once per hour)
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    console.log(`Looking for sessions between ${in24Hours.toISOString()} and ${in25Hours.toISOString()}`);

    const { data: collaborations, error: fetchError } = await supabase
      .from("collaborations")
      .select(`
        id,
        scheduled_date,
        workspace:workspaces(name),
        guest_profile:guest_profiles(name, email),
        host:profiles!collaborations_host_id_fkey(full_name)
      `)
      .eq("status", "scheduled")
      .gte("scheduled_date", in24Hours.toISOString())
      .lt("scheduled_date", in25Hours.toISOString());

    if (fetchError) {
      console.error("Error fetching collaborations:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${collaborations?.length || 0} sessions needing reminders`);

    if (!collaborations || collaborations.length === 0) {
      return new Response(
        JSON.stringify({ message: "No reminders to send", count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let sentCount = 0;
    const errors: string[] = [];

    for (const collab of collaborations) {
      const workspace = Array.isArray(collab.workspace) ? collab.workspace[0] : collab.workspace;
      const guestProfile = Array.isArray(collab.guest_profile) ? collab.guest_profile[0] : collab.guest_profile;
      const host = Array.isArray(collab.host) ? collab.host[0] : collab.host;

      if (!guestProfile?.email || !guestProfile?.name) {
        console.log(`Skipping collaboration ${collab.id}: missing guest profile`);
        continue;
      }

      const emailHtml = getReminderEmailHtml({
        guest_name: guestProfile.name,
        host_name: host?.full_name || "Your Host",
        workspace_name: workspace?.name || "Podcast",
        scheduled_date: collab.scheduled_date!,
      });

      try {
        console.log(`Sending reminder to ${guestProfile.email} for collaboration ${collab.id}`);

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Podcast Workflow <onboarding@resend.dev>",
            to: [guestProfile.email],
            subject: `Reminder: Recording Tomorrow - ${workspace?.name || "Podcast"}`,
            html: emailHtml,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error(`Failed to send email to ${guestProfile.email}:`, errorText);
          errors.push(`${guestProfile.email}: ${errorText}`);
        } else {
          console.log(`Successfully sent reminder to ${guestProfile.email}`);
          sentCount++;
        }
      } catch (emailError) {
        const message = emailError instanceof Error ? emailError.message : "Unknown error";
        console.error(`Error sending email to ${guestProfile.email}:`, message);
        errors.push(`${guestProfile.email}: ${message}`);
      }
    }

    console.log(`Reminder job complete. Sent: ${sentCount}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        message: "Reminder job complete",
        sent: sentCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-reminders function:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);