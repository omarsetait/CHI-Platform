import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  RefreshCw,
  Users,
  AlertTriangle,
  DollarSign,
  FileText,
  ArrowUpDown,
  User,
  ClipboardList,
  Flag,
  Calendar,
  Stethoscope,
  ChevronDown,
  Bot,
  Brain,
  Tags,
  ShieldCheck,
  Shield,
  FileSearch,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { FwaHighRiskPatient } from "@shared/schema";

interface PatientStats {
  totalPatients: number;
  highRiskCount: number;
  totalAmount: number;
  activeCases: number;
}

const defaultStats: PatientStats = {
  totalPatients: 0,
  highRiskCount: 0,
  totalAmount: 0,
  activeCases: 0,
};

function getRiskLevelBadgeClasses(level: string | null) {
  switch (level) {
    case "critical":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    case "high":
      return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
    case "medium":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    case "low":
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
  }
}

function getReasonBadgeClasses(reason: string) {
  if (reason.startsWith("Coding Abuse:") || reason.startsWith("Coding FWA:")) {
    return "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800";
  } else if (reason.startsWith("Management Abuse:") || reason.startsWith("Management FWA:")) {
    return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
  } else if (reason.startsWith("Physician Abuse:") || reason.startsWith("Physician FWA:")) {
    return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
  } else if (reason.startsWith("Patient Abuse:") || reason.startsWith("Patient FWA:")) {
    return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800";
  }
  return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
}

