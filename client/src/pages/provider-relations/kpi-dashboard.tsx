import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Calculator,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Target,
  BarChart3,
  Clock,
  RefreshCw,
  Trophy,
  Info,
  ArrowUpDown,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { KpiDefinition, KpiResult } from "@shared/schema";

interface DashboardKpi {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  unit: string | null;
  displayFormat: string | null;
  enableBenchmarking: boolean | null;
  numeratorLabel?: string;
  numeratorSource?: string;
  denominatorLabel?: string;
  denominatorSource?: string;
  inclusions?: string[];
  exclusions?: string[];
  latestResult: {
    numeratorValue: string | null;
    denominatorValue: string | null;
    calculatedValue: string | null;
    periodLabel: string | null;
    alertLevel: string | null;
    percentileRank: number | null;
    zScore: string | null;
    peerMean?: string | null;
    peerMedian?: string | null;
    calculatedAt: string | null;
  } | null;
  calculatedValue: string | null;
  trend: {
    direction: string;
    percentage: string | null;
  } | null;
}

interface DashboardResponse {
  success: boolean;
  kpis: DashboardKpi[];
}

interface ProviderKpiScore {
  kpiCode: string;
  kpiName: string;
  category: string;
  rawValue: number;
  normalizedScore: number;
  weight: number;
  weightedScore: number;
  targetDirection: string;
}

interface ProviderCompositeScore {
  providerId: string;
  providerName: string;
  compositeScore: number;
  categoryScores: {
    financial: number;
    medical: number;
    operational: number;
  };
  kpiScores: ProviderKpiScore[];
  rank?: number;
  totalProviders?: number;
}

type SortField = "rank" | "providerName" | "compositeScore" | "financial" | "medical" | "operational";
type SortDirection = "asc" | "desc";

const CATEGORY_COLORS: Record<string, string> = {
  financial: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  utilization: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  fwa: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  claims_adjudication: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  reconciliation: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  benchmarking: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  quality: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
};

const CATEGORY_LABELS: Record<string, string> = {
  financial: "Financial",
  utilization: "Utilization",
  fwa: "FWA",
  claims_adjudication: "Claims Adjudication",
  reconciliation: "Reconciliation",
  benchmarking: "Benchmarking",
  quality: "Quality",
};

