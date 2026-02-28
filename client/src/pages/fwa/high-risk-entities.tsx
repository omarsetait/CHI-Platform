import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, User, UserCog, AlertTriangle, DollarSign, TrendingUp, ExternalLink, FileText, Network } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { FwaHighRiskProvider, FwaHighRiskPatient, FwaHighRiskDoctor } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Link } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "SAR 0";
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return `SAR ${Number(numAmount).toLocaleString()}`;
}

/** Returns the color for a risk score gauge */
function getRiskScoreColor(score: number): string {
  if (score >= 85) return "#ef4444"; // red
  if (score >= 70) return "#f97316"; // orange
  if (score >= 50) return "#eab308"; // yellow
  return "#22c55e"; // green
}

/** Risk Score Gauge - a linear gauge with color coding */
function RiskScoreGauge({ score }: { score: number }) {
  const color = getRiskScoreColor(score);
  const clampedScore = Math.min(Math.max(score, 0), 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Risk Score</span>
        <span className="font-bold text-lg" style={{ color }}>{clampedScore.toFixed(1)}</span>
      </div>
      <div className="relative h-3 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
          style={{ width: `${clampedScore}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
    </div>
  );
}

/** Network visualization for the dental ring clinics */
function DentalRingNetwork({ currentProviderId }: { currentProviderId: string }) {
  const clinicLabels = ["Clinic 1", "Clinic 2", "Clinic 3", "Clinic 4"];
  // Positions for 4 circles in a diamond pattern
  const positions = [
    { cx: 100, cy: 40 },  // top
    { cx: 180, cy: 90 },  // right
    { cx: 100, cy: 140 }, // bottom
    { cx: 20, cy: 90 },   // left
  ];

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Network className="h-4 w-4 text-red-500" />
          Network Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <svg width="200" height="180" viewBox="0 0 200 180" className="mb-2">
            {/* Connection lines between all nodes */}
            {positions.map((from, i) =>
              positions.slice(i + 1).map((to, j) => (
                <line
                  key={`line-${i}-${j}`}
                  x1={from.cx}
                  y1={from.cy}
                  x2={to.cx}
                  y2={to.cy}
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeOpacity="0.4"
                  strokeDasharray="4,2"
                />
              ))
            )}
            {/* Clinic circles */}
            {positions.map((pos, i) => {
              const isCurrentClinic = currentProviderId.endsWith(`${i + 1}`);
              return (
                <g key={`clinic-${i}`}>
                  <circle
                    cx={pos.cx}
                    cy={pos.cy}
                    r={isCurrentClinic ? 22 : 18}
                    fill={isCurrentClinic ? "#fee2e2" : "#fef3c7"}
                    stroke={isCurrentClinic ? "#ef4444" : "#f59e0b"}
                    strokeWidth={isCurrentClinic ? 2.5 : 1.5}
                  />
                  <text
                    x={pos.cx}
                    y={pos.cy - 4}
                    textAnchor="middle"
                    className="text-[8px] fill-current"
                    fontWeight={isCurrentClinic ? "bold" : "normal"}
                  >
                    Clinic
                  </text>
                  <text
                    x={pos.cx}
                    y={pos.cy + 8}
                    textAnchor="middle"
                    className="text-[9px] fill-current"
                    fontWeight={isCurrentClinic ? "bold" : "normal"}
                  >
                    {i + 1}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="text-center space-y-1">
            <Badge variant="destructive" className="text-xs">
              Shared beneficial owner detected
            </Badge>
            <p className="text-xs text-muted-foreground">
              340 patients in common across 4 clinics
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Provider drill-down side panel */
function ProviderDrillDown({
  provider,
  open,
  onOpenChange,
}: {
  provider: FwaHighRiskProvider | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!provider) return null;

  const riskScore = parseFloat(provider.riskScore || "0");
  const totalClaims = provider.totalClaims || 0;
  const flaggedClaims = provider.flaggedClaims || 0;
  const flaggedPct = totalClaims > 0 ? (flaggedClaims / totalClaims) * 100 : 0;
  const denialRate = parseFloat(provider.denialRate || "0");
  const claimsPerMonth = parseFloat(provider.claimsPerMonth || "0");
  const cpmPeerAverage = parseFloat(provider.cpmPeerAverage || "0");
  const avgClaimAmount = parseFloat(provider.avgClaimAmount || "0");
  const isDentalRing = provider.providerId?.startsWith("PRV-CS1-");

  // Peer comparison data for BarChart
  const peerComparisonData = [
    {
      metric: "Claims/Mo",
      "This Provider": claimsPerMonth,
      "Peer Average": cpmPeerAverage,
    },
    {
      metric: "Denial %",
      "This Provider": denialRate,
      "Peer Average": Math.max(denialRate * 0.5, 8), // estimated peer avg for denial
    },
    {
      metric: "Avg Claim (K)",
      "This Provider": avgClaimAmount / 1000,
      "Peer Average": (avgClaimAmount * 0.7) / 1000, // estimated peer avg
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-lg w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">{provider.providerName}</SheetTitle>
          <SheetDescription className="space-y-1">
            {provider.organization && (
              <span className="block text-xs">{provider.organization}</span>
            )}
            <span className="block">
              {provider.specialty || "General"} &middot; {provider.providerType || "Facility"}
            </span>
            <span className="block font-mono text-xs">{provider.providerId}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Risk Score Gauge */}
          <RiskScoreGauge score={riskScore} />

          {/* Risk Breakdown */}
          {provider.reasons && provider.reasons.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Risk Breakdown</h4>
              <div className="flex flex-wrap gap-1.5">
                {provider.reasons.map((reason, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-xs bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                  >
                    {reason}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Key Metrics */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Key Metrics</h4>
            <div className="grid grid-cols-2 gap-3">
              {/* Claims fraction */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Flagged / Total Claims</p>
                <p className="text-sm font-semibold">{flaggedClaims} / {totalClaims}</p>
                <Progress value={flaggedPct} className="h-1.5" />
              </div>
              {/* Total Exposure */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total Exposure</p>
                <p className="text-sm font-semibold">{formatCurrency(provider.totalExposure)}</p>
              </div>
              {/* Denial Rate */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Denial Rate</p>
                <p className="text-sm font-semibold">{denialRate.toFixed(1)}%</p>
              </div>
              {/* Claims Per Month */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Claims Per Month</p>
                <p className="text-sm font-semibold">{claimsPerMonth.toFixed(1)}</p>
              </div>
            </div>
          </div>

          {/* Peer Comparison Chart */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Peer Comparison</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peerComparisonData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12 }}
                    formatter={(value: number) => value.toFixed(1)}
                  />
                  <Bar dataKey="This Provider" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Peer Average" fill="#94a3b8" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Dental Ring Network Visualization */}
          {isDentalRing && (
            <DentalRingNetwork currentProviderId={provider.providerId} />
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Link href={`/fwa/flagged-claims?provider=${provider.providerId}`}>
              <Button size="sm" variant="default" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                View Flagged Claims
              </Button>
            </Link>
            <Link href={`/fwa/provider/${provider.providerId}`}>
              <Button size="sm" variant="outline" className="gap-1">
                <ExternalLink className="h-3 w-3" />
                View Full Profile
              </Button>
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** Shared filter bar component for all tabs */
function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder,
  searchTestId,
  regionFilter,
  onRegionChange,
  specialtyFilter,
  onSpecialtyChange,
  specialtyOptions,
  riskTierFilter,
  onRiskTierChange,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  searchTestId: string;
  regionFilter: string;
  onRegionChange: (value: string) => void;
  specialtyFilter: string;
  onSpecialtyChange: (value: string) => void;
  specialtyOptions: string[];
  riskTierFilter: string;
  onRiskTierChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
          data-testid={searchTestId}
        />
      </div>

      <Select value={regionFilter} onValueChange={onRegionChange}>
        <SelectTrigger className="w-[160px]" data-testid="filter-region">
          <SelectValue placeholder="Region" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Regions</SelectItem>
          <SelectItem value="Riyadh">Riyadh</SelectItem>
          <SelectItem value="Makkah">Makkah</SelectItem>
          <SelectItem value="Eastern Province">Eastern Province</SelectItem>
          <SelectItem value="Madinah">Madinah</SelectItem>
          <SelectItem value="Asir">Asir</SelectItem>
        </SelectContent>
      </Select>

      <Select value={specialtyFilter} onValueChange={onSpecialtyChange}>
        <SelectTrigger className="w-[160px]" data-testid="filter-specialty">
          <SelectValue placeholder="Specialty" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Specialties</SelectItem>
          {specialtyOptions.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={riskTierFilter} onValueChange={onRiskTierChange}>
        <SelectTrigger className="w-[140px]" data-testid="filter-risk-tier">
          <SelectValue placeholder="Risk Tier" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Tiers</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function ProvidersTab() {
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [riskTierFilter, setRiskTierFilter] = useState("all");
  const [selectedProvider, setSelectedProvider] = useState<FwaHighRiskProvider | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { data: providers = [], isLoading } = useQuery<FwaHighRiskProvider[]>({
    queryKey: ["/api/fwa/high-risk-providers"],
  });

  const specialtyOptions = useMemo(() => {
    const specialties = new Set<string>();
    providers.forEach((p) => {
      if (p.specialty) specialties.add(p.specialty);
    });
    return Array.from(specialties).sort();
  }, [providers]);

  const filtered = useMemo(() => {
    return providers.filter((p) => {
      // Text search
      const matchesSearch =
        !search ||
        p.providerName?.toLowerCase().includes(search.toLowerCase()) ||
        p.providerId?.toLowerCase().includes(search.toLowerCase());

      // Region filter - match against organization field (which often contains region info)
      const matchesRegion =
        regionFilter === "all" ||
        p.organization?.toLowerCase().includes(regionFilter.toLowerCase()) ||
        p.providerName?.toLowerCase().includes(regionFilter.toLowerCase());

      // Specialty filter
      const matchesSpecialty =
        specialtyFilter === "all" || p.specialty === specialtyFilter;

      // Risk tier filter
      const matchesRiskTier =
        riskTierFilter === "all" || p.riskLevel === riskTierFilter;

      return matchesSearch && matchesRegion && matchesSpecialty && matchesRiskTier;
    });
  }, [providers, search, regionFilter, specialtyFilter, riskTierFilter]);

  const stats = {
    total: providers.length,
    critical: providers.filter(p => p.riskLevel === "critical").length,
    high: providers.filter(p => p.riskLevel === "high").length,
    totalExposure: providers.reduce((sum, p) => sum + parseFloat(p.totalExposure || "0"), 0),
  };

  const handleViewProfile = (provider: FwaHighRiskProvider) => {
    setSelectedProvider(provider);
    setSheetOpen(true);
  };

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Providers</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Critical Risk</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{stats.critical}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">High Risk</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-orange-600">{stats.high}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Exposure</span>
            </div>
            <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalExposure)}</p>
          </CardContent>
        </Card>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search providers..."
        searchTestId="input-search-providers"
        regionFilter={regionFilter}
        onRegionChange={setRegionFilter}
        specialtyFilter={specialtyFilter}
        onSpecialtyChange={setSpecialtyFilter}
        specialtyOptions={specialtyOptions}
        riskTierFilter={riskTierFilter}
        onRiskTierChange={setRiskTierFilter}
      />

      <Card>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider ID</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead className="text-right">Exposure</TableHead>
                <TableHead>FWA Reasons</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((provider) => (
                <TableRow key={provider.id} data-testid={`row-provider-${provider.id}`} className="hover-elevate cursor-pointer">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <p className="font-medium font-mono">{provider.providerId}</p>
                      {provider.providerId?.startsWith("PRV-CS1-") && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          <Network className="h-3 w-3 mr-0.5" />
                          Network Link
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRiskLevelBadgeClasses(provider.riskLevel)}>
                      {provider.riskLevel || "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(parseFloat(provider.riskScore || "0"), 100)} className="w-16 h-2" />
                      <span className="text-sm">{parseFloat(provider.riskScore || "0").toFixed(1)}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(provider.totalExposure)}
                  </TableCell>
                  <TableCell>
                    {provider.reasons && provider.reasons.length > 0 ? (
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        {provider.reasons.slice(0, 3).map((reason, i) => (
                          <li key={i} className="truncate max-w-[200px]">{reason}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-sm text-muted-foreground">No flags detected</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`button-view-provider-${provider.id}`}
                      onClick={() => handleViewProfile(provider)}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      View Profile
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No providers found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>

      {/* Provider Drill-Down Panel */}
      <ProviderDrillDown
        provider={selectedProvider}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}

function PatientsTab() {
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [riskTierFilter, setRiskTierFilter] = useState("all");

  const { data: patients = [], isLoading } = useQuery<FwaHighRiskPatient[]>({
    queryKey: ["/api/fwa/high-risk-patients"],
  });

  const specialtyOptions = useMemo(() => {
    // Patients don't have a specialty field, but we keep the filter for consistency
    const diagnoses = new Set<string>();
    patients.forEach((p) => {
      if (p.primaryDiagnosis) diagnoses.add(p.primaryDiagnosis);
    });
    return Array.from(diagnoses).sort();
  }, [patients]);

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      const matchesSearch =
        !search ||
        p.patientName?.toLowerCase().includes(search.toLowerCase()) ||
        p.patientId?.toLowerCase().includes(search.toLowerCase());

      // Region filter not directly applicable to patients, but kept for UI consistency
      const matchesRegion = regionFilter === "all";

      // For patients, specialty maps to primary diagnosis
      const matchesSpecialty =
        specialtyFilter === "all" || p.primaryDiagnosis === specialtyFilter;

      const matchesRiskTier =
        riskTierFilter === "all" || p.riskLevel === riskTierFilter;

      return matchesSearch && matchesRegion && matchesSpecialty && matchesRiskTier;
    });
  }, [patients, search, regionFilter, specialtyFilter, riskTierFilter]);

  const stats = {
    total: patients.length,
    critical: patients.filter(p => p.riskLevel === "critical").length,
    high: patients.filter(p => p.riskLevel === "high").length,
    totalAmount: patients.reduce((sum, p) => sum + parseFloat(p.totalAmount || "0"), 0),
  };

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Patients</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Critical Risk</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{stats.critical}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">High Risk</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-orange-600">{stats.high}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Claims</span>
            </div>
            <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalAmount)}</p>
          </CardContent>
        </Card>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search patients..."
        searchTestId="input-search-patients"
        regionFilter={regionFilter}
        onRegionChange={setRegionFilter}
        specialtyFilter={specialtyFilter}
        onSpecialtyChange={setSpecialtyFilter}
        specialtyOptions={specialtyOptions}
        riskTierFilter={riskTierFilter}
        onRiskTierChange={setRiskTierFilter}
      />

      <Card>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient ID</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Primary Reason</TableHead>
                <TableHead className="text-right">Total Claims</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((patient) => (
                <TableRow key={patient.id} data-testid={`row-patient-${patient.id}`} className="hover-elevate cursor-pointer">
                  <TableCell>
                    <p className="font-medium font-mono">{patient.patientId}</p>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRiskLevelBadgeClasses(patient.riskLevel)}>
                      {patient.riskLevel || "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(parseFloat(patient.riskScore || "0"), 100)} className="w-16 h-2" />
                      <span className="text-sm">{parseFloat(patient.riskScore || "0").toFixed(1)}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{patient.reasons?.[0] || "-"}</span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(patient.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/context/patient-360/${patient.patientId}`}>
                      <Button size="sm" variant="outline" data-testid={`button-view-patient-${patient.id}`}>
                        <FileText className="h-3 w-3 mr-1" />
                        View 360
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No patients found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
}

function DoctorsTab() {
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [riskTierFilter, setRiskTierFilter] = useState("all");

  const { data: doctors = [], isLoading } = useQuery<FwaHighRiskDoctor[]>({
    queryKey: ["/api/fwa/high-risk-doctors"],
  });

  const specialtyOptions = useMemo(() => {
    const specialties = new Set<string>();
    doctors.forEach((d) => {
      if (d.specialty) specialties.add(d.specialty);
    });
    return Array.from(specialties).sort();
  }, [doctors]);

  const filtered = useMemo(() => {
    return doctors.filter((d) => {
      const matchesSearch =
        !search ||
        d.doctorName?.toLowerCase().includes(search.toLowerCase()) ||
        d.doctorId?.toLowerCase().includes(search.toLowerCase());

      // Region filter - match against organization
      const matchesRegion =
        regionFilter === "all" ||
        d.organization?.toLowerCase().includes(regionFilter.toLowerCase());

      const matchesSpecialty =
        specialtyFilter === "all" || d.specialty === specialtyFilter;

      const matchesRiskTier =
        riskTierFilter === "all" || d.riskLevel === riskTierFilter;

      return matchesSearch && matchesRegion && matchesSpecialty && matchesRiskTier;
    });
  }, [doctors, search, regionFilter, specialtyFilter, riskTierFilter]);

  const stats = {
    total: doctors.length,
    critical: doctors.filter(d => d.riskLevel === "critical").length,
    high: doctors.filter(d => d.riskLevel === "high").length,
    totalExposure: doctors.reduce((sum, d) => sum + parseFloat(d.totalExposure || "0"), 0),
  };

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <UserCog className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Doctors</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Critical Risk</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{stats.critical}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">High Risk</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-orange-600">{stats.high}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Exposure</span>
            </div>
            <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalExposure)}</p>
          </CardContent>
        </Card>
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search doctors..."
        searchTestId="input-search-doctors"
        regionFilter={regionFilter}
        onRegionChange={setRegionFilter}
        specialtyFilter={specialtyFilter}
        onSpecialtyChange={setSpecialtyFilter}
        specialtyOptions={specialtyOptions}
        riskTierFilter={riskTierFilter}
        onRiskTierChange={setRiskTierFilter}
      />

      <Card>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doctor ID</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead className="text-right">Exposure</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((doctor) => (
                <TableRow key={doctor.id} data-testid={`row-doctor-${doctor.id}`} className="hover-elevate cursor-pointer">
                  <TableCell>
                    <p className="font-medium font-mono">{doctor.doctorId}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{doctor.specialty || "General"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRiskLevelBadgeClasses(doctor.riskLevel)}>
                      {doctor.riskLevel || "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(parseFloat(doctor.riskScore || "0"), 100)} className="w-16 h-2" />
                      <span className="text-sm">{parseFloat(doctor.riskScore || "0").toFixed(1)}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(doctor.totalExposure)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/context/doctor-360/${doctor.doctorId}`}>
                      <Button size="sm" variant="outline" data-testid={`button-view-doctor-${doctor.id}`}>
                        <FileText className="h-3 w-3 mr-1" />
                        View 360
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No doctors found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
}

export default function HighRiskEntities() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">High-Risk Entities</h1>
          <p className="text-muted-foreground">
            Monitor providers, members, and clinicians with elevated risk
          </p>
        </div>
      </div>

      <Tabs defaultValue="providers" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="providers" className="flex items-center gap-2" data-testid="tab-providers">
            <Building2 className="h-4 w-4" />
            Providers
          </TabsTrigger>
          <TabsTrigger value="patients" className="flex items-center gap-2" data-testid="tab-patients">
            <User className="h-4 w-4" />
            Patients
          </TabsTrigger>
          <TabsTrigger value="doctors" className="flex items-center gap-2" data-testid="tab-doctors">
            <UserCog className="h-4 w-4" />
            Doctors
          </TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="mt-6">
          <ProvidersTab />
        </TabsContent>

        <TabsContent value="patients" className="mt-6">
          <PatientsTab />
        </TabsContent>

        <TabsContent value="doctors" className="mt-6">
          <DoctorsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
