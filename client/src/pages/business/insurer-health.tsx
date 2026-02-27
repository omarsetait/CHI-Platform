import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Landmark, TrendingUp, TrendingDown, Minus, AlertTriangle, DollarSign } from "lucide-react";

interface Insurer {
  name: string;
  premiums: number;
  claims: number;
  lossRatio: number;
  capitalAdequacy: number;
  marketShare: number;
  trend: string;
}

interface InsurerHealthData {
  insurers: Insurer[];
  generatedAt: string;
}

function TrendBadge({ trend }: { trend: string }) {
  if (trend === "improving") {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 gap-1">
        <TrendingUp className="h-3 w-3" /> Improving
      </Badge>
    );
  }
  if (trend === "declining") {
    return (
      <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300 gap-1">
        <TrendingDown className="h-3 w-3" /> Declining
      </Badge>
    );
  }
  if (trend === "at_risk") {
    return (
      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 gap-1">
        <AlertTriangle className="h-3 w-3" /> At Risk
      </Badge>
    );
  }
  return (
    <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 gap-1">
      <Minus className="h-3 w-3" /> Stable
    </Badge>
  );
}

export default function InsurerHealthPage() {
  const { data, isLoading } = useQuery<InsurerHealthData>({
    queryKey: ["/api/business/insurer-health"],
  });

  const totalPremiums = data?.insurers.reduce((sum, i) => sum + i.premiums, 0) ?? 0;
  const avgLossRatio = data?.insurers
    ? (data.insurers.reduce((sum, i) => sum + i.lossRatio, 0) / data.insurers.length).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
          <Landmark className="h-8 w-8 text-blue-600" />
          Insurer Health Monitor
        </h1>
        <p className="text-muted-foreground mt-1">
          Financial health and performance metrics for licensed health insurers
        </p>
        <p className="text-sm text-sky-600 dark:text-sky-400 mt-0.5 font-medium" dir="rtl">
          مراقبة صحة شركات التأمين — الملاءة المالية والأداء
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalPremiums ? `${(totalPremiums / 1000).toFixed(1)}B` : "..."} <span className="text-sm font-normal text-muted-foreground">SAR</span></div>
              <div className="text-xs text-muted-foreground">Total Gross Written Premiums</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30">
              <Landmark className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{avgLossRatio ?? "..."}%</div>
              <div className="text-xs text-muted-foreground">Average Loss Ratio</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insurers Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Insurer Performance Table</CardTitle>
          <CardDescription>Comprehensive overview of all monitored insurers (Premiums in M SAR)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading insurer data...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <th className="px-4 py-3 text-left rounded-tl-lg">Insurer</th>
                    <th className="px-3 py-3 text-right">Premiums (M)</th>
                    <th className="px-3 py-3 text-right">Claims (M)</th>
                    <th className="px-3 py-3 text-center">Loss Ratio</th>
                    <th className="px-3 py-3 text-center">Capital Adeq. %</th>
                    <th className="px-3 py-3 text-center">Market Share</th>
                    <th className="px-3 py-3 text-center rounded-tr-lg">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.insurers.map((ins) => (
                    <tr key={ins.name} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{ins.name}</td>
                      <td className="px-3 py-3 text-right">{ins.premiums.toLocaleString()}</td>
                      <td className="px-3 py-3 text-right">{ins.claims.toLocaleString()}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`font-bold ${
                          ins.lossRatio >= 85 ? "text-rose-600" : ins.lossRatio >= 75 ? "text-amber-600" : "text-emerald-600"
                        }`}>
                          {ins.lossRatio}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`font-medium ${
                          ins.capitalAdequacy >= 180 ? "text-emerald-600" : ins.capitalAdequacy >= 150 ? "text-amber-600" : "text-rose-600"
                        }`}>
                          {ins.capitalAdequacy}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">{ins.marketShare}%</td>
                      <td className="px-3 py-3 text-center">
                        <TrendBadge trend={ins.trend} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Loss Ratio Comparison Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Loss Ratio Comparison</CardTitle>
          <CardDescription>Claims-to-premiums ratio across insurers (lower is healthier)</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.insurers} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  formatter={(value: number) => [`${value}%`, "Loss Ratio"]}
                />
                <Bar
                  dataKey="lossRatio"
                  radius={[4, 4, 0, 0]}
                  fill="#3b82f6"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
