import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Building,
  MapPin,
  Network,
  FileText,
  Activity,
  AlertTriangle,
  Clock,
  Sparkles,
  ExternalLink,
  Flag,
  TrendingUp,
  TrendingDown,
  Award,
  BarChart3,
  DollarSign,
  Users,
  ClipboardCheck,
  Calendar,
  Shield,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Provider360 } from "@shared/schema";

function getRiskLevelBadgeClasses(level: string | null | undefined) {
  switch (level) {
    case "critical":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    case "high":
      return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
    case "medium":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    case "low":
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
  }
}

function getSeverityBadgeClasses(severity: string | null | undefined) {
  switch (severity?.toLowerCase()) {
    case "critical":
    case "high":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    case "medium":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    case "low":
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
  }
}

function getStatusBadgeClasses(status: string | null | undefined) {
  switch (status?.toLowerCase()) {
    case "active":
    case "open":
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
    case "resolved":
    case "closed":
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
    case "pending":
    case "in_progress":
      return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
  }
}

function getAuditResultClasses(result: string | null | undefined) {
  switch (result?.toLowerCase()) {
    case "pass":
    case "passed":
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
    case "fail":
    case "failed":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    case "partial":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
  }
}

function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "$0";
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount);
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatPercent(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "0%";
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return `${numValue.toFixed(1)}%`;
}

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-6" data-testid="loading-skeleton">
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

