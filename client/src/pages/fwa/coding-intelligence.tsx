import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { QueryErrorState } from "@/components/error-boundary";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Stethoscope,
  Clock,
  CheckCircle,
  XCircle,
  Activity,
  AlertTriangle,
  BarChart3,
  Search,
  Lightbulb,
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
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// Types
interface RejectionTrend {
  month: string;
  total: number;
  accepted: number;
  rejected: number;
  acceptanceRate: number;
}

interface FrequencyPair {
  icdCode: string;
  icdDescription: string;
  cptCode: string;
  cptDescription: string;
  total: number;
  accepted: number;
  rejected: number;
  acceptanceRate: number;
  // Legacy field aliases for backward compatibility
  diagnosis?: string;
  procedure?: string;
  volume?: number;
}

interface ValidationResult {
  decision: "ACCEPT" | "REJECT";
  icdCode: string;
  cptCode: string;
  confidence: number;
  historicalAcceptanceRate: number;
  reason: string;
}

interface ProcessingMetrics {
  avgProcessingTimeMs: number;
  totalProcessed: number;
  commonRejectionReasons: {
    reason: string;
    count: number;
    percentage: number;
  }[];
}

// CHI brand colors: primary cyan-blue, deeper blue, purple accent, and complementary tones
const CHI_CYAN = "#28AAE2";
const CHI_BLUE = "#1863DC";
const CHI_PURPLE = "#7C3AED";
const PIE_COLORS = [CHI_CYAN, CHI_BLUE, CHI_PURPLE, "#06B6D4", "#3B82F6", "#A78BFA"];

