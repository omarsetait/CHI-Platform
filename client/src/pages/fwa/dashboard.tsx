import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Shield,
  Gavel,
  ClipboardList,
  FileCheck,
  Clock,
  ArrowRight,
  RefreshCw,
  Zap,
  Users,
  Building2,
  Stethoscope,
  User,
  Activity,
  Target,
  TrendingUp,
  DollarSign,
  Search,
  FileText,
  Plus,
  Command,
} from "lucide-react";
import { Link } from "wouter";

interface AttentionRequired {
  highRiskEntities: number;
  overdueEnforcement: number;
  pendingCases: number;
  pendingPreAuth: number;
}

interface KeyMetrics {
  activeCases: number;
  highRiskCount: number;
  pendingActions: number;
  totalImpact: number;
}

interface RecentActivityItem {
  id: string;
  type: "detection" | "enforcement" | "case";
  title: string;
  timestamp: string;
  status: string;
  entityType?: string;
}

interface AgentMetric {
  status: string;
  lastRun: string;
  successRate: number;
}

interface SystemHealth {
  agentMetrics: {
    analysisAgent: AgentMetric;
    categorizationAgent: AgentMetric;
    actionAgent: AgentMetric;
    historyAgent: AgentMetric;
  };
  systemStatus: string;
  lastUpdated: string;
}

interface OperationsSummary {
  attentionRequired: AttentionRequired;
  keyMetrics: KeyMetrics;
  recentActivity: RecentActivityItem[];
  systemHealth: SystemHealth;
}

