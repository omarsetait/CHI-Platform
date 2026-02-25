import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { EmptyState } from "@/components/ui/empty-state";
import { ChevronDown, ChevronRight, FileText, ExternalLink, Download, Loader2 } from "lucide-react";
import type { Claim, FwaClaimService } from "@shared/schema";

interface ClaimsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  findingId: string;
  findingSource: "dream_report" | "operational" | "fwa";
  findingTitle?: string;
  reportId?: string;
  providerId?: string;
  providerName?: string;
}

interface ExportResponse {
  success: boolean;
  findingId: string;
  source: string;
  analysis: {
    executiveSummary: string;
    claimCount: number;
    totalAmount: number;
    avgAmount: number;
    flaggedCount: number;
  };
  excelData?: string;
  excelFilename?: string;
}

function formatCurrency(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined) return "SAR 0";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `SAR ${num.toLocaleString("en-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("en-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function OutlierScoreBadge({ score }: { score: string | number | null | undefined }) {
  if (score === null || score === undefined) {
    return <Badge variant="outline">-</Badge>;
  }
  const numScore = typeof score === "string" ? parseFloat(score) : score;

  if (numScore < 0.5) {
    return (
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
        {numScore.toFixed(2)}
      </Badge>
    );
  } else if (numScore < 0.8) {
    return (
      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        {numScore.toFixed(2)}
      </Badge>
    );
  } else {
    return (
      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        {numScore.toFixed(2)}
      </Badge>
    );
  }
}

function ServiceStatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <Badge variant="outline">-</Badge>;

  const statusLower = status.toLowerCase();
  if (statusLower === "approved") {
    return (
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
        Approved
      </Badge>
    );
  } else if (statusLower === "denied" || statusLower === "rejected") {
    return (
      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        Denied
      </Badge>
    );
  } else if (statusLower === "pending") {
    return (
      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        Pending
      </Badge>
    );
  }
  return <Badge variant="outline">{status}</Badge>;
}

interface ServicesResponse {
  claimId: string;
  claimNumber: string;
  services: FwaClaimService[];
  total: number;
}

function ClaimServicesRow({ claimId, isOpen }: { claimId: string; isOpen: boolean }) {
  const { data, isLoading } = useQuery<ServicesResponse>({
    queryKey: ["/api/claims", claimId, "services"],
    enabled: isOpen,
  });

  const services = data?.services || [];

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={8} className="bg-muted/30 p-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </TableCell>
      </TableRow>
    );
  }

  if (services.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={8} className="bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground text-center">
            No services found for this claim.
          </p>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell colSpan={8} className="bg-muted/30 p-0">
        <div className="p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Line#</TableHead>
                <TableHead>Service Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Violations</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id} data-testid={`row-service-${service.id}`}>
                  <TableCell className="font-mono">{service.lineNumber}</TableCell>
                  <TableCell className="font-mono">{service.serviceCode}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {service.serviceDescription}
                  </TableCell>
                  <TableCell className="text-right">
                    {parseFloat(service.quantity).toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(service.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(service.totalPrice)}
                  </TableCell>
                  <TableCell>
                    <ServiceStatusBadge status={service.approvalStatus} />
                  </TableCell>
                  <TableCell>
                    {service.violations && service.violations.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {service.violations.slice(0, 2).map((v, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {v}
                          </Badge>
                        ))}
                        {service.violations.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{service.violations.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </TableCell>
    </TableRow>
  );
}

function ClaimRow({ claim, isExpanded, onToggle }: { 
  claim: Claim; 
  isExpanded: boolean; 
  onToggle: () => void;
}) {
  return (
    <>
      <TableRow
        className="cursor-pointer hover-elevate"
        onClick={onToggle}
        data-testid={`row-claim-${claim.id}`}
      >
        <TableCell className="w-[40px]">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell className="font-mono text-primary">{claim.id}</TableCell>
        <TableCell className="font-mono">{claim.claimNumber}</TableCell>
        <TableCell>{claim.hospital}</TableCell>
        <TableCell className="text-right">{formatCurrency(claim.amount)}</TableCell>
        <TableCell>{claim.claimType}</TableCell>
        <TableCell>
          <OutlierScoreBadge score={claim.outlierScore} />
        </TableCell>
        <TableCell>{formatDate(claim.registrationDate)}</TableCell>
      </TableRow>
      <ClaimServicesRow claimId={claim.id} isOpen={isExpanded} />
    </>
  );
}

interface ClaimsResponse {
  claims: Claim[];
  total: number;
  sample: boolean;
  source: string;
  findingId: string;
  providerId?: string;
}

export function ClaimsModal({
  open,
  onOpenChange,
  findingId,
  findingSource,
  findingTitle,
  reportId,
  providerId,
  providerName,
}: ClaimsModalProps) {
  const [expandedClaimId, setExpandedClaimId] = useState<string | null>(null);
  const { toast } = useToast();

  const queryParams = new URLSearchParams({ source: findingSource });
  if (reportId) queryParams.set("reportId", reportId);
  if (providerId) queryParams.set("providerId", providerId);
  if (findingTitle) queryParams.set("findingTitle", findingTitle);

  const { data: claimsResponse, isLoading } = useQuery<ClaimsResponse>({
    queryKey: ["/api/findings", findingId, "claims", findingSource, reportId || "", providerId || "", findingTitle || ""],
    queryFn: async () => {
      const url = `/api/findings/${findingId}/claims?${queryParams.toString()}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        throw new Error(`Failed to fetch claims: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: open,
  });
  
  const claims = claimsResponse?.claims || [];

  const exportMutation = useMutation<ExportResponse, Error, void>({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/findings/${findingId}/export`, {
        format: "excel",
        source: findingSource,
        includeServices: true,
        findingTitle,
        providerId,
        providerName,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.excelData && data.excelFilename) {
        const blob = new Blob(
          [Uint8Array.from(atob(data.excelData), c => c.charCodeAt(0))],
          { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
        );
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.excelFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      toast({
        title: "Export Complete",
        description: `Claims report for ${data.analysis.claimCount} claims has been downloaded.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export claims report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleToggleClaim = (claimId: string) => {
    setExpandedClaimId((prev) => (prev === claimId ? null : claimId));
  };

  const title = findingTitle
    ? `Related Claims for ${findingTitle}`
    : "Related Claims";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col" data-testid="modal-claims">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="text-modal-title">
            <FileText className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : claims.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={FileText}
                title="No claims found"
                description="There are no claims associated with this finding."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]"></TableHead>
                  <TableHead>Claim ID</TableHead>
                  <TableHead>Claim Number</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Amount (SAR)</TableHead>
                  <TableHead>Claim Type</TableHead>
                  <TableHead>Outlier Score</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {claims.map((claim) => (
                  <ClaimRow
                    key={claim.id}
                    claim={claim}
                    isExpanded={expandedClaimId === claim.id}
                    onToggle={() => handleToggleClaim(claim.id)}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter className="border-t pt-4 flex justify-between gap-2">
          <Button
            variant="default"
            className="gap-2"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending || claims.length === 0}
            data-testid="button-download-report"
          >
            {exportMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {exportMutation.isPending ? "Generating..." : "Download Report"}
          </Button>
          <Link href={`/findings/${findingId}/claims`}>
            <Button variant="outline" className="gap-2" data-testid="button-view-all-claims">
              <ExternalLink className="h-4 w-4" />
              View All Claims
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
