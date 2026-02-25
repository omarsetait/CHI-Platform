import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Download,
  Plus,
  ChevronRight,
  Filter,
  DollarSign,
  FileCheck,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  FileText,
  ThumbsUp,
  Shield,
  Loader2,
} from "lucide-react";
import type { SettlementLedger, ProviderDirectory, EvidencePack, ReconciliationSession } from "@shared/schema";

type FindingStatus = "open" | "acknowledged" | "in_progress" | "resolved";
type SettlementStatus = "proposed" | "negotiating" | "agreed" | "signed" | "finance_approved" | "rejected";

interface OperationalFinding {
  id: string;
  findingId: string;
  providerId: string;
  providerName: string;
  category: "billing_pattern" | "documentation" | "coding" | "compliance" | "service_quality";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  recommendation: string;
  financialImpact: string;
  status: FindingStatus;
  createdAt: string;
  resolvedAt: string | null;
}

const settlementFormSchema = z.object({
  providerId: z.string().min(1, "Provider is required"),
  providerName: z.string().min(1, "Provider name is required"),
  sessionId: z.string().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  proposedAmount: z.string().optional(),
  evidencePackIds: z.array(z.string()).optional(),
  notes: z.string().optional(),
});
type SettlementFormData = z.infer<typeof settlementFormSchema>;

