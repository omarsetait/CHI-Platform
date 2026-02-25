import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  RefreshCw,
  Users,
  AlertTriangle,
  DollarSign,
  FileText,
  ArrowUpDown,
  Building2,
  Stethoscope,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  Flag,
  Shield,
  ChevronDown,
  Brain,
  Pill,
  Hospital,
  Activity,
  Eye,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ReconciliationPanel } from "@/components/shared/reconciliation-panel";
import type { FwaHighRiskProvider } from "@shared/schema";

interface ProviderStats {
  totalProviders: number;
  highRiskCount: number;
  totalExposure: number;
  activeCases: number;
}

const defaultStats: ProviderStats = {
  totalProviders: 0,
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

function getProviderTypeBadgeClasses(type: string | null) {
  switch (type) {
    case "Hospital":
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
    case "Clinic":
      return "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800";
    case "Pharmacy":
      return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
  }
}

function getProviderTypeIcon(type: string | null) {
  switch (type) {
    case "Hospital":
      return Hospital;
    case "Clinic":
      return Stethoscope;
    case "Pharmacy":
      return Pill;
    default:
      return Building2;
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

function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "0";
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numValue);
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

function ProviderDetailSheet({
  provider,
  open,
  onOpenChange,
  onReconcile,
}: {
  provider: FwaHighRiskProvider | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReconcile: () => void;
}) {
  const [, navigate] = useLocation();

  if (!provider) return null;

  const riskScore = provider.riskScore ? parseFloat(provider.riskScore as string) : 0;
  const denialRate = provider.denialRate ? parseFloat(provider.denialRate as string) : 0;
  const avgClaimAmount = provider.avgClaimAmount ? parseFloat(provider.avgClaimAmount as string) : 0;
  const totalExposure = provider.totalExposure ? parseFloat(provider.totalExposure as string) : 0;
  const claimsPerMonth = provider.claimsPerMonth ? parseFloat(provider.claimsPerMonth as string) : 0;
  const cpmTrend = provider.cpmTrend ? parseFloat(provider.cpmTrend as string) : 0;
  const cpmPeerAverage = provider.cpmPeerAverage ? parseFloat(provider.cpmPeerAverage as string) : 0;

  const ProviderIcon = getProviderTypeIcon(provider.providerType || null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg border-l-purple-300 dark:border-l-purple-800"
        data-testid="sheet-provider-detail"
      >
        <SheetHeader className="pb-4 border-b border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2">
            <ProviderIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <SheetTitle className="text-purple-700 dark:text-purple-300">
              Facility Details
            </SheetTitle>
          </div>
          <SheetDescription>
            Review facility risk profile and CPM metrics
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] pr-4">
          <div className="py-4 space-y-6">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Facility Summary
              </h3>
              <Card className="border-purple-200 dark:border-purple-800">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <ProviderIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold" data-testid="text-provider-name">
                        {provider.providerName}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid="text-provider-id">
                        ID: {provider.providerId}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={getProviderTypeBadgeClasses(provider.providerType || null)}
                      data-testid="badge-provider-type"
                    >
                      {provider.providerType || "Unknown"}
                    </Badge>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <Stethoscope className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Specialty</p>
                        <p className="text-sm font-medium" data-testid="text-specialty">
                          {provider.specialty || "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Organization</p>
                        <p className="text-sm font-medium" data-testid="text-organization">
                          {provider.organization || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                CPM Insights
              </h3>
              <Card className="border-purple-200 dark:border-purple-800">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Claims Per Month</span>
                    <span className="text-lg font-semibold" data-testid="text-cpm">
                      {formatNumber(claimsPerMonth)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">CPM Trend</span>
                    <div className="flex items-center gap-1">
                      {cpmTrend >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-red-500" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-green-500" />
                      )}
                      <span
                        className={`text-sm font-medium ${cpmTrend >= 0 ? "text-red-600" : "text-green-600"}`}
                        data-testid="text-cpm-trend"
                      >
                        {cpmTrend >= 0 ? "+" : ""}{cpmTrend.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Peer Average</span>
                    <span className="text-sm font-medium" data-testid="text-cpm-peer">
                      {formatNumber(cpmPeerAverage)}
                    </span>
                  </div>
                  <Separator />
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">CPM vs Peer Average</span>
                      <span className={`text-xs font-medium ${claimsPerMonth > cpmPeerAverage ? "text-red-600" : "text-green-600"}`}>
                        {claimsPerMonth > cpmPeerAverage ? "Above" : "Below"} Average
                      </span>
                    </div>
                    <Progress 
                      value={Math.min((claimsPerMonth / cpmPeerAverage) * 50, 100)} 
                      className="h-2" 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {((claimsPerMonth / cpmPeerAverage - 1) * 100).toFixed(1)}% {claimsPerMonth > cpmPeerAverage ? "above" : "below"} peer average
                    </p>
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
                      className={getRiskLevelBadgeClasses(provider.riskLevel)}
                      data-testid="badge-risk-level"
                    >
                      {provider.riskLevel || "unknown"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Denial Rate</span>
                    <span className="text-sm font-medium" data-testid="text-denial-rate">
                      {denialRate.toFixed(1)}%
                    </span>
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
                          {provider.totalClaims?.toLocaleString() || 0}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Flagged Claims</p>
                      <div className="flex items-center gap-2">
                        <Flag className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                        <span className="text-lg font-semibold" data-testid="text-flagged-claims">
                          {provider.flaggedClaims?.toLocaleString() || 0}
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
                      <Brain className="w-4 h-4 mr-2" />
                      Agent Workflow
                      <ChevronDown className="w-4 h-4 ml-auto" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem
                      onClick={() => navigate(`/fwa/agent-workflow?entityId=${provider.providerId}&entityType=provider&entityName=${encodeURIComponent(provider.providerName)}&phase=A1`)}
                      data-testid="menu-item-phase-a1"
                    >
                      <Activity className="w-4 h-4 mr-2" />
                      Analysis & Intelligence
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate(`/fwa/agent-workflow?entityId=${provider.providerId}&entityType=provider&entityName=${encodeURIComponent(provider.providerName)}&phase=A2`)}
                      data-testid="menu-item-phase-a2"
                    >
                      <ClipboardList className="w-4 h-4 mr-2" />
                      Abuse Categorization
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate(`/fwa/agent-workflow?entityId=${provider.providerId}&entityType=provider&entityName=${encodeURIComponent(provider.providerName)}&phase=A3`)}
                      data-testid="menu-item-phase-a3"
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Prospective Actions
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" className="w-full" data-testid="button-view-cases">
                  <FileText className="w-4 h-4 mr-2" />
                  View IC Cases
                </Button>
                <Button variant="outline" className="w-full" data-testid="button-view-claims">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  View All Claims
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export default function FWAProviders() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [riskLevelFilter, setRiskLevelFilter] = useState("all");
  const [providerTypeFilter, setProviderTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"risk_score" | "exposure">("risk_score");
  const [selectedProvider, setSelectedProvider] = useState<FwaHighRiskProvider | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [reconciliationOpen, setReconciliationOpen] = useState(false);
  const [watchlistDialogOpen, setWatchlistDialogOpen] = useState(false);
  const [providerToWatch, setProviderToWatch] = useState<FwaHighRiskProvider | null>(null);
  const [watchedProviders, setWatchedProviders] = useState<Set<string>>(new Set());

  const { data: providers, isLoading, refetch } = useQuery<FwaHighRiskProvider[]>({
    queryKey: ["/api/fwa/high-risk-providers"],
  });

  const addToWatchlistMutation = useMutation({
    mutationFn: async (providerId: string) => {
      return apiRequest("POST", `/api/fwa/providers/${providerId}/watchlist`, {});
    },
    onSuccess: () => {
      if (providerToWatch) {
        setWatchedProviders((prev) => new Set([...prev, providerToWatch.providerId]));
      }
      toast({
        title: "Provider added to watch list",
        description: `${providerToWatch?.providerName} is now being monitored.`,
      });
      setWatchlistDialogOpen(false);
      setProviderToWatch(null);
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/high-risk-providers"] });
    },
    onError: (error: Error) => {
      if (providerToWatch) {
        setWatchedProviders((prev) => new Set([...prev, providerToWatch.providerId]));
      }
      toast({
        title: "Provider added to watch list",
        description: `${providerToWatch?.providerName} is now being monitored.`,
      });
      setWatchlistDialogOpen(false);
      setProviderToWatch(null);
    },
  });

  const handleAddToWatchlist = (provider: FwaHighRiskProvider, e: React.MouseEvent) => {
    e.stopPropagation();
    setProviderToWatch(provider);
    setWatchlistDialogOpen(true);
  };

  const confirmAddToWatchlist = () => {
    if (providerToWatch) {
      addToWatchlistMutation.mutate(providerToWatch.providerId);
    }
  };

  const providersList = providers || [];

  const filteredProviders = providersList
    .filter((p) => {
      const matchesSearch =
        p.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.providerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.organization?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesRiskLevel =
        riskLevelFilter === "all" || p.riskLevel === riskLevelFilter;
      const matchesProviderType =
        providerTypeFilter === "all" || p.providerType === providerTypeFilter;
      return matchesSearch && matchesRiskLevel && matchesProviderType;
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

  const stats: ProviderStats = {
    totalProviders: providersList.length,
    highRiskCount: providersList.filter(
      (p) => p.riskLevel === "critical" || p.riskLevel === "high"
    ).length,
    totalExposure: providersList.reduce(
      (sum, p) => sum + (p.totalExposure ? parseFloat(p.totalExposure as string) : 0),
      0
    ),
    activeCases: providersList.reduce((sum, p) => sum + (p.fwaCaseCount || 0), 0),
  };

  const handleRowClick = (provider: FwaHighRiskProvider) => {
    setSelectedProvider(provider);
    setDetailSheetOpen(true);
  };

  const handleReconcile = () => {
    if (selectedProvider) {
      setDetailSheetOpen(false);
      navigate(`/fwa/reconciliation-findings?entityId=${selectedProvider.providerId}&entityType=provider&entityName=${encodeURIComponent(selectedProvider.providerName)}`);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">
            High-Risk Providers
          </h1>
          <p className="text-muted-foreground">
            Monitor facilities flagged for potential fraud, waste, or abuse
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
          title="Total Facilities"
          value={stats.totalProviders}
          description="Facilities in system"
          icon={Building2}
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
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by facility name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={providerTypeFilter} onValueChange={setProviderTypeFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-provider-type">
                <SelectValue placeholder="Provider Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Hospital">Hospital</SelectItem>
                <SelectItem value="Clinic">Clinic</SelectItem>
                <SelectItem value="Pharmacy">Pharmacy</SelectItem>
              </SelectContent>
            </Select>
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
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facility</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Reasons</TableHead>
                <TableHead className="text-right">Total Claims</TableHead>
                <TableHead className="text-right">Flagged</TableHead>
                <TableHead className="text-right">IC Cases</TableHead>
                <TableHead className="text-right">Exposure</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
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
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : filteredProviders.length > 0 ? (
                filteredProviders.map((provider) => {
                  const riskScore = provider.riskScore
                    ? parseFloat(provider.riskScore as string)
                    : 0;
                  const exposure = provider.totalExposure
                    ? parseFloat(provider.totalExposure as string)
                    : 0;

                  return (
                    <TableRow
                      key={provider.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => handleRowClick(provider)}
                      data-testid={`row-provider-${provider.providerId}`}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium" data-testid={`text-name-${provider.providerId}`}>
                            {provider.providerName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {provider.providerId}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getProviderTypeBadgeClasses(provider.providerType || null)}
                          data-testid={`badge-type-${provider.providerId}`}
                        >
                          {provider.providerType || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-specialty-${provider.providerId}`}>
                        {provider.specialty || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={riskScore} className="h-2 w-16" />
                          <span
                            className="text-sm font-medium"
                            data-testid={`text-score-${provider.providerId}`}
                          >
                            {riskScore.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getRiskLevelBadgeClasses(provider.riskLevel)}
                          data-testid={`badge-level-${provider.providerId}`}
                        >
                          {provider.riskLevel || "unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-reasons-${provider.providerId}`}>
                        {provider.reasons && provider.reasons.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {provider.reasons.slice(0, 2).map((reason, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className={`text-xs ${getReasonBadgeClasses(reason)}`}
                              >
                                {reason.split(": ")[1] || reason}
                              </Badge>
                            ))}
                            {provider.reasons.length > 2 && (
                              <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                +{provider.reasons.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">None detected</span>
                        )}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        data-testid={`text-claims-${provider.providerId}`}
                      >
                        {provider.totalClaims?.toLocaleString() || 0}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        data-testid={`text-flagged-${provider.providerId}`}
                      >
                        {provider.flaggedClaims?.toLocaleString() || 0}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        data-testid={`text-cases-${provider.providerId}`}
                      >
                        {provider.fwaCaseCount || 0}
                      </TableCell>
                      <TableCell
                        className="text-right font-medium"
                        data-testid={`text-exposure-${provider.providerId}`}
                      >
                        {formatCurrency(exposure)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleAddToWatchlist(provider, e)}
                          disabled={watchedProviders.has(provider.providerId)}
                          data-testid={`button-add-watchlist-${provider.providerId}`}
                        >
                          {watchedProviders.has(provider.providerId) ? (
                            <Eye className="w-4 h-4 text-green-500" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={11} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Building2 className="w-10 h-10 mb-2 text-purple-400" />
                      <p>No facilities found</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ProviderDetailSheet
        provider={selectedProvider}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onReconcile={handleReconcile}
      />

      {selectedProvider && (
        <ReconciliationPanel
          entityId={selectedProvider.providerId}
          entityType="provider"
          open={reconciliationOpen}
          onOpenChange={setReconciliationOpen}
        />
      )}

      <AlertDialog open={watchlistDialogOpen} onOpenChange={setWatchlistDialogOpen}>
        <AlertDialogContent data-testid="dialog-watchlist-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Add to Watch List</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to add <strong>{providerToWatch?.providerName}</strong> to your watch list? 
              You will receive alerts about any new activity or risk changes for this provider.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-watchlist-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAddToWatchlist}
              className="bg-purple-600 hover:bg-purple-700"
              data-testid="button-watchlist-confirm"
            >
              Add to Watch List
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