function NotFoundState() {
  return (
    <div className="p-6" data-testid="not-found-state">
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Building className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Provider Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The provider you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/fwa/providers">
            <Button data-testid="button-back-to-providers">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Providers
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Provider360Page() {
  const params = useParams<{ providerId: string }>();
  const providerId = params.providerId;

  const { data: provider, isLoading, error } = useQuery<Provider360>({
    queryKey: ["/api/context/provider-360", providerId],
    enabled: !!providerId,
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !provider) {
    return <NotFoundState />;
  }

  const riskScore = provider.riskScore ? parseFloat(provider.riskScore as string) : 0;
  const flags = provider.flags || [];
  const claimsSummary = provider.claimsSummary as any;
  const specialtyBenchmarks = provider.specialtyBenchmarks;
  const peerRanking = provider.peerRanking;
  const billingPatterns = provider.billingPatterns;
  const complianceHistory = provider.complianceHistory || [];
  const contractPerformance = provider.contractPerformance;
  // Extended API fields (cast as any for runtime data)
  const extendedProvider = provider as any;
  const financialMetrics = extendedProvider.financialMetrics;
  const performanceMetrics = extendedProvider.performanceMetrics;

  const claimsByYearData = claimsSummary?.claimsByYear
    ? Object.entries(claimsSummary.claimsByYear).map(([year, amount]) => ({
        year,
        amount,
      }))
    : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/fwa/providers">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <Card data-testid="card-provider-header">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Building className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" data-testid="text-provider-name">
                  {provider.providerName}
                </h1>
                <p className="text-sm text-muted-foreground" data-testid="text-provider-id">
                  Provider ID: {provider.providerId}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={getRiskLevelBadgeClasses(provider.riskLevel)}
                data-testid="badge-risk-level"
              >
                {provider.riskLevel || "unknown"} risk
              </Badge>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium" data-testid="text-risk-score">
                  {riskScore.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Type</p>
                <p className="text-sm font-medium" data-testid="text-provider-type">
                  {provider.providerType || "-"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Specialty</p>
                <p className="text-sm font-medium" data-testid="text-specialty">
                  {provider.specialty || "-"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-sm font-medium" data-testid="text-location">
                  {[provider.city, provider.region].filter(Boolean).join(", ") || "-"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Network Tier</p>
                <p className="text-sm font-medium" data-testid="text-network-tier">
                  {provider.networkTier || "-"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">License Number</p>
                <p className="text-sm font-medium" data-testid="text-license">
                  {provider.licenseNumber || "-"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Contract Status</p>
                <Badge
                  variant="outline"
                  className={getStatusBadgeClasses(provider.contractStatus)}
                  data-testid="badge-contract-status"
                >
                  {provider.contractStatus || "unknown"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {provider.aiAssessment && (
        <Card data-testid="card-ai-assessment">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              AI Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-ai-assessment">
              {provider.aiAssessment}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {peerRanking && (
          <Card data-testid="card-peer-ranking">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="w-5 h-5 text-amber-500" />
                Peer Ranking
              </CardTitle>
              <CardDescription>
                Performance ranking compared to peer providers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-3xl font-bold" data-testid="text-overall-rank">
                    Rank {peerRanking.overallRank} of {peerRanking.totalPeers}
                  </p>
                  <p className="text-sm text-muted-foreground">Overall Position</p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    peerRanking.percentile >= 75
                      ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400"
                      : peerRanking.percentile >= 50
                      ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400"
                  }
                  data-testid="badge-percentile"
                >
                  {peerRanking.percentile}th percentile
                </Badge>
              </div>

              {peerRanking.rankingFactors && peerRanking.rankingFactors.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Factor</TableHead>
                      <TableHead className="text-right">Rank</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {peerRanking.rankingFactors.map((factor, idx) => (
                      <TableRow key={idx} data-testid={`row-ranking-factor-${idx}`}>
                        <TableCell className="font-medium">{factor.factor}</TableCell>
                        <TableCell className="text-right">#{factor.rank}</TableCell>
                        <TableCell className="text-right">{factor.score.toFixed(1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {specialtyBenchmarks && (
          <Card data-testid="card-specialty-benchmarks">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                Specialty Benchmarks
              </CardTitle>
              <CardDescription>
                Comparison against peer averages
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead className="text-right">Provider</TableHead>
                    <TableHead className="text-right">Peer Avg</TableHead>
                    <TableHead className="text-right">Deviation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow data-testid="row-benchmark-avg-claim">
                    <TableCell className="font-medium">Avg Claim</TableCell>
                    <TableCell className="text-right">{formatCurrency(specialtyBenchmarks.avgClaimAmount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(specialtyBenchmarks.peerAvgClaimAmount)}</TableCell>
                    <TableCell className="text-right">
                      {specialtyBenchmarks.avgClaimAmount > specialtyBenchmarks.peerAvgClaimAmount ? (
                        <span className="flex items-center justify-end gap-1 text-red-600 dark:text-red-400">
                          <ArrowUp className="w-3 h-3" /> Above
                        </span>
                      ) : (
                        <span className="flex items-center justify-end gap-1 text-green-600 dark:text-green-400">
                          <ArrowDown className="w-3 h-3" /> Below
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow data-testid="row-benchmark-claims-per-patient">
                    <TableCell className="font-medium">Claims per Patient</TableCell>
                    <TableCell className="text-right">{specialtyBenchmarks.avgClaimsPerPatient?.toFixed(2) || "-"}</TableCell>
                    <TableCell className="text-right">{specialtyBenchmarks.peerAvgClaimsPerPatient?.toFixed(2) || "-"}</TableCell>
                    <TableCell className="text-right">
                      {specialtyBenchmarks.avgClaimsPerPatient > specialtyBenchmarks.peerAvgClaimsPerPatient ? (
                        <span className="flex items-center justify-end gap-1 text-red-600 dark:text-red-400">
                          <ArrowUp className="w-3 h-3" /> Above
                        </span>
                      ) : (
                        <span className="flex items-center justify-end gap-1 text-green-600 dark:text-green-400">
                          <ArrowDown className="w-3 h-3" /> Below
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow data-testid="row-benchmark-cost-per-member">
                    <TableCell className="font-medium">Cost per Member</TableCell>
                    <TableCell className="text-right">{formatCurrency(specialtyBenchmarks.costPerMember)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(specialtyBenchmarks.peerAvgCostPerMember)}</TableCell>
                    <TableCell className="text-right">
                      {specialtyBenchmarks.costPerMember > specialtyBenchmarks.peerAvgCostPerMember ? (
                        <span className="flex items-center justify-end gap-1 text-red-600 dark:text-red-400">
                          <ArrowUp className="w-3 h-3" /> Above
                        </span>
                      ) : (
                        <span className="flex items-center justify-end gap-1 text-green-600 dark:text-green-400">
                          <ArrowDown className="w-3 h-3" /> Below
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow data-testid="row-benchmark-approval-rate">
                    <TableCell className="font-medium">Approval Rate</TableCell>
                    <TableCell className="text-right">{formatPercent(specialtyBenchmarks.approvalRate)}</TableCell>
                    <TableCell className="text-right">{formatPercent(specialtyBenchmarks.peerApprovalRate)}</TableCell>
                    <TableCell className="text-right">
                      {specialtyBenchmarks.approvalRate > specialtyBenchmarks.peerApprovalRate ? (
                        <span className="flex items-center justify-end gap-1 text-green-600 dark:text-green-400">
                          <ArrowUp className="w-3 h-3" /> Above
                        </span>
                      ) : (
                        <span className="flex items-center justify-end gap-1 text-red-600 dark:text-red-400">
                          <ArrowDown className="w-3 h-3" /> Below
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow data-testid="row-benchmark-los">
                    <TableCell className="font-medium">Avg LOS</TableCell>
                    <TableCell className="text-right">{specialtyBenchmarks.avgLengthOfStay?.toFixed(1) || "-"} days</TableCell>
                    <TableCell className="text-right">{specialtyBenchmarks.peerAvgLengthOfStay?.toFixed(1) || "-"} days</TableCell>
                    <TableCell className="text-right">
                      {specialtyBenchmarks.avgLengthOfStay > specialtyBenchmarks.peerAvgLengthOfStay ? (
                        <span className="flex items-center justify-end gap-1 text-red-600 dark:text-red-400">
                          <ArrowUp className="w-3 h-3" /> Above
                        </span>
                      ) : (
                        <span className="flex items-center justify-end gap-1 text-green-600 dark:text-green-400">
                          <ArrowDown className="w-3 h-3" /> Below
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {billingPatterns && (
          <Card data-testid="card-billing-patterns">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between gap-2 text-lg">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  Billing Patterns
                </div>
                <div className="flex items-center gap-2">
                  {billingPatterns.billingTrend && (
                    <Badge
                      variant="outline"
                      className={
                        billingPatterns.billingTrend === "increasing"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : billingPatterns.billingTrend === "decreasing"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                      }
                      data-testid="badge-billing-trend"
                    >
                      {billingPatterns.billingTrend === "increasing" ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : billingPatterns.billingTrend === "decreasing" ? (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      ) : null}
                      {billingPatterns.billingTrend}
                    </Badge>
                  )}
                  {billingPatterns.anomalyScore !== undefined && (
                    <Badge
                      variant="outline"
                      className={
                        billingPatterns.anomalyScore >= 75
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : billingPatterns.anomalyScore >= 50
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      }
                      data-testid="badge-anomaly-score"
                    >
                      Anomaly: {billingPatterns.anomalyScore}%
                    </Badge>
                  )}
                </div>
              </CardTitle>
              <CardDescription>
                Top CPT codes and billing analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {billingPatterns.topCptCodes && billingPatterns.topCptCodes.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Freq</TableHead>
                      <TableHead className="text-right">Avg Amt</TableHead>
                      <TableHead className="text-right">Peer Avg</TableHead>
                      <TableHead className="text-right">Dev</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {billingPatterns.topCptCodes.slice(0, 5).map((cpt, idx) => (
                      <TableRow key={idx} data-testid={`row-cpt-${idx}`}>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {cpt.code}
                          </code>
                        </TableCell>
                        <TableCell className="text-sm max-w-40 truncate">{cpt.description}</TableCell>
                        <TableCell className="text-right">{cpt.frequency}</TableCell>
                        <TableCell className="text-right">{formatCurrency(cpt.avgAmount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(cpt.peerAvgAmount)}</TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              cpt.deviation > 0
                                ? "text-red-600 dark:text-red-400"
                                : "text-green-600 dark:text-green-400"
                            }
                          >
                            {cpt.deviation > 0 ? "+" : ""}{cpt.deviation.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  No CPT code data available
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card data-testid="card-flags-history">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Flag className="w-5 h-5 text-red-500" />
              Flags History
            </CardTitle>
            <CardDescription>
              {flags.length} flag(s) recorded
            </CardDescription>
          </CardHeader>
          <CardContent>
            {flags.length === 0 ? (
              <div className="text-center text-muted-foreground py-6">
                No flags recorded
              </div>
            ) : (
              <div className="space-y-3">
                {flags.map((flag, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border bg-muted/30"
                    data-testid={`flag-${idx}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium">{flag.flagType}</span>
                      <Badge
                        variant="outline"
                        className={getSeverityBadgeClasses(flag.severity)}
                      >
                        {flag.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {flag.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Raised: {formatDate(flag.raisedDate)}</span>
                        {flag.resolvedDate && (
                          <span>Resolved: {formatDate(flag.resolvedDate)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={getStatusBadgeClasses(flag.status)}
                        >
                          {flag.status}
                        </Badge>
                        {flag.linkedCaseId && (
                          <Link href={`/fwa/cases/${flag.linkedCaseId}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`link-case-${flag.flagId}`}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View Case
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-claims-summary">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-blue-500" />
              Claims Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!claimsSummary ? (
              <div className="text-center text-muted-foreground py-6">
                No claims data available
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold" data-testid="text-total-claims">
                      {claimsSummary.totalClaims}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Claims</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold" data-testid="text-total-amount">
                      {formatCurrency(claimsSummary.totalAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total Amount</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold" data-testid="text-avg-claim">
                      {formatCurrency(claimsSummary.avgClaimAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Claim</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium" data-testid="text-unique-patients">
                        {claimsSummary.uniquePatients}
                      </p>
                      <p className="text-xs text-muted-foreground">Unique Patients</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <div>
                      <p className="font-medium" data-testid="text-denial-rate">
                        {formatPercent(claimsSummary.denialRate)}
                      </p>
                      <p className="text-xs text-muted-foreground">Denial Rate</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Flag className="w-4 h-4 text-red-500" />
                    <div>
                      <p className="font-medium" data-testid="text-flagged-claims">
                        {claimsSummary.flaggedClaims || claimsSummary.flaggedClaimsCount || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Flagged</p>
                    </div>
                  </div>
                </div>

                {claimsByYearData.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Claims by Year</p>
                      <div className="h-32">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={claimsByYearData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip
                              formatter={(value: number) => [
                                formatCurrency(value),
                                "Amount",
                              ]}
                            />
                            <Bar
                              dataKey="amount"
                              fill="hsl(var(--primary))"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial & Performance Metrics */}
        {(financialMetrics || performanceMetrics) && (
          <Card data-testid="card-financial-performance">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Financial & Performance Insights
              </CardTitle>
              <CardDescription>
                Key metrics derived from claims data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {financialMetrics && (
                  <>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold" data-testid="text-avg-revenue-per-patient">
                        {formatCurrency(financialMetrics.avgRevenuePerPatient || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">Avg Revenue/Patient</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold" data-testid="text-claims-per-patient">
                        {(financialMetrics.claimsPerPatient || 0).toFixed(1)}
                      </p>
                      <p className="text-xs text-muted-foreground">Claims/Patient</p>
                    </div>
                  </>
                )}
                {performanceMetrics && (
                  <>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold" data-testid="text-total-doctors">
                        {performanceMetrics.totalDoctors || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Affiliated Doctors</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold" data-testid="text-flagged-rate">
                        {(performanceMetrics.flaggedClaimRate || 0).toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">Flagged Claim Rate</p>
                    </div>
                  </>
                )}
              </div>
              {performanceMetrics && (
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>{(performanceMetrics.avgClaimsPerDoctor || 0).toFixed(1)} claims/doctor</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-muted/30">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <span>{(performanceMetrics.criticalDetectionRate || 0).toFixed(1)}% critical</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {complianceHistory.length > 0 && (
          <Card data-testid="card-compliance-history">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ClipboardCheck className="w-5 h-5 text-purple-500" />
                Compliance History
              </CardTitle>
              <CardDescription>
                {complianceHistory.length} audit(s) on record
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead className="text-right">Findings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complianceHistory.map((audit, idx) => (
                    <TableRow key={idx} data-testid={`row-audit-${idx}`}>
                      <TableCell>{formatDate(audit.auditDate)}</TableCell>
                      <TableCell>{audit.auditType}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getAuditResultClasses(audit.result)}
                        >
                          {audit.result}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {audit.findings}
                        {audit.resolvedFindings > 0 && (
                          <span className="text-muted-foreground text-xs ml-1">
                            ({audit.resolvedFindings} resolved)
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {contractPerformance && (
          <Card data-testid="card-contract-performance">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5 text-indigo-500" />
                Contract Performance
              </CardTitle>
              <CardDescription>
                Contract ID: {contractPerformance.currentContractId}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Start Date</p>
                    <p className="font-medium" data-testid="text-contract-start">
                      {formatDate(contractPerformance.contractStartDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">End Date</p>
                    <p className="font-medium" data-testid="text-contract-end">
                      {formatDate(contractPerformance.contractEndDate)}
                    </p>
                  </div>
                </div>

                <Separator />

                {contractPerformance.performanceMetrics && (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">Quality Score</span>
                        <span className="text-sm font-medium" data-testid="text-quality-score">
                          {contractPerformance.performanceMetrics.qualityScore}%
                        </span>
                      </div>
                      <Progress
                        value={contractPerformance.performanceMetrics.qualityScore}
                        className="h-2"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">Timeliness Score</span>
                        <span className="text-sm font-medium" data-testid="text-timeliness-score">
                          {contractPerformance.performanceMetrics.timelinessScore}%
                        </span>
                      </div>
                      <Progress
                        value={contractPerformance.performanceMetrics.timelinessScore}
                        className="h-2"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">Compliance Score</span>
                        <span className="text-sm font-medium" data-testid="text-compliance-score">
                          {contractPerformance.performanceMetrics.complianceScore}%
                        </span>
                      </div>
                      <Progress
                        value={contractPerformance.performanceMetrics.complianceScore}
                        className="h-2"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
