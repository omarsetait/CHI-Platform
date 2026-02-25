import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type PreAuthSeverity = "HIGH" | "MEDIUM" | "LOW";

interface PreAuthRiskBadgeProps {
  severity: PreAuthSeverity;
  showIcon?: boolean;
  className?: string;
}

const severityConfig: Record<PreAuthSeverity, {
  label: string;
  icon: typeof AlertTriangle;
  className: string;
}> = {
  HIGH: {
    label: "High Risk",
    icon: AlertTriangle,
    className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  },
  MEDIUM: {
    label: "Medium Risk",
    icon: AlertCircle,
    className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  },
  LOW: {
    label: "Low Risk",
    icon: CheckCircle,
    className: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  },
};

export function PreAuthRiskBadge({ severity, showIcon = true, className }: PreAuthRiskBadgeProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <Badge 
      variant="secondary"
      className={cn(config.className, "gap-1.5", className)}
      data-testid={`badge-preauth-risk-${severity.toLowerCase()}`}
    >
      {showIcon && <Icon className="w-3 h-3" />}
      {config.label}
    </Badge>
  );
}
