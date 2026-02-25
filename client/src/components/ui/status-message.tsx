import { cn } from "@/lib/utils";
import { 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Info,
  X,
  type LucideIcon 
} from "lucide-react";
import { Button } from "@/components/ui/button";

type StatusVariant = "success" | "error" | "warning" | "info";

interface StatusMessageProps {
  variant: StatusVariant;
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
  icon?: LucideIcon;
}

const variantConfig: Record<StatusVariant, { 
  icon: LucideIcon; 
  containerClass: string;
  iconClass: string;
  titleClass: string;
}> = {
  success: {
    icon: CheckCircle,
    containerClass: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900",
    iconClass: "text-green-600 dark:text-green-400",
    titleClass: "text-green-800 dark:text-green-200",
  },
  error: {
    icon: AlertCircle,
    containerClass: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900",
    iconClass: "text-red-600 dark:text-red-400",
    titleClass: "text-red-800 dark:text-red-200",
  },
  warning: {
    icon: AlertTriangle,
    containerClass: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900",
    iconClass: "text-amber-600 dark:text-amber-400",
    titleClass: "text-amber-800 dark:text-amber-200",
  },
  info: {
    icon: Info,
    containerClass: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900",
    iconClass: "text-blue-600 dark:text-blue-400",
    titleClass: "text-blue-800 dark:text-blue-200",
  },
};

export function StatusMessage({
  variant,
  title,
  message,
  onDismiss,
  className,
  icon,
}: StatusMessageProps) {
  const config = variantConfig[variant];
  const Icon = icon || config.icon;

  return (
    <div 
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border",
        config.containerClass,
        className
      )}
      role="alert"
      aria-live="polite"
      data-testid={`status-message-${variant}`}
    >
      <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", config.iconClass)} aria-hidden="true" />
      
      <div className="flex-1 min-w-0">
        {title && (
          <p className={cn("font-semibold text-sm", config.titleClass)}>
            {title}
          </p>
        )}
        <p className={cn("text-sm", title ? "mt-1" : "", "text-muted-foreground")}>
          {message}
        </p>
      </div>
      
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0"
          onClick={onDismiss}
          aria-label="Dismiss message"
          data-testid="button-dismiss-status"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

interface InlineStatusProps {
  variant: StatusVariant;
  message: string;
  className?: string;
}

export function InlineStatus({ variant, message, className }: InlineStatusProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div 
      className={cn("flex items-center gap-2 text-sm", className)}
      role="status"
      data-testid={`inline-status-${variant}`}
    >
      <Icon className={cn("h-4 w-4", config.iconClass)} aria-hidden="true" />
      <span className={config.titleClass}>{message}</span>
    </div>
  );
}

interface FieldErrorProps {
  message?: string;
  className?: string;
}

export function FieldError({ message, className }: FieldErrorProps) {
  if (!message) return null;

  return (
    <p 
      className={cn("text-sm text-destructive mt-1.5 flex items-center gap-1.5", className)}
      role="alert"
      data-testid="field-error"
    >
      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

interface FormSuccessProps {
  message?: string;
  className?: string;
}

export function FormSuccess({ message, className }: FormSuccessProps) {
  if (!message) return null;

  return (
    <p 
      className={cn("text-sm text-green-600 dark:text-green-400 mt-1.5 flex items-center gap-1.5", className)}
      role="status"
      data-testid="form-success"
    >
      <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}
