import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
  ArrowLeft,
  BookOpen,
  ClipboardCheck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Users,
  TrendingUp,
  Settings,
  Brain,
  Lightbulb,
  Target,
  Activity,
  FileCheck,
  Eye,
  Edit,
  ArrowRight,
  Workflow,
  Inbox
} from "lucide-react";
import tachyHealthLogo from "@assets/logo.svg";

type RuleStatus = "draft" | "pending_review" | "approved" | "active" | "deprecated";
type RulePriority = "critical" | "high" | "medium" | "low";
type RuleCategory = "clinical" | "technical" | "financial" | "compliance";

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

interface QualityAudit {
  id: string;
  batchId: string;
  provider: string;
  sampleSize: number;
  reviewedClaims: number;
  accuracyScore: number;
  processorScore: number;
  engineScore: number;
  status: "pending" | "in_progress" | "completed";
  findings: number;
  criticalIssues: number;
  auditor: string;
  auditDate: string;
}

interface QualityPillar {
  name: string;
  score: number;
  trend: number;
  icon: string;
}

interface RemedialAction {
  issue: string;
  count: number;
  trend: number;
}

interface ClaimActivity {
  id: string;
  provider: string;
  amount: number;
  status: string;
  phase: string;
}

interface AgentPerformance {
  agent: string;
  accuracy: number;
  processed: number;
}

interface GovernanceData {
  rules: MedicalRule[];
  audits: QualityAudit[];
  qualityPillars: QualityPillar[];
  remedialActions: RemedialAction[];
  recentActivity: ClaimActivity[];
  agentPerformance: AgentPerformance[];
}

