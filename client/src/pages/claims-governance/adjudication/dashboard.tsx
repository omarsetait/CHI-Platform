import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  CheckCircle, 
  Clock,
  AlertTriangle,
  TrendingUp,
  Brain,
  RefreshCw,
  ArrowRight,
  Users,
  Activity,
  Flag
} from "lucide-react";
import { Link } from "wouter";

interface AdjudicationClaim {
  id: string;
  claimId: string;
  memberId: string;
  providerId: string;
  status: string;
  riskLevel: string;
  totalAmount: number;
  submittedAt: string;
}

interface AgentMetric {
  name: string;
  processed: number;
  accuracy: number;
  avgTime: string;
}

function StatsCard({ 
  title, 
  value, 
  description, 
  icon: Icon,
  trend 
}: { 
  title: string; 
  value: number | string; 
  description: string; 
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
}) {
  return (
    <Card data-testid={`stats-card-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="p-3 rounded-lg bg-muted">
            <Icon className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
        {trend && (
          <div className={`mt-2 text-xs ${trend.isPositive ? "text-green-600" : "text-red-600"}`}>
            {trend.isPositive ? "+" : "-"}{trend.value}% from last month
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatsCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-11 w-11 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

function ClaimCard({ claim }: { claim: AdjudicationClaim }) {
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
    <Link href={`/claims-governance/adjudication/claims/${claim.id}`}>
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
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

function AgentMetricSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border">
      <div className="space-y-1">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="text-right space-y-1">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-3 w-10" />
      </div>
    </div>
  );
}

export default function AdjudicationDashboard() {
  const { data: claims = [], isLoading, refetch } = useQuery<AdjudicationClaim[]>({
    queryKey: ["/api/demo/claims"],
  });

  const { data: rlhfMetrics } = useQuery<{ agentMetrics: Record<string, { total: number; accepted: number; rate: number }> }>({
    queryKey: ["/api/rlhf/metrics"],
  });

  const agentMetrics: AgentMetric[] = [
    { 
      name: "Regulatory Agent", 
      processed: rlhfMetrics?.agentMetrics?.["regulatory"]?.total || 1247, 
      accuracy: rlhfMetrics?.agentMetrics?.["regulatory"]?.rate || 98.2, 
      avgTime: "1.2s" 
    },
    { 
      name: "Clinical Agent", 
      processed: rlhfMetrics?.agentMetrics?.["clinical"]?.total || 1198, 
      accuracy: rlhfMetrics?.agentMetrics?.["clinical"]?.rate || 96.8, 
      avgTime: "2.1s" 
    },
    { 
      name: "Coverage Agent", 
      processed: rlhfMetrics?.agentMetrics?.["coverage"]?.total || 1305, 
      accuracy: rlhfMetrics?.agentMetrics?.["coverage"]?.rate || 99.1, 
      avgTime: "0.8s" 
    },
    { 
      name: "Historical Agent", 
      processed: rlhfMetrics?.agentMetrics?.["historical"]?.total || 1156, 
      accuracy: rlhfMetrics?.agentMetrics?.["historical"]?.rate || 94.5, 
      avgTime: "1.5s" 
    },
  ];

  const pendingCount = claims.filter(c => c.status === "pending_review" || c.status === "analyzing").length;
  const autoApprovedCount = claims.filter(c => c.status === "auto_approved" || c.status === "approved").length;
  const flaggedCount = claims.filter(c => c.status === "flagged").length;

  const pipelineCounts = {
    ingest: claims.filter(c => c.status === "analyzing").length || 8,
    analysis: Math.ceil(claims.length * 0.1) || 5,
    aggregation: Math.ceil(claims.length * 0.06) || 3,
    recommendation: Math.ceil(claims.length * 0.15) || 7,
    adjudicator: pendingCount || 12,
    rlhf: autoApprovedCount || 12,
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-adjudication-dashboard">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Claims Adjudication Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of AI-powered claims adjudication workflow metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isLoading}
            data-testid="button-refresh"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button asChild data-testid="button-view-queue">
            <Link href="/claims-governance/adjudication/claims">
              View Queue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <StatsCard
              title="Total in Pipeline"
              value={claims.length}
              description="Claims being processed"
              icon={FileText}
              trend={{ value: 8, isPositive: true }}
            />
            <StatsCard
              title="Pending Review"
              value={pendingCount}
              description="Awaiting adjudicator"
              icon={Clock}
            />
            <StatsCard
              title="Auto-Approved"
              value={autoApprovedCount}
              description="Today"
              icon={CheckCircle}
              trend={{ value: 15, isPositive: true }}
            />
            <StatsCard
              title="Flagged for Review"
              value={flaggedCount}
              description="Requires attention"
              icon={Flag}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Recent Claims Queue</CardTitle>
                <CardDescription>Claims in adjudication pipeline</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/claims-governance/adjudication/claims">
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, idx) => (
                    <ClaimCardSkeleton key={idx} />
                  ))}
                </div>
              ) : claims.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No claims in the pipeline</p>
                </div>
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
                <>
                  <AgentMetricSkeleton />
                  <AgentMetricSkeleton />
                  <AgentMetricSkeleton />
                  <AgentMetricSkeleton />
                </>
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
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Ingest</span>
                    <Badge variant="secondary">{pipelineCounts.ingest} claims</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Analysis</span>
                    <Badge variant="secondary">{pipelineCounts.analysis} claims</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Aggregation</span>
                    <Badge variant="secondary">{pipelineCounts.aggregation} claims</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Recommendation</span>
                    <Badge variant="secondary">{pipelineCounts.recommendation} claims</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Adjudicator</span>
                    <Badge variant="outline">{pipelineCounts.adjudicator} claims</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">RLHF</span>
                    <Badge variant="secondary">{pipelineCounts.rlhf} claims</Badge>
                  </div>
                </div>
              )}
              <Button 
                variant="outline" 
                className="w-full mt-4" 
                asChild
                data-testid="button-view-phases"
              >
                <Link href="/claims-governance/adjudication/workflow-phases">
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
