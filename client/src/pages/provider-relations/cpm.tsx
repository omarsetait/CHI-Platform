import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Download,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  Calendar,
  Loader2,
} from "lucide-react";
import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProviderCpmMetric } from "@shared/schema";

interface CpmSummary {
  totalProviders: number;
  averageCpm: string;
  highestCpm: {
    providerId: string;
    providerName: string;
    cpm: string;
  } | null;
  lowestCpm: {
    providerId: string;
    providerName: string;
    cpm: string;
  } | null;
  trendSummary: string;
  totalMembers: number;
  totalCost: string;
}

export default function CpmAnalyticsPage() {
  const [period, setPeriod] = useState("q4-2024");

  const { data: cpmMetrics = [], isLoading: isLoadingMetrics } = useQuery<ProviderCpmMetric[]>({
    queryKey: ["/api/provider-relations/cpm-analytics"],
  });

  const { data: cpmSummary, isLoading: isLoadingSummary } = useQuery<CpmSummary>({
    queryKey: ["/api/provider-relations/cpm-analytics/summary"],
  });

  const isLoading = isLoadingMetrics || isLoadingSummary;

  const filteredMetrics = useMemo(() => {
    const [quarter, year] = period.split("-");
    const quarterFormatted = quarter.toUpperCase();
    const yearNum = parseInt(year);
    return cpmMetrics.filter(m => 
      m.quarter === quarterFormatted && m.year === yearNum
    );
  }, [cpmMetrics, period]);

  const uniqueProviderMetrics = useMemo(() => {
    const providerMap = new Map<string, ProviderCpmMetric>();
    filteredMetrics.forEach(m => {
      if (!providerMap.has(m.providerId) || 
          (m.year > (providerMap.get(m.providerId)?.year || 0))) {
        providerMap.set(m.providerId, m);
      }
    });
    return Array.from(providerMap.values());
  }, [filteredMetrics]);

  const stats = useMemo(() => {
    const totalMembers = uniqueProviderMetrics.reduce((sum, m) => sum + (m.memberCount || 0), 0);
    const totalCost = uniqueProviderMetrics.reduce((sum, m) => sum + parseFloat(m.totalCost || "0"), 0);
    const avgCpm = totalMembers > 0 ? totalCost / totalMembers : 0;
    const cpmValues = uniqueProviderMetrics
      .filter(m => m.cpm != null)
      .map(m => parseFloat(m.cpm || "0"));
    const highestCpm = cpmValues.length > 0 ? Math.max(...cpmValues) : 0;
    
    return { totalMembers, totalCost, avgCpm, highestCpm };
  }, [uniqueProviderMetrics]);

  const cpmTrendData = useMemo(() => {
    const quarterOrder = ["Q1", "Q2", "Q3", "Q4"];
    const quarterMonthMap: Record<string, string[]> = {
      "Q1": ["Jan", "Feb", "Mar"],
      "Q2": ["Apr", "May", "Jun"],
      "Q3": ["Jul", "Aug", "Sep"],
      "Q4": ["Oct", "Nov", "Dec"],
    };
    
    const trendByQuarter: Record<string, { "2024": number; "2023": number }> = {};
    
    cpmMetrics.forEach(m => {
      const key = m.quarter;
      if (!trendByQuarter[key]) {
        trendByQuarter[key] = { "2024": 0, "2023": 0 };
      }
      const yearKey = m.year === 2024 ? "2024" : "2023";
      const currentCpm = parseFloat(m.cpm || "0");
      if (currentCpm > trendByQuarter[key][yearKey]) {
        trendByQuarter[key][yearKey] = currentCpm;
      }
    });
    
    return quarterOrder.map(q => ({
      month: q,
      "2023": trendByQuarter[q]?.["2023"] || 0,
      "2024": trendByQuarter[q]?.["2024"] || 0,
    })).filter(d => d["2023"] > 0 || d["2024"] > 0);
  }, [cpmMetrics]);

  const cpmByTierData = useMemo(() => {
    const tierMap: Record<string, { cpmSum: number; count: number; benchmarkSum: number }> = {};
    
    uniqueProviderMetrics.forEach(m => {
      const tier = m.networkTier || "Other";
      if (!tierMap[tier]) {
        tierMap[tier] = { cpmSum: 0, count: 0, benchmarkSum: 0 };
      }
      tierMap[tier].cpmSum += parseFloat(m.cpm || "0");
      tierMap[tier].benchmarkSum += parseFloat(m.benchmarkCpm || "0");
      tierMap[tier].count += 1;
    });
    
    return Object.entries(tierMap)
      .map(([tier, data]) => ({
        tier,
        cpm: data.count > 0 ? Math.round(data.cpmSum / data.count) : 0,
        benchmark: data.count > 0 ? Math.round(data.benchmarkSum / data.count) : 0,
      }))
      .sort((a, b) => a.tier.localeCompare(b.tier));
  }, [uniqueProviderMetrics]);

  const displayMetrics = useMemo(() => {
    return uniqueProviderMetrics.map(m => {
      const cpmValue = parseFloat(m.cpm || "0");
      const peerAvg = parseFloat(m.peerAvgCpm || "0");
      const cpmChange = peerAvg > 0 ? ((cpmValue - peerAvg) / peerAvg) * 100 : 0;
      
      return {
        id: m.providerId,
        name: m.providerName,
        memberCount: m.memberCount || 0,
        totalCost: parseFloat(m.totalCost || "0"),
        cpm: cpmValue,
        cpmChange: Number(cpmChange.toFixed(1)),
        tier: m.networkTier || "Other",
      };
    }).sort((a, b) => b.cpm - a.cpm);
  }, [uniqueProviderMetrics]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                  <Skeleton className="h-11 w-11 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayTotalMembers = cpmSummary?.totalMembers || stats.totalMembers;
  const displayTotalCost = cpmSummary?.totalCost ? parseFloat(cpmSummary.totalCost) : stats.totalCost;
  const displayAvgCpm = cpmSummary?.averageCpm ? parseFloat(cpmSummary.averageCpm) : stats.avgCpm;
  const displayHighestCpm = cpmSummary?.highestCpm?.cpm 
    ? parseFloat(cpmSummary.highestCpm.cpm) 
    : stats.highestCpm;

  const hasData = displayMetrics.length > 0 || cpmMetrics.length > 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">CPM Analytics</h1>
          <p className="text-muted-foreground">
            Cost Per Member analysis across provider network
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36" data-testid="select-period">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="q4-2024">Q4 2024</SelectItem>
              <SelectItem value="q3-2024">Q3 2024</SelectItem>
              <SelectItem value="q2-2024">Q2 2024</SelectItem>
              <SelectItem value="q1-2024">Q1 2024</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-2" data-testid="button-export">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold" data-testid="text-total-members">
                  {displayTotalMembers.toLocaleString()}
                </p>
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
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-2xl font-bold" data-testid="text-total-cost">
                  SAR {(displayTotalCost / 1000000).toFixed(1)}M
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average CPM</p>
                <p className="text-2xl font-bold" data-testid="text-avg-cpm">
                  SAR {displayAvgCpm.toFixed(0)}
                </p>
                {cpmSummary?.trendSummary && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {cpmSummary.trendSummary}
                  </p>
                )}
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
                <p className="text-sm text-muted-foreground">Highest CPM</p>
                <p className="text-2xl font-bold text-red-600" data-testid="text-highest-cpm">
                  SAR {displayHighestCpm.toFixed(0)}
                </p>
                {cpmSummary?.highestCpm?.providerName && (
                  <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                    {cpmSummary.highestCpm.providerName}
                  </p>
                )}
              </div>
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <Building2 className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">CPM Trend (2023 vs 2024)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {cpmTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={cpmTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={['auto', 'auto']} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="2023" stroke="#94a3b8" strokeWidth={2} />
                    <Line type="monotone" dataKey="2024" stroke="#0ea5e9" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No trend data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">CPM by Provider Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {cpmByTierData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cpmByTierData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 'auto']} />
                    <YAxis dataKey="tier" type="category" width={60} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="cpm" fill="#0ea5e9" name="Actual CPM" />
                    <Bar dataKey="benchmark" fill="#94a3b8" name="Benchmark" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No tier data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provider CPM Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          {displayMetrics.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider ID</TableHead>
                  <TableHead>Provider Name</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Members</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">CPM</TableHead>
                  <TableHead>vs Peers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayMetrics.map((provider) => (
                  <TableRow 
                    key={provider.id} 
                    className="cursor-pointer hover-elevate"
                    data-testid={`row-cpm-${provider.id}`}
                  >
                    <TableCell className="font-medium">{provider.id}</TableCell>
                    <TableCell>{provider.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{provider.tier}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{provider.memberCount.toLocaleString()}</TableCell>
                    <TableCell className="text-right">SAR {(provider.totalCost / 1000000).toFixed(2)}M</TableCell>
                    <TableCell className="text-right font-medium">SAR {provider.cpm.toFixed(0)}</TableCell>
                    <TableCell>
                      <div className={`flex items-center gap-1 ${provider.cpmChange > 0 ? "text-red-600" : "text-green-600"}`}>
                        {provider.cpmChange > 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        <span>{provider.cpmChange > 0 ? "+" : ""}{provider.cpmChange}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No CPM Data Available</p>
              <p className="text-sm">
                {hasData 
                  ? "No data found for the selected period. Try selecting a different quarter."
                  : "CPM metrics will appear here once data is available."
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
