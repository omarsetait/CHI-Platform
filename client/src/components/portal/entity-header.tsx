import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface EntityHeaderProps {
  icon: LucideIcon;
  name: string;
  nameAr?: string;
  identifiers: Array<{ label: string; value: string }>;
  status?: { label: string; variant: "success" | "warning" | "danger" };
  pillarTheme: string;
}

const statusColors = {
  success: "bg-emerald-100 text-emerald-800 border-emerald-200",
  warning: "bg-amber-100 text-amber-800 border-amber-200",
  danger: "bg-red-100 text-red-800 border-red-200",
};

export function EntityHeader({
  icon: Icon,
  name,
  nameAr,
  identifiers,
  status,
  pillarTheme,
}: EntityHeaderProps) {
  return (
    <div className="flex items-start gap-4 p-5 rounded-xl border bg-card shadow-sm">
      <div
        className={cn(
          "flex items-center justify-center h-12 w-12 rounded-lg shrink-0",
          pillarTheme
        )}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-semibold truncate">{name}</h1>
          {nameAr && (
            <span className="text-lg text-muted-foreground font-medium" dir="rtl">
              {nameAr}
            </span>
          )}
          {status && (
            <Badge
              variant="outline"
              className={cn("text-xs", statusColors[status.variant])}
            >
              {status.label}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4 mt-1.5 flex-wrap">
          {identifiers.map((id) => (
            <span key={id.label} className="text-sm text-muted-foreground">
              <span className="font-medium">{id.label}:</span> {id.value}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
