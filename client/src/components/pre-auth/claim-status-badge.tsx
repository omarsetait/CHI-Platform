import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  FileSearch,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

type PreAuthClaimStatus = "ingested" | "analyzing" | "aggregated" | "pending_review" | "approved" | "rejected" | "request_info";

interface PreAuthClaimStatusBadgeProps {
  status: PreAuthClaimStatus;
  className?: string;
}

const statusConfig: Record<PreAuthClaimStatus, {
  label: string;
  icon: typeof CheckCircle;
  className: string;
}> = {
  ingested: {
    label: "Ingested",
    icon: FileSearch,
    className: "bg-muted text-muted-foreground",
  },
  analyzing: {
    label: "Analyzing",
    icon: Loader2,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  },
  aggregated: {
    label: "Aggregated",
    icon: Clock,
    className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  },
  pending_review: {
    label: "Pending Review",
    icon: Clock,
    className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle,
    className: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  },
  request_info: {
    label: "Request Info",
    icon: AlertCircle,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  },
};

export function PreAuthClaimStatusBadge({ status, className }: PreAuthClaimStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge 
      variant="secondary"
      className={cn(config.className, "gap-1.5", className)}
      data-testid={`badge-preauth-status-${status}`}
    >
      <Icon className={cn("w-3 h-3", status === "analyzing" && "animate-spin")} />
      {config.label}
    </Badge>
  );
}
