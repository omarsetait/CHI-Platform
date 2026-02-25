import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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
  ChevronRight,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  User,
  Calendar,
  DollarSign,
  Stethoscope,
  Paperclip,
  Clock,
  Eye,
  Plus,
  FileCheck,
  Send
} from "lucide-react";
import tachyHealthLogo from "@assets/logo.svg";

interface DemoClaim {
  id: string;
  claimId: string;
  claimNumber?: string;
  patientName?: string;
  patientId: string;
  providerId: string;
  providerName?: string;
  serviceType?: string;
  diagnosisCode?: string;
  procedureCode?: string;
  requestedAmount?: string;
  amount?: string;
  status: string;
  workflowPhase?: number;
  riskScore?: string;
  signals?: any[];
  createdAt?: string;
  updatedAt?: string;
}

interface ClaimDetail {
  id: string;
  status: "approved" | "rejected" | "pending" | "review";
  memberId: string;
  memberName: string;
  policyNumber: string;
  policyName: string;
  dateOfService: string;
  submissionDate: string;
  billedAmount: number;
  preAuthAmount: number;
  approvedAmount: number;
  variance: number;
  varianceReason: string;
  primaryDiagnosis: { code: string; description: string };
  secondaryDiagnoses: { code: string; description: string }[];
  procedure: { code: string; description: string };
  lengthOfStay: number;
  hasIcu: boolean;
  hasSurgery: boolean;
}

interface CodeValidation {
  serviceCode: string;
  internalCode: string;
  standardCode: string;
  match: boolean;
  issue: string | null;
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  description: string;
  uploadDate: string;
}

interface AuditEntry {
  timestamp: string;
  action: string;
  user: string;
}

const diagnosisDescriptions: Record<string, string> = {
  "K80.20": "Calculus of gallbladder without cholecystitis",
  "E11.9": "Type 2 diabetes mellitus without complications",
  "I10": "Essential (primary) hypertension",
  "I25.10": "Atherosclerotic heart disease of native coronary artery",
  "M54.5": "Low back pain",
  "J06.9": "Acute upper respiratory infection, unspecified",
  "M17.11": "Primary osteoarthritis, right knee",
  "Z76.5": "Malingerer",
};

const procedureDescriptions: Record<string, string> = {
  "47562": "Laparoscopic cholecystectomy",
  "33533": "Coronary artery bypass",
  "22612": "Lumbar spinal fusion",
  "99213": "Office visit, established patient",
  "27447": "Total knee replacement",
  "99285": "Emergency department visit",
};

