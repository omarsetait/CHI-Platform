import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { MessageSquare, CheckCircle2, Clock, AlertTriangle, CalendarDays } from "lucide-react";

interface ComplaintsData {
  summary: {
    total: number;
    resolved: number;
    pending: number;
    escalated: number;
    avgResolutionDays: number;
  };
  byType: Array<{ type: string; percent: number; count: number }>;
  topOffenders: Array<{ entity: string; complaints: number; resolutionRate: number }>;
  trend: Array<{ month: string; total: number; resolved: number }>;
  generatedAt: string;
}

const PIE_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#10b981"];

export default function ComplaintsPage() {
  const { data, isLoading } = useQuery<ComplaintsData>({
    queryKey: ["/api/members/complaints"],
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
          <MessageSquare className="h-8 w-8 text-rose-600" />
          Complaints & Disputes
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor, resolve, and analyze beneficiary complaints across the healthcare ecosystem
        </p>
        <p className="text-sm text-teal-600 dark:text-teal-400 mt-0.5 font-medium" dir="rtl">
          الشكاوى والنزاعات — حماية حقوق المستفيدين
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="py-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Complaints</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-blue-500" />
              {data?.summary.total?.toLocaleString() ?? "..."}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All-time complaints filed</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="py-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resolved</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              {data?.summary.resolved?.toLocaleString() ?? "..."}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {data ? `${((data.summary.resolved / data.summary.total) * 100).toFixed(1)}%` : "--"} resolution rate
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="py-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold flex items-center gap-2">
              <Clock className="h-6 w-6 text-amber-500" />
              {data?.summary.pending?.toLocaleString() ?? "..."}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting resolution</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500 shadow-sm">
          <CardHeader className="py-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg Resolution</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-violet-500" />
              {data?.summary.avgResolutionDays ?? "..."} <span className="text-sm font-normal text-muted-foreground">days</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Average time to close</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart by Type */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Complaints by Type</CardTitle>
            <CardDescription>Distribution of complaint categories</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.byType}
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    dataKey="percent"
                    nameKey="type"
                    label={({ type, percent }: { type: string; percent: number }) => `${type.split(' ').slice(0, 2).join(' ')} ${percent}%`}
                    labelLine={false}
                  >
                    {data?.byType.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    formatter={(value: number, _name: string, props: any) => [
                      `${value}% (${props.payload.count?.toLocaleString()} complaints)`,
                      props.payload.type,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Trend Line Chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Monthly Trend</CardTitle>
            <CardDescription>Complaint volume and resolution over 6 months</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.trend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="total" stroke="#ef4444" strokeWidth={2} name="Total Filed" dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} name="Resolved" dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Offenders Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Top Offenders
          </CardTitle>
          <CardDescription>Entities with the highest complaint volumes</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <th className="px-4 py-3 text-left rounded-tl-lg">Entity</th>
                    <th className="px-3 py-3 text-right">Complaints</th>
                    <th className="px-3 py-3 text-right">Resolution Rate</th>
                    <th className="px-3 py-3 text-left rounded-tr-lg">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.topOffenders.map((offender, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{offender.entity}</td>
                      <td className="px-3 py-3 text-right font-bold">{offender.complaints.toLocaleString()}</td>
                      <td className="px-3 py-3 text-right">
                        <span className={offender.resolutionRate < 75 ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>
                          {offender.resolutionRate}%
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <Badge
                          className={`text-xs ${
                            offender.resolutionRate < 75
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                          }`}
                        >
                          {offender.resolutionRate < 75 ? "Needs Improvement" : "Acceptable"}
                        </Badge>
                      </td>
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
