import { useState, useEffect, useMemo } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Sparkles,
  Wand2,
  Layers,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Zap,
  Activity,
} from "lucide-react";

type Mode = "single" | "batch" | "wizard";
type Scenario = "clean" | "suspicious" | "fraudulent";
type Severity = "low" | "medium" | "high" | "mixed";
type EntityType = "provider" | "member" | "practitioner";

interface SingleParams {
  scenario: Scenario;
  scenarioType?: string;
}

interface BatchParams {
  count: number;
}

interface WizardParams {
  count: number;
  severity: Severity;
  scenario?: Scenario;
  targetEntity?: { type: EntityType; id: string };
  codeMix?: { icdCodes?: string[]; cptCodes?: string[] };
}

interface JobSummary {
  durationMs?: number;
  riskBuckets?: { critical: number; high: number; medium: number; low: number };
  enginesRun?: { rule: number; statistical: number; unsupervised: number; ragLlm: number; semantic: number };
  enginesSkipped?: { rule: number; statistical: number; unsupervised: number; ragLlm: number; semantic: number };
  avgCompositeScore?: number;
  topReasons?: string[];
  generation?: {
    mode?: string;
    requestedCount?: number;
    producedCount?: number;
    severity?: string;
    scenarioMix?: string[];
    llmGrounded?: boolean;
    targetEntity?: { type: string; id: string };
  };
}

interface JobStatus {
  id: string;
  jobName: string | null;
  status: string;
  currentStage: string;
  progressPct: number;
  sourceType: string;
  totalRows: number;
  rowsParsed: number;
  rowsNormalized: number;
  rowsPersisted: number;
  rowsDetected: number;
  rowsSkipped: number;
  rowsFailed: number;
  summary: JobSummary | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  mode?: string;
}

interface CreateResponse {
  jobId: string;
  status: string;
  statusUrl: string;
}

const STAGE_ORDER = [
  "generating",
  "queued",
  "parsing",
  "mapping",
  "normalizing",
  "persisting",
  "detecting",
  "completed",
];

const TERMINAL_STATUSES = new Set(["completed", "failed"]);