function mapDemoClaimToDetail(demo: DemoClaim): ClaimDetail {
  const amount = parseFloat(demo.requestedAmount || demo.amount || "10000");
  const preAuth = amount * 0.85;
  const variance = ((amount - preAuth) / preAuth) * 100;
  
  const diagCode = demo.diagnosisCode || "K80.20";
  const procCode = demo.procedureCode || "47562";
  
  let status: ClaimDetail["status"] = "pending";
  if (demo.status === "approved") status = "approved";
  else if (demo.status === "rejected" || demo.status === "denied") status = "rejected";
  else if (demo.status === "pending_review" || demo.status === "review") status = "review";

  return {
    id: demo.claimId || demo.claimNumber || demo.id,
    status,
    memberId: demo.patientId,
    memberName: demo.patientName || "Unknown Patient",
    policyNumber: `POL-${demo.providerId}-${demo.patientId.slice(-3)}`,
    policyName: "Gold Plus Corporate",
    dateOfService: demo.createdAt ? new Date(demo.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    submissionDate: demo.createdAt ? new Date(demo.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    billedAmount: amount,
    preAuthAmount: preAuth,
    approvedAmount: status === "approved" ? preAuth : 0,
    variance: Math.round(variance * 100) / 100,
    varianceReason: variance > 10 
      ? `Billed amount exceeds pre-authorization by ${variance.toFixed(2)}%. Additional services not covered in original pre-auth.`
      : "Within acceptable variance threshold.",
    primaryDiagnosis: { 
      code: diagCode, 
      description: diagnosisDescriptions[diagCode] || "Diagnosis description" 
    },
    secondaryDiagnoses: [
      { code: "E11.9", description: diagnosisDescriptions["E11.9"] || "" },
      { code: "I10", description: diagnosisDescriptions["I10"] || "" },
    ],
    procedure: { 
      code: procCode, 
      description: procedureDescriptions[procCode] || "Procedure description" 
    },
    lengthOfStay: 3,
    hasIcu: false,
    hasSurgery: procCode.startsWith("4") || procCode.startsWith("2") || procCode.startsWith("3"),
  };
}

function generateCodeValidations(claim: ClaimDetail): CodeValidation[] {
  const hasIssues = claim.variance > 15;
  return [
    { serviceCode: "SVC-001", internalCode: `INT-${claim.procedure.code.slice(0,3)}-01`, standardCode: claim.procedure.code, match: true, issue: null },
    { serviceCode: "SVC-002", internalCode: "INT-ANE-01", standardCode: "00790", match: true, issue: null },
    { serviceCode: "SVC-003", internalCode: "INT-LAB-05", standardCode: "80053", match: !hasIssues, issue: hasIssues ? "Bundling Issue - Should be included in surgical package" : null },
    { serviceCode: "SVC-004", internalCode: "INT-RAD-02", standardCode: "74177", match: true, issue: null },
    { serviceCode: "SVC-005", internalCode: "INT-MED-08", standardCode: "J2310", match: !hasIssues, issue: hasIssues ? "Out of Price List - Rate above contracted amount" : null },
  ];
}

function generateAttachments(claim: ClaimDetail): Attachment[] {
  const baseDate = new Date(claim.dateOfService);
  return [
    { id: "ATT-001", name: "Pre-Authorization Letter.pdf", type: "pdf", description: "Original pre-auth approval", uploadDate: new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] },
    { id: "ATT-002", name: "Operative Report.pdf", type: "pdf", description: "Surgical procedure documentation", uploadDate: new Date(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] },
    { id: "ATT-003", name: "Lab Results.xlsx", type: "xlsx", description: "Pre and post-op laboratory results", uploadDate: new Date(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] },
    { id: "ATT-004", name: "Discharge Summary.pdf", type: "pdf", description: "Patient discharge documentation", uploadDate: new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] },
  ];
}

