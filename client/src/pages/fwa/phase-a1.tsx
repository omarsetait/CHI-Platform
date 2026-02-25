import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Brain,
  FileText,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Play,
  BarChart3,
  Database,
  RefreshCw,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { FwaCase } from "@shared/schema";

const inputSources = [
  {
    name: "Model Explainability Reports",
    description: "Feature importance scores and flagging reasons from FWA detection models",
    icon: Brain,
    status: "active",
    lastSync: "5 min ago",
    itemCount: 1247,
  },
  {
    name: "Denial Management Data",
    description: "High rejection rate claims, denial reasons breakdown, denial categories distribution",
    icon: Database,
    status: "active",
    lastSync: "12 min ago",
    itemCount: 3891,
  },
];

const categoryToFlagReason: Record<string, string> = {
  coding: "Upcoding/coding pattern detected",
  management: "Claims management anomaly identified",
  physician: "Provider billing irregularity",
  patient: "Patient utilization concern",
  unknown: "Pattern under investigation",
};

export default function PhaseA1() {
  const [, navigate] = useLocation();

  const { data: cases, isLoading, isError, refetch } = useQuery<FwaCase[]>({
    queryKey: ["/api/fwa/cases"],
  });

  const a1Cases = (cases || [])
    .filter((c) => c.phase === "a1_analysis")
    .slice(0, 5);

  const handleRunAnalysis = () => {
    navigate("/fwa/agent-workflow?entityId=all&entityType=provider&entityName=All%20Providers&phase=A1");
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Phase A1</Badge>
          </div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Analysis & Intelligence Gathering</h1>
          <p className="text-muted-foreground">
            Root cause analysis on flagged claims, providers, and denial patterns
          </p>
        </div>
        <Button data-testid="button-run-analysis" onClick={handleRunAnalysis}>
          <Play className="w-4 h-4 mr-2" />
          Run Analysis Agent
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5 text-purple-600" />
            Agent Responsibilities
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <p className="font-medium">Pattern Analysis</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  Analyze patterns in flagging reasons across claims and providers
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  Correlate denial outcomes with FWA indicators
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  Generate statistical summaries of rejection types
                </li>
              </ul>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <p className="font-medium">Intelligence Generation</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  Identify trends in denial categories
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  Create structured findings report with top rejection reasons
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  Document provider-level anomaly patterns and claim-level risk indicators
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {inputSources.map((source) => (
          <Card key={source.name}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <source.icon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-base">{source.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">Last sync: {source.lastSync}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-green-600 border-green-600">
                {source.status}
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{source.description}</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Items available</span>
                <span className="font-medium">{source.itemCount.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-lg">Recent Analysis Findings</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => refetch()} data-testid="button-refresh-findings">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/fwa/cases">
                View All Cases
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="p-8 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="text-muted-foreground">Failed to load analysis findings</p>
              <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-2">
                Try Again
              </Button>
            </div>
          ) : a1Cases.length === 0 ? (
            <div className="p-8 text-center">
              <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="font-medium">No Analysis Cases</p>
              <p className="text-sm text-muted-foreground mt-1">
                Run the analysis agent to detect patterns and generate findings
              </p>
              <Button size="sm" className="mt-4" onClick={handleRunAnalysis} data-testid="button-run-analysis-empty">
                <Play className="w-4 h-4 mr-2" />
                Run Analysis
              </Button>
            </div>
          ) : (
            a1Cases.map((fwaCase) => {
              const priorityToConfidence: Record<string, number> = {
                critical: 95,
                high: 85,
                medium: 70,
                low: 55,
              };
              const confidence = priorityToConfidence[fwaCase.priority || "medium"] || 70;
              const flagReason = categoryToFlagReason[fwaCase.category || "unknown"] || "Pattern under investigation";
              
              return (
                <Link key={fwaCase.id} href={`/fwa/cases/${fwaCase.caseId}`}>
                  <div className="flex items-center justify-between p-4 border-b hover-elevate cursor-pointer" data-testid={`finding-row-${fwaCase.caseId}`}>
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-muted">
                        <BarChart3 className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{fwaCase.providerId}</p>
                        <p className="text-sm text-muted-foreground">{flagReason}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">${Number(fwaCase.totalAmount || 0).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(fwaCase.createdAt)}</p>
                      </div>
                      <Badge className={confidence >= 85 ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"}>
                        {confidence}% confidence
                      </Badge>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Output Format</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground mb-3">
              The A1 Agent produces a structured JSON report containing:
            </p>
            <ul className="text-sm space-y-2">
              <li className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                <span className="font-medium">Analysis Findings</span> - Statistical insights and trend analysis
              </li>
              <li className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-purple-600" />
                <span className="font-medium">Flagged Entities</span> - Providers and claims with confidence scores
              </li>
              <li className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <span className="font-medium">Top Rejection Reasons</span> - Ranked by frequency
              </li>
              <li className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                <span className="font-medium">Denial Category Breakdowns</span> - Distribution analysis
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
