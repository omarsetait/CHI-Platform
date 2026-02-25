import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Plus,
  Search,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
  Lightbulb,
  Target,
  ThumbsUp,
  Eye,
  Edit,
  Play,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DemoClaimsRule {
  id: string;
  ruleId: string;
  ruleName: string;
  category: string;
  description: string;
  severity: string;
  status: string;
  triggerConditions: string[];
  actions: string[];
  violationCount: number;
  lastTriggered: string | null;
  createdAt: string;
}

type RuleStatus = "draft" | "pending_review" | "approved" | "active" | "deprecated" | "testing" | "inactive";
type RulePriority = "critical" | "high" | "medium" | "low";
type RuleCategory = "clinical" | "technical" | "financial" | "compliance" | "coding" | "billing" | "medical_necessity" | "documentation";

interface MedicalRule {
  id: string;
  code: string;
  name: string;
  description: string;
  category: RuleCategory;
  status: RuleStatus;
  priority: RulePriority;
  createdBy: string;
  createdDate: string;
  lastModified: string;
  impactScore: number;
  claimsAffected: number;
  savingsEstimate: number;
  approvalProgress: number;
  painPointSource: string;
}

function mapDemoRuleToMedicalRule(r: DemoClaimsRule): MedicalRule {
  const severityToPriority: Record<string, RulePriority> = {
    critical: "critical",
    high: "high",
    medium: "medium",
    low: "low",
  };
  
  const statusMap: Record<string, RuleStatus> = {
    active: "active",
    inactive: "deprecated",
    testing: "pending_review",
  };
  
  return {
    id: r.id,
    code: r.ruleId,
    name: r.ruleName,
    description: r.description,
    category: r.category as RuleCategory,
    status: statusMap[r.status] || "active",
    priority: severityToPriority[r.severity] || "medium",
    createdBy: "Medical Team",
    createdDate: new Date(r.createdAt).toISOString().split("T")[0],
    lastModified: r.lastTriggered ? new Date(r.lastTriggered).toISOString().split("T")[0] : new Date(r.createdAt).toISOString().split("T")[0],
    impactScore: Math.min(99, 50 + Math.floor(r.violationCount / 3)),
    claimsAffected: r.violationCount * 50,
    savingsEstimate: r.violationCount * 2000,
    approvalProgress: r.status === "active" ? 100 : r.status === "testing" ? 65 : 25,
    painPointSource: "Claims Department",
  };
}

const categoryPrefixes: Record<string, string> = {
  clinical: "CLI",
  technical: "TEC",
  financial: "FIN",
  compliance: "COM",
  coding: "COD",
  billing: "BIL",
  medical_necessity: "MED",
  documentation: "DOC",
};

interface NewRuleFormData {
  name: string;
  description: string;
  category: RuleCategory;
  priority: RulePriority;
  painPointSource: string;
}

interface TestRuleFormData {
  claimId: string;
  amount: string;
  procedureCode: string;
}

interface TestResult {
  passed: boolean;
  explanation: string;
}

