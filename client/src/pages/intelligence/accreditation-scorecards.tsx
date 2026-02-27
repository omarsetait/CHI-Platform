import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Award, Users, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, ShieldAlert,
} from "lucide-react";

interface Provider {
  id: string;
  name: string;
  city: string;
  specialty: string;
  overallScore: number;
  codingAccuracy: number;
  rejectionRate: number;
  fwaFlags: number;
  sbsCompliance: number;
  drgReady: boolean;
  trend: string;
}

interface AccreditationResponse {
  summary: {
    totalProviders: number;
    avgScore: number;
    drgReadyCount: number;
    highRiskCount: number;
    avgRejectionRate: number;
  };
  providers: Provider[];
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
  return (
    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 gap-1">
      <Minus className="h-3 w-3" /> Stable
    </Badge>
  );
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 65) return "text-amber-600";
  return "text-rose-600";
}

function scoreProgressColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 65) return "bg-amber-500";
  return "bg-rose-500";
}

export default function AccreditationScorecardsPage() {
  const { data, isLoading } = useQuery<AccreditationResponse>({
    queryKey: ["/api/intelligence/accreditation-scorecards"],
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
          <Award className="h-8 w-8 text-amber-500" />
          Accreditation Scorecards
        </h1>
        <p className="text-muted-foreground mt-1">
          Track provider performance, coding accuracy, and compliance across Saudi Arabia
        </p>
        <p className="text-sm text-violet-600 dark:text-violet-400 mt-0.5 font-medium" dir="rtl">
          بطاقات أداء الاعتماد — تقييم مقدمي الخدمات
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="py-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Providers</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-500" />
              {data?.summary.totalProviders ?? "..."}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Monitored facilities</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="py-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg Score</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              {data?.summary.avgScore?.toFixed(1) ?? "..."}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across all providers</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500 shadow-sm">
          <CardHeader className="py-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">DRG Ready</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-violet-500" />
              {data?.summary.drgReadyCount ?? "..."}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Providers meeting DRG criteria</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500 shadow-sm">
          <CardHeader className="py-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">High Risk</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-3xl font-bold flex items-center gap-2">
              <ShieldAlert className="h-6 w-6 text-rose-500" />
              {data?.summary.highRiskCount ?? "..."}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Providers requiring intervention</p>
          </CardContent>
        </Card>
      </div>

      {/* Providers Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Provider Scorecards</CardTitle>
          <CardDescription>Comprehensive overview of all monitored providers</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading provider data...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <th className="px-4 py-3 text-left rounded-tl-lg">Provider</th>
                    <th className="px-3 py-3 text-left">City</th>
                    <th className="px-3 py-3 text-left">Specialty</th>
                    <th className="px-3 py-3 text-center">Overall</th>
                    <th className="px-3 py-3 text-center">Coding Acc.</th>
                    <th className="px-3 py-3 text-center">Rejection</th>
                    <th className="px-3 py-3 text-center">FWA Flags</th>
                    <th className="px-3 py-3 text-center">SBS</th>
                    <th className="px-3 py-3 text-center">DRG</th>
                    <th className="px-3 py-3 text-center rounded-tr-lg">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.providers.map((p) => (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.id}</div>
                      </td>
                      <td className="px-3 py-3">{p.city}</td>
                      <td className="px-3 py-3 text-xs">{p.specialty}</td>
                      <td className="px-3 py-3 text-center">
                        <div className="space-y-1">
                          <span className={`font-bold ${scoreColor(p.overallScore)}`}>{p.overallScore}%</span>
                          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${scoreProgressColor(p.overallScore)}`} style={{ width: `${p.overallScore}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`font-medium ${scoreColor(p.codingAccuracy)}`}>{p.codingAccuracy}%</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`font-medium ${p.rejectionRate > 15 ? "text-rose-600" : p.rejectionRate > 10 ? "text-amber-600" : "text-emerald-600"}`}>
                          {p.rejectionRate}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <Badge variant={p.fwaFlags > 10 ? "destructive" : p.fwaFlags > 5 ? "secondary" : "outline"} className="text-xs">
                          {p.fwaFlags > 10 && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {p.fwaFlags}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className={`font-medium ${scoreColor(p.sbsCompliance)}`}>{p.sbsCompliance}%</span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        {p.drgReady ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 text-xs">Ready</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Not Ready</Badge>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <TrendBadge trend={p.trend} />
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
