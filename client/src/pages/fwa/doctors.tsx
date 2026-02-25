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

function getRiskLevelBadgeClasses(level: string | null) {
  switch (level) {
    case "critical":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    case "high":
      return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
    case "medium":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    case "low":
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
  }
}

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

function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "$0.00";
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount);
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

function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  isLoading,
}: {
  title: string;
  value: number | string;
  description: string;
  icon: React.ElementType;
  isLoading?: boolean;
}) {
  return (
    <Card data-testid={`stats-card-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="h-9 w-24" />
            ) : (
              <p className="text-3xl font-bold">{value}</p>
            )}
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <Icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
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
        className="w-full sm:max-w-lg border-l-purple-300 dark:border-l-purple-800"
        data-testid="sheet-doctor-detail"
      >
        <SheetHeader className="pb-4 border-b border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <SheetTitle className="text-purple-700 dark:text-purple-300">
              Doctor Details
            </SheetTitle>
          </div>
          <SheetDescription>
            Review doctor risk profile and metrics
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] pr-4">
          <div className="py-4 space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Doctor Summary
              </h3>
              <Card className="border-purple-200 dark:border-purple-800">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <Stethoscope className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-semibold" data-testid="text-doctor-name">
                        {doctor.doctorName}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid="text-doctor-id">
                        ID: {doctor.doctorId}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Specialty</p>
                        <p className="text-sm font-medium" data-testid="text-specialty">
                          {doctor.specialty || "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">License</p>
                        <p className="text-sm font-medium" data-testid="text-license">
                          {doctor.licenseNumber || "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Organization</p>
                        <p className="text-sm font-medium" data-testid="text-organization">
                          {doctor.organization || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Risk Metrics
              </h3>
              <Card className="border-purple-200 dark:border-purple-800">
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Risk Score</span>
                      <span className="text-sm font-semibold" data-testid="text-risk-score">
                        {riskScore.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={riskScore} className="h-2" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Risk Level</span>
                    <Badge
                      variant="outline"
                      className={getRiskLevelBadgeClasses(doctor.riskLevel)}
                      data-testid="badge-risk-level"
                    >
                      {doctor.riskLevel || "unknown"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Claim Statistics
              </h3>
              <Card className="border-purple-200 dark:border-purple-800">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Total Claims</p>
                      <div className="flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-lg font-semibold" data-testid="text-total-claims">
                          {doctor.totalClaims || 0}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Flagged Claims</p>
                      <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        <span className="text-lg font-semibold" data-testid="text-flagged-claims">
                          {doctor.flaggedClaims || 0}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Avg Claim Amount</p>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-lg font-semibold" data-testid="text-avg-amount">
                          {formatCurrency(avgClaimAmount)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Total Exposure</p>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span className="text-lg font-semibold" data-testid="text-total-exposure">
                          {formatCurrency(totalExposure)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">IC Cases</p>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span className="text-lg font-semibold" data-testid="text-fwa-cases">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Doctors"
          value={stats.totalDoctors}
          description="Doctors in system"
          icon={Users}
          isLoading={isLoading}
        />
        <StatsCard
          title="High Risk"
          value={stats.highRiskCount}
          description="Critical & high risk"
          icon={AlertTriangle}
          isLoading={isLoading}
        />
        <StatsCard
          title="Total Exposure"
          value={formatCurrency(stats.totalExposure)}
          description="Combined exposure amount"
          icon={DollarSign}
          isLoading={isLoading}
        />
        <StatsCard
          title="Active Cases"
          value={stats.activeCases}
          description="Open FWA cases"
          icon={FileText}
          isLoading={isLoading}
        />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by doctor name or license..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={riskLevelFilter} onValueChange={setRiskLevelFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-risk-level">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-specialty">
                <SelectValue placeholder="Specialty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specialties</SelectItem>
                {specialties.map((specialty) => (
                  <SelectItem key={specialty} value={specialty}>
                    {specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as "risk_score" | "exposure")}>
              <SelectTrigger className="w-[160px]" data-testid="select-sort">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="risk_score">Risk Score</SelectItem>
                <SelectItem value="exposure">Exposure</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doctor</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead>License</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Reasons</TableHead>
                <TableHead className="text-right">Claims</TableHead>
                <TableHead className="text-right">Flagged</TableHead>
                <TableHead className="text-right">IC Cases</TableHead>
                <TableHead className="text-right">Avg Claim</TableHead>
                <TableHead className="text-right">Exposure</TableHead>
                <TableHead>Last Flagged</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
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
                      className="cursor-pointer hover-elevate"
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
