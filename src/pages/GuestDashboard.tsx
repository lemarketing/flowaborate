import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { GuestResponsibilityView } from "@/components/responsibility/GuestResponsibilityView";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, LogOut } from "lucide-react";
import flowaborateLogo from "@/assets/flowaborate-logo.svg";

export default function GuestDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/auth");
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={flowaborateLogo} alt="Flowaborate" className="h-8" />
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Your Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <GuestResponsibilityView />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
