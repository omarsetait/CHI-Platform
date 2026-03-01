import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EntityHeader } from "@/components/portal/entity-header";
import { KpiCard } from "@/components/portal/kpi-card";
import { InsightCard } from "@/components/portal/insight-card";
import {
  Hospital,
  Target,
  ShieldAlert,
  FileCheck,
  FileText,
  AlertTriangle,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface ProviderData {
  code: string;
  name: string;
  nameAr: string;
  licenseNo: string;
  region: string;
  city: string;
  type: string;
  accreditationStatus: string;
  bedCount: number | null;
  specialties: string[] | null;
}

interface ScorecardData {
  id: string;
  providerCode: string;
  month: string;
  overallScore: string;
  codingAccuracy: string;
  rejectionRate: string;
  sbsCompliance: string;
  drgReadiness: string;
  documentationQuality: string;
  fwaRisk: string;
  peerRankPercentile: number | null;
  trend: string | null;
}

interface ProviderProfileResponse {
  provider: ProviderData;
  currentScorecard: ScorecardData;
  scorecardHistory: ScorecardData[];
  generatedAt: string;
}

function formatProviderType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function accreditationStatusVariant(
  status: string
): "success" | "warning" | "danger" {
  switch (status) {
    case "accredited":
      return "success";
    case "conditional":
    case "pending":
      return "warning";
    case "expired":
    case "revoked":
      return "danger";
    default:
      return "warning";
  }
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 65) return "text-amber-600";
  return "text-rose-600";
}

