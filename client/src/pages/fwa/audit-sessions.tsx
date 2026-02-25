import { useState, useRef } from "react";
import html2pdf from "html2pdf.js";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Plus,
  Eye,
  Calendar,
  Building2,
  Users,
  MapPin,
  ClipboardCheck,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Trash2,
  AlertCircle,
  Shield,
  FileWarning,
  Loader2,
  Download,
  Gavel,
} from "lucide-react";
import type { AuditSession, AuditFinding, AuditChecklist } from "@shared/schema";

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  follow_up_required: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  report_pending: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const auditTypeColors: Record<string, string> = {
  routine_inspection: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  risk_based_audit: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  complaint_investigation: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  follow_up_audit: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  desk_review: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  site_visit: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
};

export default function AuditSessions() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedSession, setSelectedSession] = useState<AuditSession | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [newSession, setNewSession] = useState({
    providerId: "",
    providerName: "",
    type: "risk_based_audit" as "routine_inspection" | "risk_based_audit" | "complaint_investigation" | "follow_up_audit" | "desk_review" | "site_visit",
    scope: "",
    scheduledDate: "",
    location: "",
    leadAuditor: "",
  });
  const [findingDetailOpen, setFindingDetailOpen] = useState(false);
  const [selectedFinding, setSelectedFinding] = useState<AuditFinding | null>(null);
  const [claimSearchQuery, setClaimSearchQuery] = useState("");
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const reportContentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: auditSessions, isLoading } = useQuery<AuditSession[]>({
    queryKey: ["/api/fwa/chi/audit-sessions"],
  });

  const { data: findings, isLoading: findingsLoading, refetch: refetchFindings } = useQuery<AuditFinding[]>({
    queryKey: ["/api/fwa/chi/audit-sessions", selectedSession?.id, "findings"],
    queryFn: async () => {
      if (!selectedSession?.id) return [];
      const res = await fetch(`/api/fwa/chi/audit-sessions/${selectedSession.id}/findings`);
      if (!res.ok) throw new Error('Failed to fetch findings');
      return res.json();
    },
    enabled: !!selectedSession?.id && detailOpen,
  });

  const { data: checklists, isLoading: checklistsLoading, refetch: refetchChecklists } = useQuery<AuditChecklist[]>({
    queryKey: ["/api/fwa/chi/audit-sessions", selectedSession?.id, "checklists"],
    queryFn: async () => {
      if (!selectedSession?.id) return [];
      const res = await fetch(`/api/fwa/chi/audit-sessions/${selectedSession.id}/checklists`);
      if (!res.ok) throw new Error('Failed to fetch checklists');
      return res.json();
    },
    enabled: !!selectedSession?.id && detailOpen,
  });

  const { data: searchedClaims, isLoading: claimsLoading } = useQuery<any[]>({
    queryKey: ["/api/claims", "search", claimSearchQuery],
    queryFn: async () => {
      if (!claimSearchQuery || claimSearchQuery.length < 2) return [];
      const res = await fetch(`/api/claims?search=${encodeURIComponent(claimSearchQuery)}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: claimSearchQuery.length >= 2 && findingDetailOpen,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newSession) => {
      const response = await apiRequest("POST", "/api/fwa/chi/audit-sessions", {
        ...data,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate).toISOString() : new Date().toISOString(),
        auditTeam: [{ name: data.leadAuditor, role: "Lead Auditor" }],
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/chi/audit-sessions"] });
      setCreateOpen(false);
      setNewSession({ providerId: "", providerName: "", type: "risk_based_audit", scope: "", scheduledDate: "", location: "", leadAuditor: "" });
      toast({ title: "Success", description: "Audit session scheduled successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createFindingMutation = useMutation({
    mutationFn: async (data: Partial<AuditFinding>) => {
      const res = await apiRequest("POST", "/api/fwa/chi/audit-findings", data);
      return res.json();
    },
    onSuccess: () => {
      refetchFindings();
      toast({ title: "Success", description: "Finding created" });
    },
  });

  const initChecklistsMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await apiRequest("POST", `/api/fwa/chi/audit-sessions/${sessionId}/checklists/initialize`, { category: "all" });
      return res.json();
    },
    onSuccess: () => {
      refetchChecklists();
      toast({ title: "Success", description: "Checklists initialized" });
    },
  });

  const updateChecklistMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AuditChecklist> }) => {
      const res = await apiRequest("PATCH", `/api/fwa/chi/audit-checklists/${id}`, data);
      return res.json();
    },
    onSuccess: () => refetchChecklists(),
  });

  const updateFindingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AuditFinding> }) => {
      const res = await apiRequest("PATCH", `/api/fwa/chi/audit-findings/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      refetchFindings();
      toast({ title: "Success", description: "Finding updated" });
    },
  });

  const updateSessionStatusMutation = useMutation({
    mutationFn: async ({ id, status, startTime, endTime }: { id: string; status: string; startTime?: string; endTime?: string }) => {
      const updateData: any = { status };
      if (startTime) updateData.actualStartTime = startTime;
      if (endTime) updateData.actualEndTime = endTime;
      const res = await apiRequest("PATCH", `/api/fwa/chi/audit-sessions/${id}`, updateData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/chi/audit-sessions"] });
      refetchFindings();
      refetchChecklists();
      toast({ title: "Success", description: "Audit session status updated" });
    },
  });

  const createEnforcementCaseMutation = useMutation({
    mutationFn: async (finding: AuditFinding) => {
      const res = await apiRequest("POST", "/api/fwa/chi/enforcement-cases", {
        caseNumber: `ENF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
        providerId: selectedSession?.providerId || '',
        providerName: selectedSession?.providerName || '',
        severity: finding.severity,
        status: 'finding',
        description: `Enforcement case created from audit finding ${finding.findingNumber}: ${finding.title}. Category: ${finding.category}. ${finding.description}`,
        evidenceSummary: finding.evidence || '',
        circularReference: finding.regulatoryReference || '',
        fineAmount: finding.potentialAmount ? parseFloat(finding.potentialAmount) : null,
        findingDate: new Date().toISOString(),
        metadata: {
          sourceType: 'audit_referral',
          auditSessionId: selectedSession?.id,
          auditFindingId: finding.id,
          findingNumber: finding.findingNumber,
        },
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (selectedFinding) {
        updateFindingMutation.mutate({
          id: selectedFinding.id,
          data: { 
            enforcementCaseId: data.id,
            status: 'referred_to_enforcement',
          },
        });
        setSelectedFinding({
          ...selectedFinding,
          enforcementCaseId: data.id,
          status: 'referred_to_enforcement',
        });
      }
      toast({ 
        title: "Enforcement Case Created", 
        description: `Case ${data.caseNumber} has been created and linked`,
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    },
  });

  const handleCreateEnforcementCase = () => {
    if (!selectedFinding) return;
    createEnforcementCaseMutation.mutate(selectedFinding);
  };

  const handleStartAudit = () => {
    if (!selectedSession) return;
    updateSessionStatusMutation.mutate({
      id: selectedSession.id,
      status: "in_progress",
      startTime: new Date().toISOString(),
    });
  };

  const handleCompleteAudit = () => {
    if (!selectedSession) return;
    updateSessionStatusMutation.mutate({
      id: selectedSession.id,
      status: "completed",
      endTime: new Date().toISOString(),
    });
  };

  const handleRequestFollowUp = () => {
    if (!selectedSession) return;
    updateSessionStatusMutation.mutate({
      id: selectedSession.id,
      status: "follow_up_required",
    });
  };

  const handleMarkReportPending = () => {
    if (!selectedSession) return;
    updateSessionStatusMutation.mutate({
      id: selectedSession.id,
      status: "report_pending",
    });
  };

  const fetchReportData = async () => {
    if (!selectedSession) return;
    const res = await fetch(`/api/fwa/chi/audit-sessions/${selectedSession.id}/report`);
    if (!res.ok) throw new Error('Failed to fetch report');
    return res.json();
  };

  const handleExportPDF = async () => {
    if (!selectedSession) return;
    
    setIsExportingPDF(true);
    try {
      const report = await fetchReportData();
      setReportData(report);
      
      // Wait for DOM to render with double requestAnimationFrame for reliable rendering
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });
      
      const element = reportContentRef.current;
      if (!element) {
        throw new Error('Report content not found');
      }
      
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `audit-report-${selectedSession.auditNumber}-${new Date().toISOString().split("T")[0]}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          logging: false,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };
      
      await html2pdf().set(opt).from(element).save();
      
      toast({
        title: "PDF Exported",
        description: "Audit report has been saved as PDF",
      });
      setReportData(null);
    } catch (error) {
      console.error("PDF export failed:", error);
      toast({
        title: "Export Failed",
        description: "Unable to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExportingPDF(false);
    }
  };

  const linkClaimToFinding = (claimId: string) => {
    if (!selectedFinding) return;
    const currentLinks = selectedFinding.linkedClaimIds || [];
    if (!currentLinks.includes(claimId)) {
      updateFindingMutation.mutate({
        id: selectedFinding.id,
        data: { linkedClaimIds: [...currentLinks, claimId] },
      });
      setSelectedFinding({
        ...selectedFinding,
        linkedClaimIds: [...currentLinks, claimId],
      });
    }
  };

  const unlinkClaim = (claimId: string) => {
    if (!selectedFinding) return;
    const currentLinks = selectedFinding.linkedClaimIds || [];
    const newLinks = currentLinks.filter(id => id !== claimId);
    updateFindingMutation.mutate({
      id: selectedFinding.id,
      data: { linkedClaimIds: newLinks },
    });
    setSelectedFinding({
      ...selectedFinding,
      linkedClaimIds: newLinks,
    });
  };

  const sessions = auditSessions || [];

  const filteredSessions = sessions.filter((s) => {
    const matchesSearch = s.auditNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.providerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    const matchesType = typeFilter === "all" || s.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: sessions.length,
    scheduled: sessions.filter(s => s.status === "scheduled").length,
    inProgress: sessions.filter(s => s.status === "in_progress").length,
    completed: sessions.filter(s => s.status === "completed").length,
    riskBased: sessions.filter(s => s.type === "risk_based_audit").length,
  };

  const handleViewSession = (session: AuditSession) => {
    setSelectedSession(session);
    setDetailOpen(true);
  };

  const getTeamMemberNames = (team: AuditSession['auditTeam']) => {
    if (!team || team.length === 0) return [];
    return team.map(member => member.name);
  };

  const getLeadAuditor = (team: AuditSession['auditTeam']) => {
    if (!team || team.length === 0) return null;
    const lead = team.find(m => m.role?.toLowerCase().includes('lead'));
    return lead?.name || team[0]?.name;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Audit Sessions</h1>
          <p className="text-muted-foreground">
            Plan, execute, and document compliance audits
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" data-testid="button-export">
            <FileText className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button onClick={() => setCreateOpen(true)} data-testid="button-schedule">
            <Plus className="w-4 h-4 mr-2" />
            Schedule Audit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <ClipboardCheck className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="stat-total">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Calendar className="w-5 h-5 text-blue-600" />
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{stats.scheduled}</Badge>
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="stat-scheduled">{stats.scheduled}</p>
            <p className="text-xs text-muted-foreground">Scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Clock className="w-5 h-5 text-amber-600" />
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">{stats.inProgress}</Badge>
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="stat-inprogress">{stats.inProgress}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="stat-completed">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="stat-riskbased">{stats.riskBased}</p>
            <p className="text-xs text-muted-foreground">Risk-Based Audits</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-primary" />
            Risk-Based Audit Scheduling
          </CardTitle>
          <CardDescription>
            Audits are prioritized based on provider risk scores, complaint history, and enforcement findings. High-risk providers receive more frequent audits.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="follow_up_required">Follow-up Required</SelectItem>
                <SelectItem value="report_pending">Report Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-type">
                <SelectValue placeholder="Audit Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="routine_inspection">Routine Inspection</SelectItem>
                <SelectItem value="risk_based_audit">Risk-Based Audit</SelectItem>
                <SelectItem value="complaint_investigation">Complaint Investigation</SelectItem>
                <SelectItem value="follow_up_audit">Follow-Up Audit</SelectItem>
                <SelectItem value="desk_review">Desk Review</SelectItem>
                <SelectItem value="site_visit">Site Visit</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No audit sessions found. Schedule audits to monitor provider compliance.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Audit #</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Lead Auditor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSessions.map((session) => (
                <TableRow key={session.id} data-testid={`row-session-${session.id}`}>
                  <TableCell className="font-mono font-medium">{session.auditNumber}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span>{session.providerName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={auditTypeColors[session.type] || ""}>
                      {session.type.replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {session.scheduledDate ? new Date(session.scheduledDate).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      {session.location || "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Users className="w-3 h-3 text-muted-foreground" />
                      {getLeadAuditor(session.auditTeam) || "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[session.status || "scheduled"]}>{(session.status || "scheduled").replace(/_/g, " ")}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleViewSession(session)} data-testid={`button-view-session-${session.id}`}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedSession && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-4">
                  <DialogTitle className="flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5" />
                    {selectedSession.auditNumber}
                  </DialogTitle>
                  <Badge className={statusColors[selectedSession.status || "scheduled"]}>
                    {(selectedSession.status || "scheduled").replace(/_/g, " ")}
                  </Badge>
                </div>
                <DialogDescription>
                  Audit session for {selectedSession.providerName}
                </DialogDescription>
              </DialogHeader>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                  <TabsTrigger value="findings" data-testid="tab-findings">
                    Findings {(findings?.length || 0) > 0 && <Badge className="ml-2 h-5 px-1.5" variant="outline">{findings?.length}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="checklists" data-testid="tab-checklists">Checklists</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Provider</p>
                      <p className="font-medium">{selectedSession.providerName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Audit Type</p>
                      <Badge className={auditTypeColors[selectedSession.type]}>{selectedSession.type.replace(/_/g, " ")}</Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Scheduled Date</p>
                      <p className="font-medium">
                        {selectedSession.scheduledDate ? new Date(selectedSession.scheduledDate).toLocaleDateString() : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium">{selectedSession.location || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Lead Auditor</p>
                      <p className="font-medium">{getLeadAuditor(selectedSession.auditTeam) || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Risk Score</p>
                      <p className="font-medium">{selectedSession.riskScore || "-"}</p>
                    </div>
                  </div>
                  {selectedSession.auditScope && selectedSession.auditScope.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Audit Scope</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedSession.auditScope.map((scope, idx) => (
                          <Badge key={idx} variant="outline">{scope}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="findings" className="mt-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center gap-4 flex-wrap">
                      <h4 className="font-medium">Audit Findings</h4>
                      <Button 
                        size="sm" 
                        onClick={() => createFindingMutation.mutate({
                          auditSessionId: selectedSession.id,
                          category: "billing",
                          severity: "medium",
                          title: "New Finding",
                          description: "Description pending review",
                          status: "draft",
                        })}
                        disabled={createFindingMutation.isPending}
                        data-testid="button-add-finding"
                      >
                        {createFindingMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                        Add Finding
                      </Button>
                    </div>
                    
                    {findingsLoading ? (
                      <div className="space-y-2">
                        {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                      </div>
                    ) : !findings || findings.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <FileWarning className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>No findings recorded yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {findings.map((finding) => (
                          <Card 
                            key={finding.id} 
                            className="p-4 cursor-pointer hover-elevate" 
                            onClick={() => {
                              setSelectedFinding(finding);
                              setFindingDetailOpen(true);
                            }}
                            data-testid={`card-finding-${finding.id}`}
                          >
                            <div className="flex justify-between items-start gap-4 flex-wrap">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="font-mono text-sm text-muted-foreground">{finding.findingNumber}</span>
                                  <Badge variant={finding.severity === 'critical' ? 'destructive' : finding.severity === 'high' ? 'destructive' : 'secondary'}>
                                    {finding.severity}
                                  </Badge>
                                  <Badge variant="outline">{finding.category}</Badge>
                                </div>
                                <h5 className="font-medium">{finding.title}</h5>
                                <p className="text-sm text-muted-foreground line-clamp-2">{finding.description}</p>
                                {finding.potentialAmount && (
                                  <p className="text-sm mt-1 font-medium text-amber-600">Potential: {finding.potentialAmount} SAR</p>
                                )}
                              </div>
                              <Badge className={statusColors[finding.status || "draft"]}>{(finding.status || "draft").replace(/_/g, " ")}</Badge>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="checklists" className="mt-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center gap-4 flex-wrap">
                      <h4 className="font-medium">Audit Checklists</h4>
                      {(!checklists || checklists.length === 0) && (
                        <Button 
                          size="sm" 
                          onClick={() => initChecklistsMutation.mutate(selectedSession.id)}
                          disabled={initChecklistsMutation.isPending}
                          data-testid="button-init-checklists"
                        >
                          {initChecklistsMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                          Initialize Default Checklists
                        </Button>
                      )}
                    </div>
                    
                    {checklistsLoading ? (
                      <div className="space-y-2">
                        {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                      </div>
                    ) : !checklists || checklists.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>No checklist items. Click above to initialize default checklists.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {checklists.map((item) => (
                          <div 
                            key={item.id} 
                            className={`flex items-center gap-3 p-3 border rounded-md ${item.status === 'completed' ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : ''}`}
                            data-testid={`checklist-item-${item.id}`}
                          >
                            <input
                              type="checkbox"
                              checked={item.status === 'completed'}
                              onChange={(e) => updateChecklistMutation.mutate({ id: item.id, data: { status: e.target.checked ? 'completed' : 'pending', completedAt: e.target.checked ? new Date() : null } })}
                              className="w-5 h-5 rounded border-2"
                              data-testid={`checkbox-${item.id}`}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs text-muted-foreground">{item.itemCode}</span>
                                <Badge variant="outline" className="text-xs">{item.category}</Badge>
                              </div>
                              <p className={`text-sm ${item.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>{item.description}</p>
                            </div>
                            {item.evidenceRequired && <Shield className="w-4 h-4 text-amber-500" aria-label="Evidence required" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
              
              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={handleExportPDF}
                  disabled={isExportingPDF}
                  data-testid="button-export-pdf"
                >
                  {isExportingPDF ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  {isExportingPDF ? "Generating..." : "Export PDF"}
                </Button>
                <Button variant="outline" onClick={() => setDetailOpen(false)} data-testid="button-close-dialog">Close</Button>
                
                {selectedSession?.status === "scheduled" && (
                  <Button 
                    onClick={handleStartAudit}
                    disabled={updateSessionStatusMutation.isPending}
                    data-testid="button-start-audit"
                  >
                    {updateSessionStatusMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ClipboardCheck className="w-4 h-4 mr-2" />}
                    Start Audit
                  </Button>
                )}
                
                {selectedSession?.status === "in_progress" && (
                  <>
                    <Button 
                      variant="outline"
                      onClick={handleRequestFollowUp}
                      disabled={updateSessionStatusMutation.isPending}
                      data-testid="button-request-followup"
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Follow-Up Required
                    </Button>
                    <Button 
                      onClick={handleCompleteAudit}
                      disabled={updateSessionStatusMutation.isPending}
                      data-testid="button-complete-audit"
                    >
                      {updateSessionStatusMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                      Complete Audit
                    </Button>
                  </>
                )}
                
                {selectedSession?.status === "completed" && (
                  <Button 
                    onClick={handleMarkReportPending}
                    disabled={updateSessionStatusMutation.isPending}
                    data-testid="button-report-pending"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Mark Report Pending
                  </Button>
                )}
                
                {selectedSession?.status === "follow_up_required" && (
                  <Button 
                    onClick={handleStartAudit}
                    disabled={updateSessionStatusMutation.isPending}
                    data-testid="button-resume-audit"
                  >
                    <ClipboardCheck className="w-4 h-4 mr-2" />
                    Resume Audit
                  </Button>
                )}
              </div>
              
              {reportData && (
                <div 
                  ref={reportContentRef} 
                  className="absolute left-[-9999px] top-0 w-[210mm] bg-white text-black p-8"
                  style={{ fontFamily: 'Arial, sans-serif' }}
                >
                  <div className="text-center mb-8 border-b pb-4">
                    <h1 className="text-2xl font-bold mb-2">Audit Report</h1>
                    <p className="text-lg">{reportData.session.auditNumber}</p>
                    <p className="text-sm text-gray-600">Generated: {new Date(reportData.generatedAt).toLocaleString()}</p>
                  </div>
                  
                  <div className="mb-6">
                    <h2 className="text-lg font-bold mb-3 border-b pb-2">Audit Session Details</h2>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr><td className="py-1 font-medium w-1/3">Provider:</td><td>{reportData.session.providerName}</td></tr>
                        <tr><td className="py-1 font-medium">Provider ID:</td><td>{reportData.session.providerId}</td></tr>
                        <tr><td className="py-1 font-medium">Audit Type:</td><td className="capitalize">{reportData.session.type?.replace(/_/g, ' ')}</td></tr>
                        <tr><td className="py-1 font-medium">Status:</td><td className="capitalize">{reportData.session.status?.replace(/_/g, ' ')}</td></tr>
                        <tr><td className="py-1 font-medium">Scheduled Date:</td><td>{reportData.session.scheduledDate ? new Date(reportData.session.scheduledDate).toLocaleDateString() : '-'}</td></tr>
                        <tr><td className="py-1 font-medium">Location:</td><td>{reportData.session.location || '-'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mb-6">
                    <h2 className="text-lg font-bold mb-3 border-b pb-2">Summary</h2>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="p-3 border rounded">
                        <p className="font-medium">Total Findings</p>
                        <p className="text-2xl font-bold">{reportData.summary.totalFindings}</p>
                      </div>
                      <div className="p-3 border rounded">
                        <p className="font-medium">Potential Amount</p>
                        <p className="text-2xl font-bold">{reportData.summary.totalPotentialAmount} SAR</p>
                      </div>
                    </div>
                    <div className="mt-3 p-3 border rounded text-sm">
                      <p className="font-medium mb-2">Findings by Severity</p>
                      <div className="flex gap-4">
                        <span>Critical: {reportData.summary.findingsBySeverity.critical}</span>
                        <span>High: {reportData.summary.findingsBySeverity.high}</span>
                        <span>Medium: {reportData.summary.findingsBySeverity.medium}</span>
                        <span>Low: {reportData.summary.findingsBySeverity.low}</span>
                      </div>
                    </div>
                    <div className="mt-3 p-3 border rounded text-sm">
                      <p className="font-medium mb-2">Checklist Progress</p>
                      <p>Completed: {reportData.summary.checklistStats.completed} / {reportData.summary.checklistStats.total}</p>
                    </div>
                  </div>
                  
                  {reportData.findings.length > 0 && (
                    <div className="mb-6">
                      <h2 className="text-lg font-bold mb-3 border-b pb-2">Findings</h2>
                      {reportData.findings.map((finding: any, idx: number) => (
                        <div key={idx} className="mb-4 p-3 border rounded text-sm">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold">{finding.findingNumber}</span>
                            <span className="px-2 py-0.5 border rounded text-xs uppercase">{finding.severity}</span>
                          </div>
                          <p className="font-medium">{finding.title}</p>
                          <p className="text-gray-700 mt-1">{finding.description}</p>
                          {finding.recommendation && (
                            <p className="mt-2"><strong>Recommendation:</strong> {finding.recommendation}</p>
                          )}
                          {finding.potentialAmount && (
                            <p className="mt-1"><strong>Potential Amount:</strong> {finding.potentialAmount} SAR</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="text-center text-xs text-gray-500 mt-8 pt-4 border-t">
                    <p>This report was generated by the FWA Detection Platform</p>
                    <p>Council of Health Insurance - Kingdom of Saudi Arabia</p>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={findingDetailOpen} onOpenChange={setFindingDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedFinding && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-4">
                  <DialogTitle className="flex items-center gap-2">
                    <FileWarning className="w-5 h-5" />
                    {selectedFinding.findingNumber}
                  </DialogTitle>
                  <Badge variant={selectedFinding.severity === 'critical' || selectedFinding.severity === 'high' ? 'destructive' : 'secondary'}>
                    {selectedFinding.severity}
                  </Badge>
                </div>
              </DialogHeader>
              
              <div className="space-y-6 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Category</Label>
                    <p className="font-medium capitalize">{selectedFinding.category}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <Badge className={statusColors[selectedFinding.status || "draft"]}>{(selectedFinding.status || "draft").replace(/_/g, " ")}</Badge>
                  </div>
                </div>
                
                <div>
                  <Label className="text-muted-foreground">Title</Label>
                  <p className="font-medium">{selectedFinding.title}</p>
                </div>
                
                <div>
                  <Label className="text-muted-foreground">Description</Label>
                  <p className="text-sm">{selectedFinding.description}</p>
                </div>
                
                {selectedFinding.potentialAmount && (
                  <div>
                    <Label className="text-muted-foreground">Potential Amount</Label>
                    <p className="font-medium text-amber-600">{selectedFinding.potentialAmount} SAR</p>
                  </div>
                )}
                
                {selectedFinding.recommendation && (
                  <div>
                    <Label className="text-muted-foreground">Recommendation</Label>
                    <p className="text-sm">{selectedFinding.recommendation}</p>
                  </div>
                )}

                {selectedFinding.enforcementCaseId && (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                      <Gavel className="w-5 h-5" />
                      <span className="font-medium">Referred to Enforcement</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Case ID: <span className="font-mono">{selectedFinding.enforcementCaseId}</span>
                    </p>
                  </div>
                )}
                
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3 gap-4">
                    <Label className="text-base font-medium">Linked Claims</Label>
                  </div>
                  
                  <div className="space-y-3">
                    {selectedFinding.linkedClaimIds && selectedFinding.linkedClaimIds.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedFinding.linkedClaimIds.map((claimId) => (
                          <Badge key={claimId} variant="outline" className="flex items-center gap-1">
                            {claimId}
                            <button 
                              onClick={() => unlinkClaim(claimId)}
                              className="ml-1 hover:text-destructive"
                              data-testid={`button-unlink-${claimId}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No claims linked to this finding</p>
                    )}
                    
                    <div className="mt-3">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Search claims by ID, provider, or patient..."
                          value={claimSearchQuery}
                          onChange={(e) => setClaimSearchQuery(e.target.value)}
                          className="flex-1"
                          data-testid="input-search-claims"
                        />
                      </div>
                      
                      {claimSearchQuery.length >= 2 && (
                        <div className="mt-2 border rounded-md max-h-40 overflow-y-auto">
                          {claimsLoading ? (
                            <div className="p-3 text-center text-muted-foreground">
                              <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                            </div>
                          ) : !searchedClaims || searchedClaims.length === 0 ? (
                            <div className="p-3 text-center text-muted-foreground text-sm">
                              No claims found matching "{claimSearchQuery}"
                            </div>
                          ) : (
                            searchedClaims.slice(0, 10).map((claim: any) => (
                              <div 
                                key={claim.id} 
                                className="p-2 hover:bg-muted flex items-center justify-between gap-4 cursor-pointer"
                                onClick={() => linkClaimToFinding(claim.claimId || claim.id)}
                                data-testid={`claim-result-${claim.id}`}
                              >
                                <div>
                                  <span className="font-mono text-sm">{claim.claimId || claim.id}</span>
                                  <span className="mx-2 text-muted-foreground">-</span>
                                  <span className="text-sm">{claim.providerName || 'Unknown Provider'}</span>
                                </div>
                                <span className="text-sm text-muted-foreground">{claim.amount ? `${claim.amount} SAR` : ''}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                {!selectedFinding?.enforcementCaseId && (
                  <Button 
                    variant="destructive"
                    onClick={handleCreateEnforcementCase}
                    disabled={createEnforcementCaseMutation.isPending}
                    data-testid="button-create-enforcement"
                  >
                    {createEnforcementCaseMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Gavel className="w-4 h-4 mr-2" />
                    )}
                    Create Enforcement Case
                  </Button>
                )}
                {selectedFinding?.enforcementCaseId && (
                  <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
                    <Gavel className="w-3 h-3" />
                    Enforcement Case Active
                  </Badge>
                )}
                <Button variant="outline" onClick={() => setFindingDetailOpen(false)} data-testid="button-close-finding">
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Audit Session</DialogTitle>
            <DialogDescription>
              Schedule a new regulatory audit or site inspection
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="providerId">Provider ID *</Label>
                <Input
                  id="providerId"
                  placeholder="PRV-001"
                  value={newSession.providerId}
                  onChange={(e) => setNewSession({ ...newSession, providerId: e.target.value })}
                  data-testid="input-provider-id"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="providerName">Provider Name *</Label>
                <Input
                  id="providerName"
                  placeholder="Hospital Name"
                  value={newSession.providerName}
                  onChange={(e) => setNewSession({ ...newSession, providerName: e.target.value })}
                  data-testid="input-provider-name"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Audit Type</Label>
                <Select
                  value={newSession.type}
                  onValueChange={(value) => setNewSession({ ...newSession, type: value as typeof newSession.type })}
                >
                  <SelectTrigger data-testid="select-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine_inspection">Routine Inspection</SelectItem>
                    <SelectItem value="risk_based_audit">Risk-Based Audit</SelectItem>
                    <SelectItem value="complaint_investigation">Complaint Investigation</SelectItem>
                    <SelectItem value="follow_up_audit">Follow-Up Audit</SelectItem>
                    <SelectItem value="desk_review">Desk Review</SelectItem>
                    <SelectItem value="site_visit">Site Visit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">Scheduled Date</Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={newSession.scheduledDate}
                  onChange={(e) => setNewSession({ ...newSession, scheduledDate: e.target.value })}
                  data-testid="input-scheduled-date"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Audit location"
                  value={newSession.location}
                  onChange={(e) => setNewSession({ ...newSession, location: e.target.value })}
                  data-testid="input-location"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leadAuditor">Lead Auditor</Label>
                <Input
                  id="leadAuditor"
                  placeholder="Auditor name"
                  value={newSession.leadAuditor}
                  onChange={(e) => setNewSession({ ...newSession, leadAuditor: e.target.value })}
                  data-testid="input-lead-auditor"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scope">Audit Scope</Label>
              <Input
                id="scope"
                placeholder="Billing compliance, clinical documentation, etc."
                value={newSession.scope}
                onChange={(e) => setNewSession({ ...newSession, scope: e.target.value })}
                data-testid="input-scope"
              />
            </div>
            {(!newSession.providerName || !newSession.providerId) && (
              <p className="text-sm text-destructive">Provider ID and Provider Name are required</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)} data-testid="button-cancel-create">
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate(newSession)}
                disabled={createMutation.isPending || !newSession.providerName.trim() || !newSession.providerId.trim()}
                data-testid="button-submit-session"
              >
                {createMutation.isPending ? "Scheduling..." : "Schedule Audit"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
