import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  ShieldCheck,
  RotateCcw,
  CheckCircle,
  Clock,
  AlertTriangle,
  Activity,
  AlertCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MetricCard } from "@/components/metric-card";
import { formatCurrency } from "@/lib/format";
import { METRIC_GRID_5 } from "@/lib/grid";

interface KpiStats {
  totalImpact: number;
  prospectiveImpact: number;
  retrospectiveFindings: number;
  casesResolved: number;
  avgDetectionTime: number;
  totalDetections: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  categoryBreakdown: { name: string; value: number; color: string }[];
  monthlyData: { month: string; prospective: number; retrospective: number }[];
  topProviders: { id: string; name: string; riskScore: number; flaggedClaims: number; totalAmount: number; status: string }[];
}

function getRiskScoreColor(score: number): string {
  if (score >= 80) return "text-red-600 dark:text-red-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-green-600 dark:text-green-400";
}

function getStatusBadgeClass(status: string): string {
  switch (status) {
    case "Under Review":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
    case "Investigation":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "Resolved":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
}

export default function FWAKPIDashboard() {
  const [dateRange, setDateRange] = useState("this-month");
  
  const { data: stats, isLoading, error } = useQuery<KpiStats>({
    queryKey: ["/api/fwa/kpi-stats"],
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });

  // Only render actual values when data is loaded, prevents flashing zeros
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold" data-testid="page-title">FWA Impact Dashboard</h1>
            <p className="text-muted-foreground">Loading real-time analytics...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={`stat-${i}`} className="h-20 w-full" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[350px] w-full" />
          <Skeleton className="h-[350px] w-full" />
        </div>
        <Skeleton className="h-[350px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">FWA Impact Dashboard</h1>
          <p className="text-muted-foreground">Real-time fraud analytics</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load KPI data</h3>
            <p className="text-sm text-muted-foreground mb-4">{error.message}</p>
            <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayStats = stats || {
    totalImpact: 0,
    prospectiveImpact: 0,
    retrospectiveFindings: 0,
    casesResolved: 0,
    avgDetectionTime: 0,
    totalDetections: 0,
    highRiskCount: 0,
    mediumRiskCount: 0,
    lowRiskCount: 0,
    categoryBreakdown: [],
    monthlyData: [],
    topProviders: []
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Analytics & Reports</h1>
          <p className="text-muted-foreground">
            Trend analysis, impact metrics, and regulator-ready reporting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]" data-testid="select-date-range">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="this-quarter">This Quarter</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className={METRIC_GRID_5}>
        <MetricCard
              title="Total Impact"
              value={formatCurrency(displayStats.totalImpact)}
              subtitle="Prospective + Retrospective"
              icon={DollarSign}
            />
            <MetricCard
              title="Prospective Impact"
              value={formatCurrency(displayStats.prospectiveImpact)}
              subtitle="Live claims rejected/flagged"
              icon={ShieldCheck}
            />
            <MetricCard
              title="Retrospective Findings"
              value={formatCurrency(displayStats.retrospectiveFindings)}
              subtitle="Historical inappropriate care identified"
              icon={RotateCcw}
            />
            <MetricCard
              title="Cases Resolved"
              value={String(displayStats.casesResolved)}
              subtitle="Completed investigations"
              icon={CheckCircle}
            />
        <MetricCard
          title="Avg Detection Time"
          value={`${displayStats.avgDetectionTime} hrs`}
          subtitle="Time to flag suspicious claims"
          icon={Clock}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Detections</p>
                <p className="text-xl font-bold">{displayStats.totalDetections}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">High Risk</p>
                <p className="text-xl font-bold">{displayStats.highRiskCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Medium Risk</p>
                <p className="text-xl font-bold">{displayStats.mediumRiskCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Low Risk</p>
                <p className="text-xl font-bold">{displayStats.lowRiskCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="chart-prospective-vs-retrospective">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Prospective vs Retrospective Findings by Month</CardTitle>
          </CardHeader>
          <CardContent>
            {displayStats.monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={displayStats.monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis 
                    className="text-xs" 
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`SAR ${(value / 1000).toFixed(0)}K`, '']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="prospective" name="Prospective" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="retrospective" name="Retrospective" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No monthly data available yet. Run detection on claims to populate.
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="chart-fwa-category-breakdown">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">FWA Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={displayStats.categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {displayStats.categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`${value} cases`, 'Count']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {displayStats.categoryBreakdown.map((category) => (
                <div key={category.name} className="flex items-center gap-2" data-testid={`legend-${category.name.toLowerCase()}`}>
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm text-muted-foreground">{category.name}: {category.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="chart-detection-breakdown">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Detection Risk Level Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={[
                { level: 'Critical/High', count: displayStats.highRiskCount, color: '#ef4444' },
                { level: 'Medium', count: displayStats.mediumRiskCount, color: '#f59e0b' },
                { level: 'Low', count: displayStats.lowRiskCount, color: '#22c55e' }
              ]} 
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="level" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                formatter={(value: number) => [`${value} detections`, '']}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="count" name="Detections" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                {[
                  { level: 'Critical/High', count: displayStats.highRiskCount, color: '#ef4444' },
                  { level: 'Medium', count: displayStats.mediumRiskCount, color: '#f59e0b' },
                  { level: 'Low', count: displayStats.lowRiskCount, color: '#22c55e' }
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card data-testid="table-top-flagged-entities">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Top Flagged Providers</CardTitle>
        </CardHeader>
        <CardContent>
          {displayStats.topProviders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-center">Risk Score</TableHead>
                  <TableHead className="text-right">Flagged Claims</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayStats.topProviders.map((provider) => (
                  <TableRow key={provider.id} data-testid={`provider-row-${provider.id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{provider.name}</p>
                        <p className="text-xs text-muted-foreground">{provider.id}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-bold ${getRiskScoreColor(provider.riskScore)}`}>
                        {provider.riskScore.toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">{provider.flaggedClaims}</TableCell>
                    <TableCell className="text-right font-medium">
                      SAR {(provider.totalAmount / 1000).toFixed(0)}K
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeClass(provider.status)}>
                        {provider.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No high-risk providers detected yet. Run detection on claims to populate.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
