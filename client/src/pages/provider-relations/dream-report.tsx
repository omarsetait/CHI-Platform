import { useState, useRef } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Building2,
  TrendingUp,
  AlertTriangle,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Eye,
  BarChart3,
  DollarSign,
  Users,
  Activity,
  Target,
  Lightbulb,
  Clock,
  CheckCircle,
  FileJson,
  Download,
  RefreshCw,
  Loader2,
} from "lucide-react";
import html2pdf from "html2pdf.js";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ClaimsModal } from "@/components/claims/claims-modal";
import type { DreamReport, ProviderDirectory } from "@shared/schema";

const CHART_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6"];

function ProviderSelectionPage() {
  const [, setLocation] = useLocation();

  const { data: providers = [], isLoading: isLoadingProviders } = useQuery<ProviderDirectory[]>({
    queryKey: ["/api/provider-relations/providers"],
  });

  const { data: existingReports = [], isLoading: isLoadingReports } = useQuery<DreamReport[]>({
    queryKey: ["/api/provider-relations/dream-reports"],
  });

  const generateMutation = useMutation({
    mutationFn: async (providerId: string) => {
      const response = await apiRequest("POST", "/api/provider-relations/dream-reports/generate", {
        providerId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider-relations/dream-reports"] });
      if (data?.id) {
        setLocation(`/provider-relations/dream-report/${data.id}`);
      }
    },
  });

  const isLoading = isLoadingProviders || isLoadingReports;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-32 w-full" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getExistingReport = (providerId: string) => {
    return existingReports.find((r) => r.providerId === providerId);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Dream Reports</h1>
        <p className="text-muted-foreground">
          Generate bulletproof, negotiation-ready reports for any provider
        </p>
      </div>

      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">AI-Powered Dream Report</h2>
              <p className="text-sm text-muted-foreground mt-1">
                With a click of a button, get a comprehensive report with peer benchmarks,
                anomaly detection, and detailed claim-level evidence for commercial settlements.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Select a Provider</CardTitle>
          <CardDescription>
            Choose a provider to generate their Dream Report
          </CardDescription>
        </CardHeader>
        <CardContent>
          {providers.length === 0 ? (
            <div className="py-8 text-center">
              <EmptyState
                icon={Building2}
                title="No providers found"
                description="Add providers to the directory first to generate Dream Reports."
              />
              <Link href="/provider-relations/providers">
                <Button data-testid="button-add-providers" className="mt-4">
                  <Building2 className="h-4 w-4 mr-2" />
                  Go to Provider Directory
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => {
                  const existingReport = getExistingReport(provider.id);
                  return (
                    <TableRow key={provider.id} data-testid={`row-provider-${provider.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{provider.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{provider.specialty || "-"}</TableCell>
                      <TableCell>{provider.region || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{provider.networkTier || "Standard"}</Badge>
                      </TableCell>
                      <TableCell>
                        {existingReport ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Report Available
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            No Report
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {existingReport ? (
                            <Link href={`/provider-relations/dream-report/${existingReport.id}`}>
                              <Button size="sm" variant="outline" className="gap-2" data-testid={`button-view-${provider.id}`}>
                                <Eye className="h-3 w-3" />
                                View Report
                              </Button>
                            </Link>
                          ) : null}
                          <Button
                            size="sm"
                            className="gap-2"
                            onClick={() => generateMutation.mutate(provider.id)}
                            disabled={generateMutation.isPending}
                            data-testid={`button-generate-${provider.id}`}
                          >
                            {generateMutation.isPending ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3" />
                            )}
                            {existingReport ? "Regenerate" : "Generate Report"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {existingReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Dream Reports</CardTitle>
            <CardDescription>
              Previously generated reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report #</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Potential Recovery</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {existingReports.map((report) => (
                  <TableRow key={report.id} data-testid={`row-report-${report.id}`}>
                    <TableCell className="font-medium">{report.reportNumber}</TableCell>
                    <TableCell>{report.providerName}</TableCell>
                    <TableCell>
                      {report.periodStart && report.periodEnd ? (
                        <span className="text-sm text-muted-foreground">
                          {new Date(report.periodStart).toLocaleDateString()} - {new Date(report.periodEnd).toLocaleDateString()}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          report.status === "completed"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : report.status === "generating"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-muted text-muted-foreground"
                        }
                      >
                        {report.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-red-600">
                      SAR {(Number(report.totalPotentialAmount) / 1000000).toFixed(2)}M
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {report.generatedAt ? new Date(report.generatedAt).toLocaleDateString() : "-"}
                    </TableCell>
                    <TableCell>
                      <Link href={`/provider-relations/dream-report/${report.id}`}>
                        <Button size="sm" variant="ghost" className="gap-2" data-testid={`button-open-${report.id}`}>
                          <Eye className="h-4 w-4" />
                          Open
                        </Button>
                      </Link>
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

export default function DreamReportPage() {
  const { providerId } = useParams<{ providerId: string }>();
  const [, setLocation] = useLocation();
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [claimsModalOpen, setClaimsModalOpen] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [selectedFindingForClaims, setSelectedFindingForClaims] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const reportContentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: report, isLoading: isLoadingReport, error } = useQuery<DreamReport>({
    queryKey: ["/api/provider-relations/dream-reports", providerId],
    enabled: !!providerId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "generating") {
        return 3000;
      }
      return false;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!report?.providerId) return;
      const response = await apiRequest("POST", "/api/provider-relations/dream-reports/generate", {
        providerId: report.providerId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider-relations/dream-reports"] });
      if (data?.id) {
        setLocation(`/provider-relations/dream-report/${data.id}`);
      }
    },
  });

  if (!providerId) {
    return <ProviderSelectionPage />;
  }

  if (isLoadingReport) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/provider-relations/dream-report">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Dream Report</h1>
            <p className="text-muted-foreground">Report not found</p>
          </div>
        </div>
        <div className="text-center">
          <EmptyState
            icon={FileText}
            title="Report not found"
            description="The requested Dream Report could not be found. It may have been deleted or the ID is invalid."
          />
          <Link href="/provider-relations/dream-report">
            <Button data-testid="button-back-to-list" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dream Reports
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (report.status === "generating") {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/provider-relations/dream-report">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Dream Report</h1>
            <p className="text-muted-foreground">Generating comprehensive provider report...</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-20 space-y-6">
          <div className="relative">
            <RefreshCw className="h-16 w-16 text-primary animate-spin" />
            <Sparkles className="h-6 w-6 text-amber-500 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">AI Analysis in Progress</h2>
            <p className="text-muted-foreground max-w-md">
              Analyzing claims data, benchmarking against peer groups, and generating actionable insights...
            </p>
          </div>
          <div className="w-64 space-y-2">
            <Progress value={66} className="h-2" />
            <p className="text-sm text-center text-muted-foreground">Processing claims data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (report.status === "failed") {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/provider-relations/dream-report">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Dream Report</h1>
            <p className="text-muted-foreground">Report generation failed</p>
          </div>
        </div>

        <Card className="border-red-200 dark:border-red-900/50">
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Report Generation Failed</h2>
                <p className="text-muted-foreground max-w-md">
                  {report.executiveSummary || "An error occurred while generating the report. Please try again."}
                </p>
              </div>
              <div className="flex gap-3">
                <Link href="/provider-relations/dream-report">
                  <Button variant="outline" data-testid="button-back-to-list">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to List
                  </Button>
                </Link>
                <Button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                  data-testid="button-retry-generate"
                >
                  {generateMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleExportPDF = async () => {
    if (!reportContentRef.current || !report) return;
    
    setIsExportingPDF(true);
    try {
      const element = reportContentRef.current;
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `dream-report-${report.providerId}-${new Date().toISOString().split("T")[0]}.pdf`,
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
        description: "Dream Report has been saved as PDF",
      });
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

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dream-report-${report.providerId}-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getRiskBadge = (level: string) => {
    switch (level.toUpperCase()) {
      case "HIGH":
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">High Risk</Badge>;
      case "MEDIUM":
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Medium Risk</Badge>;
      case "LOW":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Low Risk</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority.toUpperCase()) {
      case "HIGH":
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">High Priority</Badge>;
      case "MEDIUM":
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Medium Priority</Badge>;
      case "LOW":
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Low Priority</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence.toUpperCase()) {
      case "HIGH":
        return <Badge variant="outline" className="border-green-500 text-green-600">High Confidence</Badge>;
      case "MEDIUM":
        return <Badge variant="outline" className="border-amber-500 text-amber-600">Medium Confidence</Badge>;
      case "LOW":
        return <Badge variant="outline" className="border-red-500 text-red-600">Low Confidence</Badge>;
      default:
        return <Badge variant="outline">{confidence}</Badge>;
    }
  };

  const filteredClaimSamples = selectedCategory
    ? report.claimSamples?.filter((c: any) => c.category === selectedCategory) || []
    : report.claimSamples || [];

  const benchmarkAnalysis = report.benchmarkAnalysis as {
    costPerMember?: number;
    peerAvgCpm?: number;
    deviation?: number;
    percentile?: number;
    anomalyScore?: number;
    keyDrivers?: Array<{ category: string; impact: number; description: string }>;
  } | null;

  const findings = (report.findings || []) as Array<{
    id: string;
    category: string;
    subCategory?: string;
    amount: number;
    claimCount: number;
    confidence: string;
    severity: string;
    description: string;
    evidence?: string[];
  }>;

  const categoryBreakdown = (report.categoryBreakdown || []) as Array<{
    category: string;
    amount: number;
    percentage: number;
    claimCount: number;
    riskLevel: string;
  }>;

  const recommendations = (report.recommendations || []) as Array<{
    priority: string;
    action: string;
    expectedImpact: string;
    timeline: string;
  }>;

  return (
    <div className="p-6 space-y-6 print:p-0" id="dream-report-content">
      <div className="flex items-center justify-between gap-4 flex-wrap print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/provider-relations/dream-report">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Dream Report</h1>
            <p className="text-muted-foreground">Comprehensive provider analysis and insights</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedFindingForClaims({
                id: report.id || "",
                title: report.providerName
              });
              setClaimsModalOpen(true);
            }}
            className="gap-2"
            data-testid="button-view-related-claims"
          >
            <Eye className="h-4 w-4" />
            View Related Claims
          </Button>
          <Button
            variant="outline"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="gap-2"
            data-testid="button-generate-report"
          >
            {generateMutation.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Regenerate Report
          </Button>
          <Button variant="outline" onClick={handleExportJSON} className="gap-2" data-testid="button-export-json">
            <FileJson className="h-4 w-4" />
            Export JSON
          </Button>
          <Button 
            onClick={handleExportPDF} 
            disabled={isExportingPDF}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700" 
            data-testid="button-export-pdf"
          >
            {isExportingPDF ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {isExportingPDF ? "Exporting..." : "Export PDF"}
          </Button>
        </div>
      </div>

      <div ref={reportContentRef} className="space-y-6 pdf-export-content">
      <Card data-testid="card-provider-header">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <Building2 className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold" data-testid="text-provider-name">{report.providerName}</h2>
                <p className="text-muted-foreground">{report.providerId}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="outline">{report.reportNumber}</Badge>
                  <Badge className={
                    report.status === "completed"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  }>
                    {report.status}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <Users className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold" data-testid="text-member-count">-</p>
                <p className="text-xs text-muted-foreground">Members</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <FileText className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold" data-testid="text-total-claims">
                  {findings.reduce((acc, f) => acc + (f.claimCount || 0), 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Total Claims</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <Activity className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold text-amber-600" data-testid="text-anomaly-score">
                  {benchmarkAnalysis?.anomalyScore || 0}
                </p>
                <p className="text-xs text-muted-foreground">Anomaly Score</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <DollarSign className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold text-red-600" data-testid="text-potential-amount">
                  SAR {(Number(report.totalPotentialAmount) / 1000000).toFixed(1)}M
                </p>
                <p className="text-xs text-muted-foreground">Potential Recovery</p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <Clock className="h-4 w-4" />
              <span>Report Period: {report.periodStart ? new Date(report.periodStart).toLocaleDateString() : "-"} - {report.periodEnd ? new Date(report.periodEnd).toLocaleDateString() : "-"}</span>
              <span className="mx-2">|</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Generated: {report.generatedAt ? new Date(report.generatedAt).toLocaleDateString() : "-"} by {report.generatedBy || "System"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-executive-summary">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed" data-testid="text-executive-summary">
            {report.executiveSummary || "No summary available."}
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="benchmarking" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5" data-testid="tabs-report-sections">
          <TabsTrigger value="benchmarking" data-testid="tab-benchmarking">
            <BarChart3 className="h-4 w-4 mr-2" />
            Benchmarking
          </TabsTrigger>
          <TabsTrigger value="findings" data-testid="tab-findings">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Findings
          </TabsTrigger>
          <TabsTrigger value="categories" data-testid="tab-categories">
            <Target className="h-4 w-4 mr-2" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="claims" data-testid="tab-claims">
            <FileText className="h-4 w-4 mr-2" />
            Claim Samples
          </TabsTrigger>
          <TabsTrigger value="insights" data-testid="tab-insights">
            <Lightbulb className="h-4 w-4 mr-2" />
            AI Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="benchmarking" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card data-testid="card-cpm-comparison">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cost Per Member</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">This Provider</span>
                      <span className="font-bold text-lg" data-testid="text-cpm-value">
                        SAR {benchmarkAnalysis?.costPerMember?.toLocaleString() || "-"}
                      </span>
                    </div>
                    <Progress value={benchmarkAnalysis?.percentile || 0} className="h-3 bg-red-100" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">Peer Average</span>
                      <span className="font-medium" data-testid="text-peer-avg-cpm">
                        SAR {benchmarkAnalysis?.peerAvgCpm?.toLocaleString() || "-"}
                      </span>
                    </div>
                    <Progress value={70} className="h-3 bg-green-100" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-deviation">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Deviation from Peer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-24">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <TrendingUp className="h-8 w-8 text-red-500" />
                      <span className="text-4xl font-bold text-red-600" data-testid="text-deviation">
                        {benchmarkAnalysis?.deviation ? `+${benchmarkAnalysis.deviation}%` : "-"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">Above peer average</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-percentile">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Percentile Ranking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-24">
                  <div className="text-center">
                    <span className="text-4xl font-bold text-amber-600" data-testid="text-percentile">
                      {benchmarkAnalysis?.percentile ? `${benchmarkAnalysis.percentile}th` : "-"}
                    </span>
                    <p className="text-sm text-muted-foreground mt-2">
                      {benchmarkAnalysis?.percentile ? `Higher cost than ${benchmarkAnalysis.percentile}% of peers` : "N/A"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-key-drivers">
            <CardHeader>
              <CardTitle>Key Cost Drivers</CardTitle>
              <CardDescription>Factors contributing to elevated Cost Per Member</CardDescription>
            </CardHeader>
            <CardContent>
              {benchmarkAnalysis?.keyDrivers && benchmarkAnalysis.keyDrivers.length > 0 ? (
                <>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={benchmarkAnalysis.keyDrivers}
                        layout="vertical"
                        margin={{ left: 20, right: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 50]} unit="%" />
                        <YAxis type="category" dataKey="category" width={140} />
                        <Tooltip
                          formatter={(value: number) => [`${value}%`, "Impact"]}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar dataKey="impact" fill="#6366f1" radius={[0, 4, 4, 0]}>
                          {benchmarkAnalysis.keyDrivers.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2">
                    {benchmarkAnalysis.keyDrivers.map((driver, index) => (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                          />
                          <span className="font-medium">{driver.category}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{driver.description}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={BarChart3}
                  title="No key drivers identified"
                  description="Benchmark analysis has not identified any key cost drivers yet."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="findings" className="space-y-4">
          <Card data-testid="card-findings-list">
            <CardHeader>
              <CardTitle>Performance Anomalies</CardTitle>
              <CardDescription>Click on any finding to view evidence and drill down to claims</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {findings.length > 0 ? (
                findings.map((finding) => (
                  <Collapsible
                    key={finding.id}
                    open={expandedFinding === finding.id}
                    onOpenChange={() =>
                      setExpandedFinding(expandedFinding === finding.id ? null : finding.id)
                    }
                  >
                    <CollapsibleTrigger asChild>
                      <Card
                        className="cursor-pointer hover-elevate"
                        data-testid={`card-finding-${finding.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              {expandedFinding === finding.id ? (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              )}
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold">{finding.category}</span>
                                  {finding.subCategory && (
                                    <>
                                      <span className="text-muted-foreground">-</span>
                                      <span className="text-sm text-muted-foreground">{finding.subCategory}</span>
                                    </>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{finding.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-bold text-red-600" data-testid={`text-finding-amount-${finding.id}`}>
                                  SAR {finding.amount?.toLocaleString() || 0}
                                </p>
                                <p className="text-xs text-muted-foreground">{finding.claimCount || 0} claims</p>
                              </div>
                              <div className="flex flex-col gap-1">
                                {getRiskBadge(finding.severity)}
                                {getConfidenceBadge(finding.confidence)}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <Card className="mt-2 border-l-4 border-l-indigo-500">
                        <CardContent className="p-4">
                          <h4 className="font-semibold mb-2">Evidence</h4>
                          <ul className="space-y-1">
                            {finding.evidence?.map((ev, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>{ev}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-4 flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedFindingForClaims({
                                  id: finding.id,
                                  title: `${finding.category}${finding.subCategory ? ` - ${finding.subCategory}` : ""}`
                                });
                                setClaimsModalOpen(true);
                              }}
                              data-testid={`button-view-claims-${finding.id}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Related Claims
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </CollapsibleContent>
                  </Collapsible>
                ))
              ) : (
                <EmptyState
                  icon={AlertTriangle}
                  title="No findings"
                  description="No performance anomalies were identified for this provider."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card data-testid="card-category-chart">
              <CardHeader>
                <CardTitle>Category Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryBreakdown.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryBreakdown}
                          dataKey="amount"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percentage }) => `${name}: ${percentage?.toFixed(1) || 0}%`}
                          labelLine
                        >
                          {categoryBreakdown.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [`SAR ${value.toLocaleString()}`, "Amount"]}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyState
                    icon={Target}
                    title="No category data"
                    description="Category breakdown is not available for this report."
                  />
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-category-table">
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
                <CardDescription>Click any row to view claim samples</CardDescription>
              </CardHeader>
              <CardContent>
                {categoryBreakdown.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Claims</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryBreakdown.map((cat, index) => (
                        <TableRow
                          key={index}
                          className="cursor-pointer hover-elevate"
                          onClick={() => setSelectedCategory(cat.category)}
                          data-testid={`row-category-${index}`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                              />
                              <span className="font-medium">{cat.category}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            SAR {cat.amount?.toLocaleString() || 0}
                          </TableCell>
                          <TableCell className="text-right">{cat.claimCount || 0}</TableCell>
                          <TableCell>{getRiskBadge(cat.riskLevel)}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" data-testid={`button-drill-${index}`}>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState
                    icon={Target}
                    title="No categories"
                    description="No category breakdown available."
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="claims" className="space-y-4">
          <Card data-testid="card-claim-samples">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Claim Samples</CardTitle>
                <CardDescription>
                  {selectedCategory
                    ? `Showing claims for: ${selectedCategory}`
                    : "Representative claims for each finding category"}
                </CardDescription>
              </div>
              {selectedCategory && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                  data-testid="button-clear-filter"
                >
                  Clear Filter
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {filteredClaimSamples.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Claim ID</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Attachment</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClaimSamples.map((claim: any, index: number) => (
                      <TableRow key={index} data-testid={`row-claim-${claim.claimId}`}>
                        <TableCell className="font-medium">{claim.claimId}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{claim.category}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{claim.description}</TableCell>
                        <TableCell className="text-right font-medium">
                          SAR {claim.amount?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell>
                          {claim.attachmentAvailable ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              Available
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Missing
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Link href={`/findings/${claim.claimId}/claims?source=dream_report&reportId=${report.id}&providerId=${report.providerId}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1"
                              data-testid={`button-view-claim-${claim.claimId}`}
                            >
                              <Eye className="h-4 w-4" />
                              View Details
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  icon={FileText}
                  title="No claim samples"
                  description={selectedCategory ? `No claims found for category: ${selectedCategory}` : "No claim samples are available for this report."}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card data-testid="card-ai-insights">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                AI-Generated Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              {report.aiInsights ? (
                <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
                  <p className="text-sm leading-relaxed" data-testid="text-ai-insights">
                    {report.aiInsights}
                  </p>
                </div>
              ) : (
                <EmptyState
                  icon={Sparkles}
                  title="No AI insights"
                  description="AI-generated insights are not available for this report."
                />
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-recommendations">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                Recommendations
              </CardTitle>
              <CardDescription>Actionable next steps prioritized by impact</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendations.length > 0 ? (
                recommendations.map((rec, index) => (
                  <Card key={index} className="border-l-4 border-l-indigo-500" data-testid={`card-recommendation-${index}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getPriorityBadge(rec.priority)}
                          </div>
                          <p className="font-medium">{rec.action}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <Target className="h-4 w-4" />
                              {rec.expectedImpact}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {rec.timeline}
                            </span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" data-testid={`button-action-${index}`}>
                          Take Action
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <EmptyState
                  icon={Lightbulb}
                  title="No recommendations"
                  description="No recommendations are available for this report."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>

      {selectedFindingForClaims && report && (
        <ClaimsModal
          open={claimsModalOpen}
          onOpenChange={setClaimsModalOpen}
          findingId={selectedFindingForClaims.id}
          findingSource="dream_report"
          findingTitle={selectedFindingForClaims.title}
          reportId={report.id}
          providerId={report.providerId}
        />
      )}
    </div>
  );
}
