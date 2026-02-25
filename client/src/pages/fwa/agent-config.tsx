import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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

const defaultAgentConfigs: LocalAgentConfig[] = [
  {
    id: "a1",
    name: "A1: Analysis Agent",
    description: "Performs root cause analysis on flagged claims, providers, and denial patterns",
    icon: Search,
    enabled: true,
    confidenceThreshold: 75,
    autoAction: true,
  },
  {
    id: "a2",
    name: "A2: Categorization Agent",
    description: "Consumes A1 insights and categorizes findings into specific FWA types",
    icon: AlertTriangle,
    enabled: true,
    confidenceThreshold: 80,
    autoAction: true,
  },
  {
    id: "a3",
    name: "A3: Action Agent",
    description: "Executes automated interventions on live claims and recovers inappropriately paid claims",
    icon: TrendingUp,
    enabled: true,
    confidenceThreshold: 85,
    autoAction: false,
  },
  {
    id: "b1",
    name: "B1: Regulatory KB Agent",
    description: "Validates claims against regulatory guidelines (NPHIES, CCHI, MOH)",
    icon: Shield,
    enabled: true,
    confidenceThreshold: 70,
    autoAction: true,
  },
  {
    id: "b2",
    name: "B2: Medical KB Agent",
    description: "Validates claims against medical guidelines and clinical protocols",
    icon: Stethoscope,
    enabled: true,
    confidenceThreshold: 70,
    autoAction: true,
  },
  {
    id: "b3",
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
    a1: Search,
    a2: AlertTriangle,
    a3: TrendingUp,
    b1: Shield,
    b2: Stethoscope,
    b3: Users,
  };
  
  const params = dbConfig.parameters as Record<string, unknown> | null;
  
  return {
    id: dbConfig.id,
    name: dbConfig.agentName,
    description: params?.description as string || "",
    icon: iconMap[dbConfig.id] || Brain,
    enabled: dbConfig.enabled ?? true,
    confidenceThreshold: Number(dbConfig.threshold) * 100 || 75,
    autoAction: params?.autoAction as boolean ?? true,
  };
}

export default function AgentConfig() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<LocalAgentConfig[]>(defaultAgentConfigs);
  const [originalAgents, setOriginalAgents] = useState<LocalAgentConfig[]>(defaultAgentConfigs);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: dbConfigs, isLoading } = useQuery<FwaAgentConfig[]>({
    queryKey: ["/api/fwa/agent-configs"],
  });

  useEffect(() => {
    if (dbConfigs && dbConfigs.length > 0) {
      const mappedConfigs = dbConfigs.map(mapDbToLocal);
      setAgents(mappedConfigs);
      setOriginalAgents(mappedConfigs);
    }
  }, [dbConfigs]);

  const saveMutation = useMutation({
    mutationFn: async (configs: LocalAgentConfig[]) => {
      const promises = configs.map((config) =>
        apiRequest("PATCH", `/api/fwa/agent-configs/${config.id}`, {
          enabled: config.enabled,
          threshold: String(config.confidenceThreshold / 100),
          parameters: {
            autoAction: config.autoAction,
            description: config.description,
          },
        })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/agent-configs"] });
      setOriginalAgents([...agents]);
      setHasChanges(false);
      toast({
        title: "Configuration Saved",
        description: "Agent configurations have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save agent configurations",
        variant: "destructive",
      });
    },
  });

  const updateAgent = (id: string, updates: Partial<LocalAgentConfig>) => {
    setAgents((prev) =>
      prev.map((agent) =>
        agent.id === id ? { ...agent, ...updates } : agent
      )
    );
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate(agents);
  };

  const handleReset = () => {
    setAgents([...originalAgents]);
    setHasChanges(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Agent Orchestration</h1>
          <p className="text-muted-foreground">
            Configure AI agents and automation workflows
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges || saveMutation.isPending} data-testid="button-reset">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || saveMutation.isPending} data-testid="button-save">
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Global Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-1">Active Agents</p>
              <p className="text-2xl font-bold text-purple-600">
                {agents.filter((a) => a.enabled).length}/{agents.length}
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-1">Avg Confidence Threshold</p>
              <p className="text-2xl font-bold text-purple-600">
                {Math.round(agents.reduce((sum, a) => sum + a.confidenceThreshold, 0) / agents.length)}%
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-1">Auto-Action Enabled</p>
              <p className="text-2xl font-bold text-purple-600">
                {agents.filter((a) => a.autoAction && a.enabled).length} agents
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Workflow Agents</h2>
        {agents.slice(0, 3).map((agent) => (
          <Card key={agent.id} data-testid={`agent-config-${agent.id}`}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <agent.icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{agent.name}</CardTitle>
                    <CardDescription>{agent.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`enable-${agent.id}`} className="text-sm">Enable</Label>
                  <Switch
                    id={`enable-${agent.id}`}
                    checked={agent.enabled}
                    onCheckedChange={(checked) => updateAgent(agent.id, { enabled: checked })}
                    data-testid={`switch-enable-${agent.id}`}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Confidence Threshold</Label>
                  <span className="text-sm font-medium">{agent.confidenceThreshold}%</span>
                </div>
                <Slider
                  value={[agent.confidenceThreshold]}
                  onValueChange={([value]) => updateAgent(agent.id, { confidenceThreshold: value })}
                  min={50}
                  max={100}
                  step={5}
                  disabled={!agent.enabled}
                  data-testid={`slider-threshold-${agent.id}`}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum confidence score required to flag or take action
                </p>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-Action</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically perform actions without manual review
                  </p>
                </div>
                <Switch
                  checked={agent.autoAction}
                  onCheckedChange={(checked) => updateAgent(agent.id, { autoAction: checked })}
                  disabled={!agent.enabled}
                  data-testid={`switch-auto-${agent.id}`}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Knowledge Base Agents</h2>
        {agents.slice(3).map((agent) => (
          <Card key={agent.id} data-testid={`agent-config-${agent.id}`}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <agent.icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{agent.name}</CardTitle>
                    <CardDescription>{agent.description}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`enable-${agent.id}`} className="text-sm">Enable</Label>
                  <Switch
                    id={`enable-${agent.id}`}
                    checked={agent.enabled}
                    onCheckedChange={(checked) => updateAgent(agent.id, { enabled: checked })}
                    data-testid={`switch-enable-${agent.id}`}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Confidence Threshold</Label>
                  <span className="text-sm font-medium">{agent.confidenceThreshold}%</span>
                </div>
                <Slider
                  value={[agent.confidenceThreshold]}
                  onValueChange={([value]) => updateAgent(agent.id, { confidenceThreshold: value })}
                  min={50}
                  max={100}
                  step={5}
                  disabled={!agent.enabled}
                  data-testid={`slider-threshold-${agent.id}`}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-Action</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically use KB results for validation
                  </p>
                </div>
                <Switch
                  checked={agent.autoAction}
                  onCheckedChange={(checked) => updateAgent(agent.id, { autoAction: checked })}
                  disabled={!agent.enabled}
                  data-testid={`switch-auto-${agent.id}`}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
