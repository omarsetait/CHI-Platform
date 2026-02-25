import { useState, useMemo } from "react";
import { useParams, useSearch, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ArrowLeft,
  FileText,
  Download,
  Search,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  FileStack,
  Loader2,
} from "lucide-react";
import type { Claim, FwaClaimService } from "@shared/schema";

const ITEMS_PER_PAGE = 50;

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

function ClaimServicesRow({ claimId, isOpen }: { claimId: string; isOpen: boolean }) {
  const { data: servicesResponse, isLoading } = useQuery<{ services: FwaClaimService[]; total: number }>({
    queryKey: ["/api/claims", claimId, "services"],
    enabled: isOpen,
  });

  const services = servicesResponse?.services || [];

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

function ClaimRow({
  claim,
  isExpanded,
  onToggle,
}: {
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

type SortField = "date" | "amount" | "outlierScore";
type SortDirection = "asc" | "desc";

function SortableHeader({
  label,
  field,
  currentSort,
  currentDirection,
  onSort,
  className,
}: {
  label: string;
  field: SortField;
  currentSort: SortField;
  currentDirection: SortDirection;
  onSort: (field: SortField) => void;
  className?: string;
}) {
  const isActive = currentSort === field;
  return (
    <TableHead
      className={`cursor-pointer hover-elevate ${className || ""}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          currentDirection === "asc" ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
        )}
      </div>
    </TableHead>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof FileStack;
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-xl font-bold" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
              {value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
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

export default function ViewAllClaimsPage() {
  const params = useParams<{ findingId: string }>();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const findingId = params.findingId || "";
  const source = (searchParams.get("source") as "dream_report" | "operational" | "fwa") || "dream_report";
  const reportId = searchParams.get("reportId") || undefined;
  const providerId = searchParams.get("providerId") || undefined;
  const { toast } = useToast();

  const [expandedClaimId, setExpandedClaimId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [providerSearch, setProviderSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const queryParams = new URLSearchParams({ source });
  if (reportId) queryParams.set("reportId", reportId);
  if (providerId) queryParams.set("providerId", providerId);

  const { data: claimsResponse, isLoading } = useQuery<{ claims: Claim[]; total: number }>({
    queryKey: ["/api/findings", findingId, "claims", source, reportId || "", providerId || ""],
    queryFn: async () => {
      const url = `/api/findings/${findingId}/claims?${queryParams.toString()}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        throw new Error(`Failed to fetch claims: ${response.statusText}`);
      }
      return response.json();
    },
  });

  const claims = claimsResponse?.claims || [];

  const exportMutation = useMutation<ExportResponse, Error, void>({
    mutationFn: async () => {
      // For dream_report source, use reportId; otherwise use findingId
      const exportId = source === "dream_report" && reportId ? reportId : findingId;
      const response = await apiRequest("POST", `/api/findings/${exportId}/export`, {
        format: "excel",
        source,
        includeServices: true,
        providerId,
        findingTitle: `Finding ${findingId}`, // Pass the original finding ID for context
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
        description: `Claims report with AI analysis for ${data.analysis.claimCount} claims has been downloaded.`,
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

  const filteredAndSortedClaims = useMemo(() => {
    let result = [...claims];

    if (providerSearch.trim()) {
      const search = providerSearch.toLowerCase();
      result = result.filter((c) => c.hospital?.toLowerCase().includes(search));
    }

    if (minAmount) {
      const min = parseFloat(minAmount);
      if (!isNaN(min)) {
        result = result.filter((c) => {
          const amt = typeof c.amount === "string" ? parseFloat(c.amount) : c.amount;
          return amt >= min;
        });
      }
    }

    if (maxAmount) {
      const max = parseFloat(maxAmount);
      if (!isNaN(max)) {
        result = result.filter((c) => {
          const amt = typeof c.amount === "string" ? parseFloat(c.amount) : c.amount;
          return amt <= max;
        });
      }
    }

    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter((c) => {
        if (!c.registrationDate) return false;
        return new Date(c.registrationDate) >= from;
      });
    }

    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((c) => {
        if (!c.registrationDate) return false;
        return new Date(c.registrationDate) <= to;
      });
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "date": {
          const dateA = a.registrationDate ? new Date(a.registrationDate).getTime() : 0;
          const dateB = b.registrationDate ? new Date(b.registrationDate).getTime() : 0;
          comparison = dateA - dateB;
          break;
        }
        case "amount": {
          const amtA = typeof a.amount === "string" ? parseFloat(a.amount) : (a.amount || 0);
          const amtB = typeof b.amount === "string" ? parseFloat(b.amount) : (b.amount || 0);
          comparison = amtA - amtB;
          break;
        }
        case "outlierScore": {
          const scoreA = typeof a.outlierScore === "string" ? parseFloat(a.outlierScore) : (a.outlierScore || 0);
          const scoreB = typeof b.outlierScore === "string" ? parseFloat(b.outlierScore) : (b.outlierScore || 0);
          comparison = scoreA - scoreB;
          break;
        }
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [claims, providerSearch, minAmount, maxAmount, dateFrom, dateTo, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedClaims.length / ITEMS_PER_PAGE);
  const paginatedClaims = filteredAndSortedClaims.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const stats = useMemo(() => {
    const totalClaims = filteredAndSortedClaims.length;
    const totalAmount = filteredAndSortedClaims.reduce((sum, c) => {
      const amt = typeof c.amount === "string" ? parseFloat(c.amount) : (c.amount || 0);
      return sum + amt;
    }, 0);
    const avgAmount = totalClaims > 0 ? totalAmount / totalClaims : 0;
    const flaggedCount = filteredAndSortedClaims.filter((c) => {
      const score = typeof c.outlierScore === "string" ? parseFloat(c.outlierScore) : (c.outlierScore || 0);
      return score >= 0.8;
    }).length;

    return { totalClaims, totalAmount, avgAmount, flaggedCount };
  }, [filteredAndSortedClaims]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  const handleToggleClaim = (claimId: string) => {
    setExpandedClaimId((prev) => (prev === claimId ? null : claimId));
  };

  const handleClearFilters = () => {
    setProviderSearch("");
    setStatusFilter("all");
    setMinAmount("");
    setMaxAmount("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  const sourceLabel = source === "dream_report" ? "Dream Report" : source === "fwa" ? "FWA" : "Operational";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href={source === "dream_report" ? `/provider-relations/dream-report/${reportId || ""}` : "/fwa/case-management"}>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <FileText className="h-6 w-6" />
              Claims for Finding
            </h1>
            <p className="text-muted-foreground text-sm">
              Finding ID: {findingId} | Source: {sourceLabel}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => exportMutation.mutate()}
          disabled={exportMutation.isPending || claims.length === 0}
          data-testid="button-export"
        >
          {exportMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {exportMutation.isPending ? "Generating Report..." : "Export with AI Analysis"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileStack} label="Total Claims" value={stats.totalClaims} />
        <StatCard icon={DollarSign} label="Total Amount" value={formatCurrency(stats.totalAmount)} />
        <StatCard icon={TrendingUp} label="Avg Amount" value={formatCurrency(stats.avgAmount)} />
        <StatCard icon={AlertTriangle} label="Flagged Count" value={stats.flaggedCount} />
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm text-muted-foreground mb-1 block">Provider Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search provider..."
                  value={providerSearch}
                  onChange={(e) => {
                    setProviderSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9"
                  data-testid="input-provider-search"
                />
              </div>
            </div>
            <div className="min-w-[140px]">
              <label className="text-sm text-muted-foreground mb-1 block">Status</label>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="denied">Denied</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[130px]">
              <label className="text-sm text-muted-foreground mb-1 block">Min Amount</label>
              <Input
                type="number"
                placeholder="0"
                value={minAmount}
                onChange={(e) => {
                  setMinAmount(e.target.value);
                  setCurrentPage(1);
                }}
                data-testid="input-min-amount"
              />
            </div>
            <div className="min-w-[130px]">
              <label className="text-sm text-muted-foreground mb-1 block">Max Amount</label>
              <Input
                type="number"
                placeholder="1,000,000"
                value={maxAmount}
                onChange={(e) => {
                  setMaxAmount(e.target.value);
                  setCurrentPage(1);
                }}
                data-testid="input-max-amount"
              />
            </div>
            <div className="min-w-[150px]">
              <label className="text-sm text-muted-foreground mb-1 block">Date From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                data-testid="input-date-from"
              />
            </div>
            <div className="min-w-[150px]">
              <label className="text-sm text-muted-foreground mb-1 block">Date To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                data-testid="input-date-to"
              />
            </div>
            <Button variant="outline" onClick={handleClearFilters} data-testid="button-clear-filters">
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-24" />
                </div>
              ))}
            </div>
          ) : paginatedClaims.length === 0 ? (
            <div className="py-16">
              <EmptyState
                icon={FileText}
                title="No claims found"
                description={
                  filteredAndSortedClaims.length === 0 && claims.length > 0
                    ? "Try adjusting your filters to see more results."
                    : "There are no claims associated with this finding."
                }
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"></TableHead>
                      <TableHead>Claim ID</TableHead>
                      <TableHead>Claim Number</TableHead>
                      <TableHead>Provider</TableHead>
                      <SortableHeader
                        label="Amount (SAR)"
                        field="amount"
                        currentSort={sortField}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                        className="text-right"
                      />
                      <TableHead>Claim Type</TableHead>
                      <SortableHeader
                        label="Outlier Score"
                        field="outlierScore"
                        currentSort={sortField}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                      />
                      <SortableHeader
                        label="Date"
                        field="date"
                        currentSort={sortField}
                        currentDirection={sortDirection}
                        onSort={handleSort}
                      />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedClaims.map((claim) => (
                      <ClaimRow
                        key={claim.id}
                        claim={claim}
                        isExpanded={expandedClaimId === claim.id}
                        onToggle={() => handleToggleClaim(claim.id)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="border-t p-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <p className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                      {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedClaims.length)} of{" "}
                      {filteredAndSortedClaims.length} claims
                    </p>
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            data-testid="button-prev-page"
                          />
                        </PaginationItem>
                        {getPageNumbers().map((page, idx) =>
                          page === "ellipsis" ? (
                            <PaginationItem key={`ellipsis-${idx}`}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          ) : (
                            <PaginationItem key={page}>
                              <PaginationLink
                                isActive={currentPage === page}
                                onClick={() => setCurrentPage(page)}
                                className="cursor-pointer"
                                data-testid={`button-page-${page}`}
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          )
                        )}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            data-testid="button-next-page"
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
