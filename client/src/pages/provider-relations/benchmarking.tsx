import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  ExternalLink,
  FileText,
  Plus,
  Info,
  Target,
  Layers,
  Loader2,
  Package,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { ProviderBenchmark as DBProviderBenchmark } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

type ProviderType = "Private" | "Government" | "Semi-Government";
type NetworkTier = "Tier 1" | "Tier 2" | "Tier 3";
type Region = "Central" | "Western" | "Eastern" | "Northern" | "Southern";

interface ProviderBenchmark {
  id: string;
  name: string;
  region: Region;
  city: string;
  providerType: ProviderType;
  networkTier: NetworkTier;
  serviceTypes: string[];
  claimsVolume: number;
  memberCount: number;
  cpm: number;
  peerAvgCpm: number;
  deviation: number;
  percentile: number;
  policyMix: string[];
  contractStructure: string;
  isOutlier: boolean;
  trend: "up" | "down" | "stable";
}

interface PeerMatchCriteria {
  region: Region | "all";
  providerType: ProviderType | "all";
  networkTier: NetworkTier | "all";
  serviceTypes: string[];
  volumeRangeEnabled: boolean;
  policyMixEnabled: boolean;
  contractStructureEnabled: boolean;
}

const allServiceTypes = [
  "Inpatient",
  "Outpatient",
  "Emergency",
  "Laboratory",
  "Radiology",
  "Pharmacy",
  "Dental",
  "Maternity",
  "Dialysis",
  "Oncology",
];

const allPolicies = [
  "VIP Plus",
  "VIP",
  "Gold",
  "Silver",
  "Bronze",
  "SME Basic",
  "SME Plus",
  "Corporate",
];

function transformDBBenchmarkToUI(dbBenchmark: DBProviderBenchmark): ProviderBenchmark {
  const cpm = parseFloat(dbBenchmark.costPerMember || "0");
  const peerPercentile = parseFloat(dbBenchmark.peerPercentile || "50");
  const deviation = parseFloat(dbBenchmark.deviationFromPeer || "0");
  const stdDevs = parseFloat(dbBenchmark.standardDeviations || "0");
  const serviceBreakdown = dbBenchmark.serviceBreakdown || {};
  const serviceTypes = Object.keys(serviceBreakdown);
  
  const peerAvgCpm = deviation !== 0 ? cpm / (1 + deviation / 100) : cpm;
  
  let trend: "up" | "down" | "stable" = "stable";
  if (deviation > 5) trend = "up";
  else if (deviation < -5) trend = "down";
  
  const regions: Region[] = ["Central", "Western", "Eastern", "Northern", "Southern"];
  const providerTypes: ProviderType[] = ["Private", "Government", "Semi-Government"];
  const networkTiers: NetworkTier[] = ["Tier 1", "Tier 2", "Tier 3"];
  
  const idHash = dbBenchmark.providerId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  
  return {
    id: dbBenchmark.providerId,
    name: dbBenchmark.providerName,
    region: regions[idHash % regions.length],
    city: regions[idHash % regions.length] === "Central" ? "Riyadh" : 
          regions[idHash % regions.length] === "Western" ? "Jeddah" :
          regions[idHash % regions.length] === "Eastern" ? "Dammam" : "Riyadh",
    providerType: providerTypes[idHash % providerTypes.length],
    networkTier: networkTiers[Math.min(2, Math.floor(peerPercentile / 40))] as NetworkTier,
    serviceTypes: serviceTypes.length > 0 ? serviceTypes : ["Outpatient", "Laboratory"],
    claimsVolume: dbBenchmark.totalClaims || 0,
    memberCount: dbBenchmark.memberCount || 0,
    cpm,
    peerAvgCpm,
    deviation,
    percentile: peerPercentile,
    policyMix: peerPercentile > 75 ? ["VIP Plus", "VIP", "Gold"] : 
               peerPercentile > 50 ? ["VIP", "Gold", "Silver"] : 
               ["Gold", "Silver", "Bronze"],
    contractStructure: peerPercentile > 80 ? "Package Based" : 
                       peerPercentile > 50 ? "Tiered Discount" : "Flat Discount",
    isOutlier: Math.abs(stdDevs) > 2,
    trend,
  };
}

