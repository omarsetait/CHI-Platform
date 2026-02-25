import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  Filter, 
  Grid,
  List,
  RefreshCw,
  ArrowRight
} from "lucide-react";
import { Link } from "wouter";
import { ActionDropdown } from "@/components/action-dropdown";

type ViewMode = "grid" | "list";
type ClaimStatus = "all" | "pending_review" | "analyzing" | "auto_approved" | "flagged" | "approved" | "rejected";
type RiskLevel = "all" | "high" | "medium" | "low";

interface ClaimItem {
  id: string;
  claimId: string;
  memberId: string;
  providerId: string;
  status: string;
  riskLevel: string;
  totalAmount: number;
  submittedAt: string;
  specialty?: string;
  providerName?: string;
  patientName?: string;
  flags?: string[];
  ruleViolations?: string[];
  adjudicationPhase?: number;
  aiConfidence?: number;
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

function ClaimCard({ claim }: { claim: ClaimItem }) {
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

  return (
    <Link href={`/claims-governance/claims/${claim.id}`}>
      <Card className="hover-elevate cursor-pointer" data-testid={`claim-card-${claim.id}`}>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-mono text-sm font-medium">{claim.claimId}</span>
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
    </Link>
  );
}

function ClaimListItem({ claim }: { claim: ClaimItem }) {
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

  return (
    <Link href={`/claims-governance/claims/${claim.id}`}>
      <Card className="hover-elevate cursor-pointer" data-testid={`claim-list-item-${claim.id}`}>
        <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-mono text-sm font-medium">{claim.claimId}</span>
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
    </Link>
  );
}

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

export default function ClaimsGovernanceClaimsList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClaimStatus>("all");
  const [riskFilter, setRiskFilter] = useState<RiskLevel>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const { data: demoClaims, isLoading, refetch } = useQuery<DemoClaim[]>({
    queryKey: ["/api/demo/claims"],
  });

  const claims: ClaimItem[] = (demoClaims || []).map(c => ({
    id: c.id,
    claimId: c.claimId,
    memberId: c.patientId,
    providerId: c.providerId,
    status: c.status === "flagged" ? "flagged" : c.status === "approved" ? "approved" : c.status === "denied" ? "rejected" : c.status === "pending" ? "pending_review" : "analyzing",
    riskLevel: c.flags.length > 1 ? "high" : c.flags.length === 1 ? "medium" : "low",
    totalAmount: parseFloat(c.claimAmount),
    submittedAt: c.submissionDate,
    specialty: c.claimType,
    providerName: c.providerName,
    patientName: c.patientName,
    flags: c.flags,
    ruleViolations: c.ruleViolations,
    adjudicationPhase: c.adjudicationPhase,
    aiConfidence: c.aiConfidence,
  }));

  const filteredClaims = claims.filter(claim => {
    const matchesSearch = 
      claim.claimId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.memberId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.providerId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || claim.status === statusFilter;
    const matchesRisk = riskFilter === "all" || claim.riskLevel === riskFilter;
    return matchesSearch && matchesStatus && matchesRisk;
  });

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

  return (
    <div className="p-6 space-y-6" data-testid="page-claims-governance-claims">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Claims Queue</h1>
          <p className="text-muted-foreground">
            All claims in the governance pipeline
          </p>
        </div>
        <Button variant="outline" size="sm" data-testid="button-refresh" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
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
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim ID</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : filteredClaims.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No claims match your filters</p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClaims.map(claim => (
            <ClaimCard key={claim.id} claim={claim} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim ID</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Flags</TableHead>
                  <TableHead>Actions</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClaims.map(claim => (
                  <TableRow key={claim.id} className="hover-elevate" data-testid={`claim-row-${claim.id}`}>
                    <TableCell className="font-mono text-sm font-medium">{claim.claimId}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{claim.providerName || claim.providerId}</p>
                        <p className="text-xs text-muted-foreground">{claim.patientName || claim.memberId}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{claim.specialty}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[claim.status]}>
                        {claim.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium uppercase ${riskColors[claim.riskLevel]}`}>
                        {claim.riskLevel}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${claim.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {claim.flags && claim.flags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {claim.flags.slice(0, 2).map((flag, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {flag.length > 15 ? flag.substring(0, 15) + "..." : flag}
                            </Badge>
                          ))}
                          {claim.flags.length > 2 && (
                            <Badge variant="outline" className="text-xs">+{claim.flags.length - 2}</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ActionDropdown
                        entityId={claim.claimId}
                        entityType="claim"
                        entityName={claim.providerName || claim.providerId}
                        module="claims"
                        phase={String(claim.adjudicationPhase || 1)}
                        aiRecommendation={{
                          action: claim.status === "flagged" ? "flag_for_review" : claim.riskLevel === "high" ? "escalate" : "approve",
                          priority: claim.riskLevel === "high" ? "high" : "normal",
                          confidence: claim.aiConfidence || 0.85,
                          rationale: "AI recommendation based on claim analysis and rule violations",
                        }}
                        onActionComplete={() => refetch()}
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/claims-governance/claims/${claim.id}`}>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
