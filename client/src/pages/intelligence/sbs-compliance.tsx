import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";
import { FileCode, TrendingUp, AlertCircle } from "lucide-react";

interface SbsComplianceData {
  overallRate: number;
  byRegion: Array<{ region: string; rate: number; providers: number }>;
  commonIssues: Array<{ issue: string; count: number; severity: string }>;
  trend: Array<{ month: string; rate: number }>;
  generatedAt: string;
}

function severityBadge(severity: string) {
  switch (severity) {
    case "high":
      return <Badge variant="destructive" className="text-xs">High</Badge>;
    case "medium":
      return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 text-xs">Medium</Badge>;
    default:
      return <Badge variant="secondary" className="text-xs">Low</Badge>;
  }
}

export default function SbsCompliancePage() {
  const { data, isLoading } = useQuery<SbsComplianceData>({
    queryKey: ["/api/intelligence/sbs-compliance"],
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
          <FileCode className="h-8 w-8 text-blue-600" />
          SBS V3.0 Compliance
        </h1>
        <p className="text-muted-foreground mt-1">
          Saudi Billing System version 3.0 coding compliance across all regions
        </p>
        <p className="text-sm text-violet-600 dark:text-violet-400 mt-0.5 font-medium" dir="rtl">
          الامتثال لنظام الفوترة السعودي — الإصدار 3.0
        </p>
      </div>

      {/* Overall Compliance Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Overall Compliance Rate</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/30" />
                <circle
                  cx="60" cy="60" r="50" fill="none"
                  stroke="url(#complianceGradient)" strokeWidth="10"
                  strokeDasharray={`${(data?.overallRate ?? 0) * 3.14} 314`}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="complianceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-primary">{data?.overallRate ?? "..."}%</span>
                <span className="text-xs text-muted-foreground">compliant</span>
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-sm text-emerald-600">
              <TrendingUp className="h-4 w-4" />
              <span>+21 pts since Oct 2025</span>
            </div>
          </CardContent>
        </Card>

        {/* Compliance by Region Chart */}
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Compliance by Region</CardTitle>
            <CardDescription>SBS V3.0 adoption rate across Saudi regions</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.byRegion} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis dataKey="region" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    formatter={(value: number, _name: string, props: any) => [`${value}% (${props.payload.providers} providers)`, "Compliance"]}
                  />
                  <Bar dataKey="rate" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Common Issues */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Common Compliance Issues
            </CardTitle>
            <CardDescription>Top coding issues identified across providers</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-3">
                {data?.commonIssues.map((issue, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{issue.issue}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{issue.count} occurrences</div>
                    </div>
                    <div className="ml-3">{severityBadge(issue.severity)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compliance Trend */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Compliance Trend</CardTitle>
            <CardDescription>Monthly SBS V3.0 compliance rate improvement</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.trend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    formatter={(value: number) => [`${value}%`, "Compliance Rate"]}
                  />
                  <Line type="monotone" dataKey="rate" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: "#8b5cf6", r: 5 }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
