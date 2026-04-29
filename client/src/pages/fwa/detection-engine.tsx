import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ShieldCheck,
  Sparkles,
  Upload,
  FileSearch,
  FileSpreadsheet,
  FolderUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Activity,
  ArrowRight,
  Brain,
  BarChart3,
  Network,
  ClipboardCheck,
  Wand2,
  History as HistoryIcon,
  ChevronRight,
  Info,
} from "lucide-react";

// =============================================================================
// Types — keep aligned with the server contracts. The server stores ingest jobs
// (uploads + generated runs) in fwa_ingest_jobs, and per-row results in
// fwa_ingest_rows. Both feed this page.
// =============================================================================

type IngestStatus =
  | "queued"
  | "parsing"
  | "mapping"
  | "awaiting_confirmation"
  | "normalizing"
  | "persisting"
  | "detecting"
  | "completed"
  | "failed"
  | "cancelled"
  | "generating";

type RecommendedAction = "pay" | "review" | "deny";

interface IngestJobSummary {
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
  };
}

interface IngestJob {
  id: string;
  jobName: string | null;
  sourceType: string;
  sourceFileName: string | null;
  status: IngestStatus | string;
  currentStage: string;
  progressPct: number;
  totalRows: number;
  rowsParsed: number;
  rowsNormalized: number;
  rowsPersisted: number;
  rowsDetected: number;
  rowsSkipped: number;
  rowsFailed: number;
  summary: IngestJobSummary | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  columnMapping?: {
    confidence: number;
    overallConfidence?: number;
    mappings: Array<{
      schemaField: string;
      sourceColumn: string | null;
      confidence: number;
      reason?: string;
      required: boolean;
      needsConfirmation?: boolean;
    }>;
    unmappedColumns?: string[];
    warnings?: string[];
    autoMapped: boolean;
    overrides?: Record<string, string>;
  } | null;
  detectedHeaders?: string[] | null;
}

interface IngestRow {
  id: string;
  jobId: string;
  rowIndex: number;
  claimNumber: string | null;
  claimId: string | null;
  status: string;
  missingFields: string[] | null;
  ineligibleEngines: Array<{ engine: string; reason: string }> | null;
  detection: {
    compositeScore?: number;
    compositeRiskLevel?: string;
    ruleEngineScore?: number;
    statisticalScore?: number;
    unsupervisedScore?: number;
    ragLlmScore?: number;
    semanticScore?: number;
    semanticFindings?: any;
    primaryDetectionMethod?: string;
    detectionSummary?: string;
    recommendedAction?: RecommendedAction | string;
    enginesRun?: string[];
    enginesSkipped?: Array<{ engine: string; reason: string }>;
  } | null;
  errorMessage: string | null;
}

interface DetectionFindings {
  rule_engine?: any;
  statistical_learning?: any;
  unsupervised_learning?: any;
  rag_llm?: any;
  semantic_validation?: any;
}

// Unified shape consumed by the result panel — works for single-claim direct
// analyze responses, ingest row records, and findings fetched from
// /api/fwa/detection-results.
interface UnifiedResult {
  claimNumber: string;
  claimId?: string | null;
  source: "single" | "ingest" | "generated";
  compositeScore: number;
  compositeRiskLevel: string;
  ruleEngineScore: number;
  statisticalScore: number;
  unsupervisedScore: number;
  ragLlmScore: number;
  semanticScore: number;
  recommendedAction: string;
  detectionSummary?: string;
  primaryDetectionMethod?: string;
  enginesRun?: string[];
  enginesSkipped?: Array<{ engine: string; reason: string }>;
  isPartial?: boolean;
  missingFields?: string[];
  findings?: DetectionFindings;
  semanticFindings?: any;
  jobId?: string;
}

const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);

const ENGINE_DEFINITIONS: Array<{
  key: keyof Pick<UnifiedResult, "ruleEngineScore" | "statisticalScore" | "unsupervisedScore" | "ragLlmScore" | "semanticScore">;
  apiName: string;
  label: string;
  icon: typeof Brain;
  colorClass: string;
}> = [
  { key: "ruleEngineScore", apiName: "rule_engine", label: "Rule Engine", icon: ShieldCheck, colorClass: "bg-blue-500" },
  { key: "statisticalScore", apiName: "statistical_learning", label: "Statistical", icon: BarChart3, colorClass: "bg-emerald-500" },
  { key: "unsupervisedScore", apiName: "unsupervised_learning", label: "Unsupervised", icon: Network, colorClass: "bg-purple-500" },
  { key: "ragLlmScore", apiName: "rag_llm", label: "RAG-LLM", icon: Brain, colorClass: "bg-amber-500" },
  { key: "semanticScore", apiName: "semantic_validation", label: "Semantic", icon: ClipboardCheck, colorClass: "bg-cyan-500" },
];

const CANONICAL_FIELDS = [
  { field: "claimNumber", required: true, label: "Claim Number" },
  { field: "memberId", required: true, label: "Member ID" },
  { field: "providerId", required: true, label: "Provider ID" },
  { field: "practitionerId", required: false, label: "Practitioner ID" },
  { field: "claimType", required: false, label: "Claim Type" },
  { field: "serviceDate", required: true, label: "Service Date" },
  { field: "amount", required: true, label: "Amount" },
  { field: "primaryDiagnosis", required: true, label: "Primary Diagnosis" },
  { field: "icdCodes", required: false, label: "Secondary ICD Codes" },
  { field: "cptCodes", required: false, label: "CPT / Procedure Codes" },
  { field: "description", required: false, label: "Description" },
  { field: "specialty", required: false, label: "Specialty" },
  { field: "city", required: false, label: "City" },
  { field: "providerType", required: false, label: "Provider Type" },
  { field: "lengthOfStay", required: false, label: "Length of Stay" },
  { field: "quantity", required: false, label: "Quantity" },
  { field: "isPreAuthorized", required: false, label: "Pre-Authorized" },
];

// =============================================================================
// Helpers
// =============================================================================

function formatStage(stage: string | null | undefined): string {
  if (!stage) return "—";
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

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString();
}

function scoreColorClass(score: number): string {
  if (score >= 75) return "bg-red-500";
  if (score >= 50) return "bg-orange-500";
  if (score >= 25) return "bg-yellow-500";
  return "bg-emerald-500";
}

function riskTextClass(level: string | null | undefined): string {
  switch ((level || "").toLowerCase()) {
    case "critical":
      return "text-red-600 dark:text-red-400";
    case "high":
      return "text-orange-600 dark:text-orange-400";
    case "medium":
      return "text-yellow-600 dark:text-yellow-400";
    default:
      return "text-emerald-600 dark:text-emerald-400";
  }
}

