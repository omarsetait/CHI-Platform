import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain, Award, FileCode, Activity, BarChart, ClipboardCheck,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, ArrowRight,
} from "lucide-react";
import { Link } from "wouter";

interface AccreditationData {
  summary: { totalProviders: number; avgScore: number; drgReadyCount: number; highRiskCount: number; avgRejectionRate: number };
  providers: Array<{ id: string; name: string; overallScore: number; trend: string }>;
}

interface SbsData {
  overallRate: number;
  byRegion: Array<{ region: string; rate: number }>;
}

interface DrgData {
  overall: { ready: number; inProgress: number; notStarted: number };
}

interface RejectionData {
  overallRate: number;
  bySpecialty: Array<{ specialty: string; rate: number }>;
}

interface DocQualityData {
  overallIndex: number;
  impact: { revenueAtRisk: number; drgDowngrades: number; preventableRejections: number };
}

const quickLinks = [
  { label: "Accreditation Scorecards", href: "/intelligence/accreditation-scorecards", icon: Award, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  { label: "SBS V3.0 Compliance", href: "/intelligence/sbs-compliance", icon: FileCode, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { label: "DRG Readiness", href: "/intelligence/drg-readiness", icon: Activity, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { label: "Rejection Patterns", href: "/intelligence/rejection-patterns", icon: BarChart, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/30" },
  { label: "Documentation Quality", href: "/intelligence/documentation-quality", icon: ClipboardCheck, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
];

export default function IntelligenceDashboard() {
  const { data: accreditation } = useQuery<AccreditationData>({
    queryKey: ["/api/intelligence/accreditation-scorecards"],
  });

  const { data: sbs } = useQuery<SbsData>({
    queryKey: ["/api/intelligence/sbs-compliance"],
  });

  const { data: drg } = useQuery<DrgData>({
    queryKey: ["/api/intelligence/drg-readiness"],
  });

  const { data: rejections } = useQuery<RejectionData>({
    queryKey: ["/api/intelligence/rejection-patterns"],
  });

  const { data: docQuality } = useQuery<DocQualityData>({
    queryKey: ["/api/intelligence/documentation-quality"],
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
          <Brain className="h-8 w-8 text-violet-600" />
          Daman Intelligence
        </h1>
        <p className="text-muted-foreground mt-1">
          Provider oversight, coding compliance, and DRG readiness
        </p>
        <p className="text-sm text-violet-600 dark:text-violet-400 mt-0.5 font-medium" dir="rtl">
          ذكاء ضمان — الرقابة على مقدمي الخدمات الصحية
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="py-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Providers Tracked</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{accreditation?.summary.totalProviders ?? "..."}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Avg Score: {accreditation?.summary.avgScore?.toFixed(1) ?? "--"}%
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="py-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">SBS V3.0 Compliance</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{sbs?.overallRate ?? "..."}%</div>
            <p className="text-xs text-blue-600 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" /> Up from 41% in Oct
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="py-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">DRG Ready</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{drg?.overall.ready ?? "..."}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {drg?.overall.inProgress ?? "--"}% in progress
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="py-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rejection Rate</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{rejections?.overallRate ?? "..."}%</div>
            <p className="text-xs text-rose-500 flex items-center mt-1">
              <TrendingDown className="h-3 w-3 mr-1" /> Highest in Internal Med
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="py-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Doc Quality Index</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{docQuality?.overallIndex ?? "..."}/100</div>
            <p className="text-xs text-muted-foreground mt-1">
              {docQuality?.impact.preventableRejections?.toLocaleString() ?? "--"} preventable rejections
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Provider Oversight Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Card className="cursor-pointer hover:shadow-md transition-all hover:scale-[1.02] border border-border/50">
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className={`p-3 rounded-xl ${link.bg}`}>
                    <link.icon className={`h-6 w-6 ${link.color}`} />
                  </div>
                  <span className="text-sm font-medium">{link.label}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Highlights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* High Risk Providers */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Providers Requiring Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {accreditation?.providers
                .filter((p) => p.overallScore < 70)
                .slice(0, 4)
                .map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors">
                    <div>
                      <span className="text-sm font-medium">{p.name}</span>
                      <div className="text-xs text-muted-foreground mt-0.5">Score: {p.overallScore}%</div>
                    </div>
                    <Badge variant={p.trend === "declining" ? "destructive" : "secondary"} className="text-xs">
                      {p.trend === "declining" ? (
                        <><TrendingDown className="h-3 w-3 mr-1" /> Declining</>
                      ) : (
                        p.trend
                      )}
                    </Badge>
                  </div>
                )) ?? (
                <div className="text-sm text-muted-foreground text-center py-4">Loading providers...</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Impact Summary */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Quality Impact Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800">
                <span className="text-sm font-medium">Revenue at Risk</span>
                <span className="text-lg font-bold text-rose-600">
                  {docQuality?.impact.revenueAtRisk
                    ? `${(docQuality.impact.revenueAtRisk / 1000000).toFixed(1)}M SAR`
                    : "..."}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <span className="text-sm font-medium">DRG Downgrades</span>
                <span className="text-lg font-bold text-amber-600">
                  {docQuality?.impact.drgDowngrades?.toLocaleString() ?? "..."}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800">
                <span className="text-sm font-medium">Preventable Rejections</span>
                <span className="text-lg font-bold text-violet-600">
                  {docQuality?.impact.preventableRejections?.toLocaleString() ?? "..."}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <span className="text-sm font-medium">SBS Compliance Gap</span>
                <span className="text-lg font-bold text-blue-600">
                  {sbs ? `${100 - sbs.overallRate}%` : "..."}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
