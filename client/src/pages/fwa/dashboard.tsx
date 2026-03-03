import * as React from "react";
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
import { MetricCard } from "@/components/metric-card";
import { formatCurrency } from "@/lib/format";
import { METRIC_GRID } from "@/lib/grid";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { SaudiHeatmap, type RegionData } from "@/components/fwa/saudi-heatmap";

// ---------------------------------------------------------------------------
// Alert type from API
// ---------------------------------------------------------------------------

interface AlertItem {
  id: string;
  text: string;
  severity: string;
  time: string;
}



const severityDotColor: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
  info: "bg-blue-500",
};

// ---------------------------------------------------------------------------
// NPHIES flow steps (data-driven for animation mapping)
// ---------------------------------------------------------------------------

const nphiesSteps = [
  { labelEn: "Provider", labelAr: "مقدم الخدمة", colorBg: "bg-blue-100 dark:bg-blue-900/30", colorText: "text-blue-800 dark:text-blue-200", colorSub: "text-blue-600 dark:text-blue-300" },
  { labelEn: "NPHIES", labelAr: "نفيس", colorBg: "bg-green-100 dark:bg-green-900/30", colorText: "text-green-800 dark:text-green-200", colorSub: "text-green-600 dark:text-green-300" },
  { labelEn: "TachyHealth AI", labelAr: "الكشف الذكي", colorBg: "bg-purple-100 dark:bg-purple-900/30", colorText: "text-purple-800 dark:text-purple-200", colorSub: "text-purple-600 dark:text-purple-300" },
  { labelEn: "Decision", labelAr: "القرار", colorBg: "bg-amber-100 dark:bg-amber-900/30", colorText: "text-amber-800 dark:text-amber-200", colorSub: "text-amber-600 dark:text-amber-300" },
  { labelEn: "Insurer", labelAr: "شركة التأمين", colorBg: "bg-sky-100 dark:bg-sky-900/30", colorText: "text-sky-800 dark:text-sky-200", colorSub: "text-sky-600 dark:text-sky-300" },
];

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------


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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function OperationsCenter() {
  const { data: summary, isLoading, refetch } = useQuery<OperationsSummary>({
    queryKey: ["/api/fwa/operations-summary"],
    refetchInterval: 30000,
  });

  const { data: heatmapData, isLoading: isHeatmapLoading } = useQuery<RegionData[]>({
    queryKey: ["/api/fwa/heatmap"],
    refetchInterval: 60000,
  });

  const { data: alertsData, isLoading: isAlertsLoading } = useQuery<AlertItem[]>({
    queryKey: ["/api/fwa/recent-alerts"],
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
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Command className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="page-title">
              Command Center <span className="text-lg font-normal text-muted-foreground mr-1">&mdash;</span>
              <span className="text-lg font-medium text-muted-foreground" dir="rtl">مركز القيادة</span>
            </h1>
            <p className="text-muted-foreground">
              National fraud intelligence overview &mdash; Council of Health Insurance
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

      {/* Row 1: National Overview — Saudi Heatmap + Alert Feed */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          National Overview
          <span className="block text-sm font-medium text-muted-foreground/70 mt-0.5">نظرة وطنية</span>
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Heatmap — 2/3 width */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                Saudi Arabia Regional Risk Map
                <span className="block text-sm font-normal text-muted-foreground/60 mt-0.5">خريطة المخاطر الإقليمية</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isHeatmapLoading ? (
                <Skeleton className="w-full h-[420px] rounded-lg" />
              ) : (
                <SaudiHeatmap data={heatmapData ?? []} className="max-h-[420px]" />
              )}
            </CardContent>
          </Card>

          {/* Alert Feed — 1/3 width */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </div>
                <CardTitle className="text-lg">
                  Recent Alerts
                  <span className="block text-sm font-normal text-muted-foreground/60 mt-0.5">التنبيهات الأخيرة</span>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[380px] overflow-y-auto divide-y">
                {isAlertsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-3">
                      <Skeleton className="mt-1.5 h-2.5 w-2.5 rounded-full shrink-0" />
                      <Skeleton className="h-4 w-4 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  ))
                ) : (alertsData ?? []).length > 0 ? (
                  (alertsData ?? []).map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-default"
                    >
                      <span className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${severityDotColor[alert.severity] || "bg-gray-400"}`} />
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug">{alert.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No recent alerts
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 2: Key Metrics with bilingual labels */}
      <div className={METRIC_GRID}>
        <MetricCard
          title="Active Cases"
          subtitle="الحالات النشطة"
          value={String(metrics.activeCases)}
          icon={ClipboardList}
          loading={isLoading}
        />
        <MetricCard
          title="High-Risk Entities"
          subtitle="تنبيهات الاحتيال"
          value={String(metrics.highRiskCount)}
          icon={AlertTriangle}
          loading={isLoading}
        />
        <MetricCard
          title="Pending Actions"
          subtitle="قيد التحقيق"
          value={String(metrics.pendingActions)}
          icon={Clock}
          loading={isLoading}
        />
        <MetricCard
          title="Total Impact"
          subtitle="درجة المخاطر"
          value={formatCurrency(metrics.totalImpact)}
          icon={DollarSign}
          loading={isLoading}
        />
      </div>

      {/* Row 3: Attention Required */}
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

      {/* Row 4: NPHIES Integration Flow (animated) + System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                NPHIES Integration Flow
                <span className="block text-sm font-normal text-muted-foreground/60 mt-0.5">مسار تكامل نفيس</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-2 overflow-x-auto py-2">
                {nphiesSteps.map((step, index) => (
                  <React.Fragment key={step.labelEn}>
                    <motion.div
                      className="flex flex-col items-center min-w-[120px]"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.3, duration: 0.5 }}
                    >
                      <div className={`px-4 py-3 rounded-xl ${step.colorBg} text-center`}>
                        <p className={`text-sm font-semibold ${step.colorText}`}>{step.labelEn}</p>
                        <p className={`text-xs ${step.colorSub}`} dir="rtl">{step.labelAr}</p>
                      </div>
                    </motion.div>
                    {index < nphiesSteps.length - 1 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.3 + 0.2, duration: 0.3 }}
                      >
                        <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
                      </motion.div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

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

      {/* Row 5: Recent Activity + Quick Actions */}
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
        </div>
      </div>
    </div>
  );
}
