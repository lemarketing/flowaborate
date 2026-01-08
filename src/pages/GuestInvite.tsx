import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle } from "lucide-react";
import GuestIntakeForm from "@/components/guest/GuestIntakeForm";
import GuestSchedulingForm from "@/components/guest/GuestSchedulingForm";

type InviteStep = "loading" | "auth" | "intake" | "scheduling" | "complete" | "error";

interface CollaborationData {
  id: string;
  workspace_id: string;
  scheduled_date: string | null;
  prep_date: string | null;
  reschedule_count: number;
  workspace: {
    name: string;
    welcome_message: string | null;
    welcome_video_url: string | null;
  };
  host: {
    full_name: string | null;
  } | null;
}

export default function GuestInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState<InviteStep>("loading");
  const [collaboration, setCollaboration] = useState<CollaborationData | null>(null);
  const [guestProfileId, setGuestProfileId] = useState<string | null>(null);
  const [guestProfile, setGuestProfile] = useState<{ name: string; email: string } | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch collaboration by invite token
  useEffect(() => {
    async function fetchCollaboration() {
      if (!token) {
        setStep("error");
        return;
      }

      const { data, error } = await supabase
        .from("collaborations")
        .select(`
          id,
          workspace_id,
          scheduled_date,
          prep_date,
          reschedule_count,
          guest_profile_id,
          workspace:workspaces(name, welcome_message, welcome_video_url),
          host:profiles!collaborations_host_id_fkey(full_name)
        `)
        .eq("invite_token", token)
        .single();

      if (error || !data) {
        setStep("error");
        return;
      }

      // Transform nested data
      const collabData: CollaborationData = {
        id: data.id,
        workspace_id: data.workspace_id,
        scheduled_date: data.scheduled_date,
        prep_date: data.prep_date,
        reschedule_count: data.reschedule_count || 0,
        workspace: Array.isArray(data.workspace) ? data.workspace[0] : data.workspace,
        host: Array.isArray(data.host) ? data.host[0] : data.host,
      };

      setCollaboration(collabData);
      setGuestProfileId(data.guest_profile_id);
    }

    fetchCollaboration();
  }, [token]);

  // Determine step based on auth state and collaboration data
  useEffect(() => {
    if (authLoading) return;
    if (!collaboration) return;

    if (!user) {
      setStep("auth");
    } else {
      // Check if intake is already completed
      checkIntakeStatus();
    }
  }, [user, authLoading, collaboration]);

  async function checkIntakeStatus() {
    if (!collaboration) return;

    // If there's already a guest profile linked, check if it belongs to this user
    if (guestProfileId) {
      const { data: profile } = await supabase
        .from("guest_profiles")
        .select("user_id, bio, name, email")
        .eq("id", guestProfileId)
        .single();

      if (profile?.user_id === user?.id && profile?.bio) {
        setGuestProfile({ name: profile.name, email: profile.email });
        // Intake complete - check if scheduling is done
        if (collaboration.scheduled_date) {
          setStep("complete");
        } else {
          setStep("scheduling");
        }
        return;
      }
    }

    setStep("intake");
  }

  async function handleIntakeComplete(profileId: string) {
    // Fetch the profile data for email notifications
    const { data: profile } = await supabase
      .from("guest_profiles")
      .select("name, email")
      .eq("id", profileId)
      .single();

    if (profile) {
      setGuestProfile({ name: profile.name, email: profile.email });
    }

    // Link the guest profile to the collaboration
    const { error } = await supabase
      .from("collaborations")
      .update({
        guest_profile_id: profileId,
        status: "intake_completed" as const,
      })
      .eq("id", collaboration?.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update collaboration status.",
        variant: "destructive",
      });
      return;
    }

    setStep("scheduling");
  }

  function handleSchedulingComplete() {
    setStep("complete");
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/invite/${token}`,
            data: { full_name: fullName },
          },
        });

        if (error) throw error;

        // Also assign guest role
        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (newUser) {
          await supabase.from("user_roles").insert({
            user_id: newUser.id,
            role: "guest" as const,
          });
        }

        toast({
          title: "Account created!",
          description: "Please complete your intake form.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
      }
    } catch (error: any) {
      toast({
        title: "Authentication failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }


  if (step === "loading" || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Invalid Invite</CardTitle>
            <CardDescription>
              This invite link is invalid or has expired. Please contact the host for a new invite.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (step === "complete") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
            <CardTitle>You're All Set!</CardTitle>
            <CardDescription>
              Your session is scheduled. You'll receive a confirmation email with details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/guest")} className="w-full">
              Go to Your Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Welcome Header */}
      <div className="bg-primary/5 border-b border-border py-8 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Welcome to {collaboration?.workspace.name}
          </h1>
          {collaboration?.host?.full_name && (
            <p className="text-muted-foreground">
              You've been invited by {collaboration.host.full_name}
            </p>
          )}
          {collaboration?.workspace.welcome_message && (
            <p className="mt-4 text-foreground/80">
              {collaboration.workspace.welcome_message}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 py-8">
        {step === "auth" && (
          <Card>
            <CardHeader>
              <CardTitle>
                {authMode === "signup" ? "Create Your Account" : "Sign In"}
              </CardTitle>
              <CardDescription>
                {authMode === "signup"
                  ? "Create a free account to continue with your collaboration."
                  : "Sign in to your existing account."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === "signup" && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                      required
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {authMode === "signup" ? "Create Account" : "Sign In"}
                </Button>
              </form>
              <div className="mt-4 text-center text-sm">
                {authMode === "signup" ? (
                  <p className="text-muted-foreground">
                    Already have an account?{" "}
                    <button
                      onClick={() => setAuthMode("signin")}
                      className="text-primary hover:underline"
                    >
                      Sign in
                    </button>
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    Don't have an account?{" "}
                    <button
                      onClick={() => setAuthMode("signup")}
                      className="text-primary hover:underline"
                    >
                      Create one
                    </button>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {step === "intake" && user && collaboration && (
          <GuestIntakeForm
            userId={user.id}
            collaborationId={collaboration.id}
            existingProfileId={guestProfileId}
            onComplete={handleIntakeComplete}
          />
        )}

        {step === "scheduling" && collaboration && (
          <GuestSchedulingForm
            collaborationId={collaboration.id}
            workspaceId={collaboration.workspace_id}
            guestEmail={guestProfile?.email}
            guestName={guestProfile?.name}
            hostName={collaboration.host?.full_name || undefined}
            workspaceName={collaboration.workspace.name}
            existingSchedule={{
              scheduled_date: collaboration.scheduled_date,
              prep_date: collaboration.prep_date,
              reschedule_count: collaboration.reschedule_count,
            }}
            onComplete={handleSchedulingComplete}
          />
        )}
      </div>
    </div>
  );
}
