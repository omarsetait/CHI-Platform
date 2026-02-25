import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Download,
  Plus,
  Filter,
  Building2,
  CheckCircle,
  Clock,
  Handshake,
  FileSignature,
  BadgeCheck,
  MoreHorizontal,
  Package,
  Users,
  AlertTriangle,
  FileText,
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

type ReconciliationStatus = "proposed" | "negotiating" | "agreed" | "signed" | "finance_approved";

interface Settlement {
  id: string;
  settlementNumber: string;
  providerId: string;
  providerName: string;
  periodStart: string;
  periodEnd: string;
  status: ReconciliationStatus;
  proposedAmount: string | null;
  agreedAmount: string | null;
  discrepancyAmount: string | null;
  evidencePackId: string | null;
  sessionId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Provider {
  id: string;
  npi: string;
  name: string;
  specialty: string;
  contractStatus: string;
  networkTier: string;
}

const STATUS_WORKFLOW: ReconciliationStatus[] = [
  "proposed",
  "negotiating",
  "agreed",
  "signed",
  "finance_approved",
];

const STATUS_LABELS: Record<ReconciliationStatus, string> = {
  proposed: "Proposed",
  negotiating: "Negotiating",
  agreed: "Agreed",
  signed: "Signed",
  finance_approved: "Finance Approved",
};

const STATUS_ICONS: Record<ReconciliationStatus, typeof Clock> = {
  proposed: Clock,
  negotiating: Handshake,
  agreed: CheckCircle,
  signed: FileSignature,
  finance_approved: BadgeCheck,
};

function StatusWorkflowIndicator({ 
  currentStatus, 
  reportId 
}: { 
  currentStatus: ReconciliationStatus;
  reportId: string;
}) {
  const currentIndex = STATUS_WORKFLOW.indexOf(currentStatus);
  const progressPercentage = ((currentIndex + 1) / STATUS_WORKFLOW.length) * 100;

  return (
    <div className="space-y-3" data-testid={`workflow-indicator-${reportId}`}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Status Progress</span>
        <span className="font-medium">{Math.round(progressPercentage)}% Complete</span>
      </div>
      <Progress value={progressPercentage} className="h-2" />
      <div className="flex items-center justify-between gap-1">
        {STATUS_WORKFLOW.map((status, index) => {
          const Icon = STATUS_ICONS[status];
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div 
              key={status}
              className="flex flex-col items-center gap-1 flex-1"
              data-testid={`workflow-step-${status}`}
            >
              <div 
                className={`
                  flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors
                  ${isCurrent 
                    ? "bg-primary border-primary text-primary-foreground" 
                    : isCompleted 
                      ? "bg-green-100 border-green-500 text-green-600 dark:bg-green-900/30 dark:text-green-400" 
                      : "bg-muted border-muted-foreground/30 text-muted-foreground"
                  }
                `}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className={`text-xs text-center ${isCurrent ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                {STATUS_LABELS[status]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default function ReconciliationPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState<Settlement | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    report: Settlement;
    newStatus: ReconciliationStatus;
  } | null>(null);

  const { data: settlements = [], isLoading: settlementsLoading } = useQuery<Settlement[]>({
    queryKey: ["/api/provider-relations/settlements"],
  });

  const { data: providers = [], isLoading: providersLoading } = useQuery<Provider[]>({
    queryKey: ["/api/provider-relations/providers"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ReconciliationStatus }) => {
      const res = await apiRequest("PATCH", `/api/provider-relations/settlements/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider-relations/settlements"] });
      toast({
        title: "Status Updated",
        description: `Settlement moved to "${pendingStatusChange?.newStatus ? STATUS_LABELS[pendingStatusChange.newStatus] : 'new status'}"`,
      });
      setIsStatusConfirmOpen(false);
      setPendingStatusChange(null);
      setIsDetailOpen(false);
      setSelectedReport(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update settlement status",
        variant: "destructive",
      });
    },
  });

  const filteredReports = settlements.filter((settlement) => {
    const matchesSearch = 
      settlement.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      settlement.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      settlement.settlementNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || settlement.status === statusFilter;
    const matchesProvider = providerFilter === "all" || settlement.providerId === providerFilter;
    return matchesSearch && matchesStatus && matchesProvider;
  });

  const getStatusBadge = (status: ReconciliationStatus) => {
    const Icon = STATUS_ICONS[status];
    switch (status) {
      case "proposed":
        return (
          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 gap-1" data-testid="badge-status-proposed">
            <Icon className="w-3 h-3" />
            Proposed
          </Badge>
        );
      case "negotiating":
        return (
          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 gap-1" data-testid="badge-status-negotiating">
            <Icon className="w-3 h-3" />
            Negotiating
          </Badge>
        );
      case "agreed":
        return (
          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 gap-1" data-testid="badge-status-agreed">
            <Icon className="w-3 h-3" />
            Agreed
          </Badge>
        );
      case "signed":
        return (
          <Badge className="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 gap-1" data-testid="badge-status-signed">
            <Icon className="w-3 h-3" />
            Signed
          </Badge>
        );
      case "finance_approved":
        return (
          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 gap-1" data-testid="badge-status-finance-approved">
            <Icon className="w-3 h-3" />
            Finance Approved
          </Badge>
        );
      default:
        return null;
    }
  };

  const getNextStatus = (currentStatus: ReconciliationStatus): ReconciliationStatus | null => {
    const currentIndex = STATUS_WORKFLOW.indexOf(currentStatus);
    if (currentIndex < STATUS_WORKFLOW.length - 1) {
      return STATUS_WORKFLOW[currentIndex + 1];
    }
    return null;
  };

  const handleStatusChange = (report: Settlement, newStatus: ReconciliationStatus) => {
    setPendingStatusChange({ report, newStatus });
    setIsStatusConfirmOpen(true);
  };

  const confirmStatusChange = () => {
    if (pendingStatusChange) {
      updateStatusMutation.mutate({
        id: pendingStatusChange.report.id,
        status: pendingStatusChange.newStatus,
      });
    }
  };

  const handleCreateEvidencePack = (report: Settlement) => {
    toast({
      title: "Evidence Pack Created",
      description: `New evidence pack created for ${report.providerName}`,
    });
  };

  const formatPeriod = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[start.getMonth()]}-${months[end.getMonth()]} ${end.getFullYear()}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const proposedCount = settlements.filter(r => r.status === "proposed").length;
  const negotiatingCount = settlements.filter(r => r.status === "negotiating").length;
  const agreedCount = settlements.filter(r => r.status === "agreed").length;
  const signedCount = settlements.filter(r => r.status === "signed").length;
  const financeApprovedCount = settlements.filter(r => r.status === "finance_approved").length;
  const settledCount = signedCount + financeApprovedCount;
  const totalAmount = filteredReports.reduce((sum, r) => sum + (r.proposedAmount ? parseFloat(r.proposedAmount) : 0), 0);
  const totalDiscrepancy = filteredReports.reduce((sum, r) => sum + (r.discrepancyAmount ? parseFloat(r.discrepancyAmount) : 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Reconciliation Reports</h1>
          <p className="text-muted-foreground">
            Manage and track provider reconciliation workflow from proposal to finance approval
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" data-testid="button-export-reports">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button size="sm" className="gap-2" data-testid="button-generate-report">
            <Plus className="h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Proposed</p>
                {settlementsLoading ? (
                  <Skeleton className="h-8 w-8 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-blue-600" data-testid="text-proposed-count">{proposedCount}</p>
                )}
              </div>
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Negotiating</p>
                {settlementsLoading ? (
                  <Skeleton className="h-8 w-8 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-amber-600" data-testid="text-negotiating-count">{negotiatingCount}</p>
                )}
              </div>
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Handshake className="h-4 w-4 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Agreed</p>
                {settlementsLoading ? (
                  <Skeleton className="h-8 w-8 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-purple-600" data-testid="text-agreed-count">{agreedCount}</p>
                )}
              </div>
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <CheckCircle className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Signed</p>
                {settlementsLoading ? (
                  <Skeleton className="h-8 w-8 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-cyan-600" data-testid="text-signed-count">{signedCount}</p>
                )}
              </div>
              <div className="p-2 rounded-full bg-cyan-100 dark:bg-cyan-900/30">
                <FileSignature className="h-4 w-4 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Settled</p>
                {settlementsLoading ? (
                  <Skeleton className="h-8 w-8 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-green-600" data-testid="text-settled-count">{settledCount}</p>
                )}
              </div>
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                <BadgeCheck className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Discrepancy</p>
                {settlementsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-red-600" data-testid="text-total-discrepancy">
                    ${(totalDiscrepancy / 1000).toFixed(1)}K
                  </p>
                )}
              </div>
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
          <CardTitle>Reconciliation Reports</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
                data-testid="input-report-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="proposed">Proposed</SelectItem>
                <SelectItem value="negotiating">Negotiating</SelectItem>
                <SelectItem value="agreed">Agreed</SelectItem>
                <SelectItem value="signed">Signed</SelectItem>
                <SelectItem value="finance_approved">Finance Approved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-48" data-testid="select-provider-filter">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {providersLoading ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : providers.length === 0 ? (
                  <SelectItem value="empty" disabled>No providers</SelectItem>
                ) : (
                  providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {settlementsLoading ? (
            <LoadingSkeleton />
          ) : filteredReports.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No reconciliation reports found</p>
              <p className="text-sm">
                {searchQuery || statusFilter !== "all" || providerFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Create a new report to get started"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report ID</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Discrepancy</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Links</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow 
                    key={report.id} 
                    className="cursor-pointer hover-elevate"
                    onClick={() => {
                      setSelectedReport(report);
                      setIsDetailOpen(true);
                    }}
                    data-testid={`row-report-${report.id}`}
                  >
                    <TableCell className="font-medium">{report.settlementNumber}</TableCell>
                    <TableCell>{report.providerName}</TableCell>
                    <TableCell>{formatPeriod(report.periodStart, report.periodEnd)}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${report.proposedAmount ? parseFloat(report.proposedAmount).toLocaleString() : "0"}
                    </TableCell>
                    <TableCell className="text-right">
                      {report.discrepancyAmount && parseFloat(report.discrepancyAmount) > 0 ? (
                        <span className="text-amber-600 font-medium">
                          ${parseFloat(report.discrepancyAmount).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(report.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {report.evidencePackId && (
                          <Link href="/provider-relations/evidence-packs">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`link-evidence-pack-${report.id}`}
                            >
                              <Package className="h-4 w-4 text-primary" />
                            </Button>
                          </Link>
                        )}
                        {report.sessionId && (
                          <Link href="/provider-relations/sessions">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`link-session-${report.id}`}
                            >
                              <Users className="h-4 w-4 text-primary" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDate(report.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-actions-${report.id}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {!report.evidencePackId && (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCreateEvidencePack(report);
                              }}
                              data-testid={`action-create-evidence-${report.id}`}
                            >
                              <Package className="h-4 w-4 mr-2" />
                              Create Evidence Pack
                            </DropdownMenuItem>
                          )}
                          {!report.sessionId && (
                            <DropdownMenuItem asChild>
                              <Link href="/provider-relations/sessions" onClick={(e) => e.stopPropagation()}>
                                <Users className="h-4 w-4 mr-2" />
                                Schedule Session
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {getNextStatus(report.status) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const nextStatus = getNextStatus(report.status);
                                  if (nextStatus) {
                                    handleStatusChange(report, nextStatus);
                                  }
                                }}
                                data-testid={`action-advance-status-${report.id}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Advance to {STATUS_LABELS[getNextStatus(report.status)!]}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          {selectedReport && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedReport.settlementNumber}
                  {getStatusBadge(selectedReport.status)}
                </DialogTitle>
                <DialogDescription>
                  {selectedReport.providerName} - {formatPeriod(selectedReport.periodStart, selectedReport.periodEnd)}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                <StatusWorkflowIndicator 
                  currentStatus={selectedReport.status} 
                  reportId={selectedReport.id} 
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Proposed Amount</p>
                    <p className="text-lg font-semibold">
                      ${selectedReport.proposedAmount ? parseFloat(selectedReport.proposedAmount).toLocaleString() : "0"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Discrepancy</p>
                    <p className="text-lg font-semibold text-amber-600">
                      ${selectedReport.discrepancyAmount ? parseFloat(selectedReport.discrepancyAmount).toLocaleString() : "0"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="text-sm">{formatDate(selectedReport.createdAt)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="text-sm">{formatDate(selectedReport.updatedAt)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedReport.evidencePackId && (
                    <Badge variant="outline" className="gap-1">
                      <Package className="h-3 w-3" />
                      {selectedReport.evidencePackId}
                    </Badge>
                  )}
                  {selectedReport.sessionId && (
                    <Badge variant="outline" className="gap-1">
                      <Users className="h-3 w-3" />
                      {selectedReport.sessionId}
                    </Badge>
                  )}
                </div>
              </div>

              <DialogFooter className="flex-wrap gap-2">
                {!selectedReport.evidencePackId && (
                  <Button 
                    variant="outline" 
                    onClick={() => handleCreateEvidencePack(selectedReport)}
                    data-testid="button-detail-create-evidence"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Create Evidence Pack
                  </Button>
                )}
                {getNextStatus(selectedReport.status) && (
                  <Button
                    onClick={() => {
                      const nextStatus = getNextStatus(selectedReport.status);
                      if (nextStatus) {
                        handleStatusChange(selectedReport, nextStatus);
                      }
                    }}
                    data-testid="button-detail-advance-status"
                  >
                    Advance to {STATUS_LABELS[getNextStatus(selectedReport.status)!]}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isStatusConfirmOpen} onOpenChange={setIsStatusConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatusChange && (
                <>
                  Are you sure you want to move{" "}
                  <strong>{pendingStatusChange.report.settlementNumber}</strong> from{" "}
                  <strong>{STATUS_LABELS[pendingStatusChange.report.status]}</strong> to{" "}
                  <strong>{STATUS_LABELS[pendingStatusChange.newStatus]}</strong>?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-status-change">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmStatusChange}
              disabled={updateStatusMutation.isPending}
              data-testid="button-confirm-status-change"
            >
              {updateStatusMutation.isPending ? "Updating..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
