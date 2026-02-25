import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Search, 
  Filter, 
  Grid,
  List,
  RefreshCw,
  CheckCircle2,
  Loader2,
  FileText,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

type ViewMode = "grid" | "list";
type ClaimStatus = "all" | "pending_review" | "analyzing" | "auto_approved" | "flagged" | "approved" | "rejected";
type RiskLevel = "all" | "high" | "medium" | "low";

interface AdjudicationClaim {
  id: string;
  claimId: string;
  memberId: string;
  providerId: string;
  status: string;
  riskLevel: string;
  totalAmount: number;
  submittedAt: string;
  specialty?: string;
}

const statusFilters: { value: ClaimStatus; label: string }[] = [
  { value: "all", label: "All Claims" },
  { value: "pending_review", label: "Pending Review" },
  { value: "analyzing", label: "Analyzing" },
  { value: "auto_approved", label: "Auto-Approved" },
  { value: "flagged", label: "Flagged" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const riskFilters: { value: RiskLevel; label: string }[] = [
  { value: "all", label: "All Risk Levels" },
  { value: "high", label: "High Risk" },
  { value: "medium", label: "Medium Risk" },
  { value: "low", label: "Low Risk" },
];

const approvableStatuses = ["pending_review", "analyzing", "flagged"];

function ClaimCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

function ClaimCard({ 
  claim, 
  isSelected, 
  onSelectChange 
}: { 
  claim: AdjudicationClaim; 
  isSelected: boolean; 
  onSelectChange: (checked: boolean) => void;
}) {
  const statusColors: Record<string, string> = {
    pending_review: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    analyzing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    auto_approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    flagged: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  const riskColors: Record<string, string> = {
    high: "text-red-600",
    medium: "text-amber-600",
    low: "text-green-600",
  };

  const canBeApproved = approvableStatuses.includes(claim.status);

  return (
    <Card className={`hover-elevate ${isSelected ? "ring-2 ring-primary" : ""}`} data-testid={`claim-card-${claim.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {canBeApproved && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={onSelectChange}
                data-testid={`checkbox-claim-${claim.id}`}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <Link href={`/claims-governance/adjudication/claims/${claim.id}`}>
              <span className="font-mono text-sm font-medium cursor-pointer hover:underline">{claim.claimId}</span>
            </Link>
          </div>
          <Badge className={statusColors[claim.status]}>
            {claim.status.replace("_", " ")}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Member: {claim.memberId}</p>
          <p>Provider: {claim.providerId}</p>
          {claim.specialty && <p>Specialty: {claim.specialty}</p>}
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm font-medium">
            ${claim.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <span className={`text-xs font-medium uppercase ${riskColors[claim.riskLevel]}`}>
            {claim.riskLevel} risk
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ClaimListItem({ 
  claim, 
  isSelected, 
  onSelectChange 
}: { 
  claim: AdjudicationClaim; 
  isSelected: boolean; 
  onSelectChange: (checked: boolean) => void;
}) {
  const statusColors: Record<string, string> = {
    pending_review: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
    analyzing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    auto_approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    flagged: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  const riskColors: Record<string, string> = {
    high: "text-red-600",
    medium: "text-amber-600",
    low: "text-green-600",
  };

  const canBeApproved = approvableStatuses.includes(claim.status);

  return (
    <Card className={`hover-elevate ${isSelected ? "ring-2 ring-primary" : ""}`} data-testid={`claim-list-item-${claim.id}`}>
      <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          {canBeApproved && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelectChange}
              data-testid={`checkbox-claim-${claim.id}`}
              onClick={(e) => e.stopPropagation()}
            />
          )}
          <Link href={`/claims-governance/adjudication/claims/${claim.id}`}>
            <span className="font-mono text-sm font-medium cursor-pointer hover:underline">{claim.claimId}</span>
          </Link>
          <span className="text-sm text-muted-foreground">Member: {claim.memberId}</span>
          <span className="text-sm text-muted-foreground">Provider: {claim.providerId}</span>
          {claim.specialty && (
            <span className="text-sm text-muted-foreground">{claim.specialty}</span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`text-xs font-medium uppercase ${riskColors[claim.riskLevel]}`}>
            {claim.riskLevel}
          </span>
          <span className="text-sm font-medium">
            ${claim.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
          <Badge className={statusColors[claim.status]}>
            {claim.status.replace("_", " ")}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdjudicationClaimsList() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClaimStatus>("all");
  const [riskFilter, setRiskFilter] = useState<RiskLevel>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedClaimIds, setSelectedClaimIds] = useState<Set<string>>(new Set());
  const [bulkApproveDialogOpen, setBulkApproveDialogOpen] = useState(false);
  const [localApprovedIds, setLocalApprovedIds] = useState<Set<string>>(new Set());

  const { data: claims = [], isLoading, refetch } = useQuery<AdjudicationClaim[]>({
    queryKey: ["/api/demo/claims"],
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (claimIds: string[]) => {
      await Promise.all(claimIds.map(id => 
        apiRequest("POST", "/api/claims/actions", {
          claimId: id,
          humanAction: "BULK_APPROVE",
          wasAccepted: true,
          phase: "5",
        })
      ));
      return claimIds;
    },
    onSuccess: (approvedIds) => {
      setLocalApprovedIds(prev => {
        const newSet = new Set(prev);
        approvedIds.forEach(id => newSet.add(id));
        return newSet;
      });
      setSelectedClaimIds(new Set());
      setBulkApproveDialogOpen(false);
      toast({
        title: "Claims Approved",
        description: `Successfully approved ${approvedIds.length} claim${approvedIds.length > 1 ? "s" : ""}`,
      });
    },
  });

  const claimsWithLocalStatus = claims.map(claim => ({
    ...claim,
    status: localApprovedIds.has(claim.id) ? "approved" : claim.status,
  }));

  const filteredClaims = claimsWithLocalStatus.filter(claim => {
    const matchesSearch = 
      claim.claimId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.memberId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.providerId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || claim.status === statusFilter;
    const matchesRisk = riskFilter === "all" || claim.riskLevel === riskFilter;
    return matchesSearch && matchesStatus && matchesRisk;
  });

  const approvableClaims = filteredClaims.filter(c => approvableStatuses.includes(c.status));
  const selectedApprovableClaims = approvableClaims.filter(c => selectedClaimIds.has(c.id));
  const allApprovableSelected = approvableClaims.length > 0 && 
    approvableClaims.every(c => selectedClaimIds.has(c.id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const newSelected = new Set(selectedClaimIds);
      approvableClaims.forEach(c => newSelected.add(c.id));
      setSelectedClaimIds(newSelected);
    } else {
      const newSelected = new Set(selectedClaimIds);
      approvableClaims.forEach(c => newSelected.delete(c.id));
      setSelectedClaimIds(newSelected);
    }
  };

  const handleSelectClaim = (claimId: string, checked: boolean) => {
    const newSelected = new Set(selectedClaimIds);
    if (checked) {
      newSelected.add(claimId);
    } else {
      newSelected.delete(claimId);
    }
    setSelectedClaimIds(newSelected);
  };

  const handleBulkApprove = () => {
    const idsToApprove = Array.from(selectedClaimIds).filter(id => 
      approvableClaims.some(c => c.id === id)
    );
    bulkApproveMutation.mutate(idsToApprove);
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-adjudication-claims">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Claims Queue</h1>
          <p className="text-muted-foreground">
            Claims in the adjudication pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedApprovableClaims.length > 0 && (
            <Button 
              onClick={() => setBulkApproveDialogOpen(true)}
              className="gap-2"
              data-testid="button-bulk-approve"
            >
              <CheckCircle2 className="w-4 h-4" />
              Bulk Approve ({selectedApprovableClaims.length})
            </Button>
          )}
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
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {approvableClaims.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allApprovableSelected}
                  onCheckedChange={handleSelectAll}
                  data-testid="checkbox-select-all"
                />
                <span className="text-sm text-muted-foreground">Select All</span>
              </div>
            )}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search claims..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ClaimStatus)}>
              <SelectTrigger className="w-[180px]" data-testid="select-status">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statusFilters.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v as RiskLevel)}>
              <SelectTrigger className="w-[180px]" data-testid="select-risk">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                {riskFilters.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList>
                <TabsTrigger value="grid" data-testid="toggle-grid-view">
                  <Grid className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="list" data-testid="toggle-list-view">
                  <List className="w-4 h-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        Showing {filteredClaims.length} of {claims.length} claims
        {selectedApprovableClaims.length > 0 && (
          <span className="ml-2 text-primary font-medium">
            ({selectedApprovableClaims.length} selected for approval)
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <ClaimCardSkeleton key={idx} />
          ))}
        </div>
      ) : filteredClaims.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {claims.length === 0 ? "No claims in the pipeline" : "No claims match your filters"}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClaims.map(claim => (
            <ClaimCard 
              key={claim.id} 
              claim={claim} 
              isSelected={selectedClaimIds.has(claim.id)}
              onSelectChange={(checked) => handleSelectClaim(claim.id, checked)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredClaims.map(claim => (
            <ClaimListItem 
              key={claim.id} 
              claim={claim}
              isSelected={selectedClaimIds.has(claim.id)}
              onSelectChange={(checked) => handleSelectClaim(claim.id, checked)}
            />
          ))}
        </div>
      )}

      <AlertDialog open={bulkApproveDialogOpen} onOpenChange={setBulkApproveDialogOpen}>
        <AlertDialogContent data-testid="dialog-bulk-approve">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Approval</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to approve {selectedApprovableClaims.length} claim{selectedApprovableClaims.length > 1 ? "s" : ""}. 
              This action will update the status of all selected claims to "Approved".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <p className="text-sm font-medium mb-2">Selected Claims:</p>
            <div className="max-h-[150px] overflow-y-auto space-y-1">
              {selectedApprovableClaims.map(claim => (
                <div key={claim.id} className="text-sm text-muted-foreground flex justify-between">
                  <span className="font-mono">{claim.claimId}</span>
                  <span>${claim.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t flex justify-between text-sm font-medium">
              <span>Total Amount:</span>
              <span>
                ${selectedApprovableClaims.reduce((sum, c) => sum + c.totalAmount, 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkApproveMutation.isPending} data-testid="button-cancel-bulk-approve">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkApprove} disabled={bulkApproveMutation.isPending} data-testid="button-confirm-bulk-approve">
              {bulkApproveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : (
                "Approve All"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
