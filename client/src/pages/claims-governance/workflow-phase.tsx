import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  Brain, 
  Scale, 
  TrendingUp, 
  Users, 
  ArrowRight,
  ArrowLeft,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity
} from "lucide-react";

interface DemoClaim {
  id: string;
  claimId: string;
  providerId: string;
  providerName: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  serviceDate: string;
  submissionDate: string;
  claimAmount: string;
  approvedAmount: string;
  status: string;
  claimType: string;
  diagnosisCodes: string[];
  procedureCodes: string[];
  flags: string[];
  ruleViolations: string[];
  adjudicationPhase: number;
  aiConfidence: number;
  notes: string;
}

interface ClaimInPhase {
  id: string;
  claimId: string;
  memberId: string;
  providerId: string;
  totalAmount: number;
  status: string;
}

interface PhaseConfig {
  title: string;
  description: string;
  icon: typeof FileText;
  phaseNumber: number;
  statuses: string[];
  nextPhase?: string;
  prevPhase?: string;
}

const phaseConfigMap: Record<string, PhaseConfig> = {
  "1": {
    title: "Ingest (Phase 1)",
    description: "Claim intake and validation. Claims are received and basic data validation is performed before processing begins.",
    icon: FileText,
    phaseNumber: 1,
    statuses: ["ingested"],
    nextPhase: "2",
  },
  "2": {
    title: "Analysis (Phase 2)",
    description: "AI agent analysis. Multiple specialized agents analyze the claim across regulatory, coverage, clinical, historical, and disclosure dimensions.",
    icon: Brain,
    phaseNumber: 2,
    statuses: ["analyzing"],
    nextPhase: "3",
    prevPhase: "1",
  },
  "3": {
    title: "Aggregation (Phase 3)",
    description: "Signal aggregation. Individual agent signals are weighted and combined to form a comprehensive risk assessment score.",
    icon: Scale,
    phaseNumber: 3,
    statuses: ["aggregated", "flagged"],
    nextPhase: "4",
    prevPhase: "2",
  },
  "4": {
    title: "Recommendation (Phase 4)",
    description: "Decision recommendation. The system produces an approval, rejection, or further review recommendation with confidence scores.",
    icon: TrendingUp,
    phaseNumber: 4,
    statuses: ["pending", "under_review"],
    nextPhase: "5",
    prevPhase: "3",
  },
  "5": {
    title: "Adjudicator (Phase 5)",
    description: "Human review. Trained adjudicators review AI recommendations and make final decisions on claims requiring manual intervention.",
    icon: Users,
    phaseNumber: 5,
    statuses: ["approved", "denied"],
    nextPhase: "6",
    prevPhase: "4",
  },
  "6": {
    title: "RLHF (Phase 6)",
    description: "Feedback collection. Reinforcement Learning from Human Feedback. Adjudicator decisions are used to improve AI model performance over time.",
    icon: Activity,
    phaseNumber: 6,
    statuses: ["feedback_collected"],
    prevPhase: "5",
  },
};

function mapDemoClaimToPhase(c: DemoClaim): ClaimInPhase {
  let mappedStatus = c.status;
  if (c.adjudicationPhase === 1) mappedStatus = "ingested";
  else if (c.adjudicationPhase === 2) mappedStatus = "analyzing";
  else if (c.adjudicationPhase === 3) mappedStatus = c.flags.length > 0 ? "flagged" : "aggregated";
  else if (c.adjudicationPhase === 4) mappedStatus = "pending_review";
  else if (c.adjudicationPhase === 5) mappedStatus = c.status;
  else if (c.adjudicationPhase === 6) mappedStatus = "feedback_collected";
  
  return {
    id: c.id,
    claimId: c.claimId,
    memberId: c.patientId,
    providerId: c.providerId,
    totalAmount: parseFloat(c.claimAmount),
    status: mappedStatus,
  };
}

function getClaimsForPhase(claims: DemoClaim[], phaseNumber: number): ClaimInPhase[] {
  return claims
    .filter(c => c.adjudicationPhase === phaseNumber)
    .map(mapDemoClaimToPhase);
}

