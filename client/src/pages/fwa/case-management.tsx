import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle,
  Briefcase,
  FileText,
  Download,
  Users,
  Loader2,
} from "lucide-react";
import { Link } from "wouter";
import { ActionDropdown } from "@/components/action-dropdown";
import { QueryErrorState } from "@/components/error-boundary";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { FwaCase, FwaWorkQueueClaim } from "@shared/schema";

const teamMembers = [
  { id: "user-1", name: "Ahmed Al-Hassan", role: "Senior Investigator" },
  { id: "user-2", name: "Fatima Al-Rashid", role: "FWA Analyst" },
  { id: "user-3", name: "Omar Al-Qahtani", role: "Claims Reviewer" },
  { id: "user-4", name: "Sara Al-Fahad", role: "Audit Specialist" },
  { id: "user-5", name: "Khalid Al-Mansour", role: "Team Lead" },
];

type SortField = "riskScore" | "claimAmount" | "createdAt" | "amount" | "confidence";
type SortDirection = "asc" | "desc";

const caseStatusConfig: Record<string, { label: string; className: string }> = {
  analyzing: { label: "Analyzing", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  categorized: { label: "Categorized", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  action_pending: { label: "Action Pending", className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  resolved: { label: "Resolved", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
};

const categoryConfig: Record<string, { label: string; className: string }> = {
  coding: { label: "Coding", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  management: { label: "Management", className: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200" },
  physician: { label: "Physician", className: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200" },
  patient: { label: "Patient", className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200" },
};

const riskLevelConfig: Record<string, { label: string; className: string }> = {
  critical: { label: "Critical", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  high: { label: "High", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  medium: { label: "Medium", className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  low: { label: "Low", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
  critical: { label: "Critical", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  high: { label: "High", className: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-200" },
  medium: { label: "Medium", className: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200" },
  low: { label: "Low", className: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200" },
};

const claimStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  in_review: { label: "In Review", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  resolved: { label: "Resolved", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
};

function StatsCard({
  title,
  value,
  icon: Icon,
  isLoading,
  iconBgClass = "bg-purple-100 dark:bg-purple-900/30",
  iconClass = "text-purple-600 dark:text-purple-400",
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  isLoading?: boolean;
  iconBgClass?: string;
  iconClass?: string;
}) {
  return (
    <Card data-testid={`stats-card-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-bold">{value}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${iconBgClass}`}>
            <Icon className={`w-5 h-5 ${iconClass}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SortButton({
  field,
  currentField,
  direction,
  onSort,
  children,
}: {
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  children: React.ReactNode;
}) {
  const isActive = field === currentField;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 flex items-center gap-1 -ml-3"
      onClick={() => onSort(field)}
      data-testid={`button-sort-${field}`}
    >
      {children}
      {isActive ? (
        direction === "asc" ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </Button>
  );
}

interface CaseDisplay {
  id: string;
  provider: string;
  providerId: string;
  status: string;
  category: string;
  amount: number;
  phase: string;
  dateDetected: string;
  confidence: number;
}

export default function CaseManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"cases" | "claims">("cases");
  const [searchQuery, setSearchQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("riskScore");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [casesPage, setCasesPage] = useState(1);
  const [claimsPage, setClaimsPage] = useState(1);
  const pageSize = 10;

  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());
  const [bulkAssignDialogOpen, setBulkAssignDialogOpen] = useState(false);
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [bulkAssignNotes, setBulkAssignNotes] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const { data: cases, isLoading: casesLoading, isError: casesError, error: casesErrorData, refetch: refetchCases } = useQuery<FwaCase[]>({
    queryKey: ["/api/fwa/cases"],
  });

  const { data: claims, isLoading: claimsLoading, isError: claimsError, error: claimsErrorData, refetch: refetchClaims } = useQuery<FwaWorkQueueClaim[]>({
    queryKey: ["/api/fwa/workqueue"],
  });

  const isLoading = activeTab === "cases" ? casesLoading : claimsLoading;
  const hasError = activeTab === "cases" ? casesError : claimsError;

  const handleRefresh = () => {
    refetchCases();
    refetchClaims();
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const displayCases: CaseDisplay[] = useMemo(() => {
    return (cases || []).map((c) => ({
      id: c.caseId,
      provider: c.providerId,
      providerId: c.providerId,
      status: c.status || "analyzing",
      category: c.category || "coding",
      amount: Number(c.totalAmount),
      phase: c.phase === "a1_analysis" ? "A1" : c.phase === "a2_categorization" ? "A2" : c.phase === "a3_action" ? "A3" : "Resolved",
      dateDetected: c.createdAt ? new Date(c.createdAt).toISOString().split("T")[0] : "",
      confidence: 85,
    }));
  }, [cases]);

  const filteredCases = useMemo(() => {
    let result = displayCases;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.id.toLowerCase().includes(query) ||
          c.provider.toLowerCase().includes(query) ||
          c.providerId.toLowerCase().includes(query)
      );
    }

    if (phaseFilter !== "all") {
      result = result.filter((c) => c.phase === phaseFilter);
    }

    if (statusFilter !== "all") {
      result = result.filter((c) => c.status === statusFilter);
    }

    if (categoryFilter !== "all") {
      result = result.filter((c) => c.category === categoryFilter);
    }

    return result.sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (sortField) {
        case "amount":
          aVal = a.amount;
          bVal = b.amount;
          break;
        case "confidence":
          aVal = a.confidence;
          bVal = b.confidence;
          break;
        default:
          return 0;
      }

      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [displayCases, searchQuery, phaseFilter, statusFilter, categoryFilter, sortField, sortDirection]);

  const filteredClaims = useMemo(() => {
    let result = claims || [];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.claimNumber.toLowerCase().includes(query) ||
          (c.providerName && c.providerName.toLowerCase().includes(query)) ||
          (c.providerId && c.providerId.toLowerCase().includes(query)) ||
          (c.patientName && c.patientName.toLowerCase().includes(query))
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((c) => c.queueStatus === statusFilter);
    }

    return [...result].sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (sortField) {
        case "riskScore":
          aVal = Number(a.riskScore) || 0;
          bVal = Number(b.riskScore) || 0;
          break;
        case "claimAmount":
          aVal = Number(a.claimAmount) || 0;
          bVal = Number(b.claimAmount) || 0;
          break;
        case "createdAt":
          aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        default:
          return 0;
      }

      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [claims, searchQuery, statusFilter, sortField, sortDirection]);

  // Paginated data
  const paginatedCases = useMemo(() => {
    const start = (casesPage - 1) * pageSize;
    return filteredCases.slice(start, start + pageSize);
  }, [filteredCases, casesPage, pageSize]);

  const paginatedClaims = useMemo(() => {
    const start = (claimsPage - 1) * pageSize;
    return filteredClaims.slice(start, start + pageSize);
  }, [filteredClaims, claimsPage, pageSize]);

  const totalCasesPages = Math.ceil(filteredCases.length / pageSize);
  const totalClaimsPages = Math.ceil(filteredClaims.length / pageSize);

  const stats = useMemo(() => {
    const allCases = cases || [];
    const allClaims = claims || [];
    return {
      totalCases: allCases.length,
      totalClaims: allClaims.length,
      criticalRisk: allClaims.filter((c) => c.riskLevel === "critical" || c.riskLevel === "high").length,
      pendingReview: allClaims.filter((c) => c.queueStatus === "pending").length +
        allCases.filter((c) => c.status === "action_pending" || c.status === "analyzing").length,
    };
  }, [cases, claims]);

  const handleTabChange = (value: string) => {
    setActiveTab(value as "cases" | "claims");
    setSearchQuery("");
    setStatusFilter("all");
    setPhaseFilter("all");
    setCategoryFilter("all");
    setCasesPage(1);
    setClaimsPage(1);
  };

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCasesPage(1);
    setClaimsPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCasesPage(1);
    setClaimsPage(1);
  };

  const handlePhaseFilterChange = (value: string) => {
    setPhaseFilter(value);
    setCasesPage(1);
  };

  const handleCategoryFilterChange = (value: string) => {
    setCategoryFilter(value);
    setCasesPage(1);
  };

  const bulkAssignMutation = useMutation({
    mutationFn: async (data: { caseIds: string[]; assigneeId: string; notes: string }) => {
      const response = await apiRequest("PATCH", "/api/fwa/cases/bulk-assign", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/cases"] });
      setSelectedCases(new Set());
      setBulkAssignDialogOpen(false);
      setBulkAssignee("");
      setBulkAssignNotes("");
      toast({
        title: "Cases Assigned",
        description: `Successfully assigned ${selectedCases.size} case(s) to ${teamMembers.find(m => m.id === bulkAssignee)?.name || "team member"}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign cases. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSelectAllCases = (checked: boolean) => {
    if (checked) {
      setSelectedCases(new Set(filteredCases.map(c => c.id)));
    } else {
      setSelectedCases(new Set());
    }
  };

  const handleSelectCase = (caseId: string, checked: boolean) => {
    const newSelected = new Set(selectedCases);
    if (checked) {
      newSelected.add(caseId);
    } else {
      newSelected.delete(caseId);
    }
    setSelectedCases(newSelected);
  };

  const handleBulkAssign = () => {
    if (!bulkAssignee || selectedCases.size === 0) return;
    bulkAssignMutation.mutate({
      caseIds: Array.from(selectedCases),
      assigneeId: bulkAssignee,
      notes: bulkAssignNotes,
    });
  };

  const handleExportCases = () => {
    if (filteredCases.length === 0) return;

    setIsExporting(true);

    try {
      const escapeCSV = (value: string | number | null | undefined): string => {
        const str = String(value ?? "");
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const headers = ["Case ID", "Provider", "Status", "Category", "Amount", "Phase", "Date Detected"];
      const csvRows = [headers.join(",")];

      filteredCases.forEach(c => {
        const row = [
          escapeCSV(c.id),
          escapeCSV(c.provider),
          escapeCSV(c.status),
          escapeCSV(c.category),
          c.amount,
          escapeCSV(c.phase),
          escapeCSV(c.dateDetected),
        ];
        csvRows.push(row.join(","));
      });

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `fwa-cases-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Exported ${filteredCases.length} case(s) to CSV.`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export cases. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">
            Case Management
          </h1>
          <p className="text-muted-foreground">
            Investigate flagged claims, assign cases, and document outcomes
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedCases.size > 0 && (
            <Button
              size="sm"
              data-testid="button-bulk-assign"
              onClick={() => setBulkAssignDialogOpen(true)}
            >
              <Users className="w-4 h-4 mr-2" />
              Bulk Assign ({selectedCases.size})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            data-testid="button-export-cases"
            onClick={handleExportCases}
            disabled={isExporting || filteredCases.length === 0}
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            data-testid="button-refresh"
            onClick={handleRefresh}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Cases"
          value={stats.totalCases}
          icon={Briefcase}
          isLoading={casesLoading}
          iconBgClass="bg-blue-100 dark:bg-blue-900/30"
          iconClass="text-blue-600 dark:text-blue-400"
        />
        <StatsCard
          title="Total Claims"
          value={stats.totalClaims}
          icon={FileText}
          isLoading={claimsLoading}
          iconBgClass="bg-teal-100 dark:bg-teal-900/30"
          iconClass="text-teal-600 dark:text-teal-400"
        />
        <StatsCard
          title="Critical Risk"
          value={stats.criticalRisk}
          icon={AlertTriangle}
          isLoading={claimsLoading}
          iconBgClass="bg-red-100 dark:bg-red-900/30"
          iconClass="text-red-600 dark:text-red-400"
        />
        <StatsCard
          title="Pending Review"
          value={stats.pendingReview}
          icon={Clock}
          isLoading={casesLoading || claimsLoading}
          iconBgClass="bg-amber-100 dark:bg-amber-900/30"
          iconClass="text-amber-600 dark:text-amber-400"
        />
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-4" data-testid="tabs-main">
          <TabsTrigger value="cases" data-testid="tab-cases">
            Inappropriate Care Cases
          </TabsTrigger>
          <TabsTrigger value="claims" data-testid="tab-claims">
            Flagged Claims
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cases">
          {casesError ? (
            <QueryErrorState
              error={casesErrorData instanceof Error ? casesErrorData : new Error("Failed to load cases")}
              onRetry={() => refetchCases()}
              title="Failed to load cases"
            />
          ) : (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by case ID, provider..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-cases"
                  />
                </div>
                <Select value={phaseFilter} onValueChange={setPhaseFilter}>
                  <SelectTrigger className="w-[140px]" data-testid="select-phase">
                    <SelectValue placeholder="Phase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Phases</SelectItem>
                    <SelectItem value="A1">Phase A1</SelectItem>
                    <SelectItem value="A2">Phase A2</SelectItem>
                    <SelectItem value="A3">Phase A3</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]" data-testid="select-case-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="analyzing">Analyzing</SelectItem>
                    <SelectItem value="categorized">Categorized</SelectItem>
                    <SelectItem value="action_pending">Action Pending</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[150px]" data-testid="select-category">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="coding">Coding Abuse</SelectItem>
                    <SelectItem value="management">Management Abuse</SelectItem>
                    <SelectItem value="physician">Physician Abuse</SelectItem>
                    <SelectItem value="patient">Patient Abuse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={filteredCases.length > 0 && selectedCases.size === filteredCases.length}
                          onCheckedChange={(checked) => handleSelectAllCases(!!checked)}
                          data-testid="checkbox-select-all"
                          aria-label="Select all cases"
                        />
                      </TableHead>
                      <TableHead className="w-[100px]">Case ID</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Phase</TableHead>
                      <TableHead className="text-right">
                        <SortButton
                          field="amount"
                          currentField={sortField}
                          direction={sortDirection}
                          onSort={handleSort}
                        >
                          Amount
                        </SortButton>
                      </TableHead>
                      <TableHead className="text-right">
                        <SortButton
                          field="confidence"
                          currentField={sortField}
                          direction={sortDirection}
                          onSort={handleSort}
                        >
                          Confidence
                        </SortButton>
                      </TableHead>
                      <TableHead>Actions</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {casesLoading ? (
                      Array.from({ length: 5 }).map((_, idx) => (
                        <TableRow key={idx}>
                          <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-20" />
                            </div>
                          </TableCell>
                          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-4 w-10 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                        </TableRow>
                      ))
                    ) : paginatedCases.length > 0 ? (
                      paginatedCases.map((caseData) => {
                        const status = caseStatusConfig[caseData.status] || caseStatusConfig.analyzing;
                        const category = categoryConfig[caseData.category] || categoryConfig.coding;
                        return (
                          <TableRow
                            key={caseData.id}
                            className="cursor-pointer"
                            data-testid={`row-case-${caseData.id}`}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedCases.has(caseData.id)}
                                onCheckedChange={(checked) => handleSelectCase(caseData.id, !!checked)}
                                data-testid={`checkbox-case-${caseData.id}`}
                                aria-label={`Select case ${caseData.id}`}
                              />
                            </TableCell>
                            <TableCell className="font-mono font-medium">{caseData.id}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{caseData.provider}</p>
                                <p className="text-xs text-muted-foreground">{caseData.providerId}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={category.className} data-testid={`badge-category-${caseData.id}`}>
                                {category.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={status.className} data-testid={`badge-status-${caseData.id}`}>
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-xs px-2 py-1 bg-muted rounded font-medium" data-testid={`text-phase-${caseData.id}`}>
                                {caseData.phase}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-medium">${caseData.amount.toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                              <span className={caseData.confidence >= 90 ? "text-red-600 font-medium" : caseData.confidence >= 80 ? "text-amber-600" : "text-muted-foreground"}>
                                {caseData.confidence}%
                              </span>
                            </TableCell>
                            <TableCell>
                              <ActionDropdown
                                entityId={caseData.id}
                                entityType="case"
                                entityName={caseData.provider}
                                module="fwa"
                                phase={caseData.phase}
                                aiRecommendation={{
                                  action: caseData.phase === "A3" ? "initiate_enforcement" : "enhanced_monitoring",
                                  priority: "high",
                                  confidence: caseData.confidence / 100,
                                  rationale: "AI-generated recommendation based on case analysis",
                                }}
                                onActionComplete={() => refetchCases()}
                              />
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" asChild data-testid={`button-view-case-${caseData.id}`}>
                                <Link href={`/fwa/cases/${caseData.id}`}>
                                  <ArrowRight className="w-4 h-4" />
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} className="h-32 text-center">
                          <div className="text-muted-foreground">No cases match your filters</div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* Pagination for Cases */}
              {filteredCases.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <span className="text-sm text-muted-foreground">
                    Showing {Math.min(((casesPage - 1) * pageSize) + 1, filteredCases.length)} to {Math.min(casesPage * pageSize, filteredCases.length)} of {filteredCases.length} cases
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={casesPage === 1}
                      onClick={() => setCasesPage(p => p - 1)}
                      data-testid="button-cases-prev"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={casesPage >= totalCasesPages}
                      onClick={() => setCasesPage(p => p + 1)}
                      data-testid="button-cases-next"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </TabsContent>

        <TabsContent value="claims">
          {claimsError ? (
            <QueryErrorState
              error={claimsErrorData instanceof Error ? claimsErrorData : new Error("Failed to load claims")}
              onRetry={() => refetchClaims()}
              title="Failed to load flagged claims"
            />
          ) : (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search claim number, provider, patient..."
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-claims"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]" data-testid="select-claim-status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[140px]">Claim Number</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead className="text-right">
                        <SortButton
                          field="claimAmount"
                          currentField={sortField}
                          direction={sortDirection}
                          onSort={handleSort}
                        >
                          Amount
                        </SortButton>
                      </TableHead>
                      <TableHead className="text-right">
                        <SortButton
                          field="riskScore"
                          currentField={sortField}
                          direction={sortDirection}
                          onSort={handleSort}
                        >
                          Risk Score
                        </SortButton>
                      </TableHead>
                      <TableHead>Risk Level</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assigned To</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claimsLoading ? (
                      Array.from({ length: 5 }).map((_, idx) => (
                        <TableRow key={idx}>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-18" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        </TableRow>
                      ))
                    ) : paginatedClaims.length > 0 ? (
                      paginatedClaims.map((claim) => {
                        const riskLevel = riskLevelConfig[claim.riskLevel || "medium"] || riskLevelConfig.medium;
                        const priority = priorityConfig[claim.priority || "medium"] || priorityConfig.medium;
                        const status = claimStatusConfig[claim.queueStatus || "pending"] || claimStatusConfig.pending;

                        return (
                          <TableRow
                            key={claim.id}
                            className="cursor-pointer"
                            data-testid={`row-claim-${claim.claimId}`}
                          >
                            <TableCell>
                              <Link href={`/fwa/cases/${claim.claimId}`}>
                                <span
                                  className="font-mono text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline"
                                  data-testid={`link-claim-${claim.claimId}`}
                                >
                                  {claim.claimNumber}
                                </span>
                              </Link>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{claim.providerName || "Unknown Provider"}</p>
                                <p className="text-xs text-muted-foreground">{claim.providerId}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{claim.patientName || "Unknown Patient"}</p>
                                <p className="text-xs text-muted-foreground">{claim.patientId}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${Number(claim.claimAmount).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-mono font-medium">{Number(claim.riskScore).toFixed(2)}</span>
                            </TableCell>
                            <TableCell>
                              <Badge className={riskLevel.className} data-testid={`badge-risk-${claim.claimId}`}>
                                {riskLevel.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={priority.className} data-testid={`badge-priority-${claim.claimId}`}>
                                {priority.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={status.className} data-testid={`badge-claim-status-${claim.claimId}`}>
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {claim.assignedTo || "Unassigned"}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center">
                          <div className="text-muted-foreground">No claims match your filters</div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {/* Pagination for Claims */}
              {filteredClaims.length > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <span className="text-sm text-muted-foreground">
                    Showing {Math.min(((claimsPage - 1) * pageSize) + 1, filteredClaims.length)} to {Math.min(claimsPage * pageSize, filteredClaims.length)} of {filteredClaims.length} claims
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={claimsPage === 1}
                      onClick={() => setClaimsPage(p => p - 1)}
                      data-testid="button-claims-prev"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={claimsPage >= totalClaimsPages}
                      onClick={() => setClaimsPage(p => p + 1)}
                      data-testid="button-claims-next"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={bulkAssignDialogOpen} onOpenChange={setBulkAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-bulk-assign">Bulk Assign Cases</DialogTitle>
            <DialogDescription>
              Assign {selectedCases.size} selected case(s) to a team member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="assignee">Assign To</Label>
              <Select value={bulkAssignee} onValueChange={setBulkAssignee}>
                <SelectTrigger data-testid="select-bulk-assignee">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex flex-col">
                        <span>{member.name}</span>
                        <span className="text-xs text-muted-foreground">{member.role}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add notes for the assignment..."
                value={bulkAssignNotes}
                onChange={(e) => setBulkAssignNotes(e.target.value)}
                data-testid="textarea-bulk-assign-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkAssignDialogOpen(false)}
              data-testid="button-bulk-assign-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkAssign}
              disabled={!bulkAssignee || bulkAssignMutation.isPending}
              data-testid="button-bulk-assign-confirm"
            >
              {bulkAssignMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign Cases"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
