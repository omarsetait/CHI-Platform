import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  FileText,
  Stethoscope,
  Calendar,
  MapPin,
  ShieldAlert,
  Bot,
  Building2,
  User,
  Activity,
  ClipboardList,
  AlertTriangle,
} from "lucide-react";

interface ValidationEngineResult {
  engine: string;
  status: string;
  validationResults?: string;
  aiStatus?: string;
  aiValidationResults?: string;
  llmDiagnosisDesc?: string;
  icd10Descriptions?: string;
}

interface ClaimDetail {
  id: string;
  claimNumber: string;
  memberId: string;
  providerId: string;
  practitionerId: string | null;
  claimType: string;
  registrationDate: string;
  serviceDate: string;
  amount: string;
  approvedAmount: string | null;
  status: string;
  primaryDiagnosis: string;
  secondaryDiagnosis: string | null;
  otherDiagnosis: string | null;
  dischargeDiagnosis: string[] | null;
  icdCodes: string[] | null;
  cptCodes: string[] | null;
  description: string | null;
  specialty: string | null;
  hospital: string | null;
  category: string | null;
  flagged: boolean;
  flagReason: string | null;
  outlierScore: string | null;
  providerType: string | null;
  providerLicense: string | null;
  groupNo: string | null;
  city: string | null;
  coverageRelationship: string | null;
  isChronic: boolean | null;
  isNewborn: boolean | null;
  lengthOfStay: number | null;
  serviceDuration: number | null;
  encounterStart: string | null;
  encounterEnd: string | null;
  admissionDate: string | null;
  dischargeDate: string | null;
  dischargeDisposition: string | null;
  policyEffectiveDate: string | null;
  policyExpiryDate: string | null;
  validationEngines: ValidationEngineResult[] | null;
}

interface ServiceLine {
  id: string;
  lineNumber: number;
  serviceCode: string;
  serviceCodeSystem: string | null;
  serviceDescription: string;
  serviceDate: string | null;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  approvedAmount: string | null;
  adjudicationStatus: string | null;
  approvalStatus: string | null;
  violations: string[] | null;
  denialReason: string | null;
  activityType: string | null;
  internalServiceCode: string | null;
  providerServiceDescription: string | null;
  specialtyCode: string | null;
  practitionerId: string | null;
  patientShareAmount: string | null;
  payerShareAmount: string | null;
  netAmount: string | null;
  validationEngines: Array<{
    engine: string;
    status: string;
    qaListedServiceCode?: string;
    qaThServiceDesc?: string;
    qaTachyActivityType?: string;
    aiStatus?: string;
    notes?: string;
  }> | null;
}

interface ClaimDetailResponse {
  claim: ClaimDetail;
  services: ServiceLine[];
  providerName: string | null;
  patientName: string | null;
  practitionerName: string | null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadgeClasses(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("accept") || s === "approved")
    return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (s.includes("reject") || s === "denied")
    return "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300";
  if (s.includes("partial"))
    return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300";
  if (s.includes("confirmed_fraud"))
    return "bg-red-100 text-red-800 border-red-300";
  if (s.includes("under_review"))
    return "bg-blue-100 text-blue-800 border-blue-300";
  return "bg-muted text-muted-foreground";
}

function outlierPercent(score: string | null): number {
  return Math.round(Number(score || 0) * 100);
}

