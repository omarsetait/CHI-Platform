import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Activity,
  Download,
  Plus,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Beaker,
  BarChart3,
  Database,
  Play,
  Pause,
  Square,
} from "lucide-react";
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
  PieChart,
  Pie,
  Cell
} from "recharts";
import { format } from "date-fns";

type PreAuthFeedbackAnalysis = {
  summary: {
    totalFeedback: number;
    totalAccepted: number;
    totalOverrides: number;
    curatedForTraining: number;
  };
  byAgent: Array<{
    agentId: string;
    totalFeedback: number;
    acceptedCount: number;
    overrideCount: number;
    acceptanceRate: number;
    avgPreferenceScore: number;
  }>;
  byFeedbackType: Array<{ type: string; count: number }>;
  byOverrideCategory: Array<{ category: string; count: number }>;
  dailyTrend: Array<{ date: string; accepted: number; overridden: number }>;
};

type PreAuthTrainingDataItem = {
  id: string;
  feedbackType: string;
  wasAccepted: boolean;
  preferenceScore: number | null;
  agentId: string | null;
  notes: string | null;
  curatedForTraining: boolean;
  createdAt: string;
  claim: {
    claimId: string;
    memberId: string;
    status: string;
  } | null;
  finalAction: {
    action: string;
    finalVerdict: string;
    overrideReason: string | null;
  } | null;
};

type PreAuthAbTest = {
  id: string;
  name: string;
  agentType: string;
  promptA: string;
  promptB: string;
  status: "active" | "paused" | "completed";
  startDate: string;
  endDate: string | null;
  resultsA: {
    claimCount: number;
    acceptedCount: number;
    overrideCount: number;
    avgConfidence: number;
  };
  resultsB: {
    claimCount: number;
    acceptedCount: number;
    overrideCount: number;
    avgConfidence: number;
  };
  createdAt: string;
};

type PreAuthAbTestResults = {
  test: {
    id: string;
    name: string;
    agentType: string;
    status: string;
  };
  results: {
    promptA: {
      claimCount: number;
      acceptedCount: number;
      overrideCount: number;
      acceptanceRate: number;
      avgPreferenceScore: number;
    };
    promptB: {
      claimCount: number;
      acceptedCount: number;
      overrideCount: number;
      acceptanceRate: number;
      avgPreferenceScore: number;
    };
  };
  statisticalAnalysis: {
    significant: boolean;
    pValue: number;
    confidence: number;
    winner: string | null;
    recommendation: string;
    sampleSize: {
      promptA: number;
      promptB: number;
      total: number;
    };
  };
};

