import { useState } from "react";
import { Task, useToggleTaskComplete, useCreateTask, useCreateDefaultTasks, DEFAULT_PREP_TASKS, DEFAULT_POST_TASKS } from "@/hooks/useTasks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, ListTodo, CheckCircle2, Loader2, Sparkles } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

interface TaskListProps {
  collaborationId: string;
  tasks: Task[];
  isLoading?: boolean;
}

export function TaskList({ collaborationId, tasks, isLoading }: TaskListProps) {
  const { toast } = useToast();
  const toggleComplete = useToggleTaskComplete();
  const createTask = useCreateTask();
  const createDefaultTasks = useCreateDefaultTasks();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskRole, setNewTaskRole] = useState<"host" | "editor" | "guest">("host");

  const completedTasks = tasks.filter((t) => t.is_completed);
  const pendingTasks = tasks.filter((t) => !t.is_completed && !t.is_skipped);
  const progress = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  const handleToggleComplete = async (task: Task) => {
    try {
      await toggleComplete.mutateAsync({
        id: task.id,
        is_completed: !task.is_completed,
        collaboration_id: task.collaboration_id,
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update task",
      });
    }
  };

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      await createTask.mutateAsync({
        collaboration_id: collaborationId,
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || null,
        assigned_role: newTaskRole,
      });

      toast({ title: "Task created" });
      setIsDialogOpen(false);
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskRole("host");
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create task",
      });
    }
  };

  const handleAddDefaultTasks = async (phase: "prep" | "post") => {
    try {
      await createDefaultTasks.mutateAsync({ collaborationId, phase });
      toast({
        title: "Tasks added",
        description: `Added ${phase === "prep" ? "preparation" : "post-production"} tasks`,
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add tasks",
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "host":
        return "default";
      case "editor":
        return "secondary";
      case "guest":
        return "outline";
      default:
        return "default";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ListTodo className="h-5 w-5" />
              Tasks
            </CardTitle>
            <CardDescription>
              {completedTasks.length} of {tasks.length} completed ({progress}%)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Task</DialogTitle>
                  <DialogDescription>
                    Create a new task for this collaboration.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      placeholder="Task title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea
                      id="description"
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                      placeholder="Task details..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Assigned To</Label>
                    <Select value={newTaskRole} onValueChange={(v) => setNewTaskRole(v as "host" | "editor" | "guest")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="host">Host</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="guest">Guest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTask} disabled={!newTaskTitle.trim() || createTask.isPending}>
                    {createTask.isPending ? "Creating..." : "Add Task"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 w-full rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {tasks.length === 0 ? (
          <div className="space-y-4 text-center py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mx-auto">
              <ListTodo className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">No tasks yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add default task templates or create custom tasks.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddDefaultTasks("prep")}
                disabled={createDefaultTasks.isPending}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Add Prep Tasks ({DEFAULT_PREP_TASKS.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddDefaultTasks("post")}
                disabled={createDefaultTasks.isPending}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Add Post-Production Tasks ({DEFAULT_POST_TASKS.length})
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Pending tasks */}
            {pendingTasks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">To Do</h4>
                <div className="space-y-2">
                  {pendingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        checked={task.is_completed}
                        onCheckedChange={() => handleToggleComplete(task)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{task.title}</span>
                          <Badge variant={getRoleBadgeVariant(task.assigned_role)} className="text-xs">
                            {task.assigned_role}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed tasks */}
            {completedTasks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Completed ({completedTasks.length})
                </h4>
                <div className="space-y-2">
                  {completedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 rounded-lg border border-dashed p-3 opacity-60"
                    >
                      <Checkbox
                        checked={task.is_completed}
                        onCheckedChange={() => handleToggleComplete(task)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground line-through">{task.title}</span>
                          <Badge variant={getRoleBadgeVariant(task.assigned_role)} className="text-xs">
                            {task.assigned_role}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick add buttons */}
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAddDefaultTasks("prep")}
                disabled={createDefaultTasks.isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Prep Tasks
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAddDefaultTasks("post")}
                disabled={createDefaultTasks.isPending}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Post Tasks
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}