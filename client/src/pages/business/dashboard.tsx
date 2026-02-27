import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2, ShieldCheck, Landmark, GitMerge, Users, PiggyBank,
  ArrowRight, TrendingUp, TrendingDown, AlertTriangle,
} from "lucide-react";
import { Link } from "wouter";

interface ComplianceData {
  summary: { totalEmployers: number; complianceRate: number; violated: number; totalFinesYTD: number };
}

interface InsurerHealthData {
  insurers: Array<{ name: string; lossRatio: number }>;
}

interface ConcentrationData {
  herfindahlIndex: number;
  interpretation: string;
}

interface CoverageData {
  current: { covered: number; target: number; progress: number };
}

interface CostData {
  adminCostRatio: number;
  oecdBenchmark: number;
}

const quickLinks = [
  { label: "Employer Compliance", href: "/business/employer-compliance", icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { label: "Insurer Health Monitor", href: "/business/insurer-health", icon: Landmark, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { label: "Market Concentration", href: "/business/market-concentration", icon: GitMerge, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
  { label: "Coverage Expansion", href: "/business/coverage-expansion", icon: Users, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  { label: "Cost Containment", href: "/business/cost-containment", icon: PiggyBank, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/30" },
];

export default function BusinessDashboard() {
  const { data: compliance } = useQuery<ComplianceData>({
    queryKey: ["/api/business/employer-compliance"],
  });

  const { data: insurerHealth } = useQuery<InsurerHealthData>({
    queryKey: ["/api/business/insurer-health"],
  });

  const { data: concentration } = useQuery<ConcentrationData>({
    queryKey: ["/api/business/market-concentration"],
  });

  const { data: coverage } = useQuery<CoverageData>({
    queryKey: ["/api/business/coverage-expansion"],
  });

  const { data: cost } = useQuery<CostData>({
    queryKey: ["/api/business/cost-containment"],
  });

  const avgLossRatio = insurerHealth?.insurers
    ? (insurerHealth.insurers.reduce((sum, i) => sum + i.lossRatio, 0) / insurerHealth.insurers.length).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
          <Building2 className="h-8 w-8 text-sky-600" />
          Daman Business
        </h1>
        <p className="text-muted-foreground mt-1">
          Market oversight, employer compliance, and cost intelligence
        </p>
        <p className="text-sm text-sky-600 dark:text-sky-400 mt-0.5 font-medium" dir="rtl">
          ضمان الأعمال — الرقابة على السوق وأصحاب العمل
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="py-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Compliance Rate</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{compliance?.summary.complianceRate ?? "..."}%</div>
            <p className="text-xs text-emerald-600 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" /> {(compliance?.summary.totalEmployers ?? 0).toLocaleString()} employers tracked
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="py-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg Loss Ratio</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{avgLossRatio ?? "..."}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {insurerHealth?.insurers.length ?? "--"} insurers
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="py-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">HHI Index</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{concentration?.herfindahlIndex ?? "..."}</div>
            <p className="text-xs text-amber-600 flex items-center mt-1">
              <AlertTriangle className="h-3 w-3 mr-1" /> Moderately concentrated
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="py-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Coverage Progress</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">
              {coverage ? `${(coverage.current.covered / 1000000).toFixed(1)}M` : "..."}
              <span className="text-sm font-normal text-muted-foreground"> / 25M</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {coverage?.current.progress ?? "--"}% toward Vision 2030
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="py-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Admin Cost Ratio</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{cost?.adminCostRatio ?? "..."}%</div>
            <p className="text-xs text-rose-500 flex items-center mt-1">
              <TrendingDown className="h-3 w-3 mr-1" /> OECD benchmark: {cost?.oecdBenchmark ?? "--"}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Market Oversight Modules</h2>
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
        {/* Compliance Violations */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Compliance Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                <span className="text-sm font-medium">Compliant Employers</span>
                <span className="text-lg font-bold text-emerald-600">
                  {compliance ? (compliance.summary.totalEmployers - compliance.summary.violated).toLocaleString() : "..."}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800">
                <span className="text-sm font-medium">Violated</span>
                <span className="text-lg font-bold text-rose-600">
                  {compliance?.summary.violated?.toLocaleString() ?? "..."}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <span className="text-sm font-medium">Fines Collected YTD</span>
                <span className="text-lg font-bold text-amber-600">
                  {compliance ? `${(compliance.summary.totalFinesYTD / 1000000).toFixed(1)}M SAR` : "..."}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Market Health */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-5 w-5 text-blue-500" />
              Market Health Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insurerHealth?.insurers.slice(0, 4).map((insurer) => (
                <div key={insurer.name} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors">
                  <div>
                    <span className="text-sm font-medium">{insurer.name}</span>
                    <div className="text-xs text-muted-foreground mt-0.5">Loss Ratio: {insurer.lossRatio}%</div>
                  </div>
                  <Badge
                    className={`text-xs ${
                      insurer.lossRatio >= 85
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300"
                        : insurer.lossRatio >= 75
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                    }`}
                  >
                    {insurer.lossRatio >= 85 ? "At Risk" : insurer.lossRatio >= 75 ? "Watch" : "Healthy"}
                  </Badge>
                </div>
              )) ?? (
                <div className="text-sm text-muted-foreground text-center py-4">Loading insurers...</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
