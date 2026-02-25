import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Users,
  Settings,
  Activity,
  Eye,
  Building2,
  Download,
  Play,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DemoQAFinding {
  id: string;
  findingId: string;
  claimId: string;
  ruleId: string;
  findingType: string;
  severity: string;
  description: string;
  recommendation: string;
  status: string;
  assignedTo: string;
  createdAt: string;
  resolvedAt: string | null;
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

function mapFindingsToAudits(findings: DemoQAFinding[]): QualityAudit[] {
  const providers = ["King Faisal Hospital", "Saudi German Hospital", "Dr. Sulaiman Al Habib", "Mouwasat Hospital"];
  const auditors = ["Quality Team A", "Quality Team B", "Quality Team C"];
  
  const groupedFindings: Record<string, DemoQAFinding[]> = {};
  findings.forEach(f => {
    const key = f.claimId.substring(0, 12);
    if (!groupedFindings[key]) groupedFindings[key] = [];
    groupedFindings[key].push(f);
  });
  
  return Object.entries(groupedFindings).map(([key, group], idx) => {
    const criticalCount = group.filter(f => f.severity === "critical" || f.severity === "high").length;
    const hasOpenFindings = group.some(f => f.status === "open" || f.status === "escalated");
    
    return {
      id: `QA${String(idx + 1).padStart(3, "0")}`,
      batchId: `B2025-${key}`,
      provider: providers[idx % providers.length],
      sampleSize: 100 + Math.floor(Math.random() * 100),
      reviewedClaims: hasOpenFindings ? Math.floor(Math.random() * 80) + 20 : 100 + Math.floor(Math.random() * 100),
      accuracyScore: hasOpenFindings ? 0 : 85 + Math.random() * 15,
      processorScore: hasOpenFindings ? 0 : 82 + Math.random() * 15,
      engineScore: hasOpenFindings ? 0 : 88 + Math.random() * 12,
      status: hasOpenFindings ? (group.some(f => f.status === "escalated") ? "in_progress" : "pending") : "completed",
      findings: group.length,
      criticalIssues: criticalCount,
      auditor: auditors[idx % auditors.length],
      auditDate: group[0]?.createdAt?.split("T")[0] || new Date().toISOString().split("T")[0],
    };
  });
}

export default function QAValidation() {
  const { toast } = useToast();
  
  const { data: qaFindings, isLoading } = useQuery<DemoQAFinding[]>({
    queryKey: ["/api/demo/qa-findings"],
  });
  
  const [localAudits, setLocalAudits] = useState<QualityAudit[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [validatingAuditId, setValidatingAuditId] = useState<string | null>(null);
  const [validationProgress, setValidationProgress] = useState(0);

  const audits = localAudits.length > 0 ? localAudits : mapFindingsToAudits(qaFindings || []);
  
  const qualityPillars = [
    { name: "Processor Quality", score: 91.2, trend: 2.3, icon: Users },
    { name: "Provider Statement Quality", score: 88.5, trend: -1.2, icon: FileText },
    { name: "System Engine Quality", score: 95.8, trend: 4.1, icon: Settings },
  ];

  const topRemedialActions = [
    { issue: "Cost discrepancy between pre-auth and claim", count: 234, trend: -15 },
    { issue: "Missing supporting documentation", count: 189, trend: 8 },
    { issue: "Incorrect procedure coding", count: 156, trend: -22 },
    { issue: "Duplicate service billing", count: 98, trend: -45 },
    { issue: "Policy exclusion violations", count: 87, trend: 12 },
  ];

  const getAuditStatusBadge = (status: QualityAudit["status"]) => {
    const config = {
      pending: { label: "Pending", icon: Clock, className: "text-muted-foreground" },
      in_progress: { label: "In Progress", icon: Activity, className: "text-blue-600" },
      completed: { label: "Completed", icon: CheckCircle2, className: "text-green-600" },
    };
    return config[status];
  };

  const handleExportReport = async () => {
    setIsExporting(true);
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const headers = [
      "Audit ID",
      "Batch ID",
      "Provider",
      "Sample Size",
      "Accuracy Score",
      "Status",
      "Findings",
      "Auditor",
      "Date"
    ];
    
    const rows = audits.map(audit => [
      audit.id,
      audit.batchId,
      audit.provider,
      audit.sampleSize.toString(),
      audit.status === "pending" ? "-" : `${audit.accuracyScore.toFixed(1)}%`,
      audit.status.replace("_", " "),
      audit.findings.toString(),
      audit.auditor,
      audit.auditDate,
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `qa-audit-report-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setIsExporting(false);
    
    toast({
      title: "Export Complete",
      description: "QA audit report has been downloaded successfully",
    });
  };

  const handleRunValidation = async (auditId: string) => {
    setValidatingAuditId(auditId);
    setValidationProgress(0);
    
    const updatedAudits = audits.map(audit => 
      audit.id === auditId 
        ? { ...audit, status: "in_progress" as const }
        : audit
    );
    setLocalAudits(updatedAudits);
    
    toast({
      title: "Validation Started",
      description: "Processing audit batch...",
    });
    
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 300));
      setValidationProgress(i);
    }
    
    const audit = audits.find(a => a.id === auditId);
    if (audit) {
      setLocalAudits(prev => prev.map(a => 
        a.id === auditId 
          ? { 
              ...a, 
              status: "completed" as const,
              reviewedClaims: a.sampleSize,
              accuracyScore: Math.random() * 10 + 88,
              processorScore: Math.random() * 10 + 85,
              engineScore: Math.random() * 10 + 90,
              findings: Math.floor(Math.random() * 15) + 3,
              criticalIssues: Math.floor(Math.random() * 3),
            }
          : a
      ));
    }
    
    setValidatingAuditId(null);
    setValidationProgress(0);
    
    toast({
      title: "Validation Complete",
      description: "Audit batch has been processed successfully",
    });
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-qa-validation">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">QA Validation</h2>
          <p className="text-muted-foreground">
            Quality assurance, sampling methodology, and audit tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="gap-2" 
            onClick={handleExportReport}
            disabled={isExporting}
            data-testid="button-export-report"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export Report
          </Button>
          <Button className="gap-2" data-testid="button-new-audit">
            <Plus className="h-4 w-4" />
            Schedule New Audit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {qualityPillars.map((pillar) => {
          const IconComponent = pillar.icon;
          return (
            <Card key={pillar.name}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <IconComponent className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{pillar.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold">{pillar.score}%</p>
                      <span className={`text-sm ${pillar.trend >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {pillar.trend >= 0 ? "+" : ""}{pillar.trend}%
                      </span>
                    </div>
                  </div>
                </div>
                <Progress value={pillar.score} className="h-2" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Active Audits</CardTitle>
            <CardDescription>Sampling rate: 5-7% by provider size and claim type</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : audits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No audits available</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch ID</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Sample</TableHead>
                    <TableHead>Accuracy</TableHead>
                    <TableHead>Findings</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audits.map((audit) => {
                    const statusConfig = getAuditStatusBadge(audit.status);
                    const StatusIcon = statusConfig.icon;
                    const isValidating = validatingAuditId === audit.id;
                    
                    return (
                      <TableRow key={audit.id}>
                        <TableCell className="font-mono text-sm">{audit.batchId}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {audit.provider}
                          </div>
                        </TableCell>
                        <TableCell>
                          {isValidating ? (
                            <div className="space-y-1">
                              <span>{Math.floor(audit.sampleSize * validationProgress / 100)}/{audit.sampleSize}</span>
                              <Progress value={validationProgress} className="h-1 w-16" />
                            </div>
                          ) : (
                            `${audit.reviewedClaims}/${audit.sampleSize}`
                          )}
                        </TableCell>
                        <TableCell>
                          {audit.status === "pending" || isValidating ? (
                            <span className="text-muted-foreground">-</span>
                          ) : (
                            <span className={audit.accuracyScore >= 90 ? "text-green-600" : audit.accuracyScore >= 80 ? "text-yellow-600" : "text-red-600"}>
                              {audit.accuracyScore.toFixed(1)}%
                            </span>
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
                            {isValidating ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <StatusIcon className="h-4 w-4" />
                            )}
                            {isValidating ? "Validating..." : statusConfig.label}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {audit.status === "pending" && !isValidating && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="gap-1"
                                onClick={() => handleRunValidation(audit.id)}
                                data-testid={`button-run-validation-${audit.id}`}
                              >
                                <Play className="h-3 w-3" />
                                Run
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" data-testid={`button-view-audit-${audit.id}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Top Remedial Actions
            </CardTitle>
            <CardDescription>Last quarter findings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topRemedialActions.map((action, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{action.issue}</p>
                    <p className="text-xs text-muted-foreground">{action.count} occurrences</p>
                  </div>
                  <span className={`text-sm font-medium ${action.trend < 0 ? "text-green-600" : "text-red-600"}`}>
                    {action.trend > 0 ? "+" : ""}{action.trend}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Standardization Initiatives</CardTitle>
            <CardDescription>
              Ongoing efforts to codify adjudication rules and reduce subjectivity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: "Cost Discrepancy Handling", progress: 85, status: "In Progress" },
                { name: "Pre-Auth vs Claim Variance Rules", progress: 72, status: "In Progress" },
                { name: "Medical Necessity Documentation", progress: 100, status: "Completed" },
                { name: "Duplicate Detection Logic", progress: 95, status: "Testing" },
              ].map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{item.name}</p>
                    <Badge variant={item.status === "Completed" ? "default" : "secondary"}>
                      {item.status}
                    </Badge>
                  </div>
                  <Progress value={item.progress} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Automation Coverage</CardTitle>
            <CardDescription>
              Claims auto-adjudication by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { category: "Dental Claims", rate: 100, color: "bg-green-500" },
                { category: "Optical Claims", rate: 100, color: "bg-green-500" },
                { category: "Pharmaceutical", rate: 100, color: "bg-green-500" },
                { category: "Outpatient Services", rate: 48, color: "bg-yellow-500" },
                { category: "Inpatient Claims", rate: 0, color: "bg-red-500" },
              ].map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{item.category}</span>
                    <span className="font-medium">{item.rate}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all`}
                      style={{ width: `${item.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> Inpatient claims require manual medical review due to complexity. 
                Team of ~30 medical staff handles complex adjudication.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
