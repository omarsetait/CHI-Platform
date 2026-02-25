import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
  FileText,
  AlertTriangle,
  Building,
  User,
  Stethoscope,
  DollarSign,
  Calendar,
  Shield,
  Activity,
} from "lucide-react";

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

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: string | null | undefined): string {
  if (!date) return "-";
  try {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return date;
  }
}

// ICD-10 Diagnosis Code descriptions (common codes)
const icd10Descriptions: Record<string, string> = {
  'K42.9': 'Umbilical Hernia without obstruction or gangrene',
  'I10': 'Essential (primary) Hypertension',
  'E11.9': 'Type 2 Diabetes Mellitus without complications',
  'J45.909': 'Unspecified Asthma, uncomplicated',
  'M54.5': 'Low Back Pain',
  'F32.9': 'Major Depressive Disorder, single episode, unspecified',
  'E78.5': 'Hyperlipidemia, unspecified',
  'J06.9': 'Acute Upper Respiratory Infection, unspecified',
  'R10.9': 'Unspecified Abdominal Pain',
  'M79.3': 'Panniculitis, unspecified',
  'K21.0': 'GERD with Esophagitis',
  'N39.0': 'Urinary Tract Infection, site not specified',
  'R05': 'Cough',
  'Z00.00': 'Encounter for general adult medical examination',
  'Z23': 'Encounter for immunization',
  'E03.9': 'Hypothyroidism, unspecified',
  'G47.00': 'Insomnia, unspecified',
  'R51': 'Headache',
  'R53.83': 'Other fatigue',
  'M25.50': 'Pain in unspecified joint',
  'J20.9': 'Acute Bronchitis, unspecified',
  'R50.9': 'Fever, unspecified',
  'K59.00': 'Constipation, unspecified',
  'R11.2': 'Nausea with vomiting, unspecified',
  'N18.3': 'Chronic Kidney Disease, Stage 3',
  'I25.10': 'Coronary Artery Disease',
  'J44.9': 'Chronic Obstructive Pulmonary Disease, unspecified',
  'F41.1': 'Generalized Anxiety Disorder',
  'G43.909': 'Migraine, unspecified',
  'M17.9': 'Osteoarthritis of knee, unspecified'
};

function getDiagnosisDescription(code: string | null | undefined): string {
  if (!code) return "";
  return icd10Descriptions[code] || "";
}

interface ClaimData {
  id: string;
  claimReference: string;
  providerId: string;
  patientId: string;
  practitionerLicense: string;
  principalDiagnosisCode: string;
  serviceCode: string;
  serviceDescription: string;
  totalAmount: number;
  unitPrice: number;
  quantity: number;
  claimType: string;
  city: string;
  providerType: string;
  claimOccurrenceDate?: string;
}

interface DetectionResult {
  compositeScore: number;
  compositeRiskLevel: string;
  ruleEngineScore: number;
  statisticalScore: number;
  unsupervisedScore: number;
  ragLlmScore: number;
  semanticScore: number;
  ruleEngineFindings: any[];
  statisticalFindings: any;
  unsupervisedFindings: any;
  ragLlmFindings: any;
  semanticFindings: any;
}

