import { useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  ArrowLeft,
  User,
  Building2,
  DollarSign,
  FileText,
  Stethoscope,
  Brain,
  Scale,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";

type WorkflowPhase = 1 | 2 | 3 | 4 | 5 | 6;

interface Signal {
  id: string;
  signalId: string;
  agentType: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  recommendation: "APPROVE" | "REJECT" | "PEND_REVIEW" | "REQUEST_INFO";
  rationale: string;
  confidence: number;
  riskFlag: boolean;
}

interface ClaimDetail {
  id: string;
  claimId: string;
  memberId: string;
  memberName: string;
  providerId: string;
  providerName: string;
  status: string;
  riskLevel: string;
  totalAmount: number;
  submittedAt: string;
  specialty?: string;
  diagnosisCodes?: string[];
  procedureCodes?: string[];
  currentPhase?: WorkflowPhase;
  aiConfidence?: number;
  aiRecommendation?: string;
  signals?: Signal[];
}

function generateSignalsFromClaim(claim: ClaimDetail): Signal[] {
  const signals: Signal[] = [];
  
  signals.push({
    id: "1",
    signalId: `SIG-REG-${claim.id.slice(0, 3)}`,
    agentType: "Regulatory",
    severity: "LOW",
    recommendation: "APPROVE",
    rationale: "All regulatory requirements met. Claim complies with payer guidelines.",
    confidence: 0.95,
    riskFlag: false,
  });
  
  if (claim.riskLevel === "high") {
    signals.push({
      id: "2",
      signalId: `SIG-CLI-${claim.id.slice(0, 3)}`,
      agentType: "Clinical",
      severity: "HIGH",
      recommendation: "PEND_REVIEW",
      rationale: "Procedure combination requires medical necessity review. Potential over-utilization pattern detected.",
      confidence: 0.82,
      riskFlag: true,
    });
    
    signals.push({
      id: "4",
      signalId: `SIG-HIS-${claim.id.slice(0, 3)}`,
      agentType: "Historical",
      severity: "HIGH",
      recommendation: "PEND_REVIEW",
      rationale: "Provider billing pattern anomaly detected. Increase in similar procedures this quarter.",
      confidence: 0.91,
      riskFlag: true,
    });
  }
  
  if (claim.riskLevel === "medium" || claim.riskLevel === "high") {
    signals.push({
      id: "3",
      signalId: `SIG-COV-${claim.id.slice(0, 3)}`,
      agentType: "Coverage",
      severity: "MEDIUM",
      recommendation: "REQUEST_INFO",
      rationale: "Prior authorization status unclear. Additional documentation may be required.",
      confidence: 0.88,
      riskFlag: false,
    });
  }
  
  if (claim.riskLevel === "low") {
    signals.push({
      id: "5",
      signalId: `SIG-FIN-${claim.id.slice(0, 3)}`,
      agentType: "Financial",
      severity: "LOW",
      recommendation: "APPROVE",
      rationale: "Claim amount within expected range for this procedure type.",
      confidence: 0.94,
      riskFlag: false,
    });
  }
  
  return signals;
}

function StatusBadge({ status }: { status: string }) {
  const statusColors: Record<string, string> = {
    pending_review: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    analyzing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    auto_approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    flagged: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <Badge className={statusColors[status] || "bg-gray-100 text-gray-800"} data-testid="claim-status-badge">
      {status.replace("_", " ")}
    </Badge>
  );
}

function PhaseIndicator({ currentPhase }: { currentPhase: WorkflowPhase }) {
  const phases = [
    { phase: 1, label: "Ingest" },
    { phase: 2, label: "Analysis" },
    { phase: 3, label: "Aggregation" },
    { phase: 4, label: "Recommendation" },
    { phase: 5, label: "Adjudicator" },
    { phase: 6, label: "RLHF" },
  ];

  return (
    <div className="flex items-center gap-1" data-testid="phase-indicator">
      {phases.map((p, idx) => (
        <div key={p.phase} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
              p.phase < currentPhase
                ? "bg-green-500 text-white"
                : p.phase === currentPhase
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {p.phase < currentPhase ? <CheckCircle className="w-4 h-4" /> : p.phase}
          </div>
          {idx < phases.length - 1 && (
            <div
              className={`w-6 h-0.5 ${
                p.phase < currentPhase ? "bg-green-500" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function SignalCard({ signal }: { signal: Signal }) {
  const severityColors: Record<string, string> = {
    HIGH: "border-red-500 bg-red-50 dark:bg-red-950/20",
    MEDIUM: "border-amber-500 bg-amber-50 dark:bg-amber-950/20",
    LOW: "border-green-500 bg-green-50 dark:bg-green-950/20",
  };

  const recommendationIcons: Record<string, React.ReactNode> = {
    APPROVE: <CheckCircle className="w-4 h-4 text-green-600" />,
    REJECT: <XCircle className="w-4 h-4 text-red-600" />,
    PEND_REVIEW: <Clock className="w-4 h-4 text-amber-600" />,
    REQUEST_INFO: <AlertTriangle className="w-4 h-4 text-orange-600" />,
  };

  return (
    <Card className={`border-l-4 ${severityColors[signal.severity]}`} data-testid={`signal-card-${signal.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge variant="outline">{signal.agentType}</Badge>
            <span className="font-mono text-sm">{signal.signalId}</span>
            {signal.riskFlag && (
              <Badge variant="destructive" className="text-xs">Risk Flag</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {recommendationIcons[signal.recommendation]}
            <span className="text-sm">{signal.recommendation.replace("_", " ")}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{signal.rationale}</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Confidence:</span>
          <span className="text-xs font-medium">{(signal.confidence * 100).toFixed(1)}%</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ClaimDetailSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-8 rounded-full" />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-12" />
              </div>
              <div className="text-right space-y-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Skeleton className="h-10 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdjudicationClaimDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [localStatus, setLocalStatus] = useState<string | null>(null);

  const { data: claim, isLoading, error } = useQuery<ClaimDetail>({
    queryKey: ["/api/demo/claims", id],
  });

  const decisionMutation = useMutation({
    mutationFn: async (decision: "approve" | "reject" | "request_info") => {
      const actionMap = {
        approve: "APPROVE",
        reject: "REJECT",
        request_info: "REQUEST_INFO",
      };
      
      await apiRequest("POST", "/api/claims/actions", {
        claimId: id,
        humanAction: actionMap[decision],
        wasAccepted: true,
        phase: "5",
        reviewerNotes: decisionNotes,
      });
      
      return decision;
    },
    onSuccess: (decision) => {
      const statusMap = {
        approve: "approved",
        reject: "rejected",
        request_info: "pending_review",
      };
      setLocalStatus(statusMap[decision]);
      
      toast({
        title: decision === "approve" ? "Claim Approved" : decision === "reject" ? "Claim Rejected" : "Information Requested",
        description: `Claim ${claim?.claimId} has been ${decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "marked for additional information"}.`,
      });
    },
    onError: () => {
      toast({
        title: "Action Failed",
        description: "Failed to process the decision. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <ClaimDetailSkeleton />;
  }

  if (error || !claim) {
    return (
      <div className="p-6 space-y-6" data-testid="page-claim-detail">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild data-testid="button-back">
            <Link href="/claims-governance/adjudication/claims">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Claim Not Found</h1>
          </div>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">The requested claim could not be found.</p>
            <Button asChild className="mt-4">
              <Link href="/claims-governance/adjudication/claims">Back to Claims Queue</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPhase = claim.currentPhase || 5;
  const aiConfidence = claim.aiConfidence || 0.78;
  const aiRecommendation = claim.aiRecommendation || "PEND_REVIEW";
  const diagnosisCodes = claim.diagnosisCodes || ["I25.10", "I10"];
  const procedureCodes = claim.procedureCodes || ["99213"];
  const signals = claim.signals || generateSignalsFromClaim(claim);
  const displayStatus = localStatus || claim.status;

  return (
    <div className="p-6 space-y-6" data-testid="page-claim-detail">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild data-testid="button-back">
          <Link href="/claims-governance/adjudication/claims">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold" data-testid="text-claim-id">{claim.claimId}</h1>
            <StatusBadge status={displayStatus} />
          </div>
          <p className="text-muted-foreground mt-1">
            Submitted {new Date(claim.submittedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Workflow Phase:</span>
              <PhaseIndicator currentPhase={currentPhase} />
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">AI Confidence</p>
                <p className="text-lg font-semibold">{(aiConfidence * 100).toFixed(0)}%</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Recommendation</p>
                <Badge variant="outline">{aiRecommendation.replace("_", " ")}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="signals">AI Signals ({signals.length})</TabsTrigger>
          <TabsTrigger value="decision">Decision Panel</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="w-4 h-4" />
                  Member Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Member ID</span>
                  <span className="text-sm font-medium">{claim.memberId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Name</span>
                  <span className="text-sm font-medium">{claim.memberName || `Member ${claim.memberId}`}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="w-4 h-4" />
                  Provider Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Provider ID</span>
                  <span className="text-sm font-medium">{claim.providerId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Name</span>
                  <span className="text-sm font-medium">{claim.providerName || `Provider ${claim.providerId}`}</span>
                </div>
                {claim.specialty && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Specialty</span>
                    <span className="text-sm font-medium">{claim.specialty}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Stethoscope className="w-4 h-4" />
                  Clinical Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="text-sm text-muted-foreground">Diagnosis Codes</span>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {diagnosisCodes.map(code => (
                      <Badge key={code} variant="secondary">{code}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Procedure Codes</span>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {procedureCodes.map(code => (
                      <Badge key={code} variant="secondary">{code}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="w-4 h-4" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Amount</span>
                  <span className="text-lg font-bold">
                    ${claim.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Risk Level</span>
                  <Badge variant={claim.riskLevel === "high" ? "destructive" : "secondary"}>
                    {claim.riskLevel.toUpperCase()}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="signals" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Analysis Signals
              </CardTitle>
              <CardDescription>
                Signals generated by AI agents during claim analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {signals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No AI signals available for this claim</p>
                </div>
              ) : (
                signals.map(signal => (
                  <SignalCard key={signal.id} signal={signal} />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decision" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5" />
                Adjudicator Decision Panel
              </CardTitle>
              <CardDescription>
                Review AI recommendations and make final decision
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg bg-muted">
                <h4 className="font-medium mb-2">AI Recommendation Summary</h4>
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <span className="text-sm text-muted-foreground">Recommendation:</span>
                    <Badge className="ml-2">{aiRecommendation.replace("_", " ")}</Badge>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Confidence:</span>
                    <span className="ml-2 font-medium">{(aiConfidence * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Risk Flags:</span>
                    <span className="ml-2 font-medium text-red-600">
                      {signals.filter(s => s.riskFlag).length}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Decision Notes</label>
                <Textarea
                  placeholder="Enter notes for this decision..."
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  className="min-h-[100px]"
                  data-testid="textarea-decision-notes"
                />
              </div>

              <Separator />

              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => decisionMutation.mutate("approve")}
                  disabled={decisionMutation.isPending || displayStatus === "approved" || displayStatus === "rejected"}
                  data-testid="button-approve"
                >
                  {decisionMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  Approve Claim
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => decisionMutation.mutate("reject")}
                  disabled={decisionMutation.isPending || displayStatus === "approved" || displayStatus === "rejected"}
                  data-testid="button-reject"
                >
                  {decisionMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  Reject Claim
                </Button>
                <Button
                  variant="outline"
                  onClick={() => decisionMutation.mutate("request_info")}
                  disabled={decisionMutation.isPending || displayStatus === "approved" || displayStatus === "rejected"}
                  data-testid="button-request-info"
                >
                  {decisionMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <MessageSquare className="w-4 h-4 mr-2" />
                  )}
                  Request Information
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
