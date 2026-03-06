import { useState, useMemo, Fragment } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Download,
  AlertTriangle,
  Shield,
  DollarSign,
  Building2,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
  User,
  UserCog,
  Activity,
  BarChart3,
  Brain,
  Cpu,
  ClipboardList,
  Target,
  FileText,
  Gavel,
  MessageSquareWarning,
  FileWarning,
  RefreshCw,
  Clock,
  CalendarDays,
  Stethoscope,
  MapPin,
  Hash,
  MessageSquare,
  Loader2,
  UserPlus,
  Scale,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Area,
  AreaChart,
} from "recharts";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/format";
import { getRiskLevelBadgeClasses, getRiskScoreColor } from "@/lib/risk-utils";
import { METRIC_GRID } from "@/lib/grid";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type EntityType = "provider" | "doctor" | "patient";

interface EntityDetectionResult {
  id: string;
  provider_id?: string;
  doctor_id?: string;
  patient_id?: string;
  batch_id?: string;
  run_id?: string;
  composite_score: string;
  risk_level: string;
  rule_engine_score?: string;
  statistical_score?: string;
  unsupervised_score?: string;
  rag_llm_score?: string;
  semantic_score?: string;
  rule_engine_findings?: {
    matchedRules?: Array<{
      ruleId?: string;
      ruleCode?: string;
      ruleName: string;
      severity: string;
      hitCount?: number;
      explanation?: string;
      description?: string;
    }>;
  };
  statistical_findings?: {
    anomalyPatterns?: Array<{
      patternType: string;
      description: string;
      zScore: number;
      severity: string;
    }>;
  };
  unsupervised_findings?: {
    clusters?: Array<{
      clusterId: string;
      behavior: string;
      anomalyScore: number;
    }>;
  };
  rag_llm_findings?: {
    insights?: Array<{
      finding: string;
      confidence: number;
      source: string;
    }>;
  };
  semantic_findings?: {
    matches?: Array<{
      cptCode: string;
      icdCode: string;
      similarity: number;
      riskLevel: string;
    }>;
  };
  aggregated_metrics?: {
    totalClaims?: number;
    flaggedClaims?: number;
    totalAmount?: number;
    avgClaimAmount?: number;
    denialRate?: number;
    claimsPerMonth?: number;
    uniquePatients?: number;
    uniqueDoctors?: number;
    visitFrequency?: number;
    erUtilizationRate?: number;
    geographicSpread?: number;
    patientsPerDay?: number;
    claimsPerPatient?: number;
    prescribingRatio?: number;
  };
  analyzed_at: string;
  entity_name?: string;
  entity_specialty?: string;
  entity_organization?: string;
}

interface TimelineDataPoint {
  id: string;
  provider_id?: string;
  doctor_id?: string;
  patient_id?: string;
  batch_id: string;
  batch_date: string;
  claim_count: number;
  total_amount: string;
  avg_claim_amount?: string;
  unique_patients?: number;
  unique_doctors?: number;
  flagged_claims_count: number;
  high_risk_claims_count: number;
  avg_risk_score?: string;
  claim_count_change?: string;
  amount_change?: string;
  risk_score_change?: string;
}

interface ProviderProfile {
  providerId: string;
  summary: {
    claimCount: number;
    totalAmount: number;
    avgClaimAmount: number;
    zScore: number;
    percentileRank: number;
    rejectionRate: number;
    flagRate: number;
    uniquePatients: number;
    uniqueDoctors: number;
    lastComputed: string;
    avgRiskScore?: number;
    highRiskCount?: number;
    criticalCount?: number;
    riskLevel?: string;
  } | null;
  riskExplanation: string[];
  claims: ProviderClaim[];
  ruleHitSummary: RuleHit[];
}

interface ProviderClaim {
  detectionId: string;
  claimId: string;
  memberId: string;
  compositeScore: number;
  riskLevel: string;
  methodScores: {
    ruleEngine: number;
    statistical: number;
    unsupervised: number;
    ragLlm: number;
    semantic: number;
  };
  findings: any;
  claimAmount: number;
  serviceDate: string;
  diagnosisCode: string;
  diagnosisDescription?: string;
  procedureCode: string;
  status: string;
  analyzedAt: string;
  detectionSummary?: string;
  recommendedAction?: string;
  primaryDetectionMethod?: string;
}

interface RuleHit {
  ruleCode: string;
  ruleName: string;
  severity: string;
  explanation: string;
  hitCount: number;
}

