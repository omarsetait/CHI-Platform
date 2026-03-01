import { useParams } from "wouter";
import { usePersona } from "@/hooks/use-persona";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EntityHeader } from "@/components/portal/entity-header";
import { KpiCard } from "@/components/portal/kpi-card";
import { InsightCard } from "@/components/portal/insight-card";
import {
  Building2,
  Heart,
  Users,
  Activity,
  DollarSign,
  Brain,
  Stethoscope,
  AlertTriangle,
  TrendingUp,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ── Types ──────────────────────────────────────────────────────────

interface Employer {
  code: string;
  name: string;
  nameAr: string | null;
  crNumber: string;
  sector: string;
  city: string;
  region: string;
  complianceStatus: string;
}

interface ChronicCondition {
  condition: string;
  count: number;
  prevalencePercent: number;
}

interface WellnessBreakdownItem {
  category: string;
  score: number;
}

interface InsightItem {
  icon: "lightbulb" | "alert-triangle" | "check-circle" | "brain" | "eye" | "activity";
  headline: string;
  body: string;
  tag: string;
}

interface HealthProfileResponse {
  id: string;
  employerCode: string;
  avgAge: string | null;
  malePercent: string | null;
  chronicConditions: ChronicCondition[] | null;
  topSpecialties: Array<{ specialty: string; visits: number }> | null;
  visitsPerEmployee: string | null;
  erUtilizationPercent: string | null;
  erBenchmarkPercent: string | null;
  totalAnnualSpendSar: string | null;
  costPerEmployee: string | null;
  costTrendPercent: string | null;
  absenteeismDays: string | null;
  absenteeismBenchmark: string | null;
  wellnessScore: number | null;
  wellnessBreakdown: WellnessBreakdownItem[] | null;
  insights: InsightItem[] | null;
  generatedAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────

function formatSector(sector: string): string {
  return sector
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ── Main Component ─────────────────────────────────────────────────

export default function EmployerHealthPage() {
  const params = useParams<{ code: string }>();
  const [personaCode] = usePersona("business");
  const code = params.code || personaCode;

  // Fetch employer basic info for EntityHeader
  const { data: employerData } = useQuery<{
    employer: Employer;
  }>({
    queryKey: ["/api/business/portal/employer", code],
    queryFn: () =>
      fetch(`/api/business/portal/employer/${code}`).then((r) => r.json()),
    enabled: !!code,
  });

  // Fetch health profile
  const { data, isLoading } = useQuery<HealthProfileResponse>({
    queryKey: ["/api/business/portal/employer", code, "health"],
    queryFn: () =>
      fetch(`/api/business/portal/employer/${code}/health`).then((r) =>
        r.json()
      ),
    enabled: !!code,
  });

  if (!code) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No employer code provided.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading workforce health profile...
      </div>
    );
  }

  if (!data || (data as any).error) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Health profile not found.
      </div>
    );
  }

  const employer = employerData?.employer;
  const avgAge = data.avgAge ? Number(data.avgAge) : null;
  const malePercent = data.malePercent ? Number(data.malePercent) : null;
  const femalePercent = malePercent != null ? 100 - malePercent : null;
  const visitsPerEmployee = data.visitsPerEmployee
    ? Number(data.visitsPerEmployee)
    : null;
  const erUtil = data.erUtilizationPercent
    ? Number(data.erUtilizationPercent)
    : null;
  const erBenchmark = data.erBenchmarkPercent
    ? Number(data.erBenchmarkPercent)
    : null;
  const totalSpend = data.totalAnnualSpendSar
    ? Number(data.totalAnnualSpendSar)
    : null;
  const costPerEmp = data.costPerEmployee
    ? Number(data.costPerEmployee)
    : null;
  const costTrend = data.costTrendPercent
    ? Number(data.costTrendPercent)
    : null;
  const absenteeismDays = data.absenteeismDays
    ? Number(data.absenteeismDays)
    : null;
  const absentBenchmark = data.absenteeismBenchmark
    ? Number(data.absenteeismBenchmark)
    : null;
  const wellnessScore = data.wellnessScore;

  return (
    <div className="space-y-6">
      {/* 1. EntityHeader (condensed) */}
      {employer && (
        <EntityHeader
          icon={Building2}
          name={employer.name}
          nameAr={employer.nameAr ?? undefined}
          identifiers={[
            { label: "Code", value: employer.code },
            { label: "Sector", value: formatSector(employer.sector) },
            {
              label: "Location",
              value: `${employer.city}, ${employer.region}`,
            },
          ]}
          pillarTheme="bg-green-50 text-green-600"
        />
      )}

      {/* Section title */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Heart className="h-5 w-5 text-green-600" />
          Workforce Health Profile
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Demographics, utilization, costs, and wellness insights
        </p>
      </div>

      {/* 2. Demographics Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-green-50 text-green-600">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Average Age
                </p>
                <p className="text-3xl font-bold">
                  {avgAge != null ? avgAge.toFixed(1) : "—"}
                </p>
                <p className="text-xs text-muted-foreground">years</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-green-50 text-green-600">
                <Users className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                  Gender Distribution
                </p>
                <div className="flex items-baseline gap-4 mt-1">
                  <div>
                    <span className="text-2xl font-bold">
                      {malePercent != null ? `${malePercent.toFixed(1)}%` : "—"}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Male
                    </span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold">
                      {femalePercent != null
                        ? `${femalePercent.toFixed(1)}%`
                        : "—"}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">
                      Female
                    </span>
                  </div>
                </div>
                {malePercent != null && femalePercent != null && (
                  <div className="flex h-2 rounded-full overflow-hidden bg-muted mt-2">
                    <div
                      className="bg-blue-500 transition-all"
                      style={{ width: `${malePercent}%` }}
                    />
                    <div
                      className="bg-pink-500 transition-all"
                      style={{ width: `${femalePercent}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Chronic Condition Prevalence */}
      {data.chronicConditions && data.chronicConditions.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="h-5 w-5 text-green-600" />
              Chronic Condition Prevalence
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.chronicConditions}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  strokeOpacity={0.3}
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <YAxis
                  type="category"
                  dataKey="condition"
                  tick={{ fontSize: 12 }}
                  width={90}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value: number) => [
                    `${value}%`,
                    "Prevalence",
                  ]}
                />
                <Bar
                  dataKey="prevalencePercent"
                  fill="#22c55e"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 4. Utilization Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <KpiCard
          title="Visits per Employee"
          value={visitsPerEmployee != null ? visitsPerEmployee.toFixed(1) : "—"}
          icon={Activity}
          iconColor="text-green-600"
          borderColor="border-l-green-500"
        />
        <KpiCard
          title="ER Utilization"
          value={erUtil != null ? `${erUtil.toFixed(1)}%` : "—"}
          icon={AlertTriangle}
          iconColor={
            erUtil != null && erBenchmark != null && erUtil > erBenchmark
              ? "text-red-600"
              : "text-green-600"
          }
          borderColor={
            erUtil != null && erBenchmark != null && erUtil > erBenchmark
              ? "border-l-red-500"
              : "border-l-green-500"
          }
          benchmark={
            erBenchmark != null
              ? { label: "Benchmark", value: `${erBenchmark.toFixed(1)}%` }
              : undefined
          }
        />
      </div>

      {/* 5. Cost Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Total Annual Spend"
          value={totalSpend != null ? totalSpend : "—"}
          format="currency"
          icon={DollarSign}
          iconColor="text-green-600"
          borderColor="border-l-green-500"
        />
        <KpiCard
          title="Cost per Employee"
          value={costPerEmp != null ? costPerEmp : "—"}
          format="currency"
          icon={DollarSign}
          iconColor="text-green-600"
          borderColor="border-l-green-500"
        />
        <KpiCard
          title="Cost Trend"
          value={costTrend != null ? `${costTrend > 0 ? "+" : ""}${costTrend.toFixed(1)}%` : "—"}
          icon={TrendingUp}
          iconColor={
            costTrend != null && costTrend > 0
              ? "text-red-600"
              : "text-emerald-600"
          }
          borderColor={
            costTrend != null && costTrend > 0
              ? "border-l-red-500"
              : "border-l-green-500"
          }
          trend={
            costTrend != null
              ? {
                  direction: costTrend > 0 ? "up" : costTrend < 0 ? "down" : "flat",
                  value: `${Math.abs(costTrend).toFixed(1)}% YoY`,
                }
              : undefined
          }
        />
      </div>

      {/* 6. Absenteeism */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-green-600" />
            Absenteeism
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-bold">
                {absenteeismDays != null ? absenteeismDays.toFixed(1) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Days / Employee</p>
            </div>
            <div className="text-center text-muted-foreground">vs</div>
            <div className="text-center">
              <p className="text-3xl font-bold text-muted-foreground">
                {absentBenchmark != null ? absentBenchmark.toFixed(1) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                Benchmark (Sector Avg)
              </p>
            </div>
            {absenteeismDays != null && absentBenchmark != null && (
              <div className="ml-auto">
                <Badge
                  variant="outline"
                  className={`text-sm ${
                    absenteeismDays <= absentBenchmark
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                      : "bg-amber-100 text-amber-800 border-amber-200"
                  }`}
                >
                  {absenteeismDays <= absentBenchmark
                    ? "Below Benchmark"
                    : "Above Benchmark"}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 7. Wellness Score */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-5 w-5 text-green-600" />
            Wellness Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row items-center gap-8">
            {/* Circular progress style display */}
            <div className="relative flex items-center justify-center">
              <svg className="w-36 h-36 -rotate-90" viewBox="0 0 144 144">
                <circle
                  cx="72"
                  cy="72"
                  r="60"
                  fill="none"
                  stroke="currentColor"
                  className="text-muted/30"
                  strokeWidth="12"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="60"
                  fill="none"
                  stroke="currentColor"
                  className={
                    wellnessScore != null && wellnessScore >= 70
                      ? "text-emerald-500"
                      : wellnessScore != null && wellnessScore >= 50
                        ? "text-amber-500"
                        : "text-red-500"
                  }
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${((wellnessScore ?? 0) / 100) * 377} 377`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">
                  {wellnessScore ?? "—"}
                </span>
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
            </div>

            {/* Wellness breakdown bars */}
            {data.wellnessBreakdown && data.wellnessBreakdown.length > 0 && (
              <div className="flex-1 w-full space-y-3">
                {data.wellnessBreakdown.map((item) => (
                  <div key={item.category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{item.category}</span>
                      <span className="text-muted-foreground">
                        {item.score}/100
                      </span>
                    </div>
                    <Progress
                      value={item.score}
                      className={`h-2 ${
                        item.score >= 70
                          ? "[&>div]:bg-emerald-500"
                          : item.score >= 50
                            ? "[&>div]:bg-amber-500"
                            : "[&>div]:bg-red-500"
                      }`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 8. Insights */}
      {data.insights && data.insights.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-green-600" />
            Health Insights
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {data.insights.map((insight, idx) => (
              <InsightCard
                key={idx}
                icon={insight.icon}
                headline={insight.headline}
                body={insight.body}
                tag={insight.tag}
              />
            ))}
          </div>
        </div>
      )}

      {/* Footer timestamp */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2">
        <Clock className="h-3 w-3" />
        Data generated: {formatDate(data.generatedAt)}
      </div>
    </div>
  );
}
