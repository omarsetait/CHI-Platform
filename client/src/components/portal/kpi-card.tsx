import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string | number;
  format?: "number" | "percent" | "currency";
  trend?: { direction: "up" | "down" | "flat"; value: string };
  benchmark?: { label: string; value: string };
  icon: LucideIcon;
  iconColor: string;
  borderColor: string;
  onClick?: () => void;
}

function formatValue(value: string | number, format?: string): string {
  if (typeof value === "string") return value;
  switch (format) {
    case "percent":
      return `${value}%`;
    case "currency":
      return `${value.toLocaleString()} SAR`;
    case "number":
    default:
      return value.toLocaleString();
  }
}

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

const trendColors = {
  up: "text-emerald-600",
  down: "text-red-600",
  flat: "text-muted-foreground",
};

export function KpiCard({
  title,
  value,
  format,
  trend,
  benchmark,
  icon: Icon,
  iconColor,
  borderColor,
  onClick,
}: KpiCardProps) {
  const TrendIcon = trend ? trendIcons[trend.direction] : null;

  return (
    <Card
      className={cn(
        "border-l-4 transition-shadow",
        borderColor,
        onClick && "cursor-pointer hover:shadow-md"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <p className="text-2xl font-bold">{formatValue(value, format)}</p>
          </div>
          <div
            className={cn(
              "flex items-center justify-center h-10 w-10 rounded-lg bg-muted/50",
              iconColor
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {(trend || benchmark) && (
          <div className="flex items-center gap-3 mt-2 text-xs">
            {trend && TrendIcon && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 font-medium",
                  trendColors[trend.direction]
                )}
              >
                <TrendIcon className="h-3 w-3" />
                {trend.value}
              </span>
            )}
            {benchmark && (
              <span className="text-muted-foreground">
                {benchmark.label}: {benchmark.value}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
