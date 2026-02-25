import { useState, useRef, Fragment } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  FileText,
  Download,
  AlertTriangle,
  Shield,
  DollarSign,
  ClipboardList,
  Building2,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  User,
  FileWarning,
  Gavel,
  MessageSquareWarning,
  Loader2,
  RefreshCw,
  Activity,
  BarChart3,
  Brain,
  Cpu,
  Target,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ProviderProfile {
  providerId: string;
  summary: {
    claimCount: number;
    totalAmount: number;
    avgClaimAmount: number;
    zScore: number;
    percentileRank: number;
    rejectionRate: number;
    flagRate: number;
    uniquePatients: number;
    uniqueDoctors: number;
    lastComputed: string;
    avgRiskScore?: number;
    highRiskCount?: number;
    criticalCount?: number;
    riskLevel?: string;
  } | null;
  riskExplanation: string[];
  claims: ProviderClaim[];
  ruleHitSummary: RuleHit[];
}

interface ProviderClaim {
  detectionId: string;
  claimId: string;
  memberId: string;
  compositeScore: number;
  riskLevel: string;
  methodScores: {
    ruleEngine: number;
    statistical: number;
    unsupervised: number;
    ragLlm: number;
    semantic: number;
  };
  findings: any;
  claimAmount: number;
  serviceDate: string;
  diagnosisCode: string;
  diagnosisDescription?: string;
  procedureCode: string;
  status: string;
  analyzedAt: string;
  detectionSummary?: string;
  recommendedAction?: string;
  primaryDetectionMethod?: string;
}

interface RuleHit {
  ruleCode: string;
  ruleName: string;
  severity: string;
  explanation: string;
  hitCount: number;
}

interface EntityDetectionResult {
  id: string;
  provider_id: string;
  batch_id?: string;
  run_id?: string;
  composite_score: string;
  risk_level: string;
  rule_engine_score?: string;
  statistical_score?: string;
  unsupervised_score?: string;
  rag_llm_score?: string;
  rule_engine_findings?: {
    matchedRules: Array<{
      ruleId: string;
      ruleName: string;
      severity: string;
      hitCount: number;
      explanation: string;
    }>;
  };
  statistical_findings?: {
    anomalyPatterns: Array<{
      patternType: string;
      description: string;
      zScore: number;
      severity: string;
    }>;
  };
  unsupervised_findings?: {
    clusters: Array<{
      clusterId: string;
      behavior: string;
      anomalyScore: number;
    }>;
  };
  rag_llm_findings?: {
    insights: Array<{
      finding: string;
      confidence: number;
      source: string;
    }>;
  };
  semantic_score?: string;
  semantic_findings?: {
    matches: Array<{
      cptCode: string;
      icdCode: string;
      similarity: number;
      riskLevel: string;
    }>;
  };
  analyzed_at: string;
}

interface TimelineDataPoint {
  id: string;
  provider_id: string;
  batch_id: string;
  batch_date: string;
  claim_count: number;
  total_amount: string;
  avg_claim_amount?: string;
  unique_patients: number;
  unique_doctors: number;
  flagged_claims_count: number;
  high_risk_claims_count: number;
  avg_risk_score?: string;
  claim_count_change?: string;
  amount_change?: string;
  risk_score_change?: string;
}

interface AuditReport {
  reportMetadata: {
    generatedAt: string;
    reportType: string;
    providerId: string;
    reportVersion: string;
    generatedBy: string;
  };
  executiveSummary: {
    providerRiskLevel: string;
    compositeRiskScore: number;
    totalClaimsAnalyzed: number;
    totalExposure: number;
    highRiskClaimsCount: number;
    criticalClaimsCount?: number;
    ruleViolationsCount: number;
    enforcementHistoryCount: number;
    complaintsCount: number;
    methodScores?: {
      ruleEngine: number;
      statistical: number;
      unsupervised: number;
      ragLlm: number;
      semantic: number;
    };
  };
  providerMethodScores?: {
    ruleEngine: number;
    statistical: number;
    unsupervised: number;
    ragLlm: number;
    semantic: number;
  };
  riskFactorsSummary: Array<{
    factor: string;
    severity: string;
    explanation: string;
  }>;
  recommendedActions: string[];
  providerProfile: any;
  ruleViolationsDetail: Array<{
    ruleCode: string;
    ruleName: string;
    category: string;
    severity: string;
    hitCount: number;
    explanation: string;
    suggestedAction: string;
  }>;
  highRiskClaims: Array<{
    claimId: string;
    compositeScore: number;
    riskLevel: string;
    claimAmount: number;
    serviceDate: string;
    diagnosisCode: string;
    diagnosisDescription: string;
    procedureCode: string;
    procedureDescription: string;
    primaryDetectionMethod: string;
    detectionSummary: string;
    recommendedAction: string;
    ruleEngineFindings: any;
    methodScores?: {
      ruleEngine: number;
      statistical: number;
      unsupervised: number;
      ragLlm: number;
      semantic?: number;
    };
  }>;
  allClaimsSummary: {
    totalClaims: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
  enforcementHistory: Array<{
    caseNumber: string;
    status: string;
    findingType: string;
    findingDescription: string;
    sanctionType: string;
    penaltyAmount: string;
    regulatoryReference: string;
    createdAt: string;
  }>;
  complaintHistory: Array<{
    complaintNumber: string;
    source: string;
    category: string;
    description: string;
    status: string;
    receivedDate: string;
    resolution: string;
  }>;
}

function getRiskLevelBadgeClasses(level: string | null) {
  const normalizedLevel = level?.toUpperCase();
  switch (normalizedLevel) {
    case "CRITICAL":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    case "HIGH":
      return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
    case "MEDIUM":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    case "LOW":
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
  }
}

function getSeverityBadgeClasses(severity: string | null) {
  const normalizedSeverity = severity?.toLowerCase();
  switch (normalizedSeverity) {
    case "critical":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    case "high":
      return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
    case "medium":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    case "low":
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
  }
}

function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "SAR 0";
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount);
}