function getStatusBadge(status: string) {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    ingested: { variant: "secondary", label: "Ingested" },
    analyzing: { variant: "default", label: "Analyzing" },
    aggregated: { variant: "default", label: "Aggregated" },
    flagged: { variant: "destructive", label: "Flagged" },
    pending: { variant: "outline", label: "Pending" },
    pending_review: { variant: "outline", label: "Pending Review" },
    under_review: { variant: "outline", label: "Under Review" },
    approved: { variant: "default", label: "Approved" },
    denied: { variant: "destructive", label: "Denied" },
    rejected: { variant: "destructive", label: "Rejected" },
    request_info: { variant: "secondary", label: "Info Requested" },
    feedback_collected: { variant: "secondary", label: "Feedback Collected" },
  };
  
  const config = variants[status] || { variant: "secondary" as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function ClaimRowSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border">
      <div className="flex items-center gap-4">
        <Skeleton className="w-5 h-5" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

export default function ClaimsGovernanceWorkflowPhase() {
  const params = useParams<{ phase: string }>();
  const phase = params.phase || "1";
  
  const { data: demoClaims, isLoading } = useQuery<DemoClaim[]>({
    queryKey: ["/api/demo/claims"],
  });
  
  const config = phaseConfigMap[phase];
  
  if (!config) {
    return (
      <div className="p-6" data-testid="page-workflow-phase-not-found">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Phase Not Found</h2>
            <p className="text-muted-foreground">The requested workflow phase does not exist.</p>
            <Button asChild className="mt-4">
              <Link href="/claims-governance/workflow/1">Go to Phase 1</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const Icon = config.icon;
  const allClaims = demoClaims || [];
  const phaseClaims = getClaimsForPhase(allClaims, config.phaseNumber);
  
  const phaseClaimCounts = Object.entries(phaseConfigMap).map(([key, cfg]) => ({
    phase: key,
    count: getClaimsForPhase(allClaims, cfg.phaseNumber).length,
    icon: cfg.icon,
  }));

  return (
    <div className="p-6 space-y-6" data-testid={`page-workflow-phase-${phase}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-phase-title">{config.title}</h1>
            <p className="text-muted-foreground mt-1">{config.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {config.prevPhase && (
            <Link href={`/claims-governance/workflow/${config.prevPhase}`}>
              <Button variant="outline" data-testid="button-prev-phase">
                <ArrowLeft className="mr-2 w-4 h-4" /> Previous
              </Button>
            </Link>
          )}
          {config.nextPhase && (
            <Link href={`/claims-governance/workflow/${config.nextPhase}`}>
              <Button variant="outline" data-testid="button-next-phase">
                Next <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Claims in Phase</CardDescription>
            {isLoading ? (
              <Skeleton className="h-8 w-10" />
            ) : (
              <CardTitle className="text-2xl" data-testid="text-claims-count">
                {phaseClaims.length}
              </CardTitle>
            )}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Phase Status</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Active
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg. Processing Time</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
              {config.phaseNumber <= 3 ? "< 1 min" : config.phaseNumber === 6 ? "Async" : "2-5 min"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Claims in This Phase</CardTitle>
          <CardDescription>
            {isLoading ? "Loading..." : `${phaseClaims.length} claim(s) currently at ${config.title}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <ClaimRowSkeleton key={i} />
              ))}
            </div>
          ) : phaseClaims.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p data-testid="text-empty-phase">No claims currently in this phase</p>
            </div>
          ) : (
            <div className="space-y-3">
              {phaseClaims.map(claim => (
                <Link key={claim.id} href={`/claims-governance/claims/${claim.id}`}>
                  <div 
                    className="flex items-center justify-between p-4 rounded-lg border hover-elevate cursor-pointer"
                    data-testid={`claim-row-${claim.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{claim.claimId}</p>
                        <p className="text-sm text-muted-foreground">
                          Member: {claim.memberId} | Provider: {claim.providerId}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(claim.status)}
                      <span className="text-sm font-medium">
                        ${claim.totalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workflow Overview</CardTitle>
          <CardDescription>Navigate between phases</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2">
            {phaseClaimCounts.map(({ phase: key, count, icon: PhaseIcon }) => (
              <Link key={key} href={`/claims-governance/workflow/${key}`}>
                <div 
                  className={`flex flex-col items-center p-3 rounded-lg min-w-[100px] cursor-pointer ${
                    key === phase ? "bg-primary/10 border-2 border-primary" : "hover-elevate border"
                  }`}
                  data-testid={`phase-nav-${key}`}
                >
                  <PhaseIcon className={`w-5 h-5 ${key === phase ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-xs mt-1 font-medium ${key === phase ? "text-primary" : ""}`}>
                    Phase {key}
                  </span>
                  {isLoading ? (
                    <Skeleton className="h-3 w-12 mt-1" />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {count} claims
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
