import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { MapPin, Users, AlertTriangle } from "lucide-react";

interface CoverageGapsData {
  totalUninsured: number;
  bySegment: Array<{ segment: string; count: number; risk: string }>;
  byRegion: Array<{ region: string; insured: number; total: number; gapPercent: number }>;
  generatedAt: string;
}

function riskBadgeClass(risk: string): string {
  switch (risk) {
    case "critical": return "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300";
    case "high": return "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300";
    case "medium": return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
    default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
  }
}

function progressBarColor(risk: string): string {
  switch (risk) {
    case "critical": return "bg-rose-500";
    case "high": return "bg-amber-500";
    case "medium": return "bg-blue-500";
    default: return "bg-gray-400";
  }
}

export default function CoverageGapsPage() {
  const { data, isLoading } = useQuery<CoverageGapsData>({
    queryKey: ["/api/members/coverage-gaps"],
  });

  const totalUninsured = data?.totalUninsured ?? 0;
  const regionChartData = data?.byRegion.map((r) => ({
    ...r,
    coverageRate: Number(((r.insured / r.total) * 100).toFixed(1)),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
          <MapPin className="h-8 w-8 text-amber-600" />
          Coverage Gap Monitor
        </h1>
        <p className="text-muted-foreground mt-1">
          Identify uninsured population segments and regional coverage gaps across Saudi Arabia
        </p>
        <p className="text-sm text-teal-600 dark:text-teal-400 mt-0.5 font-medium" dir="rtl">
          مراقبة فجوات التغطية — تحديد السكان غير المؤمنين
        </p>
      </div>

      {/* Total Uninsured Card */}
      <Card className="shadow-sm border-2 border-amber-200 dark:border-amber-800/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
            Total Uninsured Population
          </CardTitle>
          <CardDescription>Individuals without active health insurance coverage in KSA</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold text-amber-600">
                {totalUninsured ? `${(totalUninsured / 1000000).toFixed(2)}M` : "..."}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Across {data?.bySegment.length ?? "--"} population segments
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-muted-foreground">Estimated gap rate</div>
              <div className="text-2xl font-bold text-rose-600">13.9%</div>
              <div className="text-xs text-muted-foreground">of total population</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Segment Progress Bars */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-teal-600" />
            Uninsured by Segment
          </CardTitle>
          <CardDescription>Population segments ranked by coverage gap severity</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading segments...</div>
          ) : (
            <div className="space-y-6">
              {data?.bySegment.map((seg, i) => {
                const percent = totalUninsured > 0 ? (seg.count / totalUninsured) * 100 : 0;
                return (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{seg.segment}</span>
                        <Badge className={`text-xs ${riskBadgeClass(seg.risk)}`}>
                          {seg.risk}
                        </Badge>
                      </div>
                      <span className="text-sm font-bold">
                        {(seg.count / 1000).toFixed(0)}K
                      </span>
                    </div>
                    <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${progressBarColor(seg.risk)}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {percent.toFixed(1)}% of total uninsured
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Regional Coverage Bar Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Coverage Rate by Region</CardTitle>
          <CardDescription>Health insurance coverage percentage across major regions</CardDescription>
        </CardHeader>
        <CardContent className="h-[380px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                <XAxis dataKey="region" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  formatter={(value: number, _name: string, props: any) => [
                    `${value}% coverage (${(props.payload.insured / 1000000).toFixed(1)}M / ${(props.payload.total / 1000000).toFixed(1)}M)`,
                    "Coverage Rate",
                  ]}
                />
                <Bar dataKey="coverageRate" fill="#14b8a6" radius={[4, 4, 0, 0]} name="Coverage Rate %" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
