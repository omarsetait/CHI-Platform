import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2, User, UserCog, AlertTriangle, DollarSign, TrendingUp,
  ExternalLink, FileText, Network, Search, ChevronLeft, ChevronRight,
  ArrowUpDown, ArrowUp, ArrowDown, ShieldCheck, BarChart3, Brain,
  Cpu, FileSearch, Activity, MapPin, Users, Stethoscope, Download,
  Loader2, CalendarIcon, SlidersHorizontal, X,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Slider } from "@/components/ui/slider";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import type { FwaHighRiskProvider, FwaHighRiskPatient, FwaHighRiskDoctor } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import { getRiskLevelBadgeClasses, getRiskScoreColor } from "@/lib/risk-utils";
import { METRIC_GRID } from "@/lib/grid";

// Paginated response type from backend
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Entity detection result for side panel enrichment
interface EntityDetectionData {
  composite_score: string;
  risk_level: string;
  rule_engine_score?: string;
  statistical_score?: string;
  unsupervised_score?: string;
  rag_llm_score?: string;
  semantic_score?: string;
  rule_engine_findings?: {
    matchedRules?: Array<{ ruleId: string; ruleName: string; severity: string; hitCount: number; explanation: string }>;
  };
  aggregated_metrics?: {
    topProcedureCodes?: Array<{ code: string; count: number; amount: number }>;
    topDiagnosisCodes?: Array<{ code: string; count: number }>;
    flaggedClaimsCount?: number;
    highRiskClaimsCount?: number;
  };
}

const SEVERITY_COLORS = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

const ENGINE_CONFIG = [
  { key: "rule_engine_score", label: "Rule Engine", icon: ShieldCheck, color: "#3b82f6" },
  { key: "statistical_score", label: "Statistical", icon: BarChart3, color: "#22c55e" },
  { key: "unsupervised_score", label: "Unsupervised", icon: Cpu, color: "#a855f7" },
  { key: "rag_llm_score", label: "RAG/LLM", icon: Brain, color: "#f59e0b" },
  { key: "semantic_score", label: "Semantic", icon: FileSearch, color: "#06b6d4" },
];