export default function ProviderProfilePage() {
  const { code } = useParams<{ code: string }>();

  const { data, isLoading } = useQuery<ProviderProfileResponse>({
    queryKey: ["/api/intelligence/portal/provider", code],
    queryFn: () =>
      fetch(`/api/intelligence/portal/provider/${code}`).then((r) => r.json()),
    enabled: !!code,
  });

  if (!code) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        No provider code specified.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading provider profile...
      </div>
    );
  }

  if (!data?.provider || !data?.currentScorecard) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Provider not found.
      </div>
    );
  }

  const { provider, currentScorecard, scorecardHistory } = data;

  const overallScore = Number(currentScorecard.overallScore);
  const codingAccuracy = Number(currentScorecard.codingAccuracy);
  const rejectionRate = Number(currentScorecard.rejectionRate);
  const sbsCompliance = Number(currentScorecard.sbsCompliance);
  const drgReadiness = Number(currentScorecard.drgReadiness);
  const docQuality = Number(currentScorecard.documentationQuality);
  const fwaRisk = Number(currentScorecard.fwaRisk);
  const peerRank = currentScorecard.peerRankPercentile;

  // Radar chart data — 6 dimensions
  const radarData = [
    { dimension: "Coding Accuracy", value: codingAccuracy, fullMark: 100 },
    { dimension: "SBS Compliance", value: sbsCompliance, fullMark: 100 },
    { dimension: "DRG Readiness", value: drgReadiness, fullMark: 100 },
    { dimension: "Documentation", value: docQuality, fullMark: 100 },
    {
      dimension: "Low Rejection",
      value: Math.max(0, 100 - rejectionRate),
      fullMark: 100,
    },
    {
      dimension: "Low FWA Risk",
      value: Math.max(0, 100 - fwaRisk),
      fullMark: 100,
    },
  ];

  // 6-month trend data
  const trendData = scorecardHistory.map((s) => ({
    month: s.month,
    score: Number(s.overallScore),
  }));

  // Items needing attention: dimensions below 70
  const attentionItems: Array<{
    icon: "alert-triangle" | "lightbulb";
    headline: string;
    body: string;
    tag: string;
  }> = [];

  if (codingAccuracy < 70) {
    attentionItems.push({
      icon: "alert-triangle",
      headline: "Coding Accuracy Below Target",
      body: `Current coding accuracy is ${codingAccuracy.toFixed(1)}%. Consider additional coder training and regular ICD-10 audits to improve accuracy.`,
      tag: "Coding",
    });
  }
  if (sbsCompliance < 70) {
    attentionItems.push({
      icon: "alert-triangle",
      headline: "SBS Compliance Needs Improvement",
      body: `SBS compliance is at ${sbsCompliance.toFixed(1)}%. Review Saudi Billing Standard guidelines and update billing workflows to ensure compliance.`,
      tag: "SBS",
    });
  }
  if (drgReadiness < 70) {
    attentionItems.push({
      icon: "lightbulb",
      headline: "DRG Readiness Gap",
      body: `DRG readiness score is ${drgReadiness.toFixed(1)}%. Prioritize DRG criteria completion to prepare for the national DRG rollout.`,
      tag: "DRG",
    });
  }
  if (docQuality < 70) {
    attentionItems.push({
      icon: "alert-triangle",
      headline: "Documentation Quality Below Standard",
      body: `Documentation quality at ${docQuality.toFixed(1)}% is below the recommended threshold. Invest in clinical documentation improvement (CDI) programs.`,
      tag: "Documentation",
    });
  }
  if (rejectionRate > 30) {
    attentionItems.push({
      icon: "alert-triangle",
      headline: "High Rejection Rate",
      body: `Rejection rate of ${rejectionRate.toFixed(1)}% exceeds the acceptable threshold. Analyze denial patterns and implement corrective measures.`,
      tag: "Rejections",
    });
  }
  if (fwaRisk > 30) {
    attentionItems.push({
      icon: "alert-triangle",
      headline: "Elevated FWA Risk",
      body: `FWA risk score of ${fwaRisk.toFixed(1)}% indicates elevated fraud, waste, and abuse risk. Review flagged claims and enhance internal controls.`,
      tag: "FWA",
    });
  }

  return (
    <div className="space-y-6">
      {/* 1. Entity Header */}
      <EntityHeader
        icon={Hospital}
        name={provider.name}
        nameAr={provider.nameAr}
        identifiers={[
          { label: "License", value: provider.licenseNo },
          { label: "Type", value: formatProviderType(provider.type) },
          { label: "Region", value: `${provider.city}, ${provider.region}` },
          ...(provider.bedCount
            ? [{ label: "Beds", value: String(provider.bedCount) }]
            : []),
        ]}
        status={{
          label: provider.accreditationStatus.charAt(0).toUpperCase() + provider.accreditationStatus.slice(1),
          variant: accreditationStatusVariant(provider.accreditationStatus),
        }}
        pillarTheme="bg-blue-50 text-blue-600"
      />

      {/* 2. Radar Chart + Peer Benchmark */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              Performance Dimensions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                />
                <Radar
                  name="Score"
                  dataKey="value"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 3. Peer Benchmark + Overall Score */}
        <div className="space-y-4">
          <Card className="shadow-sm border-l-4 border-l-blue-500">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Overall Score
              </p>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-bold ${scoreColor(overallScore)}`}>
                  {overallScore.toFixed(1)}%
                </span>
                {currentScorecard.trend && (
                  <Badge
                    className={
                      currentScorecard.trend === "improving"
                        ? "bg-emerald-100 text-emerald-700"
                        : currentScorecard.trend === "declining"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-700"
                    }
                  >
                    {currentScorecard.trend.charAt(0).toUpperCase() +
                      currentScorecard.trend.slice(1)}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Month: {currentScorecard.month}
              </p>
            </CardContent>
          </Card>

          {peerRank != null && (
            <Card className="shadow-sm border-l-4 border-l-indigo-500">
              <CardContent className="p-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Peer Benchmark
                </p>
                <div className="text-2xl font-bold text-indigo-600">
                  Top {peerRank}%
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  of {formatProviderType(provider.type).toLowerCase()}s in{" "}
                  {provider.region}
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-sm">
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Scorecard Period
              </p>
              <p className="text-sm font-medium">
                {scorecardHistory.length > 0 && (
                  <>
                    {scorecardHistory[0].month} &mdash;{" "}
                    {scorecardHistory[scorecardHistory.length - 1].month}
                  </>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {scorecardHistory.length} monthly scorecards
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 4. 6-Month Trend Line Chart */}
      {trendData.length > 1 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Score Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                />
                <Tooltip
                  formatter={(value: number) => [`${value.toFixed(1)}%`, "Overall Score"]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#3b82f6" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 5. KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          title="Overall Score"
          value={overallScore.toFixed(1)}
          format="percent"
          icon={BarChart3}
          iconColor="text-blue-500"
          borderColor="border-l-blue-500"
          trend={
            currentScorecard.trend === "improving"
              ? { direction: "up", value: "Improving" }
              : currentScorecard.trend === "declining"
                ? { direction: "down", value: "Declining" }
                : { direction: "flat", value: "Stable" }
          }
        />
        <KpiCard
          title="Rejection Rate"
          value={rejectionRate.toFixed(1)}
          format="percent"
          icon={ShieldAlert}
          iconColor={rejectionRate > 20 ? "text-rose-500" : "text-emerald-500"}
          borderColor={
            rejectionRate > 20 ? "border-l-rose-500" : "border-l-emerald-500"
          }
        />
        <KpiCard
          title="SBS Compliance"
          value={sbsCompliance.toFixed(1)}
          format="percent"
          icon={FileCheck}
          iconColor="text-violet-500"
          borderColor="border-l-violet-500"
        />
        <KpiCard
          title="DRG Readiness"
          value={drgReadiness.toFixed(1)}
          format="percent"
          icon={Target}
          iconColor="text-indigo-500"
          borderColor="border-l-indigo-500"
        />
        <KpiCard
          title="Doc Quality"
          value={docQuality.toFixed(1)}
          format="percent"
          icon={FileText}
          iconColor="text-teal-500"
          borderColor="border-l-teal-500"
        />
        <KpiCard
          title="FWA Risk"
          value={fwaRisk.toFixed(1)}
          format="percent"
          icon={AlertTriangle}
          iconColor={fwaRisk > 20 ? "text-rose-500" : "text-emerald-500"}
          borderColor={
            fwaRisk > 20 ? "border-l-rose-500" : "border-l-emerald-500"
          }
        />
      </div>

      {/* 6. Items Needing Attention */}
      {attentionItems.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Items Needing Attention
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {attentionItems.map((item, i) => (
              <InsightCard
                key={i}
                icon={item.icon}
                headline={item.headline}
                body={item.body}
                tag={item.tag}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
