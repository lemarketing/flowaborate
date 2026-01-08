import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// CONFIGURATION
// ============================================
const MAX_REMINDER_ATTEMPTS = 3; // Maximum reminders per collaboration
const STALE_THRESHOLD_DAYS = 7; // Days before marking as stalled

// ============================================
// HELPER FUNCTIONS
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
    return true;
  } catch (error) {
    console.error(`Error sending email to ${to}:`, error);
    return false;
  }
}

// ============================================
// REMINDER EMAIL TEMPLATE
// ============================================
function getReminderEmailHtml(data: {
  guest_name: string;
  host_name: string;
  workspace_name: string;
  scheduled_date: string;
  reminderType: "24h" | "1h";
}): { subject: string; html: string } {
  const formattedDate = formatDate(data.scheduled_date);
  const timeframe = data.reminderType === "24h" ? "tomorrow" : "in about 1 hour";

  return {
    subject: `Reminder: Recording ${data.reminderType === "24h" ? "Tomorrow" : "Soon"} - ${data.workspace_name}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #0d9488; margin-bottom: 24px;">📅 Recording Reminder</h1>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          Hi ${data.guest_name},
        </p>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          Your recording session with <strong>${data.host_name}</strong> is ${timeframe}!
        </p>
        <div style="background-color: #f0fdfa; border-left: 4px solid #0d9488; padding: 16px; margin: 24px 0;">
          <p style="margin: 0; font-size: 18px; font-weight: 600; color: #0d9488;">
            ${formattedDate}
          </p>
        </div>
        ${data.reminderType === "24h" ? `
          <h3 style="color: #333; margin-top: 24px;">Quick Checklist:</h3>
          <ul style="color: #666; line-height: 1.8;">
            <li>Test your microphone and camera</li>
            <li>Find a quiet space with good lighting</li>
            <li>Have water nearby</li>
            <li>Review your talking points</li>
          </ul>
        ` : `
          <p style="font-size: 14px; color: #666; margin-top: 16px;">
            Make sure you're all set and ready to go!
          </p>
        `}
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
// EXCEPTION EMAIL TEMPLATE (HOST ONLY)
// ============================================
function getExceptionEmailHtml(data: {
  host_name: string;
  guest_name: string;
  workspace_name: string;
  exception_type: "stalled" | "no_show" | "missed_deadline";
  details: string;
}): { subject: string; html: string } {
  const titles = {
    stalled: "⚠️ Stalled Collaboration",
    no_show: "🚨 Missed Recording Session",
    missed_deadline: "⏰ Editing Deadline Overdue",
  };

  const descriptions = {
    stalled: "This collaboration has had no activity for an extended period.",
    no_show: "The scheduled recording session was not completed.",
    missed_deadline: "The editing deadline has passed without completion.",
  };

  return {
    subject: `${titles[data.exception_type]}: ${data.guest_name} - ${data.workspace_name}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #dc2626; margin-bottom: 24px;">${titles[data.exception_type]}</h1>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          Hi ${data.host_name},
        </p>
        <p style="font-size: 16px; color: #333; line-height: 1.6;">
          ${descriptions[data.exception_type]}
        </p>
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 24px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #991b1b;">
            <strong>Collaboration:</strong> ${data.guest_name}
          </p>
          <p style="margin: 0; font-size: 14px; color: #991b1b;">
            <strong>Details:</strong> ${data.details}
          </p>
        </div>
        <p style="font-size: 14px; color: #666; margin-top: 24px;">
          Please review this collaboration and take appropriate action.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
        <p style="font-size: 12px; color: #999;">
          This alert was sent from Flowaborate.
        </p>
      </div>
    `,
  };
}

// ============================================
// MAIN HANDLER
// ============================================
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting scheduled notification check...");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const now = new Date();
    const results = {
      reminders_24h: { sent: 0, skipped: 0 },
      reminders_1h: { sent: 0, skipped: 0 },
      exceptions: { sent: 0, skipped: 0 },
      errors: [] as string[],
    };

    // ============================================
    // 1. SEND 24-HOUR REMINDERS
    // ============================================
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    console.log(`Looking for 24h reminders between ${in24Hours.toISOString()} and ${in25Hours.toISOString()}`);

    const { data: upcoming24h, error: error24h } = await supabase
      .from("collaborations")
      .select(`
        id,
        scheduled_date,
        reschedule_count,
        workspace:workspaces(name),
        guest_profile:guest_profiles(name, email),
        host:profiles!collaborations_host_id_fkey(full_name)
      `)
      .eq("status", "scheduled")
      .gte("scheduled_date", in24Hours.toISOString())
      .lt("scheduled_date", in25Hours.toISOString());

    if (error24h) {
      console.error("Error fetching 24h reminders:", error24h);
      results.errors.push(`24h query: ${error24h.message}`);
    } else {
      for (const collab of upcoming24h || []) {
        // Check max reminder attempts (use reschedule_count as proxy, or add dedicated field)
        // For now, we'll send reminders without limit since they're time-based
        const guestProfile = Array.isArray(collab.guest_profile) ? collab.guest_profile[0] : collab.guest_profile;
        const host = Array.isArray(collab.host) ? collab.host[0] : collab.host;
        const workspace = Array.isArray(collab.workspace) ? collab.workspace[0] : collab.workspace;

        if (!guestProfile?.email) {
          results.reminders_24h.skipped++;
          continue;
        }

        const email = getReminderEmailHtml({
          guest_name: guestProfile.name || "Guest",
          host_name: host?.full_name || "Host",
          workspace_name: workspace?.name || "Podcast",
          scheduled_date: collab.scheduled_date!,
          reminderType: "24h",
        });

        const success = await sendEmail(guestProfile.email, email.subject, email.html);
        if (success) {
          results.reminders_24h.sent++;
          console.log(`24h reminder sent to ${guestProfile.email}`);
        } else {
          results.errors.push(`24h reminder failed: ${guestProfile.email}`);
        }
      }
    }

    // ============================================
    // 2. SEND 1-HOUR REMINDERS
    // ============================================
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000);
    const in2Hours = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const { data: upcoming1h, error: error1h } = await supabase
      .from("collaborations")
      .select(`
        id,
        scheduled_date,
        workspace:workspaces(name),
        guest_profile:guest_profiles(name, email),
        host:profiles!collaborations_host_id_fkey(full_name)
      `)
      .eq("status", "scheduled")
      .gte("scheduled_date", in1Hour.toISOString())
      .lt("scheduled_date", in2Hours.toISOString());

    if (error1h) {
      console.error("Error fetching 1h reminders:", error1h);
      results.errors.push(`1h query: ${error1h.message}`);
    } else {
      for (const collab of upcoming1h || []) {
        const guestProfile = Array.isArray(collab.guest_profile) ? collab.guest_profile[0] : collab.guest_profile;
        const host = Array.isArray(collab.host) ? collab.host[0] : collab.host;
        const workspace = Array.isArray(collab.workspace) ? collab.workspace[0] : collab.workspace;

        if (!guestProfile?.email) {
          results.reminders_1h.skipped++;
          continue;
        }

        const email = getReminderEmailHtml({
          guest_name: guestProfile.name || "Guest",
          host_name: host?.full_name || "Host",
          workspace_name: workspace?.name || "Podcast",
          scheduled_date: collab.scheduled_date!,
          reminderType: "1h",
        });

        const success = await sendEmail(guestProfile.email, email.subject, email.html);
        if (success) {
          results.reminders_1h.sent++;
          console.log(`1h reminder sent to ${guestProfile.email}`);
        } else {
          results.errors.push(`1h reminder failed: ${guestProfile.email}`);
        }
      }
    }

    // ============================================
    // 3. DETECT EXCEPTIONS (HOST ONLY)
    // ============================================
    
    // 3a. No-shows (scheduled date passed 24+ hours ago, still "scheduled")
    const noShowCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const { data: noShows, error: noShowError } = await supabase
      .from("collaborations")
      .select(`
        id,
        scheduled_date,
        host_id,
        workspace:workspaces(name),
        guest_profile:guest_profiles(name),
        host:profiles!collaborations_host_id_fkey(full_name, user_id)
      `)
      .eq("status", "scheduled")
      .lt("scheduled_date", noShowCutoff.toISOString());

    if (!noShowError && noShows) {
      for (const collab of noShows) {
        const guestProfile = Array.isArray(collab.guest_profile) ? collab.guest_profile[0] : collab.guest_profile;
        const host = Array.isArray(collab.host) ? collab.host[0] : collab.host;
        const workspace = Array.isArray(collab.workspace) ? collab.workspace[0] : collab.workspace;

        if (!host?.user_id) continue;

        // Get host email
        const { data: hostUser } = await supabase.auth.admin.getUserById(host.user_id);
        if (!hostUser?.user?.email) continue;

        const email = getExceptionEmailHtml({
          host_name: host.full_name || "Host",
          guest_name: guestProfile?.name || "Guest",
          workspace_name: workspace?.name || "Collaboration",
          exception_type: "no_show",
          details: `Recording was scheduled for ${formatDate(collab.scheduled_date!)} but was never marked as completed.`,
        });

        const success = await sendEmail(hostUser.user.email, email.subject, email.html);
        if (success) {
          results.exceptions.sent++;
          console.log(`No-show exception sent to ${hostUser.user.email}`);
        }
      }
    }

    // 3b. Stalled collaborations (no update for 7+ days in early stages)
    const stalledCutoff = new Date(now.getTime() - STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
    
    const { data: stalled, error: stalledError } = await supabase
      .from("collaborations")
      .select(`
        id,
        status,
        updated_at,
        host_id,
        workspace:workspaces(name),
        guest_profile:guest_profiles(name),
        host:profiles!collaborations_host_id_fkey(full_name, user_id)
      `)
      .in("status", ["invited", "intake_completed"])
      .lt("updated_at", stalledCutoff.toISOString());

    if (!stalledError && stalled) {
      for (const collab of stalled) {
        const guestProfile = Array.isArray(collab.guest_profile) ? collab.guest_profile[0] : collab.guest_profile;
        const host = Array.isArray(collab.host) ? collab.host[0] : collab.host;
        const workspace = Array.isArray(collab.workspace) ? collab.workspace[0] : collab.workspace;

        if (!host?.user_id) continue;

        const { data: hostUser } = await supabase.auth.admin.getUserById(host.user_id);
        if (!hostUser?.user?.email) continue;

        const daysSinceUpdate = Math.floor((now.getTime() - new Date(collab.updated_at).getTime()) / (24 * 60 * 60 * 1000));

        const email = getExceptionEmailHtml({
          host_name: host.full_name || "Host",
          guest_name: guestProfile?.name || "Guest",
          workspace_name: workspace?.name || "Collaboration",
          exception_type: "stalled",
          details: `No activity for ${daysSinceUpdate} days. Current status: ${collab.status}`,
        });

        const success = await sendEmail(hostUser.user.email, email.subject, email.html);
        if (success) {
          results.exceptions.sent++;
          console.log(`Stalled exception sent to ${hostUser.user.email}`);
        }
      }
    }

    console.log("Scheduled notification check complete:", results);

    return new Response(
      JSON.stringify({
        message: "Scheduled notification check complete",
        ...results,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in scheduled notifications:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