function actionBadgeClasses(action: string | undefined): string {
  switch ((action || "").toLowerCase()) {
    case "deny":
      return "bg-red-100 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900";
    case "review":
      return "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900";
    case "pay":
      return "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function jobTypeLabel(sourceType: string): { label: string; tone: string } {
  switch (sourceType) {
    case "generated":
      return { label: "Generated", tone: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300" };
    case "file_upload":
      return { label: "Upload", tone: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" };
    case "inline":
      return { label: "Inline", tone: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300" };
    default:
      return { label: sourceType, tone: "bg-muted text-muted-foreground" };
  }
}

function statusBadgeTone(status: string): string {
  switch (status) {
    case "completed":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
    case "failed":
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";
    case "cancelled":
      return "bg-muted text-muted-foreground";
    case "awaiting_confirmation":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
    default:
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
  }
}

function normalizeFromIngestRow(row: IngestRow, sourceType: string): UnifiedResult {
  const det = row.detection || {};
  return {
    claimNumber: row.claimNumber || `Row #${row.rowIndex + 1}`,
    claimId: row.claimId,
    source: sourceType === "generated" ? "generated" : "ingest",
    compositeScore: Number(det.compositeScore || 0),
    compositeRiskLevel: det.compositeRiskLevel || "low",
    ruleEngineScore: Number(det.ruleEngineScore || 0),
    statisticalScore: Number(det.statisticalScore || 0),
    unsupervisedScore: Number(det.unsupervisedScore || 0),
    ragLlmScore: Number(det.ragLlmScore || 0),
    semanticScore: Number(det.semanticScore || 0),
    recommendedAction: det.recommendedAction || "review",
    detectionSummary: det.detectionSummary,
    primaryDetectionMethod: det.primaryDetectionMethod,
    enginesRun: det.enginesRun,
    enginesSkipped: det.enginesSkipped,
    isPartial: row.status === "partial",
    missingFields: row.missingFields || undefined,
    semanticFindings: det.semanticFindings,
    jobId: row.jobId,
  };
}

function normalizeFromAnalyze(claimNumber: string, payload: any): UnifiedResult {
  return {
    claimNumber,
    source: "single",
    compositeScore: Number(payload.compositeScore || 0),
    compositeRiskLevel: payload.compositeRiskLevel || "low",
    ruleEngineScore: Number(payload.ruleEngineScore || 0),
    statisticalScore: Number(payload.statisticalScore || 0),
    unsupervisedScore: Number(payload.unsupervisedScore || 0),
    ragLlmScore: Number(payload.ragLlmScore || 0),
    semanticScore: Number(payload.semanticScore || 0),
    recommendedAction: payload.recommendedAction || "review",
    detectionSummary: payload.detectionSummary,
    primaryDetectionMethod: payload.primaryDetectionMethod,
    enginesRun: payload.enginesRun,
    enginesSkipped: payload.enginesSkipped,
    isPartial: false,
    findings: {
      rule_engine: payload.ruleEngineFindings,
      statistical_learning: payload.statisticalFindings,
      unsupervised_learning: payload.unsupervisedFindings,
      rag_llm: payload.ragLlmFindings,
      semantic_validation: payload.semanticFindings,
    },
    semanticFindings: payload.semanticFindings,
  };
}

// =============================================================================
// Page
// =============================================================================

export default function DetectionEnginePage() {
  const { toast } = useToast();

  const [activeResult, setActiveResult] = useState<UnifiedResult | null>(null);
  const [showSingle, setShowSingle] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // Recent jobs feed (uploads + generated runs share the same table).
  const { data: jobsData, refetch: refetchJobs } = useQuery<{ jobs: IngestJob[] }>({
    queryKey: ["/api/fwa/ingest"],
    refetchInterval: 3000,
  });
  const jobs = jobsData?.jobs || [];

  const filteredJobs = useMemo(() => {
    if (statusFilter === "all") return jobs;
    return jobs.filter((j) => j.status === statusFilter);
  }, [jobs, statusFilter]);

  // Fetch detection findings (rule/statistical/etc.) on demand for ingest rows
  // that have a persisted claimId. Single-claim analyze already supplies
  // findings inline; we only fetch when missing.
  const { data: extraFindings } = useQuery<any>({
    queryKey: ["/api/fwa/detection-results", activeResult?.claimId],
    enabled: !!activeResult?.claimId && !activeResult?.findings,
    retry: false,
  });

  const enrichedResult = useMemo<UnifiedResult | null>(() => {
    if (!activeResult) return null;
    if (activeResult.findings) return activeResult;
    if (!extraFindings) return activeResult;
    return {
      ...activeResult,
      findings: {
        rule_engine: extraFindings.ruleEngineFindings,
        statistical_learning: extraFindings.statisticalFindings,
        unsupervised_learning: extraFindings.unsupervisedFindings,
        rag_llm: extraFindings.ragLlmFindings,
        semantic_validation: extraFindings.semanticEvidence || activeResult.semanticFindings,
      },
    };
  }, [activeResult, extraFindings]);

  const handleResultsRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/fwa/ingest"] });
    refetchJobs();
  };

  // After a job finishes, expand it in the history feed and surface the first
  // (highest-row-index = newest) row in the unified results panel so users
  // are taken straight to the evidence view.
  const surfaceJobResults = async (jobId: string, sourceType: string) => {
    try {
      const res = await fetch(`/api/fwa/ingest/${jobId}/results?limit=1`, { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as { rows: IngestRow[] };
      const first = data.rows?.[0];
      if (first) {
        setActiveResult(normalizeFromIngestRow(first, sourceType));
      }
      setExpandedJobId(jobId);
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/ingest", jobId, "results"] });
    } catch {
      // best-effort; surfacing nothing is fine, the user can click in History.
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="page-detection-engine">
      {/* ===== Header ===== */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="page-title">
            <ShieldCheck className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            FWA Command Center
          </h1>
          <p className="text-muted-foreground">
            Submit a single claim, upload a batch, or generate AI test cases — every claim is scored by all 5 engines.
          </p>
        </div>
      </div>

      {/* ===== Command Bar ===== */}
      <Card data-testid="card-command-bar">
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Button
              variant="outline"
              size="lg"
              className="h-auto justify-start py-4 hover-elevate active-elevate-2"
              onClick={() => setShowSingle(true)}
              data-testid="button-action-single"
            >
              <FileSearch className="h-5 w-5 mr-3 text-blue-600 dark:text-blue-400" />
              <div className="text-left">
                <div className="font-medium">Submit Single Claim</div>
                <div className="text-xs text-muted-foreground">Score one claim against all 5 engines</div>
              </div>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-auto justify-start py-4 hover-elevate active-elevate-2"
              onClick={() => setShowBatch(true)}
              data-testid="button-action-batch"
            >
              <Upload className="h-5 w-5 mr-3 text-emerald-600 dark:text-emerald-400" />
              <div className="text-left">
                <div className="font-medium">Upload Batch</div>
                <div className="text-xs text-muted-foreground">CSV / XLSX of any size with smart auto-mapping</div>
              </div>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-auto justify-start py-4 hover-elevate active-elevate-2"
              onClick={() => setShowWizard(true)}
              data-testid="button-action-wizard"
            >
              <Sparkles className="h-5 w-5 mr-3 text-purple-600 dark:text-purple-400" />
              <div className="text-left">
                <div className="font-medium">Generate Test Cases</div>
                <div className="text-xs text-muted-foreground">AI wizard for scenario, count, severity & target</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== Main: results + history ===== */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Results panel */}
        <div className="lg:col-span-2">
          <ResultsPanel result={enrichedResult} onClear={() => setActiveResult(null)} />
        </div>

        {/* History panel */}
        <div className="lg:col-span-1">
          <HistoryPanel
            jobs={filteredJobs}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            expandedJobId={expandedJobId}
            onToggleJob={(id) => setExpandedJobId((cur) => (cur === id ? null : id))}
            onSelectRow={(row, job) => setActiveResult(normalizeFromIngestRow(row, job.sourceType))}
            activeRowKey={activeResult?.jobId && activeResult?.claimNumber ? `${activeResult.jobId}::${activeResult.claimNumber}` : null}
          />
        </div>
      </div>

      {/* ===== Action overlays ===== */}
      <SingleClaimSheet
        open={showSingle}
        onOpenChange={setShowSingle}
        onResult={(claimNumber, payload) => {
          setActiveResult(normalizeFromAnalyze(claimNumber, payload));
          setShowSingle(false);
          toast({ title: "Claim analyzed", description: `Composite ${(payload.compositeScore || 0).toFixed(1)} • ${payload.recommendedAction || "review"}` });
        }}
      />

      <BatchUploadSheet
        open={showBatch}
        onOpenChange={setShowBatch}
        onCompleted={(jobId, summary) => {
          handleResultsRefresh();
          surfaceJobResults(jobId, "file_upload");
          toast({
            title: "Batch ingested",
            description: summary
              ? `${summary.persisted}/${summary.total} rows scored · ${summary.flagged} flagged`
              : "Showing the first claim — pick others from History.",
          });
        }}
      />

      <TestCaseWizardDialog
        open={showWizard}
        onOpenChange={setShowWizard}
        onCompleted={(jobId, summary) => {
          handleResultsRefresh();
          surfaceJobResults(jobId, "generated");
          toast({
            title: "Test cases generated",
            description: summary
              ? `${summary.persisted} generated · ${summary.flagged} flagged`
              : "Showing the first generated claim — pick others from History.",
          });
        }}
      />
    </div>
  );
}

// =============================================================================
// Results panel
// =============================================================================

function ResultsPanel({ result, onClear }: { result: UnifiedResult | null; onClear: () => void }) {
  if (!result) {
    return (
      <Card className="h-full" data-testid="card-results-empty">
        <CardContent className="flex flex-col items-center justify-center min-h-[420px] text-center p-8">
          <Activity className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-medium">No claim selected</h3>
          <p className="text-sm text-muted-foreground max-w-md mt-1">
            Use the actions above to submit a single claim, upload a batch, or generate test cases. Then pick any
            claim from the history to see its 5-engine breakdown here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-result">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle data-testid="text-result-claim">{result.claimNumber}</CardTitle>
              <Badge variant="outline" className="text-xs" data-testid="badge-result-source">
                {result.source === "generated" ? "Generated" : result.source === "ingest" ? "Ingested" : "Single"}
              </Badge>
              {result.isPartial && (
                <Badge
                  className="text-xs bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900"
                  variant="outline"
                  data-testid="badge-result-partial"
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Partial
                </Badge>
              )}
            </div>
            <CardDescription>
              Risk: <span className={`font-medium uppercase ${riskTextClass(result.compositeRiskLevel)}`} data-testid="text-result-risk">{result.compositeRiskLevel}</span>
              {result.detectionSummary ? <> · {result.detectionSummary}</> : null}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`text-sm px-3 py-1 capitalize ${actionBadgeClasses(result.recommendedAction)}`}
              data-testid="badge-recommended-action"
            >
              {result.recommendedAction}
            </Badge>
            <Button variant="ghost" size="sm" onClick={onClear} data-testid="button-clear-result">
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-[180px_1fr]">
          <CompositeGauge score={result.compositeScore} riskLevel={result.compositeRiskLevel} />
          <EngineBreakdown result={result} />
        </div>

        {result.isPartial && result.missingFields && result.missingFields.length > 0 && (
          <PartialExplainer missingFields={result.missingFields} skipped={result.enginesSkipped} />
        )}

        {!result.isPartial && result.enginesSkipped && result.enginesSkipped.length > 0 && (
          <SkippedExplainer skipped={result.enginesSkipped} />
        )}

        <Separator />

        <EvidenceList findings={result.findings} semanticFindings={result.semanticFindings} />

        {result.claimId && (
          <div className="flex justify-end pt-2">
            <Link href={`/fwa/claims/${result.claimId}`}>
              <Button variant="outline" size="sm" data-testid="link-open-claim">
                Open full claim <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CompositeGauge({ score, riskLevel }: { score: number; riskLevel: string }) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const strokeColor =
    clamped >= 75 ? "#ef4444" : clamped >= 50 ? "#f97316" : clamped >= 25 ? "#eab308" : "#10b981";

  return (
    <div className="flex flex-col items-center justify-center" data-testid="gauge-composite">
      <div className="relative w-[160px] h-[160px]">
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
          <circle cx="80" cy="80" r={radius} className="fill-none stroke-muted" strokeWidth="14" />
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 600ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold tabular-nums" data-testid="text-composite-score">
            {clamped.toFixed(0)}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Composite</div>
        </div>
      </div>
      <div className={`mt-2 text-sm font-medium uppercase ${riskTextClass(riskLevel)}`}>{riskLevel}</div>
    </div>
  );
}

function EngineBreakdown({ result }: { result: UnifiedResult }) {
  const skippedSet = new Set((result.enginesSkipped || []).map((s) => s.engine));
  return (
    <div className="space-y-2.5" data-testid="engine-breakdown">
      {ENGINE_DEFINITIONS.map((eng) => {
        const score = Number(result[eng.key] || 0);
        const skipped = skippedSet.has(eng.apiName);
        const Icon = eng.icon;
        return (
          <div key={eng.key} className="space-y-1" data-testid={`engine-bar-${eng.apiName}`}>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{eng.label}</span>
                {skipped && (
                  <Badge variant="outline" className="text-[10px] py-0 h-4 px-1.5">
                    skipped
                  </Badge>
                )}
              </div>
              <span className="font-mono text-xs tabular-nums" data-testid={`engine-score-${eng.apiName}`}>
                {skipped ? "—" : score.toFixed(1)}
              </span>
            </div>
            <div className="h-2 rounded bg-muted overflow-hidden">
              <div
                className={`h-full ${skipped ? "bg-muted-foreground/20" : scoreColorClass(score)}`}
                style={{ width: `${skipped ? 0 : Math.max(0, Math.min(100, score))}%`, transition: "width 400ms ease" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PartialExplainer({
  missingFields,
  skipped,
}: {
  missingFields: string[];
  skipped?: Array<{ engine: string; reason: string }>;
}) {
  return (
    <div
      className="rounded-md border border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 p-3"
      data-testid="explainer-partial"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div className="text-sm space-y-1">
          <div className="font-medium text-amber-700 dark:text-amber-300">
            Partial result — some engines were skipped
          </div>
          <div className="text-amber-700/90 dark:text-amber-200/90 text-xs">
            Missing fields:{" "}
            {missingFields.map((f, i) => (
              <span key={f} className="font-mono">
                {f}
                {i < missingFields.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
          {skipped && skipped.length > 0 && (
            <ul className="text-xs space-y-0.5 mt-1.5">
              {skipped.map((s) => (
                <li key={s.engine} className="text-amber-800/90 dark:text-amber-200/80">
                  · <span className="font-medium">{formatStage(s.engine)}</span>: {s.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function SkippedExplainer({ skipped }: { skipped: Array<{ engine: string; reason: string }> }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3" data-testid="explainer-skipped">
      <div className="flex items-start gap-2 text-xs">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
        <div>
          <div className="font-medium mb-1">{skipped.length} engine{skipped.length === 1 ? "" : "s"} skipped</div>
          <ul className="space-y-0.5">
            {skipped.map((s) => (
              <li key={s.engine} className="text-muted-foreground">
                · <span className="font-medium">{formatStage(s.engine)}</span>: {s.reason}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function EvidenceList({
  findings,
  semanticFindings,
}: {
  findings?: DetectionFindings;
  semanticFindings?: any;
}) {
  const items = ENGINE_DEFINITIONS.map((eng) => {
    const raw = (findings as any)?.[eng.apiName] ?? (eng.apiName === "semantic_validation" ? semanticFindings : null);
    return { eng, raw };
  }).filter((it) => it.raw && (typeof it.raw !== "object" || Object.keys(it.raw).length > 0));

  if (items.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4" data-testid="evidence-empty">
        No detailed evidence available for this claim. Composite scores were captured at ingestion time.
      </div>
    );
  }

  return (
    <div data-testid="evidence-list">
      <div className="text-sm font-medium mb-2">Evidence by engine</div>
      <Accordion type="multiple" className="border rounded-md divide-y">
        {items.map(({ eng, raw }) => {
          const Icon = eng.icon;
          return (
            <AccordionItem key={eng.apiName} value={eng.apiName} className="border-0 px-3" data-testid={`evidence-section-${eng.apiName}`}>
              <AccordionTrigger className="hover:no-underline py-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{eng.label}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <EvidenceRenderer engine={eng.apiName} raw={raw} />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

function EvidenceRenderer({ engine, raw }: { engine: string; raw: any }) {
  if (!raw) return <p className="text-xs text-muted-foreground">No findings.</p>;

  // Best-effort engine-specific rendering. Falls back to formatted JSON for
  // shapes we don't recognize.
  if (engine === "rule_engine") {
    const matched = raw.matchedRules || raw.rules || raw.violations;
    if (Array.isArray(matched) && matched.length > 0) {
      return (
        <ul className="space-y-1.5 text-xs" data-testid="evidence-rule-engine">
          {matched.slice(0, 12).map((r: any, i: number) => (
            <li key={i} className="border-l-2 border-blue-500 pl-2">
              <div className="font-medium">{r.code || r.id || r.ruleCode || `Rule ${i + 1}`}</div>
              <div className="text-muted-foreground">{r.name || r.description || r.message || ""}</div>
              {r.severity && (
                <Badge variant="outline" className="mt-0.5 text-[10px]">
                  {r.severity}
                </Badge>
              )}
            </li>
          ))}
        </ul>
      );
    }
  }

  if (engine === "statistical_learning") {
    const outliers = raw.outliers || raw.anomalies || raw.deviations;
    if (Array.isArray(outliers) && outliers.length > 0) {
      return (
        <ul className="space-y-1 text-xs">
          {outliers.slice(0, 8).map((o: any, i: number) => (
            <li key={i} className="text-muted-foreground">
              · {o.metric || o.feature || o.name || "metric"}:{" "}
              <span className="font-mono">{typeof o.zscore === "number" ? `z=${o.zscore.toFixed(2)}` : (o.value ?? JSON.stringify(o))}</span>
            </li>
          ))}
        </ul>
      );
    }
  }

  if (engine === "semantic_validation") {
    return (
      <div className="text-xs space-y-1">
        {raw.diagnosisChapter && (
          <div>
            <span className="text-muted-foreground">Diagnosis chapter: </span>
            <span className="font-medium">{raw.diagnosisChapter}</span>
          </div>
        )}
        {raw.serviceCategory && (
          <div>
            <span className="text-muted-foreground">Service category: </span>
            <span className="font-medium">{raw.serviceCategory}</span>
          </div>
        )}
        {typeof raw.alignmentScore === "number" && (
          <div>
            <span className="text-muted-foreground">Alignment: </span>
            <span className="font-mono">{(raw.alignmentScore * 100).toFixed(0)}%</span>
          </div>
        )}
        {Array.isArray(raw.mismatchReasons) && raw.mismatchReasons.length > 0 && (
          <ul className="pt-1">
            {raw.mismatchReasons.map((r: string, i: number) => (
              <li key={i} className="text-muted-foreground">· {r}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (engine === "rag_llm") {
    const text = raw.analysis || raw.narrative || raw.reasoning || raw.summary;
    if (typeof text === "string") {
      return <p className="text-xs whitespace-pre-wrap text-muted-foreground">{text}</p>;
    }
  }

  return (
    <pre className="text-[10px] bg-muted/50 rounded p-2 overflow-auto max-h-48">
      {JSON.stringify(raw, null, 2)}
    </pre>
  );
}

// =============================================================================
// History panel
// =============================================================================

function HistoryPanel({
  jobs,
  statusFilter,
  onStatusFilterChange,
  expandedJobId,
  onToggleJob,
  onSelectRow,
  activeRowKey,
}: {
  jobs: IngestJob[];
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  expandedJobId: string | null;
  onToggleJob: (id: string) => void;
  onSelectRow: (row: IngestRow, job: IngestJob) => void;
  activeRowKey: string | null;
}) {
  return (
    <Card className="h-full flex flex-col" data-testid="card-history">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <HistoryIcon className="h-4 w-4" />
            Results History
          </CardTitle>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-[140px] h-8 text-xs" data-testid="select-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="detecting">Detecting</SelectItem>
              <SelectItem value="generating">Generating</SelectItem>
              <SelectItem value="awaiting_confirmation">Awaiting confirm</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <CardDescription className="text-xs">
          Recent ingestion and generation jobs. Click a job to see its claims.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[640px]">
          <div className="px-4 pb-4 space-y-2">
            {jobs.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-8" data-testid="history-empty">
                No jobs yet — start one with the actions above.
              </div>
            )}
            {jobs.map((job) => (
              <JobItem
                key={job.id}
                job={job}
                expanded={expandedJobId === job.id}
                onToggle={() => onToggleJob(job.id)}
                onSelectRow={(row) => onSelectRow(row, job)}
                activeRowKey={activeRowKey}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function JobItem({
  job,
  expanded,
  onToggle,
  onSelectRow,
  activeRowKey,
}: {
  job: IngestJob;
  expanded: boolean;
  onToggle: () => void;
  onSelectRow: (row: IngestRow) => void;
  activeRowKey: string | null;
}) {
  const typeLabel = jobTypeLabel(job.sourceType);
  const buckets = job.summary?.riskBuckets;

  return (
    <div className="border rounded-md overflow-hidden" data-testid={`history-job-${job.id}`}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left p-3 hover-elevate active-elevate-2 transition-colors"
        data-testid={`button-history-job-${job.id}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium truncate" title={job.jobName || job.sourceFileName || job.id}>
                {job.jobName || job.sourceFileName || `Job ${job.id.slice(0, 8)}`}
              </span>
              <Badge variant="outline" className={`text-[10px] py-0 h-4 px-1.5 ${typeLabel.tone}`}>
                {typeLabel.label}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
              <span>{formatRelative(job.createdAt)}</span>
              <span>·</span>
              <span>{job.rowsPersisted} rows</span>
              {buckets && (
                <>
                  <span>·</span>
                  <span>
                    {buckets.critical + buckets.high} flagged
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className={`text-[10px] py-0 h-4 px-1.5 ${statusBadgeTone(job.status)}`}>
              {formatStage(job.status)}
            </Badge>
            <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
          </div>
        </div>
        {!TERMINAL_STATUSES.has(job.status) && (
          <Progress value={job.progressPct || 0} className="h-1 mt-2" data-testid={`progress-history-${job.id}`} />
        )}
      </button>

      {expanded && (
        <div className="border-t bg-muted/20">
          <JobRowsList jobId={job.id} onSelectRow={onSelectRow} activeRowKey={activeRowKey} />
        </div>
      )}
    </div>
  );
}

function JobRowsList({
  jobId,
  onSelectRow,
  activeRowKey,
}: {
  jobId: string;
  onSelectRow: (row: IngestRow) => void;
  activeRowKey: string | null;
}) {
  const { data, isLoading } = useQuery<{ rows: IngestRow[]; total: number }>({
    queryKey: ["/api/fwa/ingest", jobId, "results"],
    queryFn: async () => {
      const res = await fetch(`/api/fwa/ingest/${jobId}/results?limit=50`, { credentials: "include" });
      if (!res.ok) throw new Error("failed to load results");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="p-3 text-xs text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading rows…
      </div>
    );
  }

  const rows = data?.rows || [];
  if (rows.length === 0) {
    return <div className="p-3 text-xs text-muted-foreground">No rows yet for this job.</div>;
  }

  return (
    <div className="max-h-[260px] overflow-y-auto divide-y">
      {rows.map((row) => {
        const action = row.detection?.recommendedAction || "review";
        const composite = row.detection?.compositeScore || 0;
        const key = `${jobId}::${row.claimNumber || row.rowIndex}`;
        const isActive = activeRowKey === key;
        return (
          <button
            key={row.id}
            type="button"
            onClick={() => onSelectRow(row)}
            className={`w-full text-left px-3 py-2 text-xs transition-colors ${
              isActive ? "bg-primary/5" : "hover-elevate"
            }`}
            data-testid={`history-row-${row.id}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono truncate" title={row.claimNumber || ""}>
                  {row.claimNumber || `Row #${row.rowIndex + 1}`}
                </span>
                {row.status === "partial" && (
                  <Badge variant="outline" className="text-[9px] py-0 h-3.5 px-1 bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900">
                    partial
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="tabular-nums text-muted-foreground">{composite.toFixed(0)}</span>
                <Badge
                  variant="outline"
                  className={`text-[10px] py-0 h-4 px-1.5 capitalize ${actionBadgeClasses(action)}`}
                >
                  {action}
                </Badge>
              </div>
            </div>
          </button>
        );
      })}
      {data && data.total > rows.length && (
        <div className="px-3 py-2 text-[11px] text-muted-foreground">
          Showing {rows.length} of {data.total} rows.
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Single Claim Sheet
// =============================================================================

function SingleClaimSheet({
  open,
  onOpenChange,
  onResult,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onResult: (claimNumber: string, payload: any) => void;
}) {
  const { toast } = useToast();
  const [claim, setClaim] = useState({
    claimNumber: "",
    providerId: "",
    patientId: "",
    practitionerId: "",
    amount: "",
    primaryDiagnosis: "",
    procedureCode: "",
    serviceDate: "",
    claimType: "outpatient",
    description: "",
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const body = {
        claim: {
          ...claim,
          amount: parseFloat(claim.amount) || 0,
          diagnosisCode: claim.primaryDiagnosis,
        },
        save: false,
      };
      const res = await apiRequest("POST", "/api/fwa/detection-engine/analyze", body);
      return res.json();
    },
    onSuccess: (payload) => {
      onResult(claim.claimNumber || `CLM-${Date.now()}`, payload);
    },
    onError: (err: Error) => {
      toast({ title: "Analysis failed", description: err.message, variant: "destructive" });
    },
  });

  const loadSample = async () => {
    try {
      const res = await fetch("/api/fwa/random-claim", { credentials: "include" });
      if (!res.ok) throw new Error("no sample");
      const c = await res.json();
      setClaim({
        claimNumber: c.claimNumber || `CLM-${Date.now()}`,
        providerId: c.providerId || "PRV-001",
        patientId: c.patientId || c.memberId || "MBR-001",
        practitionerId: c.practitionerId || "DOC-001",
        amount: String(c.amount || 1500),
        primaryDiagnosis: c.primaryDiagnosis || c.icd || "I10",
        procedureCode: c.procedureCode || c.cpt || "99213",
        serviceDate: c.serviceDate
          ? new Date(c.serviceDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        claimType: (c.claimType || "outpatient").toLowerCase(),
        description: c.description || "Routine office visit.",
      });
      toast({ title: "Sample loaded" });
    } catch {
      const today = new Date().toISOString().split("T")[0];
      setClaim({
        claimNumber: `CLM-${Date.now()}`,
        providerId: "PRV-001",
        patientId: "MBR-001",
        practitionerId: "DOC-001",
        amount: "1500",
        primaryDiagnosis: "I10",
        procedureCode: "99213",
        serviceDate: today,
        claimType: "outpatient",
        description: "Routine office visit.",
      });
      toast({ title: "Loaded default sample", description: "No claims in DB yet." });
    }
  };

  const canSubmit =
    claim.claimNumber.trim() &&
    claim.providerId.trim() &&
    claim.patientId.trim() &&
    claim.amount.trim() &&
    claim.primaryDiagnosis.trim();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto" data-testid="sheet-single">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5" /> Submit Single Claim
          </SheetTitle>
          <SheetDescription>
            Score one claim against all 5 engines and view the result instantly.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={loadSample} data-testid="button-load-sample">
              Load sample
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Claim Number *">
              <Input
                value={claim.claimNumber}
                onChange={(e) => setClaim({ ...claim, claimNumber: e.target.value })}
                placeholder="CLM-2026-0001"
                data-testid="input-claim-number"
              />
            </Field>
            <Field label="Claim Type">
              <Select value={claim.claimType} onValueChange={(v) => setClaim({ ...claim, claimType: v })}>
                <SelectTrigger data-testid="select-claim-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outpatient">Outpatient</SelectItem>
                  <SelectItem value="inpatient">Inpatient</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                  <SelectItem value="dental">Dental</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Provider ID *">
              <Input
                value={claim.providerId}
                onChange={(e) => setClaim({ ...claim, providerId: e.target.value })}
                placeholder="PRV-001"
                data-testid="input-provider-id"
              />
            </Field>
            <Field label="Practitioner ID">
              <Input
                value={claim.practitionerId}
                onChange={(e) => setClaim({ ...claim, practitionerId: e.target.value })}
                placeholder="DOC-001"
                data-testid="input-practitioner-id"
              />
            </Field>
            <Field label="Member / Patient ID *">
              <Input
                value={claim.patientId}
                onChange={(e) => setClaim({ ...claim, patientId: e.target.value })}
                placeholder="MBR-001"
                data-testid="input-patient-id"
              />
            </Field>
            <Field label="Service Date *">
              <Input
                type="date"
                value={claim.serviceDate}
                onChange={(e) => setClaim({ ...claim, serviceDate: e.target.value })}
                data-testid="input-service-date"
              />
            </Field>
            <Field label="Amount (SAR) *">
              <Input
                type="number"
                value={claim.amount}
                onChange={(e) => setClaim({ ...claim, amount: e.target.value })}
                placeholder="1500"
                data-testid="input-amount"
              />
            </Field>
            <Field label="Primary Diagnosis *">
              <Input
                value={claim.primaryDiagnosis}
                onChange={(e) => setClaim({ ...claim, primaryDiagnosis: e.target.value })}
                placeholder="I10"
                data-testid="input-diagnosis"
              />
            </Field>
            <Field label="Procedure Code">
              <Input
                value={claim.procedureCode}
                onChange={(e) => setClaim({ ...claim, procedureCode: e.target.value })}
                placeholder="99213"
                data-testid="input-procedure"
              />
            </Field>
          </div>
          <Field label="Description">
            <Textarea
              rows={3}
              value={claim.description}
              onChange={(e) => setClaim({ ...claim, description: e.target.value })}
              placeholder="Routine office visit for blood pressure follow-up."
              data-testid="input-description"
            />
          </Field>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => analyzeMutation.mutate()}
            disabled={!canSubmit || analyzeMutation.isPending}
            data-testid="button-analyze"
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing…
              </>
            ) : (
              <>Run 5-engine analysis</>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

// =============================================================================
// Batch Upload Sheet (with smart auto-mapping override)
// =============================================================================

interface CompletionSummary {
  total: number;
  persisted: number;
  flagged: number;
  failed: number;
}

function BatchUploadSheet({
  open,
  onOpenChange,
  onCompleted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCompleted: (jobId: string, summary?: CompletionSummary) => void;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [batchName, setBatchName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  const reset = () => {
    setFile(null);
    setBatchName("");
    setPendingJobId(null);
    setOverrides({});
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Poll the pending job to detect when it pauses for mapping confirmation,
  // and to surface progress/completion.
  const { data: pendingJob } = useQuery<IngestJob>({
    queryKey: ["/api/fwa/ingest", pendingJobId],
    queryFn: async () => {
      const res = await fetch(`/api/fwa/ingest/${pendingJobId}`, { credentials: "include" });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    enabled: !!pendingJobId,
    refetchInterval: (q) => {
      const d = q.state.data as IngestJob | undefined;
      if (!d) return 1500;
      return TERMINAL_STATUSES.has(d.status) ? false : 1500;
    },
  });

  useEffect(() => {
    if (!pendingJob) return;
    if (pendingJob.status === "completed") {
      const buckets = pendingJob.summary?.riskBuckets;
      const flagged = buckets ? buckets.critical + buckets.high : 0;
      onCompleted(pendingJob.id, {
        total: pendingJob.totalRows,
        persisted: pendingJob.rowsPersisted,
        flagged,
        failed: pendingJob.rowsFailed,
      });
      reset();
      onOpenChange(false);
    } else if (pendingJob.status === "failed") {
      toast({
        title: "Ingestion failed",
        description: pendingJob.errorMessage || "The job failed during processing.",
        variant: "destructive",
      });
    }
  }, [pendingJob?.status, pendingJob?.id]);

  // Pre-populate overrides from the auto-mapping when it arrives.
  useEffect(() => {
    if (pendingJob?.status === "awaiting_confirmation" && pendingJob.columnMapping) {
      const next: Record<string, string> = {};
      for (const m of pendingJob.columnMapping.mappings) {
        if (m.sourceColumn) next[m.schemaField] = m.sourceColumn;
      }
      setOverrides(next);
    }
  }, [pendingJob?.status]);

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("no file");
      const fd = new FormData();
      fd.append("file", file);
      fd.append("jobName", batchName || file.name);
      fd.append("requireConfirmation", "true");
      // CSRF token
      const csrfRes = await fetch("/api/auth/csrf-token", { credentials: "include" });
      const csrfData = await csrfRes.json();
      const res = await fetch("/api/fwa/ingest", {
        method: "POST",
        body: fd,
        credentials: "include",
        headers: { "X-CSRF-Token": csrfData.csrfToken || "" },
      });
      if (!res.ok) throw new Error(`upload failed (${res.status})`);
      return res.json() as Promise<{ jobId: string }>;
    },
    onSuccess: (data) => {
      setPendingJobId(data.jobId);
      toast({ title: "File uploaded", description: "Auto-mapping in progress…" });
    },
    onError: (err: Error) => {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!pendingJobId) throw new Error("no job");
      const res = await apiRequest("POST", `/api/fwa/ingest/${pendingJobId}/confirm`, {
        mappingOverrides: overrides,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Mapping confirmed", description: "Detection started — watch progress in History." });
    },
    onError: (err: Error) => {
      toast({ title: "Confirmation failed", description: err.message, variant: "destructive" });
    },
  });

  const handleFile = (f: File) => {
    const valid =
      f.name.endsWith(".csv") || f.name.endsWith(".xlsx") || f.name.endsWith(".xls") || f.name.endsWith(".json");
    if (!valid) {
      toast({ title: "Unsupported file", description: "Use CSV, Excel, or JSON.", variant: "destructive" });
      return;
    }
    setFile(f);
    if (!batchName) setBatchName(f.name.replace(/\.[^/.]+$/, ""));
  };

  const detectedHeaders = pendingJob?.detectedHeaders || [];
  const isProcessing =
    pendingJob && !TERMINAL_STATUSES.has(pendingJob.status) && pendingJob.status !== "awaiting_confirmation";

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto" data-testid="sheet-batch">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Upload Batch
          </SheetTitle>
          <SheetDescription>
            Drop a CSV, Excel, or JSON file. We auto-map columns to the canonical schema; review and override before
            running detection.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {!pendingJobId && (
            <>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragging ? "border-primary bg-primary/10" : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleFile(f);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                data-testid="drop-zone"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx,.xls,.json"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  data-testid="input-file"
                />
                <FolderUp className="w-10 h-10 mx-auto mb-2 text-primary/60" />
                <p className="text-sm font-medium">Drop your file or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">CSV · XLSX · XLS · JSON of any size</p>
              </div>

              {file && (
                <div className="flex items-center gap-3 p-3 bg-muted rounded-md" data-testid="file-preview">
                  <FileSpreadsheet className="w-7 h-7 text-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate" data-testid="text-file-name">{file.name}</div>
                    <div className="text-xs text-muted-foreground" data-testid="text-file-size">
                      {(file.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>
              )}

              <Field label="Batch name (optional)">
                <Input
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="May FWA audit batch"
                  data-testid="input-batch-name"
                />
              </Field>
            </>
          )}

          {pendingJobId && pendingJob && pendingJob.status === "awaiting_confirmation" && pendingJob.columnMapping && (
            <MappingReview
              detectedHeaders={detectedHeaders}
              mapping={pendingJob.columnMapping}
              overrides={overrides}
              onChange={(field, val) => setOverrides((p) => ({ ...p, [field]: val }))}
            />
          )}

          {pendingJobId && pendingJob && isProcessing && (
            <div className="p-4 border rounded-md space-y-2" data-testid="ingest-progress">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{formatStage(pendingJob.currentStage)}</span>
                <span className="text-xs text-muted-foreground">{pendingJob.progressPct}%</span>
              </div>
              <Progress value={pendingJob.progressPct} />
              <div className="text-xs text-muted-foreground">
                {pendingJob.rowsPersisted}/{pendingJob.totalRows} rows persisted ·{" "}
                {pendingJob.rowsDetected} scored · {pendingJob.rowsFailed} failed
              </div>
            </div>
          )}

          {pendingJobId && !pendingJob && (
            <div className="text-sm text-muted-foreground flex items-center gap-2 p-3">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading job…
            </div>
          )}
        </div>

        <SheetFooter>
          {!pendingJobId && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => uploadMutation.mutate()}
                disabled={!file || uploadMutation.isPending}
                data-testid="button-upload-batch"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…
                  </>
                ) : (
                  <>Upload & auto-map</>
                )}
              </Button>
            </>
          )}
          {pendingJob?.status === "awaiting_confirmation" && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close (continues in background)
              </Button>
              <Button
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
                data-testid="button-confirm-mapping"
              >
                {confirmMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Confirming…
                  </>
                ) : (
                  <>Confirm mapping & run detection</>
                )}
              </Button>
            </>
          )}
          {pendingJob && isProcessing && (
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close-progress">
              Close (continues in background)
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function MappingReview({
  detectedHeaders,
  mapping,
  overrides,
  onChange,
}: {
  detectedHeaders: string[];
  mapping: NonNullable<IngestJob["columnMapping"]>;
  overrides: Record<string, string>;
  onChange: (field: string, sourceCol: string) => void;
}) {
  const sourceOptions = detectedHeaders.length > 0 ? detectedHeaders : mapping.mappings.map((m) => m.sourceColumn).filter((c): c is string => !!c);
  const overall = Math.round(((mapping.overallConfidence ?? mapping.confidence) || 0) * 100) / 100;

  return (
    <div className="space-y-3" data-testid="mapping-review">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Auto-mapping summary</div>
          <div className="text-xs text-muted-foreground">
            Confidence {(overall * 100).toFixed(0)}% · {mapping.mappings.filter((m) => m.sourceColumn).length} of {mapping.mappings.length} fields mapped
          </div>
        </div>
        <Badge variant="outline" className="text-xs">{mapping.autoMapped ? "Auto" : "Manual"}</Badge>
      </div>
      {mapping.warnings && mapping.warnings.length > 0 && (
        <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded p-2">
          {mapping.warnings.map((w, i) => (
            <div key={i}>· {w}</div>
          ))}
        </div>
      )}
      <div className="border rounded-md max-h-[360px] overflow-y-auto divide-y">
        {CANONICAL_FIELDS.map((cf) => {
          const detected = mapping.mappings.find((m) => m.schemaField === cf.field);
          const current = overrides[cf.field] || "";
          return (
            <div
              key={cf.field}
              className="grid grid-cols-[1fr_1.4fr] gap-2 items-center p-2 text-xs"
              data-testid={`mapping-row-${cf.field}`}
            >
              <div className="min-w-0">
                <div className="font-medium truncate flex items-center gap-1">
                  {cf.label}
                  {cf.required && <span className="text-red-500">*</span>}
                </div>
                {detected && detected.confidence > 0 && (
                  <div className="text-[10px] text-muted-foreground truncate">
                    Auto: {detected.sourceColumn || "—"} ({Math.round(detected.confidence)}%)
                  </div>
                )}
              </div>
              <Select
                value={current || "__none__"}
                onValueChange={(v) => onChange(cf.field, v === "__none__" ? "" : v)}
              >
                <SelectTrigger className="h-7 text-xs" data-testid={`select-mapping-${cf.field}`}>
                  <SelectValue placeholder="Pick column…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Not mapped —</SelectItem>
                  {sourceOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// Test Case Wizard Dialog
// =============================================================================

function TestCaseWizardDialog({
  open,
  onOpenChange,
  onCompleted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCompleted: (jobId: string, summary?: CompletionSummary) => void;
}) {
  const { toast } = useToast();
  const [count, setCount] = useState(5);
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "mixed">("mixed");
  const [scenario, setScenario] = useState<"any" | "clean" | "suspicious" | "fraudulent">("any");
  const [targetType, setTargetType] = useState<"none" | "provider" | "member" | "practitioner">("none");
  const [targetId, setTargetId] = useState("");
  const [icdCsv, setIcdCsv] = useState("");
  const [cptCsv, setCptCsv] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const reset = () => {
    setActiveJobId(null);
    setCount(5);
    setSeverity("mixed");
    setScenario("any");
    setTargetType("none");
    setTargetId("");
    setIcdCsv("");
    setCptCsv("");
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      const params: Record<string, unknown> = { count, severity };
      if (scenario !== "any") params.scenario = scenario;
      if (targetType !== "none" && targetId.trim()) {
        params.targetEntity = { type: targetType, id: targetId.trim() };
      }
      const icd = icdCsv.split(",").map((s) => s.trim()).filter(Boolean);
      const cpt = cptCsv.split(",").map((s) => s.trim()).filter(Boolean);
      if (icd.length || cpt.length) {
        params.codeMix = {
          ...(icd.length ? { icdCodes: icd } : {}),
          ...(cpt.length ? { cptCodes: cpt } : {}),
        };
      }
      const res = await apiRequest("POST", "/api/fwa/test-cases/generate", { mode: "wizard", params });
      return res.json() as Promise<{ jobId: string }>;
    },
    onSuccess: (data) => {
      setActiveJobId(data.jobId);
      toast({ title: "Generation started", description: `Job ${data.jobId.slice(0, 8)}… is running.` });
    },
    onError: (err: Error) => {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    },
  });

  const { data: job } = useQuery<IngestJob>({
    queryKey: ["/api/fwa/test-cases", activeJobId],
    queryFn: async () => {
      const res = await fetch(`/api/fwa/test-cases/${activeJobId}`, { credentials: "include" });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    enabled: !!activeJobId,
    refetchInterval: (q) => {
      const d = q.state.data as IngestJob | undefined;
      if (!d) return 1500;
      return TERMINAL_STATUSES.has(d.status) ? false : 1500;
    },
  });

  useEffect(() => {
    if (job?.status === "completed") {
      const buckets = job.summary?.riskBuckets;
      const flagged = buckets ? buckets.critical + buckets.high : 0;
      onCompleted(job.id, {
        total: job.totalRows,
        persisted: job.rowsPersisted,
        flagged,
        failed: job.rowsFailed,
      });
      reset();
      onOpenChange(false);
    } else if (job?.status === "failed") {
      toast({ title: "Generation failed", description: job.errorMessage || "Unknown error", variant: "destructive" });
    }
  }, [job?.status, job?.id]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-xl" data-testid="dialog-wizard">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" /> Generate Test Cases
          </DialogTitle>
          <DialogDescription>
            Configure scenario, count, severity, and an optional target entity. Generated claims run through the same
            5-engine pipeline as uploaded data.
          </DialogDescription>
        </DialogHeader>

        {!activeJobId && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Number of claims (1–100)">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={count}
                  onChange={(e) => setCount(Math.max(1, Math.min(100, parseInt(e.target.value || "1", 10))))}
                  data-testid="input-wizard-count"
                />
              </Field>
              <Field label="Severity">
                <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
                  <SelectTrigger data-testid="select-wizard-severity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Scenario (optional)">
              <Select value={scenario} onValueChange={(v) => setScenario(v as any)}>
                <SelectTrigger data-testid="select-wizard-scenario">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any (driven by severity)</SelectItem>
                  <SelectItem value="clean">Clean</SelectItem>
                  <SelectItem value="suspicious">Suspicious</SelectItem>
                  <SelectItem value="fraudulent">Fraudulent</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Target type">
                <Select value={targetType} onValueChange={(v) => setTargetType(v as any)}>
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
              </Field>
              <div className="col-span-2">
                <Field label="Target entity ID">
                  <Input
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    disabled={targetType === "none"}
                    placeholder="e.g. PRV-001"
                    data-testid="input-wizard-target-id"
                  />
                </Field>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="ICD-10 codes (comma-separated)">
                <Input
                  value={icdCsv}
                  onChange={(e) => setIcdCsv(e.target.value)}
                  placeholder="I10, E11.9"
                  data-testid="input-wizard-icd"
                />
              </Field>
              <Field label="CPT codes (comma-separated)">
                <Input
                  value={cptCsv}
                  onChange={(e) => setCptCsv(e.target.value)}
                  placeholder="99213, 99214"
                  data-testid="input-wizard-cpt"
                />
              </Field>
            </div>
          </div>
        )}

        {activeJobId && job && (
          <div className="space-y-2 py-2" data-testid="wizard-progress">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{formatStage(job.currentStage)}</span>
              <span className="text-xs text-muted-foreground">{job.progressPct}%</span>
            </div>
            <Progress value={job.progressPct} />
            <div className="text-xs text-muted-foreground">
              Generated {job.rowsPersisted}/{job.totalRows} · Scored {job.rowsDetected} ·{" "}
              {job.summary?.durationMs ? `Elapsed ${formatDuration(job.summary.durationMs)}` : "Running…"}
            </div>
          </div>
        )}

        {activeJobId && !job && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading job…
          </div>
        )}

        <DialogFooter>
          {!activeJobId && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                data-testid="button-generate"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" /> Generate
                  </>
                )}
              </Button>
            </>
          )}
          {activeJobId && (
            <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close-wizard">
              Close (continues in background)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
