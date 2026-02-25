import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Brain,
  Shield,
  Stethoscope,
  FileText,
  History,
  TrendingUp,
  Save,
  RotateCcw,
} from "lucide-react";

interface AgentConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
  confidenceThreshold: number;
  autoAction: boolean;
  category: "workflow" | "knowledge";
}

const initialAgentConfigs: AgentConfig[] = [
  {
    id: "regulatory",
    name: "Regulatory Agent",
    description: "Validates claims against regulatory guidelines (NPHIES, CCHI, MOH)",
    icon: Shield,
    enabled: true,
    confidenceThreshold: 70,
    autoAction: true,
    category: "workflow",
  },
  {
    id: "clinical",
    name: "Clinical Agent",
    description: "Analyzes medical necessity and clinical appropriateness of claims",
    icon: Stethoscope,
    enabled: true,
    confidenceThreshold: 75,
    autoAction: true,
    category: "workflow",
  },
  {
    id: "coverage",
    name: "Coverage Agent",
    description: "Verifies member eligibility, benefits, and coverage limits",
    icon: FileText,
    enabled: true,
    confidenceThreshold: 80,
    autoAction: true,
    category: "workflow",
  },
  {
    id: "historical",
    name: "Historical Agent",
    description: "Analyzes patient and provider claim history patterns",
    icon: History,
    enabled: true,
    confidenceThreshold: 75,
    autoAction: true,
    category: "workflow",
  },
  {
    id: "aggregation",
    name: "Aggregation Agent",
    description: "Combines signals from all agents to generate final risk score",
    icon: TrendingUp,
    enabled: true,
    confidenceThreshold: 85,
    autoAction: false,
    category: "knowledge",
  },
  {
    id: "recommendation",
    name: "Recommendation Agent",
    description: "Generates final approval/rejection recommendations with confidence",
    icon: Brain,
    enabled: true,
    confidenceThreshold: 90,
    autoAction: false,
    category: "knowledge",
  },
];

export default function ClaimsGovernanceAgentConfig() {
  const [agents, setAgents] = useState<AgentConfig[]>(initialAgentConfigs);
  const [hasChanges, setHasChanges] = useState(false);

  const updateAgent = (id: string, updates: Partial<AgentConfig>) => {
    setAgents((prev) =>
      prev.map((agent) =>
        agent.id === id ? { ...agent, ...updates } : agent
      )
    );
    setHasChanges(true);
  };

  const handleSave = () => {
    setHasChanges(false);
  };

  const handleReset = () => {
    setAgents(initialAgentConfigs);
    setHasChanges(false);
  };

  const workflowAgents = agents.filter(a => a.category === "workflow");
  const knowledgeAgents = agents.filter(a => a.category === "knowledge");

  return (
    <div className="p-6 space-y-6" data-testid="page-agent-config">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Agent Configuration</h1>
          <p className="text-muted-foreground">
            Configure claims governance agents, thresholds, and automation settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReset} disabled={!hasChanges} data-testid="button-reset">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges} data-testid="button-save">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Global Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-1">Active Agents</p>
              <p className="text-2xl font-bold text-primary">
                {agents.filter((a) => a.enabled).length}/{agents.length}
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-1">Avg Confidence Threshold</p>
              <p className="text-2xl font-bold text-primary">
                {Math.round(agents.reduce((sum, a) => sum + a.confidenceThreshold, 0) / agents.length)}%
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-1">Auto-Action Enabled</p>
              <p className="text-2xl font-bold text-primary">
                {agents.filter((a) => a.autoAction && a.enabled).length} agents
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Workflow Agents</h2>
        {workflowAgents.map((agent) => (
          <Card key={agent.id} data-testid={`agent-config-${agent.id}`}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <agent.icon className="w-5 h-5 text-primary" />
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
                  Minimum confidence score required to proceed
                </p>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-Action</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically apply decisions without manual review
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
        <h2 className="text-lg font-semibold">Decision Agents</h2>
        {knowledgeAgents.map((agent) => (
          <Card key={agent.id} data-testid={`agent-config-${agent.id}`}>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <agent.icon className="w-5 h-5 text-primary" />
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
                    Automatically apply final decisions
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
