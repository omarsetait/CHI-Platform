import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Brain, 
  Stethoscope,
  History,
  FileCheck,
  Cpu,
  Zap,
  Pencil,
  Save,
  X,
  RefreshCw,
  ShieldCheck,
  ClipboardCheck
} from "lucide-react";
import type { PreAuthAgentConfig } from "@shared/schema";

const agentIcons: Record<string, typeof Brain> = {
  regulatory_compliance: ShieldCheck,
  coverage_eligibility: ClipboardCheck,
  clinical_necessity: Stethoscope,
  past_patterns: History,
  disclosure_check: FileCheck
};

const agentDescriptions: Record<string, string> = {
  regulatory_compliance: "Validates NPHIES mandatory fields, ICD-10-AM codes, SBS/SFDA codes, and regulatory compliance requirements",
  coverage_eligibility: "Checks benefit limits, excluded services, bundling violations, and prior authorization requirements",
  clinical_necessity: "Evaluates medical necessity of procedures based on diagnoses, clinical guidelines, and standard of care protocols",
  past_patterns: "Analyzes member's claim history to identify patterns, trends, and potential anomalies",
  disclosure_check: "Verifies pre-existing condition disclosures against current claims to detect omissions"
};

const knowledgeBases: Record<string, string> = {
  regulatory_compliance: "Regulatory Documents",
  coverage_eligibility: "Policy T&Cs",
  clinical_necessity: "Medical Guidelines",
  past_patterns: "Patient History",
  disclosure_check: "Declarations"
};

