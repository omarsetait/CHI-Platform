import { cn } from "@/lib/utils";

interface SkipLinkProps {
  href?: string;
  className?: string;
  children?: React.ReactNode;
}

export function SkipLink({ 
  href = "#main-content", 
  className,
  children = "Skip to main content" 
}: SkipLinkProps) {
  return (
    <a
      href={href}
      tabIndex={0}
      className={cn(
        "sr-only focus:not-sr-only",
        "focus:fixed focus:top-4 focus:left-4 focus:z-[100]",
        "focus:px-4 focus:py-2 focus:rounded-md",
        "focus:bg-primary focus:text-primary-foreground",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "focus:shadow-lg",
        className
      )}
      data-testid="skip-link"
    >
      {children}
    </a>
  );
}
