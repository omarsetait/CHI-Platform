import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  HeartPulse, MessageSquare, MapPin, Star, ShieldAlert, BookOpen,
  ArrowRight, TrendingUp, AlertTriangle, Users,
} from "lucide-react";
import { Link } from "wouter";

interface ComplaintsData {
  summary: { total: number; resolved: number; pending: number; escalated: number; avgResolutionDays: number };
}

interface CoverageGapsData {
  totalUninsured: number;
  bySegment: Array<{ segment: string; count: number; risk: string }>;
}

interface ProviderQualityData {
  avgNationalRating: number;
  avgWaitTime: number;
  providers: Array<{ name: string; rating: number }>;
}

const quickLinks = [
  { label: "Complaints & Disputes", href: "/members/complaints", icon: MessageSquare, color: "text-rose-600", bg: "bg-rose-50 dark:bg-rose-950/30" },
  { label: "Coverage Gap Monitor", href: "/members/coverage-gaps", icon: MapPin, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  { label: "Provider Quality", href: "/members/provider-quality", icon: Star, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { label: "Report Fraud", href: "/members/report-fraud", icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
  { label: "Benefits Awareness", href: "/members/benefits-awareness", icon: BookOpen, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
];

export default function MembersDashboard() {
  const { data: complaints } = useQuery<ComplaintsData>({
    queryKey: ["/api/members/complaints"],
  });

  const { data: coverageGaps } = useQuery<CoverageGapsData>({
    queryKey: ["/api/members/coverage-gaps"],
  });

  const { data: providerQuality } = useQuery<ProviderQualityData>({
    queryKey: ["/api/members/provider-quality"],
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
          <HeartPulse className="h-8 w-8 text-teal-600" />
          Daman Members
        </h1>
        <p className="text-muted-foreground mt-1">
          Beneficiary protection, coverage transparency, and fraud reporting
        </p>
        <p className="text-sm text-teal-600 dark:text-teal-400 mt-0.5 font-medium" dir="rtl">
          ضمان الأعضاء — حماية المستفيدين وشفافية التغطية
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-teal-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="py-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Beneficiaries</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-500" />
              11.5M
            </div>
            <p className="text-xs text-teal-600 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" /> Insured members across KSA
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="py-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Complaints</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">
              {complaints?.summary.pending?.toLocaleString() ?? "..."}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {complaints?.summary.escalated?.toLocaleString() ?? "--"} escalated
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="py-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Coverage Gap</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">
              {coverageGaps ? `${(coverageGaps.totalUninsured / 1000000).toFixed(2)}M` : "..."}
            </div>
            <p className="text-xs text-amber-600 flex items-center mt-1">
              <AlertTriangle className="h-3 w-3 mr-1" /> Uninsured individuals
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="py-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Avg Provider Rating</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold flex items-center gap-1">
              {providerQuality?.avgNationalRating ?? "..."} <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              National average out of 5.0
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="py-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fraud Reports</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">247</div>
            <p className="text-xs text-muted-foreground mt-1">
              YTD submissions to FWA unit
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Beneficiary Services</h2>
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
        {/* Complaint Resolution */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-5 w-5 text-rose-500" />
              Complaint Resolution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                <span className="text-sm font-medium">Resolved</span>
                <span className="text-lg font-bold text-emerald-600">
                  {complaints?.summary.resolved?.toLocaleString() ?? "..."}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <span className="text-sm font-medium">Pending</span>
                <span className="text-lg font-bold text-amber-600">
                  {complaints?.summary.pending?.toLocaleString() ?? "..."}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800">
                <span className="text-sm font-medium">Escalated</span>
                <span className="text-lg font-bold text-rose-600">
                  {complaints?.summary.escalated?.toLocaleString() ?? "..."}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <span className="text-sm font-medium">Avg Resolution</span>
                <span className="text-lg font-bold text-blue-600">
                  {complaints?.summary.avgResolutionDays ?? "..."} days
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coverage Gap Snapshot */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Coverage Gap Snapshot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {coverageGaps?.bySegment.slice(0, 4).map((seg) => (
                <div key={seg.segment} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/30 transition-colors">
                  <div>
                    <span className="text-sm font-medium">{seg.segment}</span>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {(seg.count / 1000).toFixed(0)}K uninsured
                    </div>
                  </div>
                  <Badge
                    className={`text-xs ${
                      seg.risk === "critical"
                        ? "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300"
                        : seg.risk === "high"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                    }`}
                  >
                    {seg.risk}
                  </Badge>
                </div>
              )) ?? (
                <div className="text-sm text-muted-foreground text-center py-4">Loading coverage data...</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
