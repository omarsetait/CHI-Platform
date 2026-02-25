import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PreAuthRiskBadge } from "./risk-badge";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  FileCheck, 
  Stethoscope, 
  History, 
  FileWarning,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertOctagon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

type PreAuthSignalType = "regulatory_compliance" | "coverage_eligibility" | "clinical_necessity" | "past_patterns" | "disclosure_check";
type PreAuthSeverity = "HIGH" | "MEDIUM" | "LOW";
type PreAuthRecommendation = "APPROVE" | "REJECT" | "PEND_REVIEW" | "REQUEST_INFO";

interface PreAuthSignalCardProps {
  signal: {
    signalId: string;
    detector: PreAuthSignalType;
    severity?: PreAuthSeverity | null;
    confidence?: string | number | null;
    recommendation?: PreAuthRecommendation | null;
    rationale?: string | null;
    evidence?: Array<{
      source: string;
      quote: string;
      clause_id?: string;
    }> | null;
    missingInfo?: string[] | null;
    isHardStop?: boolean | null;
    riskFlag?: boolean | null;
  };
  className?: string;
}

const detectorConfig: Record<PreAuthSignalType, {
  icon: typeof Shield;
  label: string;
  layer: number;
  color: string;
  bgColor: string;
}> = {
  regulatory_compliance: {
    icon: Shield,
    label: "Regulatory & Compliance",
    layer: 1,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/50",
  },
  coverage_eligibility: {
    icon: FileCheck,
    label: "Coverage & Eligibility",
    layer: 2,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/50",
  },
  clinical_necessity: {
    icon: Stethoscope,
    label: "Clinical Necessity",
    layer: 3,
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-50 dark:bg-teal-950/50",
  },
  past_patterns: {
    icon: History,
    label: "Past Visits & Patterns",
    layer: 4,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/50",
  },
  disclosure_check: {
    icon: FileWarning,
    label: "Disclosure Checker",
    layer: 5,
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-50 dark:bg-rose-950/50",
  },
};

export function PreAuthSignalCard({ signal, className }: PreAuthSignalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = detectorConfig[signal.detector];
  const Icon = config.icon;
  const confidencePercent = Number(signal.confidence || 0) * 100;

  return (
    <Card 
      className={cn(
        "transition-all",
        signal.isHardStop && "border-destructive",
        signal.riskFlag && !signal.isHardStop && "border-amber-400 dark:border-amber-600",
        className
      )}
      data-testid={`preauth-signal-card-${signal.signalId}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={cn("p-1.5 rounded-md", config.bgColor)}>
              <Icon className={cn("w-4 h-4", config.color)} />
            </div>
            <div>
              <CardTitle className="text-sm font-medium">{config.label}</CardTitle>
              <p className="text-xs text-muted-foreground">Layer {config.layer}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {signal.isHardStop && (
              <Badge variant="destructive" className="gap-1">
                <AlertOctagon className="w-3 h-3" />
                Hard Stop
              </Badge>
            )}
            {signal.severity && !signal.isHardStop && (
              <PreAuthRiskBadge severity={signal.severity} />
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Confidence</span>
          <span className="text-xs font-mono" data-testid="signal-confidence">
            {confidencePercent.toFixed(1)}%
          </span>
        </div>
        <Progress value={confidencePercent} className="h-1.5" />

        {signal.recommendation && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Recommendation:</span>
            <Badge variant="outline" className="text-xs" data-testid="signal-recommendation">
              {signal.recommendation.replace("_", " ")}
            </Badge>
          </div>
        )}

        {signal.rationale && (
          <p className={`text-sm text-muted-foreground ${expanded ? '' : 'line-clamp-2'}`}>
            {signal.rationale}
          </p>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="w-full justify-between text-xs"
          data-testid={`preauth-signal-expand-${signal.signalId}`}
        >
          {expanded ? "Hide Details" : "Show Evidence"}
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>

        {expanded && (
          <div className="space-y-3 pt-2 border-t">
            {signal.evidence && signal.evidence.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium">Evidence Sources</h4>
                {signal.evidence.map((ev, idx) => (
                  <div 
                    key={idx} 
                    className="p-2 rounded-md bg-muted/50 text-xs space-y-1"
                    data-testid={`preauth-evidence-${idx}`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {ev.source}
                      </Badge>
                      {ev.clause_id && (
                        <span className="text-muted-foreground">Clause {ev.clause_id}</span>
                      )}
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 ml-auto">
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-muted-foreground italic">"{ev.quote}"</p>
                  </div>
                ))}
              </div>
            )}

            {signal.missingInfo && signal.missingInfo.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  Missing Information
                </h4>
                <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                  {signal.missingInfo.map((info, idx) => (
                    <li key={idx}>{info}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