/** Risk Score Gauge - a linear gauge with color coding */
function RiskScoreGauge({ score }: { score: number }) {
  const color = getRiskScoreColor(score);
  const clampedScore = Math.min(Math.max(score, 0), 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Risk Score</span>
        <span className="font-bold text-lg" style={{ color }}>{clampedScore.toFixed(1)}</span>
      </div>
      <div className="relative h-3 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{ width: `${clampedScore}%`, backgroundColor: color }}
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

/** Mini engine score bars for side panels */
function EngineScoreBars({ detection }: { detection: EntityDetectionData | null }) {
  if (!detection) return <Skeleton className="h-24 w-full" />;
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold flex items-center gap-1.5">
        <Activity className="h-3.5 w-3.5 text-purple-500" />
        Detection Engines
      </h4>
      <div className="space-y-1.5">
        {ENGINE_CONFIG.map(({ key, label, icon: Icon, color }) => {
          const score = parseFloat((detection as any)[key] || "0");
          return (
            <div key={key} className="flex items-center gap-2">
              <Icon className="h-3 w-3 flex-shrink-0" style={{ color }} />
              <span className="text-xs w-20 truncate text-muted-foreground">{label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(score, 100)}%`, backgroundColor: color }}
                />
              </div>
              <span className="text-xs font-mono w-8 text-right">{score.toFixed(0)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Compact KPI metric card for side panels */
function MiniKPI({ label, value, subtitle, color }: { label: string; value: string; subtitle?: string; color?: string }) {
  return (
    <div className="bg-white/30 dark:bg-slate-900/30 rounded-lg p-2.5 space-y-0.5">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-bold ${color || ""}`}>{value}</p>
      {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

/** Severity distribution mini pie chart */
function SeverityMiniPie({ data }: { data: Array<{ name: string; value: number }> }) {
  if (!data.length || data.every(d => d.value === 0)) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">Severity Distribution</h4>
      <div className="h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={25} outerRadius={45} dataKey="value" paddingAngle={2}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name as keyof typeof SEVERITY_COLORS] || "#94a3b8"} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => v} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        {data.filter(d => d.value > 0).map(d => (
          <div key={d.name} className="flex items-center gap-1 text-[10px]">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SEVERITY_COLORS[d.name as keyof typeof SEVERITY_COLORS] }} />
            <span className="capitalize">{d.name}: {d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Top procedures mini bar chart */
function TopProceduresBars({ procedures }: { procedures: Array<{ code: string; count: number; amount: number }> }) {
  if (!procedures?.length) return null;
  const top5 = procedures.slice(0, 5);
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">Top Procedures (Frequency)</h4>
      <div className="h-[100px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top5} layout="vertical" margin={{ left: 50, right: 10, top: 0, bottom: 0 }}>
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="code" tick={{ fontSize: 9 }} width={45} />
            <Tooltip formatter={(v: number) => v} />
            <Bar dataKey="count" fill="#a855f7" radius={[0, 3, 3, 0]} barSize={12} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Network visualization for the dental ring clinics */
function DentalRingNetwork({ currentProviderId }: { currentProviderId: string }) {
  const clinicLabels = ["Clinic 1", "Clinic 2", "Clinic 3", "Clinic 4"];
  const positions = [
    { cx: 100, cy: 40 },
    { cx: 180, cy: 90 },
    { cx: 100, cy: 140 },
    { cx: 20, cy: 90 },
  ];

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Network className="h-4 w-4 text-red-500" />
          Network Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <svg width="200" height="180" viewBox="0 0 200 180" className="mb-2">
            {positions.map((from, i) =>
              positions.slice(i + 1).map((to, j) => (
                <line
                  key={`line-${i}-${j}`}
                  x1={from.cx} y1={from.cy} x2={to.cx} y2={to.cy}
                  stroke="#ef4444" strokeWidth="1.5" strokeOpacity="0.4" strokeDasharray="4,2"
                />
              ))
            )}
            {positions.map((pos, i) => {
              const isCurrentClinic = currentProviderId.endsWith(`${i + 1}`);
              return (
                <g key={`clinic-${i}`}>
                  <circle
                    cx={pos.cx} cy={pos.cy} r={isCurrentClinic ? 22 : 18}
                    fill={isCurrentClinic ? "#fee2e2" : "#fef3c7"}
                    stroke={isCurrentClinic ? "#ef4444" : "#f59e0b"}
                    strokeWidth={isCurrentClinic ? 2.5 : 1.5}
                  />
                  <text x={pos.cx} y={pos.cy - 4} textAnchor="middle" className="text-[8px] fill-current" fontWeight={isCurrentClinic ? "bold" : "normal"}>Clinic</text>
                  <text x={pos.cx} y={pos.cy + 8} textAnchor="middle" className="text-[9px] fill-current" fontWeight={isCurrentClinic ? "bold" : "normal"}>{i + 1}</text>
                </g>
              );
            })}
          </svg>
          <div className="text-center space-y-1">
            <Badge variant="destructive" className="text-xs">Shared beneficial owner detected</Badge>
            <p className="text-xs text-muted-foreground">340 patients in common across 4 clinics</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Enhanced Provider drill-down side panel */
function ProviderDrillDown({
  provider,
  open,
  onOpenChange,
}: {
  provider: FwaHighRiskProvider | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: detection } = useQuery<EntityDetectionData>({
    queryKey: ["/api/fwa/entity-detection/provider", provider?.providerId],
    enabled: open && !!provider?.providerId,
  });

  if (!provider) return null;

  const riskScore = parseFloat(provider.riskScore || "0");
  const totalClaims = provider.totalClaims || 0;
  const flaggedClaims = provider.flaggedClaims || 0;
  const flaggedPct = totalClaims > 0 ? (flaggedClaims / totalClaims) * 100 : 0;
  const denialRate = parseFloat(provider.denialRate || "0");
  const claimsPerMonth = parseFloat(provider.claimsPerMonth || "0");
  const cpmPeerAverage = parseFloat(provider.cpmPeerAverage || "0");
  const avgClaimAmount = parseFloat(provider.avgClaimAmount || "0");
  const isDentalRing = provider.providerId?.startsWith("PRV-CS1-");

  // Severity distribution from detection data
  const severityData = detection?.aggregated_metrics ? [
    { name: "critical", value: detection.aggregated_metrics.highRiskClaimsCount || 0 },
    { name: "high", value: Math.max(0, (detection.aggregated_metrics.flaggedClaimsCount || 0) - (detection.aggregated_metrics.highRiskClaimsCount || 0)) },
    { name: "medium", value: Math.max(0, totalClaims - (detection.aggregated_metrics.flaggedClaimsCount || 0)) },
  ] : [
    { name: "critical", value: flaggedClaims },
    { name: "high", value: Math.max(0, totalClaims - flaggedClaims) },
  ];

  // Peer comparison data
  const peerComparisonData = [
    { metric: "Claims/Mo", "This Provider": claimsPerMonth, "Peer Average": cpmPeerAverage },
    { metric: "Denial %", "This Provider": denialRate, "Peer Average": Math.max(denialRate * 0.5, 8) },
    { metric: "Avg Claim (K)", "This Provider": avgClaimAmount / 1000, "Peer Average": (avgClaimAmount * 0.7) / 1000 },
  ];

  const topFindings = detection?.rule_engine_findings?.matchedRules?.slice(0, 3) || [];
  const topProcedures = detection?.aggregated_metrics?.topProcedureCodes || [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg w-full overflow-y-auto bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border-l border-white/20 dark:border-white/10 shadow-2xl">
        <SheetHeader className="pb-4 border-b border-white/20 dark:border-white/10">
          <SheetTitle className="text-lg">{provider.providerName}</SheetTitle>
          <SheetDescription className="space-y-1">
            {provider.organization && <span className="block text-xs">{provider.organization}</span>}
            <span className="block">{provider.specialty || "General"} &middot; {provider.providerType || "Facility"}</span>
            <span className="block font-mono text-xs">{provider.providerId}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Section 1: Risk & Detection */}
          <RiskScoreGauge score={riskScore} />

          <EngineScoreBars detection={detection || null} />

          {/* Top Findings */}
          {topFindings.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Top Findings</h4>
              <div className="space-y-1.5">
                {topFindings.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Badge className={getRiskLevelBadgeClasses(f.severity)} variant="outline">{f.severity}</Badge>
                    <span className="text-muted-foreground">{f.ruleName || f.explanation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <SeverityMiniPie data={severityData} />

          {/* Section 2: Claims & Billing KPIs */}
          <div className="border-t border-white/20 dark:border-white/10 pt-4">
            <h4 className="text-sm font-semibold mb-3">Claims & Billing</h4>
            <div className="grid grid-cols-3 gap-2">
              <MiniKPI
                label="CPM"
                value={claimsPerMonth.toFixed(1)}
                subtitle={`Peer: ${cpmPeerAverage}`}
                color={claimsPerMonth > cpmPeerAverage * 1.5 ? "text-red-600" : ""}
              />
              <MiniKPI
                label="Denial Rate"
                value={`${denialRate.toFixed(1)}%`}
                color={denialRate > 20 ? "text-red-600" : denialRate > 10 ? "text-orange-600" : ""}
              />
              <MiniKPI
                label="Flagged"
                value={`${flaggedPct.toFixed(0)}%`}
                subtitle={`${flaggedClaims}/${totalClaims}`}
                color={flaggedPct > 50 ? "text-red-600" : ""}
              />
            </div>
          </div>

          <TopProceduresBars procedures={topProcedures} />

          {/* Total Exposure */}
          <div className="bg-white/30 dark:bg-slate-900/30 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Exposure</p>
            <p className="text-xl font-bold">{formatCurrency(provider.totalExposure)}</p>
          </div>

          {/* Peer Comparison Chart */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Peer Comparison</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peerComparisonData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} formatter={(value: number) => value.toFixed(1)} />
                  <Bar dataKey="This Provider" fill="#a855f7" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Peer Average" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {isDentalRing && <DentalRingNetwork currentProviderId={provider.providerId} />}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Link href={`/fwa/flagged-claims?provider=${provider.providerId}`}>
              <Button size="sm" variant="default" className="gap-1 bg-purple-600 hover:bg-purple-700">
                <AlertTriangle className="h-3 w-3" />
                View Flagged Claims
              </Button>
            </Link>
            <Link href={`/fwa/high-risk-entities/provider/${provider.providerId}`}>
              <Button size="sm" variant="outline" className="gap-1">
                <ExternalLink className="h-3 w-3" />
                View Full Profile
              </Button>
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** NEW: Patient drill-down side panel */
function PatientDrillDown({
  patient,
  open,
  onOpenChange,
}: {
  patient: FwaHighRiskPatient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: detection } = useQuery<EntityDetectionData>({
    queryKey: ["/api/fwa/entity-detection/patient", patient?.patientId],
    enabled: open && !!patient?.patientId,
  });

  if (!patient) return null;

  const riskScore = parseFloat(patient.riskScore || "0");
  const totalClaims = patient.totalClaims || 0;
  const flaggedClaims = patient.flaggedClaims || 0;
  const flaggedPct = totalClaims > 0 ? (flaggedClaims / totalClaims) * 100 : 0;
  const totalAmount = parseFloat(patient.totalAmount || "0");
  const uniqueProviders = (patient as any).uniqueProviders || 0;
  const avgClaim = totalClaims > 0 ? totalAmount / totalClaims : 0;

  const topDiagnoses = detection?.aggregated_metrics?.topDiagnosisCodes?.slice(0, 5) || [];
  const diagnosisPieData = topDiagnoses.map((d, i) => ({
    name: d.code,
    value: d.count,
  }));
  const diagnosisColors = ["#a855f7", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444"];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg w-full overflow-y-auto bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border-l border-white/20 dark:border-white/10 shadow-2xl">
        <SheetHeader className="pb-4 border-b border-white/20 dark:border-white/10">
          <SheetTitle className="text-lg">{patient.patientName}</SheetTitle>
          <SheetDescription className="space-y-1">
            <span className="block">{patient.primaryDiagnosis || "Various"}</span>
            <span className="block font-mono text-xs">{patient.patientId}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Section 1: Behavioral Flags */}
          <RiskScoreGauge score={riskScore} />

          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              Behavioral Indicators
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <MiniKPI
                label="Unique Providers"
                value={String(uniqueProviders)}
                subtitle={uniqueProviders >= 3 ? "Doctor shopping" : "Normal"}
                color={uniqueProviders >= 5 ? "text-red-600" : uniqueProviders >= 3 ? "text-orange-600" : ""}
              />
              <MiniKPI
                label="Visit Freq/Mo"
                value={(totalClaims / Math.max(6, 1)).toFixed(1)}
                subtitle="Claims per month"
              />
              <MiniKPI
                label="Flagged Claims"
                value={String(flaggedClaims)}
                subtitle={`${flaggedPct.toFixed(0)}% of total`}
                color={flaggedPct > 50 ? "text-red-600" : ""}
              />
            </div>
          </div>

          <EngineScoreBars detection={detection || null} />

          {/* Section 2: Claims Breakdown */}
          <div className="border-t border-white/20 dark:border-white/10 pt-4">
            <h4 className="text-sm font-semibold mb-3">Claims Breakdown</h4>
            <div className="grid grid-cols-3 gap-2">
              <MiniKPI label="Total Amount" value={formatCurrency(totalAmount)} />
              <MiniKPI
                label="Flagged Ratio"
                value={`${flaggedPct.toFixed(0)}%`}
                color={flaggedPct > 50 ? "text-red-600" : ""}
              />
              <MiniKPI label="Avg Claim" value={formatCurrency(avgClaim)} />
            </div>
          </div>

          {/* Diagnosis distribution pie */}
          {diagnosisPieData.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Top Diagnoses</h4>
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={diagnosisPieData} cx="50%" cy="50%" innerRadius={25} outerRadius={45} dataKey="value" paddingAngle={2}>
                      {diagnosisPieData.map((_, i) => (
                        <Cell key={i} fill={diagnosisColors[i % diagnosisColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {diagnosisPieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1 text-[10px]">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: diagnosisColors[i % diagnosisColors.length] }} />
                    <span>{d.name}: {d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reasons */}
          {patient.reasons && patient.reasons.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Risk Reasons</h4>
              <div className="flex flex-wrap gap-1.5">
                {patient.reasons.map((reason, i) => (
                  <Badge key={i} variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400">{reason}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Link href={`/fwa/high-risk-entities/patient/${patient.patientId}`}>
              <Button size="sm" variant="default" className="gap-1 bg-purple-600 hover:bg-purple-700">
                <ExternalLink className="h-3 w-3" />
                View Full Profile
              </Button>
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** NEW: Doctor drill-down side panel */
function DoctorDrillDown({
  doctor,
  open,
  onOpenChange,
}: {
  doctor: FwaHighRiskDoctor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: detection } = useQuery<EntityDetectionData>({
    queryKey: ["/api/fwa/entity-detection/doctor", doctor?.doctorId],
    enabled: open && !!doctor?.doctorId,
  });

  if (!doctor) return null;

  const riskScore = parseFloat(doctor.riskScore || "0");
  const totalClaims = doctor.totalClaims || 0;
  const flaggedClaims = doctor.flaggedClaims || 0;
  const flaggedPct = totalClaims > 0 ? (flaggedClaims / totalClaims) * 100 : 0;
  const totalExposure = parseFloat(doctor.totalExposure || "0");
  const avgClaimAmount = parseFloat(doctor.avgClaimAmount || "0");
  const uniquePatients = (doctor as any).uniquePatients || 0;

  const topFindings = detection?.rule_engine_findings?.matchedRules?.slice(0, 3) || [];
  const topProcedures = detection?.aggregated_metrics?.topProcedureCodes || [];

  // Peer comparison data
  const peerData = [
    { metric: "Claims/Mo", Doctor: Math.round(totalClaims / 6), "Peer Avg": Math.round(totalClaims / 6 * 0.6) },
    { metric: "Patients", Doctor: uniquePatients, "Peer Avg": Math.round(uniquePatients * 0.7) },
    { metric: "Avg Claim (K)", Doctor: avgClaimAmount / 1000, "Peer Avg": avgClaimAmount * 0.7 / 1000 },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg w-full overflow-y-auto bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border-l border-white/20 dark:border-white/10 shadow-2xl">
        <SheetHeader className="pb-4 border-b border-white/20 dark:border-white/10">
          <SheetTitle className="text-lg">{doctor.doctorName}</SheetTitle>
          <SheetDescription className="space-y-1">
            <span className="block">{doctor.specialty || "General Practice"} &middot; {doctor.organization}</span>
            <span className="block font-mono text-xs">{doctor.doctorId}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Section 1: Practice Patterns */}
          <RiskScoreGauge score={riskScore} />

          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <Stethoscope className="h-3.5 w-3.5 text-purple-500" />
              Practice Patterns
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <MiniKPI
                label="Patients/Day"
                value={uniquePatients > 0 ? (uniquePatients / 180).toFixed(1) : "—"}
                subtitle="Avg daily volume"
              />
              <MiniKPI
                label="Claims/Patient"
                value={uniquePatients > 0 ? (totalClaims / uniquePatients).toFixed(1) : "—"}
              />
              <MiniKPI
                label="Total Claims"
                value={String(totalClaims)}
                subtitle={`${uniquePatients} patients`}
              />
            </div>
          </div>

          <EngineScoreBars detection={detection || null} />

          <TopProceduresBars procedures={topProcedures} />

          {/* Section 2: Financial Signals */}
          <div className="border-t border-white/20 dark:border-white/10 pt-4">
            <h4 className="text-sm font-semibold mb-3">Financial Signals</h4>
            <div className="grid grid-cols-3 gap-2">
              <MiniKPI
                label="Avg Claim"
                value={formatCurrency(avgClaimAmount)}
                subtitle="vs peer avg"
              />
              <MiniKPI
                label="Flagged"
                value={`${flaggedPct.toFixed(0)}%`}
                subtitle={`${flaggedClaims}/${totalClaims}`}
                color={flaggedPct > 50 ? "text-red-600" : ""}
              />
              <MiniKPI label="Exposure" value={formatCurrency(totalExposure)} />
            </div>
          </div>

          {/* Top Findings */}
          {topFindings.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Top Findings</h4>
              <div className="space-y-1.5">
                {topFindings.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Badge className={getRiskLevelBadgeClasses(f.severity)} variant="outline">{f.severity}</Badge>
                    <span className="text-muted-foreground">{f.ruleName || f.explanation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Peer Comparison */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Peer Comparison</h4>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peerData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} formatter={(value: number) => value.toFixed(1)} />
                  <Bar dataKey="Doctor" fill="#a855f7" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Peer Avg" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Reasons */}
          {doctor.reasons && doctor.reasons.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Risk Reasons</h4>
              <div className="flex flex-wrap gap-1.5">
                {doctor.reasons.map((reason, i) => (
                  <Badge key={i} variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400">{reason}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Link href={`/fwa/high-risk-entities/doctor/${doctor.doctorId}`}>
              <Button size="sm" variant="default" className="gap-1 bg-purple-600 hover:bg-purple-700">
                <ExternalLink className="h-3 w-3" />
                View Full Profile
              </Button>
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Pagination controls */
function PaginationControls({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between px-2 py-3">
      <div className="text-sm text-muted-foreground">
        Showing {Math.min((page - 1) * pageSize + 1, total)}-{Math.min(page * pageSize, total)} of {total}
      </div>
      <div className="flex items-center gap-2">
        <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(parseInt(v))}>
          <SelectTrigger className="w-[70px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="flex items-center px-2 text-sm">{page} / {totalPages}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Sortable table header */
function SortableHeader({
  label,
  field,
  currentSort,
  currentOrder,
  onSort,
  className,
}: {
  label: string;
  field: string;
  currentSort: string;
  currentOrder: string;
  onSort: (field: string) => void;
  className?: string;
}) {
  const isActive = currentSort === field;
  return (
    <TableHead className={`cursor-pointer select-none hover:bg-white/10 ${className || ""}`} onClick={() => onSort(field)}>
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          currentOrder === "desc" ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );
}

/** Shared filter bar component for all tabs */
function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder,
  searchTestId,
  regionFilter,
  onRegionChange,
  specialtyFilter,
  onSpecialtyChange,
  specialtyOptions,
  riskTierFilter,
  onRiskTierChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  scoreRange,
  onScoreRangeChange,
  detectionMethod,
  onDetectionMethodChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  searchTestId: string;
  regionFilter: string;
  onRegionChange: (value: string) => void;
  specialtyFilter: string;
  onSpecialtyChange: (value: string) => void;
  specialtyOptions: string[];
  riskTierFilter: string;
  onRiskTierChange: (value: string) => void;
  dateFrom: Date | undefined;
  onDateFromChange: (date: Date | undefined) => void;
  dateTo: Date | undefined;
  onDateToChange: (date: Date | undefined) => void;
  scoreRange: [number, number];
  onScoreRangeChange: (range: [number, number]) => void;
  detectionMethod: string;
  onDetectionMethodChange: (value: string) => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const hasAdvancedFilters = dateFrom || dateTo || scoreRange[0] > 0 || scoreRange[1] < 100 || detectionMethod !== "all";

  return (
    <div className="space-y-3 mb-6">
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-white/50 dark:bg-slate-900/50 border-white/20 dark:border-white/10 focus-visible:ring-violet-500 transition-all rounded-lg"
            data-testid={searchTestId}
          />
        </div>

        <Select value={regionFilter} onValueChange={onRegionChange}>
          <SelectTrigger className="w-[160px] bg-white/50 dark:bg-slate-900/50 border-white/20 dark:border-white/10 rounded-lg" data-testid="filter-region">
            <SelectValue placeholder="Region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            <SelectItem value="Riyadh">Riyadh</SelectItem>
            <SelectItem value="Makkah">Makkah</SelectItem>
            <SelectItem value="Eastern Province">Eastern Province</SelectItem>
            <SelectItem value="Madinah">Madinah</SelectItem>
            <SelectItem value="Asir">Asir</SelectItem>
          </SelectContent>
        </Select>

        <Select value={specialtyFilter} onValueChange={onSpecialtyChange}>
          <SelectTrigger className="w-[160px] bg-white/50 dark:bg-slate-900/50 border-white/20 dark:border-white/10 rounded-lg" data-testid="filter-specialty">
            <SelectValue placeholder="Specialty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Specialties</SelectItem>
            {specialtyOptions.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={riskTierFilter} onValueChange={onRiskTierChange}>
          <SelectTrigger className="w-[140px] bg-white/50 dark:bg-slate-900/50 border-white/20 dark:border-white/10 rounded-lg" data-testid="filter-risk-tier">
            <SelectValue placeholder="Risk Tier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={showAdvanced ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`rounded-lg ${hasAdvancedFilters ? "border-purple-500 text-purple-600" : ""}`}
        >
          <SlidersHorizontal className="h-4 w-4 mr-1" />
          Filters
          {hasAdvancedFilters && <span className="ml-1 h-2 w-2 rounded-full bg-purple-500 inline-block" />}
        </Button>
      </div>

      {showAdvanced && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-wrap items-end gap-4 p-4 bg-white/30 dark:bg-slate-950/30 backdrop-blur-xl border border-white/15 dark:border-white/5 rounded-xl shadow-sm"
        >
          {/* Date Range */}
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">From</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-[130px] justify-start text-left font-normal bg-white/50 dark:bg-slate-900/50 border-white/20 dark:border-white/10 rounded-lg h-9">
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                    {dateFrom ? format(dateFrom, "MMM d, yyyy") : <span className="text-muted-foreground">Start date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={onDateFromChange} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">To</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-[130px] justify-start text-left font-normal bg-white/50 dark:bg-slate-900/50 border-white/20 dark:border-white/10 rounded-lg h-9">
                    <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                    {dateTo ? format(dateTo, "MMM d, yyyy") : <span className="text-muted-foreground">End date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={onDateToChange} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" className="h-9 px-2" onClick={() => { onDateFromChange(undefined); onDateToChange(undefined); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Risk Score Range */}
          <div className="space-y-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground font-medium">
              Risk Score: {scoreRange[0]} – {scoreRange[1]}
            </label>
            <Slider
              value={scoreRange}
              onValueChange={(v) => onScoreRangeChange(v as [number, number])}
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          {/* Detection Method */}
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Detection Method</label>
            <Select value={detectionMethod} onValueChange={onDetectionMethodChange}>
              <SelectTrigger className="w-[160px] h-9 bg-white/50 dark:bg-slate-900/50 border-white/20 dark:border-white/10 rounded-lg">
                <SelectValue placeholder="All Methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="rule_engine">Rule Engine</SelectItem>
                <SelectItem value="statistical">Statistical</SelectItem>
                <SelectItem value="unsupervised">Unsupervised ML</SelectItem>
                <SelectItem value="rag_llm">RAG / LLM</SelectItem>
                <SelectItem value="semantic">Semantic</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function ProvidersTab() {
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [riskTierFilter, setRiskTierFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);
  const [detectionMethod, setDetectionMethod] = useState("all");
  const [selectedProvider, setSelectedProvider] = useState<FwaHighRiskProvider | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("riskScore");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const queryParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    sortBy,
    sortOrder,
    ...(search && { search }),
    ...(riskTierFilter !== "all" && { riskTier: riskTierFilter }),
    ...(dateFrom && { dateFrom: format(dateFrom, "yyyy-MM-dd") }),
    ...(dateTo && { dateTo: format(dateTo, "yyyy-MM-dd") }),
    ...(scoreRange[0] > 0 && { minScore: String(scoreRange[0]) }),
    ...(scoreRange[1] < 100 && { maxScore: String(scoreRange[1]) }),
    ...(detectionMethod !== "all" && { detectionMethod }),
  });

  const { data: response, isLoading } = useQuery<PaginatedResponse<FwaHighRiskProvider>>({
    queryKey: ["/api/fwa/high-risk-providers", page, pageSize, sortBy, sortOrder, search, riskTierFilter, dateFrom?.toISOString(), dateTo?.toISOString(), scoreRange[0], scoreRange[1], detectionMethod],
    queryFn: async () => {
      const res = await fetch(`/api/fwa/high-risk-providers?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const providers = response?.data || [];
  const total = response?.total || 0;

  const specialtyOptions = useMemo(() => {
    const specialties = new Set<string>();
    providers.forEach((p) => { if (p.specialty) specialties.add(p.specialty); });
    return Array.from(specialties).sort();
  }, [providers]);

  // Client-side filters that aren't sent to server (region, specialty)
  const filtered = useMemo(() => {
    return providers.filter((p) => {
      const matchesRegion = regionFilter === "all" ||
        p.organization?.toLowerCase().includes(regionFilter.toLowerCase());
      const matchesSpecialty = specialtyFilter === "all" || p.specialty === specialtyFilter;
      return matchesRegion && matchesSpecialty;
    });
  }, [providers, regionFilter, specialtyFilter]);

  const stats = {
    total: total,
    critical: providers.filter(p => p.riskLevel === "critical").length,
    high: providers.filter(p => p.riskLevel === "high").length,
    totalExposure: providers.reduce((sum, p) => sum + parseFloat(p.totalExposure || "0"), 0),
    totalClaims: providers.reduce((sum, p) => sum + (p.totalClaims || 0), 0),
    avgCPM: providers.length > 0 ? providers.reduce((sum, p) => sum + parseFloat(p.claimsPerMonth || "0"), 0) / providers.length : 0,
  };

  const handleSort = useCallback((field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === "desc" ? "asc" : "desc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  }, [sortBy]);

  const handleViewProfile = (provider: FwaHighRiskProvider) => {
    setSelectedProvider(provider);
    setSheetOpen(true);
  };

  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { title: "Total Providers", value: stats.total, icon: Building2, color: "text-muted-foreground", delay: 0 },
          { title: "Critical Risk", value: stats.critical, icon: AlertTriangle, color: "text-red-600", delay: 0.1 },
          { title: "High Risk", value: stats.high, icon: TrendingUp, color: "text-orange-600", delay: 0.2 },
          { title: "Total Exposure", value: formatCurrency(stats.totalExposure), icon: DollarSign, color: "text-muted-foreground", delay: 0.3 },
          { title: "Total Claims", value: stats.totalClaims.toLocaleString(), icon: FileText, color: "text-muted-foreground", delay: 0.4 },
          { title: "Avg CPM", value: stats.avgCPM.toFixed(1), icon: Activity, color: "text-purple-600", delay: 0.5 },
        ].map((stat) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: stat.delay, duration: 0.4 }}
          >
            <Card className="bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <stat.icon className={`h-4 w-4 ${stat.color !== "text-muted-foreground" ? stat.color : 'text-muted-foreground'}`} />
                  <span className="text-xs font-medium text-muted-foreground">{stat.title}</span>
                </div>
                <p className={`text-xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search providers..."
        searchTestId="input-search-providers"
        regionFilter={regionFilter}
        onRegionChange={setRegionFilter}
        specialtyFilter={specialtyFilter}
        onSpecialtyChange={setSpecialtyFilter}
        specialtyOptions={specialtyOptions}
        riskTierFilter={riskTierFilter}
        onRiskTierChange={(v) => { setRiskTierFilter(v); setPage(1); }}
        dateFrom={dateFrom}
        onDateFromChange={(d) => { setDateFrom(d); setPage(1); }}
        dateTo={dateTo}
        onDateToChange={(d) => { setDateTo(d); setPage(1); }}
        scoreRange={scoreRange}
        onScoreRangeChange={(r) => { setScoreRange(r); setPage(1); }}
        detectionMethod={detectionMethod}
        onDetectionMethodChange={(v) => { setDetectionMethod(v); setPage(1); }}
      />

      <Card className="bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-lg">
        <ScrollArea className="h-[440px]">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader label="Provider ID" field="providerId" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                <TableHead>Risk Level</TableHead>
                <SortableHeader label="Risk Score" field="riskScore" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                <SortableHeader label="Exposure" field="totalExposure" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} className="text-right" />
                <TableHead>FWA Reasons</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((provider) => (
                <TableRow key={provider.id} data-testid={`row-provider-${provider.id}`} className="hover-elevate cursor-pointer">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <p className="font-medium font-mono">{provider.providerId}</p>
                      {provider.providerId?.startsWith("PRV-CS1-") && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          <Network className="h-3 w-3 mr-0.5" />
                          Network Link
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRiskLevelBadgeClasses(provider.riskLevel)}>{provider.riskLevel || "Unknown"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(parseFloat(provider.riskScore || "0"), 100)} className="w-16 h-2" />
                      <span className="text-sm">{parseFloat(provider.riskScore || "0").toFixed(1)}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(provider.totalExposure)}</TableCell>
                  <TableCell>
                    {provider.reasons && provider.reasons.length > 0 ? (
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        {provider.reasons.slice(0, 3).map((reason, i) => (
                          <li key={i} className="truncate max-w-[200px]">{reason}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-sm text-muted-foreground">No flags detected</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" data-testid={`button-view-provider-${provider.id}`} onClick={() => handleViewProfile(provider)}>
                      <FileText className="h-3 w-3 mr-1" />
                      View Profile
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No providers found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
        <PaginationControls
          page={page} pageSize={pageSize} total={total}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        />
      </Card>

      <ProviderDrillDown provider={selectedProvider} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}

function PatientsTab() {
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [riskTierFilter, setRiskTierFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);
  const [detectionMethod, setDetectionMethod] = useState("all");
  const [selectedPatient, setSelectedPatient] = useState<FwaHighRiskPatient | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("riskScore");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const queryParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    sortBy,
    sortOrder,
    ...(search && { search }),
    ...(riskTierFilter !== "all" && { riskTier: riskTierFilter }),
    ...(dateFrom && { dateFrom: format(dateFrom, "yyyy-MM-dd") }),
    ...(dateTo && { dateTo: format(dateTo, "yyyy-MM-dd") }),
    ...(scoreRange[0] > 0 && { minScore: String(scoreRange[0]) }),
    ...(scoreRange[1] < 100 && { maxScore: String(scoreRange[1]) }),
    ...(detectionMethod !== "all" && { detectionMethod }),
  });

  const { data: response, isLoading } = useQuery<PaginatedResponse<FwaHighRiskPatient>>({
    queryKey: ["/api/fwa/high-risk-patients", page, pageSize, sortBy, sortOrder, search, riskTierFilter, dateFrom?.toISOString(), dateTo?.toISOString(), scoreRange[0], scoreRange[1], detectionMethod],
    queryFn: async () => {
      const res = await fetch(`/api/fwa/high-risk-patients?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const patients = response?.data || [];
  const total = response?.total || 0;

  const specialtyOptions = useMemo(() => {
    const diagnoses = new Set<string>();
    patients.forEach((p) => { if (p.primaryDiagnosis) diagnoses.add(p.primaryDiagnosis); });
    return Array.from(diagnoses).sort();
  }, [patients]);

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      const matchesSpecialty = specialtyFilter === "all" || p.primaryDiagnosis === specialtyFilter;
      return matchesSpecialty;
    });
  }, [patients, specialtyFilter]);

  const stats = {
    total: total,
    critical: patients.filter(p => p.riskLevel === "critical").length,
    high: patients.filter(p => p.riskLevel === "high").length,
    totalAmount: patients.reduce((sum, p) => sum + parseFloat(p.totalAmount || "0"), 0),
    totalClaims: patients.reduce((sum, p) => sum + (p.totalClaims || 0), 0),
    avgProviders: patients.length > 0 ? patients.reduce((sum, p) => sum + ((p as any).uniqueProviders || 0), 0) / patients.length : 0,
  };

  const handleSort = useCallback((field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === "desc" ? "asc" : "desc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  }, [sortBy]);

  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { title: "Total Patients", value: stats.total, icon: User, color: "text-muted-foreground", delay: 0 },
          { title: "Critical Risk", value: stats.critical, icon: AlertTriangle, color: "text-red-600", delay: 0.1 },
          { title: "High Risk", value: stats.high, icon: TrendingUp, color: "text-orange-600", delay: 0.2 },
          { title: "Total Claims", value: formatCurrency(stats.totalAmount), icon: DollarSign, color: "text-muted-foreground", delay: 0.3 },
          { title: "Claims Count", value: stats.totalClaims.toLocaleString(), icon: FileText, color: "text-muted-foreground", delay: 0.4 },
          { title: "Avg Providers", value: stats.avgProviders.toFixed(1), icon: Users, color: "text-purple-600", delay: 0.5 },
        ].map((stat) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: stat.delay, duration: 0.4 }}
          >
            <Card className="bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <stat.icon className={`h-4 w-4 ${stat.color !== "text-muted-foreground" ? stat.color : 'text-muted-foreground'}`} />
                  <span className="text-xs font-medium text-muted-foreground">{stat.title}</span>
                </div>
                <p className={`text-xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search patients..."
        searchTestId="input-search-patients"
        regionFilter={regionFilter}
        onRegionChange={setRegionFilter}
        specialtyFilter={specialtyFilter}
        onSpecialtyChange={setSpecialtyFilter}
        specialtyOptions={specialtyOptions}
        riskTierFilter={riskTierFilter}
        onRiskTierChange={(v) => { setRiskTierFilter(v); setPage(1); }}
        dateFrom={dateFrom}
        onDateFromChange={(d) => { setDateFrom(d); setPage(1); }}
        dateTo={dateTo}
        onDateToChange={(d) => { setDateTo(d); setPage(1); }}
        scoreRange={scoreRange}
        onScoreRangeChange={(r) => { setScoreRange(r); setPage(1); }}
        detectionMethod={detectionMethod}
        onDetectionMethodChange={(v) => { setDetectionMethod(v); setPage(1); }}
      />

      <Card className="bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-lg">
        <ScrollArea className="h-[440px]">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader label="Patient ID" field="patientId" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                <TableHead>Risk Level</TableHead>
                <SortableHeader label="Risk Score" field="riskScore" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                <TableHead>Primary Reason</TableHead>
                <SortableHeader label="Providers" field="uniqueProviders" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} className="text-right" />
                <SortableHeader label="Total Claims" field="totalAmount" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} className="text-right" />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((patient) => (
                <TableRow key={patient.id} data-testid={`row-patient-${patient.id}`} className="hover-elevate cursor-pointer">
                  <TableCell><p className="font-medium font-mono">{patient.patientId}</p></TableCell>
                  <TableCell>
                    <Badge className={getRiskLevelBadgeClasses(patient.riskLevel)}>{patient.riskLevel || "Unknown"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(parseFloat(patient.riskScore || "0"), 100)} className="w-16 h-2" />
                      <span className="text-sm">{parseFloat(patient.riskScore || "0").toFixed(1)}%</span>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-sm">{patient.reasons?.[0] || "-"}</span></TableCell>
                  <TableCell className="text-right">
                    <span className={`text-sm font-medium ${((patient as any).uniqueProviders || 0) >= 3 ? "text-red-600" : ""}`}>
                      {(patient as any).uniqueProviders || 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(patient.totalAmount)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm" variant="outline"
                      data-testid={`button-view-patient-${patient.id}`}
                      onClick={() => { setSelectedPatient(patient); setSheetOpen(true); }}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      View Profile
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No patients found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
        <PaginationControls
          page={page} pageSize={pageSize} total={total}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        />
      </Card>

      <PatientDrillDown patient={selectedPatient} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}

function DoctorsTab() {
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [riskTierFilter, setRiskTierFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);
  const [detectionMethod, setDetectionMethod] = useState("all");
  const [selectedDoctor, setSelectedDoctor] = useState<FwaHighRiskDoctor | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("riskScore");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const queryParams = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    sortBy,
    sortOrder,
    ...(search && { search }),
    ...(riskTierFilter !== "all" && { riskTier: riskTierFilter }),
    ...(specialtyFilter !== "all" && { specialty: specialtyFilter }),
    ...(dateFrom && { dateFrom: format(dateFrom, "yyyy-MM-dd") }),
    ...(dateTo && { dateTo: format(dateTo, "yyyy-MM-dd") }),
    ...(scoreRange[0] > 0 && { minScore: String(scoreRange[0]) }),
    ...(scoreRange[1] < 100 && { maxScore: String(scoreRange[1]) }),
    ...(detectionMethod !== "all" && { detectionMethod }),
  });

  const { data: response, isLoading } = useQuery<PaginatedResponse<FwaHighRiskDoctor>>({
    queryKey: ["/api/fwa/high-risk-doctors", page, pageSize, sortBy, sortOrder, search, riskTierFilter, specialtyFilter, dateFrom?.toISOString(), dateTo?.toISOString(), scoreRange[0], scoreRange[1], detectionMethod],
    queryFn: async () => {
      const res = await fetch(`/api/fwa/high-risk-doctors?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const doctors = response?.data || [];
  const total = response?.total || 0;

  const specialtyOptions = useMemo(() => {
    const specialties = new Set<string>();
    doctors.forEach((d) => { if (d.specialty) specialties.add(d.specialty); });
    return Array.from(specialties).sort();
  }, [doctors]);

  const filtered = useMemo(() => {
    return doctors.filter((d) => {
      const matchesRegion = regionFilter === "all" ||
        d.organization?.toLowerCase().includes(regionFilter.toLowerCase());
      return matchesRegion;
    });
  }, [doctors, regionFilter]);

  const stats = {
    total: total,
    critical: doctors.filter(d => d.riskLevel === "critical").length,
    high: doctors.filter(d => d.riskLevel === "high").length,
    totalExposure: doctors.reduce((sum, d) => sum + parseFloat(d.totalExposure || "0"), 0),
    totalClaims: doctors.reduce((sum, d) => sum + (d.totalClaims || 0), 0),
    avgClaimPerPatient: doctors.length > 0 ? doctors.reduce((sum, d) => {
      const patients = (d as any).uniquePatients || 1;
      return sum + (d.totalClaims || 0) / patients;
    }, 0) / doctors.length : 0,
  };

  const handleSort = useCallback((field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === "desc" ? "asc" : "desc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  }, [sortBy]);

  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { title: "Total Doctors", value: stats.total, icon: UserCog, color: "text-muted-foreground", delay: 0 },
          { title: "Critical Risk", value: stats.critical, icon: AlertTriangle, color: "text-red-600", delay: 0.1 },
          { title: "High Risk", value: stats.high, icon: TrendingUp, color: "text-orange-600", delay: 0.2 },
          { title: "Total Exposure", value: formatCurrency(stats.totalExposure), icon: DollarSign, color: "text-muted-foreground", delay: 0.3 },
          { title: "Total Claims", value: stats.totalClaims.toLocaleString(), icon: FileText, color: "text-muted-foreground", delay: 0.4 },
          { title: "Claims/Patient", value: stats.avgClaimPerPatient.toFixed(1), icon: Stethoscope, color: "text-purple-600", delay: 0.5 },
        ].map((stat) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: stat.delay, duration: 0.4 }}
          >
            <Card className="bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <stat.icon className={`h-4 w-4 ${stat.color !== "text-muted-foreground" ? stat.color : 'text-muted-foreground'}`} />
                  <span className="text-xs font-medium text-muted-foreground">{stat.title}</span>
                </div>
                <p className={`text-xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search doctors..."
        searchTestId="input-search-doctors"
        regionFilter={regionFilter}
        onRegionChange={setRegionFilter}
        specialtyFilter={specialtyFilter}
        onSpecialtyChange={(v) => { setSpecialtyFilter(v); setPage(1); }}
        specialtyOptions={specialtyOptions}
        riskTierFilter={riskTierFilter}
        onRiskTierChange={(v) => { setRiskTierFilter(v); setPage(1); }}
        dateFrom={dateFrom}
        onDateFromChange={(d) => { setDateFrom(d); setPage(1); }}
        dateTo={dateTo}
        onDateToChange={(d) => { setDateTo(d); setPage(1); }}
        scoreRange={scoreRange}
        onScoreRangeChange={(r) => { setScoreRange(r); setPage(1); }}
        detectionMethod={detectionMethod}
        onDetectionMethodChange={(v) => { setDetectionMethod(v); setPage(1); }}
      />

      <Card className="bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-lg">
        <ScrollArea className="h-[440px]">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader label="Doctor ID" field="doctorId" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                <SortableHeader label="Specialty" field="specialty" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                <TableHead>Risk Level</TableHead>
                <SortableHeader label="Risk Score" field="riskScore" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} />
                <SortableHeader label="Exposure" field="totalExposure" currentSort={sortBy} currentOrder={sortOrder} onSort={handleSort} className="text-right" />
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((doctor) => (
                <TableRow key={doctor.id} data-testid={`row-doctor-${doctor.id}`} className="hover-elevate cursor-pointer">
                  <TableCell><p className="font-medium font-mono">{doctor.doctorId}</p></TableCell>
                  <TableCell><Badge variant="outline">{doctor.specialty || "General"}</Badge></TableCell>
                  <TableCell>
                    <Badge className={getRiskLevelBadgeClasses(doctor.riskLevel)}>{doctor.riskLevel || "Unknown"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(parseFloat(doctor.riskScore || "0"), 100)} className="w-16 h-2" />
                      <span className="text-sm">{parseFloat(doctor.riskScore || "0").toFixed(1)}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(doctor.totalExposure)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm" variant="outline"
                      data-testid={`button-view-doctor-${doctor.id}`}
                      onClick={() => { setSelectedDoctor(doctor); setSheetOpen(true); }}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      View Profile
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No doctors found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
        <PaginationControls
          page={page} pageSize={pageSize} total={total}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        />
      </Card>

      <DoctorDrillDown doctor={selectedDoctor} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}

// ---- Bulk Export Dialog ----

function BulkExportDialog({
  open,
  onOpenChange,
  entityType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: string;
}) {
  const [format, setFormat] = useState<"csv" | "xlsx">("xlsx");
  const [downloading, setDownloading] = useState(false);

  const handleExport = async () => {
    setDownloading(true);
    try {
      const url = `/api/fwa/high-risk-entities/export?entityType=${entityType}&format=${format}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error("Export failed");
      const blob = await resp.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `high-risk-${entityType}s.${format}`;
      a.click();
      URL.revokeObjectURL(downloadUrl);
      onOpenChange(false);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-purple-600" />
            Export High-Risk Entities
          </DialogTitle>
          <DialogDescription>
            Download all high-risk {entityType}s with detection scores and risk metrics.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Export Format</Label>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as "csv" | "xlsx")} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="xlsx" id="xlsx" />
                <Label htmlFor="xlsx" className="cursor-pointer">Excel (.xlsx)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv" className="cursor-pointer">CSV (.csv)</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
            Export includes: Entity ID, Risk Score, Risk Level, 5-Engine Scores, Total Claims, Total Exposure, Detection Method, and Analysis Date.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleExport} disabled={downloading} className="gap-1">
            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {downloading ? "Exporting..." : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function HighRiskEntities() {
  const tabFromUrl = new URLSearchParams(window.location.search).get("tab");
  const validTabs = ["providers", "patients", "doctors"];
  const defaultTab = validTabs.includes(tabFromUrl || "") ? tabFromUrl! : "providers";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">High-Risk Entities</h1>
          <p className="text-muted-foreground">
            Monitor providers, members, and clinicians with elevated risk
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => setExportOpen(true)}>
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      <BulkExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        entityType={activeTab === "providers" ? "provider" : activeTab === "patients" ? "patient" : "doctor"}
      />

      <Tabs defaultValue={defaultTab} className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="providers" className="flex items-center gap-2" data-testid="tab-providers">
            <Building2 className="h-4 w-4" />
            Providers
          </TabsTrigger>
          <TabsTrigger value="patients" className="flex items-center gap-2" data-testid="tab-patients">
            <User className="h-4 w-4" />
            Patients
          </TabsTrigger>
          <TabsTrigger value="doctors" className="flex items-center gap-2" data-testid="tab-doctors">
            <UserCog className="h-4 w-4" />
            Doctors
          </TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="mt-6">
          <ProvidersTab />
        </TabsContent>

        <TabsContent value="patients" className="mt-6">
          <PatientsTab />
        </TabsContent>

        <TabsContent value="doctors" className="mt-6">
          <DoctorsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
