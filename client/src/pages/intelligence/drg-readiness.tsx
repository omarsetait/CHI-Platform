import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Activity, CheckCircle2, Clock, XCircle } from "lucide-react";

interface DrgReadinessData {
  overall: { ready: number; inProgress: number; notStarted: number };
  criteria: Array<{ name: string; progress: number }>;
  projectedTimeline: Array<{ quarter: string; readiness: number }>;
  generatedAt: string;
}

const PIE_COLORS = ["#10b981", "#f59e0b", "#ef4444"];

export default function DrgReadinessPage() {
  const { data, isLoading } = useQuery<DrgReadinessData>({
    queryKey: ["/api/intelligence/drg-readiness"],
  });

  const pieData = data
    ? [
        { name: "Ready", value: data.overall.ready },
        { name: "In Progress", value: data.overall.inProgress },
        { name: "Not Started", value: data.overall.notStarted },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
          <Activity className="h-8 w-8 text-emerald-600" />
          DRG Readiness
        </h1>
        <p className="text-muted-foreground mt-1">
          Track readiness for Diagnosis Related Group implementation across providers
        </p>
        <p className="text-sm text-violet-600 dark:text-violet-400 mt-0.5 font-medium" dir="rtl">
          جاهزية مجموعات التشخيص المتجانسة
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{data?.overall.ready ?? "..."}%</div>
              <div className="text-xs text-muted-foreground">Ready</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{data?.overall.inProgress ?? "..."}%</div>
              <div className="text-xs text-muted-foreground">In Progress</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500 shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30">
              <XCircle className="h-6 w-6 text-rose-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{data?.overall.notStarted ?? "..."}%</div>
              <div className="text-xs text-muted-foreground">Not Started</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Readiness Distribution</CardTitle>
            <CardDescription>Provider readiness breakdown by status</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {pieData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    formatter={(value: number) => [`${value}%`, "Percentage"]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Criteria Progress */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Readiness Criteria</CardTitle>
            <CardDescription>Progress across key DRG implementation requirements</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-5">
                {data?.criteria.map((criterion, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium">{criterion.name}</span>
                      <span className={`font-bold ${
                        criterion.progress >= 60 ? "text-emerald-600" : criterion.progress >= 40 ? "text-amber-600" : "text-rose-600"
                      }`}>
                        {criterion.progress}%
                      </span>
                    </div>
                    <Progress value={criterion.progress} className="h-2" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Projected Timeline */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Projected Readiness Timeline</CardTitle>
          <CardDescription>Estimated DRG readiness trajectory through Q1 2027</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.projectedTimeline} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  formatter={(value: number) => [`${value}%`, "Projected Readiness"]}
                />
                <Line
                  type="monotone"
                  dataKey="readiness"
                  stroke="#10b981"
                  strokeWidth={3}
                  strokeDasharray="8 4"
                  dot={{ fill: "#10b981", r: 5 }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