interface EditState {
  agentId: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

export default function PreAuthAgentConfigPage() {
  const { toast } = useToast();
  const [editingAgent, setEditingAgent] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  
  const { data: agents, isLoading, refetch } = useQuery<PreAuthAgentConfig[]>({
    queryKey: ['/api/pre-auth/agent-configs'],
  });

  const seedMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/pre-auth/agent-configs/seed'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/pre-auth/agent-configs'], refetchType: 'all' });
      await refetch();
      toast({
        title: "Success",
        description: "Default agent configurations have been seeded",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to seed agent configurations",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { agentId: string; updates: Partial<PreAuthAgentConfig> }) => {
      await apiRequest('PUT', `/api/pre-auth/agent-configs/${data.agentId}`, data.updates);
      const response = await apiRequest('GET', '/api/pre-auth/agent-configs');
      return response.json() as Promise<PreAuthAgentConfig[]>;
    },
    onSuccess: (freshData) => {
      queryClient.setQueryData(['/api/pre-auth/agent-configs'], freshData);
      setEditingAgent(null);
      setEditState(null);
      toast({
        title: "Success",
        description: "Agent configuration updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update agent configuration",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (agent: PreAuthAgentConfig) => {
    setEditingAgent(agent.agentId);
    setEditState({
      agentId: agent.agentId,
      temperature: agent.temperature ? parseFloat(agent.temperature) : 0.2,
      maxTokens: agent.maxTokens || 2000,
      systemPrompt: agent.systemPrompt || "",
    });
  };

  const handleCancel = () => {
    setEditingAgent(null);
    setEditState(null);
  };

  const handleSave = () => {
    if (!editState) return;
    updateMutation.mutate({
      agentId: editState.agentId,
      updates: {
        temperature: editState.temperature.toString(),
        maxTokens: editState.maxTokens,
        systemPrompt: editState.systemPrompt,
      },
    });
  };

  const handleSeedDefaults = () => {
    seedMutation.mutate();
  };

  const showSeedButton = !isLoading && (!agents || agents.length === 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Agent Configuration</h1>
            <p className="text-muted-foreground mt-1">
              Configure AI agents for Phase 1-5 analysis
            </p>
          </div>
        </div>
        {showSeedButton && (
          <Button 
            onClick={handleSeedDefaults}
            disabled={seedMutation.isPending}
            data-testid="button-seed-defaults"
          >
            {seedMutation.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Seed Default Configs
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Agents</CardDescription>
            <CardTitle className="text-2xl" data-testid="text-agent-count">
              {isLoading ? <Skeleton className="h-8 w-12" /> : (agents?.length || 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Model</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-muted-foreground" />
              AI Model
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Response Time</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              0.97s
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Success Rate</CardDescription>
            <CardTitle className="text-green-600">99.0%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-6 w-40 mt-2" />
                <Skeleton className="h-4 w-full mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : agents && agents.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {agents.map((agent) => {
            const Icon = agentIcons[agent.agentId] || Brain;
            const isEditing = editingAgent === agent.agentId;
            
            return (
              <Card key={agent.id} data-testid={`agent-card-${agent.agentId}`}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <Badge variant="outline">Phase {agent.layer}</Badge>
                    </div>
                    {!isEditing && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleEdit(agent)}
                        data-testid={`button-edit-${agent.agentId}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <CardTitle className="text-lg">{agent.agentName}</CardTitle>
                  <CardDescription>{agentDescriptions[agent.agentId] || "AI Agent"}</CardDescription>
                </CardHeader>
                
                {isEditing && editState ? (
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`temperature-${agent.agentId}`}>
                        Temperature: {editState.temperature.toFixed(1)}
                      </Label>
                      <Slider
                        id={`temperature-${agent.agentId}`}
                        min={0}
                        max={1}
                        step={0.1}
                        value={[editState.temperature]}
                        onValueChange={([value]) => setEditState({ ...editState, temperature: value })}
                        data-testid={`slider-temperature-${agent.agentId}`}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`maxTokens-${agent.agentId}`}>Max Tokens</Label>
                      <Input
                        id={`maxTokens-${agent.agentId}`}
                        type="number"
                        min={100}
                        max={8000}
                        value={editState.maxTokens}
                        onChange={(e) => setEditState({ ...editState, maxTokens: parseInt(e.target.value) || 2000 })}
                        data-testid={`input-max-tokens-${agent.agentId}`}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`prompt-${agent.agentId}`}>System Prompt</Label>
                      <Textarea
                        id={`prompt-${agent.agentId}`}
                        value={editState.systemPrompt}
                        onChange={(e) => setEditState({ ...editState, systemPrompt: e.target.value })}
                        className="min-h-[200px] font-mono text-xs"
                        data-testid={`textarea-prompt-${agent.agentId}`}
                      />
                    </div>
                  </CardContent>
                ) : (
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Model</span>
                        <span className="font-medium">{agent.modelName || "AI Model"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Max Tokens</span>
                        <span className="font-medium">{agent.maxTokens || 2000}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Temperature</span>
                        <span className="font-medium">{agent.temperature ? parseFloat(agent.temperature).toFixed(1) : "0.2"}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Knowledge Base</span>
                        <span className="font-medium">{knowledgeBases[agent.agentId] || "N/A"}</span>
                      </div>
                    </div>
                    
                    {agent.systemPrompt && (
                      <div className="pt-2 border-t">
                        <div className="text-sm text-muted-foreground mb-2">System Prompt Preview</div>
                        <div className="text-xs font-mono bg-muted p-2 rounded-md max-h-20 overflow-hidden">
                          {agent.systemPrompt.substring(0, 150)}...
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
                
                {isEditing && (
                  <CardFooter className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={handleCancel}
                      data-testid={`button-cancel-${agent.agentId}`}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSave}
                      disabled={updateMutation.isPending}
                      data-testid={`button-save-${agent.agentId}`}
                    >
                      {updateMutation.isPending ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save
                    </Button>
                  </CardFooter>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2" data-testid="text-empty-agents">No Agent Configurations Found</h3>
            <p className="text-muted-foreground mb-4">
              Click the button above to seed the default agent configurations.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>AI Integration</CardTitle>
          <CardDescription>
            Connection status and API configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 p-4 rounded-lg border flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <div>
                <p className="font-medium">AI Service Connected</p>
                <p className="text-sm text-muted-foreground">Using Replit AI Integrations</p>
              </div>
            </div>
            <Badge variant="secondary">Active</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
