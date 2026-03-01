import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { InsightCard } from "@/components/portal/insight-card";
import {
  CheckCircle2,
  Loader2,
  Circle,
  ClipboardCheck,
  Target,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DrgAssessment {
  id: string;
  providerCode: string;
  criteriaName: string;
  criteriaDescription: string | null;
  status: "complete" | "in_progress" | "not_started";
  gapDescription: string | null;
  recommendedAction: string | null;
  targetDate: string | null;
  peerCompletionRate: string | null;
  sortOrder: number;
}

interface DrgResponse {
  completionRate: number;
  completeCount: number;
  totalCriteria: number;
  assessments: DrgAssessment[];
  generatedAt: string;
}

function StatusIcon({ status }: { status: DrgAssessment["status"] }) {
  switch (status) {
    case "complete":
      return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    case "in_progress":
      return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
    case "not_started":
      return <Circle className="h-5 w-5 text-gray-400" />;
  }
}

function statusLabel(status: DrgAssessment["status"]): string {
  switch (status) {
    case "complete":
      return "Complete";
    case "in_progress":
      return "In Progress";
    case "not_started":
      return "Not Started";
  }
}

function statusBadgeClass(status: DrgAssessment["status"]): string {
  switch (status) {
    case "complete":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "in_progress":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "not_started":
      return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

function completionColor(rate: number): string {
  if (rate >= 80) return "text-emerald-600";
  if (rate >= 50) return "text-amber-600";
  return "text-rose-600";
}

export default function ProviderDrgPage() {
  const { code } = useParams<{ code: string }>();

  const { data, isLoading } = useQuery<DrgResponse>({
    queryKey: ["/api/intelligence/portal/provider", code, "drg"],
    queryFn: () =>
      fetch(`/api/intelligence/portal/provider/${code}/drg`).then((r) =>
        r.json()
      ),
    enabled: !!code,
  });

  if (!code) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        No provider code specified.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading DRG assessment...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        No DRG assessment data available.
      </div>
    );
  }

  const { completionRate, completeCount, totalCriteria, assessments } = data;
  const inProgressCount = assessments.filter(
    (a) => a.status === "in_progress"
  ).length;
  const notStartedCount = assessments.filter(
    (a) => a.status === "not_started"
  ).length;

  // Insight cards for summary
  const insightItems: Array<{
    icon: "check-circle" | "alert-triangle" | "lightbulb" | "activity";
    headline: string;
    body: string;
    tag: string;
  }> = [];

  if (completionRate >= 80) {
    insightItems.push({
      icon: "check-circle",
      headline: "Strong DRG Readiness",
      body: `This provider has completed ${completeCount} of ${totalCriteria} DRG criteria (${completionRate}%). They are well-positioned for DRG implementation.`,
      tag: "Readiness",
    });
  } else if (completionRate >= 50) {
    insightItems.push({
      icon: "lightbulb",
      headline: "Moderate DRG Progress",
      body: `${completeCount} of ${totalCriteria} criteria completed. Focus on completing in-progress items to reach the 80% readiness threshold.`,
      tag: "Progress",
    });
  } else {
    insightItems.push({
      icon: "alert-triangle",
      headline: "DRG Readiness Needs Attention",
      body: `Only ${completeCount} of ${totalCriteria} criteria completed (${completionRate}%). Significant effort is needed to prepare for DRG implementation.`,
      tag: "Action Required",
    });
  }

  if (notStartedCount > 0) {
    insightItems.push({
      icon: "alert-triangle",
      headline: `${notStartedCount} Criteria Not Yet Started`,
      body: `There are ${notStartedCount} DRG criteria that have not been initiated. Prioritize these items to accelerate readiness.`,
      tag: "Not Started",
    });
  }

  if (inProgressCount > 0) {
    insightItems.push({
      icon: "activity",
      headline: `${inProgressCount} Criteria In Progress`,
      body: `${inProgressCount} criteria are currently being worked on. Monitor these closely to ensure timely completion.`,
      tag: "In Progress",
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ClipboardCheck className="h-7 w-7 text-blue-500" />
          DRG Readiness Assessment
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          DRG criteria readiness assessment for provider {code}
        </p>
      </div>

      {/* 1. Overall Readiness Header */}
      <Card className="shadow-sm border-l-4 border-l-blue-500">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Circular Progress */}
            <div className="relative flex items-center justify-center shrink-0">
              <svg
                className="h-40 w-40 -rotate-90"
                viewBox="0 0 128 128"
              >
                {/* Background circle */}
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth="10"
                />
                {/* Progress circle */}
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke={
                    completionRate >= 80
                      ? "#10b981"
                      : completionRate >= 50
                        ? "#f59e0b"
                        : "#ef4444"
                  }
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${(completionRate / 100) * 2 * Math.PI * 56} ${2 * Math.PI * 56}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className={cn(
                    "text-3xl font-bold",
                    completionColor(completionRate)
                  )}
                >
                  {completionRate}%
                </span>
                <span className="text-xs text-muted-foreground">Complete</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-xl font-semibold">
                  {completeCount} of {totalCriteria} Criteria Complete
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  DRG readiness assessment based on national implementation
                  requirements
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="text-2xl font-bold text-emerald-600">
                    {completeCount}
                  </div>
                  <div className="text-xs text-emerald-700">Complete</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">
                    {inProgressCount}
                  </div>
                  <div className="text-xs text-blue-700">In Progress</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-2xl font-bold text-gray-600">
                    {notStartedCount}
                  </div>
                  <div className="text-xs text-gray-700">Not Started</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Criteria Checklist */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Assessment Criteria
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {assessments.map((assessment) => {
            const peerRate = assessment.peerCompletionRate
              ? Number(assessment.peerCompletionRate)
              : null;

            return (
              <div
                key={assessment.id}
                className={cn(
                  "p-4 rounded-lg border transition-colors",
                  assessment.status === "complete"
                    ? "bg-emerald-50/50 border-emerald-200"
                    : assessment.status === "in_progress"
                      ? "bg-blue-50/50 border-blue-200"
                      : "bg-gray-50/50 border-gray-200"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Status icon */}
                  <div className="shrink-0 mt-0.5">
                    <StatusIcon status={assessment.status} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Criteria name + status badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">
                        {assessment.criteriaName}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          statusBadgeClass(assessment.status)
                        )}
                      >
                        {statusLabel(assessment.status)}
                      </Badge>
                    </div>

                    {/* Description */}
                    {assessment.criteriaDescription && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {assessment.criteriaDescription}
                      </p>
                    )}

                    {/* Gap description (if not complete) */}
                    {assessment.status !== "complete" &&
                      assessment.gapDescription && (
                        <div className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                          <span className="text-amber-700">
                            <span className="font-medium">Gap:</span>{" "}
                            {assessment.gapDescription}
                          </span>
                        </div>
                      )}

                    {/* Recommended action (if not complete) */}
                    {assessment.status !== "complete" &&
                      assessment.recommendedAction && (
                        <div className="p-3 rounded-md bg-blue-50 border border-blue-200">
                          <p className="text-sm text-blue-800">
                            <span className="font-semibold">
                              Recommended Action:
                            </span>{" "}
                            {assessment.recommendedAction}
                          </p>
                        </div>
                      )}

                    {/* Peer completion rate */}
                    {peerRate != null && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Peer completion rate
                          </span>
                          <span className="font-medium">
                            {peerRate.toFixed(0)}% of similar hospitals
                          </span>
                        </div>
                        <Progress
                          value={peerRate}
                          className="h-2"
                        />
                      </div>
                    )}

                    {/* Target date */}
                    {assessment.targetDate && assessment.status !== "complete" && (
                      <p className="text-xs text-muted-foreground">
                        Target:{" "}
                        {new Date(assessment.targetDate).toLocaleDateString(
                          "en-SA"
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* 3. Summary Insight Cards */}
      {insightItems.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Summary Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insightItems.map((item, i) => (
              <InsightCard
                key={i}
                icon={item.icon}
                headline={item.headline}
                body={item.body}
                tag={item.tag}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