function formatDate(date: string | null | undefined): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ExecutiveSummaryCard({ summary }: { summary: AuditReport["executiveSummary"] }) {
  const riskLevelColors: Record<string, string> = {
    CRITICAL: "text-red-600 dark:text-red-400",
    HIGH: "text-orange-600 dark:text-orange-400",
    MEDIUM: "text-amber-600 dark:text-amber-400",
    LOW: "text-green-600 dark:text-green-400",
  };

  return (
    <Card data-testid="card-executive-summary">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          Executive Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Risk Level</p>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={getRiskLevelBadgeClasses(summary.providerRiskLevel)}
                data-testid="badge-risk-level"
              >
                {summary.providerRiskLevel}
              </Badge>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Risk Score</p>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${riskLevelColors[summary.providerRiskLevel] || "text-foreground"}`} data-testid="text-risk-score">
                {summary.compositeRiskScore}
              </span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
            <Progress value={summary.compositeRiskScore} className="h-2" />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Claims</p>
            <p className="text-2xl font-bold" data-testid="text-total-claims">
              {summary.totalClaimsAnalyzed.toLocaleString()}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Exposure</p>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-total-exposure">
              {formatCurrency(summary.totalExposure)}
            </p>
          </div>
        </div>
        <Separator />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span className="text-muted-foreground">High-Risk Claims:</span>
            <span className="font-medium" data-testid="text-high-risk-count">{summary.highRiskClaimsCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileWarning className="w-4 h-4 text-red-500" />
            <span className="text-muted-foreground">Rule Violations:</span>
            <span className="font-medium" data-testid="text-violations-count">{summary.ruleViolationsCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <Gavel className="w-4 h-4 text-purple-500" />
            <span className="text-muted-foreground">Enforcements:</span>
            <span className="font-medium" data-testid="text-enforcements-count">{summary.enforcementHistoryCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquareWarning className="w-4 h-4 text-blue-500" />
            <span className="text-muted-foreground">Complaints:</span>
            <span className="font-medium" data-testid="text-complaints-count">{summary.complaintsCount}</span>
          </div>
        </div>
        
        {/* 5-Method Detection Breakdown */}
        {summary.methodScores && (
          <>
            <Separator />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">5-Method Detection Breakdown</p>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium flex items-center gap-1">
                      <ClipboardList className="w-3 h-3 text-blue-500" />
                      Rule Engine
                    </span>
                    <span className="text-xs text-muted-foreground">30%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={summary.methodScores.ruleEngine} className="h-2 flex-1" />
                    <span className={`text-sm font-bold ${summary.methodScores.ruleEngine >= 30 ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {summary.methodScores.ruleEngine.toFixed(0)}
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium flex items-center gap-1">
                      <BarChart3 className="w-3 h-3 text-green-500" />
                      Statistical
                    </span>
                    <span className="text-xs text-muted-foreground">22%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={summary.methodScores.statistical} className="h-2 flex-1" />
                    <span className={`text-sm font-bold ${summary.methodScores.statistical >= 30 ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {summary.methodScores.statistical.toFixed(0)}
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-orange-500" />
                      ML/Unsupervised
                    </span>
                    <span className="text-xs text-muted-foreground">18%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={summary.methodScores.unsupervised} className="h-2 flex-1" />
                    <span className={`text-sm font-bold ${summary.methodScores.unsupervised >= 30 ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {summary.methodScores.unsupervised.toFixed(0)}
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium flex items-center gap-1">
                      <Brain className="w-3 h-3 text-purple-500" />
                      RAG/LLM
                    </span>
                    <span className="text-xs text-muted-foreground">15%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={summary.methodScores.ragLlm} className="h-2 flex-1" />
                    <span className={`text-sm font-bold ${summary.methodScores.ragLlm >= 30 ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {summary.methodScores.ragLlm.toFixed(0)}
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium flex items-center gap-1">
                      <Activity className="w-3 h-3 text-cyan-500" />
                      Semantic
                    </span>
                    <span className="text-xs text-muted-foreground">15%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={summary.methodScores.semantic} className="h-2 flex-1" />
                    <span className={`text-sm font-bold ${summary.methodScores.semantic >= 30 ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {summary.methodScores.semantic.toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RiskFactorsSection({ factors }: { factors: AuditReport["riskFactorsSummary"] }) {
  const [isOpen, setIsOpen] = useState(true);

  if (factors.length === 0) {
    return (
      <Card data-testid="card-risk-factors">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Risk Factors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p>No significant risk factors identified</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card data-testid="card-risk-factors">
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex items-center justify-between w-full" data-testid="button-toggle-risk-factors">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Risk Factors ({factors.length})
            </CardTitle>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {factors.map((factor, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border bg-muted/30"
                data-testid={`risk-factor-${index}`}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <span className="font-medium">{factor.factor}</span>
                  <Badge variant="outline" className={getSeverityBadgeClasses(factor.severity)}>
                    {factor.severity}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{factor.explanation}</p>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function RecommendedActionsSection({ actions }: { actions: string[] }) {
  if (actions.length === 0) return null;

  return (
    <Card data-testid="card-recommended-actions">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          Recommended Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {actions.map((action, index) => (
            <li key={index} className="flex items-start gap-3" data-testid={`action-${index}`}>
              <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-purple-600 dark:text-purple-400">{index + 1}</span>
              </div>
              <span className="text-sm">{action}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function RuleViolationsTable({ violations }: { violations: AuditReport["ruleViolationsDetail"] }) {
  const [isOpen, setIsOpen] = useState(true);

  if (violations.length === 0) {
    return (
      <Card data-testid="card-rule-violations">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileWarning className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Rule Violations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p>No rule violations found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card data-testid="card-rule-violations">
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex items-center justify-between w-full" data-testid="button-toggle-violations">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileWarning className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Rule Violations ({violations.length})
            </CardTitle>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead className="text-right">Hit Count</TableHead>
                    <TableHead className="min-w-[200px]">Explanation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {violations.map((violation, index) => (
                    <TableRow key={index} data-testid={`row-violation-${index}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{violation.ruleName}</p>
                          <code className="text-xs text-muted-foreground">{violation.ruleCode}</code>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{violation.category || "N/A"}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getSeverityBadgeClasses(violation.severity)}>
                          {violation.severity || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {violation.hitCount}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {violation.explanation || "No explanation available"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function HighRiskClaimsTable({ claims }: { claims: AuditReport["highRiskClaims"] }) {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null);

  if (claims.length === 0) {
    return (
      <Card data-testid="card-high-risk-claims">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            High-Risk Claims
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p>No high-risk claims identified</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card data-testid="card-high-risk-claims">
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex items-center justify-between w-full" data-testid="button-toggle-claims">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              High-Risk Claims ({claims.length})
            </CardTitle>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim ID</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Service Date</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead className="text-center">
                      <div className="flex flex-col items-center">
                        <span>Detection Methods</span>
                        <span className="text-[10px] text-muted-foreground font-normal">Rule | Stat | ML | RAG</span>
                      </div>
                    </TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.map((claim, index) => (
                    <Fragment key={claim.claimId}>
                      <TableRow 
                        data-testid={`row-claim-${index}`}
                        className="cursor-pointer hover-elevate"
                        onClick={() => setExpandedClaim(expandedClaim === claim.claimId ? null : claim.claimId)}
                      >
                        <TableCell className="font-medium">{claim.claimId}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={claim.compositeScore} className="w-12 h-2" />
                            <span className="text-sm">{claim.compositeScore.toFixed(1)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getRiskLevelBadgeClasses(claim.riskLevel)}>
                            {claim.riskLevel || "Unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(claim.claimAmount)}
                        </TableCell>
                        <TableCell>{formatDate(claim.serviceDate)}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {claim.diagnosisCode || "N/A"}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 justify-center">
                            <div className="flex flex-col items-center" title={`Rule Engine: ${claim.methodScores?.ruleEngine?.toFixed(0) || 0}`}>
                              <div className={`w-6 h-6 rounded text-[10px] font-medium flex items-center justify-center ${
                                (claim.methodScores?.ruleEngine || 0) >= 60 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
                                (claim.methodScores?.ruleEngine || 0) >= 40 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' :
                                'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                              }`}>
                                {claim.methodScores?.ruleEngine?.toFixed(0) || 0}
                              </div>
                            </div>
                            <div className="flex flex-col items-center" title={`Statistical: ${claim.methodScores?.statistical?.toFixed(0) || 0}`}>
                              <div className={`w-6 h-6 rounded text-[10px] font-medium flex items-center justify-center ${
                                (claim.methodScores?.statistical || 0) >= 60 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
                                (claim.methodScores?.statistical || 0) >= 40 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' :
                                'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                              }`}>
                                {claim.methodScores?.statistical?.toFixed(0) || 0}
                              </div>
                            </div>
                            <div className="flex flex-col items-center" title={`ML/Unsupervised: ${claim.methodScores?.unsupervised?.toFixed(0) || 0}`}>
                              <div className={`w-6 h-6 rounded text-[10px] font-medium flex items-center justify-center ${
                                (claim.methodScores?.unsupervised || 0) >= 60 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
                                (claim.methodScores?.unsupervised || 0) >= 40 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' :
                                'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                              }`}>
                                {claim.methodScores?.unsupervised?.toFixed(0) || 0}
                              </div>
                            </div>
                            <div className="flex flex-col items-center" title={`RAG/LLM: ${claim.methodScores?.ragLlm?.toFixed(0) || 0}`}>
                              <div className={`w-6 h-6 rounded text-[10px] font-medium flex items-center justify-center ${
                                (claim.methodScores?.ragLlm || 0) >= 60 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
                                (claim.methodScores?.ragLlm || 0) >= 40 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' :
                                'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                              }`}>
                                {claim.methodScores?.ragLlm?.toFixed(0) || 0}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <ChevronDown className={`w-4 h-4 transition-transform ${expandedClaim === claim.claimId ? "rotate-180" : ""}`} />
                        </TableCell>
                      </TableRow>
                      {expandedClaim === claim.claimId && (
                        <TableRow key={`${claim.claimId}-details`}>
                          <TableCell colSpan={8} className="bg-muted/30 p-4">
                            <div className="space-y-4">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">5-Method Detection Breakdown</p>
                                <div className="grid grid-cols-5 gap-3">
                                  <div className="bg-background rounded-lg p-3 border">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium">Rule Engine</span>
                                      <span className="text-xs text-muted-foreground">30%</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Progress value={claim.methodScores?.ruleEngine || 0} className="h-2 flex-1" />
                                      <span className={`text-sm font-bold ${(claim.methodScores?.ruleEngine || 0) >= 60 ? 'text-red-600' : (claim.methodScores?.ruleEngine || 0) >= 40 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                                        {claim.methodScores?.ruleEngine?.toFixed(0) || 0}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="bg-background rounded-lg p-3 border">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium">Statistical</span>
                                      <span className="text-xs text-muted-foreground">22%</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Progress value={claim.methodScores?.statistical || 0} className="h-2 flex-1" />
                                      <span className={`text-sm font-bold ${(claim.methodScores?.statistical || 0) >= 60 ? 'text-red-600' : (claim.methodScores?.statistical || 0) >= 40 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                                        {claim.methodScores?.statistical?.toFixed(0) || 0}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="bg-background rounded-lg p-3 border">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium">ML/Unsupervised</span>
                                      <span className="text-xs text-muted-foreground">18%</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Progress value={claim.methodScores?.unsupervised || 0} className="h-2 flex-1" />
                                      <span className={`text-sm font-bold ${(claim.methodScores?.unsupervised || 0) >= 60 ? 'text-red-600' : (claim.methodScores?.unsupervised || 0) >= 40 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                                        {claim.methodScores?.unsupervised?.toFixed(0) || 0}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="bg-background rounded-lg p-3 border">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium">RAG/LLM</span>
                                      <span className="text-xs text-muted-foreground">15%</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Progress value={claim.methodScores?.ragLlm || 0} className="h-2 flex-1" />
                                      <span className={`text-sm font-bold ${(claim.methodScores?.ragLlm || 0) >= 60 ? 'text-red-600' : (claim.methodScores?.ragLlm || 0) >= 40 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                                        {claim.methodScores?.ragLlm?.toFixed(0) || 0}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="bg-background rounded-lg p-3 border">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium">Semantic</span>
                                      <span className="text-xs text-muted-foreground">15%</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Progress value={claim.methodScores?.semantic || 0} className="h-2 flex-1" />
                                      <span className={`text-sm font-bold ${(claim.methodScores?.semantic || 0) >= 60 ? 'text-red-600' : (claim.methodScores?.semantic || 0) >= 40 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                                        {claim.methodScores?.semantic?.toFixed(0) || 0}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Detection Summary</p>
                                <p className="text-sm">{claim.detectionSummary || "No summary available"}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Recommended Action</p>
                                <p className="text-sm">{claim.recommendedAction || "Manual review recommended"}</p>
                              </div>
                              {claim.diagnosisDescription && (
                                <div>
                                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Diagnosis Description</p>
                                  <p className="text-sm">{claim.diagnosisDescription}</p>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function EnforcementHistorySection({ history }: { history: AuditReport["enforcementHistory"] }) {
  const [isOpen, setIsOpen] = useState(true);

  if (history.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card data-testid="card-enforcement-history">
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex items-center justify-between w-full" data-testid="button-toggle-enforcement">
            <CardTitle className="text-lg flex items-center gap-2">
              <Gavel className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Enforcement History ({history.length})
            </CardTitle>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {history.map((item, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border bg-muted/30"
                data-testid={`enforcement-${index}`}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <span className="font-medium">{item.caseNumber}</span>
                    <p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p>
                  </div>
                  <Badge variant="outline">{item.status}</Badge>
                </div>
                <p className="text-sm mb-2">{item.findingDescription || item.findingType}</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  {item.sanctionType && (
                    <div>
                      <span className="text-muted-foreground">Sanction:</span>{" "}
                      <span className="font-medium">{item.sanctionType}</span>
                    </div>
                  )}
                  {item.penaltyAmount && (
                    <div>
                      <span className="text-muted-foreground">Penalty:</span>{" "}
                      <span className="font-medium text-red-600">{formatCurrency(parseFloat(item.penaltyAmount))}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function ComplaintHistorySection({ history }: { history: AuditReport["complaintHistory"] }) {
  const [isOpen, setIsOpen] = useState(true);

  if (history.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card data-testid="card-complaint-history">
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex items-center justify-between w-full" data-testid="button-toggle-complaints">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquareWarning className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Complaint History ({history.length})
            </CardTitle>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            {history.map((item, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border bg-muted/30"
                data-testid={`complaint-${index}`}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <span className="font-medium">{item.complaintNumber}</span>
                    <p className="text-xs text-muted-foreground">{formatDate(item.receivedDate)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{item.category}</Badge>
                    <Badge variant="outline">{item.status}</Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                {item.resolution && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Resolution:</span>{" "}
                    <span>{item.resolution}</span>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function EntityLevelDetectionSection({ 
  detection, 
  isLoading,
  providerId,
  onRefetch,
}: { 
  detection: EntityDetectionResult | null | undefined; 
  isLoading: boolean;
  providerId: string;
  onRefetch: () => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const { toast } = useToast();

  const analyzeProviderMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/fwa/entity-detection/provider/${providerId}/analyze`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Analysis Complete",
        description: "Entity-level detection analysis has been completed successfully.",
      });
      onRefetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "An error occurred while running the detection analysis.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card data-testid="card-entity-detection">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Entity-Level Detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!detection) {
    return (
      <Card data-testid="card-entity-detection">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Entity-Level Detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p>No entity-level detection data available</p>
            <p className="text-sm mt-1 mb-4">Click to analyze claims and generate detection results</p>
            <Button
              onClick={() => analyzeProviderMutation.mutate()}
              disabled={analyzeProviderMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
              data-testid="button-run-analysis"
            >
              {analyzeProviderMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running Analysis...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const compositeScore = parseFloat(detection.composite_score) || 0;
  const ruleEngineScore = parseFloat(detection.rule_engine_score || "0");
  const statisticalScore = parseFloat(detection.statistical_score || "0");
  const unsupervisedScore = parseFloat(detection.unsupervised_score || "0");
  const ragLlmScore = parseFloat(detection.rag_llm_score || "0");

  const semanticScore = parseFloat(detection.semantic_score || "0");
  
  const methodScores = [
    { 
      name: "Rule Engine", 
      score: ruleEngineScore, 
      weight: "30%", 
      icon: ClipboardList,
      color: "text-blue-600 dark:text-blue-400"
    },
    { 
      name: "Statistical", 
      score: statisticalScore, 
      weight: "22%", 
      icon: BarChart3,
      color: "text-green-600 dark:text-green-400"
    },
    { 
      name: "Unsupervised ML", 
      score: unsupervisedScore, 
      weight: "18%", 
      icon: Cpu,
      color: "text-orange-600 dark:text-orange-400"
    },
    { 
      name: "RAG/LLM", 
      score: ragLlmScore, 
      weight: "15%", 
      icon: Brain,
      color: "text-purple-600 dark:text-purple-400"
    },
    { 
      name: "Semantic", 
      score: semanticScore, 
      weight: "15%", 
      icon: Activity,
      color: "text-cyan-600 dark:text-cyan-400"
    },
  ];

  const matchedRules = detection.rule_engine_findings?.matchedRules || [];
  const anomalyPatterns = detection.statistical_findings?.anomalyPatterns || [];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card data-testid="card-entity-detection">
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex items-center justify-between w-full" data-testid="button-toggle-entity-detection">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Entity-Level Detection
            </CardTitle>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 rounded-lg bg-muted/30 border">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Composite Risk Score</p>
                <div className="flex items-center gap-3">
                  <span className={`text-4xl font-bold ${
                    compositeScore >= 70 ? 'text-red-600 dark:text-red-400' :
                    compositeScore >= 50 ? 'text-orange-600 dark:text-orange-400' :
                    compositeScore >= 30 ? 'text-amber-600 dark:text-amber-400' :
                    'text-green-600 dark:text-green-400'
                  }`} data-testid="text-composite-score">
                    {compositeScore.toFixed(1)}
                  </span>
                  <span className="text-xl text-muted-foreground">/ 100</span>
                  <Badge 
                    variant="outline" 
                    className={getRiskLevelBadgeClasses(detection.risk_level)}
                    data-testid="badge-entity-risk-level"
                  >
                    {detection.risk_level?.toUpperCase() || "UNKNOWN"}
                  </Badge>
                </div>
                <Progress value={compositeScore} className="h-2 mt-2 max-w-xs" />
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Last analyzed: {formatDate(detection.analyzed_at)}</p>
                {detection.batch_id && <p>Batch: {detection.batch_id}</p>}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-3">5-Method Detection Breakdown</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {methodScores.map((method) => (
                  <div 
                    key={method.name} 
                    className="p-4 rounded-lg border bg-background"
                    data-testid={`method-score-${method.name.toLowerCase().replace(/[^a-z]/g, '-')}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <method.icon className={`w-4 h-4 ${method.color}`} />
                        <span className="text-sm font-medium">{method.name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {method.weight}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Progress 
                        value={method.score} 
                        className={`h-2 flex-1 ${
                          method.score >= 60 ? '[&>div]:bg-red-500' :
                          method.score >= 40 ? '[&>div]:bg-orange-500' :
                          '[&>div]:bg-green-500'
                        }`}
                      />
                      <span className={`text-lg font-bold min-w-[3rem] text-right ${
                        method.score >= 60 ? 'text-red-600 dark:text-red-400' :
                        method.score >= 40 ? 'text-orange-600 dark:text-orange-400' :
                        'text-muted-foreground'
                      }`}>
                        {method.score.toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {(matchedRules.length > 0 || anomalyPatterns.length > 0) && (
              <div className="space-y-4">
                {matchedRules.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Matched Rules ({matchedRules.length})</p>
                    <div className="space-y-2">
                      {matchedRules.slice(0, 5).map((rule, index) => (
                        <div 
                          key={index} 
                          className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/30 border"
                          data-testid={`matched-rule-${index}`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{rule.ruleName}</span>
                              <Badge variant="outline" className={getSeverityBadgeClasses(rule.severity)}>
                                {rule.severity}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{rule.explanation}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium">{rule.hitCount}</span>
                            <p className="text-xs text-muted-foreground">hits</p>
                          </div>
                        </div>
                      ))}
                      {matchedRules.length > 5 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{matchedRules.length - 5} more rules
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {anomalyPatterns.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Anomaly Patterns ({anomalyPatterns.length})</p>
                    <div className="space-y-2">
                      {anomalyPatterns.slice(0, 3).map((pattern, index) => (
                        <div 
                          key={index} 
                          className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/30 border"
                          data-testid={`anomaly-pattern-${index}`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{pattern.patternType}</span>
                              <Badge variant="outline" className={getSeverityBadgeClasses(pattern.severity)}>
                                {pattern.severity}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{pattern.description}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-medium">z={pattern.zScore?.toFixed(2) || "N/A"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function TimelineTrendsSection({
  timeline,
  isLoading,
  hasDetection,
  providerId,
  onRunAnalysis,
  isAnalyzing,
}: {
  timeline: TimelineDataPoint[] | null | undefined;
  isLoading: boolean;
  hasDetection: boolean;
  providerId: string;
  onRunAnalysis: () => void;
  isAnalyzing: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);

  if (isLoading) {
    return (
      <Card data-testid="card-timeline-trends">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Timeline Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!timeline || timeline.length === 0) {
    return (
      <Card data-testid="card-timeline-trends">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Timeline Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p>No timeline data available</p>
            {!hasDetection ? (
              <>
                <p className="text-sm mt-1 mb-4">Timeline data will be generated after running detection analysis</p>
                <Button
                  onClick={onRunAnalysis}
                  disabled={isAnalyzing}
                  className="bg-purple-600 hover:bg-purple-700"
                  data-testid="button-run-analysis-timeline"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Running Analysis...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Run Analysis
                    </>
                  )}
                </Button>
              </>
            ) : (
              <p className="text-sm mt-1">Historical trend data will appear after multiple batches are processed</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = [...timeline]
    .reverse()
    .map((point) => ({
      date: formatDate(point.batch_date),
      riskScore: parseFloat(point.avg_risk_score || "0"),
      claimCount: point.claim_count || 0,
      totalAmount: parseFloat(point.total_amount || "0") / 1000,
    }));

  const latestPoint = timeline[0];
  const previousPoint = timeline[1];

  const getTrendInfo = (change: string | undefined) => {
    const changeVal = parseFloat(change || "0");
    if (changeVal > 5) return { icon: TrendingUp, label: "Increasing", color: "text-red-600 dark:text-red-400" };
    if (changeVal < -5) return { icon: TrendingDown, label: "Decreasing", color: "text-green-600 dark:text-green-400" };
    return { icon: Minus, label: "Stable", color: "text-muted-foreground" };
  };

  const riskTrend = getTrendInfo(latestPoint?.risk_score_change);
  const claimTrend = getTrendInfo(latestPoint?.claim_count_change);
  const amountTrend = getTrendInfo(latestPoint?.amount_change);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card data-testid="card-timeline-trends">
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex items-center justify-between w-full" data-testid="button-toggle-timeline">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Timeline Trends
            </CardTitle>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border bg-muted/30" data-testid="trend-risk-score">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Risk Score Trend</span>
                  <riskTrend.icon className={`w-4 h-4 ${riskTrend.color}`} />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    {parseFloat(latestPoint?.avg_risk_score || "0").toFixed(1)}
                  </span>
                  <Badge variant="outline" className={riskTrend.color}>
                    {riskTrend.label}
                  </Badge>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-muted/30" data-testid="trend-claim-count">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Claim Count Trend</span>
                  <claimTrend.icon className={`w-4 h-4 ${claimTrend.color}`} />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    {(latestPoint?.claim_count || 0).toLocaleString()}
                  </span>
                  <Badge variant="outline" className={claimTrend.color}>
                    {claimTrend.label}
                  </Badge>
                </div>
              </div>

              <div className="p-4 rounded-lg border bg-muted/30" data-testid="trend-amount">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Amount Trend</span>
                  <amountTrend.icon className={`w-4 h-4 ${amountTrend.color}`} />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    {formatCurrency(latestPoint?.total_amount || "0")}
                  </span>
                  <Badge variant="outline" className={amountTrend.color}>
                    {amountTrend.label}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="h-64" data-testid="timeline-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }} 
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    yAxisId="left" 
                    tick={{ fontSize: 12 }} 
                    className="text-muted-foreground"
                    domain={[0, 100]}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    tick={{ fontSize: 12 }} 
                    className="text-muted-foreground"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="riskScore" 
                    name="Risk Score"
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--destructive))' }}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="claimCount" 
                    name="Claim Count"
                    stroke="hsl(220, 70%, 50%)" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(220, 70%, 50%)' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="text-xs text-muted-foreground text-center">
              Showing data from {timeline.length} batch{timeline.length !== 1 ? 'es' : ''}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function ProviderProfilePage() {
  const { providerId } = useParams<{ providerId: string }>();
  const { toast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: profile, isLoading: profileLoading } = useQuery<ProviderProfile>({
    queryKey: ["/api/fwa/providers", providerId, "profile"],
    enabled: !!providerId,
  });

  const { data: entityDetection, isLoading: entityDetectionLoading, refetch: refetchEntityDetection } = useQuery<EntityDetectionResult>({
    queryKey: ["/api/fwa/entity-detection/provider", providerId],
    enabled: !!providerId,
  });

  const { data: timeline, isLoading: timelineLoading, refetch: refetchTimeline } = useQuery<TimelineDataPoint[]>({
    queryKey: ["/api/fwa/timeline/provider", providerId],
    enabled: !!providerId,
  });

  const analyzeProviderMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/fwa/entity-detection/provider/${providerId}/analyze`, {});
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Analysis Complete",
        description: "Entity-level detection analysis has been completed successfully.",
      });
      refetchEntityDetection();
      refetchTimeline();
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "An error occurred while running the detection analysis.",
        variant: "destructive",
      });
    },
  });

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/fwa/providers/${providerId}/audit-report`, {});
      return response.json();
    },
    onSuccess: (data: AuditReport) => {
      setAuditReport(data);
      setActiveTab("report");
      toast({
        title: "Audit Report Generated",
        description: "The provider audit report has been generated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Generate Report",
        description: error.message || "An error occurred while generating the audit report.",
        variant: "destructive",
      });
    },
  });

  const handleDownloadPdf = async () => {
    if (!reportRef.current || !auditReport) {
      toast({
        title: "No Report Available",
        description: "Please generate an audit report first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const element = reportRef.current;
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `Provider_Audit_Report_${providerId}_${new Date().toISOString().split("T")[0]}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
      };

      await html2pdf().set(opt).from(element).save();

      toast({
        title: "PDF Downloaded",
        description: "The audit report has been downloaded as PDF.",
      });
    } catch (error) {
      toast({
        title: "PDF Export Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!providerId) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold mb-2">Provider ID Required</h2>
        <p className="text-muted-foreground">Please provide a valid provider ID to view the profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="provider-profile-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/fwa/high-risk-entities">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <Building2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              Provider Audit Report
            </h1>
            <p className="text-sm text-muted-foreground" data-testid="text-provider-id">
              Provider ID: {providerId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => generateReportMutation.mutate()}
            disabled={generateReportMutation.isPending}
            className="bg-purple-600 hover:bg-purple-700"
            data-testid="button-generate-report"
          >
            {generateReportMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Generate Audit Report
              </>
            )}
          </Button>
          {auditReport && (
            <Button
              variant="outline"
              onClick={handleDownloadPdf}
              data-testid="button-download-pdf"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} data-testid="tabs-container">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="report" disabled={!auditReport} data-testid="tab-report">
            Audit Report
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {profileLoading ? (
            <LoadingSkeleton />
          ) : profile ? (
            <>
              <Card data-testid="card-provider-summary">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    Provider Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {profile.summary ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Total Claims</p>
                        <p className="text-2xl font-bold">{(profile.summary.claimCount ?? 0).toLocaleString()}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Total Amount</p>
                        <p className="text-2xl font-bold">{formatCurrency(profile.summary.totalAmount ?? 0)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Avg Claim Amount</p>
                        <p className="text-2xl font-bold">{formatCurrency(profile.summary.avgClaimAmount ?? 0)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Risk Score</p>
                        <p className={`text-2xl font-bold ${(profile.summary.avgRiskScore ?? 0) >= 50 ? "text-red-600" : ""}`}>
                          {(profile.summary.avgRiskScore ?? 0).toFixed(1)}%
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">High Risk Claims</p>
                        <p className="text-lg font-medium text-orange-600">{profile.summary.highRiskCount ?? 0}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Critical Claims</p>
                        <p className="text-lg font-medium text-red-600">{profile.summary.criticalCount ?? 0}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Unique Patients</p>
                        <p className="text-lg font-medium">{profile.summary.uniquePatients ?? 0}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Risk Level</p>
                        <p className={`text-lg font-medium capitalize ${
                          profile.summary.riskLevel === 'critical' ? 'text-red-600' :
                          profile.summary.riskLevel === 'high' ? 'text-orange-600' :
                          profile.summary.riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'
                        }`}>{profile.summary.riskLevel ?? 'low'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                      <p>No summary data available for this provider</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <EntityLevelDetectionSection 
                detection={entityDetection} 
                isLoading={entityDetectionLoading}
                providerId={providerId}
                onRefetch={() => {
                  refetchEntityDetection();
                  refetchTimeline();
                }}
              />

              <TimelineTrendsSection 
                timeline={timeline} 
                isLoading={timelineLoading}
                hasDetection={!!entityDetection}
                providerId={providerId}
                onRunAnalysis={() => analyzeProviderMutation.mutate()}
                isAnalyzing={analyzeProviderMutation.isPending}
              />

              {profile.riskExplanation.length > 0 && (
                <Card data-testid="card-risk-explanation">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-orange-500" />
                      Risk Indicators
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {profile.riskExplanation.map((explanation, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm" data-testid={`risk-indicator-${index}`}>
                          <AlertCircle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                          <span>{explanation}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {profile.ruleHitSummary.length > 0 && (
                <Card data-testid="card-rule-hits">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileWarning className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      Rule Hit Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Rule</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead className="text-right">Hit Count</TableHead>
                          <TableHead className="min-w-[200px]">Explanation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profile.ruleHitSummary.map((hit, index) => (
                          <TableRow key={index} data-testid={`row-rule-hit-${index}`}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{hit.ruleName}</p>
                                <code className="text-xs text-muted-foreground">{hit.ruleCode}</code>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={getSeverityBadgeClasses(hit.severity)}>
                                {hit.severity || "Unknown"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">{hit.hitCount}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {hit.explanation || "No explanation available"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Click "Generate Audit Report" to create a comprehensive audit report for this provider.
                </p>
                <Button
                  onClick={() => generateReportMutation.mutate()}
                  disabled={generateReportMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                  data-testid="button-generate-report-cta"
                >
                  {generateReportMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Audit Report
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No Profile Data</h2>
              <p className="text-muted-foreground">
                No profile data found for this provider. Generate an audit report to view available data.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="report" className="space-y-6">
          {auditReport ? (
            <div ref={reportRef} className="space-y-6 print:space-y-4">
              <div className="flex items-center justify-between print:hidden">
                <div className="text-sm text-muted-foreground">
                  Generated: {new Date(auditReport.reportMetadata.generatedAt).toLocaleString()}
                </div>
                <Badge variant="outline">{auditReport.reportMetadata.reportVersion}</Badge>
              </div>

              <ExecutiveSummaryCard summary={auditReport.executiveSummary} />

              <RiskFactorsSection factors={auditReport.riskFactorsSummary} />

              <RecommendedActionsSection actions={auditReport.recommendedActions} />

              <RuleViolationsTable violations={auditReport.ruleViolationsDetail} />

              <HighRiskClaimsTable claims={auditReport.highRiskClaims} />

              <EnforcementHistorySection history={auditReport.enforcementHistory} />

              <ComplaintHistorySection history={auditReport.complaintHistory} />
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No Report Generated</h2>
              <p className="text-muted-foreground mb-4">
                Click "Generate Audit Report" to create a comprehensive audit report.
              </p>
              <Button
                onClick={() => generateReportMutation.mutate()}
                disabled={generateReportMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {generateReportMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Audit Report
                  </>
                )}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
