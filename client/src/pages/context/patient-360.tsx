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
  User,
  Calendar,
  Shield,
  Heart,
  AlertTriangle,
  FileText,
  Activity,
  Stethoscope,
  Building,
  DollarSign,
  TrendingUp,
  Clock,
  Sparkles,
  ExternalLink,
  Pill,
  Ambulance,
  RefreshCcw,
  Users,
  Flag,
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
import type { Patient360 } from "@shared/schema";

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
    case "managed":
    case "in_progress":
      return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800";
    case "resolved":
    case "closed":
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
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
          <User className="w-16 h-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Patient Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The patient you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/fwa/patients">
            <Button data-testid="button-back-to-patients">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Patients
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Patient360Page() {
  const params = useParams<{ patientId: string }>();
  const patientId = params.patientId;

  const { data: patient, isLoading, error } = useQuery<Patient360>({
    queryKey: ["/api/context/patient-360", patientId],
    enabled: !!patientId,
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !patient) {
    return <NotFoundState />;
  }

  const riskScore = patient.riskScore ? parseFloat(patient.riskScore as string) : 0;
  const chronicConditions = Array.isArray(patient.chronicConditions) 
    ? patient.chronicConditions 
    : (typeof patient.chronicConditions === 'string' ? [] : []);
  const visitHistory = Array.isArray(patient.visitHistory) 
    ? patient.visitHistory 
    : [];
  const riskFactors = Array.isArray(patient.riskFactors) ? patient.riskFactors : [];
  const fwaAlerts = Array.isArray(patient.fwaAlerts) ? patient.fwaAlerts : [];
  const claimsSummary = patient.claimsSummary;
  const behavioralPatterns = patient.behavioralPatterns;

  const claimsByYearData = claimsSummary?.claimsByYear
    ? Object.entries(claimsSummary.claimsByYear).map(([year, amount]) => ({
        year,
        amount,
      }))
    : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/fwa/patients">
          <Button variant="ghost" size="sm" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <Card data-testid="card-patient-header">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" data-testid="text-patient-name">
                  {patient.patientName}
                </h1>
                <p className="text-sm text-muted-foreground" data-testid="text-patient-id">
                  Patient ID: {patient.patientId}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={getRiskLevelBadgeClasses(patient.riskLevel)}
                data-testid="badge-risk-level"
              >
                {patient.riskLevel || "unknown"} risk
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
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Date of Birth</p>
                <p className="text-sm font-medium" data-testid="text-dob">
                  {formatDate(patient.dateOfBirth)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Gender</p>
                <p className="text-sm font-medium" data-testid="text-gender">
                  {patient.gender || "-"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Policy Number</p>
                <p className="text-sm font-medium" data-testid="text-policy">
                  {patient.policyNumber || "-"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Member Since</p>
                <p className="text-sm font-medium" data-testid="text-member-since">
                  {formatDate(patient.memberSince)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {patient.aiSummary && (
        <Card data-testid="card-ai-summary">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              AI Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-ai-summary">
              {patient.aiSummary}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-chronic-conditions">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Heart className="w-5 h-5 text-red-500" />
              Chronic Conditions
            </CardTitle>
            <CardDescription>
              {chronicConditions.length} condition(s) tracked
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {chronicConditions.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No chronic conditions recorded
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Condition</TableHead>
                    <TableHead>ICD Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Provider</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chronicConditions.map((condition, idx) => (
                    <TableRow key={idx} data-testid={`row-condition-${idx}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{condition.condition}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(condition.diagnosedDate)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {condition.icdCode}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getStatusBadgeClasses(condition.status)}
                        >
                          {condition.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {condition.managingProvider}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-risk-factors">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Risk Factors
            </CardTitle>
            <CardDescription>
              {riskFactors.length} factor(s) identified
            </CardDescription>
          </CardHeader>
          <CardContent>
            {riskFactors.length === 0 ? (
              <div className="text-center text-muted-foreground py-6">
                No risk factors identified
              </div>
            ) : (
              <div className="space-y-3">
                {riskFactors.map((factor, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border bg-muted/30"
                    data-testid={`risk-factor-${idx}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium">{factor.factor}</span>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={getSeverityBadgeClasses(factor.severity)}
                        >
                          {factor.severity}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {factor.confidence}%
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {factor.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Detected: {formatDate(factor.detectedDate)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-fwa-alerts">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Flag className="w-5 h-5 text-red-500" />
              FWA Alerts
            </CardTitle>
            <CardDescription>
              {fwaAlerts.length} alert(s) active
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fwaAlerts.length === 0 ? (
              <div className="text-center text-muted-foreground py-6">
                No FWA alerts
              </div>
            ) : (
              <div className="space-y-3">
                {fwaAlerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border bg-muted/30"
                    data-testid={`fwa-alert-${idx}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-medium">{alert.alertType}</span>
                      <Badge
                        variant="outline"
                        className={getSeverityBadgeClasses(alert.severity)}
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {alert.description}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-muted-foreground">
                        Detected: {formatDate(alert.detectedDate)}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={getStatusBadgeClasses(alert.status)}
                        >
                          {alert.status}
                        </Badge>
                        {alert.linkedCaseId && (
                          <Link href={`/fwa/cases/${alert.linkedCaseId}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`link-case-${alert.alertId}`}
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
                    <Building className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium" data-testid="text-unique-providers">
                        {claimsSummary.uniqueProviders}
                      </p>
                      <p className="text-xs text-muted-foreground">Providers</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium" data-testid="text-unique-doctors">
                        {claimsSummary.uniqueDoctors}
                      </p>
                      <p className="text-xs text-muted-foreground">Doctors</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <div>
                      <p className="font-medium" data-testid="text-flagged-claims">
                        {claimsSummary.flaggedClaimsCount}
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
      </div>

      <Card data-testid="card-visit-history">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="w-5 h-5 text-primary" />
            Claims History
          </CardTitle>
          <CardDescription>
            {visitHistory.length} claim(s) with {(claimsSummary as any)?.totalServiceLines || visitHistory.reduce((sum: number, v: any) => sum + (v.serviceCount || 1), 0)} service lines
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {visitHistory.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No visit history available
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Visit Type</TableHead>
                  <TableHead>Diagnosis</TableHead>
                  <TableHead className="text-right">Claim Amount</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visitHistory.map((visit, idx) => (
                  <TableRow key={idx} data-testid={`row-visit-${idx}`}>
                    <TableCell className="font-medium">
                      {formatDate(visit.date)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{visit.providerName}</p>
                        <p className="text-xs text-muted-foreground">
                          {visit.providerId}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{visit.visitType}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {visit.diagnosis}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(visit.claimAmount)}
                    </TableCell>
                    <TableCell>
                      <Link href={`/fwa/claim/${visit.claimId}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`link-claim-${visit.claimId}`}
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {behavioralPatterns && (
        <Card data-testid="card-behavioral-patterns">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              Behavioral Patterns
            </CardTitle>
            <CardDescription>
              AI-detected utilization patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCcw className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Provider Switching</span>
                </div>
                <p className="text-2xl font-bold" data-testid="text-provider-switching">
                  {(behavioralPatterns.providerSwitchingRate * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">switching rate</p>
              </div>

              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Ambulance className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">ER Utilization</span>
                </div>
                <p className="text-2xl font-bold" data-testid="text-er-utilization">
                  {(behavioralPatterns.erUtilizationRate * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">utilization rate</p>
              </div>

              <div className="p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <Pill className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Controlled Substances</span>
                </div>
                <p className="text-2xl font-bold" data-testid="text-controlled-ratio">
                  {(
                    (behavioralPatterns.prescriptionPatterns?.controlledSubstanceRatio || 0) *
                    100
                  ).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">of prescriptions</p>
              </div>
            </div>

            {behavioralPatterns.peakVisitDays && behavioralPatterns.peakVisitDays.length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-muted/30">
                <p className="text-sm font-medium mb-2">Peak Visit Days</p>
                <div className="flex flex-wrap gap-2">
                  {behavioralPatterns.peakVisitDays.map((day, idx) => (
                    <Badge key={idx} variant="outline">
                      {day}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