export default function RuleStudio() {
  const { toast } = useToast();
  
  const { data: demoRules, isLoading } = useQuery<DemoClaimsRule[]>({
    queryKey: ["/api/demo/rules"],
  });
  
  const [localRules, setLocalRules] = useState<MedicalRule[]>([]);
  const [ruleSearchQuery, setRuleSearchQuery] = useState("");
  const [ruleStatusFilter, setRuleStatusFilter] = useState<string>("all");
  const [ruleCategoryFilter, setRuleCategoryFilter] = useState<string>("all");
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newRuleForm, setNewRuleForm] = useState<NewRuleFormData>({
    name: "",
    description: "",
    category: "clinical",
    priority: "medium",
    painPointSource: "",
  });
  
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testingRule, setTestingRule] = useState<MedicalRule | null>(null);
  const [testForm, setTestForm] = useState<TestRuleFormData>({
    claimId: "",
    amount: "",
    procedureCode: "",
  });
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const rules = useMemo(() => {
    const apiRules = (demoRules || []).map(mapDemoRuleToMedicalRule);
    return [...apiRules, ...localRules];
  }, [demoRules, localRules]);

  const generateRuleCode = (category: RuleCategory): string => {
    const prefix = categoryPrefixes[category] || "GEN";
    const existingCodes = rules
      .filter(r => r.code.includes(prefix))
      .map(r => {
        const match = r.code.match(/(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      });
    const nextNumber = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1;
    return `MR-${prefix}-${String(nextNumber).padStart(3, "0")}`;
  };

  const handleCreateRule = async () => {
    if (!newRuleForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Rule name is required",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const newRule: MedicalRule = {
      id: `R${String(rules.length + 1).padStart(3, "0")}`,
      code: generateRuleCode(newRuleForm.category),
      name: newRuleForm.name,
      description: newRuleForm.description,
      category: newRuleForm.category,
      status: "draft",
      priority: newRuleForm.priority,
      createdBy: "Current User",
      createdDate: new Date().toISOString().split("T")[0],
      lastModified: new Date().toISOString().split("T")[0],
      impactScore: Math.floor(Math.random() * 30) + 50,
      claimsAffected: Math.floor(Math.random() * 5000) + 1000,
      savingsEstimate: Math.floor(Math.random() * 500000) + 100000,
      approvalProgress: 0,
      painPointSource: newRuleForm.painPointSource || "User Submitted",
    };
    
    setLocalRules(prev => [...prev, newRule]);
    setCreateDialogOpen(false);
    setNewRuleForm({
      name: "",
      description: "",
      category: "clinical",
      priority: "medium",
      painPointSource: "",
    });
    setIsCreating(false);
    
    toast({
      title: "Rule Created",
      description: `Rule ${newRule.code} has been created successfully`,
    });
  };

  const handleOpenTestDialog = (rule: MedicalRule) => {
    setTestingRule(rule);
    setTestForm({ claimId: "", amount: "", procedureCode: "" });
    setTestResult(null);
    setTestDialogOpen(true);
  };

  const handleRunTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const passed = Math.random() > 0.4;
    const explanations = {
      pass: [
        "Claim meets all rule criteria. Procedure code is valid and amount is within acceptable range.",
        "Rule validation successful. No policy violations detected.",
        "All conditions satisfied. Claim is compliant with the medical rule.",
      ],
      fail: [
        "Claim exceeds frequency limit defined in this rule.",
        "Procedure code does not match expected coverage criteria.",
        "Amount exceeds the maximum allowed by this policy rule.",
        "Missing required documentation for this procedure type.",
      ],
    };
    
    setTestResult({
      passed,
      explanation: passed 
        ? explanations.pass[Math.floor(Math.random() * explanations.pass.length)]
        : explanations.fail[Math.floor(Math.random() * explanations.fail.length)],
    });
    setIsTesting(false);
  };

  const filteredRules = rules.filter((rule) => {
    const matchesSearch = 
      rule.name.toLowerCase().includes(ruleSearchQuery.toLowerCase()) ||
      rule.code.toLowerCase().includes(ruleSearchQuery.toLowerCase()) ||
      rule.description.toLowerCase().includes(ruleSearchQuery.toLowerCase());
    const matchesStatus = ruleStatusFilter === "all" || rule.status === ruleStatusFilter;
    const matchesCategory = ruleCategoryFilter === "all" || rule.category === ruleCategoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusBadge = (status: RuleStatus) => {
    const config: Record<RuleStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      draft: { label: "Draft", variant: "outline" },
      pending_review: { label: "Pending Review", variant: "secondary" },
      approved: { label: "Approved", variant: "default" },
      active: { label: "Active", variant: "default" },
      deprecated: { label: "Deprecated", variant: "outline" },
      testing: { label: "Testing", variant: "secondary" },
      inactive: { label: "Inactive", variant: "outline" },
    };
    return config[status] || { label: status, variant: "secondary" as const };
  };

  const getPriorityBadge = (priority: RulePriority) => {
    const config = {
      critical: { label: "Critical", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
      high: { label: "High", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
      medium: { label: "Medium", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
      low: { label: "Low", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    };
    return config[priority];
  };

  const activeRulesCount = rules.filter(r => r.status === "active").length;
  const pendingReviewCount = rules.filter(r => r.status === "pending_review").length;
  const totalSavings = rules.reduce((sum, r) => sum + r.savingsEstimate, 0);
  const totalClaimsAffected = rules.reduce((sum, r) => sum + r.claimsAffected, 0);

  return (
    <div className="p-6 space-y-6" data-testid="page-rule-studio">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Rule Management Studio</h2>
          <p className="text-muted-foreground">
            Create, review, and manage medical rules for claims processing
          </p>
        </div>
        <Button className="gap-2" data-testid="button-create-rule" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Create New Rule
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Rules</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-10 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{activeRulesCount}</p>
                )}
              </div>
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-10 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{pendingReviewCount}</p>
                )}
              </div>
              <div className="p-2 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Est. Savings</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">${(totalSavings / 1000000).toFixed(1)}M</p>
                )}
              </div>
              <div className="p-2 rounded-full bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Claims Affected</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-12 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{(totalClaimsAffected / 1000).toFixed(0)}K</p>
                )}
              </div>
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle>Medical Rules Library</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search rules..."
                  value={ruleSearchQuery}
                  onChange={(e) => setRuleSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                  data-testid="input-rule-search"
                />
              </div>
              <Select value={ruleStatusFilter} onValueChange={setRuleStatusFilter}>
                <SelectTrigger className="w-40" data-testid="select-rule-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="deprecated">Deprecated</SelectItem>
                </SelectContent>
              </Select>
              <Select value={ruleCategoryFilter} onValueChange={setRuleCategoryFilter}>
                <SelectTrigger className="w-40" data-testid="select-rule-category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="clinical">Clinical</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="coding">Coding</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-4 w-24" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-64" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No rules found</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Impact</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRules.map((rule) => {
                    const statusConfig = getStatusBadge(rule.status);
                    const priorityConfig = getPriorityBadge(rule.priority);
                    return (
                      <TableRow key={rule.id} className="cursor-pointer hover-elevate">
                        <TableCell className="font-mono text-sm">{rule.code}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{rule.name}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-xs">
                              {rule.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {rule.category.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityConfig.className}`}>
                            {priorityConfig.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                            {rule.status !== "active" && rule.status !== "deprecated" && (
                              <div className="flex items-center gap-2">
                                <Progress value={rule.approvalProgress} className="h-1 w-16" />
                                <span className="text-xs text-muted-foreground">
                                  {rule.approvalProgress}%
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <Target className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{rule.impactScore}%</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              ${(rule.savingsEstimate / 1000).toFixed(0)}K est.
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {rule.painPointSource}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              size="icon" 
                              variant="ghost"
                              data-testid={`button-test-rule-${rule.id}`}
                              onClick={() => handleOpenTestDialog(rule)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Pain Point Pipeline
            </CardTitle>
            <CardDescription>
              Identified issues requiring new rules or policy changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { source: "Claims Department", issue: "High rejection rate for maternity claims", priority: "high", votes: 12 },
                { source: "Customer Care", issue: "Confusion on optical coverage limits", priority: "medium", votes: 8 },
                { source: "Pre-Auth Team", issue: "Inconsistent ICU admission approvals", priority: "critical", votes: 15 },
                { source: "Finance", issue: "Cost variance in pharmacy claims", priority: "high", votes: 10 },
              ].map((item, idx) => (
                <div key={idx} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <p className="font-medium">{item.issue}</p>
                    <p className="text-sm text-muted-foreground">Source: {item.source}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(item.priority as RulePriority).className}`}>
                      {item.priority}
                    </span>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <ThumbsUp className="h-4 w-4" />
                      <span className="text-sm">{item.votes}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rule Impact Summary</CardTitle>
            <CardDescription>
              Top performing rules by savings and claims processed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rules.slice(0, 4).map((rule, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <p className="font-medium">{rule.name}</p>
                    <p className="text-sm text-muted-foreground">{rule.code}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">
                      ${(rule.savingsEstimate / 1000).toFixed(0)}K
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {rule.claimsAffected.toLocaleString()} claims
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Rule</DialogTitle>
            <DialogDescription>
              Define a new medical rule for claims processing
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rule-name">Rule Name</Label>
              <Input
                id="rule-name"
                value={newRuleForm.name}
                onChange={(e) => setNewRuleForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Dental Prophylaxis Frequency Limit"
                data-testid="input-rule-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-description">Description</Label>
              <Textarea
                id="rule-description"
                value={newRuleForm.description}
                onChange={(e) => setNewRuleForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this rule does..."
                data-testid="input-rule-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={newRuleForm.category} 
                  onValueChange={(v) => setNewRuleForm(prev => ({ ...prev, category: v as RuleCategory }))}
                >
                  <SelectTrigger data-testid="select-new-rule-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clinical">Clinical</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="compliance">Compliance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select 
                  value={newRuleForm.priority} 
                  onValueChange={(v) => setNewRuleForm(prev => ({ ...prev, priority: v as RulePriority }))}
                >
                  <SelectTrigger data-testid="select-new-rule-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pain-point-source">Pain Point Source</Label>
              <Input
                id="pain-point-source"
                value={newRuleForm.painPointSource}
                onChange={(e) => setNewRuleForm(prev => ({ ...prev, painPointSource: e.target.value }))}
                placeholder="e.g., Claims Department"
                data-testid="input-pain-point-source"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRule} disabled={isCreating} data-testid="button-submit-rule">
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Test Rule</DialogTitle>
            <DialogDescription>
              {testingRule ? `Testing: ${testingRule.name}` : "Enter claim details to test rule"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="test-claim-id">Claim ID</Label>
              <Input
                id="test-claim-id"
                value={testForm.claimId}
                onChange={(e) => setTestForm(prev => ({ ...prev, claimId: e.target.value }))}
                placeholder="e.g., CLM-2024-001234"
                data-testid="input-test-claim-id"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="test-amount">Amount</Label>
                <Input
                  id="test-amount"
                  value={testForm.amount}
                  onChange={(e) => setTestForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="e.g., 5000"
                  data-testid="input-test-amount"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-procedure">Procedure Code</Label>
                <Input
                  id="test-procedure"
                  value={testForm.procedureCode}
                  onChange={(e) => setTestForm(prev => ({ ...prev, procedureCode: e.target.value }))}
                  placeholder="e.g., D0120"
                  data-testid="input-test-procedure"
                />
              </div>
            </div>
            {testResult && (
              <div className={`p-4 rounded-lg ${testResult.passed ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
                <div className="flex items-center gap-2 mb-2">
                  {testResult.passed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`font-medium ${testResult.passed ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                    {testResult.passed ? "Rule Passed" : "Rule Failed"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{testResult.explanation}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={handleRunTest} disabled={isTesting} data-testid="button-run-test">
              {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Run Test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
