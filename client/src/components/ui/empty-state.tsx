import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { 
  FileSearch, 
  Inbox, 
  Users, 
  FileText, 
  AlertCircle,
  Plus,
  Search,
  FolderOpen,
  type LucideIcon
} from "lucide-react";

type EmptyStateVariant = "default" | "search" | "filter" | "error" | "no-data";

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const variantIcons: Record<EmptyStateVariant, LucideIcon> = {
  default: Inbox,
  search: FileSearch,
  filter: Search,
  error: AlertCircle,
  "no-data": FolderOpen,
};

const variantColors: Record<EmptyStateVariant, string> = {
  default: "bg-muted text-muted-foreground",
  search: "bg-primary/10 text-primary",
  filter: "bg-accent/10 text-accent",
  error: "bg-destructive/10 text-destructive",
  "no-data": "bg-muted text-muted-foreground",
};

export function EmptyState({
  variant = "default",
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  const Icon = icon || variantIcons[variant];
  const colorClass = variantColors[variant];

  return (
    <div 
      className={cn("flex flex-col items-center justify-center py-12 px-6 text-center", className)}
      role="status"
      data-testid="empty-state"
    >
      <div className={cn("p-4 rounded-full mb-4", colorClass)}>
        <Icon className="h-8 w-8" aria-hidden="true" />
      </div>
      
      <h3 className="text-lg font-semibold mb-2" data-testid="empty-state-title">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-muted-foreground max-w-md mb-6" data-testid="empty-state-description">
          {description}
        </p>
      )}
      
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {action && (
            <Button onClick={action.onClick} data-testid="empty-state-action">
              {action.icon && <action.icon className="h-4 w-4 mr-2" aria-hidden="true" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button 
              variant="outline" 
              onClick={secondaryAction.onClick}
              data-testid="empty-state-secondary-action"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

interface EmptyStateCardProps extends EmptyStateProps {
  cardClassName?: string;
}

export function EmptyStateCard({ cardClassName, ...props }: EmptyStateCardProps) {
  return (
    <Card className={cardClassName}>
      <CardContent className="p-0">
        <EmptyState {...props} />
      </CardContent>
    </Card>
  );
}

interface NoResultsProps {
  searchTerm?: string;
  onClearSearch?: () => void;
  entityName?: string;
  className?: string;
}

export function NoResults({ 
  searchTerm, 
  onClearSearch, 
  entityName = "results",
  className 
}: NoResultsProps) {
  return (
    <EmptyState
      variant="search"
      title={searchTerm ? `No ${entityName} found for "${searchTerm}"` : `No ${entityName} found`}
      description="Try adjusting your search or filter criteria to find what you're looking for."
      action={onClearSearch ? {
        label: "Clear search",
        onClick: onClearSearch,
      } : undefined}
      className={className}
    />
  );
}

interface NoDataProps {
  entityName: string;
  onCreate?: () => void;
  createLabel?: string;
  className?: string;
}

export function NoData({ 
  entityName, 
  onCreate, 
  createLabel,
  className 
}: NoDataProps) {
  return (
    <EmptyState
      variant="no-data"
      title={`No ${entityName} yet`}
      description={`Get started by creating your first ${entityName.toLowerCase()}.`}
      action={onCreate ? {
        label: createLabel || `Create ${entityName}`,
        onClick: onCreate,
        icon: Plus,
      } : undefined}
      className={className}
    />
  );
}

export const emptyStatePresets = {
  claims: {
    icon: FileText,
    title: "No claims to display",
    description: "Claims will appear here once they are submitted for processing.",
  },
  cases: {
    icon: FileSearch,
    title: "No cases found",
    description: "FWA cases will be listed here when suspicious activity is detected.",
  },
  providers: {
    icon: Users,
    title: "No providers found",
    description: "Provider information will be displayed once added to the system.",
  },
  patients: {
    icon: Users,
    title: "No patients found",
    description: "Patient records will appear here once they are added.",
  },
} as const;