export default function FWAClaimDetailPage() {
  const params = useParams<{ idOrNumber: string }>();
  const idOrNumber = params.idOrNumber;
  const [, setLocation] = useLocation();

  const { data, isLoading, error } = useQuery<ClaimDetailResponse>({
    queryKey: ["/api/fwa/flagged-claims", idOrNumber],
    queryFn: async () => {
      const res = await fetch(
        `/api/fwa/flagged-claims/${encodeURIComponent(idOrNumber)}`,
        { credentials: "include" },
      );
      if (!res.ok) throw new Error(`Failed to load claim: ${res.status}`);
      return res.json();
    },
    enabled: !!idOrNumber,
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <Button variant="outline" size="sm" onClick={() => setLocation("/fwa/flagged-claims")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to flagged claims
        </Button>
        <Card className="mt-6">
          <CardContent className="py-12 text-center text-muted-foreground">
            <AlertTriangle className="mx-auto mb-3 h-8 w-8" />
            Claim not found
          </CardContent>
        </Card>
      </div>
    );
  }

  const { claim, services, providerName, patientName, practitionerName } = data;
  const totalAmount = Number(claim.amount || 0);
  const approvedAmount = Number(claim.approvedAmount || 0);
  const totalServiceAmount = services.reduce((sum, s) => sum + Number(s.totalPrice || 0), 0);
  const totalServiceApproved = services.reduce((sum, s) => sum + Number(s.approvedAmount || 0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb / back */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/fwa/flagged-claims")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Flagged Claims
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span data-testid="text-claim-number">{claim.claimNumber}</span>
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="text-claim-description">
              {claim.description ?? "Flagged claim detail"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {claim.flagged && (
            <Badge className="bg-rose-100 text-rose-800 border-rose-300" data-testid="badge-flagged">
              <ShieldAlert className="h-3 w-3 mr-1" />
              Flagged
            </Badge>
          )}
          <Badge className={statusBadgeClasses(claim.status || "")} data-testid="badge-claim-status">
            {claim.status?.replace(/_/g, " ") || "—"}
          </Badge>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Claim Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-amount">{formatCurrency(totalAmount)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Approved: <span className="font-medium">{formatCurrency(approvedAmount)}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Service Lines</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-service-count">{services.length}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Sum: <span className="font-medium">{formatCurrency(totalServiceAmount)}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Detection Confidence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Progress value={outlierPercent(claim.outlierScore)} className="h-2" />
              <span className="text-lg font-bold" data-testid="text-outlier-score">
                {outlierPercent(claim.outlierScore)}%
              </span>
            </div>
            {Number(claim.outlierScore || 0) > 0.7 && (
              <Badge variant="outline" className="text-xs mt-2 bg-violet-100 text-violet-700 border-violet-300">
                <Bot className="h-3 w-3 mr-1" />
                AI High Confidence
              </Badge>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">Flag Reason</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium capitalize" data-testid="text-flag-reason">
              {claim.flagReason?.replace(/_/g, " ") || "—"}
            </p>
            {claim.category && (
              <p className="text-xs text-muted-foreground mt-1">Category: {claim.category}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Provider / Patient / Practitioner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Provider
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <Link
              href={`/fwa/flagged-claims?provider=${encodeURIComponent(claim.providerId)}`}
              className="text-sm font-medium text-primary hover:underline"
              data-testid="link-provider"
            >
              {providerName ?? claim.providerId}
            </Link>
            <p className="text-xs text-muted-foreground font-mono">{claim.providerId}</p>
            {claim.providerType && (
              <p className="text-xs text-muted-foreground">{claim.providerType}</p>
            )}
            {claim.providerLicense && (
              <p className="text-xs text-muted-foreground">License: {claim.providerLicense}</p>
            )}
            {claim.city && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {claim.city}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Patient
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            <p className="text-sm font-medium" data-testid="text-patient-name">{patientName ?? "—"}</p>
            <p className="text-xs text-muted-foreground font-mono">{claim.memberId}</p>
            {claim.coverageRelationship && (
              <p className="text-xs text-muted-foreground">Relationship: {claim.coverageRelationship}</p>
            )}
            {claim.groupNo && (
              <p className="text-xs text-muted-foreground">Group: {claim.groupNo}</p>
            )}
            <div className="flex flex-wrap gap-1 mt-1">
              {claim.isChronic && <Badge variant="outline" className="text-xs">Chronic</Badge>}
              {claim.isNewborn && <Badge variant="outline" className="text-xs">Newborn</Badge>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Practitioner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {claim.practitionerId ? (
              <Link
                href={`/fwa/flagged-claims?doctor=${encodeURIComponent(claim.practitionerId)}`}
                className="text-sm font-medium text-primary hover:underline"
                data-testid="link-practitioner"
              >
                {practitionerName ?? claim.practitionerId}
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
            {claim.practitionerId && (
              <p className="text-xs text-muted-foreground font-mono">{claim.practitionerId}</p>
            )}
            {claim.specialty && (
              <p className="text-xs text-muted-foreground">{claim.specialty}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Encounter & Policy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Encounter
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="font-medium capitalize" data-testid="text-claim-type">{claim.claimType}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Disposition</p>
              <p className="font-medium">{claim.dischargeDisposition ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Encounter Start
              </p>
              <p className="font-medium">{formatDateTime(claim.encounterStart)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Encounter End
              </p>
              <p className="font-medium">{formatDateTime(claim.encounterEnd)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Length of Stay</p>
              <p className="font-medium">
                {claim.lengthOfStay !== null ? `${claim.lengthOfStay} day(s)` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Service Duration</p>
              <p className="font-medium">
                {claim.serviceDuration !== null ? `${claim.serviceDuration} min` : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Service Date</p>
              <p className="font-medium">{formatDate(claim.serviceDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Registration</p>
              <p className="font-medium">{formatDate(claim.registrationDate)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Diagnoses & Policy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Primary</p>
              <p className="font-medium" data-testid="text-primary-diagnosis">{claim.primaryDiagnosis}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Secondary</p>
                <p>{claim.secondaryDiagnosis ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Other</p>
                <p>{claim.otherDiagnosis ?? "—"}</p>
              </div>
            </div>
            {claim.dischargeDiagnosis && claim.dischargeDiagnosis.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">Discharge</p>
                <div className="flex flex-wrap gap-1">
                  {claim.dischargeDiagnosis.map((dx) => (
                    <Badge key={dx} variant="outline" className="font-mono text-xs">{dx}</Badge>
                  ))}
                </div>
              </div>
            )}
            {claim.icdCodes && claim.icdCodes.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground">ICD Codes</p>
                <div className="flex flex-wrap gap-1">
                  {claim.icdCodes.map((dx) => (
                    <Badge key={dx} variant="outline" className="font-mono text-xs">{dx}</Badge>
                  ))}
                </div>
              </div>
            )}
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Policy Effective</p>
                <p>{formatDate(claim.policyEffectiveDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Policy Expiry</p>
                <p>{formatDate(claim.policyExpiryDate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service Lines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Service Lines ({services.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No services recorded for this claim.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Approved</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((s) => (
                  <TableRow key={s.id} data-testid={`row-service-${s.lineNumber}`}>
                    <TableCell className="font-mono text-xs">{s.lineNumber}</TableCell>
                    <TableCell>
                      <div className="font-mono text-xs">{s.serviceCode}</div>
                      {s.internalServiceCode && (
                        <div className="text-xs text-muted-foreground">int: {s.internalServiceCode}</div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="text-sm">{s.serviceDescription}</div>
                      {s.providerServiceDescription && s.providerServiceDescription !== s.serviceDescription && (
                        <div className="text-xs text-muted-foreground">{s.providerServiceDescription}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{s.activityType ?? "—"}</TableCell>
                    <TableCell className="text-right text-sm">{Number(s.quantity).toFixed(0)}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(Number(s.unitPrice))}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatCurrency(Number(s.totalPrice))}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(Number(s.approvedAmount || 0))}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${statusBadgeClasses(s.approvalStatus || s.adjudicationStatus || "")}`}>
                        {(s.approvalStatus || s.adjudicationStatus || "—").replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2">
                  <TableCell colSpan={6} className="text-right font-medium text-sm">Totals</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(totalServiceAmount)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(totalServiceApproved)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Validation Engines */}
      {claim.validationEngines && claim.validationEngines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Validation Engines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {claim.validationEngines.map((engine, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border p-4 space-y-2"
                  data-testid={`card-engine-${engine.engine}`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">{engine.engine}</h4>
                    <Badge className={`text-xs ${statusBadgeClasses(engine.status)}`}>
                      {engine.status}
                    </Badge>
                  </div>
                  {engine.aiStatus && engine.aiStatus !== engine.status && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">AI Status: </span>
                      <Badge variant="outline" className={`text-xs ${statusBadgeClasses(engine.aiStatus)}`}>
                        {engine.aiStatus}
                      </Badge>
                    </div>
                  )}
                  {engine.validationResults && (
                    <p className="text-xs text-muted-foreground">{engine.validationResults}</p>
                  )}
                  {engine.aiValidationResults && (
                    <p className="text-xs text-muted-foreground italic">{engine.aiValidationResults}</p>
                  )}
                  {engine.llmDiagnosisDesc && (
                    <p className="text-xs">
                      <span className="text-muted-foreground">LLM Dx: </span>
                      {engine.llmDiagnosisDesc}
                    </p>
                  )}
                  {engine.icd10Descriptions && (
                    <p className="text-xs text-muted-foreground">{engine.icd10Descriptions}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