function calculateStdDev(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squareDiffs = values.map(value => Math.pow(value - mean, 2));
  const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}

function calculatePolicyOverlap(policies1: string[], policies2: string[]): number {
  const intersection = policies1.filter(p => policies2.includes(p));
  return (intersection.length / Math.max(policies1.length, policies2.length)) * 100;
}

export default function BenchmarkingPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [showCriteriaPanel, setShowCriteriaPanel] = useState(false);
  const [evidencePackItems, setEvidencePackItems] = useState<string[]>([]);
  const [addToPackDialogOpen, setAddToPackDialogOpen] = useState(false);
  const [selectedForPack, setSelectedForPack] = useState<string | null>(null);

  const handleCreateEvidencePack = (providerId: string, providerName: string) => {
    const params = new URLSearchParams({
      action: "create",
      providerId,
      providerName,
    });
    setLocation(`/provider-relations/evidence-packs?${params.toString()}`);
  };

  const { data: dbBenchmarks = [], isLoading } = useQuery<DBProviderBenchmark[]>({
    queryKey: ["/api/provider-relations/benchmarks"],
  });

  const benchmarks = useMemo(() => {
    return dbBenchmarks.map(transformDBBenchmarkToUI);
  }, [dbBenchmarks]);

  const [criteria, setCriteria] = useState<PeerMatchCriteria>({
    region: "all",
    providerType: "all",
    networkTier: "all",
    serviceTypes: [],
    volumeRangeEnabled: true,
    policyMixEnabled: true,
    contractStructureEnabled: false,
  });

  const focusProvider = useMemo(() => {
    if (!selectedProvider) return null;
    return benchmarks.find(p => p.id === selectedProvider) || null;
  }, [selectedProvider, benchmarks]);

  const peerGroup = useMemo(() => {
    let peers = benchmarks;

    if (criteria.region !== "all") {
      peers = peers.filter(p => p.region === criteria.region);
    }
    if (criteria.providerType !== "all") {
      peers = peers.filter(p => p.providerType === criteria.providerType);
    }
    if (criteria.networkTier !== "all") {
      peers = peers.filter(p => p.networkTier === criteria.networkTier);
    }
    if (criteria.serviceTypes.length > 0) {
      peers = peers.filter(p => 
        criteria.serviceTypes.every(st => p.serviceTypes.includes(st))
      );
    }

    if (focusProvider && criteria.volumeRangeEnabled) {
      const minVolume = focusProvider.claimsVolume * 0.75;
      const maxVolume = focusProvider.claimsVolume * 1.25;
      peers = peers.filter(p => p.claimsVolume >= minVolume && p.claimsVolume <= maxVolume);
    }

    if (focusProvider && criteria.policyMixEnabled) {
      peers = peers.filter(p => 
        calculatePolicyOverlap(p.policyMix, focusProvider.policyMix) >= 50
      );
    }

    if (focusProvider && criteria.contractStructureEnabled) {
      peers = peers.filter(p => p.contractStructure === focusProvider.contractStructure);
    }

    if (searchQuery) {
      peers = peers.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return peers;
  }, [benchmarks, criteria, focusProvider, searchQuery]);

  const peerStats = useMemo(() => {
    if (peerGroup.length === 0) {
      return { avgCpm: 0, stdDev: 0, outliers: [], minCpm: 0, maxCpm: 0 };
    }
    const cpmValues = peerGroup.map(p => p.cpm);
    const avgCpm = cpmValues.reduce((a, b) => a + b, 0) / cpmValues.length;
    const stdDev = calculateStdDev(cpmValues);
    const outliers = peerGroup.filter(p => Math.abs(p.cpm - avgCpm) > 2 * stdDev);
    
    return {
      avgCpm,
      stdDev,
      outliers,
      minCpm: Math.min(...cpmValues),
      maxCpm: Math.max(...cpmValues),
    };
  }, [peerGroup]);

  const chartData = useMemo(() => {
    return peerGroup.map(p => ({
      name: p.name.length > 20 ? p.name.substring(0, 20) + "..." : p.name,
      fullName: p.name,
      id: p.id,
      cpm: p.cpm,
      deviation: ((p.cpm - peerStats.avgCpm) / peerStats.avgCpm * 100),
      isOutlier: Math.abs(p.cpm - peerStats.avgCpm) > 2 * peerStats.stdDev,
      isFocus: p.id === selectedProvider,
    })).sort((a, b) => b.deviation - a.deviation);
  }, [peerGroup, peerStats, selectedProvider]);

  const handleAddToEvidencePack = (providerId: string) => {
    setSelectedForPack(providerId);
    setAddToPackDialogOpen(true);
  };

  const confirmAddToEvidencePack = () => {
    if (selectedForPack && !evidencePackItems.includes(selectedForPack)) {
      setEvidencePackItems([...evidencePackItems, selectedForPack]);
    }
    setAddToPackDialogOpen(false);
    setSelectedForPack(null);
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <span className="h-4 w-4 text-muted-foreground">-</span>;
    }
  };

  const getDeviationBadge = (deviation: number) => {
    if (deviation > 25) {
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">High +{deviation.toFixed(1)}%</Badge>;
    } else if (deviation > 10) {
      return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">+{deviation.toFixed(1)}%</Badge>;
    } else if (deviation < -10) {
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{deviation.toFixed(1)}%</Badge>;
    } else {
      return <Badge variant="outline">{deviation > 0 ? "+" : ""}{deviation.toFixed(1)}%</Badge>;
    }
  };

  const getPercentileBadge = (percentile: number) => {
    if (percentile >= 90) {
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">P{percentile}</Badge>;
    } else if (percentile >= 75) {
      return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">P{percentile}</Badge>;
    } else if (percentile <= 25) {
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">P{percentile}</Badge>;
    } else {
      return <Badge variant="outline">P{percentile}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="page-title">Provider Benchmarking</h1>
            <p className="text-muted-foreground">
              CPM analysis with peer matching based on region, type, network, and service capabilities
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Loading benchmark data...</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-11 w-11 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-80" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[350px] w-full" />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-12 flex-1" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Provider Benchmarking</h1>
          <p className="text-muted-foreground">
            CPM analysis with peer matching based on region, type, network, and service capabilities
          </p>
        </div>
        <div className="flex items-center gap-2">
          {evidencePackItems.length > 0 && (
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-view-pack">
              <FileText className="h-4 w-4" />
              Evidence Pack ({evidencePackItems.length})
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-2" data-testid="button-export">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {benchmarks.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Benchmark Data Available</h3>
            <p className="text-muted-foreground mb-4">
              There is no provider benchmark data in the system yet. Benchmark data is generated from claims processing and provider analysis.
            </p>
          </CardContent>
        </Card>
      )}

      {benchmarks.length > 0 && (
        <>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Peer Group Size</p>
                <p className="text-2xl font-bold" data-testid="text-peer-count">{peerGroup.length}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg CPM</p>
                <p className="text-2xl font-bold" data-testid="text-avg-cpm">SAR {peerStats.avgCpm.toFixed(0)}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Std Deviation</p>
                <p className="text-2xl font-bold" data-testid="text-std-dev">SAR {peerStats.stdDev.toFixed(0)}</p>
              </div>
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <BarChart3 className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">CPM Range</p>
                <p className="text-2xl font-bold" data-testid="text-cpm-range">
                  {peerStats.minCpm.toFixed(0)} - {peerStats.maxCpm.toFixed(0)}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <Target className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Outliers (&gt;2 SD)</p>
                <p className="text-2xl font-bold text-red-600" data-testid="text-outliers">
                  {peerStats.outliers.length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              Peer Matching Criteria
            </CardTitle>
            <CardDescription>
              Configure filters to define the peer comparison group
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Focus Provider</Label>
              <Select value={selectedProvider || "none"} onValueChange={(v) => setSelectedProvider(v === "none" ? null : v)}>
                <SelectTrigger data-testid="select-focus-provider">
                  <SelectValue placeholder="Select a provider to focus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No focus (view all)</SelectItem>
                  {benchmarks.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Badge variant="outline" className="text-xs">Hard Filters</Badge>
                Required match criteria
              </p>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Region</Label>
                <Select value={criteria.region} onValueChange={(v) => setCriteria({...criteria, region: v as Region | "all"})}>
                  <SelectTrigger data-testid="select-region">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Regions</SelectItem>
                    <SelectItem value="Central">Central</SelectItem>
                    <SelectItem value="Western">Western</SelectItem>
                    <SelectItem value="Eastern">Eastern</SelectItem>
                    <SelectItem value="Northern">Northern</SelectItem>
                    <SelectItem value="Southern">Southern</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Provider Type</Label>
                <Select value={criteria.providerType} onValueChange={(v) => setCriteria({...criteria, providerType: v as ProviderType | "all"})}>
                  <SelectTrigger data-testid="select-provider-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Private">Private</SelectItem>
                    <SelectItem value="Government">Government</SelectItem>
                    <SelectItem value="Semi-Government">Semi-Government</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Network Tier</Label>
                <Select value={criteria.networkTier} onValueChange={(v) => setCriteria({...criteria, networkTier: v as NetworkTier | "all"})}>
                  <SelectTrigger data-testid="select-network-tier">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tiers</SelectItem>
                    <SelectItem value="Tier 1">Tier 1</SelectItem>
                    <SelectItem value="Tier 2">Tier 2</SelectItem>
                    <SelectItem value="Tier 3">Tier 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Service Types</Label>
                <Select 
                  value={criteria.serviceTypes.length === 0 ? "all" : criteria.serviceTypes[0]}
                  onValueChange={(v) => setCriteria({...criteria, serviceTypes: v === "all" ? [] : [v]})}
                >
                  <SelectTrigger data-testid="select-service-types">
                    <SelectValue placeholder="Select service type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    {allServiceTypes.map(st => (
                      <SelectItem key={st} value={st}>{st}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Badge variant="secondary" className="text-xs">Soft Filters</Badge>
                Optional similarity matching
              </p>

              <div className="flex items-center gap-2">
                <Checkbox 
                  id="volume-range" 
                  checked={criteria.volumeRangeEnabled}
                  onCheckedChange={(checked) => setCriteria({...criteria, volumeRangeEnabled: !!checked})}
                  data-testid="checkbox-volume-range"
                />
                <Label htmlFor="volume-range" className="text-sm cursor-pointer">
                  Volume Range (+/- 25%)
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Match providers with claims volume within 25% of focus provider</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox 
                  id="policy-mix" 
                  checked={criteria.policyMixEnabled}
                  onCheckedChange={(checked) => setCriteria({...criteria, policyMixEnabled: !!checked})}
                  data-testid="checkbox-policy-mix"
                />
                <Label htmlFor="policy-mix" className="text-sm cursor-pointer">
                  Policy Mix (&gt;50% overlap)
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Match providers with more than 50% overlap in policy types</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox 
                  id="contract-structure" 
                  checked={criteria.contractStructureEnabled}
                  onCheckedChange={(checked) => setCriteria({...criteria, contractStructureEnabled: !!checked})}
                  data-testid="checkbox-contract-structure"
                />
                <Label htmlFor="contract-structure" className="text-sm cursor-pointer">
                  Contract Structure
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Match providers with same contract/discount model</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {focusProvider && (
              <>
                <Separator />
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium">Focus Provider Details</p>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Region:</span>
                      <span>{focusProvider.region}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span>{focusProvider.providerType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Network:</span>
                      <span>{focusProvider.networkTier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CPM:</span>
                      <span className="font-medium">SAR {focusProvider.cpm.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Claims:</span>
                      <span>{focusProvider.claimsVolume.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              CPM Deviation from Peer Average
            </CardTitle>
            <CardDescription>
              Providers sorted by deviation percentage. Red bars indicate outliers (&gt;2 std dev)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number" 
                    tickFormatter={(v) => `${v > 0 ? "+" : ""}${v.toFixed(0)}%`}
                    domain={['dataMin - 5', 'dataMax + 5']}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={150} 
                    tick={{ fontSize: 11 }}
                  />
                  <RechartsTooltip 
                    formatter={(value: number) => [
                      `${value > 0 ? "+" : ""}${value.toFixed(2)}%`,
                      "Deviation"
                    ]}
                    labelFormatter={(label: string, payload: any[]) => {
                      if (payload && payload[0]) {
                        return `${payload[0].payload.fullName} (CPM: SAR ${payload[0].payload.cpm})`;
                      }
                      return label;
                    }}
                  />
                  <ReferenceLine x={0} stroke="#666" strokeWidth={2} />
                  <Bar dataKey="deviation" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={
                          entry.isFocus 
                            ? "hsl(196, 78%, 52%)" 
                            : entry.isOutlier 
                              ? "hsl(0, 85%, 60%)" 
                              : entry.deviation > 0 
                                ? "hsl(38, 95%, 50%)" 
                                : "hsl(142, 70%, 45%)"
                        }
                        stroke={entry.isFocus ? "hsl(196, 78%, 35%)" : undefined}
                        strokeWidth={entry.isFocus ? 2 : 0}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span>Outlier (&gt;2 SD)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-amber-500" />
                <span>Above Average</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span>Below Average</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-primary" />
                <span>Focus Provider</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
          <div>
            <CardTitle>Provider Comparison Table</CardTitle>
            <CardDescription>
              CPM benchmarking with deviation and percentile analysis
            </CardDescription>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search providers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
              data-testid="input-provider-search"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Region</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Network</TableHead>
                <TableHead className="text-right">CPM (SAR)</TableHead>
                <TableHead className="text-right">Peer Avg</TableHead>
                <TableHead>Deviation</TableHead>
                <TableHead>Percentile</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {peerGroup.map((provider) => {
                const isOutlier = Math.abs(provider.cpm - peerStats.avgCpm) > 2 * peerStats.stdDev;
                const deviation = ((provider.cpm - peerStats.avgCpm) / peerStats.avgCpm) * 100;
                const inPack = evidencePackItems.includes(provider.id);
                
                return (
                  <TableRow 
                    key={provider.id} 
                    className={`cursor-pointer ${provider.id === selectedProvider ? "bg-primary/5" : ""}`}
                    data-testid={`row-provider-${provider.id}`}
                  >
                    <TableCell>
                      {isOutlier && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Statistical outlier (&gt;2 standard deviations)</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{provider.name}</span>
                        <span className="text-xs text-muted-foreground">{provider.id} • {provider.city}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{provider.region}</Badge>
                    </TableCell>
                    <TableCell>{provider.providerType}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{provider.networkTier}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {provider.cpm.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {peerStats.avgCpm.toFixed(0)}
                    </TableCell>
                    <TableCell>
                      {getDeviationBadge(deviation)}
                    </TableCell>
                    <TableCell>
                      {getPercentileBadge(provider.percentile)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(provider.trend)}
                        <span className="text-xs text-muted-foreground capitalize">{provider.trend}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {isOutlier && (
                          <>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleCreateEvidencePack(provider.id, provider.name)}
                                  data-testid={`button-table-create-pack-${provider.id}`}
                                >
                                  <Package className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Create Evidence Pack</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleAddToEvidencePack(provider.id)}
                                  className={inPack ? "text-green-600" : ""}
                                  data-testid={`button-add-pack-${provider.id}`}
                                >
                                  {inPack ? <CheckCircle className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{inPack ? "In Evidence Pack" : "Add to Evidence Pack"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" asChild data-testid={`button-detail-${provider.id}`}>
                              <Link href={`/provider-relations/providers/${provider.id}`}>
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View Provider Detail</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {peerGroup.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                    No providers match the current criteria. Try adjusting the filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {peerStats.outliers.length > 0 && (
        <Card className="border-red-200 dark:border-red-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Outlier Providers Detected
            </CardTitle>
            <CardDescription>
              These providers have CPM values more than 2 standard deviations from the peer average
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {peerStats.outliers.map(outlier => {
                const deviation = ((outlier.cpm - peerStats.avgCpm) / peerStats.avgCpm) * 100;
                const inPack = evidencePackItems.includes(outlier.id);
                
                return (
                  <div 
                    key={outlier.id}
                    className="border border-red-200 dark:border-red-900/50 rounded-lg p-4 bg-red-50/50 dark:bg-red-900/10"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{outlier.name}</p>
                        <p className="text-xs text-muted-foreground">{outlier.id} • {outlier.city}</p>
                      </div>
                      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        {deviation > 0 ? "+" : ""}{deviation.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CPM:</span>
                        <span className="font-medium">SAR {outlier.cpm.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Peer Average:</span>
                        <span>SAR {peerStats.avgCpm.toFixed(0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Excess:</span>
                        <span className="text-red-600 font-medium">
                          SAR {(outlier.cpm - peerStats.avgCpm).toFixed(0)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-2">
                      <Button 
                        size="sm" 
                        className="w-full gap-1"
                        onClick={() => handleCreateEvidencePack(outlier.id, outlier.name)}
                        data-testid={`button-create-evidence-pack-${outlier.id}`}
                      >
                        <Package className="h-4 w-4" />
                        Create Evidence Pack
                      </Button>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleAddToEvidencePack(outlier.id)}
                          disabled={inPack}
                          data-testid={`button-outlier-pack-${outlier.id}`}
                        >
                          {inPack ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              In Pack
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-1" />
                              Add to Pack
                            </>
                          )}
                        </Button>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" asChild data-testid={`button-view-outlier-${outlier.id}`}>
                              <Link href={`/provider-relations/providers/${outlier.id}`}>
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View Provider Details</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
        </>
      )}

      <Dialog open={addToPackDialogOpen} onOpenChange={setAddToPackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Evidence Pack</DialogTitle>
            <DialogDescription>
              Add this provider's CPM deviation data to the evidence pack for settlement negotiations.
            </DialogDescription>
          </DialogHeader>
          {selectedForPack && (
            <div className="py-4">
              {(() => {
                const provider = benchmarks.find(p => p.id === selectedForPack);
                if (!provider) return null;
                const deviation = ((provider.cpm - peerStats.avgCpm) / peerStats.avgCpm) * 100;
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{provider.name}</span>
                      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        Outlier
                      </Badge>
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CPM:</span>
                        <span>SAR {provider.cpm.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Deviation:</span>
                        <span className="text-red-600">{deviation > 0 ? "+" : ""}{deviation.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Potential Recovery:</span>
                        <span className="font-medium">SAR {((provider.cpm - peerStats.avgCpm) * provider.memberCount).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddToPackDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmAddToEvidencePack} data-testid="button-confirm-add-pack">
              <FileText className="h-4 w-4 mr-2" />
              Add to Evidence Pack
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
