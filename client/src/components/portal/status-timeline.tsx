import { Check, Loader2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TimelineStep {
  status: string;
  date: string;
  note: string;
  isComplete: boolean;
  isActive: boolean;
}

interface StatusTimelineProps {
  steps: TimelineStep[];
}

export function StatusTimeline({ steps }: StatusTimelineProps) {
  return (
    <div className="relative space-y-0">
      {steps.map((step, index) => (
        <div key={index} className="flex gap-3">
          {/* Vertical line + icon */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "flex items-center justify-center h-7 w-7 rounded-full border-2 shrink-0",
                step.isComplete &&
                  "bg-emerald-100 border-emerald-500 text-emerald-600",
                step.isActive &&
                  !step.isComplete &&
                  "bg-blue-100 border-blue-500 text-blue-600",
                !step.isComplete &&
                  !step.isActive &&
                  "bg-muted border-muted-foreground/30 text-muted-foreground"
              )}
            >
              {step.isComplete ? (
                <Check className="h-3.5 w-3.5" />
              ) : step.isActive ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "w-0.5 flex-1 min-h-[24px]",
                  step.isComplete ? "bg-emerald-300" : "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
          {/* Content */}
          <div className="pb-4 pt-0.5">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-sm font-medium",
                  step.isComplete && "text-emerald-700",
                  step.isActive && !step.isComplete && "text-blue-700",
                  !step.isComplete && !step.isActive && "text-muted-foreground"
                )}
              >
                {step.status}
              </span>
              <span className="text-xs text-muted-foreground">{step.date}</span>
            </div>
            {step.note && (
              <p className="text-sm text-muted-foreground mt-0.5">{step.note}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
