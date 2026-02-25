import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, FileText, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import type { PreAuthClaim } from "@shared/schema";

function PreAuthPendingClaimCard({ claim }: { claim: PreAuthClaim }) {
  return (
    <Link href={`/pre-auth/claims/${claim.id}`}>
      <Card className="hover-elevate cursor-pointer" data-testid={`pending-claim-card-${claim.id}`}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-mono text-sm font-medium">{claim.claimId}</span>
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
              Pending Review
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Member: {claim.memberId}</p>
            {claim.providerId && <p>Provider: {claim.providerId}</p>}
            {claim.specialty && <p>Specialty: {claim.specialty}</p>}
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {claim.totalAmount && (
              <p className="text-sm font-medium">
                ${Number(claim.totalAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            )}
            {claim.priority && (
              <Badge 
                variant={claim.priority === "HIGH" ? "destructive" : "outline"} 
                className="text-xs"
              >
                {claim.priority}
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-end">
            <Button variant="ghost" size="sm" className="gap-1" data-testid={`button-review-${claim.id}`}>
              Review
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function PreAuthPendingReview() {
  const { data: claims, isLoading } = useQuery<PreAuthClaim[]>({
    queryKey: ["/api/pre-auth/claims/pending"],
  });

  const pendingClaims = claims?.filter(c => c.status === "pending_review") || [];

  const highPriorityClaims = pendingClaims.filter(c => c.priority === "HIGH");
  const normalPriorityClaims = pendingClaims.filter(c => c.priority !== "HIGH");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" data-testid="page-title">
            <Clock className="w-7 h-7" />
            Pending Review
          </h1>
          <p className="text-muted-foreground">
            Pre-authorization requests awaiting adjudicator action
          </p>
        </div>
        {pendingClaims.length > 0 && (
          <Badge variant="secondary" className="text-sm">
            {pendingClaims.length} pending
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : pendingClaims.length > 0 ? (
        <div className="space-y-6">
          {highPriorityClaims.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">High Priority</h2>
                <Badge variant="destructive" className="text-xs">
                  {highPriorityClaims.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {highPriorityClaims.map((claim) => (
                  <PreAuthPendingClaimCard key={claim.id} claim={claim} />
                ))}
              </div>
            </div>
          )}

          {normalPriorityClaims.length > 0 && (
            <div className="space-y-4">
              {highPriorityClaims.length > 0 && (
                <h2 className="text-lg font-semibold">Normal Priority</h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {normalPriorityClaims.map((claim) => (
                  <PreAuthPendingClaimCard key={claim.id} claim={claim} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card data-testid="empty-state-pending">
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-medium mb-1">No requests pending review</h3>
            <p className="text-sm text-muted-foreground mb-4">
              All pre-authorization requests have been processed or are still being analyzed
            </p>
            <Button asChild variant="outline">
              <Link href="/pre-auth/claims">View All Requests</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {pendingClaims.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {pendingClaims.length} request{pendingClaims.length !== 1 ? "s" : ""} pending review
          </span>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/pre-auth/claims">View All Requests</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
