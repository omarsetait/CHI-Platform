import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "@/components/metric-card";
import { METRIC_GRID } from "@/lib/grid";
import {
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Brain,
  Plus,
  RefreshCw,
  ArrowRight
} from "lucide-react";
import { Link } from "wouter";
import type { PreAuthClaim } from "@shared/schema";

interface PreAuthDashboardStats {
  totalClaims: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  riskFlags: number;
  avgProcessingTime: string;
}

function PreAuthClaimCard({ claim }: { claim: PreAuthClaim }) {
  const statusColors: Record<string, string> = {
    ingested: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
    analyzing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    aggregated: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    pending_review: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    request_info: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  };

  return (
    <Link href={`/pre-auth/claims/${claim.id}`}>
      <Card className="hover-elevate cursor-pointer" data-testid={`claim-card-${claim.id}`}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-sm font-medium">{claim.claimId}</span>
            <Badge className={statusColors[claim.status || "ingested"]}>
              {(claim.status || "ingested").replace("_", " ")}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Member: {claim.memberId}</p>
            {claim.providerId && <p>Provider: {claim.providerId}</p>}
          </div>
          {claim.totalAmount && (
            <p className="text-sm font-medium">
              ${Number(claim.totalAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function PreAuthDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<PreAuthDashboardStats>({
    queryKey: ["/api/pre-auth/stats"],
  });

  const { data: recentClaims, isLoading: claimsLoading, refetch } = useQuery<PreAuthClaim[]>({
    queryKey: ["/api/pre-auth/claims/recent"],
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Pre-Authorization Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of pre-authorization processing and adjudication metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button asChild data-testid="button-new-preauth">
            <Link href="/pre-auth/claims/new">
              <Plus className="w-4 h-4 mr-2" />
              New Pre-Auth
            </Link>
          </Button>
        </div>
      </div>

      <div className={METRIC_GRID}>
        <MetricCard
          title="Total Requests"
          value={String(stats?.totalClaims ?? 0)}
          subtitle="Pre-auth requests in system"
          icon={FileText}
          trend={{ value: "12%", isPositive: true }}
          loading={statsLoading}
        />
        <MetricCard
          title="Pending Review"
          value={String(stats?.pendingReview ?? 0)}
          subtitle="Awaiting adjudicator"
          icon={Clock}
          loading={statsLoading}
        />
        <MetricCard
          title="Approved"
          value={String(stats?.approved ?? 0)}
          subtitle="This month"
          icon={CheckCircle}
          trend={{ value: "8%", isPositive: true }}
          loading={statsLoading}
        />
        <MetricCard
          title="Risk Flags"
          value={String(stats?.riskFlags ?? 0)}
          subtitle="Active alerts"
          icon={AlertTriangle}
          loading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Pre-Auth Requests</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/pre-auth/claims">
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
          
          {claimsLoading ? (
            <div className="grid gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6 space-y-3">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recentClaims && recentClaims.length > 0 ? (
            <div className="grid gap-4">
              {recentClaims.slice(0, 5).map((claim) => (
                <PreAuthClaimCard key={claim.id} claim={claim} />
              ))}
            </div>
          ) : (
            <Card data-testid="empty-state-claims">
              <CardContent className="p-12 text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="font-medium mb-1">No pre-auth requests yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Submit your first pre-authorization request to get started with the adjudication workflow
                </p>
                <Button asChild>
                  <Link href="/pre-auth/claims/new">
                    <Plus className="w-4 h-4 mr-2" />
                    Submit New Pre-Auth
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Agent Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm">Clinical Necessity</span>
                </div>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm">Past Patterns</span>
                </div>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm">Disclosure Checker</span>
                </div>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm">Regulatory Engine</span>
                </div>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm">Coverage Verifier</span>
                </div>
                <Badge variant="secondary" className="text-xs">Active</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Processing Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Avg. Processing Time</span>
                {statsLoading ? (
                  <Skeleton className="h-4 w-12" />
                ) : (
                  <span className="text-sm font-medium">{stats?.avgProcessingTime ?? "—"}</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Auto-Approval Rate</span>
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Override Rate</span>
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">RLHF Updates</span>
                <Skeleton className="h-4 w-12" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
