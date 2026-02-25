import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  ArrowUpDown,
  TrendingUp,
  AlertTriangle,
  Brain,
  Scale,
  Percent,
  Download,
  Loader2
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar
} from "recharts";

interface PreAuthOverviewData {
  totalClaims: number;
  approved: number;
  rejected: number;
  pendingReview: number;
  requestInfo: number;
  approvalRate: number;
  overrideRate: number;
  avgProcessingTime: string;
  totalActions: number;
  totalOverrides: number;
}

interface PreAuthStatusDistribution {
  distribution: Array<{ status: string; count: number; percentage: number }>;
  total: number;
}

interface PreAuthClaimsTrend {
  trend: Array<{ date: string; submitted: number; approved: number; rejected: number }>;
}

interface PreAuthAgentPerformance {
  performance: Array<{
    detector: string;
    signalCount: number;
    avgConfidence: number;
    riskFlagCount: number;
    hardStopCount: number;
    riskFlagRate: number;
    recommendations: Record<string, number>;
  }>;
}

interface PreAuthOverridePatterns {
  totalOverrides: number;
  byCategory: Array<{ category: string; count: number }>;
  byReason: Array<{ reason: string; count: number }>;
  byVerdictChange: Array<{ change: string; count: number }>;
}

const STATUS_COLORS: Record<string, string> = {
  approved: "#22c55e",
  rejected: "#ef4444",
  pending_review: "#f59e0b",
  request_info: "#3b82f6",
  ingested: "#8b5cf6",
  analyzing: "#06b6d4",
  aggregated: "#ec4899"
};

const AGENT_LABELS: Record<string, string> = {
  regulatory_compliance: "Regulatory Compliance",
  coverage_eligibility: "Coverage Eligibility",
  clinical_necessity: "Clinical Necessity",
  past_patterns: "Past Patterns",
  disclosure_check: "Disclosure Check"
};

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon,
  testId 
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string; 
  icon: typeof FileText;
  testId: string;
}) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="p-3 rounded-md bg-primary/10">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusLabel({ status }: { status: string }) {
  const labels: Record<string, string> = {
    approved: "Approved",
    rejected: "Rejected",
    pending_review: "Pending Review",
    request_info: "Request Info",
    ingested: "Ingested",
    analyzing: "Analyzing",
    aggregated: "Aggregated"
  };
  return <span>{labels[status] || status}</span>;
}

