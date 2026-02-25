import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Search,
  AlertTriangle,
  TrendingUp,
  Shield,
  Activity,
  Network,
  Play,
  CheckCircle,
  Clock,
  FileText,
  Download,
  Share2,
  ChevronUp,
  Building2,
  User,
  UserCog,
  Loader2,
  Target,
  DollarSign,
  BarChart3,
  AlertCircle,
  Lightbulb,
  FileSearch,
  ShieldCheck,
  History,
  Pill,
  GitBranch,
  Users,
  ArrowUpCircle,
  Ghost,
  Copy,
  AlertOctagon,
  UserSearch,
  FileWarning,
  ShieldX,
  RotateCcw,
  XCircle,
  FileX,
  Calculator,
  Gavel,
  Eye,
  Lock,
  GraduationCap,
  CalendarCheck,
  Award,
  ClipboardCheck,
  UserCheck,
  BookOpen,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { AgentReport } from "@shared/schema";
import {
  type AgentPhase,
  type AgentEntityType,
  type AgentDescriptor,
  getAgentsForPhaseAndEntity,
  getPhaseConfig,
} from "@shared/agents";

type AgentStatus = "idle" | "running" | "completed";

const iconMap: Record<string, React.ElementType> = {
  BarChart3,
  FileSearch,
  Network,
  ShieldCheck,
  History,
  Pill,
  TrendingUp,
  AlertTriangle,
  GitBranch,
  FileText,
  Activity,
  Users,
  ArrowUpCircle,
  Ghost,
  Copy,
  AlertOctagon,
  UserSearch,
  FileWarning,
  ShieldX,
  DollarSign,
  RotateCcw,
  XCircle,
  FileX,
  Calculator,
  Gavel,
  Eye,
  Lock,
  Share2,
  GraduationCap,
  CalendarCheck,
  Award,
  ClipboardCheck,
  UserCheck,
  BookOpen,
  Search,
  Shield,
  Target,
};

