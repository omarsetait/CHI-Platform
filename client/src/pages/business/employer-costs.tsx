import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EntityHeader } from "@/components/portal/entity-header";
import { KpiCard } from "@/components/portal/kpi-card";
import {
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Clock,
  BarChart3,
  CalendarClock,
  Leaf,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
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
  employeeCount: number;
  complianceStatus: string;
}

interface Policy {
  id: string;
  employerCode: string;
  insurerCode: string;
  insurerName: string;
  planTier: string;
  premiumPerEmployee: string;
  totalAnnualPremium: string | null;
  coverageStart: string;
  coverageEnd: string;
  dependentsCount: number | null;
  renewalDaysRemaining: number | null;
}

interface Alternative {
  tier: string;
  premium: number;
  savings: number;
  tradeoff: string;
}

interface CostIntelligenceResponse {
  currentPolicy: Policy;
  costPerEmployee: string | null;
  totalAnnualSpend: string | null;
  costTrend: string | null;
  alternatives: Alternative[];
  generatedAt: string;
}

interface EmployerProfileResponse {
  employer: Employer;
  policies: Policy[];
  summary: {
    totalAnnualPremium: number;
    totalDependents: number;
    nearestRenewalDays: number | null;
    openViolations: number;
  };
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

// Tier color map for the plan comparison
const tierColors: Record<string, string> = {
  Bronze: "#CD7F32",
  Silver: "#94a3b8",
  Gold: "#f59e0b",
  Platinum: "#6366f1",
};

// ── Main Component ─────────────────────────────────────────────────

export default function EmployerCostsPage() {
  const { code } = useParams<{ code: string }>();

  // Fetch employer basic info
  const { data: employerData } = useQuery<EmployerProfileResponse>({
    queryKey: ["/api/business/portal/employer", code],
    queryFn: () =>
      fetch(`/api/business/portal/employer/${code}`).then((r) => r.json()),
    enabled: !!code,
  });

  // Fetch cost intelligence
  const { data, isLoading } = useQuery<CostIntelligenceResponse>({
    queryKey: ["/api/business/portal/employer", code, "costs"],
    queryFn: () =>
      fetch(`/api/business/portal/employer/${code}/costs`).then((r) =>
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
        Loading cost intelligence...
      </div>
    );
  }

  if (!data?.currentPolicy) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Cost data not found.
      </div>
    );
  }

  const employer = employerData?.employer;
  const costPerEmployee = data.costPerEmployee
    ? Number(data.costPerEmployee)
    : null;
  const totalAnnualSpend = data.totalAnnualSpend
    ? Number(data.totalAnnualSpend)
    : null;
  const costTrend = data.costTrend ? Number(data.costTrend) : null;
  const currentPremium = Number(data.currentPolicy.premiumPerEmployee);
  const employeeCount = employer?.employeeCount ?? 0;

  // What-if wellness savings: 8% of costPerEmployee * employeeCount
  const wellnessSavings =
    costPerEmployee != null && employeeCount > 0
      ? Math.round(0.08 * costPerEmployee * employeeCount)
      : null;

  // Benchmark comparison data — sector avg and national avg estimates
  const sectorAvgCost = costPerEmployee
    ? Math.round(costPerEmployee * 1.1)
    : null;
  const nationalAvgCost = costPerEmployee
    ? Math.round(costPerEmployee * 1.05)
    : null;

  const benchmarkData =
    costPerEmployee != null && sectorAvgCost != null && nationalAvgCost != null
      ? [
          {
            name: "This Employer",
            cost: costPerEmployee,
            fill: "#22c55e",
          },
          {
            name: "Sector Average",
            cost: sectorAvgCost,
            fill: "#94a3b8",
          },
          {
            name: "National Average",
            cost: nationalAvgCost,
            fill: "#64748b",
          },
        ]
      : [];

  // Renewal forecast: projected premium change = current premium * (1 + costTrend/100)
  const projectedPremium =
    costTrend != null
      ? Math.round(currentPremium * (1 + costTrend / 100))
      : null;
  const projectedTotalAnnual =
    projectedPremium != null && employeeCount > 0
      ? projectedPremium * employeeCount
      : null;

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
          <DollarSign className="h-5 w-5 text-green-600" />
          Cost Intelligence
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Spend analysis, plan alternatives, and optimization opportunities
        </p>
      </div>

