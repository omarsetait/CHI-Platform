import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PreAuthClaimStatusBadge } from "./claim-status-badge";
import { PreAuthRiskBadge } from "./risk-badge";
import { PreAuthPhaseIndicator } from "./phase-indicator";
import { 
  User, 
  Building2, 
  Calendar, 
  DollarSign,
  ChevronRight,
  AlertTriangle,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { format } from "date-fns";

type PreAuthClaimStatus = "ingested" | "analyzing" | "aggregated" | "pending_review" | "approved" | "rejected" | "request_info";
type PreAuthSeverity = "HIGH" | "MEDIUM" | "LOW";
type PreAuthWorkflowPhase = 1 | 2 | 3 | 4 | 5 | 6;

interface PreAuthClaimCardProps {
  claim: {
    id: string;
    claimId: string;
    memberId: string;
    providerId?: string | null;
    totalAmount?: string | number | null;
    status?: PreAuthClaimStatus | null;
    processingPhase?: number | null;
    createdAt?: Date | string | null;
    diagnoses?: Array<{
      code: string;
      desc: string;
    }> | null;
  };
  signalCount?: number;
  riskLevel?: PreAuthSeverity | null;
  riskFlags?: number;
  className?: string;
}

export function PreAuthClaimCard({ 
  claim, 
  signalCount = 0, 
  riskLevel,
  riskFlags = 0, 
  className 
}: PreAuthClaimCardProps) {
  const formattedDate = claim.createdAt 
    ? format(new Date(claim.createdAt), "MMM d, yyyy HH:mm")
    : "N/A";

  return (
    <Card 
      className={cn("hover-elevate transition-shadow", className)}
      data-testid={`preauth-claim-card-${claim.claimId}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span 
                className="font-mono text-sm font-semibold" 
                data-testid="preauth-claim-id"
              >
                {claim.claimId}
              </span>
              <PreAuthClaimStatusBadge status={claim.status || "ingested"} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Member: {claim.memberId}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {riskLevel && <PreAuthRiskBadge severity={riskLevel} />}
            {riskFlags > 0 && !riskLevel && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                {riskFlags} Risk{riskFlags > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="w-4 h-4" />
            <span className="truncate" data-testid="preauth-member-id">
              {claim.memberId}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="w-4 h-4" />
            <span className="truncate" data-testid="preauth-provider-id">
              {claim.providerId || "N/A"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium" data-testid="preauth-amount">
              ${Number(claim.totalAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {claim.diagnoses && claim.diagnoses.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {claim.diagnoses.slice(0, 3).map((dx, idx) => (
              <Badge key={idx} variant="outline" className="text-xs font-mono">
                {dx.code}
              </Badge>
            ))}
            {claim.diagnoses.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{claim.diagnoses.length - 3} more
              </Badge>
            )}
          </div>
        )}

        <PreAuthPhaseIndicator 
          currentPhase={(claim.processingPhase || 1) as PreAuthWorkflowPhase} 
        />
      </CardContent>

      <CardFooter className="pt-0 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="w-3.5 h-3.5" />
          <span>{signalCount} signal{signalCount !== 1 ? "s" : ""}</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          asChild 
          data-testid={`preauth-view-claim-${claim.claimId}`}
        >
          <Link href={`/pre-auth/claims/${claim.id}`}>
            View Details
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