export default function SettlementPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("operational");
  const [findingSearchQuery, setFindingSearchQuery] = useState("");
  const [findingStatusFilter, setFindingStatusFilter] = useState("all");
  const [settlementSearchQuery, setSettlementSearchQuery] = useState("");
  const [settlementStatusFilter, setSettlementStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: settlements = [], isLoading: isLoadingSettlements } = useQuery<SettlementLedger[]>({
    queryKey: ["/api/provider-relations/settlements"],
  });

  const { data: providers = [], isLoading: isLoadingProviders } = useQuery<ProviderDirectory[]>({
    queryKey: ["/api/provider-relations/providers"],
  });

  const { data: evidencePacks = [], isLoading: isLoadingEvidencePacks } = useQuery<EvidencePack[]>({
    queryKey: ["/api/provider-relations/evidence-packs"],
  });

  const { data: sessions = [], isLoading: isLoadingSessions } = useQuery<ReconciliationSession[]>({
    queryKey: ["/api/provider-relations/sessions"],
  });

  const { data: operationalFindings = [], isLoading: isLoadingFindings } = useQuery<OperationalFinding[]>({
    queryKey: ["/api/provider-relations/operational-findings"],
  });

  const form = useForm<SettlementFormData>({
    resolver: zodResolver(settlementFormSchema),
    defaultValues: {
      providerId: "",
      providerName: "",
      sessionId: "",
      periodStart: "",
      periodEnd: "",
      proposedAmount: "",
      evidencePackIds: [],
      notes: "",
    },
  });

  const createSettlementMutation = useMutation({
    mutationFn: async (data: SettlementFormData) => {
      const response = await apiRequest("POST", "/api/provider-relations/settlements", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider-relations/settlements"] });
      toast({ title: "Success", description: "Settlement created successfully" });
      setDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create settlement", variant: "destructive" });
    },
  });

  const advanceStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/provider-relations/settlements/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider-relations/settlements"] });
      toast({ title: "Success", description: "Settlement status updated" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    },
  });

  const handleExport = () => {
    const csvContent = settlements.map(s => 
      `${s.settlementNumber},${s.providerName},${s.status},${s.proposedAmount}`
    ).join('\n');
    const blob = new Blob([`Settlement Number,Provider,Status,Amount\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'settlements.csv';
    a.click();
  };

  const onSubmit = (data: SettlementFormData) => {
    createSettlementMutation.mutate(data);
  };

  const handleProviderChange = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      form.setValue("providerId", providerId);
      form.setValue("providerName", provider.name);
    }
  };

  const handleSessionChange = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      form.setValue("sessionId", sessionId);
      if (session.negotiatedAmount) {
        form.setValue("proposedAmount", String(session.negotiatedAmount));
      }
      if (session.providerId) {
        const provider = providers.find(p => p.id === session.providerId);
        if (provider) {
          form.setValue("providerId", session.providerId);
          form.setValue("providerName", provider.name);
        } else {
          form.setValue("providerId", session.providerId);
          form.setValue("providerName", session.providerName);
        }
      }
      if (session.evidencePackIds && session.evidencePackIds.length > 0) {
        form.setValue("evidencePackIds", session.evidencePackIds);
      }
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const transitions: Record<string, string> = {
      "proposed": "negotiating",
      "negotiating": "agreed",
      "agreed": "signed",
      "signed": "finance_approved",
    };
    return transitions[currentStatus] || null;
  };

  const handleAdvanceStatus = (settlementId: string, currentStatus: string) => {
    const nextStatus = getNextStatus(currentStatus);
    if (nextStatus) {
      advanceStatusMutation.mutate({ id: settlementId, status: nextStatus });
    }
  };

  const handleDisputeSettlement = (settlementId: string) => {
    advanceStatusMutation.mutate({ id: settlementId, status: "rejected" });
  };

  const filteredFindings = operationalFindings.filter((finding) => {
    const matchesSearch = finding.providerName.toLowerCase().includes(findingSearchQuery.toLowerCase()) ||
      finding.findingId.toLowerCase().includes(findingSearchQuery.toLowerCase()) ||
      finding.category.toLowerCase().includes(findingSearchQuery.toLowerCase());
    const matchesStatus = findingStatusFilter === "all" || finding.status === findingStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredSettlements = settlements.filter((settlement) => {
    const matchesSearch = settlement.providerName.toLowerCase().includes(settlementSearchQuery.toLowerCase()) ||
      settlement.settlementNumber.toLowerCase().includes(settlementSearchQuery.toLowerCase());
    const matchesStatus = settlementStatusFilter === "all" || settlement.status === settlementStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const getFindingStatusBadge = (status: FindingStatus) => {
    switch (status) {
      case "open":
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" data-testid="badge-finding-open">Open</Badge>;
      case "acknowledged":
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" data-testid="badge-finding-acknowledged">Acknowledged</Badge>;
      case "in_progress":
        return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" data-testid="badge-finding-in-progress">In Progress</Badge>;
      case "resolved":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" data-testid="badge-finding-resolved">Resolved</Badge>;
      default:
        return null;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" data-testid="badge-severity-critical">Critical</Badge>;
      case "high":
        return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" data-testid="badge-severity-high">High</Badge>;
      case "medium":
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" data-testid="badge-severity-medium">Medium</Badge>;
      case "low":
        return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400" data-testid="badge-severity-low">Low</Badge>;
      default:
        return null;
    }
  };

  const getSettlementStatusBadge = (status: string) => {
    switch (status) {
      case "proposed":
        return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400" data-testid="badge-settlement-proposed">Proposed</Badge>;
      case "negotiating":
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" data-testid="badge-settlement-negotiating">Negotiating</Badge>;
      case "agreed":
        return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" data-testid="badge-settlement-agreed">Agreed</Badge>;
      case "signed":
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" data-testid="badge-settlement-signed">Signed</Badge>;
      case "finance_approved":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" data-testid="badge-settlement-finance-approved">Finance Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" data-testid="badge-settlement-rejected">Rejected</Badge>;
      default:
        return null;
    }
  };

  const getProviderAcceptanceBadge = (acceptance: boolean | null) => {
    if (acceptance === null) {
      return <Badge variant="outline" className="text-muted-foreground" data-testid="badge-acceptance-pending">Pending</Badge>;
    }
    if (acceptance) {
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" data-testid="badge-acceptance-accepted">Accepted</Badge>;
    }
    return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" data-testid="badge-acceptance-rejected">Rejected</Badge>;
  };

  const totalPotentialAmount = operationalFindings.reduce((sum, f) => sum + Number(f.financialImpact || 0), 0);
  const resolvedPotentialAmount = operationalFindings
    .filter(f => f.status === "resolved")
    .reduce((sum, f) => sum + Number(f.financialImpact || 0), 0);
  const inProgressCount = operationalFindings.filter(f => f.status === "in_progress" || f.status === "acknowledged").length;
  const openCount = operationalFindings.filter(f => f.status === "open").length;

  const totalRealizedSavings = settlements
    .filter(s => s.status === "finance_approved")
    .reduce((sum, s) => sum + Number(s.realizedSavings || s.agreedAmount || 0), 0);
  const totalProposedAmount = settlements.reduce((sum, s) => sum + Number(s.proposedAmount || 0), 0);
  const finalizedCount = settlements.filter(s => s.status === "finance_approved").length;
  const pendingSettlementCount = settlements.filter(s => 
    s.status === "proposed" || s.status === "negotiating" || s.status === "agreed" || s.status === "signed"
  ).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Two-Ledger Settlement</h1>
          <p className="text-muted-foreground">
            System rejections are NOT savings until commercially settled
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2" 
            onClick={handleExport}
            data-testid="button-export"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button 
            size="sm" 
            className="gap-2" 
            onClick={() => setDialogOpen(true)}
            data-testid="button-new-settlement"
          >
            <Plus className="h-4 w-4" />
            New Settlement
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-2" data-testid="tabs-ledger">
          <TabsTrigger value="operational" className="gap-2" data-testid="tab-operational-findings">
            <AlertTriangle className="h-4 w-4" />
            Operational Findings
          </TabsTrigger>
          <TabsTrigger value="settlement" className="gap-2" data-testid="tab-settlement-ledger">
            <FileCheck className="h-4 w-4" />
            Settlement Ledger
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operational" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Potential Amount</p>
                    <p className="text-2xl font-bold text-amber-600" data-testid="text-total-potential">${(totalPotentialAmount / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-muted-foreground mt-1">NOT realized savings</p>
                  </div>
                  <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Resolved Findings</p>
                    <p className="text-2xl font-bold text-green-600" data-testid="text-resolved-potential">${(resolvedPotentialAmount / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-muted-foreground mt-1">Ready for settlement</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">In Progress</p>
                    <p className="text-2xl font-bold text-blue-600" data-testid="text-in-progress-count">{inProgressCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">Findings being reviewed</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Eye className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Open Findings</p>
                    <p className="text-2xl font-bold" data-testid="text-open-count">{openCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <div>
                <CardTitle>Operational Findings Ledger</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Potential amounts from system rejections/flags - NOT confirmed savings
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search findings..."
                    value={findingSearchQuery}
                    onChange={(e) => setFindingSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                    data-testid="input-finding-search"
                  />
                </div>
                <Select value={findingStatusFilter} onValueChange={setFindingStatusFilter}>
                  <SelectTrigger className="w-40" data-testid="select-finding-status">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="acknowledged">Acknowledged</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingFindings ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Finding ID</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead className="text-right">Financial Impact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Recommendation</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFindings.map((finding) => (
                      <TableRow 
                        key={finding.id} 
                        className="cursor-pointer hover-elevate"
                        data-testid={`row-finding-${finding.id}`}
                      >
                        <TableCell className="font-medium" data-testid={`text-finding-id-${finding.id}`}>{finding.findingId}</TableCell>
                        <TableCell data-testid={`text-finding-provider-${finding.id}`}>{finding.providerName}</TableCell>
                        <TableCell>
                          <span className="capitalize">{finding.category.replace("_", " ")}</span>
                        </TableCell>
                        <TableCell>{getSeverityBadge(finding.severity)}</TableCell>
                        <TableCell className="text-right font-medium text-amber-600" data-testid={`text-finding-amount-${finding.id}`}>
                          ${Number(finding.financialImpact).toLocaleString()}
                        </TableCell>
                        <TableCell>{getFindingStatusBadge(finding.status)}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground" title={finding.recommendation}>
                          {finding.recommendation}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" data-testid={`button-finding-detail-${finding.id}`}>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredFindings.length === 0 && !isLoadingFindings && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No findings found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settlement" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Realized Savings</p>
                    <p className="text-2xl font-bold text-green-600" data-testid="text-realized-savings">${(totalRealizedSavings / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-muted-foreground mt-1">Finalized settlements</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Proposed</p>
                    <p className="text-2xl font-bold text-amber-600" data-testid="text-total-proposed">${(totalProposedAmount / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-muted-foreground mt-1">All settlements</p>
                  </div>
                  <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <FileText className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Finalized</p>
                    <p className="text-2xl font-bold text-green-600" data-testid="text-finalized-count">{finalizedCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">Fully processed</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                    <Shield className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Settlement</p>
                    <p className="text-2xl font-bold text-blue-600" data-testid="text-pending-settlement-count">{pendingSettlementCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">In progress</p>
                  </div>
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <div>
                <CardTitle>Settlement Ledger</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Agreed outcomes only - Realized Savings shown when status is FINALIZED
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search settlements..."
                    value={settlementSearchQuery}
                    onChange={(e) => setSettlementSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                    data-testid="input-settlement-search"
                  />
                </div>
                <Select value={settlementStatusFilter} onValueChange={setSettlementStatusFilter}>
                  <SelectTrigger className="w-44" data-testid="select-settlement-status">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="proposed">Proposed</SelectItem>
                    <SelectItem value="signed">Signed</SelectItem>
                    <SelectItem value="negotiating">Negotiating</SelectItem>
                    <SelectItem value="agreed">Agreed</SelectItem>
                    <SelectItem value="finance_approved">Finance Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSettlements ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Settlement #</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Proposed</TableHead>
                      <TableHead className="text-right">Agreed</TableHead>
                      <TableHead className="text-right">Realized Savings</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSettlements.map((settlement) => {
                      const showRealizedSavings = settlement.status === "finance_approved";
                      const nextStatus = getNextStatus(settlement.status || "proposed");
                      const canAdvance = nextStatus !== null && settlement.status !== "rejected";
                      const canDispute = settlement.status !== "finance_approved" && settlement.status !== "rejected";
                      
                      return (
                        <TableRow 
                          key={settlement.id} 
                          className="cursor-pointer hover-elevate"
                          data-testid={`row-settlement-${settlement.id}`}
                        >
                          <TableCell className="font-medium" data-testid={`text-settlement-number-${settlement.id}`}>
                            {settlement.settlementNumber}
                          </TableCell>
                          <TableCell data-testid={`text-settlement-provider-${settlement.id}`}>
                            {settlement.providerName}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {settlement.periodStart?.toString().split("T")[0]} - {settlement.periodEnd?.toString().split("T")[0]}
                          </TableCell>
                          <TableCell className="text-right" data-testid={`text-settlement-proposed-${settlement.id}`}>
                            ${Number(settlement.proposedAmount || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right" data-testid={`text-settlement-agreed-${settlement.id}`}>
                            {settlement.agreedAmount !== null ? (
                              <span className="font-medium">${Number(settlement.agreedAmount).toLocaleString()}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right" data-testid={`text-settlement-realized-${settlement.id}`}>
                            {showRealizedSavings && settlement.realizedSavings !== null ? (
                              <span className="font-bold text-green-600">${Number(settlement.realizedSavings).toLocaleString()}</span>
                            ) : (
                              <span className="text-muted-foreground text-sm italic">Pending settlement</span>
                            )}
                          </TableCell>
                          <TableCell>{getSettlementStatusBadge(settlement.status || "proposed")}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {canAdvance && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="h-7 text-xs gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAdvanceStatus(settlement.id, settlement.status || "proposed");
                                  }}
                                  disabled={advanceStatusMutation.isPending}
                                  data-testid={`button-advance-${settlement.id}`}
                                >
                                  {advanceStatusMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <ChevronRight className="h-3 w-3" />
                                  )}
                                  Advance
                                </Button>
                              )}
                              {canDispute && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-7 text-xs text-red-600 hover:text-red-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDisputeSettlement(settlement.id);
                                  }}
                                  disabled={advanceStatusMutation.isPending}
                                  data-testid={`button-dispute-${settlement.id}`}
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredSettlements.length === 0 && !isLoadingSettlements && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No settlements found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Settlement Workflow</CardTitle>
              <p className="text-sm text-muted-foreground">Status transitions for commercial settlement process</p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400" data-testid="workflow-proposed">Proposed</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" data-testid="workflow-provider-review">Provider Review</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" data-testid="workflow-negotiating">Negotiating</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" data-testid="workflow-agreed">Agreed</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" data-testid="workflow-finalized">Finance Approved</Badge>
                  <ThumbsUp className="h-4 w-4 text-green-600 ml-2" />
                </div>
              </div>
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Key Principle:</strong> "Realized Savings" column only displays values when the settlement 
                  status is <strong>FINALIZED</strong>. Prior to that, amounts 
                  represent proposed or agreed values that are not yet commercially settled.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title">New Settlement</DialogTitle>
            <DialogDescription>
              Create a new settlement record for provider negotiation.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="sessionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link to Session (Optional)</FormLabel>
                    <Select 
                      onValueChange={(value) => handleSessionChange(value)} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-session">
                          {isLoadingSessions ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading sessions...
                            </span>
                          ) : (
                            <SelectValue placeholder="Select session to auto-populate" />
                          )}
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {sessions.filter(s => s.status === "completed" && s.id).map((session) => (
                          <SelectItem key={session.id} value={session.id}>
                            {session.sessionNumber} - {session.providerName} ({session.negotiatedAmount ? `$${Number(session.negotiatedAmount).toLocaleString()}` : 'No amount'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Selecting a session will auto-populate provider and negotiated amount
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="providerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider</FormLabel>
                    <Select 
                      onValueChange={(value) => handleProviderChange(value)} 
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-provider">
                          {isLoadingProviders ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Loading providers...
                            </span>
                          ) : (
                            <SelectValue placeholder="Select provider" />
                          )}
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {providers.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="periodStart"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Period Start</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          data-testid="input-period-start"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="periodEnd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Period End</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          data-testid="input-period-end"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="proposedAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proposed Amount ($)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0.00" 
                        {...field} 
                        data-testid="input-proposed-amount"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="evidencePackIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Evidence Packs</FormLabel>
                    <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
                      {isLoadingEvidencePacks ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading evidence packs...
                        </div>
                      ) : evidencePacks.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No evidence packs available</p>
                      ) : (
                        evidencePacks.map((pack) => (
                          <div key={pack.id} className="flex items-center gap-2">
                            <Checkbox
                              id={pack.id}
                              checked={field.value?.includes(pack.id)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  field.onChange([...current, pack.id]);
                                } else {
                                  field.onChange(current.filter(id => id !== pack.id));
                                }
                              }}
                              data-testid={`checkbox-evidence-${pack.id}`}
                            />
                            <label htmlFor={pack.id} className="text-sm">
                              {pack.title} {pack.targetAmount && `($${Number(pack.targetAmount).toLocaleString()})`}
                            </label>
                          </div>
                        ))
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Additional notes for this settlement..." 
                        {...field} 
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createSettlementMutation.isPending}
                  data-testid="button-create-settlement"
                >
                  {createSettlementMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Settlement
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
