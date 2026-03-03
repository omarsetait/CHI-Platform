import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { BarChart as BarChartIcon, TrendingDown, AlertTriangle } from "lucide-react";

interface RejectionPatternsData {
  overallRate: number;
  bySpecialty: Array<{ specialty: string; rate: number; claims: number }>;
  byInsurer: Array<{ insurer: string; rate: number; claims: number }>;
  byRegion: Array<{ region: string; rate: number; claims: number }>;
  generatedAt: string;
}

export default function RejectionPatternsPage() {
  const { data, isLoading } = useQuery<RejectionPatternsData>({
    queryKey: ["/api/intelligence/rejection-patterns"],
  });

  const chartTooltipStyle = {
    borderRadius: "8px",
    border: "none",
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
          <BarChartIcon className="h-8 w-8 text-rose-600" />
          Rejection Patterns
        </h1>
        <p className="text-muted-foreground mt-1">
          Analyze claim rejection trends by specialty, insurer, and region
        </p>
        <p className="text-sm text-violet-600 dark:text-violet-400 mt-0.5 font-medium" dir="rtl">
          أنماط رفض المطالبات — تحليل شامل
        </p>
      </div>

      {/* Overall Rate Card */}
      <Card className="shadow-sm bg-gradient-to-r from-rose-50 to-rose-100/50 dark:from-rose-950/20 dark:to-rose-900/10 border-rose-200 dark:border-rose-800">
        <CardContent className="p-6 flex items-center gap-6">
          <div className="p-4 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
            <AlertTriangle className="h-8 w-8 text-rose-500" />
          </div>
          <div>
            <div className="text-sm font-medium text-muted-foreground">Overall Rejection Rate</div>
            <div className="text-4xl font-bold text-rose-600">{data ? `${data.overallRate}%` : <Skeleton className="h-8 w-24 inline-block" />}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <TrendingDown className="h-3 w-3" />
              Across {data ? data.bySpecialty.reduce((sum, s) => sum + s.claims, 0).toLocaleString() : <Skeleton className="h-3 w-12 inline-block" />} total claims
            </div>
          </div>
        </CardContent>
      </Card>

      {/* By Specialty */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Rejection Rate by Specialty</CardTitle>
          <CardDescription>Which specialties have the highest claim rejection rates</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.bySpecialty} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                <XAxis type="number" domain={[0, 25]} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="specialty" tick={{ fontSize: 11 }} width={120} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  formatter={(value: number, _name: string, props: any) => [
                    `${value}% (${props.payload.claims.toLocaleString()} claims)`,
                    "Rejection Rate",
                  ]}
                />
                <Bar dataKey="rate" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Insurer */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Rejection Rate by Insurer</CardTitle>
            <CardDescription>Claims rejection across major Saudi insurers</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.byInsurer} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis dataKey="insurer" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={50} />
                  <YAxis domain={[0, 25]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value: number, _name: string, props: any) => [
                      `${value}% (${props.payload.claims.toLocaleString()} claims)`,
                      "Rejection Rate",
                    ]}
                  />
                  <Bar dataKey="rate" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* By Region */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Rejection Rate by Region</CardTitle>
            <CardDescription>Geographic distribution of rejection patterns</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.byRegion} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis dataKey="region" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 25]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value: number, _name: string, props: any) => [
                      `${value}% (${props.payload.claims.toLocaleString()} claims)`,
                      "Rejection Rate",
                    ]}
                  />
                  <Bar dataKey="rate" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