const CHART_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function PreAuthRlhfPage() {
  const [activeTab, setActiveTab] = useState("feedback");
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: feedbackAnalysis, isLoading: analysisLoading } = useQuery<PreAuthFeedbackAnalysis>({
    queryKey: ["/api/pre-auth/rlhf/feedback-analysis"],
  });

  const { data: trainingData, isLoading: trainingLoading } = useQuery<{ count: number; data: PreAuthTrainingDataItem[] }>({
    queryKey: ["/api/pre-auth/rlhf/training-data"],
  });

  const { data: abTests, isLoading: testsLoading } = useQuery<PreAuthAbTest[]>({
    queryKey: ["/api/pre-auth/rlhf/ab-tests"],
  });

  const { data: testResults, isLoading: resultsLoading } = useQuery<PreAuthAbTestResults>({
    queryKey: ["/api/pre-auth/rlhf/ab-tests", selectedTest, "results"],
    enabled: !!selectedTest,
  });

  const createTestMutation = useMutation({
    mutationFn: async (data: { name: string; agentType: string; promptA: string; promptB: string }) => {
      return apiRequest("POST", "/api/pre-auth/rlhf/ab-tests", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pre-auth/rlhf/ab-tests"] });
      setIsCreateDialogOpen(false);
      toast({ title: "A/B test created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create A/B test", variant: "destructive" });
    },
  });

  const updateTestMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/pre-auth/rlhf/ab-tests/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pre-auth/rlhf/ab-tests"] });
      toast({ title: "Test status updated" });
    },
  });

  const curateMutation = useMutation({
    mutationFn: async ({ id, curated }: { id: string; curated: boolean }) => {
      return apiRequest("PATCH", `/api/pre-auth/rlhf/feedback/${id}/curate`, { curatedForTraining: curated });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pre-auth/rlhf/training-data"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pre-auth/rlhf/feedback-analysis"] });
      toast({ title: "Feedback curation updated" });
    },
  });

  const handleExportJSONL = () => {
    window.open("/api/pre-auth/rlhf/training-data?format=jsonl&curatedOnly=true", "_blank");
    toast({ title: "Training data export started" });
  };

  const handleExportAll = () => {
    window.open("/api/pre-auth/rlhf/training-data?format=jsonl", "_blank");
    toast({ title: "Full data export started" });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3" data-testid="page-title">
            <Activity className="w-7 h-7" />
            Pre-Auth RLHF Module
          </h1>
          <p className="text-muted-foreground">
            Reinforcement Learning from Human Feedback - Improve AI agent accuracy
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="feedback" data-testid="tab-feedback">
            <BarChart3 className="w-4 h-4 mr-2" />
            Feedback Analysis
          </TabsTrigger>
          <TabsTrigger value="training" data-testid="tab-training">
            <Database className="w-4 h-4 mr-2" />
            Training Data
          </TabsTrigger>
          <TabsTrigger value="abtesting" data-testid="tab-abtesting">
            <Beaker className="w-4 h-4 mr-2" />
            A/B Testing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feedback" className="space-y-6 mt-6">
          <FeedbackAnalysisTab analysis={feedbackAnalysis} loading={analysisLoading} />
        </TabsContent>

        <TabsContent value="training" className="space-y-6 mt-6">
          <TrainingDataTab
            data={trainingData}
            loading={trainingLoading}
            onExportJSONL={handleExportJSONL}
            onExportAll={handleExportAll}
            onCurate={(id, curated) => curateMutation.mutate({ id, curated })}
            curateLoading={curateMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="abtesting" className="space-y-6 mt-6">
          <AbTestingTab
            tests={abTests || []}
            loading={testsLoading}
            selectedTest={selectedTest}
            testResults={testResults}
            resultsLoading={resultsLoading}
            onSelectTest={setSelectedTest}
            onUpdateStatus={(id, status) => updateTestMutation.mutate({ id, status })}
            updateLoading={updateTestMutation.isPending}
            isCreateDialogOpen={isCreateDialogOpen}
            setIsCreateDialogOpen={setIsCreateDialogOpen}
            onCreateTest={(data) => createTestMutation.mutate(data)}
            createLoading={createTestMutation.isPending}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FeedbackAnalysisTab({ analysis, loading }: { analysis?: PreAuthFeedbackAnalysis; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-12 text-muted-foreground" data-testid="empty-feedback">
        <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No feedback data available</p>
        <p className="text-sm mt-2">Feedback will appear here after adjudicators review claims</p>
      </div>
    );
  }

  const acceptanceRate = analysis.summary.totalFeedback > 0
    ? ((analysis.summary.totalAccepted / analysis.summary.totalFeedback) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-feedback">
              {analysis.summary.totalFeedback}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Acceptance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2" data-testid="stat-acceptance-rate">
              {acceptanceRate}%
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Overrides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2" data-testid="stat-overrides">
              {analysis.summary.totalOverrides}
              <TrendingDown className="w-5 h-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Curated for Training</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-curated">
              {analysis.summary.curatedForTraining}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acceptance vs Override by Agent</CardTitle>
            <CardDescription>Agent performance based on human feedback</CardDescription>
          </CardHeader>
          <CardContent>
            {analysis.byAgent.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analysis.byAgent}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="agentId" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Legend />
                  <Bar dataKey="acceptedCount" name="Accepted" fill="hsl(var(--chart-1))" />
                  <Bar dataKey="overrideCount" name="Overridden" fill="hsl(var(--chart-2))" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No agent data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Feedback Trend (30 Days)</CardTitle>
            <CardDescription>Daily acceptance and override patterns</CardDescription>
          </CardHeader>
          <CardContent>
            {analysis.dailyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analysis.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => format(new Date(value), "MM/dd")}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    labelFormatter={(value) => format(new Date(value), "MMM dd, yyyy")}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="accepted" name="Accepted" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                  <Line type="monotone" dataKey="overridden" name="Overridden" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No trend data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Override Categories</CardTitle>
            <CardDescription>Reasons for adjudicator overrides</CardDescription>
          </CardHeader>
          <CardContent>
            {analysis.byOverrideCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={analysis.byOverrideCategory}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {analysis.byOverrideCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No override category data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agent Acceptance Rates</CardTitle>
            <CardDescription>Percentage of recommendations accepted per agent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analysis.byAgent.length > 0 ? (
                analysis.byAgent.map((agent) => (
                  <div key={agent.agentId} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{agent.agentId}</span>
                      <span className="text-muted-foreground">{agent.acceptanceRate}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${agent.acceptanceRate}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground text-center py-8">No agent data available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TrainingDataTab({
  data,
  loading,
  onExportJSONL,
  onExportAll,
  onCurate,
  curateLoading,
}: {
  data?: { count: number; data: PreAuthTrainingDataItem[] };
  loading: boolean;
  onExportJSONL: () => void;
  onExportAll: () => void;
  onCurate: (id: string, curated: boolean) => void;
  curateLoading: boolean;
}) {
  if (loading) {
    return <Skeleton className="h-96" />;
  }

  const curatedCount = data?.data.filter((d) => d.curatedForTraining).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold">Training Data Export</h3>
          <p className="text-sm text-muted-foreground">
            {data?.count || 0} total examples, {curatedCount} curated for training
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={onExportJSONL} data-testid="button-export-curated">
            <Download className="w-4 h-4 mr-2" />
            Export Curated (JSONL)
          </Button>
          <Button variant="outline" onClick={onExportAll} data-testid="button-export-all">
            <Download className="w-4 h-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim ID</TableHead>
                <TableHead>Feedback Type</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Curated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!data?.data || data.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No training data available
                  </TableCell>
                </TableRow>
              ) : (
                data.data.slice(0, 50).map((item) => (
                  <TableRow key={item.id} data-testid={`row-training-${item.id}`}>
                    <TableCell className="font-mono text-sm">
                      {item.claim?.claimId || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.feedbackType}</Badge>
                    </TableCell>
                    <TableCell>
                      {item.wasAccepted ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          Accepted
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-amber-600">
                          <XCircle className="w-4 h-4" />
                          Overridden
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{item.agentId || "Unknown"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.createdAt ? format(new Date(item.createdAt), "MMM dd, yyyy") : "N/A"}
                    </TableCell>
                    <TableCell>
                      {item.curatedForTraining ? (
                        <Badge variant="default">Curated</Badge>
                      ) : (
                        <Badge variant="outline">Not Curated</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onCurate(item.id, !item.curatedForTraining)}
                        disabled={curateLoading}
                        data-testid={`button-curate-${item.id}`}
                      >
                        {item.curatedForTraining ? "Uncurate" : "Curate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AbTestingTab({
  tests,
  loading,
  selectedTest,
  testResults,
  resultsLoading,
  onSelectTest,
  onUpdateStatus,
  updateLoading,
  isCreateDialogOpen,
  setIsCreateDialogOpen,
  onCreateTest,
  createLoading,
}: {
  tests: PreAuthAbTest[];
  loading: boolean;
  selectedTest: string | null;
  testResults?: PreAuthAbTestResults;
  resultsLoading: boolean;
  onSelectTest: (id: string | null) => void;
  onUpdateStatus: (id: string, status: string) => void;
  updateLoading: boolean;
  isCreateDialogOpen: boolean;
  setIsCreateDialogOpen: (open: boolean) => void;
  onCreateTest: (data: { name: string; agentType: string; promptA: string; promptB: string }) => void;
  createLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    name: "",
    agentType: "clinical_necessity",
    promptA: "",
    promptB: "",
  });

  const handleCreate = () => {
    onCreateTest(formData);
    setFormData({ name: "", agentType: "clinical_necessity", promptA: "", promptB: "" });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold">A/B Testing</h3>
          <p className="text-sm text-muted-foreground">
            Compare different agent prompts and configurations
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-test">
          <Plus className="w-4 h-4 mr-2" />
          New A/B Test
        </Button>
      </div>

      {tests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Beaker className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No A/B tests created yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create a test to compare different prompt variations
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tests.map((test) => (
            <Card
              key={test.id}
              className={`cursor-pointer hover-elevate ${selectedTest === test.id ? "ring-2 ring-primary" : ""}`}
              onClick={() => onSelectTest(test.id === selectedTest ? null : test.id)}
              data-testid={`test-card-${test.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h4 className="font-medium">{test.name}</h4>
                    <p className="text-sm text-muted-foreground">{test.agentType}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Started: {format(new Date(test.startDate), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        test.status === "active"
                          ? "default"
                          : test.status === "completed"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {test.status}
                    </Badge>
                    <div className="flex gap-1">
                      {test.status === "active" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(test.id, "paused");
                          }}
                          disabled={updateLoading}
                          data-testid={`button-pause-${test.id}`}
                        >
                          <Pause className="w-4 h-4" />
                        </Button>
                      )}
                      {test.status === "paused" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(test.id, "active");
                          }}
                          disabled={updateLoading}
                          data-testid={`button-resume-${test.id}`}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      {test.status !== "completed" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(test.id, "completed");
                          }}
                          disabled={updateLoading}
                          data-testid={`button-complete-${test.id}`}
                        >
                          <Square className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedTest && testResults && (
        <Card data-testid="test-results">
          <CardHeader>
            <CardTitle className="text-base">Test Results: {testResults.test.name}</CardTitle>
            <CardDescription>Statistical analysis of prompt performance</CardDescription>
          </CardHeader>
          <CardContent>
            {resultsLoading ? (
              <Skeleton className="h-48" />
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-md">
                    <h5 className="font-medium mb-2">Prompt A</h5>
                    <div className="space-y-1 text-sm">
                      <p>Claims: {testResults.results.promptA.claimCount}</p>
                      <p>Accepted: {testResults.results.promptA.acceptedCount}</p>
                      <p>Acceptance Rate: {testResults.results.promptA.acceptanceRate}%</p>
                    </div>
                  </div>
                  <div className="p-4 border rounded-md">
                    <h5 className="font-medium mb-2">Prompt B</h5>
                    <div className="space-y-1 text-sm">
                      <p>Claims: {testResults.results.promptB.claimCount}</p>
                      <p>Accepted: {testResults.results.promptB.acceptedCount}</p>
                      <p>Acceptance Rate: {testResults.results.promptB.acceptanceRate}%</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-muted rounded-md">
                  <h5 className="font-medium mb-2">Statistical Analysis</h5>
                  <p className="text-sm">{testResults.statisticalAnalysis.recommendation}</p>
                  {testResults.statisticalAnalysis.winner && (
                    <Badge className="mt-2">{testResults.statisticalAnalysis.winner} Winner</Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New A/B Test</DialogTitle>
            <DialogDescription>
              Compare two different prompts for an AI agent
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-name">Test Name</Label>
              <Input
                id="test-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Clinical Necessity v2 Test"
                data-testid="input-test-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-type">Agent Type</Label>
              <Select
                value={formData.agentType}
                onValueChange={(v) => setFormData({ ...formData, agentType: v })}
              >
                <SelectTrigger data-testid="select-agent-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regulatory_compliance">Regulatory Compliance</SelectItem>
                  <SelectItem value="coverage_eligibility">Coverage Eligibility</SelectItem>
                  <SelectItem value="clinical_necessity">Clinical Necessity</SelectItem>
                  <SelectItem value="past_patterns">Past Patterns</SelectItem>
                  <SelectItem value="disclosure_check">Disclosure Check</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt-a">Prompt A (Control)</Label>
              <Textarea
                id="prompt-a"
                value={formData.promptA}
                onChange={(e) => setFormData({ ...formData, promptA: e.target.value })}
                placeholder="Enter the control prompt..."
                rows={4}
                data-testid="textarea-prompt-a"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt-b">Prompt B (Variant)</Label>
              <Textarea
                id="prompt-b"
                value={formData.promptB}
                onChange={(e) => setFormData({ ...formData, promptB: e.target.value })}
                placeholder="Enter the variant prompt..."
                rows={4}
                data-testid="textarea-prompt-b"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createLoading || !formData.name || !formData.promptA || !formData.promptB}
              data-testid="button-submit-test"
            >
              Create Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