function formatStage(stage: string): string {
  return stage
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function formatDuration(ms: number | undefined): string {
  if (!ms || ms <= 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m}m ${s}s`;
}

export default function TestCaseGeneratorPage() {
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("single");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const [singleParams, setSingleParams] = useState<SingleParams>({
    scenario: "suspicious",
    scenarioType: "",
  });
  const [batchParams, setBatchParams] = useState<BatchParams>({ count: 7 });
  const [wizardParams, setWizardParams] = useState<WizardParams>({
    count: 5,
    severity: "mixed",
    scenario: undefined,
    targetEntity: undefined,
    codeMix: undefined,
  });
  const [wizardScenarioChoice, setWizardScenarioChoice] = useState<"any" | Scenario>("any");
  const [wizardTargetType, setWizardTargetType] = useState<"none" | EntityType>("none");
  const [wizardTargetId, setWizardTargetId] = useState<string>("");
  const [wizardIcdCsv, setWizardIcdCsv] = useState<string>("");
  const [wizardCptCsv, setWizardCptCsv] = useState<string>("");

  const generateMutation = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/fwa/test-cases/generate", body);
      return (await res.json()) as CreateResponse;
    },
    onSuccess: (data) => {
      setActiveJobId(data.jobId);
      toast({
        title: "Generation started",
        description: `Job ${data.jobId.slice(0, 8)}… is generating test claims.`,
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Could not start generation",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const { data: jobStatus } = useQuery<JobStatus>({
    queryKey: ["/api/fwa/test-cases", activeJobId],
    enabled: !!activeJobId,
    refetchInterval: (query) => {
      const data = query.state.data as JobStatus | undefined;
      if (!data) return 1500;
      return TERMINAL_STATUSES.has(data.status) ? false : 1500;
    },
  });

  // When the job completes, invalidate flagged claims queries so the new
  // synthetic claims show up immediately if the user navigates over.
  useEffect(() => {
    if (jobStatus && jobStatus.status === "completed") {
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/kpi-stats"] });
    }
  }, [jobStatus?.status, jobStatus?.id]);

  const handleSubmit = () => {
    if (mode === "single") {
      const params: Record<string, unknown> = { scenario: singleParams.scenario };
      if (singleParams.scenarioType?.trim()) {
        params.scenarioType = singleParams.scenarioType.trim();
      }
      generateMutation.mutate({ mode: "single", params });
      return;
    }
    if (mode === "batch") {
      generateMutation.mutate({ mode: "batch", params: { count: batchParams.count } });
      return;
    }
    // wizard
    const params: Record<string, unknown> = {
      count: wizardParams.count,
      severity: wizardParams.severity,
    };
    if (wizardScenarioChoice !== "any") params.scenario = wizardScenarioChoice;
    if (wizardTargetType !== "none" && wizardTargetId.trim()) {
      params.targetEntity = { type: wizardTargetType, id: wizardTargetId.trim() };
    }
    const icdList = wizardIcdCsv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const cptList = wizardCptCsv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (icdList.length > 0 || cptList.length > 0) {
      params.codeMix = {
        ...(icdList.length > 0 ? { icdCodes: icdList } : {}),
        ...(cptList.length > 0 ? { cptCodes: cptList } : {}),
      };
    }
    generateMutation.mutate({ mode: "wizard", params });
  };

  const isJobInFlight =
    !!activeJobId && (!jobStatus || !TERMINAL_STATUSES.has(jobStatus.status));
  const isSubmitting = generateMutation.isPending || isJobInFlight;

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl" data-testid="page-test-case-generator">
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-page-title">
              AI Test Case Generator
            </h1>
            <p className="text-sm text-muted-foreground">
              Generate realistic synthetic claims and route them through the same 5-engine
              detection pipeline as real data. Generated claims are tagged with{" "}
              <code className="text-xs">source=&quot;generated&quot;</code> and appear in Flagged Claims.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Configure generation</CardTitle>
            <CardDescription>
              Pick a mode, fill in the parameters, and submit. The job runs in the background
              and you can watch its progress on the right.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList className="grid w-full grid-cols-3" data-testid="tabs-mode">
                <TabsTrigger value="single" data-testid="tab-single">
                  <FileText className="h-4 w-4 mr-1.5" /> Single
                </TabsTrigger>
                <TabsTrigger value="batch" data-testid="tab-batch">
                  <Layers className="h-4 w-4 mr-1.5" /> Batch
                </TabsTrigger>
                <TabsTrigger value="wizard" data-testid="tab-wizard">
                  <Wand2 className="h-4 w-4 mr-1.5" /> Wizard
                </TabsTrigger>
              </TabsList>

              <TabsContent value="single" className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  Generate a single claim of a chosen scenario type.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="single-scenario">Scenario</Label>
                  <Select
                    value={singleParams.scenario}
                    onValueChange={(v) =>
                      setSingleParams((p) => ({ ...p, scenario: v as Scenario }))
                    }
                  >
                    <SelectTrigger id="single-scenario" data-testid="select-single-scenario">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clean">Clean (vanilla, no anomalies)</SelectItem>
                      <SelectItem value="suspicious">Suspicious (mild anomalies)</SelectItem>
                      <SelectItem value="fraudulent">Fraudulent (clear FWA pattern)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="single-scenario-type">Scenario hint (optional)</Label>
                  <Input
                    id="single-scenario-type"
                    placeholder="e.g. upcoding, phantom billing, unbundling"
                    value={singleParams.scenarioType}
                    onChange={(e) =>
                      setSingleParams((p) => ({ ...p, scenarioType: e.target.value }))
                    }
                    data-testid="input-single-scenario-type"
                  />
                  <p className="text-xs text-muted-foreground">
                    Free-text hint passed to the LLM to nudge the fraud pattern.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="batch" className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  Generate a small mixed batch (5–10 claims) covering clean, suspicious, and
                  fraudulent scenarios.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="batch-count">Number of claims (5–10)</Label>
                  <Input
                    id="batch-count"
                    type="number"
                    min={5}
                    max={10}
                    value={batchParams.count}
                    onChange={(e) =>
                      setBatchParams({
                        count: Math.max(5, Math.min(10, parseInt(e.target.value || "5", 10))),
                      })
                    }
                    data-testid="input-batch-count"
                  />
                </div>
              </TabsContent>

              <TabsContent value="wizard" className="space-y-4 pt-4">
                <p className="text-sm text-muted-foreground">
                  Full control over count, severity, scenario, target entity, and code mix.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="wizard-count">Count (1–100)</Label>
                    <Input
                      id="wizard-count"
                      type="number"
                      min={1}
                      max={100}
                      value={wizardParams.count}
                      onChange={(e) =>
                        setWizardParams((p) => ({
                          ...p,
                          count: Math.max(1, Math.min(100, parseInt(e.target.value || "1", 10))),
                        }))
                      }
                      data-testid="input-wizard-count"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wizard-severity">Severity</Label>
                    <Select
                      value={wizardParams.severity}
                      onValueChange={(v) =>
                        setWizardParams((p) => ({ ...p, severity: v as Severity }))
                      }
                    >
                      <SelectTrigger id="wizard-severity" data-testid="select-wizard-severity">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wizard-scenario">Scenario (optional)</Label>
                  <Select
                    value={wizardScenarioChoice}
                    onValueChange={(v) => setWizardScenarioChoice(v as "any" | Scenario)}
                  >
                    <SelectTrigger id="wizard-scenario" data-testid="select-wizard-scenario">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any (driven by severity)</SelectItem>
                      <SelectItem value="clean">Clean</SelectItem>
                      <SelectItem value="suspicious">Suspicious</SelectItem>
                      <SelectItem value="fraudulent">Fraudulent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Target entity (optional)</Label>
                  <p className="text-xs text-muted-foreground -mt-2">
                    Pin every generated claim to a specific provider, member, or practitioner.
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <Select
                      value={wizardTargetType}
                      onValueChange={(v) => setWizardTargetType(v as "none" | EntityType)}
                    >
                      <SelectTrigger data-testid="select-wizard-target-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="provider">Provider</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="practitioner">Practitioner</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      className="col-span-2"
                      placeholder="Entity ID"
                      value={wizardTargetId}
                      onChange={(e) => setWizardTargetId(e.target.value)}
                      disabled={wizardTargetType === "none"}
                      data-testid="input-wizard-target-id"
                    />
                  </div>
                </div>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Code mix (optional)</Label>
                  <p className="text-xs text-muted-foreground -mt-2">
                    Comma-separated codes. The generator will only use codes from these lists.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="wizard-icd" className="text-xs">ICD-10 codes</Label>
                    <Input
                      id="wizard-icd"
                      placeholder="e.g. I10, E11.9, J18.9"
                      value={wizardIcdCsv}
                      onChange={(e) => setWizardIcdCsv(e.target.value)}
                      data-testid="input-wizard-icd"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wizard-cpt" className="text-xs">CPT codes</Label>
                    <Input
                      id="wizard-cpt"
                      placeholder="e.g. 99213, 99214, 80053"
                      value={wizardCptCsv}
                      onChange={(e) => setWizardCptCsv(e.target.value)}
                      data-testid="input-wizard-cpt"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6 pt-4 border-t flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Claims persist with <code className="text-xs">source=&quot;generated&quot;</code> and run through all 5 engines.
              </p>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                data-testid="button-generate"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {generateMutation.isPending ? "Submitting…" : "Running…"}
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" /> Generate test claims
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Job progress</CardTitle>
            <CardDescription>
              {activeJobId
                ? `Job ${activeJobId.slice(0, 8)}…`
                : "Submit a job to see live progress here."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!activeJobId && (
              <div className="text-sm text-muted-foreground py-8 text-center">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No job yet
              </div>
            )}

            {activeJobId && jobStatus && (
              <JobProgressPanel job={jobStatus} />
            )}

            {activeJobId && !jobStatus && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading job…
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {jobStatus && jobStatus.status === "completed" && (
        <CompletedSummaryCard job={jobStatus} />
      )}

      {jobStatus && jobStatus.status === "failed" && (
        <Alert variant="destructive" data-testid="alert-job-failed">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Job failed</AlertTitle>
          <AlertDescription>
            {jobStatus.errorMessage || "Generation or ingestion failed. Check server logs."}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function JobProgressPanel({ job }: { job: JobStatus }) {
  const stageIdx = useMemo(() => {
    const idx = STAGE_ORDER.indexOf(job.currentStage);
    return idx >= 0 ? idx : 0;
  }, [job.currentStage]);

  const isFailed = job.status === "failed";
  const isComplete = job.status === "completed";

  return (
    <>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium" data-testid="text-current-stage">
          {formatStage(job.currentStage)}
        </span>
        <Badge
          variant={isComplete ? "default" : isFailed ? "destructive" : "secondary"}
          data-testid="badge-job-status"
        >
          {job.status}
        </Badge>
      </div>
      <Progress
        value={isFailed ? 100 : job.progressPct}
        className={isFailed ? "[&>div]:bg-destructive" : undefined}
        data-testid="progress-job"
      />
      <div className="grid grid-cols-2 gap-3 text-xs">
        <Stat label="Total rows" value={job.totalRows} testId="stat-total-rows" />
        <Stat label="Persisted" value={job.rowsPersisted} testId="stat-persisted" />
        <Stat label="Detected" value={job.rowsDetected} testId="stat-detected" />
        <Stat label="Failed" value={job.rowsFailed} testId="stat-failed" />
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <Stage label="Generating" reached={stageIdx >= 0} active={job.currentStage === "generating"} />
        <Stage label="Queued" reached={stageIdx >= 1} active={job.currentStage === "queued"} />
        <Stage label="Parsing & mapping" reached={stageIdx >= 2} active={["parsing", "mapping"].includes(job.currentStage)} />
        <Stage label="Normalizing & persisting" reached={stageIdx >= 4} active={["normalizing", "persisting"].includes(job.currentStage)} />
        <Stage label="5-engine detection" reached={stageIdx >= 6} active={job.currentStage === "detecting"} />
        <Stage label="Completed" reached={isComplete} active={false} done={isComplete} />
      </div>
    </>
  );
}

function Stage({
  label,
  reached,
  active,
  done,
}: {
  label: string;
  reached: boolean;
  active: boolean;
  done?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {done ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
      ) : active ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600 dark:text-blue-400" />
      ) : reached ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
      ) : (
        <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30" />
      )}
      <span className={reached ? "text-foreground" : ""}>{label}</span>
    </div>
  );
}

function Stat({ label, value, testId }: { label: string; value: number; testId: string }) {
  return (
    <div className="rounded border bg-muted/30 px-3 py-2">
      <div className="text-muted-foreground text-[10px] uppercase tracking-wide">{label}</div>
      <div className="text-base font-semibold tabular-nums" data-testid={testId}>
        {value}
      </div>
    </div>
  );
}

function CompletedSummaryCard({ job }: { job: JobStatus }) {
  const summary = job.summary;
  const buckets = summary?.riskBuckets;
  const enginesRun = summary?.enginesRun;
  const gen = summary?.generation;

  return (
    <Card data-testid="card-completed-summary">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              Generation complete
            </CardTitle>
            <CardDescription>
              {job.rowsPersisted} synthetic claim{job.rowsPersisted === 1 ? "" : "s"} ingested
              and scored by all 5 engines in {formatDuration(summary?.durationMs)}.
            </CardDescription>
          </div>
          <Link href="/fwa/flagged-claims">
            <Button variant="outline" size="sm" data-testid="link-view-flagged">
              View in Flagged Claims <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {gen && (
          <div>
            <h3 className="text-sm font-medium mb-2">Generation</h3>
            <div className="flex flex-wrap gap-2">
              {gen.mode && (
                <Badge variant="outline" data-testid="badge-gen-mode">mode: {gen.mode}</Badge>
              )}
              {gen.requestedCount !== undefined && (
                <Badge variant="outline" data-testid="badge-gen-requested">
                  requested: {gen.requestedCount}
                </Badge>
              )}
              {gen.producedCount !== undefined && (
                <Badge variant="outline" data-testid="badge-gen-produced">
                  produced: {gen.producedCount}
                </Badge>
              )}
              {gen.severity && (
                <Badge variant="outline" data-testid="badge-gen-severity">
                  severity: {gen.severity}
                </Badge>
              )}
              <Badge variant={gen.llmGrounded ? "default" : "secondary"} data-testid="badge-gen-llm">
                {gen.llmGrounded ? "LLM-grounded" : "deterministic fallback"}
              </Badge>
              {gen.targetEntity && (
                <Badge variant="outline">
                  {gen.targetEntity.type}: {gen.targetEntity.id}
                </Badge>
              )}
            </div>
          </div>
        )}

        {buckets && (
          <div>
            <h3 className="text-sm font-medium mb-2">Risk buckets</h3>
            <div className="grid grid-cols-4 gap-3">
              <RiskTile label="Critical" count={buckets.critical} tone="critical" />
              <RiskTile label="High" count={buckets.high} tone="high" />
              <RiskTile label="Medium" count={buckets.medium} tone="medium" />
              <RiskTile label="Low" count={buckets.low} tone="low" />
            </div>
            {summary?.avgCompositeScore !== undefined && (
              <p className="text-xs text-muted-foreground mt-2">
                Average composite score:{" "}
                <span className="font-medium tabular-nums" data-testid="text-avg-composite">
                  {summary.avgCompositeScore.toFixed(2)}
                </span>
              </p>
            )}
          </div>
        )}

        {enginesRun && (
          <div>
            <h3 className="text-sm font-medium mb-2">Engines run per claim</h3>
            <div className="flex flex-wrap gap-2 text-xs">
              <EngineBadge label="Rule" run={enginesRun.rule} />
              <EngineBadge label="Statistical" run={enginesRun.statistical} />
              <EngineBadge label="Unsupervised" run={enginesRun.unsupervised} />
              <EngineBadge label="RAG-LLM" run={enginesRun.ragLlm} />
              <EngineBadge label="Semantic" run={enginesRun.semantic} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RiskTile({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: "critical" | "high" | "medium" | "low";
}) {
  const toneClass = {
    critical: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300 border-red-200 dark:border-red-900",
    high: "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300 border-orange-200 dark:border-orange-900",
    medium: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-900",
    low: "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300 border-green-200 dark:border-green-900",
  }[tone];
  return (
    <div className={`rounded border px-3 py-2 ${toneClass}`} data-testid={`tile-risk-${tone}`}>
      <div className="text-[10px] uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{count}</div>
    </div>
  );
}

function EngineBadge({ label, run }: { label: string; run: number }) {
  return (
    <Badge variant={run > 0 ? "default" : "secondary"}>
      {label}: {run}
    </Badge>
  );
}
