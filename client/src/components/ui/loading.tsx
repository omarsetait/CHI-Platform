import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PageLoaderProps {
  message?: string;
  className?: string;
}

export function PageLoader({ message = "Loading...", className }: PageLoaderProps) {
  return (
    <div 
      className={cn("flex flex-col items-center justify-center min-h-[400px] gap-4", className)}
      role="status"
      aria-live="polite"
      aria-label={message}
      data-testid="page-loader"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      <p className="text-sm text-muted-foreground" aria-hidden="true">{message}</p>
    </div>
  );
}

interface InlineLoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function InlineLoader({ size = "md", className }: InlineLoaderProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <Loader2 
      className={cn("animate-spin text-muted-foreground", sizeClasses[size], className)} 
      aria-hidden="true"
      data-testid="inline-loader"
    />
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

export function TableSkeleton({ 
  rows = 5, 
  columns = 4, 
  showHeader = true,
  className 
}: TableSkeletonProps) {
  return (
    <div 
      className={cn("w-full", className)} 
      role="status" 
      aria-label="Loading table data" 
      data-testid="table-skeleton"
    >
      {showHeader && (
        <div className="flex gap-4 p-4 border-b bg-muted/50" role="presentation">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={`header-${i}`} className="h-4 flex-1" />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4 p-4 border-b" role="presentation">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={`cell-${rowIndex}-${colIndex}`} 
              className={cn("h-4 flex-1", colIndex === 0 && "max-w-[120px]")} 
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface CardSkeletonProps {
  showHeader?: boolean;
  showIcon?: boolean;
  lines?: number;
  className?: string;
}

export function CardSkeleton({ 
  showHeader = true, 
  showIcon = false,
  lines = 3,
  className 
}: CardSkeletonProps) {
  return (
    <Card className={className} data-testid="card-skeleton">
      {showHeader && (
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          {showIcon && <Skeleton className="h-10 w-10 rounded-full" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton 
            key={i} 
            className={cn("h-4", i === lines - 1 ? "w-2/3" : "w-full")} 
          />
        ))}
      </CardContent>
    </Card>
  );
}

interface MetricCardSkeletonProps {
  className?: string;
}

export function MetricCardSkeleton({ className }: MetricCardSkeletonProps) {
  return (
    <Card className={className} data-testid="metric-card-skeleton">
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-12 w-12 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

interface DashboardSkeletonProps {
  metricCards?: number;
  showTable?: boolean;
  className?: string;
}

export function DashboardSkeleton({ 
  metricCards = 4, 
  showTable = true,
  className 
}: DashboardSkeletonProps) {
  return (
    <div 
      className={cn("space-y-6", className)} 
      role="status" 
      aria-label="Loading dashboard" 
      data-testid="dashboard-skeleton"
    >
      <div className="flex items-center justify-between" role="presentation">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" role="presentation">
        {Array.from({ length: metricCards }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
      
      {showTable && (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="p-0">
            <TableSkeleton rows={5} columns={5} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface ListSkeletonProps {
  items?: number;
  showAvatar?: boolean;
  className?: string;
}

export function ListSkeleton({ items = 5, showAvatar = false, className }: ListSkeletonProps) {
  return (
    <div 
      className={cn("space-y-3", className)} 
      role="status" 
      aria-label="Loading list" 
      data-testid="list-skeleton"
    >
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 rounded-lg border" role="presentation">
          {showAvatar && <Skeleton className="h-10 w-10 rounded-full" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      ))}
    </div>
  );
}
