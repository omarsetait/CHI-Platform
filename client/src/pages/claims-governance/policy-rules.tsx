import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Info,
  Search,
  Plus
} from "lucide-react";

interface PolicyRule {
  id: string;
  ruleName: string;
  description: string;
  ruleType: string;
  severity: string;
  layer: number;
  isActive: boolean;
}

const defaultRules: PolicyRule[] = [
  {
    id: "rule-1",
    ruleName: "Mandatory Field Validation",
    description: "Verify all required fields are present: claim number, member ID, provider ID, service dates, diagnosis codes, and billing amounts",
    ruleType: "regulatory",
    severity: "HIGH",
    layer: 1,
    isActive: true,
  },
  {
    id: "rule-2",
    ruleName: "NPI Verification",
    description: "Validate that provider National Provider Identifier (NPI) is valid and active",
    ruleType: "regulatory",
    severity: "HIGH",
    layer: 1,
    isActive: true,
  },
  {
    id: "rule-3",
    ruleName: "Member Eligibility Check",
    description: "Verify member coverage is active on date of service and plan is in good standing",
    ruleType: "coverage",
    severity: "HIGH",
    layer: 2,
    isActive: true,
  },
  {
    id: "rule-4",
    ruleName: "Network Status Verification",
    description: "Check if provider is in-network or out-of-network for the member's plan",
    ruleType: "coverage",
    severity: "MEDIUM",
    layer: 2,
    isActive: true,
  },
  {
    id: "rule-5",
    ruleName: "Prior Authorization Check",
    description: "Verify services requiring prior authorization have valid approvals on file",
    ruleType: "coverage",
    severity: "HIGH",
    layer: 2,
    isActive: true,
  },
  {
    id: "rule-6",
    ruleName: "Duplicate Claim Detection",
    description: "Identify potential duplicate claims based on member, provider, date, and procedure codes",
    ruleType: "fraud",
    severity: "HIGH",
    layer: 1,
    isActive: true,
  },
  {
    id: "rule-7",
    ruleName: "Timely Filing Limit",
    description: "Ensure claim is submitted within the allowed timeframe from date of service",
    ruleType: "regulatory",
    severity: "MEDIUM",
    layer: 1,
    isActive: true,
  },
  {
    id: "rule-8",
    ruleName: "Benefit Limit Monitoring",
    description: "Track and enforce annual or lifetime benefit limits for covered services",
    ruleType: "coverage",
    severity: "MEDIUM",
    layer: 2,
    isActive: true,
  },
  {
    id: "rule-9",
    ruleName: "Medical Necessity Review",
    description: "Validate that services are medically necessary based on diagnosis codes",
    ruleType: "clinical",
    severity: "HIGH",
    layer: 3,
    isActive: true,
  },
  {
    id: "rule-10",
    ruleName: "Bundling/Unbundling Detection",
    description: "Detect improper code bundling or unbundling practices",
    ruleType: "fraud",
    severity: "HIGH",
    layer: 1,
    isActive: true,
  },
];

function getSeverityBadge(severity: string) {
  const severityLower = severity.toLowerCase();
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

export default function ClaimsGovernancePolicyRules() {
  const [rules, setRules] = useState<PolicyRule[]>(defaultRules);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === id ? { ...rule, isActive: !rule.isActive } : rule
    ));
  };

  const filteredRules = rules.filter(rule => 
    rule.ruleName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rule.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeCount = rules.filter(r => r.isActive).length;
  const highSeverityCount = rules.filter(r => r.severity === "HIGH").length;
  const categoriesCount = new Set(rules.map(r => r.ruleType)).size;

  return (
    <div className="p-6 space-y-6" data-testid="page-policy-rules">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Policy Rules</h1>
            <p className="text-muted-foreground mt-1">
              Configure deterministic rules for claims validation and processing
            </p>
          </div>
        </div>
        <Button data-testid="button-add-rule">
          <Plus className="w-4 h-4 mr-2" />
          Add Rule
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Rules</CardDescription>
            <CardTitle className="text-2xl" data-testid="text-total-rules">
              {rules.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Rules</CardDescription>
            <CardTitle className="text-2xl text-green-600" data-testid="text-active-rules">
              {activeCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>High Severity</CardDescription>
            <CardTitle className="text-2xl text-red-600" data-testid="text-high-severity">
              {highSeverityCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Categories</CardDescription>
            <CardTitle className="text-2xl" data-testid="text-categories-count">
              {categoriesCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle>Rule Configuration</CardTitle>
              <CardDescription>
                Enable or disable rules and view their configuration
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p data-testid="text-empty-rules">No rules match your search</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRules.map((rule) => (
                <div 
                  key={rule.id}
                  className="flex items-start justify-between gap-4 p-4 rounded-lg border"
                  data-testid={`rule-row-${rule.id}`}
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{rule.ruleName}</h3>
                      {getCategoryBadge(rule.ruleType)}
                      {getSeverityBadge(rule.severity)}
                      <Badge variant="outline" className="text-xs">Layer {rule.layer}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{rule.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch 
                      checked={rule.isActive} 
                      onCheckedChange={() => toggleRule(rule.id)}
                      data-testid={`switch-rule-${rule.id}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