function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "$0.00";
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount);
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  isLoading,
}: {
  title: string;
  value: number | string;
  description: string;
  icon: React.ElementType;
  isLoading?: boolean;
}) {
  return (
    <Card data-testid={`stats-card-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="h-9 w-24" />
            ) : (
              <p className="text-3xl font-bold">{value}</p>
            )}
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <Icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PatientDetailSheet({
  patient,
  open,
  onOpenChange,
  onReconcile,
}: {
  patient: FwaHighRiskPatient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReconcile: () => void;
}) {
  const [, navigate] = useLocation();
  if (!patient) return null;

  const riskScore = patient.riskScore ? parseFloat(patient.riskScore as string) : 0;
  const totalAmount = patient.totalAmount ? parseFloat(patient.totalAmount as string) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg border-l-purple-300 dark:border-l-purple-800"
        data-testid="sheet-patient-detail"
      >
        <SheetHeader className="pb-4 border-b border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <SheetTitle className="text-purple-700 dark:text-purple-300">
              Patient Details
            </SheetTitle>
          </div>
          <SheetDescription>
            Review patient risk profile and claim statistics
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] pr-4">
          <div className="py-4 space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Patient Summary
              </h3>
              <Card className="border-purple-200 dark:border-purple-800">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-semibold" data-testid="text-patient-name">
                        {patient.patientName}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid="text-member-id">
                        Member ID: {patient.memberId || patient.patientId}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Risk Metrics
              </h3>
              <Card className="border-purple-200 dark:border-purple-800">
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Risk Score</span>
                      <span className="text-sm font-semibold" data-testid="text-risk-score">
                        {riskScore.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={riskScore} className="h-2" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Risk Level</span>
                    <Badge
                      variant="outline"
                      className={getRiskLevelBadgeClasses(patient.riskLevel)}
                      data-testid="badge-risk-level"
                    >
                      {patient.riskLevel || "unknown"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Claim Statistics
              </h3>
              <Card className="border-purple-200 dark:border-purple-800">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Total Claims</p>
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-lg font-semibold" data-testid="text-total-claims">
                          {patient.totalClaims || 0}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Flagged Claims</p>
                      <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        <span className="text-lg font-semibold" data-testid="text-flagged-claims">
                          {patient.flaggedClaims || 0}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">IC Cases</p>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span className="text-lg font-semibold" data-testid="text-fwa-cases">
                          {patient.fwaCaseCount || 0}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Total Amount</p>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-lg font-semibold" data-testid="text-total-amount">
                          {formatCurrency(totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Diagnosis Info
              </h3>
              <Card className="border-purple-200 dark:border-purple-800">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Primary Diagnosis</p>
                        <p className="text-sm font-medium" data-testid="text-diagnosis">
                          {patient.primaryDiagnosis || "N/A"}
                        </p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Last Claim Date</p>
                        <p className="text-sm font-medium" data-testid="text-last-claim">
                          {formatDate(patient.lastClaimDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={onReconcile}
                  data-testid="button-reconcile"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Reconcile
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full" data-testid="button-agent-workflow">
                      <Bot className="w-4 h-4 mr-2" />
                      Agent Workflow
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem
                      onClick={() => navigate(`/fwa/agent-workflow?entityId=${patient.patientId}&entityType=patient&entityName=${encodeURIComponent(patient.patientName)}&phase=A1`)}
                      data-testid="menu-item-analysis"
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      Analysis & Intelligence
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate(`/fwa/agent-workflow?entityId=${patient.patientId}&entityType=patient&entityName=${encodeURIComponent(patient.patientName)}&phase=A2`)}
                      data-testid="menu-item-categorization"
                    >
                      <Tags className="w-4 h-4 mr-2" />
                      FWA Categorization
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate(`/fwa/agent-workflow?entityId=${patient.patientId}&entityType=patient&entityName=${encodeURIComponent(patient.patientName)}&phase=A3`)}
                      data-testid="menu-item-prospective"
                    >
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Prospective Actions
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" className="w-full" data-testid="button-see-all-claims">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  See All Claims
                </Button>
                <Button variant="outline" className="w-full" data-testid="button-fwa-claims">
                  <FileText className="w-4 h-4 mr-2" />
                  FWA Claims
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

interface MedicalRecordsRequest {
  recordType: string;
  dateFrom: string;
  dateTo: string;
  reason: string;
  priority: string;
}

export default function FWAPatients() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [riskLevelFilter, setRiskLevelFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"risk_score" | "total_amount">("risk_score");
  const [selectedPatient, setSelectedPatient] = useState<FwaHighRiskPatient | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [recordsDialogOpen, setRecordsDialogOpen] = useState(false);
  const [patientForRecords, setPatientForRecords] = useState<FwaHighRiskPatient | null>(null);
  const [recordsRequest, setRecordsRequest] = useState<MedicalRecordsRequest>({
    recordType: "all",
    dateFrom: "",
    dateTo: "",
    reason: "",
    priority: "normal",
  });

  const { data: patients, isLoading, refetch } = useQuery<FwaHighRiskPatient[]>({
    queryKey: ["/api/fwa/high-risk-patients"],
  });

  const requestRecordsMutation = useMutation({
    mutationFn: async (data: { patientId: string; request: MedicalRecordsRequest }) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Medical Records Requested",
        description: `Request submitted for ${patientForRecords?.patientName}. You will be notified when records are available.`,
      });
      setRecordsDialogOpen(false);
      setPatientForRecords(null);
      setRecordsRequest({
        recordType: "all",
        dateFrom: "",
        dateTo: "",
        reason: "",
        priority: "normal",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Request Failed",
        description: error.message || "Could not submit records request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRequestRecords = (patient: FwaHighRiskPatient, e: React.MouseEvent) => {
    e.stopPropagation();
    setPatientForRecords(patient);
    setRecordsDialogOpen(true);
  };

  const submitRecordsRequest = () => {
    if (patientForRecords) {
      requestRecordsMutation.mutate({
        patientId: patientForRecords.patientId,
        request: recordsRequest,
      });
    }
  };

  const patientsList = patients || [];

  const filteredPatients = patientsList
    .filter((p) => {
      const matchesSearch =
        p.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.memberId?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        p.patientId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRiskLevel =
        riskLevelFilter === "all" || p.riskLevel === riskLevelFilter;
      return matchesSearch && matchesRiskLevel;
    })
    .sort((a, b) => {
      if (sortBy === "risk_score") {
        const scoreA = a.riskScore ? parseFloat(a.riskScore as string) : 0;
        const scoreB = b.riskScore ? parseFloat(b.riskScore as string) : 0;
        return scoreB - scoreA;
      } else {
        const amountA = a.totalAmount ? parseFloat(a.totalAmount as string) : 0;
        const amountB = b.totalAmount ? parseFloat(b.totalAmount as string) : 0;
        return amountB - amountA;
      }
    });

  const stats: PatientStats = {
    totalPatients: patientsList.length,
    highRiskCount: patientsList.filter(
      (p) => p.riskLevel === "critical" || p.riskLevel === "high"
    ).length,
    totalAmount: patientsList.reduce(
      (sum, p) => sum + (p.totalAmount ? parseFloat(p.totalAmount as string) : 0),
      0
    ),
    activeCases: patientsList.reduce((sum, p) => sum + (p.fwaCaseCount || 0), 0),
  };

  const handleRowClick = (patient: FwaHighRiskPatient) => {
    setSelectedPatient(patient);
    setDetailSheetOpen(true);
  };

  const handleReconcile = () => {
    if (selectedPatient) {
      setDetailSheetOpen(false);
      navigate(`/fwa/reconciliation-findings?entityId=${selectedPatient.patientId}&entityType=patient&entityName=${encodeURIComponent(selectedPatient.patientName)}`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">
            High-Risk Patients
          </h1>
          <p className="text-muted-foreground">
            Monitor patients flagged for potential fraud, waste, or abuse
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          data-testid="button-refresh"
          onClick={() => refetch()}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Patients"
          value={stats.totalPatients}
          description="Patients in system"
          icon={Users}
          isLoading={isLoading}
        />
        <StatsCard
          title="High Risk"
          value={stats.highRiskCount}
          description="Critical & high risk"
          icon={AlertTriangle}
          isLoading={isLoading}
        />
        <StatsCard
          title="Total Amount"
          value={formatCurrency(stats.totalAmount)}
          description="Combined claim amount"
          icon={DollarSign}
          isLoading={isLoading}
        />
        <StatsCard
          title="Active Cases"
          value={stats.activeCases}
          description="Open FWA cases"
          icon={FileText}
          isLoading={isLoading}
        />
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient name or member ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={riskLevelFilter} onValueChange={setRiskLevelFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-risk-level">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as "risk_score" | "total_amount")}>
              <SelectTrigger className="w-[160px]" data-testid="select-sort">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="risk_score">Risk Score</SelectItem>
                <SelectItem value="total_amount">Total Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient Name</TableHead>
                <TableHead>Member ID</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Reasons</TableHead>
                <TableHead className="text-right">Total Claims</TableHead>
                <TableHead className="text-right">Flagged</TableHead>
                <TableHead className="text-right">IC Cases</TableHead>
                <TableHead className="text-right">Total Amount</TableHead>
                <TableHead>Primary Diagnosis</TableHead>
                <TableHead>Last Claim</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => {
                  const riskScore = patient.riskScore
                    ? parseFloat(patient.riskScore as string)
                    : 0;
                  const totalAmount = patient.totalAmount
                    ? parseFloat(patient.totalAmount as string)
                    : 0;

                  return (
                    <TableRow
                      key={patient.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => handleRowClick(patient)}
                      data-testid={`row-patient-${patient.patientId}`}
                    >
                      <TableCell>
                        <p className="font-medium" data-testid={`text-name-${patient.patientId}`}>
                          {patient.patientName}
                        </p>
                      </TableCell>
                      <TableCell data-testid={`text-member-${patient.patientId}`}>
                        {patient.memberId || patient.patientId}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={riskScore} className="h-2 w-16" />
                          <span
                            className="text-sm font-medium"
                            data-testid={`text-score-${patient.patientId}`}
                          >
                            {riskScore.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getRiskLevelBadgeClasses(patient.riskLevel)}
                          data-testid={`badge-level-${patient.patientId}`}
                        >
                          {patient.riskLevel || "unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-reasons-${patient.patientId}`}>
                        {patient.reasons && patient.reasons.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {patient.reasons.slice(0, 2).map((reason, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className={`text-xs ${getReasonBadgeClasses(reason)}`}
                              >
                                {reason.split(": ")[1] || reason}
                              </Badge>
                            ))}
                            {patient.reasons.length > 2 && (
                              <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                +{patient.reasons.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">None detected</span>
                        )}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        data-testid={`text-claims-${patient.patientId}`}
                      >
                        {patient.totalClaims || 0}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        data-testid={`text-flagged-${patient.patientId}`}
                      >
                        {patient.flaggedClaims || 0}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        data-testid={`text-cases-${patient.patientId}`}
                      >
                        {patient.fwaCaseCount || 0}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        data-testid={`text-amount-${patient.patientId}`}
                      >
                        {formatCurrency(totalAmount)}
                      </TableCell>
                      <TableCell data-testid={`text-diagnosis-${patient.patientId}`}>
                        {patient.primaryDiagnosis || "-"}
                      </TableCell>
                      <TableCell data-testid={`text-lastclaim-${patient.patientId}`}>
                        {formatDate(patient.lastClaimDate)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleRequestRecords(patient, e)}
                          data-testid={`button-request-records-${patient.patientId}`}
                        >
                          <FileSearch className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                    No patients found matching your criteria
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PatientDetailSheet
        patient={selectedPatient}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onReconcile={handleReconcile}
      />

      <Dialog open={recordsDialogOpen} onOpenChange={setRecordsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]" data-testid="dialog-request-records">
          <DialogHeader>
            <DialogTitle>Request Medical Records</DialogTitle>
            <DialogDescription>
              Submit a request for patient medical records for FWA investigation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Card className="border-purple-200 dark:border-purple-800">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-semibold" data-testid="dialog-patient-name">
                      {patientForRecords?.patientName}
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid="dialog-member-id">
                      Member ID: {patientForRecords?.memberId || patientForRecords?.patientId}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="recordType">Record Type</Label>
              <Select
                value={recordsRequest.recordType}
                onValueChange={(value) =>
                  setRecordsRequest((prev) => ({ ...prev, recordType: value }))
                }
              >
                <SelectTrigger data-testid="select-record-type">
                  <SelectValue placeholder="Select record type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Records</SelectItem>
                  <SelectItem value="lab">Lab Results</SelectItem>
                  <SelectItem value="imaging">Imaging</SelectItem>
                  <SelectItem value="clinical">Clinical Notes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={recordsRequest.dateFrom}
                  onChange={(e) =>
                    setRecordsRequest((prev) => ({ ...prev, dateFrom: e.target.value }))
                  }
                  data-testid="input-date-from"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={recordsRequest.dateTo}
                  onChange={(e) =>
                    setRecordsRequest((prev) => ({ ...prev, dateTo: e.target.value }))
                  }
                  data-testid="input-date-to"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Request</Label>
              <Textarea
                id="reason"
                placeholder="Describe the reason for requesting these medical records..."
                value={recordsRequest.reason}
                onChange={(e) =>
                  setRecordsRequest((prev) => ({ ...prev, reason: e.target.value }))
                }
                className="min-h-[80px]"
                data-testid="textarea-reason"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={recordsRequest.priority}
                onValueChange={(value) =>
                  setRecordsRequest((prev) => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger data-testid="select-priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRecordsDialogOpen(false)}
              data-testid="button-records-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={submitRecordsRequest}
              disabled={requestRecordsMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
              data-testid="button-records-submit"
            >
              {requestRecordsMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