const colorClasses: Record<string, { text: string; bg: string }> = {
  blue: { text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
  indigo: { text: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-100 dark:bg-indigo-900/30" },
  purple: { text: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/30" },
  green: { text: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" },
  rose: { text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-900/30" },
  amber: { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
  orange: { text: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30" },
  red: { text: "text-red-600 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/30" },
  cyan: { text: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-100 dark:bg-cyan-900/30" },
};

function getEntityIcon(entityType: string) {
  switch (entityType) {
    case "provider":
      return Building2;
    case "patient":
      return User;
    case "doctor":
      return UserCog;
    default:
      return Building2;
  }
}

function getSeverityBadgeClasses(severity: string) {
  switch (severity) {
    case "high":
    case "critical":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    case "medium":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    case "low":
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
  }
}

function getPriorityBadgeClasses(priority: string) {
  switch (priority) {
    case "high":
      return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800";
    case "medium":
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
    case "low":
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const PIE_COLORS = ["#f43f5e", "#f59e0b", "#3b82f6", "#a855f7"];

function MetricCard({
  title,
  value,
  icon: Icon,
  colorClass,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  colorClass: string;
}) {
  return (
    <Card data-testid={`metric-card-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
          <div className={`p-2 rounded-lg ${colorClass}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AgentCard({
  agent,
  status,
  progress,
  onRunAnalysis,
  onViewReport,
}: {
  agent: AgentDescriptor;
  status: AgentStatus;
  progress: number;
  onRunAnalysis: () => void;
  onViewReport: () => void;
}) {
  const Icon = iconMap[agent.icon] || Search;
  const colors = colorClasses[agent.color] || colorClasses.blue;

  return (
    <Card className="hover-elevate" data-testid={`agent-card-${agent.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colors.bg}`}>
              <Icon className={`w-5 h-5 ${colors.text}`} />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {agent.name}
                <Badge variant="outline" className="text-xs font-mono">
                  {agent.shortName}
                </Badge>
              </CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {status === "idle" && (
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                Idle
              </Badge>
            )}
            {status === "running" && (
              <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Running
              </Badge>
            )}
            {status === "completed" && (
              <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle className="w-3 h-3 mr-1" />
                Completed
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="text-sm mb-4">
          {agent.description}
        </CardDescription>

        {status === "running" && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Analyzing...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        <div className="flex items-center gap-2">
          {status === "idle" && (
            <Button
              onClick={onRunAnalysis}
              size="sm"
              className="bg-purple-600 hover:bg-purple-700"
              data-testid={`button-run-${agent.id}`}
            >
              <Play className="w-4 h-4 mr-2" />
              Run Analysis
            </Button>
          )}
          {status === "running" && (
            <Button size="sm" disabled data-testid={`button-running-${agent.id}`}>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </Button>
          )}
          {status === "completed" && (
            <>
              <Button
                onClick={onViewReport}
                size="sm"
                variant="outline"
                data-testid={`button-view-report-${agent.id}`}
              >
                <FileText className="w-4 h-4 mr-2" />
                View Report
              </Button>
              <Button
                onClick={onRunAnalysis}
                size="sm"
                variant="ghost"
                data-testid={`button-rerun-${agent.id}`}
              >
                <Play className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ReportViewer({
  report,
  agentName,
  isOpen,
  onClose,
  phase,
}: {
  report: Partial<AgentReport>;
  agentName: string;
  isOpen: boolean;
  onClose: () => void;
  phase: AgentPhase;
}) {
  const { toast } = useToast();
  
  if (!isOpen || !report) return null;

  const barChartData = report.charts?.find((c) => c.type === "bar")?.data || [];
  const pieChartData = report.charts?.find((c) => c.type === "pie")?.data || [];
  const phaseConfig = getPhaseConfig(phase);

  const handleDownloadPDF = () => {
    // Create a printable version of the report
    const reportContent = {
      title: `${phaseConfig.title}: ${agentName}`,
      entity: report.entityName,
      generatedAt: new Date().toISOString(),
      executiveSummary: report.executiveSummary,
      metrics: report.metrics,
      findings: report.findings,
      recommendations: report.recommendations,
    };
    
    // Create and download as JSON (can be converted to PDF by user)
    const blob = new Blob([JSON.stringify(reportContent, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${agentName.replace(/\s+/g, "_")}_Report_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Report Downloaded",
      description: "The report has been downloaded as JSON.",
    });
  };

  const handleShare = () => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: "Link Copied",
        description: "Report link has been copied to clipboard.",
      });
    }).catch(() => {
      toast({
        title: "Share",
        description: `Share this URL: ${shareUrl}`,
      });
    });
  };

  return (
    <Card className="mt-6 border-purple-200 dark:border-purple-800" data-testid="report-viewer">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-lg">{phaseConfig.title}: {agentName}</CardTitle>
              <CardDescription>
                Generated for {report.entityName}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} data-testid="button-download-pdf">
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare} data-testid="button-share-report">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-report">
              <ChevronUp className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard
            title="Total Claims"
            value={report.metrics?.totalClaims || 0}
            icon={FileText}
            colorClass="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          />
          <MetricCard
            title="Flagged"
            value={report.metrics?.flaggedClaims || 0}
            icon={AlertCircle}
            colorClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
          />
          <MetricCard
            title="Exposure"
            value={formatCurrency(report.metrics?.totalExposure || 0)}
            icon={DollarSign}
            colorClass="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
          />
          <MetricCard
            title="Potential Impact"
            value={formatCurrency(report.metrics?.recoveryPotential || 0)}
            icon={TrendingUp}
            colorClass="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          />
          <MetricCard
            title="Risk Score"
            value={`${report.metrics?.riskScore || 0}%`}
            icon={Target}
            colorClass="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
          />
          <MetricCard
            title="Compliance"
            value={`${report.metrics?.complianceScore || 0}%`}
            icon={Shield}
            colorClass="bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400"
          />
        </div>

        <div className="p-4 bg-muted/30 rounded-lg">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            Executive Summary
          </h4>
          <p className="text-sm text-muted-foreground">
            {report.executiveSummary}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {barChartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Monthly Claim Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="claims" name="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="flagged" name="Flagged" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
          {pieChartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Finding Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieChartData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Key Findings
            </h4>
            <div className="space-y-3">
              {(report.findings as any[] || []).map((finding: any, index: number) => (
                <Card key={index} className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h5 className="text-sm font-medium">{finding.title}</h5>
                    <Badge variant="outline" className={getSeverityBadgeClasses(finding.severity)}>
                      {finding.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{finding.description}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Confidence:</span>
                    <Progress value={(finding.confidence || 0) * 100} className="h-1.5 w-20" />
                    <span>{((finding.confidence || 0) * 100).toFixed(0)}%</span>
                  </div>
                  {finding.evidence && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {finding.evidence.map((e: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {e}
                        </Badge>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-green-500" />
              Recommendations
            </h4>
            <div className="space-y-3">
              {(report.recommendations as any[] || []).map((rec: any, index: number) => (
                <Card key={index} className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h5 className="text-sm font-medium">{rec.action}</h5>
                    <Badge variant="outline" className={getPriorityBadgeClasses(rec.priority)}>
                      {rec.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {rec.estimatedImpact}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {rec.timeline}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AgentWorkflow() {
  const [, navigate] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const entityId = searchParams.get("entityId") || "";
  const entityType = (searchParams.get("entityType") || "provider") as AgentEntityType;
  const entityName = searchParams.get("entityName") || "Unknown Entity";
  const phase = (searchParams.get("phase") || "A1") as AgentPhase;

  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  const [agentProgress, setAgentProgress] = useState<Record<string, number>>({});
  const [agentReports, setAgentReports] = useState<Record<string, Partial<AgentReport>>>({});
  const [agentErrors, setAgentErrors] = useState<Record<string, string>>({});
  const [viewingReportId, setViewingReportId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const agents = getAgentsForPhaseAndEntity(phase, entityType);
  const phaseConfig = getPhaseConfig(phase);
  const EntityIcon = getEntityIcon(entityType);

  const generateReport = async (agentId: string, agent: AgentDescriptor) => {
    setAgentStatuses((prev) => ({ ...prev, [agentId]: "running" }));
    setAgentProgress((prev) => ({ ...prev, [agentId]: 0 }));
    setAgentErrors((prev) => ({ ...prev, [agentId]: "" }));
    setIsGenerating(true);

    const progressInterval = setInterval(() => {
      setAgentProgress((prev) => {
        const current = prev[agentId] || 0;
        if (current >= 90) {
          return prev;
        }
        return { ...prev, [agentId]: current + Math.random() * 15 };
      });
    }, 500);

    try {
      const response = await fetch("/api/fwa/generate-agent-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId,
          entityType,
          entityName,
          agentId,
          agentName: agent.name,
          phase,
        }),
      });

      if (response.ok) {
        const report = await response.json();
        setAgentReports((prev) => ({ ...prev, [agentId]: report }));
        clearInterval(progressInterval);
        setAgentProgress((prev) => ({ ...prev, [agentId]: 100 }));
        
        setTimeout(() => {
          setAgentStatuses((prev) => ({ ...prev, [agentId]: "completed" }));
          setViewingReportId(agentId);
          setIsGenerating(false);
        }, 300);
      } else {
        const errorData = await response.json().catch(() => ({ error: "Failed to generate report" }));
        clearInterval(progressInterval);
        setAgentProgress((prev) => ({ ...prev, [agentId]: 0 }));
        setAgentStatuses((prev) => ({ ...prev, [agentId]: "idle" }));
        setAgentErrors((prev) => ({ ...prev, [agentId]: errorData.error || "Failed to generate report" }));
        setIsGenerating(false);
        toast({
          title: "Report Generation Failed",
          description: errorData.error || "Unable to generate report. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      clearInterval(progressInterval);
      setAgentProgress((prev) => ({ ...prev, [agentId]: 0 }));
      setAgentStatuses((prev) => ({ ...prev, [agentId]: "idle" }));
      const errorMessage = error instanceof Error ? error.message : "Network error occurred";
      setAgentErrors((prev) => ({ ...prev, [agentId]: errorMessage }));
      setIsGenerating(false);
      toast({
        title: "Report Generation Failed",
        description: "Unable to connect to the server. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    navigate(`/fwa/${entityType === "provider" ? "providers" : entityType === "patient" ? "patients" : "doctors"}`);
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="page-title">
                {phaseConfig.name}
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <EntityIcon className="w-4 h-4" />
                <span className="capitalize">{entityType}:</span>
                <span className="font-medium text-foreground">{entityName}</span>
                {entityId && (
                  <Badge variant="outline" className="text-xs">
                    {entityId}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1.5">
            Phase {phase}
          </Badge>
        </div>

        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              {phaseConfig.description}
            </p>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-lg font-semibold mb-4">
            Available Agents for {entityType.charAt(0).toUpperCase() + entityType.slice(1)}s
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                status={agentStatuses[agent.id] || "idle"}
                progress={agentProgress[agent.id] || 0}
                onRunAnalysis={() => generateReport(agent.id, agent)}
                onViewReport={() => setViewingReportId(agent.id)}
              />
            ))}
          </div>
        </div>

        {viewingReportId && agentReports[viewingReportId] && (
          <ReportViewer
            report={agentReports[viewingReportId]}
            agentName={agents.find((a) => a.id === viewingReportId)?.name || "Agent"}
            isOpen={true}
            onClose={() => setViewingReportId(null)}
            phase={phase}
          />
        )}
      </div>
    </ScrollArea>
  );
}
