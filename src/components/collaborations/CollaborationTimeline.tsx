import { format } from "date-fns";
import { Clock, ArrowRight } from "lucide-react";
import { useStatusHistory } from "@/hooks/useStatusHistory";
import { Skeleton } from "@/components/ui/skeleton";

interface CollaborationTimelineProps {
  collaborationId: string;
}

const formatStatus = (status: string) => {
  return status
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const CollaborationTimeline = ({ collaborationId }: CollaborationTimelineProps) => {
  const { data: history, isLoading } = useStatusHistory(collaborationId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!history?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No status changes recorded yet</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
      
      <div className="space-y-6">
        {history.map((entry, index) => (
          <div key={entry.id} className="relative flex gap-4">
            {/* Timeline dot */}
            <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
              index === 0 ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 bg-background"
            }`}>
              <Clock className="h-4 w-4" />
            </div>
            
            {/* Content */}
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                {entry.old_status && (
                  <>
                    <span className="text-muted-foreground">
                      {formatStatus(entry.old_status)}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </>
                )}
                <span className="font-medium">
                  {formatStatus(entry.new_status)}
                </span>
              </div>
              
              <div className="mt-1 text-sm text-muted-foreground">
                <span>{format(new Date(entry.changed_at), "MMM d, yyyy 'at' h:mm a")}</span>
                <span className="mx-2">•</span>
                <span>by {entry.changed_by_name}</span>
              </div>
              
              {entry.notes && (
                <p className="mt-2 text-sm text-muted-foreground italic">
                  {entry.notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
