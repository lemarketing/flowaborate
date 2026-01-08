import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCollaborations, useCreateCollaboration } from "@/hooks/useCollaborations";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { WaitingOnBadge } from "@/components/collaborations/WaitingOnBadge";
import { Plus, Users, Copy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Collaborations() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: collaborations, isLoading } = useCollaborations();
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces();
  const createCollaboration = useCreateCollaboration();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestName, setGuestName] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-48" />
          <Skeleton className="h-40" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) return null;

  const hasWorkspaces = workspaces && workspaces.length > 0;

  const handleCreateCollaboration = async () => {
    if (!selectedWorkspace) {
      toast({
        variant: "destructive",
        title: "Workspace required",
        description: "Please select a workspace",
      });
      return;
    }

    try {
      const collab = await createCollaboration.mutateAsync({
        workspace_id: selectedWorkspace,
      });

      toast({
        title: "Collaboration created!",
        description: "Share the invite link with your guest.",
      });

      setIsDialogOpen(false);
      setSelectedWorkspace("");
      setGuestEmail("");
      setGuestName("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create collaboration. Please try again.",
      });
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copied!",
      description: "Share this link with your guest.",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-bold text-foreground">Collaborations</h1>
            <p className="mt-1 text-muted-foreground">
              Manage all your guest collaborations in one place.
            </p>
          </div>
          {hasWorkspaces ? (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Collaboration
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Collaboration</DialogTitle>
                  <DialogDescription>
                    Create a new collaboration and invite a guest.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="workspace">Workspace</Label>
                    <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a workspace" />
                      </SelectTrigger>
                      <SelectContent>
                        {workspaces?.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateCollaboration} 
                    disabled={createCollaboration.isPending || !selectedWorkspace}
                  >
                    {createCollaboration.isPending ? "Creating..." : "Create & Get Invite Link"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <Button asChild>
              <Link to="/dashboard/workspaces">
                <Plus className="mr-2 h-4 w-4" />
                Create Workspace First
              </Link>
            </Button>
          )}
        </div>

        {!hasWorkspaces ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-6 text-lg font-medium text-foreground">Create a workspace first</h3>
              <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
                You need at least one workspace before creating collaborations.
              </p>
              <Button className="mt-6" asChild>
                <Link to="/dashboard/workspaces">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Workspace
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : collaborations && collaborations.length > 0 ? (
          <div className="space-y-4">
            {collaborations.map((collab) => (
              <Link key={collab.id} to={`/dashboard/collaborations/${collab.id}`}>
                <Card className="transition-shadow hover:shadow-md cursor-pointer">
                  <CardHeader className="flex flex-row items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">
                          {collab.guest_profile?.name || "Guest Pending"}
                        </CardTitle>
                        <StatusBadge status={collab.status} />
                      </div>
                      <CardDescription>
                        {collab.workspace?.name} • Created {format(new Date(collab.created_at), "MMM d, yyyy")}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {collab.invite_token && collab.status === "invited" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            copyInviteLink(collab.invite_token!);
                          }}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Invite Link
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        {collab.scheduled_date && (
                          <div>
                            <span className="font-medium">Scheduled:</span>{" "}
                            {format(new Date(collab.scheduled_date), "MMM d, yyyy 'at' h:mm a")}
                          </div>
                        )}
                        {collab.guest_profile?.email && (
                          <div>
                            <span className="font-medium">Guest:</span>{" "}
                            {collab.guest_profile.email}
                          </div>
                        )}
                      </div>
                      <WaitingOnBadge collaboration={collab} showAction />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mt-6 text-lg font-medium text-foreground">No collaborations yet</h3>
              <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
                Create your first collaboration to invite a guest and start the workflow.
              </p>
              <Button className="mt-6" onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Collaboration
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
