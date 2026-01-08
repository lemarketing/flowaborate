import { cn } from "@/lib/utils";
import { 
  STATUS_LABELS, 
  type CollaborationStatus 
} from "@/lib/collaborationStateMachine";

// Re-export for backward compatibility
export type { CollaborationStatus };

const statusStyles: Record<CollaborationStatus, string> = {
  invited: "bg-accent text-accent-foreground",
  intake_completed: "bg-accent text-accent-foreground",
  scheduled: "bg-primary/10 text-primary",
  recorded: "bg-primary/20 text-primary",
  editing: "bg-secondary/20 text-secondary-foreground",
  ready: "bg-primary/30 text-primary",
  completed: "bg-primary text-primary-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

interface StatusBadgeProps {
  status: CollaborationStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