export default function FWAClaimView() {
  const params = useParams<{ id: string }>();
  const claimId = params.id;

  const { data: claim, isLoading: claimLoading } = useQuery<ClaimData>({
    queryKey: ["/api/fwa/analyzed-claims", claimId],
    enabled: !!claimId,
  });

  const { data: detection, isLoading: detectionLoading } = useQuery<DetectionResult>({
    queryKey: ["/api/fwa/detection-results", claimId],
    enabled: !!claimId,
  });

  const isLoading = claimLoading || detectionLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6" data-testid="page-fwa-claim-loading">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="p-6" data-testid="page-fwa-claim-not-found">
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Claim Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The claim you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/fwa/high-risk-entities?tab=claims">
            <Button>Back to Claims</Button>
          </Link>
        </div>
      </div>
    );
  }

  const riskScore = detection?.compositeScore || 0;
  const riskLevel = detection?.compositeRiskLevel || "minimal";

  return (
    <div className="p-6 space-y-6" data-testid="page-fwa-claim-view">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/fwa/high-risk-entities?tab=claims">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold" data-testid="text-claim-reference">
                  Claim: {claim.claimReference}
                </h1>
                <p className="text-sm text-muted-foreground">
                  ID: {claim.id}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={getRiskLevelBadgeClasses(riskLevel)} data-testid="badge-risk-level">
            {riskLevel}
          </Badge>
          <div className="text-right">
            <span className="text-2xl font-bold text-primary">{riskScore.toFixed(1)}%</span>
            <p className="text-xs text-muted-foreground">Risk Score</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Amount</span>
            </div>
            <p className="text-2xl font-bold" data-testid="text-amount">
              {formatCurrency(claim.totalAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Provider</span>
            </div>
            <Link href={`/context/provider-360/${claim.providerId}`}>
              <p className="text-lg font-semibold text-primary hover:underline" data-testid="link-provider">
                {claim.providerId}
              </p>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Patient</span>
            </div>
            <Link href={`/context/patient-360/${claim.patientId}`}>
              <p className="text-lg font-semibold text-primary hover:underline" data-testid="link-patient">
                {claim.patientId}
              </p>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Stethoscope className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Doctor</span>
            </div>
            <Link href={`/context/doctor-360/${claim.practitionerLicense}`}>
              <p className="text-lg font-semibold text-primary hover:underline" data-testid="link-doctor">
                {claim.practitionerLicense || "-"}
              </p>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card data-testid="card-claim-details">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Claim Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Diagnosis Code</p>
                  <p className="font-medium">{claim.principalDiagnosisCode || "-"}</p>
                  {getDiagnosisDescription(claim.principalDiagnosisCode) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {getDiagnosisDescription(claim.principalDiagnosisCode)}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Service Code</p>
                  <p className="font-medium">{claim.serviceCode || "-"}</p>
                  {claim.serviceDescription && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {claim.serviceDescription}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Service Description</p>
                  <p className="font-medium">{claim.serviceDescription || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Claim Type</p>
                  <p className="font-medium capitalize">{claim.claimType?.replace('-', ' ') || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unit Price</p>
                  <p className="font-medium">{formatCurrency(claim.unitPrice || claim.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Quantity</p>
                  <p className="font-medium">{claim.quantity || 1}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">City</p>
                  <p className="font-medium">{claim.city || "Not Available"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Provider Type</p>
                  <p className="font-medium">{claim.providerType || "Healthcare Facility"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {detection && (
          <Card data-testid="card-detection-scores">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                5-Method Detection Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">Rule Engine</span>
                    <span className="text-sm font-medium">{detection.ruleEngineScore?.toFixed(1) || 0}%</span>
                  </div>
                  <Progress value={detection.ruleEngineScore || 0} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">Statistical</span>
                    <span className="text-sm font-medium">{detection.statisticalScore?.toFixed(1) || 0}%</span>
                  </div>
                  <Progress value={detection.statisticalScore || 0} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">ML/Unsupervised</span>
                    <span className="text-sm font-medium">{detection.unsupervisedScore?.toFixed(1) || 0}%</span>
                  </div>
                  <Progress value={detection.unsupervisedScore || 0} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">RAG/LLM</span>
                    <span className="text-sm font-medium">{detection.ragLlmScore?.toFixed(1) || 0}%</span>
                  </div>
                  <Progress value={detection.ragLlmScore || 0} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">Semantic</span>
                    <span className="text-sm font-medium">{detection.semanticScore?.toFixed(1) || 0}%</span>
                  </div>
                  <Progress value={detection.semanticScore || 0} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {detection?.ruleEngineFindings && detection.ruleEngineFindings.length > 0 && (
        <Card data-testid="card-rule-violations">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Rule Violations ({detection.ruleEngineFindings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detection.ruleEngineFindings.map((finding: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{finding.ruleCode || finding.ruleName || `Rule ${idx + 1}`}</TableCell>
                    <TableCell>{finding.category || "-"}</TableCell>
                    <TableCell>
                      <Badge className={getRiskLevelBadgeClasses(finding.severity)}>
                        {finding.severity || "medium"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md truncate">{finding.description || finding.message || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