interface TransformedAgent {
  name: string;
  status: string;
  accuracy: number;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M SAR`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K SAR`;
  }
  return `${value.toFixed(0)} SAR`;
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function AttentionCard({
  title,
  count,
  icon: Icon,
  colorClass,
  href,
  isLoading,
}: {
  title: string;
  count: number;
  icon: React.ElementType;
  colorClass: string;
  href: string;
  isLoading?: boolean;
}) {
  return (
    <Link href={href}>
      <Card className="hover-elevate cursor-pointer border-l-4" style={{ borderLeftColor: colorClass === 'red' ? 'rgb(239, 68, 68)' : colorClass === 'amber' ? 'rgb(245, 158, 11)' : colorClass === 'blue' ? 'rgb(59, 130, 246)' : 'rgb(168, 85, 247)' }} data-testid={`attention-card-${title.toLowerCase().replace(/\s+/g, "-")}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${colorClass === 'red' ? 'bg-red-100 dark:bg-red-900/30' : colorClass === 'amber' ? 'bg-amber-100 dark:bg-amber-900/30' : colorClass === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-purple-100 dark:bg-purple-900/30'}`}>
                <Icon className={`w-4 h-4 ${colorClass === 'red' ? 'text-red-600 dark:text-red-400' : colorClass === 'amber' ? 'text-amber-600 dark:text-amber-400' : colorClass === 'blue' ? 'text-blue-600 dark:text-blue-400' : 'text-purple-600 dark:text-purple-400'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{title}</p>
                {isLoading ? (
                  <Skeleton className="h-7 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{count}</p>
                )}
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  description,
  isLoading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description: string;
  isLoading?: boolean;
}) {
  return (
    <Card data-testid={`metric-card-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-bold">{value}</p>
            )}
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="p-3 rounded-lg bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActivityItem({ item }: { item: RecentActivityItem }) {
  const typeConfig = {
    detection: {
      icon: Shield,
      color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
      label: "Detection",
    },
    enforcement: {
      icon: Gavel,
      color: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
      label: "Enforcement",
    },
    case: {
      icon: ClipboardList,
      color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      label: "Case",
    },
  };

  const entityIcon = {
    provider: Building2,
    doctor: Stethoscope,
    patient: User,
  };

  const config = typeConfig[item.type] || typeConfig.case;
  const EntityIcon = item.entityType ? entityIcon[item.entityType as keyof typeof entityIcon] || Users : null;

  const getHref = () => {
    if (item.type === "detection") return "/fwa/detection-engine";
    if (item.type === "enforcement") return `/fwa/enforcement`;
    return `/fwa/cases/${item.id}`;
  };

  return (
    <Link href={getHref()}>
      <div className="flex items-center justify-between p-3 border-b hover-elevate cursor-pointer" data-testid={`activity-item-${item.id}`}>
        <div className="flex items-center gap-3">
          <Badge className={config.color} variant="secondary">
            {config.label}
          </Badge>
          {EntityIcon && (
            <EntityIcon className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium truncate max-w-[200px]">{item.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{item.status}</Badge>
          <span className="text-xs text-muted-foreground">{formatTimeAgo(item.timestamp)}</span>
          <ArrowRight className="w-3 h-3 text-muted-foreground" />
        </div>
      </div>
    </Link>
  );
}

function ActivitySkeleton() {
  return (
    <div className="flex items-center justify-between p-3 border-b">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  );
}

export default function OperationsCenter() {
  const { data: summary, isLoading, refetch } = useQuery<OperationsSummary>({
    queryKey: ["/api/fwa/operations-summary"],
    refetchInterval: 30000,
  });

  const attention = summary?.attentionRequired || {
    highRiskEntities: 0,
    overdueEnforcement: 0,
    pendingCases: 0,
    pendingPreAuth: 0,
  };

  const rawMetrics = summary?.keyMetrics || {};
  const metrics = {
    activeCases: rawMetrics.activeCases || 0,
    highRiskCount: rawMetrics.highRiskCount || 0,
    pendingActions: rawMetrics.pendingActions || 0,
    totalImpact: rawMetrics.totalImpact ?? rawMetrics.totalSavings ?? 0,
  };

  const recentActivity = summary?.recentActivity || [];
  
  const agents: TransformedAgent[] = summary?.systemHealth?.agentMetrics 
    ? [
        { name: "A1: Analysis Agent", status: summary.systemHealth.agentMetrics.analysisAgent?.status || "inactive", accuracy: Math.round((summary.systemHealth.agentMetrics.analysisAgent?.successRate || 0) * 100) },
        { name: "A2: Categorization Agent", status: summary.systemHealth.agentMetrics.categorizationAgent?.status || "inactive", accuracy: Math.round((summary.systemHealth.agentMetrics.categorizationAgent?.successRate || 0) * 100) },
        { name: "A3: Action Agent", status: summary.systemHealth.agentMetrics.actionAgent?.status || "inactive", accuracy: Math.round((summary.systemHealth.agentMetrics.actionAgent?.successRate || 0) * 100) },
        { name: "A4: History Agent", status: summary.systemHealth.agentMetrics.historyAgent?.status || "inactive", accuracy: Math.round((summary.systemHealth.agentMetrics.historyAgent?.successRate || 0) * 100) },
      ]
    : [];

  const totalAttention = attention.highRiskEntities + attention.overdueEnforcement + attention.pendingCases + attention.pendingPreAuth;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Command className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="page-title">
              Command Center <span className="text-lg font-normal text-muted-foreground mr-1">—</span>
              <span className="text-lg font-medium text-muted-foreground" dir="rtl">مركز القيادة</span>
            </h1>
            <p className="text-muted-foreground">
              National fraud intelligence overview — Council of Health Insurance
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" data-testid="button-refresh" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <CardTitle className="text-lg">Attention Required</CardTitle>
              {!isLoading && totalAttention > 0 && (
                <Badge variant="destructive" className="ml-2">{totalAttention} items</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <AttentionCard
              title="High-Risk Entities"
              count={attention.highRiskEntities}
              icon={Shield}
              colorClass="red"
              href="/fwa/high-risk-entities"
              isLoading={isLoading}
            />
            <AttentionCard
              title="Overdue Enforcement"
              count={attention.overdueEnforcement}
              icon={Gavel}
              colorClass="amber"
              href="/fwa/enforcement"
              isLoading={isLoading}
            />
            <AttentionCard
              title="Pending Cases"
              count={attention.pendingCases}
              icon={ClipboardList}
              colorClass="blue"
              href="/fwa/cases"
              isLoading={isLoading}
            />
            <AttentionCard
              title="Pending Pre-Auth"
              count={attention.pendingPreAuth}
              icon={FileCheck}
              colorClass="purple"
              href="/pre-auth"
              isLoading={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Active Cases"
          value={metrics.activeCases}
          icon={ClipboardList}
          description="Cases under investigation"
          isLoading={isLoading}
        />
        <MetricCard
          title="High-Risk Entities"
          value={metrics.highRiskCount}
          icon={AlertTriangle}
          description="Providers, doctors, patients"
          isLoading={isLoading}
        />
        <MetricCard
          title="Pending Actions"
          value={metrics.pendingActions}
          icon={Clock}
          description="Awaiting decision"
          isLoading={isLoading}
        />
        <MetricCard
          title="Total Impact"
          value={formatCurrency(metrics.totalImpact)}
          icon={DollarSign}
          description="Prospective & retrospective"
          isLoading={isLoading}
        />
      </div>

      {/* NPHIES Integration Flow */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">NPHIES Integration Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-2 overflow-x-auto py-2">
            {/* Provider */}
            <div className="flex flex-col items-center min-w-[120px]">
              <div className="px-4 py-3 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-center">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">Provider</p>
                <p className="text-xs text-blue-600 dark:text-blue-300" dir="rtl">مقدم الخدمة</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
            {/* NPHIES */}
            <div className="flex flex-col items-center min-w-[120px]">
              <div className="px-4 py-3 rounded-xl bg-green-100 dark:bg-green-900/30 text-center">
                <p className="text-sm font-semibold text-green-800 dark:text-green-200">NPHIES</p>
                <p className="text-xs text-green-600 dark:text-green-300" dir="rtl">نفيس</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
            {/* TachyHealth AI */}
            <div className="flex flex-col items-center min-w-[120px]">
              <div className="px-4 py-3 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-center">
                <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">TachyHealth AI</p>
                <p className="text-xs text-purple-600 dark:text-purple-300" dir="rtl">الكشف الذكي</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
            {/* Decision */}
            <div className="flex flex-col items-center min-w-[120px]">
              <div className="px-4 py-3 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-center">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Decision</p>
                <p className="text-xs text-amber-600 dark:text-amber-300" dir="rtl">القرار</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
            {/* Insurer */}
            <div className="flex flex-col items-center min-w-[120px]">
              <div className="px-4 py-3 rounded-xl bg-sky-100 dark:bg-sky-900/30 text-center">
                <p className="text-sm font-semibold text-sky-800 dark:text-sky-200">Insurer</p>
                <p className="text-xs text-sky-600 dark:text-sky-300" dir="rtl">شركة التأمين</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-muted-foreground" />
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/fwa/cases">
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <>
                  <ActivitySkeleton />
                  <ActivitySkeleton />
                  <ActivitySkeleton />
                  <ActivitySkeleton />
                  <ActivitySkeleton />
                </>
              ) : recentActivity.length > 0 ? (
                recentActivity.slice(0, 8).map((item) => (
                  <ActivityItem key={`${item.type}-${item.id}`} item={item} />
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  No recent activity
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-muted-foreground" />
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/fwa/detection-engine">
                  <Search className="w-4 h-4 mr-2" />
                  Run Detection Scan
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/fwa/enforcement">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Enforcement Case
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/fwa/high-risk-entities">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  View High-Risk Entities
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/fwa/kpi-dashboard">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Analytics & Reports
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-muted-foreground" />
                <CardTitle className="text-lg">System Health</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </>
              ) : agents.length > 0 ? (
                agents.map((agent) => (
                  <div key={agent.name} className="space-y-2" data-testid={`agent-metric-${agent.name.split(":")[0].toLowerCase().trim()}`}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{agent.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={agent.status === "active" ? "default" : "secondary"} className="text-xs">
                          {agent.status}
                        </Badge>
                        <span className="text-muted-foreground">{agent.accuracy}%</span>
                      </div>
                    </div>
                    <Progress value={agent.accuracy} className="h-2" />
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No agent metrics available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