function formatValue(value: string | null | undefined, unit: string | null | undefined): string {
  if (!value || value === "null") return "—";
  
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return value;
  
  switch (unit) {
    case "currency":
      if (numValue >= 1000000) {
        return `$${(numValue / 1000000).toFixed(2)}M`;
      } else if (numValue >= 1000) {
        return `$${(numValue / 1000).toFixed(1)}K`;
      }
      return `$${numValue.toFixed(2)}`;
    case "percentage":
      return `${numValue.toFixed(1)}%`;
    case "ratio":
      return numValue.toFixed(2);
    case "days":
      return `${numValue.toFixed(1)} days`;
    default:
      if (numValue >= 1000000) {
        return `${(numValue / 1000000).toFixed(2)}M`;
      } else if (numValue >= 1000) {
        return `${(numValue / 1000).toFixed(1)}K`;
      }
      return numValue.toFixed(2);
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-blue-600 dark:text-blue-400";
  if (score >= 40) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreBadgeClass(score: number): string {
  if (score >= 80) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
  if (score >= 60) return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
  if (score >= 40) return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
}

function getProgressColor(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-blue-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function getRankBadgeClass(rank: number): string {
  if (rank === 1) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
  if (rank === 2) return "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
  if (rank === 3) return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
  return "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
}

function TrendIndicator({ trend }: { trend: DashboardKpi["trend"] }) {
  if (!trend) return null;
  
  const { direction, percentage } = trend;
  const percentValue = percentage ? parseFloat(percentage) : 0;
  
  if (direction === "up") {
    return (
      <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
        <TrendingUp className="w-4 h-4" />
        <span className="text-xs font-medium">
          {percentValue > 0 ? `+${percentValue.toFixed(1)}%` : ""}
        </span>
      </div>
    );
  } else if (direction === "down") {
    return (
      <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
        <TrendingDown className="w-4 h-4" />
        <span className="text-xs font-medium">
          {percentValue !== 0 ? `${percentValue.toFixed(1)}%` : ""}
        </span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-1 text-muted-foreground">
      <Minus className="w-4 h-4" />
      <span className="text-xs font-medium">Stable</span>
    </div>
  );
}

function AlertBadge({ level }: { level: string | null | undefined }) {
  if (!level || level === "normal") return null;
  
  if (level === "critical") {
    return (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
        <AlertCircle className="w-3 h-3 mr-1" />
        Critical
      </Badge>
    );
  }
  
  if (level === "warning") {
    return (
      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Warning
      </Badge>
    );
  }
  
  return null;
}

function KpiCard({ kpi, definitions }: { kpi: DashboardKpi; definitions: KpiDefinition[] }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const definition = definitions.find(d => d.id === kpi.id);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card 
        className="hover-elevate transition-all"
        data-testid={`kpi-card-${kpi.code}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={CATEGORY_COLORS[kpi.category] || "bg-gray-100 text-gray-800"}>
                  {CATEGORY_LABELS[kpi.category] || kpi.category}
                </Badge>
                <AlertBadge level={kpi.latestResult?.alertLevel} />
              </div>
              <h3 className="font-semibold text-sm">{kpi.name}</h3>
              <p className="text-xs text-muted-foreground">{kpi.code}</p>
            </div>
            <CollapsibleTrigger asChild>
              <Button 
                size="icon" 
                variant="ghost" 
                className="shrink-0"
                data-testid={`kpi-expand-${kpi.code}`}
              >
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
          
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-3xl font-bold">
                {formatValue(kpi.latestResult?.calculatedValue || kpi.calculatedValue, kpi.unit)}
              </p>
              {kpi.latestResult?.periodLabel && (
                <p className="text-xs text-muted-foreground mt-1">
                  {kpi.latestResult.periodLabel}
                </p>
              )}
            </div>
            <TrendIndicator trend={kpi.trend} />
          </div>
          
          <CollapsibleContent className="mt-4 pt-4 border-t">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Numerator</p>
                  <p className="text-sm font-medium">{definition?.numeratorLabel || "—"}</p>
                  <p className="text-lg font-semibold text-primary">
                    {formatValue(kpi.latestResult?.numeratorValue, kpi.unit)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Source: {definition?.numeratorSource || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Denominator</p>
                  <p className="text-sm font-medium">{definition?.denominatorLabel || "—"}</p>
                  <p className="text-lg font-semibold text-primary">
                    {formatValue(kpi.latestResult?.denominatorValue, "number")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Source: {definition?.denominatorSource || "—"}
                  </p>
                </div>
              </div>
              
              {definition?.inclusions && definition.inclusions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Inclusions</p>
                  <div className="flex flex-wrap gap-1">
                    {definition.inclusions.map((item, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        <CheckCircle className="w-3 h-3 mr-1 text-emerald-500" />
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {definition?.exclusions && definition.exclusions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Exclusions</p>
                  <div className="flex flex-wrap gap-1">
                    {definition.exclusions.map((item, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        <AlertCircle className="w-3 h-3 mr-1 text-red-500" />
                        {item}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {kpi.enableBenchmarking && kpi.latestResult && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <BarChart3 className="w-3 h-3" />
                    Peer Statistics
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Mean</p>
                      <p className="text-sm font-medium">
                        {kpi.latestResult.peerMean ? formatValue(kpi.latestResult.peerMean, kpi.unit) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Median</p>
                      <p className="text-sm font-medium">
                        {kpi.latestResult.peerMedian ? formatValue(kpi.latestResult.peerMedian, kpi.unit) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Z-Score</p>
                      <p className="text-sm font-medium">
                        {kpi.latestResult.zScore ? parseFloat(kpi.latestResult.zScore).toFixed(2) : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Percentile</p>
                      <p className="text-sm font-medium">
                        {kpi.latestResult.percentileRank !== null ? `${kpi.latestResult.percentileRank}th` : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {kpi.latestResult?.calculatedAt && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Last calculated: {new Date(kpi.latestResult.calculatedAt).toLocaleString()}
                </p>
              )}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  description,
  colorClass,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  colorClass: string;
}) {
  return (
    <Card data-testid={`summary-card-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${colorClass}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProviderRankingRow({ provider, isExpanded, onToggle }: { 
  provider: ProviderCompositeScore; 
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <TableRow 
        className="hover-elevate cursor-pointer"
        onClick={onToggle}
        data-testid={`ranking-row-${provider.providerId}`}
      >
        <TableCell>
          <Badge className={getRankBadgeClass(provider.rank || 0)}>
            {provider.rank === 1 && <Trophy className="w-3 h-3 mr-1" />}
            #{provider.rank}
          </Badge>
        </TableCell>
        <TableCell className="font-medium">{provider.providerName}</TableCell>
        <TableCell>
          <div className="flex items-center gap-3 min-w-[150px]">
            <div className="flex-1">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getProgressColor(provider.compositeScore)} transition-all`}
                  style={{ width: `${Math.min(provider.compositeScore, 100)}%` }}
                />
              </div>
            </div>
            <span className={`text-sm font-semibold ${getScoreColor(provider.compositeScore)}`}>
              {provider.compositeScore.toFixed(1)}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <span className={`text-sm font-medium ${getScoreColor(provider.categoryScores.financial)}`}>
            {provider.categoryScores.financial.toFixed(1)}
          </span>
        </TableCell>
        <TableCell>
          <span className={`text-sm font-medium ${getScoreColor(provider.categoryScores.medical)}`}>
            {provider.categoryScores.medical.toFixed(1)}
          </span>
        </TableCell>
        <TableCell>
          <span className={`text-sm font-medium ${getScoreColor(provider.categoryScores.operational)}`}>
            {provider.categoryScores.operational.toFixed(1)}
          </span>
        </TableCell>
        <TableCell>
          <Button 
            size="icon" 
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            data-testid={`expand-${provider.providerId}`}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={7} className="p-4">
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">KPI Breakdown</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {provider.kpiScores.map((kpi) => (
                  <div 
                    key={kpi.kpiCode} 
                    className="bg-background rounded-lg p-3 border"
                    data-testid={`kpi-breakdown-${kpi.kpiCode}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-medium truncate">{kpi.kpiName}</span>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {kpi.category}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Raw Value</p>
                        <p className="font-medium">{kpi.rawValue.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Normalized</p>
                        <p className={`font-medium ${getScoreColor(kpi.normalizedScore)}`}>
                          {kpi.normalizedScore.toFixed(1)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Weight</p>
                        <p className="font-medium">{kpi.weight.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Weighted</p>
                        <p className="font-medium">{kpi.weightedScore.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        Target: {kpi.targetDirection === "lower" ? "Lower is better" : "Higher is better"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function ProviderRankingsTable({ rankings }: { rankings: ProviderCompositeScore[] }) {
  const [sortField, setSortField] = useState<SortField>("rank");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedRankings = useMemo(() => {
    const sorted = [...rankings].sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortField) {
        case "rank":
          aValue = a.rank || 0;
          bValue = b.rank || 0;
          break;
        case "providerName":
          aValue = a.providerName.toLowerCase();
          bValue = b.providerName.toLowerCase();
          break;
        case "compositeScore":
          aValue = a.compositeScore;
          bValue = b.compositeScore;
          break;
        case "financial":
          aValue = a.categoryScores.financial;
          bValue = b.categoryScores.financial;
          break;
        case "medical":
          aValue = a.categoryScores.medical;
          bValue = b.categoryScores.medical;
          break;
        case "operational":
          aValue = a.categoryScores.operational;
          bValue = b.categoryScores.operational;
          break;
        default:
          return 0;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc" 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }

      return sortDirection === "asc" 
        ? (aValue as number) - (bValue as number) 
        : (bValue as number) - (aValue as number);
    });

    return sorted;
  }, [rankings, sortField, sortDirection]);

  const toggleRow = (providerId: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(providerId)) {
        next.delete(providerId);
      } else {
        next.add(providerId);
      }
      return next;
    });
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 px-2 -ml-2"
      onClick={() => handleSort(field)}
      data-testid={`sort-${field}`}
    >
      {children}
      <ArrowUpDown className="ml-1 h-3 w-3" />
      {sortField === field && (
        <span className="ml-1 text-xs">
          {sortDirection === "asc" ? "↑" : "↓"}
        </span>
      )}
    </Button>
  );

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[80px]">
              <SortButton field="rank">Rank</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="providerName">Provider Name</SortButton>
            </TableHead>
            <TableHead className="w-[200px]">
              <SortButton field="compositeScore">Composite Score</SortButton>
            </TableHead>
            <TableHead className="w-[100px]">
              <SortButton field="financial">Financial</SortButton>
            </TableHead>
            <TableHead className="w-[100px]">
              <SortButton field="medical">Medical</SortButton>
            </TableHead>
            <TableHead className="w-[100px]">
              <SortButton field="operational">Operational</SortButton>
            </TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedRankings.map((provider) => (
            <ProviderRankingRow
              key={provider.providerId}
              provider={provider}
              isExpanded={expandedRows.has(provider.providerId)}
              onToggle={() => toggleRow(provider.providerId)}
            />
          ))}
          {sortedRankings.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No provider rankings available. Calculate KPIs first to generate rankings.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function CompositeScoreInfoCard() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card data-testid="composite-score-info-card">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-medium">Composite Score Formula</CardTitle>
            </div>
            <CollapsibleTrigger asChild>
              <Button size="sm" variant="ghost" data-testid="toggle-formula-info">
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="p-4 pt-2 space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Category Weights</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">40%</p>
                  <p className="text-xs text-muted-foreground">Financial</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">35%</p>
                  <p className="text-xs text-muted-foreground">Medical</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">25%</p>
                  <p className="text-xs text-muted-foreground">Operational</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">How Normalization Works</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">1.</span>
                  Each KPI raw value is compared against all providers
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">2.</span>
                  Percentile rank is calculated (0-100 scale)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">3.</span>
                  For "lower is better" KPIs, score is inverted (100 - percentile)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">4.</span>
                  Weighted scores are summed within each category
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">5.</span>
                  Final composite = (Financial × 0.40) + (Medical × 0.35) + (Operational × 0.25)
                </li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Score Interpretation</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs">≥80: Excellent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-xs">60-79: Good</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-xs">40-59: Needs Work</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-xs">&lt;40: Critical</span>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function KpiDashboardPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);

  const { data: dashboardData, isLoading } = useQuery<DashboardResponse>({
    queryKey: ["/api/provider-relations/kpi-dashboard"],
  });

  const { data: definitions = [] } = useQuery<KpiDefinition[]>({
    queryKey: ["/api/provider-relations/kpi-definitions"],
  });

  const { data: rankings = [], isLoading: isLoadingRankings } = useQuery<ProviderCompositeScore[]>({
    queryKey: ["/api/provider-relations/provider-rankings"],
  });

  const calculateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/provider-relations/kpi-definitions/calculate", {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider-relations/kpi-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/provider-relations/kpi-results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/provider-relations/provider-rankings"] });
      toast({
        title: "Calculation Complete",
        description: `Successfully calculated ${data.calculatedCount} KPIs`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Calculation Failed",
        description: error.message || "Failed to calculate KPIs",
        variant: "destructive",
      });
    },
  });

  const kpis = dashboardData?.kpis || [];

  const filteredKpis = useMemo(() => {
    return kpis.filter((kpi) => {
      const matchesSearch = 
        searchQuery === "" ||
        kpi.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kpi.code.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = 
        categoryFilter === "all" || kpi.category === categoryFilter;
      
      const matchesAlert = 
        !showAlertsOnly || 
        (kpi.latestResult?.alertLevel === "warning" || kpi.latestResult?.alertLevel === "critical");
      
      return matchesSearch && matchesCategory && matchesAlert;
    });
  }, [kpis, searchQuery, categoryFilter, showAlertsOnly]);

  const stats = useMemo(() => {
    const total = kpis.length;
    const withAlerts = kpis.filter(
      k => k.latestResult?.alertLevel === "warning" || k.latestResult?.alertLevel === "critical"
    ).length;
    const latestCalc = kpis
      .filter(k => k.latestResult?.calculatedAt)
      .map(k => new Date(k.latestResult!.calculatedAt!))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    
    return {
      total,
      withAlerts,
      latestCalc: latestCalc ? latestCalc.toLocaleString() : "Never",
    };
  }, [kpis]);

  const categories = useMemo(() => {
    const categorySet = new Set(kpis.map(k => k.category));
    return Array.from(categorySet);
  }, [kpis]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">
            KPI Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor and analyze key performance indicators
          </p>
        </div>
        <Button
          onClick={() => calculateMutation.mutate()}
          disabled={calculateMutation.isPending}
          data-testid="button-calculate"
        >
          {calculateMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Calculate Now
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Total KPIs Active"
          value={stats.total}
          icon={Target}
          colorClass="bg-primary/10 text-primary"
        />
        <SummaryCard
          title="KPIs with Alerts"
          value={stats.withAlerts}
          icon={AlertTriangle}
          description={stats.withAlerts > 0 ? "Requires attention" : "All within thresholds"}
          colorClass={stats.withAlerts > 0 
            ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" 
            : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"}
        />
        <SummaryCard
          title="Providers Ranked"
          value={rankings.length}
          icon={Trophy}
          colorClass="bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
        />
        <SummaryCard
          title="Last Calculated"
          value={stats.latestCalc === "Never" ? "Never" : "Recent"}
          icon={Clock}
          description={stats.latestCalc}
          colorClass="bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Provider Rankings
          </h2>
        </div>
        
        <CompositeScoreInfoCard />
        
        {isLoadingRankings ? (
          <Card>
            <CardContent className="p-4">
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        ) : (
          <ProviderRankingsTable rankings={rankings} />
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-category">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_LABELS[cat] || cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="alerts-only"
                checked={showAlertsOnly}
                onCheckedChange={setShowAlertsOnly}
                data-testid="switch-alerts-only"
              />
              <Label htmlFor="alerts-only" className="text-sm cursor-pointer">
                Show alerts only
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredKpis.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Calculator className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No KPIs Found</h3>
            <p className="text-muted-foreground">
              {kpis.length === 0
                ? "No KPI definitions have been created yet. Create KPIs in the KPI Builder first."
                : "No KPIs match your current filters. Try adjusting your search criteria."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredKpis.map((kpi) => (
            <KpiCard key={kpi.id} kpi={kpi} definitions={definitions} />
          ))}
        </div>
      )}
    </div>
  );
}