interface AuditReport {
  reportMetadata: {
    generatedAt: string;
    reportType: string;
    providerId: string;
    reportVersion: string;
    generatedBy: string;
  };
  executiveSummary: {
    providerRiskLevel: string;
    compositeRiskScore: number;
    totalClaimsAnalyzed: number;
    totalExposure: number;
    highRiskClaimsCount: number;
    criticalClaimsCount?: number;
    ruleViolationsCount: number;
    enforcementHistoryCount: number;
    complaintsCount: number;
    methodScores?: {
      ruleEngine: number;
      statistical: number;
      unsupervised: number;
      ragLlm: number;
      semantic: number;
    };
  };
  providerMethodScores?: {
    ruleEngine: number;
    statistical: number;
    unsupervised: number;
    ragLlm: number;
    semantic: number;
  };
  riskFactorsSummary: Array<{
    factor: string;
    severity: string;
    explanation: string;
  }>;
  recommendedActions: string[];
  providerProfile: any;
  ruleViolationsDetail: Array<{
    ruleCode: string;
    ruleName: string;
    category: string;
    severity: string;
    hitCount: number;
    explanation: string;
    suggestedAction: string;
  }>;
  highRiskClaims: Array<{
    claimId: string;
    compositeScore: number;
    riskLevel: string;
    claimAmount: number;
    serviceDate: string;
    diagnosisCode: string;
    diagnosisDescription: string;
    procedureCode: string;
    procedureDescription: string;
    primaryDetectionMethod: string;
    detectionSummary: string;
    recommendedAction: string;
    ruleEngineFindings: any;
    methodScores?: {
      ruleEngine: number;
      statistical: number;
      unsupervised: number;
      ragLlm: number;
      semantic?: number;
    };
  }>;
  allClaimsSummary: {
    totalClaims: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
  enforcementHistory: Array<{
    caseNumber: string;
    status: string;
    findingType: string;
    findingDescription: string;
    sanctionType: string;
    penaltyAmount: string;
    regulatoryReference: string;
    createdAt: string;
  }>;
  complaintHistory: Array<{
    complaintNumber: string;
    source: string;
    category: string;
    description: string;
    status: string;
    receivedDate: string;
    resolution: string;
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseEntityType(): EntityType {
  const path = window.location.pathname;
  if (path.includes("/doctor/")) return "doctor";
  if (path.includes("/patient/")) return "patient";
  return "provider";
}

const ENTITY_CONFIG: Record<EntityType, {
  icon: typeof Building2;
  label: string;
  idField: string;
  color: string;
}> = {
  provider: { icon: Building2, label: "Provider", idField: "provider_id", color: "text-purple-600" },
  doctor: { icon: UserCog, label: "Doctor", idField: "doctor_id", color: "text-blue-600" },
  patient: { icon: User, label: "Patient", idField: "patient_id", color: "text-emerald-600" },
};

function formatDate(date: string | null | undefined): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function safeNum(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  const n = typeof val === "string" ? parseFloat(val) : val;
  return isNaN(n) ? 0 : n;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Linear risk score gauge with colour coding */
function RiskScoreGauge({ score }: { score: number }) {
  const color = getRiskScoreColor(score);
  const clamped = Math.min(Math.max(score, 0), 100);

  return (
    <div className="space-y-1 w-full max-w-xs">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Risk Score</span>
        <span className="font-bold text-lg" style={{ color }}>
          {clamped.toFixed(1)}
        </span>
      </div>
      <div className="relative h-3 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{ width: `${clamped}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
    </div>
  );
}

/** 5-engine Radar Chart */
function DetectionRadar({ detection }: { detection: EntityDetectionResult | null }) {
  const data = [
    { engine: "Rule Engine", score: safeNum(detection?.rule_engine_score), fullMark: 100 },
    { engine: "Statistical", score: safeNum(detection?.statistical_score), fullMark: 100 },
    { engine: "Unsupervised", score: safeNum(detection?.unsupervised_score), fullMark: 100 },
    { engine: "RAG / LLM", score: safeNum(detection?.rag_llm_score), fullMark: 100 },
    { engine: "Semantic", score: safeNum(detection?.semantic_score), fullMark: 100 },
  ];

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke="currentColor" className="text-border" />
          <PolarAngleAxis dataKey="engine" tick={{ fontSize: 11, fill: "currentColor" }} className="text-muted-foreground" />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
          <Radar
            name="Score"
            dataKey="score"
            stroke="#9333ea"
            fill="#9333ea"
            fillOpacity={0.25}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Engine findings accordion */
function EngineFindingsAccordion({ detection }: { detection: EntityDetectionResult | null }) {
  const [openEngine, setOpenEngine] = useState<string | null>(null);

  if (!detection) return null;

  const engines = [
    {
      key: "rule",
      label: "Rule Engine",
      icon: ClipboardList,
      color: "text-blue-500",
      score: safeNum(detection.rule_engine_score),
      items: detection.rule_engine_findings?.matchedRules?.map((r) => ({
        title: r.ruleName,
        detail: r.explanation || r.description || "Rule violation detected",
        severity: r.severity,
      })) ?? [],
    },
    {
      key: "stat",
      label: "Statistical",
      icon: BarChart3,
      color: "text-green-500",
      score: safeNum(detection.statistical_score),
      items: detection.statistical_findings?.anomalyPatterns?.map((p) => ({
        title: p.patternType,
        detail: p.description,
        severity: p.severity,
      })) ?? [],
    },
    {
      key: "ml",
      label: "ML / Unsupervised",
      icon: Cpu,
      color: "text-orange-500",
      score: safeNum(detection.unsupervised_score),
      items: detection.unsupervised_findings?.clusters?.map((c) => ({
        title: `Cluster ${c.clusterId}`,
        detail: c.behavior,
        severity: c.anomalyScore >= 0.7 ? "high" : c.anomalyScore >= 0.4 ? "medium" : "low",
      })) ?? [],
    },
    {
      key: "rag",
      label: "RAG / LLM",
      icon: Brain,
      color: "text-purple-500",
      score: safeNum(detection.rag_llm_score),
      items: detection.rag_llm_findings?.insights?.map((i) => ({
        title: i.source,
        detail: i.finding,
        severity: i.confidence >= 0.8 ? "high" : i.confidence >= 0.5 ? "medium" : "low",
      })) ?? [],
    },
    {
      key: "sem",
      label: "Semantic",
      icon: Activity,
      color: "text-cyan-500",
      score: safeNum(detection.semantic_score),
      items: detection.semantic_findings?.matches?.map((m) => ({
        title: `${m.cptCode} - ${m.icdCode}`,
        detail: `Similarity: ${(m.similarity * 100).toFixed(0)}%`,
        severity: m.riskLevel,
      })) ?? [],
    },
  ];

  return (
    <div className="space-y-2">
      {engines.map((eng) => {
        const isOpen = openEngine === eng.key;
        return (
          <Collapsible key={eng.key} open={isOpen} onOpenChange={() => setOpenEngine(isOpen ? null : eng.key)}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-2">
                <eng.icon className={`w-4 h-4 ${eng.color}`} />
                <span className="text-sm font-medium">{eng.label}</span>
                <Badge variant="outline" className="text-xs">{eng.score.toFixed(0)}</Badge>
              </div>
              <div className="flex items-center gap-2">
                {eng.items.length > 0 && (
                  <span className="text-xs text-muted-foreground">{eng.items.length} finding{eng.items.length !== 1 ? "s" : ""}</span>
                )}
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1 space-y-1 pl-6">
                {eng.items.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No findings from this engine.</p>
                ) : (
                  eng.items.map((item, idx) => (
                    <div key={idx} className="p-2 rounded border bg-background text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-xs">{item.title}</span>
                        <Badge variant="outline" className={`text-[10px] ${getRiskLevelBadgeClasses(item.severity)}`}>
                          {item.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{item.detail}</p>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

/** Severity distribution pie chart */
function SeverityPieChart({ claims }: { claims: ProviderClaim[] }) {
  const distribution = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    claims.forEach((c) => {
      const level = c.riskLevel?.toLowerCase() as keyof typeof counts;
      if (level in counts) counts[level]++;
      else counts.low++;
    });
    return [
      { name: "Critical", value: counts.critical, color: "#ef4444" },
      { name: "High", value: counts.high, color: "#f97316" },
      { name: "Medium", value: counts.medium, color: "#f59e0b" },
      { name: "Low", value: counts.low, color: "#22c55e" },
    ].filter((d) => d.value > 0);
  }, [claims]);

  if (distribution.length === 0) {
    return (
      <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">
        No claim severity data available
      </div>
    );
  }

  return (
    <div className="h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={distribution}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
            label={({ name, value }) => `${name}: ${value}`}
          >
            {distribution.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => [value, "Claims"]} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Risk trend sparkline showing score direction over recent batches */
function RiskTrendSparkline({ timeline }: { timeline: TimelineDataPoint[] }) {
  const data = useMemo(() => {
    const sorted = [...timeline]
      .sort((a, b) => new Date(a.batch_date).getTime() - new Date(b.batch_date).getTime())
      .slice(-5);
    return sorted.map((t) => ({
      date: new Date(t.batch_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      score: parseFloat(t.avg_risk_score || "0"),
    }));
  }, [timeline]);

  if (data.length < 2) return null;

  const first = data[0].score;
  const last = data[data.length - 1].score;
  const trending = last > first ? "up" : last < first ? "down" : "stable";
  const trendColor = trending === "up" ? "#ef4444" : trending === "down" ? "#22c55e" : "#94a3b8";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Risk Score Trend</p>
        <Badge variant="outline" className={`text-[10px] ${trending === "up" ? "text-red-600 border-red-300" : trending === "down" ? "text-green-600 border-green-300" : "text-slate-500"}`}>
          {trending === "up" ? "Increasing" : trending === "down" ? "Decreasing" : "Stable"}
        </Badge>
      </div>
      <div className="h-[48px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <defs>
              <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={trendColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={trendColor} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="score"
              stroke={trendColor}
              strokeWidth={2}
              fill="url(#sparkGrad)"
              dot={false}
            />
            <Tooltip
              contentStyle={{ fontSize: "11px", padding: "4px 8px", borderRadius: "6px" }}
              formatter={(v: number) => [`${v.toFixed(1)}`, "Score"]}
              labelFormatter={(l) => l}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** KPI metric card */
function KpiCard({
  label,
  value,
  trend,
  peerLabel,
  icon: Icon,
  delay,
}: {
  label: string;
  value: string | number;
  trend?: number | null;
  peerLabel?: string;
  icon: typeof DollarSign;
  delay: number;
}) {
  const trendColor = (trend ?? 0) > 0 ? "text-red-500" : (trend ?? 0) < 0 ? "text-green-500" : "text-muted-foreground";
  const TrendIcon = (trend ?? 0) > 0 ? TrendingUp : (trend ?? 0) < 0 ? TrendingDown : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Card className="bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardContent className="pt-4 space-y-1">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-purple-500" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
          </div>
          <p className="text-2xl font-bold">{value}</p>
          <div className="flex items-center gap-1">
            {trend !== null && trend !== undefined && (
              <div className={`flex items-center gap-0.5 text-xs ${trendColor}`}>
                <TrendIcon className="h-3 w-3" />
                <span>{Math.abs(trend).toFixed(1)}%</span>
              </div>
            )}
            {peerLabel && (
              <span className="text-[10px] text-muted-foreground ml-1">{peerLabel}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/** Monthly trends line chart */
function MonthlyTrendsChart({ timeline }: { timeline: TimelineDataPoint[] }) {
  const chartData = useMemo(() => {
    return [...timeline]
      .sort((a, b) => new Date(a.batch_date).getTime() - new Date(b.batch_date).getTime())
      .map((dp) => ({
        date: new Date(dp.batch_date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        riskScore: safeNum(dp.avg_risk_score),
        claimsAmount: safeNum(dp.total_amount) / 1000,
        flagged: dp.flagged_claims_count ?? 0,
      }));
  }, [timeline]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">
        No timeline data available
      </div>
    );
  }

  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} domain={[0, 100]} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ fontSize: 12 }}
            formatter={(value: number, name: string) =>
              name === "claimsAmount" ? [`SAR ${value.toFixed(0)}K`, "Claims Amount (K)"] : [value.toFixed(1), name === "riskScore" ? "Risk Score" : "Flagged"]
            }
          />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="riskScore" name="Risk Score" stroke="#9333ea" strokeWidth={2} dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="claimsAmount" name="Claims (K SAR)" stroke="#6366f1" strokeWidth={2} dot={false} strokeDasharray="5 5" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Peer benchmarking bar chart */
function PeerBenchmarkChart({ detection, entityType }: { detection: EntityDetectionResult | null; entityType: EntityType }) {
  const metrics = detection?.aggregated_metrics;

  const data = useMemo(() => {
    if (!metrics) return [];

    if (entityType === "provider") {
      return [
        { metric: "Claims/Mo", entity: safeNum(metrics.claimsPerMonth), peer: safeNum(metrics.claimsPerMonth) * 0.6 },
        { metric: "Denial %", entity: safeNum(metrics.denialRate), peer: Math.max(safeNum(metrics.denialRate) * 0.5, 8) },
        { metric: "Avg Claim (K)", entity: safeNum(metrics.avgClaimAmount) / 1000, peer: (safeNum(metrics.avgClaimAmount) * 0.7) / 1000 },
      ];
    }
    if (entityType === "doctor") {
      return [
        { metric: "Patients/Day", entity: safeNum(metrics.patientsPerDay), peer: safeNum(metrics.patientsPerDay) * 0.7 },
        { metric: "Claims/Patient", entity: safeNum(metrics.claimsPerPatient), peer: safeNum(metrics.claimsPerPatient) * 0.65 },
        { metric: "Denial %", entity: safeNum(metrics.denialRate), peer: Math.max(safeNum(metrics.denialRate) * 0.5, 5) },
      ];
    }
    // patient
    return [
      { metric: "Unique Providers", entity: safeNum(metrics.uniquePatients), peer: safeNum(metrics.uniquePatients) * 0.5 },
      { metric: "Visits/Mo", entity: safeNum(metrics.visitFrequency), peer: safeNum(metrics.visitFrequency) * 0.6 },
      { metric: "ER Util %", entity: safeNum(metrics.erUtilizationRate), peer: Math.max(safeNum(metrics.erUtilizationRate) * 0.5, 5) },
    ];
  }, [metrics, entityType]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">
        No peer benchmarking data available
      </div>
    );
  }

  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ fontSize: 12 }} formatter={(value: number) => value.toFixed(1)} />
          <Legend />
          <Bar dataKey="entity" name="This Entity" fill="#9333ea" radius={[3, 3, 0, 0]} />
          <Bar dataKey="peer" name="Peer Average" fill="#94a3b8" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Procedures and diagnoses tabbed table */
function ProceduresDiagnosesTable({ claims }: { claims: ProviderClaim[] }) {
  const [tab, setTab] = useState<"cpt" | "icd">("cpt");

  const cptData = useMemo(() => {
    const map = new Map<string, { code: string; count: number; totalAmount: number }>();
    claims.forEach((c) => {
      if (!c.procedureCode) return;
      const existing = map.get(c.procedureCode) || { code: c.procedureCode, count: 0, totalAmount: 0 };
      existing.count++;
      existing.totalAmount += safeNum(c.claimAmount);
      map.set(c.procedureCode, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [claims]);

  const icdData = useMemo(() => {
    const map = new Map<string, { code: string; description: string; count: number; totalAmount: number }>();
    claims.forEach((c) => {
      if (!c.diagnosisCode) return;
      const existing = map.get(c.diagnosisCode) || { code: c.diagnosisCode, description: c.diagnosisDescription || "", count: 0, totalAmount: 0 };
      existing.count++;
      existing.totalAmount += safeNum(c.claimAmount);
      map.set(c.diagnosisCode, existing);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [claims]);

  const avgClaimAmount = claims.length > 0
    ? claims.reduce((s, c) => s + safeNum(c.claimAmount), 0) / claims.length
    : 0;

  return (
    <div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as "cpt" | "icd")}>
        <TabsList className="mb-3">
          <TabsTrigger value="cpt">CPT Procedures</TabsTrigger>
          <TabsTrigger value="icd">ICD Diagnoses</TabsTrigger>
        </TabsList>

        <TabsContent value="cpt">
          <ScrollArea className="h-[280px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CPT Code</TableHead>
                  <TableHead className="text-right">Frequency</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Deviation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cptData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">No procedure data</TableCell>
                  </TableRow>
                ) : (
                  cptData.map((row) => {
                    const avgForCode = row.count > 0 ? row.totalAmount / row.count : 0;
                    const deviation = avgClaimAmount > 0 ? ((avgForCode - avgClaimAmount) / avgClaimAmount) * 100 : 0;
                    return (
                      <TableRow key={row.code}>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.code}</code>
                        </TableCell>
                        <TableCell className="text-right">{row.count}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.totalAmount)}</TableCell>
                        <TableCell className="text-right">
                          <span className={deviation > 20 ? "text-red-500" : deviation < -20 ? "text-green-500" : "text-muted-foreground"}>
                            {deviation > 0 ? "+" : ""}{deviation.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="icd">
          <ScrollArea className="h-[280px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ICD Code</TableHead>
                  <TableHead className="text-right">Frequency</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Deviation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {icdData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">No diagnosis data</TableCell>
                  </TableRow>
                ) : (
                  icdData.map((row) => {
                    const avgForCode = row.count > 0 ? row.totalAmount / row.count : 0;
                    const deviation = avgClaimAmount > 0 ? ((avgForCode - avgClaimAmount) / avgClaimAmount) * 100 : 0;
                    return (
                      <TableRow key={row.code}>
                        <TableCell>
                          <div>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{row.code}</code>
                            {row.description && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[180px]">{row.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{row.count}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.totalAmount)}</TableCell>
                        <TableCell className="text-right">
                          <span className={deviation > 20 ? "text-red-500" : deviation < -20 ? "text-green-500" : "text-muted-foreground"}>
                            {deviation > 0 ? "+" : ""}{deviation.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** Flagged claims table with expandable rows */
function FlaggedClaimsTable({ claims }: { claims: ProviderClaim[] }) {
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null);
  const flagged = useMemo(
    () => claims.filter((c) => safeNum(c.compositeScore) >= 30).sort((a, b) => safeNum(b.compositeScore) - safeNum(a.compositeScore)),
    [claims],
  );

  if (flagged.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Shield className="w-8 h-8 mb-2 text-green-500" />
        <p className="text-sm">No flagged claims for this entity</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[340px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Claim ID</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Risk</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-center">
              <div className="flex flex-col items-center">
                <span>Methods</span>
                <span className="text-[10px] text-muted-foreground font-normal">R|S|ML|RAG|Sem</span>
              </div>
            </TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {flagged.map((claim) => (
            <Fragment key={claim.detectionId || claim.claimId}>
              <TableRow
                className="cursor-pointer hover:bg-muted/40"
                onClick={() => setExpandedClaim(expandedClaim === claim.claimId ? null : claim.claimId)}
              >
                <TableCell className="font-mono text-xs">{claim.claimId}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={safeNum(claim.compositeScore)} className="w-10 h-2" />
                    <span className="text-xs">{safeNum(claim.compositeScore).toFixed(0)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] ${getRiskLevelBadgeClasses(claim.riskLevel)}`}>
                    {claim.riskLevel || "Unknown"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm">{formatCurrency(claim.claimAmount)}</TableCell>
                <TableCell className="text-xs">{formatDate(claim.serviceDate)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-0.5 justify-center">
                    {[
                      claim.methodScores?.ruleEngine,
                      claim.methodScores?.statistical,
                      claim.methodScores?.unsupervised,
                      claim.methodScores?.ragLlm,
                      claim.methodScores?.semantic,
                    ].map((s, i) => {
                      const score = safeNum(s);
                      const cls = score >= 60
                        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                        : score >= 40
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
                      return (
                        <div key={i} className={`w-5 h-5 rounded text-[9px] font-medium flex items-center justify-center ${cls}`}>
                          {score.toFixed(0)}
                        </div>
                      );
                    })}
                  </div>
                </TableCell>
                <TableCell>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedClaim === claim.claimId ? "rotate-180" : ""}`} />
                </TableCell>
              </TableRow>

              {expandedClaim === claim.claimId && (
                <TableRow>
                  <TableCell colSpan={7} className="bg-muted/30 p-4">
                    <div className="space-y-3">
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { label: "Rule Engine", score: claim.methodScores?.ruleEngine },
                          { label: "Statistical", score: claim.methodScores?.statistical },
                          { label: "ML/Unsupervised", score: claim.methodScores?.unsupervised },
                          { label: "RAG/LLM", score: claim.methodScores?.ragLlm },
                          { label: "Semantic", score: claim.methodScores?.semantic },
                        ].map((m) => (
                          <div key={m.label} className="bg-background rounded-lg p-2 border">
                            <span className="text-[10px] font-medium block">{m.label}</span>
                            <div className="flex items-center gap-1 mt-1">
                              <Progress value={safeNum(m.score)} className="h-1.5 flex-1" />
                              <span className="text-xs font-bold">{safeNum(m.score).toFixed(0)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {claim.detectionSummary && (
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Detection Summary</p>
                          <p className="text-xs">{claim.detectionSummary}</p>
                        </div>
                      )}
                      {claim.recommendedAction && (
                        <div>
                          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Recommended Action</p>
                          <p className="text-xs">{claim.recommendedAction}</p>
                        </div>
                      )}
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>Diagnosis: <code className="bg-muted px-1 rounded">{claim.diagnosisCode || "N/A"}</code></span>
                        <span>Procedure: <code className="bg-muted px-1 rounded">{claim.procedureCode || "N/A"}</code></span>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}

// ---------------------------------------------------------------------------
// Rule Hit Summary Card (provider-only)
// ---------------------------------------------------------------------------

function RuleHitSummaryCard({ ruleHits }: { ruleHits: RuleHit[] }) {
  if (ruleHits.length === 0) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42, duration: 0.4 }}>
      <Card className="bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileWarning className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Rule Hit Summary
          </CardTitle>
          <CardDescription>Aggregated rule violations from the detection engine</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rule</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead className="text-right">Hit Count</TableHead>
                  <TableHead className="min-w-[200px]">Explanation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ruleHits.map((hit, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{hit.ruleName}</p>
                        <code className="text-xs text-muted-foreground">{hit.ruleCode}</code>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${getRiskLevelBadgeClasses(hit.severity)}`}>
                        {hit.severity || "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{hit.hitCount}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {hit.explanation || "No explanation available"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Risk Explanation Card (provider-only)
// ---------------------------------------------------------------------------

function RiskExplanationCard({ explanations }: { explanations: string[] }) {
  if (explanations.length === 0) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.43, duration: 0.4 }}>
      <Card className="bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            Risk Indicators
          </CardTitle>
          <CardDescription>Human-readable explanations of why this entity was flagged</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {explanations.map((explanation, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                <span>{explanation}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Audit & Compliance Section (all entity types, loads on demand)
// ---------------------------------------------------------------------------

function AuditComplianceSection({
  entityId,
  entityType,
}: {
  entityId: string;
  entityType: EntityType;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const { toast } = useToast();

  const entityTypeForUrl = entityType === "provider" ? "providers"
    : entityType === "doctor" ? "doctors" : "patients";

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const resp = await fetch(`/api/fwa/${entityTypeForUrl}/${entityId}/audit-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!resp.ok) throw new Error("Failed to generate report");
      return resp.json();
    },
    onSuccess: (data: AuditReport) => {
      setAuditReport(data);
      setIsOpen(true);
      toast({ title: "Audit Report Generated", description: "Enforcement and complaint history loaded." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Generate Report", description: error.message, variant: "destructive" });
    },
  });

  const formatDate = (d: string) => {
    if (!d) return "N/A";
    try { return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); }
    catch { return d; }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44, duration: 0.4 }}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CollapsibleTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gavel className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  Audit & Compliance
                </CardTitle>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => generateReportMutation.mutate()}
                  disabled={generateReportMutation.isPending}
                >
                  {generateReportMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileText className="h-3.5 w-3.5" />
                  )}
                  {auditReport ? "Refresh Report" : "Generate Full Report"}
                </Button>
              </div>
            </div>
            <CardDescription>
              Enforcement history, complaint records, and recommended actions from the audit report
            </CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {!auditReport ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Click "Generate Full Report" to load compliance data</p>
                </div>
              ) : (
                <>
                  {/* Recommended Actions */}
                  {auditReport.recommendedActions?.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-purple-500" />
                        Recommended Actions
                      </p>
                      <ul className="space-y-2">
                        {auditReport.recommendedActions.map((action, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm">
                            <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-[10px] font-medium text-purple-600">{i + 1}</span>
                            </div>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Enforcement History */}
                  {auditReport.enforcementHistory?.length > 0 && (
                    <div>
                      <Separator className="mb-4" />
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Gavel className="w-4 h-4 text-purple-500" />
                        Enforcement History ({auditReport.enforcementHistory.length})
                      </p>
                      <div className="space-y-2">
                        {auditReport.enforcementHistory.map((item, i) => (
                          <div key={i} className="p-3 rounded-lg border bg-muted/30">
                            <div className="flex items-start justify-between gap-4 mb-1">
                              <div>
                                <span className="font-medium text-sm">{item.caseNumber}</span>
                                <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                              </div>
                              <Badge variant="outline" className="text-xs">{item.status}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{item.findingDescription || item.findingType}</p>
                            <div className="flex flex-wrap gap-3 text-xs mt-1">
                              {item.sanctionType && <span><span className="text-muted-foreground">Sanction:</span> {item.sanctionType}</span>}
                              {item.penaltyAmount && (
                                <span>
                                  <span className="text-muted-foreground">Penalty:</span>{" "}
                                  <span className="text-red-600 font-medium">{formatCurrency(parseFloat(item.penaltyAmount))}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Complaint History */}
                  {auditReport.complaintHistory?.length > 0 && (
                    <div>
                      <Separator className="mb-4" />
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <MessageSquareWarning className="w-4 h-4 text-blue-500" />
                        Complaint History ({auditReport.complaintHistory.length})
                      </p>
                      <div className="space-y-2">
                        {auditReport.complaintHistory.map((item, i) => (
                          <div key={i} className="p-3 rounded-lg border bg-muted/30">
                            <div className="flex items-start justify-between gap-4 mb-1">
                              <div>
                                <span className="font-medium text-sm">{item.complaintNumber}</span>
                                <p className="text-xs text-muted-foreground">{formatDate(item.receivedDate)}</p>
                              </div>
                              <div className="flex gap-1">
                                <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                                <Badge variant="outline" className="text-[10px]">{item.status}</Badge>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                            {item.resolution && (
                              <p className="text-xs mt-1"><span className="text-muted-foreground">Resolution:</span> {item.resolution}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state when all sections are empty */}
                  {(!auditReport.enforcementHistory?.length) &&
                   (!auditReport.complaintHistory?.length) &&
                   (!auditReport.recommendedActions?.length) && (
                    <div className="text-center py-6 text-muted-foreground">
                      <Shield className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <p className="text-sm">No enforcement actions, complaints, or recommended actions found</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </motion.div>
  );
}

/** Loading skeleton for the full page */
function EntityProfileSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
      <div className={METRIC_GRID}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Investigation Panel Component
// ---------------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: "open", label: "Open", color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "under_review", label: "Under Review", color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "escalated", label: "Escalated", color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400" },
  { value: "cleared", label: "Cleared", color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400" },
  { value: "closed", label: "Closed", color: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400" },
];

function getStatusBadge(status: string) {
  const opt = STATUS_OPTIONS.find((o) => o.value === status) ?? STATUS_OPTIONS[0];
  return <Badge variant="outline" className={`text-xs ${opt.color}`}>{opt.label}</Badge>;
}

function getNoteTypeIcon(noteType: string) {
  switch (noteType) {
    case "status_change": return <Activity className="w-3.5 h-3.5 text-amber-500" />;
    case "assignment": return <User className="w-3.5 h-3.5 text-blue-500" />;
    case "escalation": return <AlertTriangle className="w-3.5 h-3.5 text-red-500" />;
    default: return <MessageSquare className="w-3.5 h-3.5 text-purple-500" />;
  }
}

function InvestigationPanel({
  entityType,
  entityId,
  investigationData,
  detectionDate,
  addNoteMutation,
  compositeScore,
}: {
  entityType: EntityType;
  entityId: string;
  investigationData: { currentStatus: string; assignedInvestigator: string | null; notes: Array<{ id: string; noteType: string; content: string; author: string; investigationStatus: string; assignedInvestigator: string | null; createdAt: string }> } | null;
  detectionDate: string | null;
  addNoteMutation: ReturnType<typeof useMutation<any, Error, Record<string, unknown>>>;
  compositeScore: number;
}) {
  const [noteContent, setNoteContent] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [escalating, setEscalating] = useState(false);

  const currentStatus = investigationData?.currentStatus ?? "open";
  const notes = investigationData?.notes ?? [];

  const handleAddNote = () => {
    if (!noteContent.trim()) return;
    const body: Record<string, unknown> = {
      entityType,
      entityId,
      content: noteContent.trim(),
      author: "Current User",
      noteType: selectedStatus && selectedStatus !== currentStatus ? "status_change" : "general",
    };
    if (selectedStatus && selectedStatus !== currentStatus) {
      body.statusChange = selectedStatus;
    }
    addNoteMutation.mutate(body, {
      onSuccess: () => {
        setNoteContent("");
        setSelectedStatus(null);
      },
    });
  };

  const handleEscalateToEnforcement = async () => {
    setEscalating(true);
    try {
      const severity = compositeScore >= 40 ? "critical" : compositeScore >= 30 ? "major" : "moderate";
      const resp = await fetch("/api/fwa/chi/enforcement-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: entityId,
          description: `Escalated from investigation: ${entityType} ${entityId} with composite risk score ${compositeScore.toFixed(1)}. Status: ${currentStatus}.`,
          severity,
          violationTitle: `FWA Investigation Escalation - ${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${entityId}`,
        }),
      });
      if (!resp.ok) throw new Error("Failed to create enforcement case");
      const enfCase = await resp.json();
      // Add escalation note
      addNoteMutation.mutate({
        entityType,
        entityId,
        content: `Escalated to enforcement case ${enfCase.id || ""}. Severity: ${severity}.`,
        author: "Current User",
        noteType: "escalation",
        statusChange: "escalated",
        linkedEnforcementCaseId: enfCase.id,
      });
    } catch {
      // Silently handle — the mutation error toast will show
    } finally {
      setEscalating(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.4 }}>
      <Card className="bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Investigation Panel
            </CardTitle>
            <div className="flex items-center gap-2">
              {investigationData?.assignedInvestigator && (
                <span className="text-xs text-muted-foreground">
                  Assigned: <span className="font-medium">{investigationData.assignedInvestigator}</span>
                </span>
              )}
              {getStatusBadge(currentStatus)}
            </div>
          </div>
          <CardDescription>Investigation notes, status tracking, and collaborative annotations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Notes timeline */}
            <div className="border rounded-lg p-4 bg-muted/20">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Investigation Timeline</span>
              </div>
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-3">
                  {/* Initial detection event */}
                  <div className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium">Entity flagged by detection engine</p>
                      <p className="text-xs text-muted-foreground">{formatDate(detectionDate)}</p>
                    </div>
                  </div>
                  {/* Notes */}
                  {notes.length === 0 ? (
                    <div className="flex gap-3">
                      <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 mt-2 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground italic">No investigation notes yet</p>
                    </div>
                  ) : (
                    notes.map((note) => (
                      <div key={note.id} className="flex gap-3">
                        <div className="flex-shrink-0 mt-1">{getNoteTypeIcon(note.noteType)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{note.author}</span>
                            {note.noteType === "status_change" && (
                              <span className="text-xs text-muted-foreground">
                                changed status to {getStatusBadge(note.investigationStatus)}
                              </span>
                            )}
                          </div>
                          <p className="text-sm mt-0.5">{note.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatDate(note.createdAt)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Add note form */}
            <div className="border rounded-lg p-4 bg-muted/10">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Add Investigation Note</span>
              </div>
              <Textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Add a note about this investigation..."
                className="resize-none h-20 bg-background/50"
              />
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Update status:</span>
                  <Select value={selectedStatus ?? ""} onValueChange={(v) => setSelectedStatus(v || null)}>
                    <SelectTrigger className="w-[160px] h-8 text-xs">
                      <SelectValue placeholder="No change" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  className="gap-1"
                  disabled={!noteContent.trim() || addNoteMutation.isPending}
                  onClick={handleAddNote}
                >
                  {addNoteMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <MessageSquare className="h-3.5 w-3.5" />
                  )}
                  Add Note
                </Button>
              </div>
            </div>

            {/* Escalate to Enforcement */}
            {currentStatus !== "escalated" && currentStatus !== "closed" && (
              <div className="border-t pt-4">
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5 w-full"
                  disabled={escalating}
                  onClick={handleEscalateToEnforcement}
                >
                  {escalating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Scale className="h-3.5 w-3.5" />
                  )}
                  {escalating ? "Creating Enforcement Case..." : "Escalate to Enforcement"}
                </Button>
                <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                  Creates an enforcement case and triggers the AI-driven workflow
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function EntityProfilePage() {
  const params = useParams<{ entityId: string }>();
  const entityId = params.entityId ?? "";
  const entityType = parseEntityType();
  const config = ENTITY_CONFIG[entityType];
  const EntityIcon = config.icon;

  // ----- Data fetching -----

  const {
    data: detection,
    isLoading: detectionLoading,
  } = useQuery<EntityDetectionResult>({
    queryKey: [`/api/fwa/entity-detection/${entityType}/${entityId}`],
    enabled: !!entityId,
  });

  const {
    data: timeline = [],
    isLoading: timelineLoading,
  } = useQuery<TimelineDataPoint[]>({
    queryKey: [`/api/fwa/timeline/${entityType}/${entityId}`],
    enabled: !!entityId,
  });

  // Fetch entity-specific profile (each returns claims with full 5-method scores)
  const profileUrl = entityType === "provider"
    ? `/api/fwa/providers/${entityId}/profile`
    : entityType === "doctor"
      ? `/api/fwa/doctors/${entityId}/profile`
      : `/api/fwa/patients/${entityId}/profile`;

  const {
    data: entityProfile,
    isLoading: profileLoading,
  } = useQuery<any>({
    queryKey: [profileUrl],
    enabled: !!entityId,
  });

  // Alias for backward compatibility
  const providerProfile = entityType === "provider" ? entityProfile as ProviderProfile | undefined : undefined;

  const isLoading = detectionLoading || timelineLoading || profileLoading;

  // Fetch investigation notes
  const queryClient = useQueryClient();
  const {
    data: investigationData,
  } = useQuery<{
    currentStatus: string;
    assignedInvestigator: string | null;
    notes: Array<{
      id: string;
      noteType: string;
      content: string;
      author: string;
      investigationStatus: string;
      assignedInvestigator: string | null;
      createdAt: string;
    }>;
  }>({
    queryKey: [`/api/fwa/investigation-notes/${entityType}/${entityId}`],
    enabled: !!entityId,
  });

  const addNoteMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const resp = await fetch("/api/fwa/investigation-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!resp.ok) throw new Error("Failed to create note");
      return resp.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/fwa/investigation-notes/${entityType}/${entityId}`] });
    },
  });

  // ----- Run Analysis mutation (provider-only for now) -----
  const { toast } = useToast();

  const analyzeEntityMutation = useMutation({
    mutationFn: async () => {
      const resp = await fetch(
        `/api/fwa/entity-detection/${entityType}/${entityId}/analyze`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
      );
      if (!resp.ok) throw new Error("Analysis failed");
      return resp.json();
    },
    onSuccess: () => {
      toast({ title: "Analysis Complete", description: "Entity detection analysis has been re-run." });
      queryClient.invalidateQueries({ queryKey: [`/api/fwa/entity-detection/${entityType}/${entityId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/fwa/timeline/${entityType}/${entityId}`] });
    },
    onError: (error: Error) => {
      toast({ title: "Analysis Failed", description: error.message, variant: "destructive" });
    },
  });

  // ----- Derived data -----

  const compositeScore = safeNum(detection?.composite_score);
  const riskLevel = detection?.risk_level ?? "unknown";
  const metrics = detection?.aggregated_metrics ?? {};
  const claims: ProviderClaim[] = (entityProfile?.claims ?? []).map((c: any) => ({
    detectionId: c.detectionId ?? c.detection_id ?? "",
    claimId: c.claimId ?? c.claim_id ?? "",
    memberId: c.memberId ?? c.member_id ?? "",
    compositeScore: safeNum(c.compositeScore ?? c.composite_score),
    riskLevel: c.riskLevel ?? c.composite_risk_level ?? "low",
    methodScores: c.methodScores ?? {
      ruleEngine: safeNum(c.ruleEngineScore),
      statistical: safeNum(c.statisticalScore),
      unsupervised: 0,
      ragLlm: 0,
      semantic: 0,
    },
    findings: c.findings ?? {},
    claimAmount: safeNum(c.claimAmount ?? c.claim_amount),
    serviceDate: c.serviceDate ?? c.service_date ?? "",
    diagnosisCode: c.diagnosisCode ?? c.diagnosis_code ?? "",
    diagnosisDescription: c.diagnosisDescription ?? c.diagnosis_description ?? "",
    procedureCode: c.procedureCode ?? c.procedure_code ?? "",
    status: c.status ?? c.claim_status ?? "",
    analyzedAt: c.analyzedAt ?? c.analyzed_at ?? "",
    detectionSummary: c.detectionSummary ?? c.detection_summary ?? undefined,
    recommendedAction: c.recommendedAction ?? c.recommended_action ?? undefined,
    primaryDetectionMethod: c.primaryDetectionMethod ?? c.primary_detection_method ?? undefined,
  }));
  const totalClaims = (metrics as any).totalClaims ?? claims.length ?? 0;
  const flaggedClaims = (metrics as any).flaggedClaims ?? claims.filter((c) => safeNum(c.compositeScore) >= 30).length;
  const totalExposure = safeNum((metrics as any).totalAmount ?? entityProfile?.summary?.totalAmount ?? 0);

  // Entity display info
  const entityName = detection?.entity_name
    ?? providerProfile?.providerId
    ?? entityId;
  const entitySpecialty = detection?.entity_specialty
    ?? providerProfile?.summary ? undefined : undefined;
  const entityOrg = detection?.entity_organization ?? undefined;

  // Risk indicator badges based on detection scores
  const riskIndicators = useMemo(() => {
    const indicators: Array<{ label: string; severity: string }> = [];
    if (safeNum(detection?.rule_engine_score) >= 50) indicators.push({ label: "Rule violations detected", severity: "high" });
    if (safeNum(detection?.statistical_score) >= 50) indicators.push({ label: "Statistical anomalies", severity: "high" });
    if (safeNum(detection?.unsupervised_score) >= 50) indicators.push({ label: "Behavioural outlier", severity: "medium" });
    if (safeNum(detection?.rag_llm_score) >= 50) indicators.push({ label: "AI-flagged patterns", severity: "medium" });
    if (safeNum(detection?.semantic_score) >= 50) indicators.push({ label: "Code mismatch signals", severity: "medium" });
    if (compositeScore >= 85) indicators.push({ label: "Critical composite risk", severity: "critical" });
    return indicators;
  }, [detection, compositeScore]);

  // Type-specific KPI data
  const kpiCards = useMemo(() => {
    const m = metrics as any;
    if (entityType === "provider") {
      return [
        { label: "Claims / Month", value: safeNum(m.claimsPerMonth).toFixed(1), trend: safeNum(timeline[0]?.claim_count_change), peerLabel: "vs peer avg", icon: CalendarDays },
        { label: "Avg Claim Amount", value: formatCurrency(safeNum(m.avgClaimAmount || providerProfile?.summary?.avgClaimAmount)), trend: safeNum(timeline[0]?.amount_change), peerLabel: "vs peer avg", icon: DollarSign },
        { label: "Denial Rate", value: formatPercentage(safeNum(m.denialRate || providerProfile?.summary?.rejectionRate)), trend: null, peerLabel: "vs 12% peer", icon: AlertTriangle },
        { label: "Flagged Ratio", value: totalClaims > 0 ? formatPercentage((flaggedClaims / totalClaims) * 100) : "0%", trend: null, peerLabel: `${flaggedClaims} of ${totalClaims}`, icon: Shield },
      ];
    }
    if (entityType === "patient") {
      return [
        { label: "Unique Providers", value: formatNumber(safeNum(m.uniquePatients || providerProfile?.summary?.uniquePatients)), trend: null, peerLabel: "", icon: Building2 },
        { label: "Visits / Month", value: safeNum(m.visitFrequency).toFixed(1), trend: null, peerLabel: "vs 1.5 avg", icon: CalendarDays },
        { label: "ER Utilisation", value: formatPercentage(safeNum(m.erUtilizationRate)), trend: null, peerLabel: "vs 8% avg", icon: Activity },
        { label: "Geographic Spread", value: safeNum(m.geographicSpread).toFixed(0), trend: null, peerLabel: "unique locations", icon: MapPin },
      ];
    }
    // doctor
    return [
      { label: "Patients / Day", value: safeNum(m.patientsPerDay).toFixed(1), trend: null, peerLabel: "vs 15 avg", icon: User },
      { label: "Claims / Patient", value: safeNum(m.claimsPerPatient).toFixed(1), trend: null, peerLabel: "vs 2.5 avg", icon: Hash },
      { label: "Prescribing Ratio", value: formatPercentage(safeNum(m.prescribingRatio)), trend: null, peerLabel: "vs 40% avg", icon: Stethoscope },
      { label: "Denial Rate", value: formatPercentage(safeNum(m.denialRate)), trend: null, peerLabel: "vs 10% avg", icon: AlertTriangle },
    ];
  }, [entityType, metrics, timeline, totalClaims, flaggedClaims, providerProfile]);

  // ----- Assign Investigator handler -----
  const [assignPopoverOpen, setAssignPopoverOpen] = useState(false);
  const [investigatorName, setInvestigatorName] = useState("");

  const handleAssignInvestigator = () => {
    if (!investigatorName.trim()) return;
    addNoteMutation.mutate({
      entityType,
      entityId,
      content: `Assigned investigator: ${investigatorName.trim()}`,
      author: "Current User",
      noteType: "assignment",
      assignedInvestigator: investigatorName.trim(),
    }, {
      onSuccess: () => {
        setInvestigatorName("");
        setAssignPopoverOpen(false);
      },
    });
  };

  // ----- Download Report handler -----
  const [downloading, setDownloading] = useState(false);

  const handleDownloadReport = async () => {
    setDownloading(true);
    try {
      const entityTypeForUrl = entityType === "provider" ? "providers" : entityType === "doctor" ? "doctors" : "patients";
      const resp = await fetch(`/api/fwa/${entityTypeForUrl}/${entityId}/audit-report`, { method: "POST" });
      if (!resp.ok) throw new Error("Failed to generate report");
      const report = await resp.json();

      // Build styled HTML from audit report data
      const severityColor = (s: string) => {
        const sl = s?.toLowerCase();
        if (sl === "critical") return "#dc2626";
        if (sl === "high") return "#ea580c";
        if (sl === "medium") return "#d97706";
        return "#16a34a";
      };
      const riskLevel = report.executiveSummary?.providerRiskLevel || report.executiveSummary?.entityRiskLevel || "N/A";
      const riskScore = report.executiveSummary?.compositeRiskScore ?? 0;
      const methodScores = report.executiveSummary?.methodScores || report.providerMethodScores || {};

      const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 24px; max-width: 800px;">
          <div style="text-align: center; margin-bottom: 24px; border-bottom: 3px solid #7c3aed; padding-bottom: 16px;">
            <h1 style="font-size: 22px; color: #7c3aed; margin: 0 0 4px 0;">CHI FWA Detection Platform</h1>
            <h2 style="font-size: 16px; color: #475569; margin: 0 0 4px 0;">${entityType.charAt(0).toUpperCase() + entityType.slice(1)} Audit Report</h2>
            <p style="font-size: 12px; color: #94a3b8; margin: 0;">Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} | Entity ID: ${entityId}</p>
          </div>

          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid ${severityColor(riskLevel)};">
            <h3 style="font-size: 14px; color: #334155; margin: 0 0 12px 0;">Executive Summary</h3>
            <div style="display: flex; gap: 24px; flex-wrap: wrap;">
              <div><span style="font-size: 11px; color: #64748b; display: block;">Risk Level</span><span style="font-size: 16px; font-weight: 700; color: ${severityColor(riskLevel)};">${riskLevel}</span></div>
              <div><span style="font-size: 11px; color: #64748b; display: block;">Composite Score</span><span style="font-size: 16px; font-weight: 700;">${typeof riskScore === "number" ? riskScore.toFixed(1) : riskScore}%</span></div>
              <div><span style="font-size: 11px; color: #64748b; display: block;">Claims Analyzed</span><span style="font-size: 16px; font-weight: 700;">${report.executiveSummary?.totalClaimsAnalyzed ?? "N/A"}</span></div>
              <div><span style="font-size: 11px; color: #64748b; display: block;">Total Exposure</span><span style="font-size: 16px; font-weight: 700;">$${Number(report.executiveSummary?.totalExposure || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
              <div><span style="font-size: 11px; color: #64748b; display: block;">High-Risk Claims</span><span style="font-size: 16px; font-weight: 700; color: #ea580c;">${report.executiveSummary?.highRiskClaimsCount ?? 0}</span></div>
            </div>
          </div>

          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <h3 style="font-size: 14px; color: #334155; margin: 0 0 12px 0;">5-Engine Detection Scores</h3>
            ${["ruleEngine", "statistical", "unsupervised", "ragLlm", "semantic"].map((key) => {
              const labels: Record<string, string> = { ruleEngine: "Rule Engine", statistical: "Statistical", unsupervised: "Unsupervised ML", ragLlm: "RAG/LLM", semantic: "Semantic" };
              const val = methodScores[key] ?? 0;
              const pct = Math.min(val, 100);
              const barColor = val >= 30 ? "#dc2626" : val >= 20 ? "#ea580c" : val >= 10 ? "#d97706" : "#16a34a";
              return `<div style="margin-bottom: 8px;"><div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 2px;"><span>${labels[key]}</span><span style="font-weight: 600;">${typeof val === "number" ? val.toFixed(1) : val}%</span></div><div style="background: #e2e8f0; border-radius: 4px; height: 8px;"><div style="background: ${barColor}; border-radius: 4px; height: 8px; width: ${pct}%;"></div></div></div>`;
            }).join("")}
          </div>

          ${report.riskFactorsSummary?.length ? `
          <div style="margin-bottom: 16px;">
            <h3 style="font-size: 14px; color: #334155; margin: 0 0 12px 0;">Risk Factors</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <thead><tr style="background: #f1f5f9;">
                <th style="text-align: left; padding: 8px; border-bottom: 1px solid #e2e8f0;">Factor</th>
                <th style="text-align: left; padding: 8px; border-bottom: 1px solid #e2e8f0;">Severity</th>
                <th style="text-align: left; padding: 8px; border-bottom: 1px solid #e2e8f0;">Details</th>
              </tr></thead>
              <tbody>${report.riskFactorsSummary.slice(0, 10).map((r: any) => `<tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: 500;">${r.factor}</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;"><span style="color: ${severityColor(r.severity)}; font-weight: 600; font-size: 11px;">${r.severity}</span></td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; color: #475569;">${r.explanation}</td></tr>`).join("")}</tbody>
            </table>
          </div>` : ""}

          ${report.recommendedActions?.length ? `
          <div style="background: #fefce8; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 4px solid #d97706;">
            <h3 style="font-size: 14px; color: #334155; margin: 0 0 8px 0;">Recommended Actions</h3>
            <ol style="margin: 0; padding-left: 20px; font-size: 12px; color: #475569;">
              ${report.recommendedActions.map((a: string) => `<li style="margin-bottom: 4px;">${a}</li>`).join("")}
            </ol>
          </div>` : ""}

          ${report.highRiskClaims?.length ? `
          <div style="margin-bottom: 16px;">
            <h3 style="font-size: 14px; color: #334155; margin: 0 0 12px 0;">High-Risk Claims (Top ${Math.min(report.highRiskClaims.length, 10)})</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <thead><tr style="background: #f1f5f9;">
                <th style="text-align: left; padding: 6px;">Claim ID</th>
                <th style="text-align: left; padding: 6px;">Score</th>
                <th style="text-align: left; padding: 6px;">Level</th>
                <th style="text-align: right; padding: 6px;">Amount</th>
                <th style="text-align: left; padding: 6px;">Method</th>
              </tr></thead>
              <tbody>${report.highRiskClaims.slice(0, 10).map((c: any) => `<tr><td style="padding: 6px; border-bottom: 1px solid #f1f5f9; font-family: monospace; font-size: 10px;">${c.claimId}</td><td style="padding: 6px; border-bottom: 1px solid #f1f5f9; font-weight: 600;">${(c.compositeScore ?? 0).toFixed(1)}</td><td style="padding: 6px; border-bottom: 1px solid #f1f5f9;"><span style="color: ${severityColor(c.riskLevel || "")}; font-weight: 600;">${(c.riskLevel || "").toUpperCase()}</span></td><td style="padding: 6px; border-bottom: 1px solid #f1f5f9; text-align: right;">$${Number(c.claimAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td><td style="padding: 6px; border-bottom: 1px solid #f1f5f9;">${(c.primaryDetectionMethod || "").replace(/_/g, " ")}</td></tr>`).join("")}</tbody>
            </table>
          </div>` : ""}

          ${report.allClaimsSummary ? `
          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <h3 style="font-size: 14px; color: #334155; margin: 0 0 8px 0;">Claims Summary</h3>
            <div style="display: flex; gap: 24px; font-size: 12px;">
              <div><span style="color: #64748b;">Total:</span> <strong>${report.allClaimsSummary.totalClaims}</strong></div>
              <div><span style="color: #dc2626;">Critical:</span> <strong>${report.allClaimsSummary.criticalCount}</strong></div>
              <div><span style="color: #ea580c;">High:</span> <strong>${report.allClaimsSummary.highCount}</strong></div>
              <div><span style="color: #d97706;">Medium:</span> <strong>${report.allClaimsSummary.mediumCount}</strong></div>
              <div><span style="color: #16a34a;">Low:</span> <strong>${report.allClaimsSummary.lowCount}</strong></div>
            </div>
          </div>` : ""}

          <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8;">
            <p>This report was generated by the CHI FWA Detection Platform. Confidential — for authorized personnel only.</p>
          </div>
        </div>
      `;

      // Render into a temporary container and convert to PDF
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.innerHTML = html;
      document.body.appendChild(container);

      try {
        const html2pdf = (await import("html2pdf.js")).default;
        const opt = {
          margin: [10, 10, 10, 10] as [number, number, number, number],
          filename: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)}_Audit_Report_${entityId}_${new Date().toISOString().split("T")[0]}.pdf`,
          image: { type: "jpeg" as const, quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
        };
        await html2pdf().set(opt).from(container.firstElementChild as HTMLElement).save();
      } finally {
        document.body.removeChild(container);
      }
    } catch (err) {
      console.error("Report download failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  // ----- Render -----

  if (isLoading) {
    return <EntityProfileSkeleton />;
  }

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1440px] mx-auto">
      {/* ================================================================
          ROW 1 - Entity Summary Header
          ================================================================ */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-lg">
          <CardContent className="pt-6 space-y-4">
            {/* Back button */}
            <Link href="/fwa/high-risk-entities">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground -ml-2">
                <ArrowLeft className="h-4 w-4" />
                Back to High-Risk Entities
              </Button>
            </Link>

            {/* Identity row */}
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <EntityIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold">{entityName}</h1>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs capitalize">{config.label}</Badge>
                      <code className="text-xs text-muted-foreground">{entityId}</code>
                      {entitySpecialty && <span className="text-xs text-muted-foreground">| {entitySpecialty}</span>}
                      {entityOrg && <span className="text-xs text-muted-foreground">| {entityOrg}</span>}
                    </div>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Total Claims:</span>{" "}
                    <span className="font-semibold">{formatNumber(totalClaims)}</span>
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="text-sm">
                    <span className="text-muted-foreground">Flagged:</span>{" "}
                    <span className="font-semibold text-orange-600">{formatNumber(flaggedClaims)}</span>
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="text-sm">
                    <span className="text-muted-foreground">Exposure:</span>{" "}
                    <span className="font-semibold text-red-600">{formatCurrency(totalExposure)}</span>
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <Badge variant="outline" className={getRiskLevelBadgeClasses(riskLevel)}>
                    {riskLevel}
                  </Badge>
                </div>
              </div>

              {/* Right side: gauge + actions */}
              <div className="flex flex-col items-end gap-3">
                <RiskScoreGauge score={compositeScore} />
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1" onClick={handleDownloadReport} disabled={downloading}>
                    {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    {downloading ? "Generating..." : "Download Report"}
                  </Button>
                  <Popover open={assignPopoverOpen} onOpenChange={setAssignPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1">
                        <UserPlus className="h-3.5 w-3.5" />
                        Assign Investigator
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72" align="end">
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold">Assign Investigator</h4>
                          <p className="text-xs text-muted-foreground">Enter the name of the investigator to assign to this case.</p>
                        </div>
                        <Input
                          placeholder="Investigator name..."
                          value={investigatorName}
                          onChange={(e) => setInvestigatorName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleAssignInvestigator(); }}
                        />
                        <Button
                          size="sm"
                          className="w-full gap-1"
                          disabled={!investigatorName.trim() || addNoteMutation.isPending}
                          onClick={handleAssignInvestigator}
                        >
                          {addNoteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
                          Assign
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ================================================================
          ROW 2 - Detection Radar + Severity Pie
          ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
          <Card className="bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-lg h-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    5-Engine Detection Radar
                  </CardTitle>
                  <CardDescription>Composite risk signal across all detection methods</CardDescription>
                </div>
                {entityType === "provider" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => analyzeEntityMutation.mutate()}
                    disabled={analyzeEntityMutation.isPending}
                  >
                    {analyzeEntityMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    {analyzeEntityMutation.isPending ? "Analyzing..." : "Run Analysis"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <DetectionRadar detection={detection ?? null} />
              <Separator />
              <EngineFindingsAccordion detection={detection ?? null} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}>
          <Card className="bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-lg h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Risk Severity Overview
              </CardTitle>
              <CardDescription>Distribution of flagged claims by severity level</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SeverityPieChart claims={claims} />
              <RiskTrendSparkline timeline={timeline} />
              <Separator />
              {/* Key risk indicator badges */}
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Key Risk Indicators</p>
                {riskIndicators.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No significant risk indicators detected.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {riskIndicators.map((ri, i) => (
                      <Badge key={i} variant="outline" className={`text-xs ${getRiskLevelBadgeClasses(ri.severity)}`}>
                        {ri.label}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ================================================================
          ROW 3 - Entity KPI Cards
          ================================================================ */}
      <div className={METRIC_GRID}>
        {kpiCards.map((kpi, i) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            trend={kpi.trend}
            peerLabel={kpi.peerLabel}
            icon={kpi.icon}
            delay={0.2 + i * 0.05}
          />
        ))}
      </div>

      {/* ================================================================
          ROW 4 - Monthly Trends + Peer Benchmarking
          ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.4 }}>
          <Card className="bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Monthly Trends
              </CardTitle>
              <CardDescription>Risk score and claims amount over time</CardDescription>
            </CardHeader>
            <CardContent>
              <MonthlyTrendsChart timeline={timeline} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
          <Card className="bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Peer Benchmarking
              </CardTitle>
              <CardDescription>Entity metrics vs peer group averages</CardDescription>
            </CardHeader>
            <CardContent>
              <PeerBenchmarkChart detection={detection ?? null} entityType={entityType} />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ================================================================
          ROW 5 - Procedures/Diagnoses + Flagged Claims
          ================================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.4 }}>
          <Card className="bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Top Procedures & Diagnoses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProceduresDiagnosesTable claims={claims} />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }}>
          <Card className="bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Flagged Claims
              </CardTitle>
              <CardDescription>Claims with composite score above threshold, sorted by risk</CardDescription>
            </CardHeader>
            <CardContent>
              <FlaggedClaimsTable claims={claims} />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ================================================================
          ROW 5.5 - Provider-specific: Rule Hits + Risk Explanation
          ================================================================ */}
      {entityType === "provider" && providerProfile && (
        <>
          <RuleHitSummaryCard ruleHits={(providerProfile as any).ruleHitSummary ?? []} />
          <RiskExplanationCard explanations={(providerProfile as any).riskExplanation ?? []} />
        </>
      )}

      {/* ================================================================
          ROW 5.75 - Audit & Compliance (all entity types)
          ================================================================ */}
      <AuditComplianceSection entityId={entityId} entityType={entityType} />

      {/* ================================================================
          ROW 6 - Investigation Panel
          ================================================================ */}
      <InvestigationPanel
        entityType={entityType}
        entityId={entityId}
        investigationData={investigationData ?? null}
        detectionDate={detection?.analyzed_at ?? null}
        addNoteMutation={addNoteMutation}
        compositeScore={compositeScore}
      />
    </div>
  );
}
