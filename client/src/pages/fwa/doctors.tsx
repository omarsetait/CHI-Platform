import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  RefreshCw,
  Users,
  AlertTriangle,
  DollarSign,
  FileText,
  ArrowUpDown,
  Stethoscope,
  TrendingUp,
  ClipboardList,
  Flag,
  BadgeCheck,
  Building2,
  Calendar,
  ChevronDown,
  Workflow,
  Shield,
  Brain,
  Tags,
  ShieldCheck,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useLocation } from "wouter";
import type { FwaHighRiskDoctor } from "@shared/schema";
import { MetricCard } from "@/components/metric-card";
import { formatCurrency } from "@/lib/format";
import { getRiskLevelBadgeClasses } from "@/lib/risk-utils";
import { METRIC_GRID } from "@/lib/grid";

interface DoctorStats {
  totalDoctors: number;
  highRiskCount: number;
  totalExposure: number;
  activeCases: number;
}

const defaultStats: DoctorStats = {
  totalDoctors: 0,
  highRiskCount: 0,
  totalExposure: 0,
  activeCases: 0,
};


function getReasonBadgeClasses(reason: string) {
  if (reason.startsWith("Coding Abuse:") || reason.startsWith("Coding FWA:")) {
    return "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800";
  } else if (reason.startsWith("Management Abuse:") || reason.startsWith("Management FWA:")) {
    return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
  } else if (reason.startsWith("Physician Abuse:") || reason.startsWith("Physician FWA:")) {
    return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
  } else if (reason.startsWith("Patient Abuse:") || reason.startsWith("Patient FWA:")) {
    return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800";
  }
  return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
}


function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}