export default function CodingIntelligencePage() {
  const [activeTab, setActiveTab] = useState("validator");
  const [icdCode, setIcdCode] = useState("");
  const [cptCode, setCptCode] = useState("");
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);

  // Data queries
  const { data: trendsData, isLoading: trendsLoading, error: trendsError, refetch: refetchTrends } = useQuery<{ trends: RejectionTrend[] }>({
    queryKey: ["/api/fwa/cpoe/rejection-trends"],
  });

  const { data: frequencyData, isLoading: frequencyLoading, error: frequencyError, refetch: refetchFrequency } = useQuery<{ pairs: FrequencyPair[] }>({
    queryKey: ["/api/fwa/cpoe/frequency-table"],
  });

  const { data: metricsData, isLoading: metricsLoading, error: metricsError, refetch: refetchMetrics } = useQuery<ProcessingMetrics>({
    queryKey: ["/api/fwa/cpoe/processing-metrics"],
  });

  // Validation mutation
  const validateMutation = useMutation({
    mutationFn: async ({ icdCode, cptCode }: { icdCode: string; cptCode: string }) => {
      const res = await apiRequest("POST", "/api/fwa/cpoe/validate-pair", { icdCode, cptCode });
      return res.json() as Promise<ValidationResult>;
    },
    onSuccess: (data) => {
      setValidationResult(data);
    },
  });

  const handleValidate = () => {
    if (!icdCode.trim() || !cptCode.trim()) return;
    setValidationResult(null);
    validateMutation.mutate({ icdCode: icdCode.trim(), cptCode: cptCode.trim() });
  };

  // Compute summary values
  const latestTrend = trendsData?.trends?.[trendsData.trends.length - 1];
  const currentAcceptanceRate = latestTrend?.acceptanceRate ?? 0;
  const topRejectionReason = metricsData?.commonRejectionReasons?.[0]?.reason ?? "N/A";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Stethoscope className="w-7 h-7 text-purple-600 dark:text-purple-400" />
          <h1 className="text-2xl font-bold">Medical Coding Intelligence</h1>
        </div>
        <p className="text-muted-foreground" dir="rtl">
          ذكاء الترميز الطبي
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Claims Processed</p>
                {metricsError ? (
                  <p className="text-sm text-destructive">Failed to load</p>
                ) : metricsLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <p className="text-3xl font-bold">
                    {(metricsData?.totalProcessed ?? 0).toLocaleString()}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">Total validated encounters</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <Activity className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Avg Processing Time</p>
                {metricsError ? (
                  <p className="text-sm text-destructive">Failed to load</p>
                ) : metricsLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <p className="text-3xl font-bold">
                    {metricsData?.avgProcessingTimeMs ?? 0}ms
                  </p>
                )}
                <p className="text-xs text-muted-foreground">Per encounter validation</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Current Acceptance Rate</p>
                {trendsError ? (
                  <p className="text-sm text-destructive">Failed to load</p>
                ) : trendsLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {currentAcceptanceRate}%
                  </p>
                )}
                <p className="text-xs text-muted-foreground">Latest month performance</p>
              </div>
              <div className="p-3 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Top Rejection Reason</p>
                {metricsError ? (
                  <p className="text-sm text-destructive">Failed to load</p>
                ) : metricsLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <p className="text-lg font-semibold leading-tight">
                    {topRejectionReason}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {metricsData?.commonRejectionReasons?.[0]?.percentage ?? 0}% of rejections
                </p>
              </div>
              <div className="p-3 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="validator">Pair Validator</TabsTrigger>
          <TabsTrigger value="trends">Rejection Trends</TabsTrigger>
          <TabsTrigger value="frequency">Frequency Analysis</TabsTrigger>
          <TabsTrigger value="reasons">Rejection Reasons</TabsTrigger>
        </TabsList>

        {/* Tab 1: Pair Validator */}
        <TabsContent value="validator" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Validate Code Pair
                </CardTitle>
                <CardDescription>
                  Enter an ICD-10 diagnosis code and CPT procedure code to check if the pair is valid
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="icd-input">ICD-10 Code</Label>
                  <Input
                    id="icd-input"
                    placeholder="e.g. O80, J06.9, E11.9"
                    value={icdCode}
                    onChange={(e) => setIcdCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleValidate()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpt-input">CPT Code</Label>
                  <Input
                    id="cpt-input"
                    placeholder="e.g. 59510, 99215, D2740"
                    value={cptCode}
                    onChange={(e) => setCptCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleValidate()}
                  />
                </div>
                <Button
                  onClick={handleValidate}
                  disabled={!icdCode.trim() || !cptCode.trim() || validateMutation.isPending}
                  className="w-full"
                >
                  {validateMutation.isPending ? "Validating..." : "Validate Pair"}
                </Button>
              </CardContent>
            </Card>

            {/* Result Card */}
            <div className="space-y-4">
              {validationResult && (
                <Card
                  className={
                    validationResult.decision === "ACCEPT"
                      ? "border-green-300 dark:border-green-700"
                      : "border-red-300 dark:border-red-700"
                  }
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {validationResult.decision === "ACCEPT" ? (
                        <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                      )}
                      <span
                        className={
                          validationResult.decision === "ACCEPT"
                            ? "text-green-700 dark:text-green-300"
                            : "text-red-700 dark:text-red-300"
                        }
                      >
                        {validationResult.decision}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">ICD-10 Code</p>
                        <p className="font-mono font-semibold">{validationResult.icdCode}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">CPT Code</p>
                        <p className="font-mono font-semibold">{validationResult.cptCode}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Confidence</p>
                        <p className="font-semibold">{validationResult.confidence}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Historical Acceptance Rate</p>
                        <p className="font-semibold">{validationResult.historicalAcceptanceRate}%</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm mb-1">Reason</p>
                      <p className="text-sm leading-relaxed">{validationResult.reason}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Demo hints */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Demo Hints
                  </CardTitle>
                  <CardDescription>Try these pairs to see different validation results</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">REJECT</Badge>
                      <span className="font-mono">K04.7 + D2740</span>
                      <span className="text-muted-foreground">- Dental ring case: periapical abscess + crown</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">REJECT</Badge>
                      <span className="font-mono">O80 + 59510</span>
                      <span className="text-muted-foreground">- OB/GYN case: normal delivery + C-section billing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">REJECT</Badge>
                      <span className="font-mono">J06.9 + 99215</span>
                      <span className="text-muted-foreground">- Upcoding: common cold + high-complexity visit</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">REJECT</Badge>
                      <span className="font-mono">K02.1 + D7210</span>
                      <span className="text-muted-foreground">- Dental caries + extraction (should be filling)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-xs">REJECT</Badge>
                      <span className="font-mono">Z34.0 + 59510</span>
                      <span className="text-muted-foreground">- Prenatal supervision + C-section (sequence error)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">ACCEPT</Badge>
                      <span className="font-mono">Z23 + 90686</span>
                      <span className="text-muted-foreground">- Normal: immunization (should ACCEPT)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">ACCEPT</Badge>
                      <span className="font-mono">E11.9 + 99213</span>
                      <span className="text-muted-foreground">- Diabetes routine visit (should ACCEPT)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Rejection Trends */}
        <TabsContent value="trends" className="space-y-6">
          {trendsError ? (
            <QueryErrorState error={trendsError} onRetry={() => refetchTrends()} title="Failed to load rejection trends" />
          ) : trendsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-[350px] w-full" />
              <Skeleton className="h-[300px] w-full" />
            </div>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Accepted vs Rejected Claims</CardTitle>
                  <CardDescription>
                    Stacked view of claim outcomes over the past 12 months
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendsData?.trends ?? []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            value.toLocaleString(),
                            name === "accepted" ? "Accepted" : "Rejected",
                          ]}
                        />
                        <Legend />
                        <Bar dataKey="accepted" stackId="a" fill={CHI_CYAN} name="Accepted" />
                        <Bar dataKey="rejected" stackId="a" fill={CHI_PURPLE} name="Rejected" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Acceptance Rate Trend</CardTitle>
                  <CardDescription>
                    Acceptance rate percentage over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendsData?.trends ?? []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis domain={[80, 100]} tickFormatter={(v) => `${v}%`} />
                        <Tooltip formatter={(value: number) => [`${value}%`, "Acceptance Rate"]} />
                        <Line
                          type="monotone"
                          dataKey="acceptanceRate"
                          stroke={CHI_BLUE}
                          strokeWidth={3}
                          dot={{ r: 5, fill: CHI_BLUE }}
                          name="Acceptance Rate"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Tab 3: Frequency Analysis */}
        <TabsContent value="frequency">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                ICD-CPT Pair Frequency Table
              </CardTitle>
              <CardDescription>
                Top diagnosis-procedure pairs by volume with acceptance rate indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              {frequencyError ? (
                <QueryErrorState error={frequencyError} onRetry={() => refetchFrequency()} title="Failed to load frequency data" />
              ) : frequencyLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ICD Code</TableHead>
                      <TableHead>Diagnosis</TableHead>
                      <TableHead>CPT Code</TableHead>
                      <TableHead>Procedure</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Accepted</TableHead>
                      <TableHead className="text-right">Rejected</TableHead>
                      <TableHead className="text-right">Acceptance Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(frequencyData?.pairs ?? []).map((pair, idx) => (
                      <TableRow key={`${pair.icdCode}-${pair.cptCode}-${idx}`}>
                        <TableCell className="font-mono font-semibold">{pair.icdCode}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{pair.icdDescription ?? pair.diagnosis}</TableCell>
                        <TableCell className="font-mono font-semibold">{pair.cptCode}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{pair.cptDescription ?? pair.procedure}</TableCell>
                        <TableCell className="text-right">{(pair.total ?? pair.volume ?? 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{(pair.accepted ?? 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{(pair.rejected ?? 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            className={
                              pair.acceptanceRate >= 90
                                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                                : pair.acceptanceRate >= 70
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300"
                                  : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                            }
                          >
                            {pair.acceptanceRate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Rejection Reasons */}
        <TabsContent value="reasons" className="space-y-6">
          {metricsError ? (
            <QueryErrorState error={metricsError} onRetry={() => refetchMetrics()} title="Failed to load rejection reasons" />
          ) : metricsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-[350px] w-full" />
              <Skeleton className="h-[200px] w-full" />
            </div>
          ) : (
            <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Rejection Reasons Distribution</CardTitle>
                  <CardDescription>
                    Breakdown of the most common reasons for claim rejection
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={metricsData?.commonRejectionReasons ?? []}
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          dataKey="count"
                          nameKey="reason"
                          label={({ percentage }) => `${percentage}%`}
                        >
                          {(metricsData?.commonRejectionReasons ?? []).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number, name: string) => [
                            value.toLocaleString(),
                            name,
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Rejection Reasons Detail</CardTitle>
                  <CardDescription>
                    Counts and percentages of each rejection category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(metricsData?.commonRejectionReasons ?? []).map((item, index) => (
                      <div key={item.reason} className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.reason}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{item.count.toLocaleString()} cases</span>
                            <span>-</span>
                            <span>{item.percentage}%</span>
                          </div>
                        </div>
                        <div className="w-24 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${item.percentage}%`,
                              backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* SBS V3.0 Context Note */}
            <Card className="border-[#28AAE2]/30 bg-[#28AAE2]/5 dark:bg-[#28AAE2]/10">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#1863DC] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-[#1863DC] dark:text-[#28AAE2]">
                      SBS V3.0 Coding Standard Update
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      SBS V3.0 went live January 2026 — compliance-related rejections increased as new coding
                      validation rules took effect. The "SBS V3.0 Coding Standard Mismatch" category now
                      accounts for 33.7% of all rejections, up from 18% under the previous standard. Providers
                      are advised to review updated coding guidelines for dental, obstetric, and E/M services.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
