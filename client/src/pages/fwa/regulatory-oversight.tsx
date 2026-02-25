import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { 
  Shield, Scale, Stethoscope, TrendingUp, MessageCircle,
  FileText, AlertTriangle, CheckCircle, Clock, Loader2,
  ChevronRight, BookOpen, Activity, Users, Building2,
  User, Flag, FileSearch, Gavel, Eye, ExternalLink,
  BarChart3, Network, Brain, Search, PlayCircle
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from "recharts";

interface RegulatoryEvidence {
  source: string;
  sourceType: string;
  documentId?: string;
  title: string;
  excerpt: string;
  similarity?: number;
  relevance: "HIGH" | "MEDIUM" | "LOW";
}

interface RegulatorySignal {
  phaseId: number;
  phaseName: string;
  riskFlag: boolean;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidence: number;
  findings: string[];
  evidence: RegulatoryEvidence[];
  recommendedAction: string;
  rationale: string;
}

interface BehavioralAnalysis {
  patientPatterns: {
    isHighRisk: boolean;
    riskScore: number;
    patterns: any[];
    anomalies: string[];
    linkedHighRiskEntities: string[];
  };
  providerPatterns: {
    isHighRisk: boolean;
    riskScore: number;
    flaggedClaimsRatio: number;
    avgDeviation: number;
    linkedHighRiskEntities: string[];
  };
  doctorPatterns?: {
    isHighRisk: boolean;
    riskScore: number;
    linkedHighRiskEntities: string[];
  };
}

interface RegulatoryOversightResult {
  claimId: string;
  analysisTimestamp: string;
  phases: RegulatorySignal[];
  aggregatedScore: number;
  overallRiskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  topRecommendation: string;
  evidenceSummary: RegulatoryEvidence[];
  behavioralAnalysis: BehavioralAnalysis;
  onlineListeningAnalysis?: {
    sentimentScore: number;
    totalMentions: number;
    negativeMentions: any[];
    criticalAlerts: any[];
    topics: string[];
    requiresAction: boolean;
  };
  regulatoryViolations: string[];
  clinicalConcerns: string[];
  enforcementRecommendation: string;
  processingTimeMs: number;
}

const phaseConfig = [
  { id: 1, name: "Regulatory Compliance", icon: Shield, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  { id: 2, name: "Clinical Appropriateness", icon: Stethoscope, color: "text-green-500", bgColor: "bg-green-500/10" },
  { id: 3, name: "Behavioral Patterns", icon: TrendingUp, color: "text-purple-500", bgColor: "bg-purple-500/10" },
  { id: 4, name: "Public Sentiment", icon: MessageCircle, color: "text-amber-500", bgColor: "bg-amber-500/10" },
  { id: 5, name: "Evidence Synthesis", icon: Scale, color: "text-cyan-500", bgColor: "bg-cyan-500/10" }
];

const severityColors: Record<string, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-green-500"
};

const severityBadgeVariants: Record<string, "destructive" | "secondary" | "outline"> = {
  CRITICAL: "destructive",
  HIGH: "destructive",
  MEDIUM: "secondary",
  LOW: "outline"
};

export default function RegulatoryOversight() {
  const { toast } = useToast();
  const [selectedClaimId, setSelectedClaimId] = useState("");
  const [analysisResult, setAnalysisResult] = useState<RegulatoryOversightResult | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("analyze");
  const [expandedPhase, setExpandedPhase] = useState<string>("");

  const handlePhaseClick = (phaseId: number) => {
    setActiveTab("phases");
    setExpandedPhase(`phase-${phaseId}`);
  };

  const dashboardQuery = useQuery({
    queryKey: ["/api/fwa/regulatory-oversight/dashboard"],
    refetchInterval: 60000
  });

  const claimsQuery = useQuery({
    queryKey: ["/api/claims"],
    select: (data: any) => data?.claims?.slice(0, 100) || []
  });

  const analyzeMutation = useMutation({
    mutationFn: async (claimId: string) => {
      const response = await apiRequest("POST", "/api/fwa/regulatory-oversight/analyze", { claimId });
      return response.json();
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      toast({
        title: "Analysis Complete",
        description: `Regulatory oversight analysis completed in ${data.processingTimeMs}ms`
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleAnalyze = () => {
    if (selectedClaimId) {
      analyzeMutation.mutate(selectedClaimId);
    }
  };

  const dashboard = dashboardQuery.data as any;
  const claims = claimsQuery.data || [];

  const getPhaseRadarData = () => {
    if (!analysisResult) return [];
    return analysisResult.phases.map(phase => {
      const config = phaseConfig.find(p => p.id === phase.phaseId);
      return {
        phase: config?.name.split(" ")[0] || `Phase ${phase.phaseId}`,
        score: phase.riskFlag ? (phase.severity === "CRITICAL" ? 100 : phase.severity === "HIGH" ? 75 : phase.severity === "MEDIUM" ? 50 : 25) : 0,
        confidence: phase.confidence * 100
      };
    });
  };

  return (
    <div className="space-y-6" data-testid="regulatory-oversight-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">Regulatory Oversight</h1>
          <p className="text-muted-foreground">
            5-Phase Analysis for CHI Regulatory Detection
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Shield className="h-3 w-3" />
            CHI Compliant
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">High-Risk Providers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="high-risk-providers-count">
              {dashboard?.highRiskEntities?.providers?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg Risk: {Number(dashboard?.highRiskEntities?.providers?.avg_risk_score || 0).toFixed(1)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">High-Risk Patients</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="high-risk-patients-count">
              {dashboard?.highRiskEntities?.patients?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg Risk: {Number(dashboard?.highRiskEntities?.patients?.avg_risk_score || 0).toFixed(1)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">High-Risk Doctors</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="high-risk-doctors-count">
              {dashboard?.highRiskEntities?.doctors?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Avg Risk: {Number(dashboard?.highRiskEntities?.doctors?.avg_risk_score || 0).toFixed(1)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium">Recent Detections</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="recent-detections-count">
              {Object.values(dashboard?.recentDetections || {}).reduce((a: number, b: any) => a + (b || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="analyze" data-testid="tab-analyze">
            <Search className="h-4 w-4 mr-2" />
            Analyze Claim
          </TabsTrigger>
          <TabsTrigger value="phases" data-testid="tab-phases">
            <Activity className="h-4 w-4 mr-2" />
            Phase Details
          </TabsTrigger>
          <TabsTrigger value="evidence" data-testid="tab-evidence">
            <FileText className="h-4 w-4 mr-2" />
            Evidence
          </TabsTrigger>
          <TabsTrigger value="behavioral" data-testid="tab-behavioral">
            <Network className="h-4 w-4 mr-2" />
            Behavioral Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyze" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5" />
                Run Regulatory Oversight Analysis
              </CardTitle>
              <CardDescription>
                Select a claim to run comprehensive 5-phase regulatory analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Select value={selectedClaimId} onValueChange={setSelectedClaimId}>
                    <SelectTrigger data-testid="claim-select">
                      <SelectValue placeholder="Select a claim to analyze" />
                    </SelectTrigger>
                    <SelectContent>
                      {claims.map((claim: any) => (
                        <SelectItem key={claim.id} value={claim.id}>
                          {claim.claimNumber} - {claim.hospital || claim.providerName} (SAR {Number(claim.amount).toLocaleString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleAnalyze}
                  disabled={!selectedClaimId || analyzeMutation.isPending}
                  data-testid="button-analyze"
                >
                  {analyzeMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Gavel className="h-4 w-4 mr-2" />
                      Analyze
                    </>
                  )}
                </Button>
              </div>

              {analysisResult && (
                <div className="space-y-6 pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Analysis Results</h3>
                      <p className="text-sm text-muted-foreground">
                        Claim: {analysisResult.claimId} | Processed in {analysisResult.processingTimeMs}ms
                      </p>
                    </div>
                    <Badge variant={severityBadgeVariants[analysisResult.overallRiskLevel]} className="text-lg px-4 py-1">
                      {analysisResult.overallRiskLevel} RISK
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-4xl font-bold" data-testid="aggregated-score">
                            {(analysisResult.aggregatedScore * 100).toFixed(0)}%
                          </div>
                          <p className="text-sm text-muted-foreground">Aggregated Risk Score</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-amber-500" data-testid="top-recommendation">
                            {analysisResult.topRecommendation}
                          </div>
                          <p className="text-sm text-muted-foreground">Recommended Action</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold">
                            {analysisResult.regulatoryViolations.length} Violations
                          </div>
                          <div className="text-lg text-muted-foreground">
                            {analysisResult.clinicalConcerns.length} Clinical Concerns
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Phase Risk Visualization</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={getPhaseRadarData()}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="phase" />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} />
                            <Radar name="Risk Score" dataKey="score" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
                            <Radar name="Confidence" dataKey="confidence" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} />
                            <Tooltip />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">5-Phase Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analysisResult.phases.map((phase) => {
                          const config = phaseConfig.find(p => p.id === phase.phaseId);
                          const Icon = config?.icon || Shield;
                          return (
                            <div 
                              key={phase.phaseId}
                              className={`flex items-center justify-between p-3 rounded-lg border ${config?.bgColor} cursor-pointer hover-elevate transition-all`}
                              data-testid={`phase-${phase.phaseId}-summary`}
                              onClick={() => handlePhaseClick(phase.phaseId)}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${config?.bgColor}`}>
                                  <Icon className={`h-5 w-5 ${config?.color}`} />
                                </div>
                                <div>
                                  <div className="font-medium">{phase.phaseName}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {phase.findings.length} findings | {(phase.confidence * 100).toFixed(0)}% confidence
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={severityBadgeVariants[phase.severity]}>
                                  {phase.severity}
                                </Badge>
                                {phase.riskFlag && (
                                  <Badge variant="outline" className="text-amber-500 border-amber-500">
                                    {phase.recommendedAction}
                                  </Badge>
                                )}
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Gavel className="h-4 w-4" />
                        Enforcement Recommendation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm" data-testid="enforcement-recommendation">
                        {analysisResult.enforcementRecommendation}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="phases" className="space-y-4">
          {analysisResult ? (
            <Accordion type="single" collapsible value={expandedPhase} onValueChange={setExpandedPhase} className="space-y-2">
              {analysisResult.phases.map((phase) => {
                const config = phaseConfig.find(p => p.id === phase.phaseId);
                const Icon = config?.icon || Shield;
                return (
                  <AccordionItem 
                    key={phase.phaseId} 
                    value={`phase-${phase.phaseId}`}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${config?.bgColor}`}>
                          <Icon className={`h-5 w-5 ${config?.color}`} />
                        </div>
                        <span className="font-semibold">Phase {phase.phaseId}: {phase.phaseName}</span>
                        <Badge variant={severityBadgeVariants[phase.severity]}>{phase.severity}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Risk Flag</div>
                          <Badge variant={phase.riskFlag ? "destructive" : "outline"}>
                            {phase.riskFlag ? "FLAGGED" : "CLEAR"}
                          </Badge>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Confidence</div>
                          <div className="flex items-center gap-2">
                            <Progress value={phase.confidence * 100} className="h-2 flex-1" />
                            <span className="text-sm">{(phase.confidence * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-2">Recommended Action</div>
                        <Badge variant="outline" className="text-amber-500 border-amber-500">
                          {phase.recommendedAction}
                        </Badge>
                      </div>

                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-2">Rationale</div>
                        <p className="text-sm bg-muted p-3 rounded">{phase.rationale}</p>
                      </div>

                      {phase.findings.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-2">Findings ({phase.findings.length})</div>
                          <ul className="space-y-1">
                            {phase.findings.map((finding, idx) => (
                              <li key={idx} className="text-sm flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                {finding}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {phase.evidence.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-2">Evidence ({phase.evidence.length})</div>
                          <div className="space-y-2">
                            {phase.evidence.map((ev, idx) => (
                              <Card key={idx} className="p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="font-medium text-sm">{ev.title}</div>
                                    <div className="text-xs text-muted-foreground">{ev.source}</div>
                                    <p className="text-sm mt-1 text-muted-foreground line-clamp-2">{ev.excerpt}</p>
                                  </div>
                                  <Badge variant={ev.relevance === "HIGH" ? "destructive" : ev.relevance === "MEDIUM" ? "secondary" : "outline"}>
                                    {ev.relevance}
                                  </Badge>
                                </div>
                                {ev.similarity && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <Progress value={ev.similarity * 100} className="h-1 flex-1" />
                                    <span className="text-xs text-muted-foreground">{(ev.similarity * 100).toFixed(0)}% match</span>
                                  </div>
                                )}
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Eye className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Run an analysis to view phase details</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="evidence" className="space-y-4">
          {analysisResult ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Evidence Summary
                </CardTitle>
                <CardDescription>
                  High-relevance evidence from Knowledge Hub supporting regulatory findings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {analysisResult.evidenceSummary.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Relevance</TableHead>
                        <TableHead>Match</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysisResult.evidenceSummary.map((ev, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{ev.source}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{ev.sourceType}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">{ev.title}</TableCell>
                          <TableCell>
                            <Badge variant={ev.relevance === "HIGH" ? "destructive" : "secondary"}>
                              {ev.relevance}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {ev.similarity ? `${(ev.similarity * 100).toFixed(0)}%` : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No high-relevance evidence found</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileSearch className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Run an analysis to view evidence</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="behavioral" className="space-y-4">
          {analysisResult?.behavioralAnalysis ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4" />
                    Patient Behavioral Patterns
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">High-Risk Status</span>
                    <Badge variant={analysisResult.behavioralAnalysis.patientPatterns.isHighRisk ? "destructive" : "outline"}>
                      {analysisResult.behavioralAnalysis.patientPatterns.isHighRisk ? "HIGH RISK" : "NORMAL"}
                    </Badge>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">Risk Score</span>
                      <span className="text-sm font-medium">
                        {analysisResult.behavioralAnalysis.patientPatterns.riskScore.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={analysisResult.behavioralAnalysis.patientPatterns.riskScore} />
                  </div>
                  {analysisResult.behavioralAnalysis.patientPatterns.anomalies.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">Anomalies Detected</div>
                      <ul className="space-y-1">
                        {analysisResult.behavioralAnalysis.patientPatterns.anomalies.map((a, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysisResult.behavioralAnalysis.patientPatterns.linkedHighRiskEntities.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">Linked High-Risk Entities</div>
                      <div className="flex flex-wrap gap-1">
                        {analysisResult.behavioralAnalysis.patientPatterns.linkedHighRiskEntities.map((e, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{e}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4" />
                    Provider Behavioral Patterns
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">High-Risk Status</span>
                    <Badge variant={analysisResult.behavioralAnalysis.providerPatterns.isHighRisk ? "destructive" : "outline"}>
                      {analysisResult.behavioralAnalysis.providerPatterns.isHighRisk ? "HIGH RISK" : "NORMAL"}
                    </Badge>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">Risk Score</span>
                      <span className="text-sm font-medium">
                        {analysisResult.behavioralAnalysis.providerPatterns.riskScore.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={analysisResult.behavioralAnalysis.providerPatterns.riskScore} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Flagged Claims Ratio</div>
                      <div className="text-lg font-semibold">
                        {(analysisResult.behavioralAnalysis.providerPatterns.flaggedClaimsRatio * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Avg Deviation</div>
                      <div className="text-lg font-semibold">
                        {analysisResult.behavioralAnalysis.providerPatterns.avgDeviation.toFixed(2)} σ
                      </div>
                    </div>
                  </div>
                  {analysisResult.behavioralAnalysis.providerPatterns.linkedHighRiskEntities.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">Linked High-Risk Entities</div>
                      <div className="flex flex-wrap gap-1">
                        {analysisResult.behavioralAnalysis.providerPatterns.linkedHighRiskEntities.map((e, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{e}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {analysisResult.onlineListeningAnalysis && (
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <MessageCircle className="h-4 w-4" />
                      Online Listening Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {analysisResult.onlineListeningAnalysis.totalMentions}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Mentions</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-500">
                          {analysisResult.onlineListeningAnalysis.negativeMentions.length}
                        </div>
                        <div className="text-sm text-muted-foreground">Negative</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-amber-500">
                          {analysisResult.onlineListeningAnalysis.criticalAlerts.length}
                        </div>
                        <div className="text-sm text-muted-foreground">Critical Alerts</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${analysisResult.onlineListeningAnalysis.sentimentScore < 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {analysisResult.onlineListeningAnalysis.sentimentScore.toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">Sentiment Score</div>
                      </div>
                    </div>
                    {analysisResult.onlineListeningAnalysis.topics.length > 0 && (
                      <div className="mt-4">
                        <div className="text-sm font-medium text-muted-foreground mb-2">Topics Discussed</div>
                        <div className="flex flex-wrap gap-1">
                          {analysisResult.onlineListeningAnalysis.topics.map((t, i) => (
                            <Badge key={i} variant="secondary">{t}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Network className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Run an analysis to view behavioral patterns</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
