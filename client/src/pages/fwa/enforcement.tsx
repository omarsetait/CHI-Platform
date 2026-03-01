import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  Eye,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Building2,
  Scale,
  Gavel,
  FileWarning,
  DollarSign,
  Ban,
  RefreshCw,
  Circle,
  ExternalLink,
  User,
  ShieldCheck,
} from "lucide-react";
import type { EnforcementCase, ProviderDirectory } from "@shared/schema";

interface ProviderOption {
  id: string;
  name: string;
  npi: string;
  specialty: string;
  organization: string | null;
  city: string | null;
  region: string | null;
  contractStatus: string | null;
}

const STATUS_WORKFLOW = [
  { key: "finding", label: "Finding", icon: FileWarning },
  { key: "warning_issued", label: "Warning", icon: AlertTriangle },
  { key: "corrective_action", label: "Corrective Action", icon: RefreshCw },
  { key: "penalty_proposed", label: "Penalty Proposed", icon: Scale },
  { key: "penalty_applied", label: "Penalty Applied", icon: Gavel },
  { key: "appeal_submitted", label: "Appeal", icon: FileText },
  { key: "appeal_review", label: "Appeal Review", icon: Search },
  { key: "resolved", label: "Resolved", icon: CheckCircle },
];

const statusColors: Record<string, string> = {
  finding: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  warning_issued: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  corrective_action: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  penalty_proposed: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  penalty_applied: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  appeal_submitted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  appeal_review: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

const severityColors: Record<string, string> = {
  minor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  moderate: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  major: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const penaltyIcons: Record<string, any> = {
  warning: AlertTriangle,
  fine: DollarSign,
  suspension: Ban,
  exclusion: XCircle,
};

const insurerCompliance = [
  { insurer: "Bupa Arabia", responseTimeDays: 3.2, docQuality: 92, cooperation: "Excellent", openCases: 8 },
  { insurer: "Tawuniya", responseTimeDays: 4.1, docQuality: 88, cooperation: "Good", openCases: 6 },
  { insurer: "Medgulf", responseTimeDays: 5.8, docQuality: 76, cooperation: "Good", openCases: 4 },
  { insurer: "GIG Saudi (AXA)", responseTimeDays: 3.5, docQuality: 90, cooperation: "Excellent", openCases: 3 },
  { insurer: "Gulf Union", responseTimeDays: 7.2, docQuality: 68, cooperation: "Needs Improvement", openCases: 5 },
  { insurer: "Walaa", responseTimeDays: 4.8, docQuality: 82, cooperation: "Good", openCases: 2 },
  { insurer: "Arabian Shield", responseTimeDays: 6.1, docQuality: 71, cooperation: "Needs Improvement", openCases: 3 },
  { insurer: "ACIG", responseTimeDays: 4.5, docQuality: 85, cooperation: "Good", openCases: 2 },
];

/** Map each workflow stage key to its corresponding date field on EnforcementCase */
const stageDateFields: Record<string, keyof EnforcementCase> = {
  finding: "findingDate",
  warning_issued: "warningIssuedDate",
  corrective_action: "correctiveActionDueDate",
  penalty_proposed: "penaltyAppliedDate",    // penalty proposed uses penalty applied date as closest available
  penalty_applied: "penaltyAppliedDate",
  appeal_submitted: "appealSubmittedDate",
  appeal_review: "appealDecisionDate",
  resolved: "resolutionDate",
};

export default function Enforcement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<EnforcementCase | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newCase, setNewCase] = useState({
    providerId: "",
    violationId: "",
    violationTitle: "",
    severity: "major" as "minor" | "moderate" | "major" | "critical",
    findings: "",
  });
  const { toast } = useToast();

  // Fetch providers from Provider Directory for dropdown
  const { data: providers } = useQuery<ProviderOption[]>({
    queryKey: ["/api/fwa/chi/providers"],
  });

  const { data: enforcementCases, isLoading } = useQuery<EnforcementCase[]>({
    queryKey: ["/api/fwa/chi/enforcement-cases"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newCase) => {
      const response = await apiRequest("POST", "/api/fwa/chi/enforcement-cases", {
        providerId: data.providerId,
        violationCode: data.violationId || "CHI-VIO-NEW",
        violationTitle: data.violationTitle,
        severity: data.severity,
        description: data.findings || "Enforcement case initiated",
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/chi/enforcement-cases"] });
      setCreateOpen(false);
      setNewCase({ providerId: "", violationId: "", violationTitle: "", severity: "major", findings: "" });
      toast({ title: "Success", description: "Enforcement case created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const cases = enforcementCases || [];

  const filteredCases = cases.filter((c) => {
    const matchesSearch = c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.violationTitle || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesSeverity = severityFilter === "all" || c.severity === severityFilter;
    const matchesStage = !selectedStage || c.status === selectedStage;
    return matchesSearch && matchesStatus && matchesSeverity && matchesStage;
  });

  const stats = {
    total: cases.length,
    active: cases.filter(c => c.status && !["resolved", "closed"].includes(c.status)).length,
    pendingAction: cases.filter(c => c.status && ["finding", "warning_issued", "corrective_action"].includes(c.status)).length,
    appeals: cases.filter(c => c.status && c.status.includes("appeal")).length,
    totalFines: cases.reduce((sum, c) => sum + Number(c.fineAmount || 0), 0),
  };

  const handleViewCase = (enfCase: EnforcementCase) => {
    setSelectedCase(enfCase);
    setDetailOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Enforcement Cases</h1>
          <p className="text-muted-foreground">
            Track enforcement actions, penalties, and compliance escalation for inappropriate care findings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" data-testid="button-export">
            <FileText className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={() => setCreateOpen(true)} data-testid="button-new-case">
            <Plus className="w-4 h-4 mr-2" />
            New Case
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Scale className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="stat-total">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Cases</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Clock className="w-5 h-5 text-amber-600" />
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">{stats.active}</Badge>
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="stat-active">{stats.active}</p>
            <p className="text-xs text-muted-foreground">Active Cases</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">{stats.pendingAction}</Badge>
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="stat-pending">{stats.pendingAction}</p>
            <p className="text-xs text-muted-foreground">Pending Action</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="stat-appeals">{stats.appeals}</p>
            <p className="text-xs text-muted-foreground">Under Appeal</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="stat-fines">SAR {(stats.totalFines / 1000).toFixed(0)}K</p>
            <p className="text-xs text-muted-foreground">Total Fines Issued</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Gavel className="w-5 h-5 text-primary" />
            Enforcement Workflow Stages
          </CardTitle>
          <CardDescription>
            Cases progress through stages: Finding, Warning, Corrective Action, Penalty, Appeal, Resolution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between overflow-x-auto pb-2">
            {STATUS_WORKFLOW.map((stage, index) => {
              const Icon = stage.icon;
              const count = cases.filter(c => c.status === stage.key).length;
              const isSelected = selectedStage === stage.key;
              return (
                <div key={stage.key} className="flex items-center">
                  <button
                    type="button"
                    className="flex flex-col items-center min-w-[100px] cursor-pointer group"
                    onClick={() => setSelectedStage(isSelected ? null : stage.key)}
                    data-testid={`stage-filter-${stage.key}`}
                  >
                    <div className={`p-3 rounded-full transition-all border-2 ${
                      isSelected
                        ? "bg-blue-100 border-blue-500 dark:bg-blue-900 dark:border-blue-400"
                        : count > 0
                          ? "bg-primary/10 border-transparent group-hover:border-primary/30"
                          : "bg-muted border-transparent group-hover:border-muted-foreground/20"
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        isSelected
                          ? "text-blue-600 dark:text-blue-400"
                          : count > 0
                            ? "text-primary"
                            : "text-muted-foreground"
                      }`} />
                    </div>
                    <p className={`text-xs font-medium mt-2 ${isSelected ? "text-blue-600 dark:text-blue-400" : ""}`}>{stage.label}</p>
                    <Badge
                      variant={isSelected ? "default" : "outline"}
                      className={`mt-1 ${isSelected ? "bg-blue-600 text-white" : ""}`}
                      data-testid={`stage-count-${stage.key}`}
                    >
                      {count}
                    </Badge>
                  </button>
                  {index < STATUS_WORKFLOW.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground mx-2" />
                  )}
                </div>
              );
            })}
          </div>
          {selectedStage && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <span>Filtering by: <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{STATUS_WORKFLOW.find(s => s.key === selectedStage)?.label}</Badge></span>
              <Button variant="ghost" size="sm" onClick={() => setSelectedStage(null)} className="text-xs h-6 px-2">
                Clear filter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search cases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUS_WORKFLOW.map((s) => (
                  <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-severity">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="minor">Minor</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="major">Major</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : filteredCases.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Scale className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No enforcement cases found. Cases will appear here when violations are detected and enforcement actions are initiated.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case #</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Violation</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Penalty</TableHead>
                <TableHead>Investigator</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCases.map((enfCase) => {
                const PenaltyIcon = enfCase.penaltyType ? penaltyIcons[enfCase.penaltyType] : null;
                return (
                  <TableRow key={enfCase.id} data-testid={`row-case-${enfCase.id}`}>
                    <TableCell className="font-mono font-medium">{enfCase.caseNumber}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span>{enfCase.providerName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{enfCase.violationCode}</p>
                        <p className="text-xs text-muted-foreground max-w-[200px] truncate">{enfCase.violationTitle}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={severityColors[enfCase.severity || "minor"]}>{enfCase.severity || "N/A"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[enfCase.status || "finding"]}>
                        {(enfCase.status || "finding").replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {enfCase.fineAmount ? (
                        <div className="flex items-center gap-1">
                          {PenaltyIcon && <PenaltyIcon className="w-4 h-4 text-muted-foreground" />}
                          <span className="text-sm">SAR {Number(enfCase.fineAmount).toLocaleString()}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{enfCase.assignedInvestigator || "-"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleViewCase(enfCase)} data-testid={`button-view-case-${enfCase.id}`}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Insurer Compliance Scorecards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Insurer Compliance Scorecards
          </CardTitle>
          <CardDescription>
            Tracks insurer cooperation with CHI enforcement requests, including response times, documentation quality, and overall compliance ratings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Insurer</TableHead>
                <TableHead>Avg Response Time (days)</TableHead>
                <TableHead>Documentation Quality</TableHead>
                <TableHead>Cooperation Rating</TableHead>
                <TableHead className="text-right">Open Cases</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {insurerCompliance.map((row) => (
                <TableRow key={row.insurer} data-testid={`insurer-row-${row.insurer.replace(/\s+/g, "-").toLowerCase()}`}>
                  <TableCell className="font-medium">{row.insurer}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 font-medium text-sm ${
                      row.responseTimeDays < 4
                        ? "text-green-600 dark:text-green-400"
                        : row.responseTimeDays <= 6
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-red-600 dark:text-red-400"
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        row.responseTimeDays < 4
                          ? "bg-green-500"
                          : row.responseTimeDays <= 6
                            ? "bg-amber-500"
                            : "bg-red-500"
                      }`} />
                      {row.responseTimeDays}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Progress value={row.docQuality} className="h-2 flex-1 max-w-[120px]" />
                      <span className="text-sm text-muted-foreground w-8">{row.docQuality}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      row.cooperation === "Excellent"
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : row.cooperation === "Good"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }>
                      {row.cooperation}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{row.openCases}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedCase && (() => {
            // Determine which stages are completed, current, or future
            const currentStageIndex = STATUS_WORKFLOW.findIndex(s => s.key === selectedCase.status);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <Scale className="w-5 h-5" />
                    <span className="font-mono">{selectedCase.caseNumber}</span>
                  </DialogTitle>
                  <DialogDescription>
                    Enforcement case against {selectedCase.providerName}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-5">
                  {/* Case narrative header */}
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">{selectedCase.violationTitle || selectedCase.violationCode}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{selectedCase.violationCode}</p>
                    </div>
                    <Badge className={`text-sm px-3 py-1 ${severityColors[selectedCase.severity || "minor"]}`}>
                      {(selectedCase.severity || "N/A").toUpperCase()}
                    </Badge>
                  </div>

                  {/* SAR fine amount card */}
                  {selectedCase.fineAmount && (
                    <Card className="border-orange-200 dark:border-orange-800">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Penalty Amount</p>
                            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                              SAR {Number(selectedCase.fineAmount).toLocaleString()}
                            </p>
                          </div>
                          <DollarSign className="w-8 h-8 text-orange-400 opacity-60" />
                        </div>
                        {(selectedCase.metadata as any)?.suspensionDays && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-sm text-muted-foreground">Suspension Period</p>
                            <p className="text-lg font-semibold">{(selectedCase.metadata as any).suspensionDays} days</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Description */}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{selectedCase.description}</p>
                  </div>

                  {/* Evidence summary */}
                  {selectedCase.evidenceSummary && (
                    <div className="p-4 bg-muted/50 rounded-lg border">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Evidence Summary</p>
                      <p className="text-sm">{selectedCase.evidenceSummary}</p>
                    </div>
                  )}

                  {/* Case progression timeline */}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-3">Case Progression</p>
                    <div className="relative pl-6">
                      {STATUS_WORKFLOW.map((stage, index) => {
                        const dateField = stageDateFields[stage.key];
                        const dateValue = dateField ? (selectedCase as any)[dateField] : null;
                        const isCompleted = index < currentStageIndex;
                        const isCurrent = index === currentStageIndex;
                        const isFuture = index > currentStageIndex;
                        const isLast = index === STATUS_WORKFLOW.length - 1;

                        return (
                          <div key={stage.key} className="relative flex items-start gap-3 pb-4" data-testid={`timeline-stage-${stage.key}`}>
                            {/* Vertical line connecting stages */}
                            {!isLast && (
                              <div className={`absolute left-[11px] top-6 w-0.5 h-[calc(100%-12px)] ${
                                isCompleted ? "bg-green-400" : isCurrent ? "bg-blue-400" : "bg-gray-200 dark:bg-gray-700"
                              }`} />
                            )}
                            {/* Stage icon */}
                            <div className="relative z-10 flex-shrink-0">
                              {isCompleted ? (
                                <CheckCircle className="w-6 h-6 text-green-500" />
                              ) : isCurrent ? (
                                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                                  <Circle className="w-3 h-3 text-white fill-white" />
                                </div>
                              ) : (
                                <Circle className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                              )}
                            </div>
                            {/* Stage details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-medium ${
                                  isCompleted ? "text-green-700 dark:text-green-400" :
                                  isCurrent ? "text-blue-700 dark:text-blue-400" :
                                  "text-muted-foreground"
                                }`}>
                                  {stage.label}
                                </p>
                                {isCurrent && (
                                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-xs px-2 py-0">
                                    Current
                                  </Badge>
                                )}
                              </div>
                              {(isCompleted || isCurrent) && dateValue && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {new Date(dateValue).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Assigned investigator */}
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Assigned Investigator</p>
                      <p className="text-sm font-medium">{selectedCase.assignedInvestigator || "Unassigned"}</p>
                    </div>
                  </div>

                  {/* Related links */}
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" size="sm" asChild>
                      <a href="/fwa/high-risk-entities" data-testid="link-view-provider">
                        <Building2 className="w-4 h-4 mr-2" />
                        View Provider
                        <ExternalLink className="w-3 h-3 ml-1.5 opacity-60" />
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href="/fwa/flagged-claims" data-testid="link-view-flagged-claims">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        View Flagged Claims
                        <ExternalLink className="w-3 h-3 ml-1.5 opacity-60" />
                      </a>
                    </Button>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button variant="outline" onClick={() => setDetailOpen(false)} data-testid="button-close-dialog">Close</Button>
                    <Button data-testid="button-advance-stage">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Advance Stage
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Enforcement Case</DialogTitle>
            <DialogDescription>
              Initiate a new enforcement action against a provider
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider *</Label>
              <Select
                value={newCase.providerId}
                onValueChange={(value) => setNewCase({ ...newCase, providerId: value })}
              >
                <SelectTrigger data-testid="select-provider">
                  <SelectValue placeholder="Select a provider from directory" />
                </SelectTrigger>
                <SelectContent>
                  {providers && providers.length > 0 ? (
                    providers.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          <span>{provider.name}</span>
                          {provider.city && (
                            <span className="text-xs text-muted-foreground">({provider.city})</span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-providers" disabled>
                      No providers in directory
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {providers && providers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Add providers to the Provider Directory first
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="violationId">Violation Code</Label>
                <Input
                  id="violationId"
                  placeholder="CHI-FWA-101"
                  value={newCase.violationId}
                  onChange={(e) => setNewCase({ ...newCase, violationId: e.target.value })}
                  data-testid="input-violation-id"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="violationTitle">Violation Title</Label>
                <Input
                  id="violationTitle"
                  placeholder="Upcoding of Services"
                  value={newCase.violationTitle}
                  onChange={(e) => setNewCase({ ...newCase, violationTitle: e.target.value })}
                  data-testid="input-violation-title"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select
                value={newCase.severity}
                onValueChange={(value) => setNewCase({ ...newCase, severity: value as typeof newCase.severity })}
              >
                <SelectTrigger data-testid="select-severity">
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="major">Major</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="findings">Initial Findings (Description) *</Label>
              <Textarea
                id="findings"
                placeholder="Describe the violation and supporting evidence..."
                value={newCase.findings}
                onChange={(e) => setNewCase({ ...newCase, findings: e.target.value })}
                rows={4}
                data-testid="textarea-findings"
              />
            </div>
            {(!newCase.providerId || !newCase.findings) && (
              <p className="text-sm text-destructive">All fields marked with * are required</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} data-testid="button-cancel-create">
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate(newCase)}
                disabled={createMutation.isPending || !newCase.providerId.trim() || !newCase.findings.trim()}
                data-testid="button-submit-case"
              >
                {createMutation.isPending ? "Creating..." : "Create Case"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