function generateAuditTrail(claim: ClaimDetail): AuditEntry[] {
  const baseDate = new Date(claim.submissionDate);
  return [
    { timestamp: `${new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]} 14:32:00`, action: claim.variance > 15 ? "Claim flagged for manual review - variance exceeds threshold" : "Claim passed automated validation", user: "System" },
    { timestamp: `${new Date(baseDate.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]} 09:15:00`, action: "Documentation request sent to provider", user: "Sarah Johnson" },
    { timestamp: `${new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]} 16:45:00`, action: "Additional documents uploaded by provider", user: "Provider Portal" },
    { timestamp: `${new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]} 11:20:00`, action: "Claim submitted via provider portal", user: "Provider Portal" },
    { timestamp: `${new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]} 10:00:00`, action: `Pre-authorization approved for SAR ${claim.preAuthAmount.toLocaleString()}`, user: "Dr. Mohammed Al-Rashid" },
  ];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (dateTimeStr: string) => {
  const [date, time] = dateTimeStr.split(" ");
  return `${formatDate(date)} at ${time.slice(0, 5)}`;
};

export default function ClaimDetailProvider() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/provider-relation/:providerId/batches/:batchId/claims/:claimId");
  const providerId = params?.providerId || "PR001";
  const claimId = params?.claimId;

  const { data: demoClaims = [], isLoading } = useQuery<DemoClaim[]>({
    queryKey: ["/api/demo/claims"],
  });

  const demoClaim = demoClaims.find(
    c => c.claimId === claimId || c.id === claimId || c.claimNumber === claimId
  ) || (demoClaims.length > 0 ? demoClaims[0] : null);
  
  const claim = demoClaim ? mapDemoClaimToDetail(demoClaim) : null;
  const codeValidations = claim ? generateCodeValidations(claim) : [];
  const attachments = claim ? generateAttachments(claim) : [];
  const auditTrail = claim ? generateAuditTrail(claim) : [];

  const getStatusBadge = (status: ClaimDetail["status"]) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/30" data-testid="badge-claim-status-approved">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/10 text-red-600 border-red-500/30" data-testid="badge-claim-status-rejected">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-gray-500/10 text-gray-600 border-gray-500/30" data-testid="badge-claim-status-pending">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "review":
        return (
          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30" data-testid="badge-claim-status-review">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Under Review
          </Badge>
        );
    }
  };

  const getFileIcon = () => {
    return <FileText className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-card border-b">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img src={tachyHealthLogo} alt="TachyHealth" className="h-8" />
                <Separator orientation="vertical" className="h-6" />
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-primary" />
                  <h1 className="text-xl font-semibold">Claim Detail</h1>
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-96" />
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 bg-card border-b">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img src={tachyHealthLogo} alt="TachyHealth" className="h-8" />
                <Separator orientation="vertical" className="h-6" />
                <div className="flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-primary" />
                  <h1 className="text-xl font-semibold">Claim Detail</h1>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setLocation(`/provider-relation/${providerId}/batches`)}
                data-testid="button-back-to-batches"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Batches
              </Button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-6">
          <EmptyState
            title="Claim not found"
            description={`No claim found with ID: ${claimId}`}
            icon={<FileText className="h-12 w-12 text-muted-foreground" />}
            action={
              <Button onClick={() => setLocation(`/provider-relation/${providerId}/batches`)}>
                Back to Batches
              </Button>
            }
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={tachyHealthLogo} alt="TachyHealth" className="h-8" />
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-semibold">Claim Detail</h1>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setLocation(`/provider-relation/${providerId}/batches`)}
              data-testid="button-back-to-batches"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Batches
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button
            onClick={() => setLocation("/provider-relation")}
            className="hover:text-foreground"
            data-testid="link-provider-dashboard"
          >
            Provider Relation
          </button>
          <ChevronRight className="w-4 h-4" />
          <button
            onClick={() => setLocation(`/provider-relation/${providerId}`)}
            className="hover:text-foreground"
            data-testid="link-provider-detail"
          >
            Provider
          </button>
          <ChevronRight className="w-4 h-4" />
          <button
            onClick={() => setLocation(`/provider-relation/${providerId}/batches`)}
            className="hover:text-foreground"
            data-testid="link-batches"
          >
            Batches
          </button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">{claim.id}</span>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold" data-testid="text-claim-id">{claim.id}</h2>
                  {getStatusBadge(claim.status)}
                </div>
                <Separator className="my-4" />
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Member:</span>
                    <button className="text-primary hover:underline" data-testid="link-member">
                      {claim.memberName}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Policy:</span>
                    <span>{claim.policyName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Date of Service:</span>
                    <span>{formatDate(claim.dateOfService)}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="default" data-testid="button-approve-claim">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button variant="destructive" data-testid="button-reject-claim">
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button variant="outline" data-testid="button-request-docs">
                  <Send className="w-4 h-4 mr-2" />
                  Request Docs
                </Button>
                <Button variant="outline" data-testid="button-add-to-settlement">
                  <Plus className="w-4 h-4 mr-2" />
                  Add to Settlement
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="w-5 h-5 text-primary" />
                Financial Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Billed Amount</p>
                  <p className="text-xl font-bold" data-testid="text-billed-amount">{formatCurrency(claim.billedAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pre-Auth Amount</p>
                  <p className="text-xl font-bold" data-testid="text-preauth-amount">{formatCurrency(claim.preAuthAmount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Approved Amount</p>
                  <p className="text-xl font-bold text-muted-foreground" data-testid="text-approved-amount">
                    {claim.approvedAmount > 0 ? formatCurrency(claim.approvedAmount) : "Pending"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Variance</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-xl font-bold ${claim.variance > 10 ? "text-amber-600" : "text-green-600"}`} data-testid="text-variance">
                      {claim.variance > 0 ? "+" : ""}{claim.variance}%
                    </p>
                    {claim.variance > 10 && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Discrepancy Reason</p>
                <p className={`text-sm p-3 rounded-lg ${claim.variance > 10 ? "bg-amber-500/10 text-amber-700" : "bg-green-500/10 text-green-700"}`} data-testid="text-discrepancy-reason">
                  {claim.varianceReason}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Stethoscope className="w-5 h-5 text-primary" />
                Clinical Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Primary Diagnosis</p>
                <p className="font-medium" data-testid="text-primary-diagnosis">
                  <span className="text-primary">{claim.primaryDiagnosis.code}</span> - {claim.primaryDiagnosis.description}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Secondary Diagnoses</p>
                <div className="space-y-1">
                  {claim.secondaryDiagnoses.map((d) => (
                    <p key={d.code} className="text-sm" data-testid={`text-secondary-diagnosis-${d.code}`}>
                      <span className="text-muted-foreground">{d.code}</span> - {d.description}
                    </p>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Procedure</p>
                <p className="font-medium" data-testid="text-procedure">
                  <span className="text-primary">{claim.procedure.code}</span> - {claim.procedure.description}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Length of Stay</p>
                  <p className="font-medium" data-testid="text-los">{claim.lengthOfStay} days</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">ICU Stay</p>
                  <p className="font-medium" data-testid="text-icu">{claim.hasIcu ? "Yes" : "No"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Surgery</p>
                  <p className="font-medium" data-testid="text-surgery">{claim.hasSurgery ? "Yes" : "No"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg">Code Validation</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" data-testid="button-view-code-details">
                View Code Details
              </Button>
              <Button variant="outline" size="sm" data-testid="button-report-mismatch">
                Report Mismatch
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {codeValidations.length === 0 ? (
              <EmptyState
                title="No validation data"
                description="Code validation data is not available"
                icon={<FileText className="h-12 w-12 text-muted-foreground" />}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service Code</TableHead>
                    <TableHead>Internal Code</TableHead>
                    <TableHead>Standard Code</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>Issue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codeValidations.map((validation) => (
                    <TableRow key={validation.serviceCode} data-testid={`row-code-${validation.serviceCode}`}>
                      <TableCell className="font-medium">{validation.serviceCode}</TableCell>
                      <TableCell>{validation.internalCode}</TableCell>
                      <TableCell>{validation.standardCode}</TableCell>
                      <TableCell>
                        {validation.match ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-amber-600" />
                        )}
                      </TableCell>
                      <TableCell>
                        {validation.issue ? (
                          <span className="text-amber-600 text-sm">{validation.issue}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Paperclip className="w-5 h-5 text-primary" />
                Claim Attachments
              </CardTitle>
              <Button variant="outline" size="sm" data-testid="button-download-all">
                <Download className="w-4 h-4 mr-2" />
                Download All
              </Button>
            </CardHeader>
            <CardContent>
              {attachments.length === 0 ? (
                <EmptyState
                  title="No attachments"
                  description="No documents have been attached to this claim"
                  icon={<Paperclip className="h-12 w-12 text-muted-foreground" />}
                />
              ) : (
                <div className="space-y-3">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover-elevate"
                      data-testid={`row-attachment-${attachment.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          {getFileIcon()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{attachment.name}</p>
                          <p className="text-xs text-muted-foreground">{attachment.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{formatDate(attachment.uploadDate)}</span>
                        <Button variant="ghost" size="icon" data-testid={`button-view-${attachment.id}`}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" data-testid={`button-download-${attachment.id}`}>
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="w-5 h-5 text-primary" />
                Claim History / Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditTrail.length === 0 ? (
                <EmptyState
                  title="No audit history"
                  description="No audit trail data available"
                  icon={<Clock className="h-12 w-12 text-muted-foreground" />}
                />
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                  <div className="space-y-4">
                    {auditTrail.map((entry, index) => (
                      <div key={index} className="relative pl-10" data-testid={`row-audit-entry-${index}`}>
                        <div className="absolute left-2.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                        <div>
                          <p className="text-xs text-muted-foreground">{formatDateTime(entry.timestamp)}</p>
                          <p className="text-sm font-medium">{entry.action}</p>
                          <p className="text-xs text-muted-foreground">By: {entry.user}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
