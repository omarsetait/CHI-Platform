import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { PiggyBank, TrendingDown, DollarSign, Target } from "lucide-react";

interface CostContainmentData {
  adminCostRatio: number;
  oecdBenchmark: number;
  savingsOpportunity: number;
  breakdown: Array<{ category: string; percent: number; amount: number }>;
  costTrend: Array<{ year: string; ratio: number }>;
  generatedAt: string;
}

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"];

export default function CostContainmentPage() {
  const { data, isLoading } = useQuery<CostContainmentData>({
    queryKey: ["/api/business/cost-containment"],
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
          <PiggyBank className="h-8 w-8 text-rose-600" />
          Cost Containment
        </h1>
        <p className="text-muted-foreground mt-1">
          Administrative cost analysis and savings opportunity identification
        </p>
        <p className="text-sm text-sky-600 dark:text-sky-400 mt-0.5 font-medium" dir="rtl">
          احتواء التكاليف — تحليل المصروفات الإدارية
        </p>
      </div>

      {/* Admin Cost vs OECD Benchmark */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Admin Cost Ratio</CardTitle>
            <CardDescription>Current vs OECD benchmark</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/30" />
                {/* OECD benchmark ring */}
                <circle
                  cx="60" cy="60" r="50" fill="none"
                  stroke="#10b981" strokeWidth="4"
                  strokeDasharray={`${(data?.oecdBenchmark ?? 0) * 3.14} 314`}
                  strokeLinecap="round"
                  opacity={0.4}
                />
                {/* Current ratio ring */}
                <circle
                  cx="60" cy="60" r="50" fill="none"
                  stroke="url(#costGradient)" strokeWidth="10"
                  strokeDasharray={`${(data?.adminCostRatio ?? 0) * 3.14} 314`}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="costGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-rose-600">{data?.adminCostRatio ?? "..."}%</span>
                <span className="text-xs text-muted-foreground">admin cost</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <span>Current ({data?.adminCostRatio ?? "..."}%)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-emerald-500 opacity-50" />
                <span>OECD ({data?.oecdBenchmark ?? "..."}%)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Savings Opportunity */}
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              Savings Opportunity
            </CardTitle>
            <CardDescription>Estimated savings from reaching OECD admin cost benchmark</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-6 rounded-xl border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 relative overflow-hidden">
              <div className="absolute inset-0 bg-emerald-500/5" />
              <div className="relative z-10">
                <div className="text-sm font-medium text-muted-foreground mb-2">Annual Savings Potential</div>
                <div className="text-5xl font-extrabold text-emerald-600">
                  {data ? `${(data.savingsOpportunity / 1000000000).toFixed(1)}B` : "..."} <span className="text-xl font-normal">SAR</span>
                </div>
                <p className="text-sm mt-3 text-muted-foreground">
                  By reducing admin cost ratio from {data?.adminCostRatio ?? "--"}% to {data?.oecdBenchmark ?? "--"}% OECD benchmark
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <Target className="h-5 w-5 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-200">
                <strong>Gap Analysis:</strong> Saudi market admin costs are {data ? (data.adminCostRatio - data.oecdBenchmark).toFixed(1) : "--"} percentage points above OECD average, primarily driven by claims processing and provider network management inefficiencies.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Breakdown Pie Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Cost Breakdown by Category</CardTitle>
            <CardDescription>Administrative cost distribution across functions</CardDescription>
          </CardHeader>
          <CardContent className="h-[380px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.breakdown}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="percent"
                    nameKey="category"
                    label={({ category, percent }) => `${category}: ${percent}%`}
                  >
                    {data?.breakdown.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    formatter={(value: number, name: string, props: any) => [
                      `${value}% (${(props.payload.amount / 1000000000).toFixed(1)}B SAR)`,
                      name,
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Cost Trend Line Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-5 w-5 text-emerald-500" />
              Admin Cost Ratio Trend
            </CardTitle>
            <CardDescription>Year-over-year progress in reducing administrative costs</CardDescription>
          </CardHeader>
          <CardContent className="h-[380px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.costTrend} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis domain={[10, 25]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    formatter={(value: number) => [`${value}%`, "Admin Cost Ratio"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="ratio"
                    stroke="#ef4444"
                    strokeWidth={3}
                    dot={{ fill: "#ef4444", r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                  {/* OECD benchmark reference line via a second line */}
                  <Line
                    type="monotone"
                    dataKey={() => data?.oecdBenchmark ?? 12}
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="8 4"
                    dot={false}
                    name="OECD Benchmark"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