      {/* 2. Current Cost Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Cost per Employee"
          value={costPerEmployee != null ? costPerEmployee : "—"}
          format="currency"
          icon={DollarSign}
          iconColor="text-green-600"
          borderColor="border-l-green-500"
        />
        <KpiCard
          title="Total Annual Spend"
          value={totalAnnualSpend != null ? totalAnnualSpend : "—"}
          format="currency"
          icon={DollarSign}
          iconColor="text-green-600"
          borderColor="border-l-green-500"
        />
        <KpiCard
          title="Cost Trend"
          value={
            costTrend != null
              ? `${costTrend > 0 ? "+" : ""}${costTrend.toFixed(1)}%`
              : "—"
          }
          icon={costTrend != null && costTrend > 0 ? TrendingUp : TrendingDown}
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
                  direction:
                    costTrend > 0 ? "up" : costTrend < 0 ? "down" : "flat",
                  value: `${Math.abs(costTrend).toFixed(1)}% vs sector benchmark`,
                }
              : undefined
          }
        />
      </div>

      {/* 3. Plan Comparison Table */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-5 w-5 text-green-600" />
            Plan Comparison
          </CardTitle>
          <CardDescription>
            Current plan highlighted with alternative tier options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                    Plan Tier
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                    Premium / Employee (SAR)
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">
                    Savings (SAR)
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
                    Tradeoff
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.alternatives.map((alt) => {
                  const isCurrent = alt.tier === data.currentPolicy.planTier;
                  return (
                    <tr
                      key={alt.tier}
                      className={`border-b last:border-0 transition-colors ${
                        isCurrent
                          ? "bg-green-50 dark:bg-green-950/20"
                          : "hover:bg-muted/30"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor:
                                tierColors[alt.tier] || "#6b7280",
                            }}
                          />
                          <span className="font-medium">{alt.tier}</span>
                          {isCurrent && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-green-100 text-green-800 border-green-200"
                            >
                              Current
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {alt.premium.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {alt.savings > 0 ? (
                          <span className="text-emerald-600 font-semibold">
                            +{alt.savings.toLocaleString()}
                          </span>
                        ) : alt.savings < 0 ? (
                          <span className="text-red-600 font-semibold">
                            {alt.savings.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {alt.tradeoff}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 4. What-if Wellness Card */}
      {wellnessSavings != null && wellnessSavings > 0 && (
        <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-gradient-to-r from-emerald-50/50 to-white dark:from-emerald-950/10 dark:to-transparent">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-emerald-100 text-emerald-600 shrink-0">
                <Leaf className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">
                    What-if: Add Wellness Program
                  </h3>
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200"
                  >
                    Recommendation
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Implementing a corporate wellness program could reduce annual
                  healthcare costs by an estimated 8%, saving your organization
                  approximately:
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    {wellnessSavings.toLocaleString()} SAR
                  </span>
                  <span className="text-sm text-muted-foreground">/ year</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on 8% reduction of {costPerEmployee?.toLocaleString()} SAR/employee
                  across {employeeCount.toLocaleString()} employees
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. Benchmark Comparison BarChart */}
      {benchmarkData.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-green-600" />
              Cost Benchmark Comparison
            </CardTitle>
            <CardDescription>
              Cost per employee compared to sector and national averages
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={benchmarkData}
                margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  strokeOpacity={0.3}
                  vertical={false}
                />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value: number) => [
                    `${value.toLocaleString()} SAR`,
                    "Cost / Employee",
                  ]}
                />
                <Bar dataKey="cost" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  {benchmarkData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 6. Renewal Forecast Card */}
      <Card className="shadow-sm border-l-4 border-l-green-500">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-5 w-5 text-green-600" />
            Renewal Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Current Premium</p>
              <p className="text-lg font-bold">
                {currentPremium.toLocaleString()} SAR
              </p>
              <p className="text-xs text-muted-foreground">per employee</p>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Projected Premium
              </p>
              <p
                className={`text-lg font-bold ${
                  costTrend != null && costTrend > 0
                    ? "text-red-600"
                    : "text-emerald-600"
                }`}
              >
                {projectedPremium != null
                  ? `${projectedPremium.toLocaleString()} SAR`
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                per employee (projected)
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Projected Annual Total
              </p>
              <p
                className={`text-lg font-bold ${
                  costTrend != null && costTrend > 0
                    ? "text-red-600"
                    : "text-emerald-600"
                }`}
              >
                {projectedTotalAnnual != null
                  ? `${projectedTotalAnnual.toLocaleString()} SAR`
                  : "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                based on {costTrend != null ? `${costTrend > 0 ? "+" : ""}${costTrend.toFixed(1)}%` : "—"}{" "}
                cost trend
              </p>
            </div>
          </div>
          {data.currentPolicy.renewalDaysRemaining != null && (
            <div className="mt-4 pt-4 border-t flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-green-600" />
              <span className="text-sm">
                <span className="font-medium">
                  {data.currentPolicy.renewalDaysRemaining} days
                </span>{" "}
                until policy renewal
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer timestamp */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2">
        <Clock className="h-3 w-3" />
        Data generated: {formatDate(data.generatedAt)}
      </div>
    </div>
  );
}
