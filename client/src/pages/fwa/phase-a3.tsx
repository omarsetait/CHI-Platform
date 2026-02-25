import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  DollarSign,
  ShieldCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Play,
  FileText,
  RotateCcw,
} from "lucide-react";
import { Link, useLocation } from "wouter";

const prospectiveActions = [
  { id: "PA-001", claim: "CLM-45678", action: "Auto-rejected: Upcoding pattern match", status: "completed", impact: 8500, timestamp: "2024-01-15 10:23" },
  { id: "PA-002", claim: "CLM-45679", action: "Flagged for review: Unbundling detected", status: "pending", impact: 12000, timestamp: "2024-01-15 10:18" },
  { id: "PA-003", claim: "CLM-45680", action: "Auto-rejected: Phantom billing code", status: "completed", impact: 5200, timestamp: "2024-01-15 09:55" },
  { id: "PA-004", claim: "CLM-45681", action: "Applied rejection rule: Documentation fraud", status: "completed", impact: 15800, timestamp: "2024-01-15 09:42" },
  { id: "PA-005", claim: "CLM-45682", action: "Flagged for review: Suspicious pattern", status: "pending", impact: 7300, timestamp: "2024-01-15 09:30" },
];

const retrospectiveActions = [
  { id: "RA-001", claim: "CLM-42156", provider: "Metro Health", action: "Enforcement case initiated", status: "in_progress", amount: 45000, timestamp: "2024-01-15" },
  { id: "RA-002", claim: "CLM-41892", provider: "City Medical", action: "Evidence package generated", status: "pending", amount: 28500, timestamp: "2024-01-14" },
  { id: "RA-003", claim: "CLM-41567", provider: "Regional Hospital", action: "Review completed", status: "completed", amount: 67000, timestamp: "2024-01-13" },
  { id: "RA-004", claim: "CLM-41234", provider: "Family Care", action: "Enforcement case initiated", status: "in_progress", amount: 18900, timestamp: "2024-01-12" },
  { id: "RA-005", claim: "CLM-40987", provider: "Specialty Diagnostics", action: "Review completed", status: "completed", amount: 34200, timestamp: "2024-01-11" },
];

const financialMetrics = {
  prospectiveFindings: 847500,
  retrospectiveFindings: 523000,
  pendingReview: 392400,
  totalFindings: 1762900,
  prospectiveClaims: 156,
  retrospectiveCases: 45,
};

export default function PhaseA3() {
  const [, navigate] = useLocation();

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
              {prospectiveActions.map((action) => (
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
              ))}
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
              {retrospectiveActions.map((action) => (
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
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
