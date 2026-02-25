import { cn } from "@/lib/utils";
import { Check, ChevronRight, Loader2 } from "lucide-react";

type PreAuthWorkflowPhase = 1 | 2 | 3 | 4 | 5 | 6;

interface PreAuthPhaseIndicatorProps {
  currentPhase: PreAuthWorkflowPhase;
  className?: string;
}

const phases = [
  { id: 1, name: "Ingest", short: "P1" },
  { id: 2, name: "Analysis", short: "P2" },
  { id: 3, name: "Aggregation", short: "P3" },
  { id: 4, name: "Recommendation", short: "P4" },
  { id: 5, name: "Adjudicator", short: "P5" },
  { id: 6, name: "RLHF", short: "P6" },
];

export function PreAuthPhaseIndicator({ currentPhase, className }: PreAuthPhaseIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-1", className)} data-testid="preauth-phase-indicator">
      {phases.map((phase, index) => {
        const isComplete = phase.id < currentPhase;
        const isCurrent = phase.id === currentPhase;
        const isPending = phase.id > currentPhase;

        return (
          <div key={phase.id} className="flex items-center">
            <div
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium transition-colors",
                isComplete && "bg-primary text-primary-foreground",
                isCurrent && "bg-primary/20 text-primary border-2 border-primary",
                isPending && "bg-muted text-muted-foreground"
              )}
              title={phase.name}
              data-testid={`preauth-phase-${phase.id}`}
            >
              {isComplete ? (
                <Check className="w-3.5 h-3.5" />
              ) : isCurrent ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                phase.short
              )}
            </div>
            {index < phases.length - 1 && (
              <ChevronRight className={cn(
                "w-4 h-4 mx-0.5",
                phase.id < currentPhase ? "text-primary" : "text-muted-foreground/50"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
