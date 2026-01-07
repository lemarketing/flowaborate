import { cn } from "@/lib/utils";
import { Database } from "@/integrations/supabase/types";

export type CollaborationStatus = Database["public"]["Enums"]["collaboration_status"];

const statusConfig: Record<
  CollaborationStatus,
  { label: string; className: string }
> = {
  invited: {
    label: "Invited",
    className: "bg-accent text-accent-foreground",
  },
  intake_completed: {
    label: "Intake Completed",
    className: "bg-accent text-accent-foreground",
  },
  scheduled: {
    label: "Scheduled",
    className: "bg-primary/10 text-primary",
  },
  recorded: {
    label: "Recorded",
    className: "bg-primary/20 text-primary",
  },
  editing: {
    label: "Editing",
    className: "bg-secondary/20 text-secondary-foreground",
  },
  ready: {
    label: "Ready",
    className: "bg-primary/30 text-primary",
  },
  completed: {
    label: "Completed",
    className: "bg-primary text-primary-foreground",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-destructive/10 text-destructive",
  },
};

interface StatusBadgeProps {
  status: CollaborationStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
