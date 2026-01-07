import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Task = Tables<"tasks">;
export type TaskInsert = TablesInsert<"tasks">;
export type TaskUpdate = TablesUpdate<"tasks">;

// Default task templates for new collaborations
export const DEFAULT_PREP_TASKS = [
  { title: "Review guest intake form", description: "Check bio, topics, and pronunciation notes", assigned_role: "host" as const },
  { title: "Prepare interview questions", description: "Create tailored questions based on guest expertise", assigned_role: "host" as const },
  { title: "Send calendar invite", description: "Include meeting link and preparation tips", assigned_role: "host" as const },
  { title: "Test recording equipment", description: "Check audio/video quality before session", assigned_role: "host" as const },
];

export const DEFAULT_POST_TASKS = [
  { title: "Edit raw footage", description: "Clean up audio, remove filler words", assigned_role: "editor" as const },
  { title: "Create show notes", description: "Write episode summary and timestamps", assigned_role: "editor" as const },
  { title: "Design thumbnail", description: "Create eye-catching episode artwork", assigned_role: "editor" as const },
  { title: "Upload to platforms", description: "Publish to podcast hosting and YouTube", assigned_role: "host" as const },
  { title: "Notify guest of publication", description: "Send guest the links and promotional materials", assigned_role: "host" as const },
  { title: "Share on social media", description: "Post clips and announcements", assigned_role: "host" as const },
];

export function useTasks(collaborationId: string | undefined) {
  return useQuery({
    queryKey: ["tasks", collaborationId],
    queryFn: async () => {
      if (!collaborationId) return [];
      
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("collaboration_id", collaborationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Task[];
    },
    enabled: !!collaborationId,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: TaskInsert) => {
      const { data, error } = await supabase
        .from("tasks")
        .insert(task)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", data.collaboration_id] });
    },
  });
}

export function useCreateDefaultTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ collaborationId, phase }: { collaborationId: string; phase: "prep" | "post" }) => {
      const templates = phase === "prep" ? DEFAULT_PREP_TASKS : DEFAULT_POST_TASKS;
      
      const tasks = templates.map((t) => ({
        collaboration_id: collaborationId,
        title: t.title,
        description: t.description,
        assigned_role: t.assigned_role,
      }));

      const { data, error } = await supabase
        .from("tasks")
        .insert(tasks)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", variables.collaborationId] });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TaskUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", data.collaboration_id] });
    },
  });
}

export function useToggleTaskComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_completed, collaboration_id }: { id: string; is_completed: boolean; collaboration_id: string }) => {
      const { data, error } = await supabase
        .from("tasks")
        .update({
          is_completed,
          completed_at: is_completed ? new Date().toISOString() : null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["tasks", data.collaboration_id] });
    },
  });
}