import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
  BarChart,
  Bar,
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Brain,
  Search,
  AlertTriangle,
  TrendingUp,
  Shield,
  Stethoscope,
  Users,
  Save,
  RotateCcw,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Activity,
  Target,
  Settings,
  BarChart3,
} from "lucide-react";
import type { FwaAgentConfig } from "@shared/schema";

interface LocalAgentConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
  confidenceThreshold: number;
  autoAction: boolean;
}

interface RLHFMetrics {
  fwa: {
    totalActions: number;
    acceptedRecommendations: number;
    overriddenRecommendations: number;
    acceptanceRate: number;
  };
  claims: {
    totalActions: number;
    acceptedRecommendations: number;
    overriddenRecommendations: number;
    acceptanceRate: number;
  };
  agentMetrics: Record<string, { total: number; accepted: number; rate: number }>;
  lastUpdated: string;
}

interface FeedbackEvent {
  id: string;
  caseId?: string;
  claimId?: string;
  entityId: string;
  entityType: string;
  phase: string;
  aiRecommendation: any;
  humanAction: string;
  wasAccepted: boolean;
  overrideReason?: string;
  reviewerNotes?: string;
  createdAt: string;
}

const CHART_COLORS = ["#22c55e", "#ef4444", "#f59e0b", "#3b82f6"];

const defaultAgentConfigs: LocalAgentConfig[] = [
  {
    id: "analysis",
    name: "A1: Analysis Agent",
    description: "Performs root cause analysis on flagged claims, providers, and denial patterns",
    icon: Search,
    enabled: true,
    confidenceThreshold: 75,
    autoAction: true,
  },
  {
    id: "categorization",
    name: "A2: Categorization Agent",
    description: "Consumes A1 insights and categorizes findings into specific FWA types",
    icon: AlertTriangle,
    enabled: true,
    confidenceThreshold: 80,
    autoAction: true,
  },
  {
    id: "action",
    name: "A3: Action Agent",
    description: "Executes automated interventions on live claims and recovers inappropriately paid claims",
    icon: TrendingUp,
    enabled: true,
    confidenceThreshold: 85,
    autoAction: false,
  },
  {
    id: "history_retrieval",
    name: "B3: History Agents",
    description: "Specialized agents for patient and provider history analysis",
    icon: Users,
    enabled: true,
    confidenceThreshold: 75,
    autoAction: true,
  },
];

function mapDbToLocal(dbConfig: FwaAgentConfig): LocalAgentConfig {
  const iconMap: Record<string, React.ElementType> = {
    analysis: Search,
    categorization: AlertTriangle,
    action: TrendingUp,
    history_retrieval: Users,
  };
  
  const params = dbConfig.parameters as Record<string, unknown> | null;
  
  return {
    id: dbConfig.agentType,
    name: dbConfig.agentName || dbConfig.agentType,
    description: params?.description as string || "",
    icon: iconMap[dbConfig.agentType] || Brain,
    enabled: dbConfig.enabled ?? true,
    confidenceThreshold: Math.round(parseFloat(dbConfig.threshold || "0.75") * 100),
    autoAction: params?.autoAction as boolean || false,
  };
}

