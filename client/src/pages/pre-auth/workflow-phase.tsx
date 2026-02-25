import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
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
  Clock,
  CheckCircle,
  AlertCircle,
  Activity
} from "lucide-react";
import type { PreAuthClaim } from "@shared/schema";

const phaseConfig: Record<string, {
  title: string;
  description: string;
  icon: typeof FileText;
  phaseNumber: number;
  statuses: string[];
  nextPhase?: string;
}> = {
  ingest: {
    title: "Ingest (Phase 1)",
    description: "Initial claim submission and validation. Claims are received and basic data validation is performed before processing.",
    icon: FileText,
    phaseNumber: 1,
    statuses: ["ingested"],
    nextPhase: "analysis",
  },
  analysis: {
    title: "Analysis (Phase 2)",
    description: "Multi-agent signal generation. AI agents analyze the claim across regulatory, coverage, clinical, historical, and disclosure dimensions.",
    icon: Brain,
    phaseNumber: 2,
    statuses: ["analyzing"],
    nextPhase: "aggregation",
  },
  aggregation: {
    title: "Aggregation (Phase 3)",
    description: "Signal combination and scoring. Individual agent signals are weighted and combined to form a comprehensive risk assessment.",
    icon: Scale,
    phaseNumber: 3,
    statuses: ["aggregated"],
    nextPhase: "recommendation",
  },
  recommendation: {
    title: "Recommendation (Phase 4)",
    description: "Final AI recommendation generation. The system produces an approval, rejection, or further review recommendation with confidence scores.",
    icon: TrendingUp,
    phaseNumber: 4,
    statuses: ["pending_review"],
    nextPhase: "adjudicator",
  },
  adjudicator: {
    title: "Adjudicator (Phase 5)",
    description: "Human review and decision. Trained adjudicators review AI recommendations and make final decisions on claims.",
    icon: Users,
    phaseNumber: 5,
    statuses: ["approved", "rejected", "request_info"],
    nextPhase: "rlhf",
  },
  rlhf: {
    title: "RLHF (Phase 6)",
    description: "Reinforcement Learning from Human Feedback. Adjudicator decisions are used to improve AI model performance.",
    icon: Activity,
    phaseNumber: 6,
    statuses: [],
    nextPhase: undefined,
  },
};

function getStatusBadge(status: string) {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    ingested: { variant: "secondary", label: "Ingested" },
    analyzing: { variant: "default", label: "Analyzing" },
    aggregated: { variant: "default", label: "Aggregated" },
    pending_review: { variant: "outline", label: "Pending Review" },
    approved: { variant: "default", label: "Approved" },
    rejected: { variant: "destructive", label: "Rejected" },
    request_info: { variant: "secondary", label: "Info Requested" },
  };
  
  const config = variants[status] || { variant: "secondary" as const, label: status };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export default function PreAuthWorkflowPhase() {
  const params = useParams<{ phase: string }>();
  const phase = params.phase || "ingest";
  
  const config = phaseConfig[phase];
  
  const { data: claims, isLoading } = useQuery<PreAuthClaim[]>({
    queryKey: ['/api/pre-auth/claims'],
  });

  if (!config) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Phase Not Found</h2>
            <p className="text-muted-foreground">The requested workflow phase does not exist.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const Icon = config.icon;
  const phaseClaims = claims?.filter(c => c.status && config.statuses.includes(c.status)) || [];

  return (
    <div className="p-6 space-y-6">
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
        {config.nextPhase && (
          <Link href={`/pre-auth/workflow/${config.nextPhase}`}>
            <Button variant="outline" data-testid="button-next-phase">
              Next Phase <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Claims in Phase</CardDescription>
            <CardTitle className="text-2xl" data-testid="text-claims-count">
              {isLoading ? <Skeleton className="h-8 w-16" /> : phaseClaims.length}
            </CardTitle>
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
              {config.phaseNumber <= 3 ? "< 1 min" : "2-5 min"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Claims in This Phase</CardTitle>
          <CardDescription>
            {phaseClaims.length} claim(s) currently at {config.title}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
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
                <Link key={claim.id} href={`/pre-auth/claims/${claim.id}`}>
                  <div 
                    className="flex items-center justify-between p-4 rounded-lg border hover-elevate cursor-pointer"
                    data-testid={`claim-row-${claim.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <FileText className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{claim.claimId}</p>
                        <p className="text-sm text-muted-foreground">
                          Member: {claim.memberId} | Provider: {claim.providerId || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {claim.status && getStatusBadge(claim.status)}
                      <span className="text-sm font-medium">
                        ${Number(claim.totalAmount || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
