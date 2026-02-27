import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { ShieldCheck, Users, AlertTriangle, DollarSign } from "lucide-react";

interface EmployerComplianceData {
  summary: {
    totalEmployers: number;
    complianceRate: number;
    violated: number;
    totalFinesYTD: number;
  };
  bySector: Array<{ sector: string; complianceRate: number; employers: number }>;
  recentViolations: Array<{
    employer: string;
    sector: string;
    violation: string;
    fineAmount: number;
    date: string;
  }>;
  generatedAt: string;
}

export default function EmployerCompliancePage() {
  const { data, isLoading } = useQuery<EmployerComplianceData>({
    queryKey: ["/api/business/employer-compliance"],
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-emerald-600" />
          Employer Compliance
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor employer health insurance compliance across Saudi Arabia
        </p>
        <p className="text-sm text-sky-600 dark:text-sky-400 mt-0.5 font-medium" dir="rtl">
          امتثال أصحاب العمل — التأمين الصحي الإلزامي
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="py-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Employers</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-500" />
              {data?.summary.totalEmployers?.toLocaleString() ?? "..."}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Registered entities</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="py-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Compliance Rate</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-emerald-500" />
              {data?.summary.complianceRate ?? "..."}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Meeting CHI requirements</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500 shadow-sm">
          <CardHeader className="py-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Violated</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-rose-500" />
              {data?.summary.violated?.toLocaleString() ?? "..."}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Non-compliant employers</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="py-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fines YTD</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-amber-500" />
              {data ? `${(data.summary.totalFinesYTD / 1000000).toFixed(1)}M` : "..."} <span className="text-sm font-normal text-muted-foreground">SAR</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Penalties collected in 2026</p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance by Sector */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Compliance Rate by Sector</CardTitle>
          <CardDescription>Employer insurance compliance breakdown across economic sectors</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.bySector} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                <XAxis dataKey="sector" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  formatter={(value: number, _name: string, props: any) => [
                    `${value}% (${props.payload.employers?.toLocaleString()} employers)`,
                    "Compliance",
                  ]}
                />
                <Bar dataKey="complianceRate" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Recent Violations Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-rose-500" />
            Recent Violations
          </CardTitle>
          <CardDescription>Latest enforcement actions against non-compliant employers</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading violations...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <th className="px-4 py-3 text-left rounded-tl-lg">Employer</th>
                    <th className="px-3 py-3 text-left">Sector</th>
                    <th className="px-3 py-3 text-left">Violation</th>
                    <th className="px-3 py-3 text-right">Fine (SAR)</th>
                    <th className="px-3 py-3 text-left rounded-tr-lg">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.recentViolations.map((v, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{v.employer}</td>
                      <td className="px-3 py-3">
                        <Badge variant="secondary" className="text-xs">{v.sector}</Badge>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{v.violation}</td>
                      <td className="px-3 py-3 text-right font-bold text-rose-600">
                        {v.fineAmount.toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{v.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