function AgentConfigTab() {
  const { toast } = useToast();
  const [agentConfigs, setAgentConfigs] = useState<LocalAgentConfig[]>(defaultAgentConfigs);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: dbConfigs, isLoading } = useQuery<FwaAgentConfig[]>({
    queryKey: ["/api/fwa/agent-configs"],
  });

  useEffect(() => {
    if (dbConfigs && dbConfigs.length > 0) {
      const mappedConfigs = dbConfigs.map(mapDbToLocal);
      const mergedConfigs = defaultAgentConfigs.map(def => {
        const dbMatch = mappedConfigs.find(db => db.id === def.id);
        return dbMatch || def;
      });
      setAgentConfigs(mergedConfigs);
    }
  }, [dbConfigs]);

  const saveMutation = useMutation({
    mutationFn: async (configs: LocalAgentConfig[]) => {
      const promises = configs.map(config => 
        apiRequest("PATCH", `/api/fwa/agent-configs/${config.id}`, {
          enabled: config.enabled,
          threshold: (config.confidenceThreshold / 100).toFixed(2),
          parameters: {
            autoAction: config.autoAction,
            description: config.description,
          },
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/agent-configs"] });
      setHasChanges(false);
      toast({ title: "Success", description: "Agent configurations saved successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save configurations", variant: "destructive" });
    },
  });

  const updateConfig = (id: string, updates: Partial<LocalAgentConfig>) => {
    setAgentConfigs(prev =>
      prev.map(config => config.id === id ? { ...config, ...updates } : config)
    );
    setHasChanges(true);
  };

  const handleReset = () => {
    if (dbConfigs && dbConfigs.length > 0) {
      const mappedConfigs = dbConfigs.map(mapDbToLocal);
      const mergedConfigs = defaultAgentConfigs.map(def => {
        const dbMatch = mappedConfigs.find(db => db.id === def.id);
        return dbMatch || def;
      });
      setAgentConfigs(mergedConfigs);
    } else {
      setAgentConfigs(defaultAgentConfigs);
    }
    setHasChanges(false);
  };

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Agent Configuration</h2>
          <p className="text-sm text-muted-foreground">Configure AI agent behavior and thresholds</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges} data-testid="button-reset">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button onClick={() => saveMutation.mutate(agentConfigs)} disabled={!hasChanges || saveMutation.isPending} data-testid="button-save">
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {agentConfigs.map((config) => (
          <Card key={config.id} data-testid={`card-agent-${config.id}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <config.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{config.name}</CardTitle>
                    <CardDescription className="text-sm">{config.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`enabled-${config.id}`} className="text-sm">Enabled</Label>
                  <Switch
                    id={`enabled-${config.id}`}
                    checked={config.enabled}
                    onCheckedChange={(enabled) => updateConfig(config.id, { enabled })}
                    data-testid={`switch-enabled-${config.id}`}
                  />
                </div>
              </div>
            </CardHeader>
            {config.enabled && (
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Confidence Threshold</Label>
                    <span className="text-sm font-medium">{config.confidenceThreshold}%</span>
                  </div>
                  <Slider
                    value={[config.confidenceThreshold]}
                    onValueChange={([value]) => updateConfig(config.id, { confidenceThreshold: value })}
                    min={50}
                    max={100}
                    step={5}
                    data-testid={`slider-threshold-${config.id}`}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-Action</Label>
                    <p className="text-xs text-muted-foreground">Allow agent to take actions automatically</p>
                  </div>
                  <Switch
                    checked={config.autoAction}
                    onCheckedChange={(autoAction) => updateConfig(config.id, { autoAction })}
                    data-testid={`switch-auto-${config.id}`}
                  />
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function RLHFTab() {
  const { data: metrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery<RLHFMetrics>({
    queryKey: ["/api/rlhf/metrics"],
    refetchInterval: 30000,
  });

  const { data: fwaFeedback, isLoading: fwaLoading, refetch: refetchFwa } = useQuery<FeedbackEvent[]>({
    queryKey: ["/api/rlhf/feedback/fwa"],
  });

  const handleRefresh = () => {
    refetchMetrics();
    refetchFwa();
  };

  const acceptanceChartData = metrics ? [
    { name: "FWA", accepted: metrics.fwa.acceptedRecommendations, overridden: metrics.fwa.overriddenRecommendations },
    { name: "Claims", accepted: metrics.claims.acceptedRecommendations, overridden: metrics.claims.overriddenRecommendations },
  ] : [];

  const pieData = metrics ? [
    { name: "Accepted", value: metrics.fwa.acceptedRecommendations + metrics.claims.acceptedRecommendations },
    { name: "Overridden", value: metrics.fwa.overriddenRecommendations + metrics.claims.overriddenRecommendations },
  ] : [];

  const totalActions = (metrics?.fwa.totalActions || 0) + (metrics?.claims.totalActions || 0);
  const overallAcceptanceRate = totalActions > 0
    ? Math.round(((metrics?.fwa.acceptedRecommendations || 0) + (metrics?.claims.acceptedRecommendations || 0)) / totalActions * 100)
    : 0;

  if (metricsLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">RLHF Metrics</h2>
          <p className="text-sm text-muted-foreground">Reinforcement Learning from Human Feedback analytics</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} data-testid="button-refresh-rlhf">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Actions</span>
            </div>
            <p className="text-2xl font-bold mt-1">{totalActions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Accepted</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">
              {(metrics?.fwa.acceptedRecommendations || 0) + (metrics?.claims.acceptedRecommendations || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Overridden</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">
              {(metrics?.fwa.overriddenRecommendations || 0) + (metrics?.claims.overriddenRecommendations || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Acceptance Rate</span>
            </div>
            <p className="text-2xl font-bold mt-1">{overallAcceptanceRate}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acceptance by Module</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={acceptanceChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="accepted" fill="#22c55e" name="Accepted" />
                <Bar dataKey="overridden" fill="#ef4444" name="Overridden" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overall Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
                  label
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Feedback Events</CardTitle>
        </CardHeader>
        <CardContent>
          {fwaLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(fwaFeedback || []).slice(0, 5).map((event) => (
                  <TableRow key={event.id} data-testid={`row-feedback-${event.id}`}>
                    <TableCell>
                      <span className="font-medium">{event.entityId}</span>
                      <span className="text-xs text-muted-foreground ml-2">({event.entityType})</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{event.phase}</Badge>
                    </TableCell>
                    <TableCell>{event.humanAction}</TableCell>
                    <TableCell>
                      {event.wasAccepted ? (
                        <Badge className="bg-green-100 text-green-800">Accepted</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800">Overridden</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(event.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
                {(!fwaFeedback || fwaFeedback.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No feedback events recorded yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AgentOrchestration() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="page-title">
            <Brain className="h-6 w-6" />
            Agent Orchestration
          </h1>
          <p className="text-muted-foreground">
            Configure AI agents and monitor learning from human feedback
          </p>
        </div>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="config" className="flex items-center gap-2" data-testid="tab-config">
            <Settings className="h-4 w-4" />
            Agent Config
          </TabsTrigger>
          <TabsTrigger value="rlhf" className="flex items-center gap-2" data-testid="tab-rlhf">
            <BarChart3 className="h-4 w-4" />
            RLHF Metrics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-6">
          <AgentConfigTab />
        </TabsContent>

        <TabsContent value="rlhf" className="mt-6">
          <RLHFTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
