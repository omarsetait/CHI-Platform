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
  Stethoscope,
  Building,
  Shield,
  Activity,
  Flag,
  FileText,
  Users,
  AlertTriangle,
  Sparkles,
  Clock,
  Award,
  BarChart3,
  Pill,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Network,
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
import type { Doctor360 } from "@shared/schema";

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
          <Stethoscope className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Doctor Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The doctor you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/fwa/doctors">
            <Button data-testid="button-back-to-doctors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Doctors
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Doctor360Page() {
  const params = useParams<{ doctorId: string }>();
  const doctorId = params.doctorId;

  const { data: doctor, isLoading, error } = useQuery<Doctor360>({
    queryKey: ["/api/context/doctor-360", doctorId],
    enabled: !!doctorId,
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !doctor) {
    return <NotFoundState />;
  }

  const riskScore = doctor.riskScore ? parseFloat(doctor.riskScore as string) : 0;
  const flags = doctor.flags || [];
  const claimsSummary = doctor.claimsSummary;
  const practicePatterns = doctor.practicePatterns;
  const peerComparison = doctor.peerComparison;
  const affiliatedFacilities = doctor.affiliatedFacilities || [];

  const claimsByYearData = claimsSummary?.claimsByYear
    ? Object.entries(claimsSummary.claimsByYear).map(([year, amount]) => ({
        year,
        amount,
      }))
    : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/fwa/doctors">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <Card data-testid="card-doctor-header">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Stethoscope className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" data-testid="text-doctor-name">
                  {doctor.doctorName}
                </h1>
                <p className="text-sm text-muted-foreground" data-testid="text-doctor-id">
                  Doctor ID: {doctor.doctorId}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={getRiskLevelBadgeClasses(doctor.riskLevel)}
                data-testid="badge-risk-level"
              >
                {doctor.riskLevel || "unknown"} risk
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
              <Activity className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Specialty</p>
                <p className="text-sm font-medium" data-testid="text-specialty">
                  {doctor.specialty || "-"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Credentials</p>
                <p className="text-sm font-medium" data-testid="text-credentials">
                  {doctor.credentials || "-"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">License Number</p>
                <p className="text-sm font-medium" data-testid="text-license">
                  {doctor.licenseNumber || "-"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Primary Facility</p>
                <p className="text-sm font-medium" data-testid="text-primary-facility">
                  {doctor.primaryFacilityName || "-"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-overview">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building className="w-5 h-5 text-blue-500" />
            Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Primary Facility</p>
                <p className="text-sm font-medium" data-testid="text-overview-primary-facility">
                  {doctor.primaryFacilityName || "-"}
                </p>
                {doctor.primaryFacilityId && (
                  <p className="text-xs text-muted-foreground" data-testid="text-primary-facility-id">
                    ID: {doctor.primaryFacilityId}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Affiliated Facilities</p>
                {affiliatedFacilities.length > 0 ? (
                  <div className="flex flex-wrap gap-1" data-testid="list-affiliated-facilities">
                    {affiliatedFacilities.map((facility: any, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs" data-testid={`badge-facility-${idx}`}>
                        {typeof facility === 'object' ? (facility.facilityName || facility.facilityId) : facility}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No affiliated facilities</p>
                )}
              </div>
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Risk Score</span>
                <span className="text-sm font-medium" data-testid="text-overview-risk-score">
                  {riskScore.toFixed(0)}%
                </span>
              </div>
              <Progress value={riskScore} className="h-2" data-testid="progress-risk-score" />
            </div>
          </div>
        </CardContent>
      </Card>

      {doctor.aiAssessment && (
        <Card data-testid="card-ai-assessment">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              AI Assessment
            </CardTitle>
            {doctor.lastAnalyzedAt && (
              <CardDescription className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Last analyzed: {formatDate(doctor.lastAnalyzedAt)}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-ai-assessment">
              {doctor.aiAssessment}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {practicePatterns && (
          <Card data-testid="card-practice-patterns">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                Practice Patterns
              </CardTitle>
              <CardDescription>
                Patient volumes and billing patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold" data-testid="text-avg-patients-per-day">
                      {practicePatterns.avgPatientsPerDay?.toFixed(1) || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Patients/Day</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold" data-testid="text-claims-per-patient">
                      {practicePatterns.claimsPerPatient?.toFixed(1) || practicePatterns.avgClaimPerPatient?.toFixed(1) || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground">Claims/Patient</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold" data-testid="text-avg-amount-per-patient">
                      {formatCurrency(practicePatterns.avgAmountPerPatient || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Amount/Patient</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold" data-testid="text-avg-amount-per-claim">
                      {formatCurrency(practicePatterns.avgAmountPerClaim || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Amount/Claim</p>
                  </div>
                </div>

                {practicePatterns.topProcedures && practicePatterns.topProcedures.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Top Procedures</p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Freq</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {practicePatterns.topProcedures.slice(0, 5).map((proc, idx) => (
                            <TableRow key={idx} data-testid={`row-procedure-${idx}`}>
                              <TableCell>
                                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                  {proc.code}
                                </code>
                              </TableCell>
                              <TableCell className="text-sm max-w-40 truncate">{proc.description}</TableCell>
                              <TableCell className="text-right">{proc.frequency}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}

                {practicePatterns.prescribingHabits && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Pill className="w-4 h-4 text-muted-foreground" />
                        Prescribing Habits
                      </p>
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-sm font-medium" data-testid="text-avg-prescriptions">
                              {practicePatterns.prescribingHabits.avgPrescriptionsPerVisit?.toFixed(1) || "-"}
                            </p>
                            <p className="text-xs text-muted-foreground">Avg Rx/Visit</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-sm font-medium" data-testid="text-controlled-substance-ratio">
                              {formatPercent(practicePatterns.prescribingHabits.controlledSubstanceRatio)}
                            </p>
                            <p className="text-xs text-muted-foreground">Controlled Substance</p>
                          </div>
                        </div>
                      </div>
                      {practicePatterns.prescribingHabits.topMedications && 
                       practicePatterns.prescribingHabits.topMedications.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Top Medications</p>
                          <div className="flex flex-wrap gap-1" data-testid="list-top-medications">
                            {practicePatterns.prescribingHabits.topMedications.map((med, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs" data-testid={`badge-medication-${idx}`}>
                                {med}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {practicePatterns.referralPatterns && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Network className="w-4 h-4 text-muted-foreground" />
                        Referral Patterns
                      </p>
                      <div className="flex items-center gap-4 mb-2">
                        <div>
                          <p className="text-sm font-medium" data-testid="text-referral-rate">
                            {formatPercent(practicePatterns.referralPatterns.referralRate)}
                          </p>
                          <p className="text-xs text-muted-foreground">Referral Rate</p>
                        </div>
                      </div>
                      {practicePatterns.referralPatterns.topReferralDestinations && 
                       practicePatterns.referralPatterns.topReferralDestinations.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Top Referral Destinations</p>
                          <div className="flex flex-wrap gap-1" data-testid="list-referral-destinations">
                            {practicePatterns.referralPatterns.topReferralDestinations.map((dest, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs" data-testid={`badge-referral-${idx}`}>
                                {dest}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {peerComparison && (
          <Card data-testid="card-peer-comparison">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="w-5 h-5 text-amber-500" />
                Peer Comparison
              </CardTitle>
              <CardDescription>
                Performance compared to specialty peers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold" data-testid="text-percentile">
                      {peerComparison.percentile}th
                    </p>
                    <p className="text-sm text-muted-foreground">Percentile Rank</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      peerComparison.percentile >= 75
                        ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400"
                        : peerComparison.percentile >= 50
                        ? "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400"
                    }
                    data-testid="badge-percentile"
                  >
                    Top {100 - peerComparison.percentile}%
                  </Badge>
                </div>

                <Separator />

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead className="text-right">Doctor</TableHead>
                      <TableHead className="text-right">Specialty Avg</TableHead>
                      <TableHead className="text-right">Deviation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow data-testid="row-peer-avg-claim">
                      <TableCell className="font-medium">Avg Claim</TableCell>
                      <TableCell className="text-right" data-testid="text-doctor-avg-claim">
                        {formatCurrency(peerComparison.doctorAvgClaim)}
                      </TableCell>
                      <TableCell className="text-right" data-testid="text-specialty-avg-claim">
                        {formatCurrency(peerComparison.specialtyAvgClaim)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            peerComparison.deviation > 0
                              ? "flex items-center justify-end gap-1 text-red-600 dark:text-red-400"
                              : "flex items-center justify-end gap-1 text-green-600 dark:text-green-400"
                          }
                          data-testid="text-deviation"
                        >
                          {peerComparison.deviation > 0 ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          )}
                          {peerComparison.deviation > 0 ? "+" : ""}
                          {peerComparison.deviation.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between text-sm p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">Peer Group Size</span>
                  <span className="font-medium" data-testid="text-peer-group-size">
                    {peerComparison.peerGroupSize} doctors
                  </span>
                </div>
              </div>
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
              <div className="text-center text-muted-foreground py-6" data-testid="text-no-flags">
                No flags recorded
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Flag ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flags.map((flag, idx) => (
                    <TableRow key={idx} data-testid={`row-flag-${idx}`}>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded" data-testid={`text-flag-id-${idx}`}>
                          {flag.flagId}
                        </code>
                      </TableCell>
                      <TableCell data-testid={`text-flag-type-${idx}`}>{flag.flagType}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getSeverityBadgeClasses(flag.severity)}
                          data-testid={`badge-flag-severity-${idx}`}
                        >
                          {flag.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-40 truncate" data-testid={`text-flag-description-${idx}`}>
                        {flag.description}
                      </TableCell>
                      <TableCell data-testid={`text-flag-date-${idx}`}>{formatDate(flag.raisedDate)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusBadgeClasses(flag.status)}
                          data-testid={`badge-flag-status-${idx}`}
                        >
                          {flag.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
              <div className="text-center text-muted-foreground py-6" data-testid="text-no-claims">
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
                    <p className="text-2xl font-bold" data-testid="text-unique-patients">
                      {claimsSummary.uniquePatients}
                    </p>
                    <p className="text-xs text-muted-foreground">Unique Patients</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <div>
                    <p className="text-sm font-medium" data-testid="text-denial-rate">
                      {formatPercent(claimsSummary.denialRate)}
                    </p>
                    <p className="text-xs text-muted-foreground">Denial Rate</p>
                  </div>
                </div>

                {claimsByYearData.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Claims by Year</p>
                      <div className="h-32" data-testid="chart-claims-by-year">
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
      </div>
    </div>
  );
}
