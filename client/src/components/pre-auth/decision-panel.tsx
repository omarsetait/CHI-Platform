import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PreAuthRiskBadge } from "./risk-badge";
import { 
  Scale, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ShieldAlert,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type PreAuthSeverity = "HIGH" | "MEDIUM" | "LOW";
type PreAuthRecommendation = "APPROVE" | "REJECT" | "PEND_REVIEW" | "REQUEST_INFO";

interface PreAuthDecisionPanelProps {
  decision: {
    aggregatedScore?: string | number | null;
    riskLevel?: PreAuthSeverity | null;
    hasHardStop?: boolean | null;
    topRecommendation?: PreAuthRecommendation | null;
    candidates?: Array<{
      rank: number;
      recommendation: string;
      score: number;
      rationale: string;
    }> | null;
    conflictingSignals?: Array<{
      type: string;
      severity: string;
      description: string;
      conflictingLayers: string[];
      resolution: string;
    }> | null;
    safetyCheckPassed?: boolean | null;
  };
  className?: string;
}

const recommendationConfig: Record<PreAuthRecommendation, {
  label: string;
  icon: typeof CheckCircle;
  className: string;
}> = {
  APPROVE: {
    label: "Approve",
    icon: CheckCircle,
    className: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
  },
  REJECT: {
    label: "Reject",
    icon: XCircle,
    className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  },
  PEND_REVIEW: {
    label: "Pend Review",
    icon: AlertCircle,
    className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  },
  REQUEST_INFO: {
    label: "Request Info",
    icon: AlertCircle,
    className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  },
};

export function PreAuthDecisionPanel({ decision, className }: PreAuthDecisionPanelProps) {
  const scorePercent = Number(decision.aggregatedScore || 0) * 100;
  const topRec = decision.topRecommendation;
  const recConfig = topRec ? recommendationConfig[topRec] : null;
  const RecIcon = recConfig?.icon || Scale;

  const getScoreColor = (score: number) => {
    if (score >= 70) return "[&>div]:bg-green-500";
    if (score >= 40) return "[&>div]:bg-amber-500";
    return "[&>div]:bg-red-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Strong Approval Signal";
    if (score >= 60) return "Moderate Approval Signal";
    if (score >= 40) return "Uncertain - Review Needed";
    if (score >= 20) return "Low Approval Signal";
    return "Strong Rejection Signal";
  };

  return (
    <Card className={cn("", className)} data-testid="preauth-decision-panel">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-primary/10">
              <Scale className="w-5 h-5 text-primary" />
            </div>
            <CardTitle className="text-base">Decision Aggregation</CardTitle>
          </div>
          {decision.riskLevel && (
            <PreAuthRiskBadge severity={decision.riskLevel} />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground">Approval Confidence</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs">Weighted score based on all agent signals. Higher values indicate stronger approval signals.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="font-mono text-sm font-medium" data-testid="decision-score">
              {scorePercent.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={scorePercent} 
            className={cn("h-2", getScoreColor(scorePercent))}
          />
          <p className="text-xs text-muted-foreground mt-1">{getScoreLabel(scorePercent)}</p>
        </div>

        {decision.hasHardStop && (
          <div 
            className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20"
            data-testid="decision-hard-stop"
          >
            <ShieldAlert className="w-5 h-5 text-destructive" />
            <div>
              <p className="text-sm font-medium text-destructive">Hard Stop Detected</p>
              <p className="text-xs text-muted-foreground">Regulatory or compliance issue requires attention</p>
            </div>
          </div>
        )}

        {topRec && recConfig && (
          <div className="p-3 rounded-md bg-muted/50 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-medium">Top Recommendation</span>
              <Badge className={cn("gap-1.5", recConfig.className)}>
                <RecIcon className="w-3.5 h-3.5" />
                {recConfig.label}
              </Badge>
            </div>
            {decision.safetyCheckPassed !== null && decision.safetyCheckPassed !== undefined && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Safety Check:</span>
                <Badge variant="outline" className={cn(
                  "text-xs",
                  decision.safetyCheckPassed 
                    ? "text-green-600 border-green-300 dark:text-green-400 dark:border-green-700" 
                    : "text-red-600 border-red-300 dark:text-red-400 dark:border-red-700"
                )}>
                  {decision.safetyCheckPassed ? "Passed" : "Failed"}
                </Badge>
              </div>
            )}
          </div>
        )}

        {decision.candidates && decision.candidates.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-medium">Agent Consensus</h4>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs">Rankings from all agent signals weighted by confidence.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="space-y-1.5">
              {decision.candidates.slice(0, 3).map((candidate, idx) => {
                const candRec = candidate.recommendation as PreAuthRecommendation;
                const candConfig = recommendationConfig[candRec];
                const CandIcon = candConfig?.icon || AlertCircle;
                return (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/30 text-sm"
                    data-testid={`decision-candidate-${idx}`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs w-6 h-6 p-0 flex items-center justify-center">
                        {candidate.rank}
                      </Badge>
                      <div className="flex items-center gap-1.5">
                        <CandIcon className={cn("w-3.5 h-3.5", candConfig?.className.split(" ")[1])} />
                        <span>{candConfig?.label || candidate.recommendation}</span>
                      </div>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      {(candidate.score * 100).toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {decision.conflictingSignals && decision.conflictingSignals.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Conflicting Signals ({decision.conflictingSignals.length})
            </h4>
            <div className="space-y-2">
              {decision.conflictingSignals.map((conflict, idx) => (
                <div 
                  key={idx}
                  className="p-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm"
                  data-testid={`decision-conflict-${idx}`}
                >
                  <p className="font-medium text-amber-700 dark:text-amber-400">{conflict.type}</p>
                  <p className="text-xs text-muted-foreground mt-1">{conflict.description}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                    Resolution: {conflict.resolution}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
