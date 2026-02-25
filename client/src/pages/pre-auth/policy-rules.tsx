import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Info,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PreAuthPolicyRule } from "@shared/schema";

const defaultRules = [
  {
    id: "rule-1",
    ruleId: "rule-1",
    ruleName: "Mandatory Field Validation",
    description: "Verify all required fields are present: claim number, member ID, provider ID, service dates, diagnosis codes, and billing amounts",
    ruleType: "regulatory",
    category: "regulatory",
    severity: "HIGH",
    layer: 1,
    isActive: true,
  },
  {
    id: "rule-2",
    ruleId: "rule-2",
    ruleName: "NPI Verification",
    description: "Validate that provider National Provider Identifier (NPI) is valid and active",
    ruleType: "regulatory",
    category: "regulatory",
    severity: "HIGH",
    layer: 1,
    isActive: true,
  },
  {
    id: "rule-3",
    ruleId: "rule-3",
    ruleName: "Member Eligibility Check",
    description: "Verify member coverage is active on date of service and plan is in good standing",
    ruleType: "coverage",
    category: "coverage",
    severity: "HIGH",
    layer: 2,
    isActive: true,
  },
  {
    id: "rule-4",
    ruleId: "rule-4",
    ruleName: "Network Status Verification",
    description: "Check if provider is in-network or out-of-network for the member's plan",
    ruleType: "coverage",
    category: "coverage",
    severity: "MEDIUM",
    layer: 2,
    isActive: true,
  },
  {
    id: "rule-5",
    ruleId: "rule-5",
    ruleName: "Prior Authorization Check",
    description: "Verify services requiring prior authorization have valid approvals on file",
    ruleType: "coverage",
    category: "coverage",
    severity: "HIGH",
    layer: 2,
    isActive: true,
  },
  {
    id: "rule-6",
    ruleId: "rule-6",
    ruleName: "Duplicate Claim Detection",
    description: "Identify potential duplicate claims based on member, provider, date, and procedure codes",
    ruleType: "fraud",
    category: "fraud",
    severity: "HIGH",
    layer: 1,
    isActive: true,
  },
  {
    id: "rule-7",
    ruleId: "rule-7",
    ruleName: "Timely Filing Limit",
    description: "Ensure claim is submitted within the allowed timeframe from date of service",
    ruleType: "regulatory",
    category: "regulatory",
    severity: "MEDIUM",
    layer: 1,
    isActive: true,
  },
  {
    id: "rule-8",
    ruleId: "rule-8",
    ruleName: "Benefit Limit Monitoring",
    description: "Track and enforce annual or lifetime benefit limits for covered services",
    ruleType: "coverage",
    category: "coverage",
    severity: "MEDIUM",
    layer: 2,
    isActive: true,
  },
];

function getSeverityBadge(severity: string | null) {
  const severityLower = (severity || "medium").toLowerCase();
  const config: Record<string, { variant: "default" | "destructive" | "secondary"; icon: typeof AlertTriangle }> = {
    high: { variant: "destructive", icon: AlertTriangle },
    medium: { variant: "default", icon: Info },
    low: { variant: "secondary", icon: CheckCircle },
  };
  
  const { variant, icon: Icon } = config[severityLower] || config.medium;
  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="w-3 h-3" />
      {severityLower.charAt(0).toUpperCase() + severityLower.slice(1)}
    </Badge>
  );
}

function getCategoryBadge(category: string) {
  const labels: Record<string, string> = {
    regulatory: "Regulatory",
    coverage: "Coverage",
    fraud: "Fraud Detection",
    clinical: "Clinical",
  };
  
  return <Badge variant="outline">{labels[category] || category}</Badge>;
}

export default function PreAuthPolicyRules() {
  const { toast } = useToast();
  const { data: dbRules, isLoading } = useQuery<PreAuthPolicyRule[]>({
    queryKey: ['/api/pre-auth/policy-rules'],
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest('PUT', `/api/pre-auth/policy-rules/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pre-auth/policy-rules'] });
      toast({
        title: "Rule Updated",
        description: "Policy rule status has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update rule status",
        variant: "destructive",
      });
    },
  });

  const handleToggleRule = (ruleId: string, currentState: boolean) => {
    toggleMutation.mutate({ id: ruleId, isActive: !currentState });
  };

  const rules = dbRules?.length ? dbRules : defaultRules;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <Shield className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Policy Rules</h1>
          <p className="text-muted-foreground mt-1">
            Configure deterministic rules for Phase 1 (Regulatory) and Phase 2 (Coverage) engines
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Rules</CardDescription>
            <CardTitle className="text-2xl" data-testid="text-total-rules">
              {isLoading ? <Skeleton className="h-8 w-12" /> : rules.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Rules</CardDescription>
            <CardTitle className="text-2xl text-green-600" data-testid="text-active-rules">
              {isLoading ? <Skeleton className="h-8 w-12" /> : rules.filter((r: any) => r.isActive !== false).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>High Severity</CardDescription>
            <CardTitle className="text-2xl text-red-600" data-testid="text-high-severity">
              {isLoading ? <Skeleton className="h-8 w-12" /> : rules.filter((r: any) => r.severity === "HIGH" || r.severity === "high").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Categories</CardDescription>
            <CardTitle className="text-2xl" data-testid="text-categories-count">
              {isLoading ? <Skeleton className="h-8 w-12" /> : new Set(rules.map((r: any) => r.ruleType || r.category)).size}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rule Configuration</CardTitle>
          <CardDescription>
            Enable or disable rules and view their configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p data-testid="text-empty-rules">No policy rules configured yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rules.map((rule: any) => {
                const ruleId = rule.id || rule.ruleId;
                const isActive = rule.isActive !== false;
                const isPending = toggleMutation.isPending && toggleMutation.variables?.id === ruleId;
                
                return (
                  <div 
                    key={ruleId}
                    className="flex items-start justify-between gap-4 p-4 rounded-lg border"
                    data-testid={`rule-row-${ruleId}`}
                  >
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium">{rule.ruleName || rule.name}</h3>
                        {getCategoryBadge(rule.ruleType || rule.category)}
                        {getSeverityBadge(rule.severity)}
                        {rule.layer && (
                          <Badge variant="outline" className="text-xs">Layer {rule.layer}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{rule.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      ) : null}
                      <Switch 
                        checked={isActive} 
                        onCheckedChange={() => handleToggleRule(ruleId, isActive)}
                        disabled={toggleMutation.isPending}
                        data-testid={`switch-rule-${ruleId}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