export default function ClaimsGovernance() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("rule-studio");
  const [ruleSearchQuery, setRuleSearchQuery] = useState("");
  const [ruleStatusFilter, setRuleStatusFilter] = useState<string>("all");
  const [ruleCategoryFilter, setRuleCategoryFilter] = useState<string>("all");

  const { data: rulesData, isLoading: isLoadingRules } = useQuery<MedicalRule[]>({
    queryKey: ["/api/demo/rules"],
  });

  const { data: qaFindingsData, isLoading: isLoadingQA } = useQuery<QualityAudit[]>({
    queryKey: ["/api/demo/qa-findings"],
  });

  const { data: claimsData, isLoading: isLoadingClaims } = useQuery<ClaimActivity[]>({
    queryKey: ["/api/demo/claims"],
  });

  const rules = rulesData ?? [];
  const audits = qaFindingsData ?? [];

  const filteredRules = rules.filter((rule) => {
    const matchesSearch = 
      rule.name?.toLowerCase().includes(ruleSearchQuery.toLowerCase()) ||
      rule.code?.toLowerCase().includes(ruleSearchQuery.toLowerCase()) ||
      rule.description?.toLowerCase().includes(ruleSearchQuery.toLowerCase());
    const matchesStatus = ruleStatusFilter === "all" || rule.status === ruleStatusFilter;
    const matchesCategory = ruleCategoryFilter === "all" || rule.category === ruleCategoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusBadge = (status: RuleStatus) => {
    const config = {
      draft: { label: "Draft", variant: "outline" as const },
      pending_review: { label: "Pending Review", variant: "secondary" as const },
      approved: { label: "Approved", variant: "default" as const },
      active: { label: "Active", variant: "default" as const },
      deprecated: { label: "Deprecated", variant: "outline" as const },
    };
    return config[status] || config.draft;
  };

  const getPriorityBadge = (priority: RulePriority) => {
    const config = {
      critical: { label: "Critical", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
      high: { label: "High", className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
      medium: { label: "Medium", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
      low: { label: "Low", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    };
    return config[priority] || config.medium;
  };

  const getAuditStatusBadge = (status: QualityAudit["status"]) => {
    const config = {
      pending: { label: "Pending", icon: Clock, className: "text-muted-foreground" },
      in_progress: { label: "In Progress", icon: Activity, className: "text-blue-600" },
      completed: { label: "Completed", icon: CheckCircle2, className: "text-green-600" },
    };
    return config[status] || config.pending;
  };

  const isLoading = isLoadingRules || isLoadingQA || isLoadingClaims;

  const activeRulesCount = rules.filter((r) => r.status === "active").length;
  const pendingReviewCount = rules.filter((r) => r.status === "pending_review").length;
  const totalSavings = rules.reduce((sum, r) => sum + (r.savingsEstimate || 0), 0);
  const totalClaimsAffected = rules.reduce((sum, r) => sum + (r.claimsAffected || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <img 
              src={tachyHealthLogo} 
              alt="TachyHealth" 
              className="h-8 cursor-pointer"
              onClick={() => setLocation("/")}
              data-testid="img-header-logo"
            />
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              <h1 className="font-semibold">Claims Management & Clinical Governance</h1>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="gap-2"
            data-testid="button-back-home"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </header>

      <div className="container px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="rule-studio" className="gap-2" data-testid="tab-rule-studio">
              <BookOpen className="h-4 w-4" />
              Rule Management Studio
            </TabsTrigger>
            <TabsTrigger value="qa-validation" className="gap-2" data-testid="tab-qa-validation">
              <ClipboardCheck className="h-4 w-4" />
              QA Validation
            </TabsTrigger>
            <TabsTrigger value="claims-adjudication" className="gap-2" data-testid="tab-claims-adjudication">
              <Workflow className="h-4 w-4" />
              Claims Adjudication
            </TabsTrigger>
          </TabsList>

          <TabsContent value="rule-studio" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Rule Management Studio</h2>
                <p className="text-muted-foreground">
                  Create, review, and manage medical rules for claims processing
                </p>
              </div>
              <Button className="gap-2" data-testid="button-create-rule">
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
                      {isLoadingRules ? (
                        <Skeleton className="h-8 w-12" />
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
                      {isLoadingRules ? (
                        <Skeleton className="h-8 w-12" />
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
                      {isLoadingRules ? (
                        <Skeleton className="h-8 w-16" />
                      ) : (
                        <p className="text-2xl font-bold">
                          ${(totalSavings / 1000000).toFixed(1)}M
                        </p>
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
                      {isLoadingRules ? (
                        <Skeleton className="h-8 w-16" />
                      ) : (
                        <p className="text-2xl font-bold">
                          {(totalClaimsAffected / 1000).toFixed(0)}K
                        </p>
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
                <div className="flex items-center justify-between gap-4">
                  <CardTitle>Medical Rules Library</CardTitle>
                  <div className="flex items-center gap-2">
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
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingRules ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : filteredRules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Inbox className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Rules Found</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      No medical rules match your search criteria. Try adjusting your filters or create a new rule.
                    </p>
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
                                  {rule.category}
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
                                    ${((rule.savingsEstimate || 0) / 1000).toFixed(0)}K est.
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
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Inbox className="w-10 h-10 text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">
                          No pain points in the pipeline
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Top Remedial Actions
                  </CardTitle>
                  <CardDescription>
                    Most common issues requiring corrective action
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <CheckCircle2 className="w-10 h-10 text-green-500 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        No remedial actions needed
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="qa-validation" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">QA Validation Dashboard</h2>
                <p className="text-muted-foreground">
                  Monitor quality metrics across processing, provider statements, and system engine
                </p>
              </div>
              <Button className="gap-2" data-testid="button-new-audit">
                <Plus className="h-4 w-4" />
                New Audit Session
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {isLoadingQA ? (
                [1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-24 w-full" />
                    </CardContent>
                  </Card>
                ))
              ) : (
                [
                  { name: "Processor Quality", score: 91.2, trend: 2.3, Icon: Users },
                  { name: "Provider Statement Quality", score: 88.5, trend: -1.2, Icon: FileText },
                  { name: "System Engine Quality", score: 95.8, trend: 4.1, Icon: Settings },
                ].map((pillar) => (
                  <Card key={pillar.name}>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-primary/10">
                          <pillar.Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground">{pillar.name}</p>
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold">{pillar.score}%</span>
                            <span className={`text-sm flex items-center gap-1 ${
                              pillar.trend >= 0 ? "text-green-600" : "text-red-600"
                            }`}>
                              {pillar.trend >= 0 ? "+" : ""}{pillar.trend}%
                              <TrendingUp className={`h-4 w-4 ${pillar.trend < 0 ? "rotate-180" : ""}`} />
                            </span>
                          </div>
                        </div>
                      </div>
                      <Progress value={pillar.score} className="mt-4" />
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Quality Audit Sessions</CardTitle>
                <CardDescription>Recent and ongoing quality audits</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingQA ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : audits.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Inbox className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Audit Sessions</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      No quality audit sessions found. Start a new audit session to begin.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch ID</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Sample Size</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Accuracy</TableHead>
                        <TableHead>Findings</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Auditor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {audits.map((audit) => {
                        const statusConfig = getAuditStatusBadge(audit.status);
                        const StatusIcon = statusConfig.icon;
                        return (
                          <TableRow key={audit.id} className="cursor-pointer hover-elevate">
                            <TableCell className="font-mono">{audit.batchId}</TableCell>
                            <TableCell>{audit.provider}</TableCell>
                            <TableCell>{audit.sampleSize}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={(audit.reviewedClaims / audit.sampleSize) * 100} 
                                  className="h-2 w-20" 
                                />
                                <span className="text-sm text-muted-foreground">
                                  {audit.reviewedClaims}/{audit.sampleSize}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {audit.accuracyScore > 0 ? (
                                <span className={`font-medium ${
                                  audit.accuracyScore >= 95 ? "text-green-600" :
                                  audit.accuracyScore >= 90 ? "text-yellow-600" :
                                  "text-red-600"
                                }`}>
                                  {audit.accuracyScore}%
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span>{audit.findings}</span>
                                {audit.criticalIssues > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    {audit.criticalIssues} critical
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`flex items-center gap-1 ${statusConfig.className}`}>
                                <StatusIcon className="h-4 w-4" />
                                <span>{statusConfig.label}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {audit.auditor}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="claims-adjudication" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Claims Adjudication Workflow</h2>
                <p className="text-muted-foreground">
                  6-phase agentic workflow for intelligent claims processing
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="gap-2" onClick={() => setLocation("/claims-governance/adjudication")}>
                  <ArrowRight className="h-4 w-4" />
                  Open Full View
                </Button>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Workflow Phases</CardTitle>
                <CardDescription>
                  Each phase processes claims through specialized AI agents and human review
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingClaims ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Skeleton key={i} className="h-40 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { phase: 1, name: "Intake", Icon: FileCheck, description: "Document validation and data extraction", claimsCount: 0, avgTime: "< 1 min" },
                      { phase: 2, name: "Pre-Check", Icon: AlertTriangle, description: "Eligibility, coverage, and policy verification", claimsCount: 0, avgTime: "1-2 min" },
                      { phase: 3, name: "Analysis", Icon: Brain, description: "Multi-agent AI analysis including FWA detection", claimsCount: 0, avgTime: "2-5 min" },
                      { phase: 4, name: "Decision", Icon: Target, description: "AI recommendation with confidence scoring", claimsCount: 0, avgTime: "1-2 min" },
                      { phase: 5, name: "Adjudicator", Icon: Users, description: "Human review and final decision by trained adjudicators", claimsCount: 0, avgTime: "5-10 min" },
                      { phase: 6, name: "RLHF", Icon: Activity, description: "Reinforcement Learning from Human Feedback collection", claimsCount: 0, avgTime: "< 1 min" },
                    ].map((item) => (
                      <Card 
                        key={item.phase} 
                        className="cursor-pointer hover-elevate border-2 border-transparent hover:border-primary/20"
                        data-testid={`card-phase-${item.phase}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <item.Icon className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">Phase {item.phase}</Badge>
                                <span className="text-xs text-green-600 flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                  Active
                                </span>
                              </div>
                              <h3 className="font-semibold mt-1">{item.name}</h3>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {item.description}
                          </p>
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <FileText className="h-4 w-4" />
                              <span>{item.claimsCount} claims</span>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{item.avgTime}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Recent Adjudication Activity
                  </CardTitle>
                  <CardDescription>Latest claims processed through the workflow</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingClaims ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : (claimsData ?? []).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Inbox className="w-10 h-10 text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {(claimsData ?? []).slice(0, 5).map((claim: any) => (
                        <div 
                          key={claim.id} 
                          className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border hover-elevate cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{claim.claimNumber || claim.id}</p>
                              <p className="text-sm text-muted-foreground">{claim.hospital || claim.provider}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="outline">{claim.phase || "Intake"}</Badge>
                            <Badge 
                              variant={
                                claim.status === "approved" ? "default" : 
                                claim.status === "rejected" ? "destructive" : 
                                "secondary"
                              }
                            >
                              {claim.status || "pending"}
                            </Badge>
                            <span className="text-sm font-medium">
                              SAR {(claim.amount || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    AI Agent Performance
                  </CardTitle>
                  <CardDescription>Analysis agents accuracy and efficiency metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {[
                        { agent: "Regulatory Compliance Agent", accuracy: 96.2, processed: 0 },
                        { agent: "Coverage Verification Agent", accuracy: 94.8, processed: 0 },
                        { agent: "Clinical Review Agent", accuracy: 91.5, processed: 0 },
                        { agent: "Historical Pattern Agent", accuracy: 93.7, processed: 0 },
                        { agent: "Disclosure Analysis Agent", accuracy: 95.1, processed: 0 },
                      ].map((agent) => (
                        <div key={agent.agent} className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{agent.agent}</span>
                            <span className="text-muted-foreground">{agent.accuracy}% accuracy</span>
                          </div>
                          <Progress value={agent.accuracy} className="h-2" />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>RLHF Impact:</strong> Agent accuracy metrics based on adjudicator feedback.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
