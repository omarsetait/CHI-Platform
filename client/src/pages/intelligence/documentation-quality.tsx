import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { ClipboardCheck, DollarSign, ArrowDownCircle, ShieldAlert } from "lucide-react";

interface DocQualityData {
  overallIndex: number;
  metrics: Array<{ name: string; score: number; benchmark: number }>;
  impact: { revenueAtRisk: number; drgDowngrades: number; preventableRejections: number };
  generatedAt: string;
}

export default function DocumentationQualityPage() {
  const { data, isLoading } = useQuery<DocQualityData>({
    queryKey: ["/api/intelligence/documentation-quality"],
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
          <ClipboardCheck className="h-8 w-8 text-violet-600" />
          Documentation Quality
        </h1>
        <p className="text-muted-foreground mt-1">
          Clinical documentation quality index and revenue impact analysis
        </p>
        <p className="text-sm text-violet-600 dark:text-violet-400 mt-0.5 font-medium" dir="rtl">
          جودة التوثيق السريري — مؤشر الجودة والتأثير المالي
        </p>
      </div>

      {/* Overall Quality Index Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Overall Quality Index</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/30" />
                <circle
                  cx="60" cy="60" r="50" fill="none"
                  stroke="url(#qualityGradient)" strokeWidth="10"
                  strokeDasharray={`${(data?.overallIndex ?? 0) * 3.14} 314`}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="qualityGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-primary">{data ? data.overallIndex : <Skeleton className="h-8 w-24 inline-block" />}</span>
                <span className="text-xs text-muted-foreground">/ 100</span>
              </div>
            </div>
            <div className="text-sm text-muted-foreground mt-4 text-center">
              Target: 85+ for optimal DRG performance
            </div>
          </CardContent>
        </Card>

        {/* Impact Cards */}
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Quality Impact Analysis</CardTitle>
            <CardDescription>Financial and operational impact of documentation gaps</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-center">
                <div className="p-3 rounded-full bg-white dark:bg-gray-900 shadow-sm inline-block mb-3">
                  <DollarSign className="h-6 w-6 text-rose-500" />
                </div>
                <div className="text-2xl font-bold text-rose-600">
                  {data?.impact.revenueAtRisk
                    ? `${(data.impact.revenueAtRisk / 1000000).toFixed(1)}M`
                    : <Skeleton className="h-8 w-24 inline-block" />}
                </div>
                <div className="text-xs text-muted-foreground mt-1">SAR Revenue at Risk</div>
              </div>

              <div className="p-5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-center">
                <div className="p-3 rounded-full bg-white dark:bg-gray-900 shadow-sm inline-block mb-3">
                  <ArrowDownCircle className="h-6 w-6 text-amber-500" />
                </div>
                <div className="text-2xl font-bold text-amber-600">
                  {data ? data.impact.drgDowngrades?.toLocaleString() : <Skeleton className="h-8 w-24 inline-block" />}
                </div>
                <div className="text-xs text-muted-foreground mt-1">DRG Downgrades</div>
              </div>

              <div className="p-5 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 text-center">
                <div className="p-3 rounded-full bg-white dark:bg-gray-900 shadow-sm inline-block mb-3">
                  <ShieldAlert className="h-6 w-6 text-violet-500" />
                </div>
                <div className="text-2xl font-bold text-violet-600">
                  {data ? data.impact.preventableRejections?.toLocaleString() : <Skeleton className="h-8 w-24 inline-block" />}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Preventable Rejections</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Score vs Benchmark Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Scores vs. Benchmarks</CardTitle>
          <CardDescription>Current documentation quality scores compared to target benchmarks</CardDescription>
        </CardHeader>
        <CardContent className="h-[380px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.metrics} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={80} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  formatter={(value: number, name: string) => [`${value}%`, name === "score" ? "Current Score" : "Benchmark"]}
                />
                <Legend />
                <Bar dataKey="score" name="Current Score" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="benchmark" name="Benchmark" fill="#d1d5db" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