function DoctorDetailSheet({
  doctor,
  open,
  onOpenChange,
  onReconcile,
}: {
  doctor: FwaHighRiskDoctor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReconcile: () => void;
}) {
  const [, navigate] = useLocation();
  if (!doctor) return null;

  const riskScore = doctor.riskScore ? parseFloat(doctor.riskScore as string) : 0;
  const avgClaimAmount = doctor.avgClaimAmount ? parseFloat(doctor.avgClaimAmount as string) : 0;
  const totalExposure = doctor.totalExposure ? parseFloat(doctor.totalExposure as string) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border-l border-white/20 dark:border-white/10 shadow-2xl"
        data-testid="sheet-doctor-detail"
      >
        <SheetHeader className="pb-4 border-b border-white/20 dark:border-white/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 -z-10" />
          <div className="flex items-center gap-2 relative z-10">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-200/50 dark:border-violet-800/50">
              <Stethoscope className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <SheetTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-700 to-fuchsia-700 dark:from-violet-300 dark:to-fuchsia-300">
              Doctor Details
            </SheetTitle>
          </div>
          <SheetDescription className="relative z-10 mt-2">
            Review doctor risk profile and metrics
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] pr-4">
          <div className="py-4 space-y-6">
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-2">
                Doctor Summary
              </h3>
              <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur border-white/20 dark:border-white/10 shadow-sm">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-lg leading-tight" data-testid="text-doctor-name">
                        {doctor.doctorName}
                      </p>
                      <p className="text-sm text-muted-foreground font-mono mt-0.5" data-testid="text-doctor-id">
                        {doctor.doctorId}
                      </p>
                    </div>
                  </div>
                  <Separator className="bg-white/20 dark:bg-white/10" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/50 p-2 rounded-lg border border-white/10 dark:border-white/5">
                      <Stethoscope className="w-4 h-4 text-violet-500" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Specialty</p>
                        <p className="text-sm font-medium" data-testid="text-specialty">
                          {doctor.specialty || "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/50 p-2 rounded-lg border border-white/10 dark:border-white/5">
                      <BadgeCheck className="w-4 h-4 text-fuchsia-500" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">License</p>
                        <p className="text-sm font-medium" data-testid="text-license">
                          {doctor.licenseNumber || "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 col-span-2 bg-slate-50/50 dark:bg-slate-800/50 p-2 rounded-lg border border-white/10 dark:border-white/5">
                      <Building2 className="w-4 h-4 text-indigo-500" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Organization</p>
                        <p className="text-sm font-medium truncate max-w-full" data-testid="text-organization">
                          {doctor.organization || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-2">
                Risk Metrics
              </h3>
              <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur border-white/20 dark:border-white/10 shadow-sm relative overflow-hidden">
                <div className="absolute left-0 bottom-0 w-32 h-32 bg-fuchsia-500/10 blur-3xl -z-10 rounded-full" />
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Risk Score</span>
                      <span className={`text-lg font-bold ${riskScore > 75 ? 'text-red-500' : riskScore > 50 ? 'text-orange-500' : 'text-green-500'}`} data-testid="text-risk-score">
                        {riskScore.toFixed(0)}%
                      </span>
                    </div>
                    <Progress
                      value={riskScore}
                      className="h-2 bg-slate-200 dark:bg-slate-700 [&>div]:bg-current"
                      style={{ color: riskScore > 75 ? '#ef4444' : riskScore > 50 ? '#f97316' : '#22c55e' } as React.CSSProperties}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Risk Level</span>
                    <Badge
                      variant="outline"
                      className={`${getRiskLevelBadgeClasses(doctor.riskLevel)} shadow-sm uppercase tracking-wider text-[10px]`}
                      data-testid="badge-risk-level"
                    >
                      {doctor.riskLevel || "unknown"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-2">
                Claim Statistics
              </h3>
              <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur border-white/20 dark:border-white/10 shadow-sm">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 bg-white/40 dark:bg-slate-800/40 p-2.5 rounded-xl border border-white/10 dark:border-white/5 hover:border-violet-300 dark:hover:border-violet-700 transition-colors">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Claims</p>
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-violet-500" />
                        <span className="text-lg font-bold" data-testid="text-total-claims">
                          {doctor.totalClaims?.toLocaleString() || 0}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1 bg-white/40 dark:bg-slate-800/40 p-2.5 rounded-xl border border-white/10 dark:border-white/5 hover:border-orange-300 dark:hover:border-orange-700 transition-colors">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Flagged Claims</p>
                      <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4 text-orange-500" />
                        <span className="text-lg font-bold" data-testid="text-flagged-claims">
                          {doctor.flaggedClaims?.toLocaleString() || 0}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1 bg-white/40 dark:bg-slate-800/40 p-2.5 rounded-xl border border-white/10 dark:border-white/5 hover:border-fuchsia-300 dark:hover:border-fuchsia-700 transition-colors">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Avg Claim Amount</p>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-fuchsia-500" />
                        <span className="text-lg font-bold" data-testid="text-avg-amount">
                          {formatCurrency(avgClaimAmount)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1 bg-white/40 dark:bg-slate-800/40 p-2.5 rounded-xl border border-red-200/50 dark:border-red-900/30 hover:border-red-300 dark:hover:border-red-700 transition-colors">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Exposure</p>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-red-500" />
                        <span className="text-lg font-bold text-red-600 dark:text-red-400" data-testid="text-total-exposure">
                          {formatCurrency(totalExposure)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1 bg-white/40 dark:bg-slate-800/40 p-2.5 rounded-xl border border-white/10 dark:border-white/5 hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">IC Cases</p>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-500" />
                        <span className="text-lg font-bold" data-testid="text-fwa-cases">
                          {doctor.fwaCaseCount || 0}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Last Flagged</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium" data-testid="text-last-flagged">
                          {formatDate(doctor.lastFlaggedDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={onReconcile}
                  data-testid="button-reconcile"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Reconcile
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full" data-testid="button-agent-workflow">
                      <Workflow className="w-4 h-4 mr-2" />
                      Agent Workflow
                      <ChevronDown className="w-4 h-4 ml-auto" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuItem
                      onClick={() => navigate(`/fwa/agent-workflow?entityId=${doctor.doctorId}&entityType=doctor&entityName=${encodeURIComponent(doctor.doctorName)}&phase=A1`)}
                      data-testid="menu-item-phase-a1"
                    >
                      <Brain className="w-4 h-4 mr-2" />
                      Analysis & Intelligence
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate(`/fwa/agent-workflow?entityId=${doctor.doctorId}&entityType=doctor&entityName=${encodeURIComponent(doctor.doctorName)}&phase=A2`)}
                      data-testid="menu-item-phase-a2"
                    >
                      <Tags className="w-4 h-4 mr-2" />
                      FWA Categorization
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate(`/fwa/agent-workflow?entityId=${doctor.doctorId}&entityType=doctor&entityName=${encodeURIComponent(doctor.doctorName)}&phase=A3`)}
                      data-testid="menu-item-phase-a3"
                    >
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Prospective Actions
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" className="w-full" data-testid="button-see-all-claims">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  See All Claims
                </Button>
                <Button variant="outline" className="w-full" data-testid="button-fwa-claims">
                  <FileText className="w-4 h-4 mr-2" />
                  FWA Claims
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export default function FWADoctors() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [riskLevelFilter, setRiskLevelFilter] = useState("all");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"risk_score" | "exposure">("risk_score");
  const [selectedDoctor, setSelectedDoctor] = useState<FwaHighRiskDoctor | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  const { data: doctors, isLoading, refetch } = useQuery<FwaHighRiskDoctor[]>({
    queryKey: ["/api/fwa/high-risk-doctors"],
  });

  const doctorsList = doctors || [];

  const specialties = Array.from(new Set(doctorsList.map((d) => d.specialty).filter(Boolean))) as string[];

  const filteredDoctors = doctorsList
    .filter((d) => {
      const matchesSearch =
        d.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.doctorId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.licenseNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesRiskLevel =
        riskLevelFilter === "all" || d.riskLevel === riskLevelFilter;
      const matchesSpecialty =
        specialtyFilter === "all" || d.specialty === specialtyFilter;
      return matchesSearch && matchesRiskLevel && matchesSpecialty;
    })
    .sort((a, b) => {
      if (sortBy === "risk_score") {
        const scoreA = a.riskScore ? parseFloat(a.riskScore as string) : 0;
        const scoreB = b.riskScore ? parseFloat(b.riskScore as string) : 0;
        return scoreB - scoreA;
      } else {
        const expA = a.totalExposure ? parseFloat(a.totalExposure as string) : 0;
        const expB = b.totalExposure ? parseFloat(b.totalExposure as string) : 0;
        return expB - expA;
      }
    });

  const stats: DoctorStats = {
    totalDoctors: doctorsList.length,
    highRiskCount: doctorsList.filter(
      (d) => d.riskLevel === "critical" || d.riskLevel === "high"
    ).length,
    totalExposure: doctorsList.reduce(
      (sum, d) => sum + (d.totalExposure ? parseFloat(d.totalExposure as string) : 0),
      0
    ),
    activeCases: doctorsList.reduce((sum, d) => sum + (d.fwaCaseCount || 0), 0),
  };

  const handleRowClick = (doctor: FwaHighRiskDoctor) => {
    setSelectedDoctor(doctor);
    setDetailSheetOpen(true);
  };

  const handleReconcile = () => {
    if (selectedDoctor) {
      setDetailSheetOpen(false);
      navigate(`/fwa/reconciliation-findings?entityId=${selectedDoctor.doctorId}&entityType=doctor&entityName=${encodeURIComponent(selectedDoctor.doctorName)}`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">
            High-Risk Doctors
          </h1>
          <p className="text-muted-foreground">
            Monitor doctors flagged for potential fraud, waste, or abuse
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          data-testid="button-refresh"
          onClick={() => refetch()}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className={METRIC_GRID}>
        <MetricCard
          title="Total Doctors"
          value={String(stats.totalDoctors)}
          subtitle="Doctors in system"
          icon={Users}
          loading={isLoading}
        />
        <MetricCard
          title="High Risk"
          value={String(stats.highRiskCount)}
          subtitle="Critical & high risk"
          icon={AlertTriangle}
          loading={isLoading}
        />
        <MetricCard
          title="Total Exposure"
          value={formatCurrency(stats.totalExposure)}
          subtitle="Combined exposure amount"
          icon={DollarSign}
          loading={isLoading}
        />
        <MetricCard
          title="Active Cases"
          value={String(stats.activeCases)}
          subtitle="Open FWA cases"
          icon={FileText}
          loading={isLoading}
        />
      </div>

      <Card className="bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-lg">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-violet-500/70" />
              <Input
                placeholder="Search by doctor name or license..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white/50 dark:bg-slate-900/50 border-white/20 dark:border-white/10 focus-visible:ring-violet-500/50 transition-all rounded-xl"
                data-testid="input-search"
              />
            </div>
            <Select value={riskLevelFilter} onValueChange={setRiskLevelFilter}>
              <SelectTrigger className="w-[160px] bg-white/50 dark:bg-slate-900/50 border-white/20 dark:border-white/10 focus:ring-violet-500/50 transition-all rounded-xl" data-testid="select-risk-level">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-white/20 dark:border-white/10">
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
              <SelectTrigger className="w-[180px] bg-white/50 dark:bg-slate-900/50 border-white/20 dark:border-white/10 focus:ring-violet-500/50 transition-all rounded-xl" data-testid="select-specialty">
                <SelectValue placeholder="Specialty" />
              </SelectTrigger>
              <SelectContent className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-white/20 dark:border-white/10">
                <SelectItem value="all">All Specialties</SelectItem>
                {specialties.map((specialty) => (
                  <SelectItem key={specialty} value={specialty}>
                    {specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as "risk_score" | "exposure")}>
              <SelectTrigger className="w-[160px] bg-white/50 dark:bg-slate-900/50 border-white/20 dark:border-white/10 focus:ring-violet-500/50 transition-all rounded-xl" data-testid="select-sort">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-white/20 dark:border-white/10">
                <SelectItem value="risk_score">Risk Score</SelectItem>
                <SelectItem value="exposure">Exposure</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-lg overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-violet-50/50 dark:bg-violet-900/20 border-b border-white/20 dark:border-white/10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-semibold text-violet-900 dark:text-violet-100">Doctor</TableHead>
                <TableHead className="font-semibold text-violet-900 dark:text-violet-100">Specialty</TableHead>
                <TableHead className="font-semibold text-violet-900 dark:text-violet-100">License</TableHead>
                <TableHead className="font-semibold text-violet-900 dark:text-violet-100">Organization</TableHead>
                <TableHead className="font-semibold text-violet-900 dark:text-violet-100">Risk Score</TableHead>
                <TableHead className="font-semibold text-violet-900 dark:text-violet-100">Risk Level</TableHead>
                <TableHead className="font-semibold text-violet-900 dark:text-violet-100">Reasons</TableHead>
                <TableHead className="text-right font-semibold text-violet-900 dark:text-violet-100">Claims</TableHead>
                <TableHead className="text-right font-semibold text-violet-900 dark:text-violet-100">Flagged</TableHead>
                <TableHead className="text-right font-semibold text-violet-900 dark:text-violet-100">IC Cases</TableHead>
                <TableHead className="text-right font-semibold text-violet-900 dark:text-violet-100">Avg Claim</TableHead>
                <TableHead className="text-right font-semibold text-violet-900 dark:text-violet-100">Exposure</TableHead>
                <TableHead className="font-semibold text-violet-900 dark:text-violet-100">Last Flagged</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx} className="border-b border-white/10">
                    <TableCell>
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32 bg-violet-100 dark:bg-violet-900/20" />
                        <Skeleton className="h-3 w-20 bg-violet-100 dark:bg-violet-900/20" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-24 bg-violet-100 dark:bg-violet-900/20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20 bg-violet-100 dark:bg-violet-900/20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28 bg-violet-100 dark:bg-violet-900/20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 bg-violet-100 dark:bg-violet-900/20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 bg-violet-100 dark:bg-violet-900/20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32 bg-violet-100 dark:bg-violet-900/20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 bg-violet-100 dark:bg-violet-900/20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12 bg-violet-100 dark:bg-violet-900/20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8 bg-violet-100 dark:bg-violet-900/20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 bg-violet-100 dark:bg-violet-900/20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20 bg-violet-100 dark:bg-violet-900/20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20 bg-violet-100 dark:bg-violet-900/20" /></TableCell>
                  </TableRow>
                ))
              ) : filteredDoctors.length > 0 ? (
                filteredDoctors.map((doctor) => {
                  const riskScore = doctor.riskScore
                    ? parseFloat(doctor.riskScore as string)
                    : 0;
                  const exposure = doctor.totalExposure
                    ? parseFloat(doctor.totalExposure as string)
                    : 0;
                  const avgClaim = doctor.avgClaimAmount
                    ? parseFloat(doctor.avgClaimAmount as string)
                    : 0;

                  return (
                    <TableRow
                      key={doctor.id}
                      className="cursor-pointer hover-elevate border-b border-white/10 dark:border-white/5 transition-all duration-200"
                      onClick={() => handleRowClick(doctor)}
                      data-testid={`row-doctor-${doctor.doctorId}`}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium" data-testid={`text-name-${doctor.doctorId}`}>
                            {doctor.doctorName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {doctor.doctorId}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-specialty-${doctor.doctorId}`}>
                        {doctor.specialty || "-"}
                      </TableCell>
                      <TableCell data-testid={`text-license-${doctor.doctorId}`}>
                        {doctor.licenseNumber || "-"}
                      </TableCell>
                      <TableCell data-testid={`text-org-${doctor.doctorId}`}>
                        {doctor.organization || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={riskScore} className="h-2 w-16" />
                          <span
                            className="text-sm font-medium"
                            data-testid={`text-score-${doctor.doctorId}`}
                          >
                            {riskScore.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getRiskLevelBadgeClasses(doctor.riskLevel)}
                          data-testid={`badge-level-${doctor.doctorId}`}
                        >
                          {doctor.riskLevel || "unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-reasons-${doctor.doctorId}`}>
                        {doctor.reasons && doctor.reasons.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {doctor.reasons.slice(0, 2).map((reason, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className={`text-xs ${getReasonBadgeClasses(reason)}`}
                              >
                                {reason.split(": ")[1] || reason}
                              </Badge>
                            ))}
                            {doctor.reasons.length > 2 && (
                              <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                +{doctor.reasons.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">None detected</span>
                        )}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        data-testid={`text-claims-${doctor.doctorId}`}
                      >
                        {doctor.totalClaims || 0}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        data-testid={`text-flagged-${doctor.doctorId}`}
                      >
                        {doctor.flaggedClaims || 0}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        data-testid={`text-fwa-${doctor.doctorId}`}
                      >
                        {doctor.fwaCaseCount || 0}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        data-testid={`text-avg-${doctor.doctorId}`}
                      >
                        {formatCurrency(avgClaim)}
                      </TableCell>
                      <TableCell
                        className="text-right font-medium"
                        data-testid={`text-exposure-${doctor.doctorId}`}
                      >
                        {formatCurrency(exposure)}
                      </TableCell>
                      <TableCell
                        className="text-sm text-muted-foreground"
                        data-testid={`text-last-flagged-${doctor.doctorId}`}
                      >
                        {formatDate(doctor.lastFlaggedDate)}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={13} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Stethoscope className="w-10 h-10 mb-2 text-purple-400" />
                      <p>No doctors found matching your criteria</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DoctorDetailSheet
        doctor={selectedDoctor}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onReconcile={handleReconcile}
      />
    </div>
  );
}
