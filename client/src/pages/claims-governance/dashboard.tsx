import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "@/components/metric-card";
import { METRIC_GRID } from "@/lib/grid";
import { EmptyState } from "@/components/ui/empty-state";
import {
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Brain,
  Activity,
  Flag
} from "lucide-react";
import { Link } from "wouter";

interface DemoClaim {
  id: string;
  claimId: string;
  providerId: string;
  providerName: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  serviceDate: string;
  submissionDate: string;
  claimAmount: string;
  approvedAmount: string;
  status: string;
  claimType: string;
  diagnosisCodes: string[];
  procedureCodes: string[];
  flags: string[];
  ruleViolations: string[];
  adjudicationPhase: number;
  aiConfidence: number;
  notes: string;
}

interface ClaimSummary {
  id: string;
  claimId: string;
  memberId: string;
  providerId: string;
  status: string;
  riskLevel: string;
  totalAmount: number;
  submittedAt: string;
}

function mapDemoClaimToSummary(c: DemoClaim): ClaimSummary {
  return {
    id: c.id,
    claimId: c.claimId,
    memberId: c.patientId,
    providerId: c.providerId,
    status: c.status === "flagged" ? "flagged" : 
            c.status === "approved" ? "auto_approved" : 
            c.status === "denied" ? "rejected" : 
            c.status === "pending" ? "pending_review" : "analyzing",
    riskLevel: c.flags.length > 1 ? "high" : c.flags.length === 1 ? "medium" : "low",
    totalAmount: parseFloat(c.claimAmount),
    submittedAt: c.submissionDate,
  };
}

function ClaimCard({ claim }: { claim: ClaimSummary }) {
  const statusColors: Record<string, string> = {
    pending_review: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    analyzing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    auto_approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    flagged: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  const riskColors: Record<string, string> = {
    high: "text-red-600",
    medium: "text-amber-600",
    low: "text-green-600",
  };

  return (
    <Link href={`/claims-governance/claims/${claim.id}`}>
      <Card className="hover-elevate cursor-pointer" data-testid={`claim-card-${claim.id}`}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-mono text-sm font-medium">{claim.claimId}</span>
            <Badge className={statusColors[claim.status]}>
              {claim.status.replace("_", " ")}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Member: {claim.memberId}</p>
            <p>Provider: {claim.providerId}</p>
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-medium">
              ${claim.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <span className={`text-xs font-medium uppercase ${riskColors[claim.riskLevel]}`}>
              {claim.riskLevel} risk
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function ClaimCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ClaimsGovernanceDashboard() {
  const { data: demoClaims, isLoading, refetch } = useQuery<DemoClaim[]>({
    queryKey: ["/api/demo/claims"],
  });

  const claims = (demoClaims || []).map(mapDemoClaimToSummary);
  
  const stats = {
    totalInPipeline: claims.length,
    pendingReview: claims.filter(c => c.status === "pending_review" || c.status === "analyzing").length,
    autoApproved: claims.filter(c => c.status === "auto_approved" || c.status === "approved").length,
    flagged: claims.filter(c => c.status === "flagged").length,
  };

  const agentMetrics = [
    { name: "Regulatory Agent", processed: stats.totalInPipeline * 25, accuracy: 98.2, avgTime: "1.2s" },
    { name: "Clinical Agent", processed: stats.totalInPipeline * 24, accuracy: 96.8, avgTime: "2.1s" },
    { name: "Coverage Agent", processed: stats.totalInPipeline * 26, accuracy: 99.1, avgTime: "0.8s" },
    { name: "Historical Agent", processed: stats.totalInPipeline * 23, accuracy: 94.5, avgTime: "1.5s" },
  ];

  const workflowPhases = [
    { name: "Ingest", phase: 1, count: claims.filter(c => c.status === "analyzing").length },
    { name: "Analysis", phase: 2, count: claims.filter(c => c.status === "analyzing").length },
    { name: "Aggregation", phase: 3, count: claims.filter(c => c.status === "pending_review").length },
    { name: "Recommendation", phase: 4, count: claims.filter(c => c.status === "pending_review").length },
    { name: "Adjudicator", phase: 5, count: claims.filter(c => c.status === "auto_approved" || c.status === "rejected").length },
    { name: "RLHF", phase: 6, count: claims.filter(c => c.status === "approved").length },
  ];

  return (
    <div className="p-6 space-y-6" data-testid="page-claims-governance-dashboard">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Claims Governance Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of AI-powered claims processing pipeline and agent performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" data-testid="button-refresh" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button asChild data-testid="button-view-claims">
            <Link href="/claims-governance/claims">
              View All Claims
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>

      <div className={METRIC_GRID}>
        <MetricCard
          title="Total in Pipeline"
          value={String(stats.totalInPipeline)}
          subtitle="Claims being processed"
          icon={FileText}
          trend={{ value: "8%", isPositive: true }}
          loading={isLoading}
        />
        <MetricCard
          title="Pending Review"
          value={String(stats.pendingReview)}
          subtitle="Awaiting adjudicator"
          icon={Clock}
          loading={isLoading}
        />
        <MetricCard
          title="Auto-Approved"
          value={String(stats.autoApproved)}
          subtitle="Today"
          icon={CheckCircle}
          trend={{ value: "15%", isPositive: true }}
          loading={isLoading}
        />
        <MetricCard
          title="Flagged for Review"
          value={String(stats.flagged)}
          subtitle="Requires attention"
          icon={Flag}
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Recent Claims</CardTitle>
                <CardDescription>Latest claims in the processing pipeline</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/claims-governance/claims">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <ClaimCardSkeleton key={i} />
                  ))}
                </div>
              ) : claims.length === 0 ? (
                <EmptyState
                  variant="no-data"
                  icon={FileText}
                  title="No claims in the pipeline"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {claims.slice(0, 4).map(claim => (
                    <ClaimCard key={claim.id} claim={claim} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Agent Performance
              </CardTitle>
              <CardDescription>AI agent processing metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="text-right space-y-1">
                      <Skeleton className="h-4 w-10" />
                      <Skeleton className="h-3 w-8" />
                    </div>
                  </div>
                ))
              ) : (
                agentMetrics.map((agent, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3 rounded-lg border"
                    data-testid={`agent-metric-${idx}`}
                  >
                    <div>
                      <p className="text-sm font-medium">{agent.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {agent.processed} processed
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600">{agent.accuracy}%</p>
                      <p className="text-xs text-muted-foreground">{agent.avgTime}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Workflow Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  ))
                ) : (
                  workflowPhases.map((phase) => (
                    <Link key={phase.phase} href={`/claims-governance/workflow/${phase.phase}`}>
                      <div className="flex items-center justify-between hover-elevate p-2 rounded-lg cursor-pointer">
                        <span className="text-sm">{phase.name}</span>
                        <Badge variant={phase.phase === 5 ? "outline" : "secondary"}>
                          {phase.count} claims
                        </Badge>
                      </div>
                    </Link>
                  ))
                )}
              </div>
              <Button 
                variant="outline" 
                className="w-full mt-4" 
                asChild
                data-testid="button-view-workflow"
              >
                <Link href="/claims-governance/workflow/1">
                  View Workflow Phases
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
