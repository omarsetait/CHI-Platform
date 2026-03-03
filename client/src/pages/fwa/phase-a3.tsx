import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  DollarSign,
  ShieldCheck,
  Clock,
  CheckCircle,
  AlertTriangle,
  Play,
  FileText,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { QueryErrorState } from "@/components/error-boundary";

// ── Types matching the API response shape ──
interface ProspectiveAction {
  id: string;
  claim: string;
  action: string;
  status: string;
  impact: number;
  timestamp: string;
}

interface RetrospectiveAction {
  id: string;
  claim: string;
  provider: string;
  action: string;
  status: string;
  amount: number;
  timestamp: string;
}

interface FinancialMetrics {
  preventedThisMonth: number;
  retrospectiveFindings: number;
  pendingReview: number;
  totalFindings: number;
  preventedClaims: number;
  retrospectiveCases: number;
}

interface PhaseA3Data {
  prospectiveActions: ProspectiveAction[];
  retrospectiveActions: RetrospectiveAction[];
  financialMetrics: FinancialMetrics;
}

export default function PhaseA3() {
  const [, navigate] = useLocation();

  const { data, isLoading, error, refetch } = useQuery<PhaseA3Data>({
    queryKey: ["/api/fwa/phase-a3/actions"],
  });

  const prospectiveActions = data?.prospectiveActions ?? [];
  const retrospectiveActions = data?.retrospectiveActions ?? [];
  const financialMetrics: FinancialMetrics = data?.financialMetrics ?? {
    preventedThisMonth: 0,
    retrospectiveFindings: 0,
    pendingReview: 0,
    totalFindings: 0,
    preventedClaims: 0,
    retrospectiveCases: 0,
  };

  const handleRunBatch = () => {
    navigate("/fwa/agent-workflow?entityId=all&entityType=provider&entityName=All%20Providers&phase=A3");
  };

  const handleViewReports = () => {
    navigate("/fwa/cases?status=resolved");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">Phase A3</Badge>
          </div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Corrective Actions</h1>
          <p className="text-muted-foreground">
            Execute interventions on claims with identified inappropriate care patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" data-testid="button-run-batch" onClick={handleRunBatch}>
            <Play className="w-4 h-4 mr-2" />
            Run Batch Analysis
          </Button>
          <Button data-testid="button-view-reports" onClick={handleViewReports}>
            <FileText className="w-4 h-4 mr-2" />
            View Reports
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Dual-Track Operations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                <p className="font-semibold text-green-800 dark:text-green-200">Track 1: Prospective Interventions (Live Claims)</p>
              </div>
              <ul className="text-sm text-green-700 dark:text-green-300 space-y-2">
                <li>Query open/pending claims in real-time</li>
                <li>Apply FWA findings from A2 as rejection rules</li>
                <li>Perform automated claim rejections based on matched patterns</li>
                <li>Generate rejection codes with FWA justification</li>
              </ul>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-3">
                <RotateCcw className="w-5 h-5 text-purple-600" />
                <p className="font-semibold text-purple-800 dark:text-purple-200">Track 2: Retrospective Review (Historical Claims)</p>
              </div>
              <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-2">
                <li>Scan historical accepted claims database</li>
                <li>Identify claims matching A2 FWA patterns retroactively</li>
                <li>Calculate inappropriate care exposure amounts</li>
                <li>Generate enforcement cases with evidence packages</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600 mr-2" />
          <span className="text-muted-foreground">Loading action data...</span>
        </div>
      ) : error ? (
        <QueryErrorState error={error} onRetry={() => refetch()} title="Failed to load action data" />
      ) : !data || (prospectiveActions.length === 0 && retrospectiveActions.length === 0 && financialMetrics.totalFindings === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Action Data</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              No corrective actions have been generated yet. Run a batch analysis to identify claims with inappropriate care patterns.
            </p>
            <Button variant="outline" onClick={handleRunBatch}>
              <Play className="w-4 h-4 mr-2" />
              Run Batch Analysis
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <ShieldCheck className="w-5 h-5 text-green-600" />
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">+12%</Badge>
                </div>
                <p className="text-3xl font-bold text-green-600">${(financialMetrics.preventedThisMonth / 1000).toFixed(0)}K</p>
                <p className="text-sm text-muted-foreground">Prevented This Month</p>
                <p className="text-xs text-muted-foreground mt-1">{financialMetrics.preventedClaims} claims intercepted</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                  <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">+8%</Badge>
                </div>
                <p className="text-3xl font-bold text-purple-600">${(financialMetrics.retrospectiveFindings / 1000).toFixed(0)}K</p>
                <p className="text-sm text-muted-foreground">Retrospective Findings</p>
                <p className="text-xs text-muted-foreground mt-1">{financialMetrics.retrospectiveCases} cases reviewed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-3xl font-bold text-amber-600">${(financialMetrics.pendingReview / 1000).toFixed(0)}K</p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-xs text-muted-foreground mt-1">In progress</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Total</Badge>
                </div>
                <p className="text-3xl font-bold text-blue-600">${(financialMetrics.totalFindings / 1000000).toFixed(2)}M</p>
                <p className="text-sm text-muted-foreground">Total Findings YTD</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="preventive">
            <TabsList>
              <TabsTrigger value="preventive" data-testid="tab-prospective">
                <ShieldCheck className="w-4 h-4 mr-2" />
                Prospective Actions
              </TabsTrigger>
              <TabsTrigger value="recovery" data-testid="tab-retrospective">
                <RotateCcw className="w-4 h-4 mr-2" />
                Retrospective Actions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preventive" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-lg">Live Claim Interventions</CardTitle>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Real-time
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  {prospectiveActions.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">No prospective actions found.</div>
                  ) : (
                    prospectiveActions.map((action) => (
                      <div key={action.id} className="flex items-center justify-between p-4 border-b hover-elevate" data-testid={`prospective-row-${action.id}`}>
                        <div className="flex items-center gap-4">
                          {action.status === "completed" ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <Clock className="w-5 h-5 text-amber-600" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{action.action}</p>
                            <p className="text-xs text-muted-foreground">Claim: {action.claim} • {action.timestamp}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-green-600">+${action.impact.toLocaleString()}</span>
                          <Badge className={action.status === "completed" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"}>
                            {action.status === "completed" ? "Completed" : "Pending"}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recovery" className="mt-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-lg">Historical Claim Review</CardTitle>
                  <Badge variant="outline" className="text-purple-600 border-purple-600">
                    Batch Processing
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  {retrospectiveActions.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">No retrospective actions found.</div>
                  ) : (
                    retrospectiveActions.map((action) => (
                      <div key={action.id} className="flex items-center justify-between p-4 border-b hover-elevate" data-testid={`retrospective-row-${action.id}`}>
                        <div className="flex items-center gap-4">
                          {action.status === "completed" ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : action.status === "in_progress" ? (
                            <Clock className="w-5 h-5 text-blue-600" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-amber-600" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{action.action}</p>
                            <p className="text-xs text-muted-foreground">{action.provider} • Claim: {action.claim} • {action.timestamp}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-purple-600">${action.amount.toLocaleString()}</span>
                          <Badge className={
                            action.status === "completed"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : action.status === "in_progress"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                          }>
                            {action.status === "completed" ? "Reviewed" : action.status === "in_progress" ? "In Progress" : "Pending"}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