export default function PreAuthAnalytics() {
  const { toast } = useToast();
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const { data: overview, isLoading: overviewLoading } = useQuery<PreAuthOverviewData>({
    queryKey: ["/api/pre-auth/analytics/overview"]
  });

  const { data: statusData, isLoading: statusLoading } = useQuery<PreAuthStatusDistribution>({
    queryKey: ["/api/pre-auth/analytics/claims-by-status"]
  });

  const { data: trendData, isLoading: trendLoading } = useQuery<PreAuthClaimsTrend>({
    queryKey: ["/api/pre-auth/analytics/claims-trend"]
  });

  const { data: agentData, isLoading: agentLoading } = useQuery<PreAuthAgentPerformance>({
    queryKey: ["/api/pre-auth/analytics/agent-performance"]
  });

  const { data: overrideData, isLoading: overrideLoading } = useQuery<PreAuthOverridePatterns>({
    queryKey: ["/api/pre-auth/analytics/override-patterns"]
  });

  const chartData = statusData?.distribution.map(item => ({
    name: item.status,
    value: item.count,
    fill: STATUS_COLORS[item.status] || "#6b7280"
  })) || [];

  const handleDownloadReport = async () => {
    setIsGeneratingReport(true);
    
    try {
      const csvRows: string[] = [];
      csvRows.push("Metric,Value");
      
      csvRows.push(`Total Pre-Auths,${overview?.totalClaims || 0}`);
      csvRows.push(`Approval Rate,${overview?.approvalRate || 0}%`);
      csvRows.push(`Avg Processing Time,${overview?.avgProcessingTime || "0s"}`);
      csvRows.push(`Override Rate,${overview?.overrideRate || 0}%`);
      csvRows.push(`Total Approved,${overview?.approved || 0}`);
      csvRows.push(`Total Rejected,${overview?.rejected || 0}`);
      csvRows.push(`Pending Review,${overview?.pendingReview || 0}`);
      csvRows.push(`Request Info,${overview?.requestInfo || 0}`);
      csvRows.push(`Total Overrides,${overview?.totalOverrides || 0}`);
      
      csvRows.push("");
      csvRows.push("Status Distribution");
      csvRows.push("Status,Count,Percentage");
      statusData?.distribution.forEach(item => {
        csvRows.push(`${item.status},${item.count},${item.percentage}%`);
      });
      
      if (agentData?.performance && agentData.performance.length > 0) {
        csvRows.push("");
        csvRows.push("Agent Performance");
        csvRows.push("Agent,Signals,Avg Confidence,Risk Flags,Hard Stops");
        agentData.performance.forEach(agent => {
          const label = AGENT_LABELS[agent.detector] || agent.detector;
          csvRows.push(`${label},${agent.signalCount},${(agent.avgConfidence * 100).toFixed(1)}%,${agent.riskFlagCount},${agent.hardStopCount}`);
        });
      }
      
      if (overrideData && overrideData.totalOverrides > 0) {
        csvRows.push("");
        csvRows.push("Override Patterns");
        csvRows.push("Category,Count");
        overrideData.byCategory.forEach(item => {
          csvRows.push(`${item.category},${item.count}`);
        });
      }
      
      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `pre-auth-analytics-${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Report downloaded",
        description: "Analytics report has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to generate the analytics report.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title-analytics">Pre-Auth Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            System performance metrics and pre-authorization processing insights
          </p>
        </div>
        <Button
          onClick={handleDownloadReport}
          disabled={isGeneratingReport || overviewLoading}
          data-testid="button-download-report"
        >
          {isGeneratingReport ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <MetricCard
              title="Total Pre-Auths"
              value={overview?.totalClaims || 0}
              subtitle="All time"
              icon={FileText}
              testId="metric-total-claims"
            />
            <MetricCard
              title="Approval Rate"
              value={`${overview?.approvalRate || 0}%`}
              subtitle="Of processed claims"
              icon={CheckCircle}
              testId="metric-approval-rate"
            />
            <MetricCard
              title="Avg Processing Time"
              value={overview?.avgProcessingTime || "0s"}
              subtitle="Per claim"
              icon={Clock}
              testId="metric-avg-processing-time"
            />
            <MetricCard
              title="Override Rate"
              value={`${overview?.overrideRate || 0}%`}
              subtitle={`${overview?.totalOverrides || 0} overrides`}
              icon={ArrowUpDown}
              testId="metric-override-rate"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="chart-claims-by-status">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Percent className="w-5 h-5" />
              Claims by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Skeleton className="h-48 w-48 rounded-full" />
              </div>
            ) : chartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [value, "Claims"]}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No claims data available
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {statusData?.distribution.map(item => (
                <div key={item.status} className="flex items-center gap-2 text-sm">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: STATUS_COLORS[item.status] || "#6b7280" }}
                  />
                  <StatusLabel status={item.status} />
                  <span className="text-muted-foreground ml-auto">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="chart-claims-trend">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Claims Trend (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : trendData?.trend && trendData.trend.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip 
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="submitted" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={false}
                      name="Submitted"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="approved" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      dot={false}
                      name="Approved"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="rejected" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      dot={false}
                      name="Rejected"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No trend data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="section-agent-performance">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Agent Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {agentLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : agentData?.performance && agentData.performance.length > 0 ? (
            <div className="space-y-4">
              {agentData.performance.map((agent) => (
                <div 
                  key={agent.detector} 
                  className="p-4 border rounded-md"
                  data-testid={`agent-${agent.detector}`}
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {AGENT_LABELS[agent.detector] || agent.detector}
                        </span>
                        {agent.hardStopCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {agent.hardStopCount} Hard Stops
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {agent.signalCount} signals processed
                      </p>
                    </div>
                    <div className="flex items-center gap-6 flex-wrap">
                      <div className="text-center">
                        <p className="text-lg font-bold">{(agent.avgConfidence * 100).toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">Avg Confidence</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold">{agent.riskFlagRate}%</p>
                        <p className="text-xs text-muted-foreground">Risk Flag Rate</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold">{agent.riskFlagCount}</p>
                        <p className="text-xs text-muted-foreground">Risk Flags</p>
                      </div>
                    </div>
                  </div>
                  {Object.keys(agent.recommendations).length > 0 && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Recommendations:</span>
                      {Object.entries(agent.recommendations).map(([rec, count]) => (
                        <Badge 
                          key={rec} 
                          variant="secondary" 
                          className="text-xs"
                        >
                          {rec}: {count}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No agent performance data available
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="section-override-patterns">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="w-5 h-5" />
              Override Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overrideLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : overrideData && overrideData.totalOverrides > 0 ? (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium mb-3">By Category</h4>
                  {overrideData.byCategory.length > 0 ? (
                    <div className="space-y-2">
                      {overrideData.byCategory.map((item) => (
                        <div key={item.category} className="flex items-center justify-between">
                          <span className="text-sm">{item.category}</span>
                          <Badge variant="secondary">{item.count}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No category data</p>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-3">Verdict Changes</h4>
                  {overrideData.byVerdictChange.length > 0 ? (
                    <div className="space-y-2">
                      {overrideData.byVerdictChange.map((item) => (
                        <div key={item.change} className="flex items-center justify-between">
                          <span className="text-sm font-mono">{item.change}</span>
                          <Badge variant="secondary">{item.count}</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No verdict changes</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No override data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="chart-override-categories">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Override Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {overrideLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : overrideData?.byCategory && overrideData.byCategory.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={overrideData.byCategory}
                    layout="vertical"
                    margin={{ left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                    <YAxis 
                      type="category" 
                      dataKey="category" 
                      tick={{ fontSize: 12 }}
                      width={100}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '6px'
                      }}
                    />
                    <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No override data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
