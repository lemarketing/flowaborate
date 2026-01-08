import { Badge } from "@/components/ui/badge";
import { User, Clock, CheckCircle2 } from "lucide-react";
import { getStatusInfo, type StatusInfo, type ResponsibleParty } from "@/lib/collaborationStateMachine";

// Re-export for backward compatibility
export type WaitingOn = ResponsibleParty;
export type WaitingOnInfo = StatusInfo;
export const getWaitingOnInfo = getStatusInfo;

interface WaitingOnBadgeProps {
  collaboration: {
    status: string;
    guest_profile_id?: string | null;
    scheduled_date?: string | null;
    recorded_date?: string | null;
    delivery_date?: string | null;
  };
  showAction?: boolean;
}

export function WaitingOnBadge({ collaboration, showAction = false }: WaitingOnBadgeProps) {
  const info = getStatusInfo(collaboration);

  const getVariantStyles = () => {
    switch (info.waitingOn) {
      case "guest":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "host":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "editor":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "none":
        return "bg-green-100 text-green-800 border-green-200";
    }
  };

  const getIcon = () => {
    switch (info.waitingOn) {
      case "guest":
        return <User className="h-3 w-3" />;
      case "host":
        return <Clock className="h-3 w-3" />;
      case "editor":
        return <Clock className="h-3 w-3" />;
      case "none":
        return <CheckCircle2 className="h-3 w-3" />;
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={`${getVariantStyles()} flex items-center gap-1`}>
        {getIcon()}
        <span>Waiting on {info.label}</span>
      </Badge>
      {showAction && (
        <span className="text-xs text-muted-foreground">{info.action}</span>
      )}
    </div>
  );
}
