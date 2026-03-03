import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  loading?: boolean;
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  loading,
  className,
}: MetricCardProps) {
  return (
    <Card
      data-testid={`card-metric-${title.toLowerCase().replace(/\s+/g, "-")}`}
      className={className}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-24 mt-2" />
            ) : (
              <h3 className="text-2xl font-bold mt-2 text-foreground">
                {value}
              </h3>
            )}
            {subtitle &&
              (loading ? (
                <Skeleton className="h-3 w-32 mt-1" />
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  {subtitle}
                </p>
              ))}
          </div>
          {Icon && (
            <div className="rounded-lg bg-muted p-3">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
        </div>
        {trend &&
          !loading &&
          (
            <div className="mt-3 flex items-center gap-1">
              <span
                className={
                  trend.isPositive ? "text-chart-4" : "text-chart-2"
                }
              >
                {trend.isPositive ? "\u2191" : "\u2193"} {trend.value}
              </span>
              <span className="text-xs text-muted-foreground">
                vs last month
              </span>
            </div>
          )}
      </CardContent>
    </Card>
  );
}
