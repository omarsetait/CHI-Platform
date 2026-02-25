import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
  Play,
  RefreshCw,
  Upload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import type { PreAuthClaim, PreAuthSignal, PreAuthDecision } from "@shared/schema";

type PreAuthRecommendation = "APPROVE" | "REJECT" | "PEND_REVIEW" | "REQUEST_INFO";
type PreAuthWorkflowPhase = 1 | 2 | 3 | 4 | 5 | 6;

function PreAuthStatusBadge({ status }: { status: string }) {
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
    <Badge className={statusColors[status] || statusColors.ingested} data-testid="claim-status-badge">
      {status.replace("_", " ")}
    </Badge>
  );
}

function PreAuthPhaseIndicator({ currentPhase }: { currentPhase: PreAuthWorkflowPhase }) {
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
              className={`w-8 h-0.5 ${
                p.phase < currentPhase ? "bg-green-500" : "bg-muted"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function PreAuthSignalCard({ signal }: { signal: PreAuthSignal }) {
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
    <Card className={`border-l-4 ${severityColors[signal.severity || "LOW"]}`} data-testid={`signal-card-${signal.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm">{signal.signalId}</span>
            {signal.riskFlag && (
              <Badge variant="destructive" className="text-xs">Risk Flag</Badge>
            )}
          </div>
          {signal.recommendation && (
            <div className="flex items-center gap-1">
              {recommendationIcons[signal.recommendation]}
              <span className="text-sm">{signal.recommendation}</span>
            </div>
          )}
        </div>
        {signal.rationale && (
          <p className="text-sm text-muted-foreground">{signal.rationale}</p>
        )}
        {signal.confidence && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Confidence:</span>
            <span className="text-xs font-medium">{(Number(signal.confidence) * 100).toFixed(1)}%</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PreAuthClaimDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: claim, isLoading: claimLoading, refetch: refetchClaim } = useQuery<PreAuthClaim>({
    queryKey: ["/api/pre-auth/claims", id],
    enabled: !!id,
  });

  const { data: signals, isLoading: signalsLoading, refetch: refetchSignals } = useQuery<PreAuthSignal[]>({
    queryKey: ["/api/pre-auth/claims", id, "signals"],
    enabled: !!id,
  });

  const { data: decisions, isLoading: decisionsLoading, refetch: refetchDecisions } = useQuery<PreAuthDecision[]>({
    queryKey: ["/api/pre-auth/claims", id, "decisions"],
    enabled: !!id,
  });

  const processMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/pre-auth/claims/${id}/process`),
    onSuccess: () => {
      refetchClaim();
      refetchSignals();
      refetchDecisions();
      toast({
        title: "Processing started",
        description: "The pre-auth request is being analyzed by cognitive agents",
      });
    },
    onError: () => {
      toast({
        title: "Processing failed",
        description: "There was an error processing the pre-auth request",
        variant: "destructive",
      });
    },
  });

  const actionMutation = useMutation({
    mutationFn: (data: {
      action: "accept" | "override";
      finalVerdict: PreAuthRecommendation;
      overrideReason?: string;
      overrideCategory?: string;
    }) => apiRequest("POST", `/api/pre-auth/claims/${id}/action`, data),
    onSuccess: () => {
      refetchClaim();
      queryClient.invalidateQueries({ queryKey: ["/api/pre-auth/claims"] });
      toast({
        title: "Action submitted",
        description: "The pre-auth request has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Action failed",
        description: "There was an error submitting your action",
        variant: "destructive",
      });
    },
  });

  if (claimLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!claim) {
    return (
      <div className="p-6">
        <Card data-testid="not-found-state">
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-medium mb-1">Pre-auth request not found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The pre-authorization request you're looking for doesn't exist
            </p>
            <Button asChild>
              <Link href="/pre-auth/claims">Back to Claims</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const latestDecision = decisions && decisions.length > 0 ? decisions[decisions.length - 1] : null;
  const formattedDate = claim.createdAt 
    ? format(new Date(claim.createdAt), "MMMM d, yyyy 'at' HH:mm")
    : "N/A";

  const signalsByLayer = {
    layer1: signals?.filter(s => s.detector === "regulatory_compliance") || [],
    layer2: signals?.filter(s => s.detector === "coverage_eligibility") || [],
    layer3: signals?.filter(s => s.detector === "clinical_necessity") || [],
    layer4: signals?.filter(s => s.detector === "past_patterns") || [],
    layer5: signals?.filter(s => s.detector === "disclosure_check") || [],
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="ghost" size="icon" asChild data-testid="button-back">
              <Link href="/pre-auth/claims">
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold font-mono" data-testid="claim-id">
                  {claim.claimId}
                </h1>
                <PreAuthStatusBadge status={claim.status || "ingested"} />
              </div>
              <p className="text-muted-foreground">
                Submitted {formattedDate}
              </p>
            </div>
          </div>
          <PreAuthPhaseIndicator currentPhase={(claim.processingPhase || 1) as PreAuthWorkflowPhase} />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            variant="outline" 
            onClick={() => {
              refetchClaim();
              refetchSignals();
              refetchDecisions();
            }}
            data-testid="button-refresh"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {claim.status === "ingested" && (
            <Button 
              onClick={() => processMutation.mutate()}
              disabled={processMutation.isPending}
              data-testid="button-process"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Processing
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview" className="gap-2" data-testid="tab-overview">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-2" data-testid="tab-documents">
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Docs</span>
              </TabsTrigger>
              <TabsTrigger value="signals" className="gap-2" data-testid="tab-signals">
                <Brain className="w-4 h-4" />
                <span className="hidden sm:inline">Signals</span>
              </TabsTrigger>
              <TabsTrigger value="decision" className="gap-2" data-testid="tab-decision">
                <Scale className="w-4 h-4" />
                <span className="hidden sm:inline">Decision</span>
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-2" data-testid="tab-audit">
                <Activity className="w-4 h-4" />
                <span className="hidden sm:inline">Audit</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Member Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Member ID</p>
                    <p className="font-mono text-sm">{claim.memberId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date of Birth</p>
                    <p className="text-sm">{claim.memberDob || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Gender</p>
                    <p className="text-sm">{claim.memberGender || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Policy Plan</p>
                    <p className="text-sm">{claim.policyPlanId || "N/A"}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Provider & Encounter
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Provider ID</p>
                    <p className="font-mono text-sm">{claim.providerId || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Specialty</p>
                    <p className="text-sm">{claim.specialty || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Network Status</p>
                    <Badge variant={claim.networkStatus === "InNetwork" ? "secondary" : "outline"}>
                      {claim.networkStatus || "N/A"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Encounter Type</p>
                    <p className="text-sm">{claim.encounterType || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payer</p>
                    <p className="text-sm">{claim.payerId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Amount</p>
                    <p className="text-sm font-medium">
                      ${Number(claim.totalAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Stethoscope className="w-5 h-5" />
                    Clinical Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Diagnoses</p>
                    <div className="space-y-2">
                      {claim.diagnoses && claim.diagnoses.length > 0 ? (
                        claim.diagnoses.map((dx, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                            <Badge variant="outline" className="font-mono shrink-0">
                              {dx.code}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {dx.desc || "No description available"}
                            </span>
                          </div>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">No diagnoses recorded</span>
                      )}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Line Items</p>
                    {claim.lineItems && claim.lineItems.length > 0 ? (
                      <div className="space-y-2">
                        {claim.lineItems.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-md bg-muted/50 gap-2 flex-wrap">
                            <div className="flex items-center gap-3 flex-wrap">
                              <Badge variant="outline" className="font-mono">{item.code}</Badge>
                              <span className="text-sm">{item.desc}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-muted-foreground">x{item.units}</span>
                              <span className="text-sm font-medium">${item.net_amount?.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No line items recorded</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Clinical Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {claim.clinicalDocuments && claim.clinicalDocuments.length > 0 ? (
                    <div className="space-y-3">
                      {claim.clinicalDocuments.map((doc, idx) => (
                        <div key={idx} className="p-3 rounded-md bg-muted/50 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{doc.fileName || doc.doc_id}</span>
                            <Badge variant="outline" className="text-xs">{doc.type}</Badge>
                          </div>
                          {doc.confidence && (
                            <span className="text-xs text-muted-foreground">
                              Confidence: {(doc.confidence * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">No documents uploaded</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signals" className="mt-6 space-y-6">
              {signalsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-6 space-y-3">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : signals && signals.length > 0 ? (
                <>
                  {signalsByLayer.layer1.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-medium text-sm flex items-center gap-2">
                        <Badge variant="outline">Layer 1</Badge>
                        Regulatory & Compliance
                      </h3>
                      {signalsByLayer.layer1.map((signal) => (
                        <PreAuthSignalCard key={signal.id} signal={signal} />
                      ))}
                    </div>
                  )}
                  {signalsByLayer.layer2.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-medium text-sm flex items-center gap-2">
                        <Badge variant="outline">Layer 2</Badge>
                        Coverage & Eligibility
                      </h3>
                      {signalsByLayer.layer2.map((signal) => (
                        <PreAuthSignalCard key={signal.id} signal={signal} />
                      ))}
                    </div>
                  )}
                  {signalsByLayer.layer3.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-medium text-sm flex items-center gap-2">
                        <Badge variant="outline">Layer 3</Badge>
                        Clinical Necessity
                      </h3>
                      {signalsByLayer.layer3.map((signal) => (
                        <PreAuthSignalCard key={signal.id} signal={signal} />
                      ))}
                    </div>
                  )}
                  {signalsByLayer.layer4.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-medium text-sm flex items-center gap-2">
                        <Badge variant="outline">Layer 4</Badge>
                        Past Visits & Patterns
                      </h3>
                      {signalsByLayer.layer4.map((signal) => (
                        <PreAuthSignalCard key={signal.id} signal={signal} />
                      ))}
                    </div>
                  )}
                  {signalsByLayer.layer5.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-medium text-sm flex items-center gap-2">
                        <Badge variant="outline">Layer 5</Badge>
                        Disclosure Checker
                      </h3>
                      {signalsByLayer.layer5.map((signal) => (
                        <PreAuthSignalCard key={signal.id} signal={signal} />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Card data-testid="empty-state-signals">
                  <CardContent className="p-12 text-center">
                    <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="font-medium mb-1">No signals yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Start processing to generate AI signals
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="decision" className="mt-6 space-y-6">
              {decisionsLoading ? (
                <Card>
                  <CardContent className="p-6 space-y-3">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ) : latestDecision ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Scale className="w-5 h-5" />
                      Latest Decision
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <p className="text-xs text-muted-foreground">Top Recommendation</p>
                        <Badge className="mt-1">
                          {latestDecision.topRecommendation || "Pending"}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Risk Level</p>
                        <Badge variant="outline" className="mt-1">
                          {latestDecision.riskLevel || "N/A"}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Aggregated Score</p>
                        <p className="text-sm font-medium mt-1">
                          {latestDecision.aggregatedScore 
                            ? (Number(latestDecision.aggregatedScore) * 100).toFixed(1) + "%" 
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                    {latestDecision.hasHardStop && (
                      <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-800 dark:text-red-200 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Hard stop detected - manual review required
                        </p>
                      </div>
                    )}
                    {latestDecision.candidates && latestDecision.candidates.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">Recommendation Candidates</p>
                        {latestDecision.candidates.map((candidate, idx) => (
                          <div key={idx} className="p-2 rounded-md bg-muted/50 flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">#{candidate.rank}</span>
                              <Badge variant="outline">{candidate.recommendation}</Badge>
                            </div>
                            <span className="text-xs">{(candidate.score * 100).toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card data-testid="empty-state-decision">
                  <CardContent className="p-12 text-center">
                    <Scale className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="font-medium mb-1">No decision yet</h3>
                    <p className="text-sm text-muted-foreground">
                      Process the claim to generate a decision
                    </p>
                  </CardContent>
                </Card>
              )}

              {claim.status === "pending_review" && latestDecision && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Adjudicator Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Review the AI recommendation and take action on this pre-authorization request.
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        onClick={() => actionMutation.mutate({
                          action: "accept",
                          finalVerdict: latestDecision.topRecommendation || "APPROVE",
                        })}
                        disabled={actionMutation.isPending}
                        data-testid="button-accept-recommendation"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Accept Recommendation
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => actionMutation.mutate({
                          action: "override",
                          finalVerdict: "APPROVE",
                          overrideReason: "Manual approval",
                        })}
                        disabled={actionMutation.isPending}
                        data-testid="button-override-approve"
                      >
                        Override: Approve
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => actionMutation.mutate({
                          action: "override",
                          finalVerdict: "REJECT",
                          overrideReason: "Manual rejection",
                        })}
                        disabled={actionMutation.isPending}
                        data-testid="button-override-reject"
                      >
                        Override: Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="audit" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Audit Trail
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 rounded-md bg-muted/50 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-sm">Request Created</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formattedDate}</span>
                    </div>
                    {claim.processingPhase && claim.processingPhase > 1 && (
                      <div className="p-3 rounded-md bg-muted/50 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-sm">Processing Started</span>
                        </div>
                        <span className="text-xs text-muted-foreground">Phase {claim.processingPhase}</span>
                      </div>
                    )}
                    {decisions && decisions.length > 0 && (
                      <div className="p-3 rounded-md bg-muted/50 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500" />
                          <span className="text-sm">Decision Generated</span>
                        </div>
                        <Badge variant="outline">{latestDecision?.topRecommendation}</Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <PreAuthStatusBadge status={claim.status || "ingested"} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Priority</span>
                <Badge variant="outline">{claim.priority || "NORMAL"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Amount</span>
                <span className="text-sm font-medium">
                  ${Number(claim.totalAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Signals</span>
                <span className="text-sm font-medium">{signals?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Risk Flags</span>
                <span className="text-sm font-medium">
                  {signals?.filter(s => s.riskFlag).length || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
