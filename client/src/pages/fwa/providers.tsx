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
  ChevronRight,
  ShieldAlert,
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
import { formatCurrency } from "@/lib/format";
import { getRiskLevelBadgeClasses } from "@/lib/risk-utils";
import { METRIC_GRID } from "@/lib/grid";
import { MetricCard } from "@/components/metric-card";
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

function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "0";
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numValue);
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
        className="w-full sm:max-w-[500px] p-0 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-2xl border-l border-white/40 dark:border-white/10 shadow-2xl flex flex-col"
        data-testid="sheet-provider-detail"
      >
        <SheetHeader className="p-6 pb-4 border-b border-white/40 dark:border-white/10 bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 relative overflow-hidden flex-shrink-0">
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-violet-100 dark:border-violet-800/50 shadow-sm">
              <ProviderIcon className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <SheetTitle className="text-xl font-bold text-slate-900 dark:text-white">
                Facility Details
              </SheetTitle>
              <SheetDescription className="mt-1 text-slate-500 dark:text-slate-400">
                Review facility risk profile and operational intelligence
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-8">
            {/* Facility Summary Panel */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-violet-600 dark:bg-violet-400" /> Summary
              </h3>
              <Card className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border-white/60 dark:border-white/10 shadow-sm">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <p className="font-bold text-lg text-slate-900 dark:text-white leading-tight" data-testid="text-provider-name">
                        {provider.providerName}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge
                          variant="secondary"
                          className={`${getProviderTypeBadgeClasses(provider.providerType || null)} shadow-sm text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5`}
                          data-testid="badge-provider-type"
                        >
                          {provider.providerType || "Unknown"}
                        </Badge>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono" data-testid="text-provider-id">
                          ID: {provider.providerId}
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-slate-200/50 dark:bg-slate-700/50" />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                        <Stethoscope className="w-3.5 h-3.5 text-violet-500" /> Specialty
                      </p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200" data-testid="text-specialty">
                        {provider.specialty || "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-fuchsia-500" /> Organization
                      </p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate max-w-[140px]" title={provider.organization || "N/A"} data-testid="text-organization">
                        {provider.organization || "N/A"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Risk Metrics */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-red-500 dark:text-red-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-red-500 dark:bg-red-400" /> Risk Intelligence
              </h3>
              <Card className="bg-gradient-to-br from-red-50/50 to-orange-50/50 dark:from-red-950/20 dark:to-orange-950/20 backdrop-blur-xl border-red-100/50 dark:border-red-900/30 shadow-sm relative overflow-hidden">
                <CardContent className="p-5 space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Risk Score</p>
                        <span className={`text-3xl font-bold tracking-tight ${riskScore > 75 ? 'text-red-600 dark:text-red-400' : riskScore > 50 ? 'text-orange-500' : 'text-emerald-500'}`} data-testid="text-risk-score">
                          {riskScore.toFixed(0)}<span className="text-lg opacity-50">%</span>
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`${getRiskLevelBadgeClasses(provider.riskLevel)} shadow-sm uppercase tracking-wider text-[10px] font-bold px-2.5 py-1`}
                        data-testid="badge-risk-level"
                      >
                        {provider.riskLevel || "unknown"}
                      </Badge>
                    </div>

                    <Progress
                      value={riskScore}
                      className="h-2.5 bg-white dark:bg-slate-900 shadow-inner border border-slate-200 dark:border-slate-800"
                      style={{
                        color: riskScore > 75 ? '#ef4444' : riskScore > 50 ? '#f97316' : '#10b981',
                        boxShadow: `0 0 10px ${riskScore > 75 ? 'rgba(239,68,68,0.3)' : riskScore > 50 ? 'rgba(249,115,22,0.3)' : 'rgba(16,185,129,0.3)'}`
                      } as React.CSSProperties}
                    />
                  </div>

                  <div className="flex items-center justify-between bg-white/60 dark:bg-slate-900/40 p-3 rounded-xl border border-white/60 dark:border-white/5 shadow-sm">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Denial Rate History</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200" data-testid="text-denial-rate">
                      {denialRate.toFixed(1)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* CPM Insights */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-violet-600 dark:bg-violet-400" /> Activity Metrics
              </h3>
              <Card className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border-white/60 dark:border-white/10 shadow-sm relative overflow-hidden">
                <CardContent className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">Claims / Month</p>
                      <p className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400" data-testid="text-cpm">
                        {formatNumber(claimsPerMonth)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">Peer Average</p>
                      <p className="text-xl font-bold text-slate-700 dark:text-slate-300" data-testid="text-cpm-peer">
                        {formatNumber(cpmPeerAverage)}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 shadow-inner space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Benchmark</span>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                        {cpmTrend >= 0 ? (
                          <TrendingUp className="w-3.5 h-3.5 text-red-500" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                        <span className={`text-[10px] font-bold ${cpmTrend >= 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`} data-testid="text-cpm-trend">
                          {cpmTrend >= 0 ? "+" : ""}{cpmTrend.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <Progress
                      value={Math.min((claimsPerMonth / cpmPeerAverage) * 50, 100)}
                      className="h-1.5 bg-slate-200 dark:bg-slate-800 [&>div]:bg-current"
                      style={{ color: claimsPerMonth > cpmPeerAverage ? '#ef4444' : '#10b981' } as React.CSSProperties}
                    />
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                      Tracking <strong className={claimsPerMonth > cpmPeerAverage ? "text-red-500" : "text-emerald-500"}>{((claimsPerMonth / cpmPeerAverage - 1) * 100).toFixed(1)}%</strong> {claimsPerMonth > cpmPeerAverage ? "above" : "below"} peer average
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Claim Statistics */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-violet-600 dark:bg-violet-400" /> Claim Volumes
              </h3>
              <Card className="bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border-white/60 dark:border-white/10 shadow-sm">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 bg-violet-50/50 dark:bg-violet-900/10 p-3 rounded-xl border border-violet-100 dark:border-violet-800/30">
                      <p className="text-[10px] text-violet-600 dark:text-violet-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <ClipboardList className="w-3 h-3" /> Total
                      </p>
                      <p className="text-lg font-bold text-slate-800 dark:text-slate-200" data-testid="text-total-claims">
                        {provider.totalClaims?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div className="space-y-1 bg-orange-50/50 dark:bg-orange-900/10 p-3 rounded-xl border border-orange-100 dark:border-orange-800/30">
                      <p className="text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Flag className="w-3 h-3" /> Flagged
                      </p>
                      <p className="text-lg font-bold text-slate-800 dark:text-slate-200" data-testid="text-flagged-claims">
                        {provider.flaggedClaims?.toLocaleString() || 0}
                      </p>
                    </div>
                    <div className="space-y-1 bg-fuchsia-50/50 dark:bg-fuchsia-900/10 p-3 rounded-xl border border-fuchsia-100 dark:border-fuchsia-800/30">
                      <p className="text-[10px] text-fuchsia-600 dark:text-fuchsia-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <DollarSign className="w-3 h-3" /> Avg Amount
                      </p>
                      <p className="text-lg font-bold text-slate-800 dark:text-slate-200" data-testid="text-avg-amount">
                        {formatCurrency(avgClaimAmount)}
                      </p>
                    </div>
                    <div className="space-y-1 bg-red-50/50 dark:bg-red-900/10 p-3 rounded-xl border border-red-200/50 dark:border-900/30">
                      <p className="text-[10px] text-red-600 dark:text-red-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Total Exposure
                      </p>
                      <p className="text-lg font-bold text-slate-800 dark:text-slate-200" data-testid="text-total-exposure">
                        {formatCurrency(totalExposure)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-violet-600 dark:bg-violet-400" /> Quick Actions
              </h3>
              <div className="space-y-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full bg-white/60 dark:bg-slate-900/40 border-violet-100 dark:border-violet-900/50 hover:bg-violet-50 dark:hover:bg-violet-900/40 hover:text-violet-700 dark:hover:text-violet-300 transition-colors shadow-sm" data-testid="button-agent-workflow">
                      <Brain className="w-4 h-4 mr-2 text-violet-500" />
                      AI Agent Workflow
                      <ChevronDown className="w-4 h-4 ml-auto opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-xl">
                    <DropdownMenuItem
                      onClick={() => navigate(`/fwa/agent-workflow?entityId=${provider.providerId}&entityType=provider&entityName=${encodeURIComponent(provider.providerName)}&phase=A1`)}
                      data-testid="menu-item-phase-a1"
                      className="cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-900/30 font-medium"
                    >
                      <Activity className="w-4 h-4 mr-2 text-violet-500" />
                      Analysis & Intelligence
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate(`/fwa/agent-workflow?entityId=${provider.providerId}&entityType=provider&entityName=${encodeURIComponent(provider.providerName)}&phase=A2`)}
                      data-testid="menu-item-phase-a2"
                      className="cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-900/30 font-medium"
                    >
                      <ClipboardList className="w-4 h-4 mr-2 text-violet-500" />
                      Abuse Categorization
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate(`/fwa/agent-workflow?entityId=${provider.providerId}&entityType=provider&entityName=${encodeURIComponent(provider.providerName)}&phase=A3`)}
                      data-testid="menu-item-phase-a3"
                      className="cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-900/30 font-medium"
                    >
                      <Shield className="w-4 h-4 mr-2 text-violet-500" />
                      Prospective Actions
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="w-full bg-white/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-sm" data-testid="button-view-cases">
                    <FileText className="w-4 h-4 mr-2 text-slate-500" />
                    View IC Cases
                  </Button>
                  <Button variant="outline" className="w-full bg-white/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-sm" data-testid="button-view-claims">
                    <ClipboardList className="w-4 h-4 mr-2 text-slate-500" />
                    View All Claims
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="p-6 border-t border-white/40 dark:border-white/10 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-xl relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-t from-violet-500/5 to-transparent pointer-events-none" />
          <Button
            className="w-full relative group overflow-hidden bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 shadow-xl shadow-slate-900/10 dark:shadow-white/10 transition-all duration-300"
            size="lg"
            onClick={onReconcile}
            data-testid="button-reconcile"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="flex items-center justify-center gap-2 relative z-10 w-full font-bold tracking-wide">
              <ShieldAlert className="w-5 h-5 text-violet-400 dark:text-violet-600" />
              <span>Initiate Review Protocol</span>
              <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </Button>
        </div>
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
        setWatchedProviders((prev) => new Set([...Array.from(prev), providerToWatch.providerId]));
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
        setWatchedProviders((prev) => new Set([...Array.from(prev), providerToWatch.providerId]));
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
          className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white shadow-md shadow-violet-500/20 border-0"
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
          title="Total Facilities"
          value={String(stats.totalProviders)}
          subtitle="Facilities in system"
          icon={Building2}
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

      <Card className="bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-lg mt-6 overflow-hidden">
        <CardHeader className="pb-4 bg-white/50 dark:bg-slate-900/50 border-b border-white/20 dark:border-white/10">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by facility name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white/50 dark:bg-slate-900/50 border-white/20 dark:border-white/10 focus-visible:ring-violet-500 transition-all rounded-lg"
                data-testid="input-search"
              />
            </div>
            <Select value={providerTypeFilter} onValueChange={setProviderTypeFilter}>
              <SelectTrigger className="w-[160px] bg-white/50 dark:bg-slate-900/50 border-white/20 dark:border-white/10 rounded-lg" data-testid="select-provider-type">
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
              <SelectTrigger className="w-[160px] bg-white/50 dark:bg-slate-900/50 border-white/20 dark:border-white/10 rounded-lg" data-testid="select-risk-level">
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
