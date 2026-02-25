import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Clock,
  AlertTriangle,
  User,
  Building2,
  ArrowRight,
  RefreshCw,
  FileText,
} from "lucide-react";
import { Link } from "wouter";

interface PendingClaim {
  id: string;
  claimId: string;
  memberId: string;
  memberName: string;
  providerId: string;
  providerName: string;
  riskLevel: string;
  totalAmount: number;
  submittedAt: string;
  aiConfidence: number;
  aiRecommendation: string;
  waitingTime: string;
  riskFlags: number;
}

interface DemoClaim {
  id: string;
  claimId: string;
  memberId: string;
  memberName?: string;
  providerId: string;
  providerName?: string;
  status: string;
  riskLevel: string;
  totalAmount: number;
  submittedAt: string;
  aiConfidence?: number;
  aiRecommendation?: string;
  riskFlags?: number;
}

function calculateWaitingTime(submittedAt: string): string {
  const submitted = new Date(submittedAt);
  const now = new Date();
  const diffMs = now.getTime() - submitted.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m`;
  }
  return `${diffMinutes}m`;
}

function transformToPendingClaim(claim: DemoClaim): PendingClaim {
  return {
    id: claim.id,
    claimId: claim.claimId,
    memberId: claim.memberId,
    memberName: claim.memberName || `Member ${claim.memberId}`,
    providerId: claim.providerId,
    providerName: claim.providerName || `Provider ${claim.providerId}`,
    riskLevel: claim.riskLevel,
    totalAmount: claim.totalAmount,
    submittedAt: claim.submittedAt,
    aiConfidence: claim.aiConfidence || 0.75,
    aiRecommendation: claim.aiRecommendation || "PEND_REVIEW",
    waitingTime: calculateWaitingTime(claim.submittedAt),
    riskFlags: claim.riskFlags || (claim.riskLevel === "high" ? 2 : claim.riskLevel === "medium" ? 1 : 0),
  };
}

function PendingClaimCardSkeleton() {
  return (
    <Card className="border-l-4 border-l-muted">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-20" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <div className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <div className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PendingClaimCard({ claim }: { claim: PendingClaim }) {
  const riskColors: Record<string, string> = {
    high: "border-l-red-500",
    medium: "border-l-amber-500",
    low: "border-l-green-500",
  };

  const riskBadgeColors: Record<string, string> = {
    high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    medium: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  };

  return (
    <Card 
      className={`border-l-4 ${riskColors[claim.riskLevel]} hover-elevate cursor-pointer`}
      data-testid={`pending-claim-${claim.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-mono text-sm font-medium">{claim.claimId}</span>
              <Badge className={riskBadgeColors[claim.riskLevel]}>
                {claim.riskLevel.toUpperCase()} RISK
              </Badge>
              {claim.riskFlags > 0 && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {claim.riskFlags} Flags
                </Badge>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Member</p>
                  <p className="font-medium">{claim.memberName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-muted-foreground">Provider</p>
                  <p className="font-medium">{claim.providerName}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm flex-wrap">
              <div>
                <span className="text-muted-foreground">Amount: </span>
                <span className="font-bold">
                  ${claim.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">AI Confidence: </span>
                <span className="font-medium">{(claim.aiConfidence * 100).toFixed(0)}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Recommendation: </span>
                <Badge variant="outline">{claim.aiRecommendation.replace("_", " ")}</Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-1 text-amber-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Waiting {claim.waitingTime}</span>
            </div>
            <Button asChild size="sm" data-testid={`button-review-${claim.id}`}>
              <Link href={`/claims-governance/adjudication/claims/${claim.id}`}>
                Review
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-12" />
          </div>
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function PendingReview() {
  const { data: allClaims = [], isLoading, refetch } = useQuery<DemoClaim[]>({
    queryKey: ["/api/demo/claims"],
  });

  const pendingClaims = allClaims
    .filter(c => c.status === "pending_review" || c.status === "analyzing" || c.status === "flagged")
    .map(transformToPendingClaim)
    .sort((a, b) => {
      const timeA = new Date(a.submittedAt).getTime();
      const timeB = new Date(b.submittedAt).getTime();
      return timeA - timeB;
    });

  const highRiskCount = pendingClaims.filter(c => c.riskLevel === "high").length;
  
  const avgWaitTimeMinutes = pendingClaims.length > 0 
    ? pendingClaims.reduce((sum, c) => {
        const submitted = new Date(c.submittedAt);
        const now = new Date();
        return sum + (now.getTime() - submitted.getTime()) / (1000 * 60);
      }, 0) / pendingClaims.length
    : 0;
  
  const avgWaitHours = Math.floor(avgWaitTimeMinutes / 60);
  const avgWaitMins = Math.floor(avgWaitTimeMinutes % 60);
  const avgWaitTimeStr = avgWaitHours > 0 ? `${avgWaitHours}h ${avgWaitMins}m` : `${avgWaitMins}m`;

  return (
    <div className="p-6 space-y-6" data-testid="page-pending-review">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Pending Review</h1>
          <p className="text-muted-foreground">
            Claims awaiting adjudicator decision
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          disabled={isLoading}
          data-testid="button-refresh"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Pending</p>
                    <p className="text-2xl font-bold">{pendingClaims.length}</p>
                  </div>
                  <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">High Risk</p>
                    <p className="text-2xl font-bold text-red-600">
                      {highRiskCount}
                    </p>
                  </div>
                  <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Wait Time</p>
                    <p className="text-2xl font-bold">{avgWaitTimeStr}</p>
                  </div>
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Claims Awaiting Review</CardTitle>
          <CardDescription>
            Sorted by waiting time (longest first)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <>
              <PendingClaimCardSkeleton />
              <PendingClaimCardSkeleton />
              <PendingClaimCardSkeleton />
            </>
          ) : pendingClaims.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No claims pending review</p>
            </div>
          ) : (
            pendingClaims.map(claim => (
              <PendingClaimCard key={claim.id} claim={claim} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
