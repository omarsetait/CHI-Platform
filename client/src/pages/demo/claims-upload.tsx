import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  FolderUp,
  PlayCircle,
  ArrowRight,
  Download,
  RotateCcw,
  FileJson,
  FilePlus,
  Shield,
  AlertCircle,
  Zap,
  Target,
  Route,
  ExternalLink,
  Check,
} from "lucide-react";
import { Link } from "wouter";

interface ClaimPreset {
  name: string;
  description: string;
  claim: {
    patientId: string;
    providerId: string;
    procedureCode: string;
    diagnosisCode: string;
    amount: number;
    description: string;
  };
}

interface Presets {
  approved: ClaimPreset;
  fwa_flagged: ClaimPreset;
  preauth_required: ClaimPreset;
  escalated: ClaimPreset;
}

interface PipelineEvent {
  id: string;
  itemId: string;
  stage: string;
  status: string;
  details: Record<string, unknown>;
  createdAt: string;
}

interface BatchItem {
  id: string;
  claimNumber: string;
  patientId: string;
  providerId: string;
  status: string;
  outcome?: string;
  fwaCaseId?: string;
  preAuthClaimId?: string;
}

interface BatchInfo {
  batch: {
    id: string;
    batchName: string;
    status: string;
  };
  items: BatchItem[];
  progress: {
    total: number;
    completed: number;
    processing: number;
    pending: number;
  };
}

const PIPELINE_STAGES = [
  { id: "intake", name: "Intake", icon: FilePlus, description: "Claim received and parsed" },
  { id: "validation", name: "Validation", icon: Shield, description: "Data validation and completeness check" },
  { id: "risk_scoring", name: "Risk Scoring", icon: AlertTriangle, description: "AI-powered risk assessment" },
  { id: "pattern_matching", name: "Pattern Matching", icon: Target, description: "FWA pattern detection" },
  { id: "decision_routing", name: "Decision Routing", icon: Route, description: "Final outcome determination" },
];

const PATIENTS = ["PAT-1001", "PAT-1002", "PAT-1003", "PAT-1004", "PAT-1005"];
const PROVIDERS = ["PRV-001", "PRV-002", "PRV-003", "PRV-004", "PRV-005"];

export default function ClaimsUploadDemo() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("manual");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsedClaims, setParsedClaims] = useState<Array<Record<string, unknown>>>([]);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [pipelineComplete, setPipelineComplete] = useState(false);

  const [formData, setFormData] = useState({
    patientId: "",
    providerId: "",
    procedureCode: "",
    diagnosisCode: "",
    amount: "",
    description: "",
  });

  const { data: presets } = useQuery<Presets>({
    queryKey: ["/api/claims-pipeline/sample-presets"],
  });

  const { data: batchInfo, refetch: refetchBatch } = useQuery<BatchInfo>({
    queryKey: ["/api/claims-pipeline/batch", activeBatchId],
    enabled: !!activeBatchId,
    refetchInterval: activeBatchId ? 1000 : false,
  });

  const { data: pipelineEvents = [], refetch: refetchEvents } = useQuery<PipelineEvent[]>({
    queryKey: ["/api/claims-pipeline/item", activeItemId, "events"],
    enabled: !!activeItemId,
    refetchInterval: activeItemId && !pipelineComplete ? 1000 : false,
  });

  useEffect(() => {
    if (batchInfo?.items && batchInfo.items.length > 0) {
      const firstItem = batchInfo.items[0];
      if (firstItem.id !== activeItemId) {
        setActiveItemId(firstItem.id);
      }
      if (firstItem.status === "completed") {
        setPipelineComplete(true);
      }
    }
  }, [batchInfo, activeItemId]);

  const submitManualMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/claims-pipeline/manual", {
        ...data,
        amount: parseFloat(data.amount),
      });
      return res.json();
    },
    onSuccess: async (result) => {
      toast({
        title: "Claim submitted",
        description: "Starting pipeline processing...",
      });
      setActiveBatchId(result.batchId);
      setActiveItemId(result.claimId);
      setPipelineComplete(false);
      startProcessingMutation.mutate(result.batchId);
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadClaimsMutation = useMutation({
    mutationFn: async (claims: Array<Record<string, unknown>>) => {
      const res = await apiRequest("POST", "/api/claims-pipeline/upload", {
        claims,
        fileName: selectedFile?.name || "uploaded-claims",
        fileType: selectedFile?.name.endsWith(".json") ? "json" : "csv",
      });
      return res.json();
    },
    onSuccess: async (result) => {
      toast({
        title: "Claims uploaded",
        description: `${result.totalClaims} claims uploaded. Starting processing...`,
      });
      setActiveBatchId(result.batchId);
      if (result.claimIds && result.claimIds.length > 0) {
        setActiveItemId(result.claimIds[0]);
      }
      setPipelineComplete(false);
      startProcessingMutation.mutate(result.batchId);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const startProcessingMutation = useMutation({
    mutationFn: async (batchId: string) => {
      const res = await apiRequest("POST", `/api/claims-pipeline/${batchId}/process`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/claims-pipeline/batch", activeBatchId] });
    },
  });

  const handlePresetClick = (presetKey: keyof Presets) => {
    if (!presets) return;
    const preset = presets[presetKey];
    setFormData({
      patientId: preset.claim.patientId,
      providerId: preset.claim.providerId,
      procedureCode: preset.claim.procedureCode,
      diagnosisCode: preset.claim.diagnosisCode,
      amount: preset.claim.amount.toString(),
      description: preset.claim.description,
    });
    toast({
      title: `Loaded: ${preset.name}`,
      description: preset.description,
    });
  };

  const handleFileSelect = (file: File) => {
    const validTypes = ["text/csv", "application/json"];
    const isValid = validTypes.includes(file.type) || file.name.endsWith(".csv") || file.name.endsWith(".json");
    if (!isValid) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV or JSON file",
        variant: "destructive",
      });
      return;
    }
    setSelectedFile(file);
    parseFile(file);
  };

  const parseFile = async (file: File) => {
    const text = await file.text();
    try {
      if (file.name.endsWith(".json")) {
        const data = JSON.parse(text);
        const claims = Array.isArray(data) ? data : [data];
        setParsedClaims(claims);
      } else {
        const lines = text.split("\n").filter((l) => l.trim());
        if (lines.length < 2) {
          toast({ title: "Invalid CSV", description: "File must have headers and data", variant: "destructive" });
          return;
        }
        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const claims = lines.slice(1).map((line) => {
          const values = line.split(",").map((v) => v.trim());
          const claim: Record<string, unknown> = {};
          headers.forEach((h, i) => {
            claim[h] = values[i];
          });
          return claim;
        });
        setParsedClaims(claims);
      }
      toast({ title: "File parsed", description: `Found ${parsedClaims.length || "multiple"} claims` });
    } catch (e) {
      toast({ title: "Parse error", description: "Could not parse file", variant: "destructive" });
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientId || !formData.providerId || !formData.amount) {
      toast({
        title: "Validation Error",
        description: "Patient, Provider, and Amount are required",
        variant: "destructive",
      });
      return;
    }
    submitManualMutation.mutate(formData);
  };

  const handleUploadSubmit = () => {
    if (parsedClaims.length === 0) {
      toast({ title: "No claims", description: "Parse a file first", variant: "destructive" });
      return;
    }
    uploadClaimsMutation.mutate(parsedClaims);
  };

  const handleReset = () => {
    setActiveBatchId(null);
    setActiveItemId(null);
    setPipelineComplete(false);
    setParsedClaims([]);
    setSelectedFile(null);
    setFormData({
      patientId: "",
      providerId: "",
      procedureCode: "",
      diagnosisCode: "",
      amount: "",
      description: "",
    });
  };

  const getStageStatus = (stageId: string) => {
    const stageEvent = pipelineEvents.find((e) => e.stage === stageId);
    if (!stageEvent) return "pending";
    return stageEvent.status;
  };

  const getStageDetails = (stageId: string) => {
    const stageEvent = pipelineEvents.find((e) => e.stage === stageId);
    return stageEvent?.details || {};
  };

  const currentItem = batchInfo?.items?.[0];
  const outcome = currentItem?.decision;

  const getOutcomeColor = (outcome?: string) => {
    switch (outcome) {
      case "approved":
        return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
      case "fwa_flagged":
        return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
      case "preauth_required":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
      case "escalated":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatOutcome = (outcome?: string) => {
    switch (outcome) {
      case "approved":
        return "Approved";
      case "fwa_flagged":
        return "FWA Flagged";
      case "preauth_required":
        return "Pre-Auth Required";
      case "escalated":
        return "Escalated to SIU";
      default:
        return "Pending";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="page-title">
          Claims Upload Demo
        </h1>
        <p className="text-muted-foreground">
          Submit claims and watch them flow through the processing pipeline
        </p>
      </div>

      {!activeBatchId ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2" data-testid="tabs-container">
            <TabsTrigger value="upload" data-testid="tab-upload">
              <Upload className="w-4 h-4 mr-2" />
              Upload File
            </TabsTrigger>
            <TabsTrigger value="manual" data-testid="tab-manual">
              <FilePlus className="w-4 h-4 mr-2" />
              Manual Entry
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <Card data-testid="card-upload">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5" />
                  Upload Claims File
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragging
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                  }`}
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="drop-zone"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                    data-testid="input-file"
                  />
                  <FolderUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Drop your file here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">Supports CSV, JSON files</p>
                </div>

                {selectedFile && (
                  <div className="p-3 bg-muted rounded-lg" data-testid="selected-file-info">
                    <div className="flex items-center gap-3">
                      <FileJson className="w-8 h-8 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" data-testid="text-file-name">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {parsedClaims.length} claims found
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {parsedClaims.length > 0 && (
                  <div className="border rounded-lg overflow-hidden" data-testid="claims-preview">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Patient</TableHead>
                          <TableHead>Provider</TableHead>
                          <TableHead>Procedure</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parsedClaims.slice(0, 5).map((claim, idx) => (
                          <TableRow key={idx} data-testid={`row-claim-preview-${idx}`}>
                            <TableCell>{String(claim.patientId || claim.patient_id || "-")}</TableCell>
                            <TableCell>{String(claim.providerId || claim.provider_id || "-")}</TableCell>
                            <TableCell>{String(claim.procedureCode || claim.procedure_code || "-")}</TableCell>
                            <TableCell className="text-right">
                              ${Number(claim.amount || 0).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {parsedClaims.length > 5 && (
                      <div className="p-2 text-center text-sm text-muted-foreground border-t">
                        +{parsedClaims.length - 5} more claims
                      </div>
                    )}
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={handleUploadSubmit}
                  disabled={parsedClaims.length === 0 || uploadClaimsMutation.isPending}
                  data-testid="button-submit-upload"
                >
                  {uploadClaimsMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Submit {parsedClaims.length} Claims
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="space-y-6">
            <Card data-testid="card-presets">
              <CardHeader>
                <CardTitle className="text-base">Quick Presets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    variant="outline"
                    className="h-auto py-3 flex flex-col items-center gap-1"
                    onClick={() => handlePresetClick("approved")}
                    data-testid="button-preset-approved"
                  >
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-xs">Normal Approval</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-3 flex flex-col items-center gap-1"
                    onClick={() => handlePresetClick("fwa_flagged")}
                    data-testid="button-preset-fwa"
                  >
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="text-xs">FWA Flagged</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-3 flex flex-col items-center gap-1"
                    onClick={() => handlePresetClick("preauth_required")}
                    data-testid="button-preset-preauth"
                  >
                    <Clock className="w-5 h-5 text-amber-600" />
                    <span className="text-xs">Pre-Auth Required</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto py-3 flex flex-col items-center gap-1"
                    onClick={() => handlePresetClick("escalated")}
                    data-testid="button-preset-escalated"
                  >
                    <AlertCircle className="w-5 h-5 text-purple-600" />
                    <span className="text-xs">Escalated</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-manual-form">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FilePlus className="w-5 h-5" />
                  Manual Claim Entry
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitManual} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="patientId">Patient *</Label>
                      <Select
                        value={formData.patientId}
                        onValueChange={(v) => setFormData({ ...formData, patientId: v })}
                      >
                        <SelectTrigger data-testid="select-patient">
                          <SelectValue placeholder="Select patient" />
                        </SelectTrigger>
                        <SelectContent>
                          {PATIENTS.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="providerId">Provider *</Label>
                      <Select
                        value={formData.providerId}
                        onValueChange={(v) => setFormData({ ...formData, providerId: v })}
                      >
                        <SelectTrigger data-testid="select-provider">
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROVIDERS.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="procedureCode">Procedure Code</Label>
                      <Input
                        id="procedureCode"
                        value={formData.procedureCode}
                        onChange={(e) => setFormData({ ...formData, procedureCode: e.target.value })}
                        placeholder="e.g., 99213"
                        data-testid="input-procedure-code"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="diagnosisCode">Diagnosis Code</Label>
                      <Input
                        id="diagnosisCode"
                        value={formData.diagnosisCode}
                        onChange={(e) => setFormData({ ...formData, diagnosisCode: e.target.value })}
                        placeholder="e.g., J06.9"
                        data-testid="input-diagnosis-code"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount *</Label>
                      <Input
                        id="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00"
                        data-testid="input-amount"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Claim description..."
                      className="min-h-[80px]"
                      data-testid="textarea-description"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitManualMutation.isPending}
                    data-testid="button-submit-manual"
                  >
                    {submitManualMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Submit Claim
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-6">
          <Card data-testid="card-pipeline">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="w-5 h-5" />
                Pipeline Visualization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                {PIPELINE_STAGES.map((stage, idx) => {
                  const status = getStageStatus(stage.id);
                  const details = getStageDetails(stage.id);
                  const Icon = stage.icon;

                  return (
                    <div key={stage.id} className="flex items-center gap-2 flex-1">
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex-1"
                      >
                        <Card
                          className={`relative overflow-hidden ${
                            status === "completed"
                              ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                              : status === "processing"
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                              : "border-muted"
                          }`}
                          data-testid={`card-stage-${stage.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div
                                className={`p-2 rounded-full ${
                                  status === "completed"
                                    ? "bg-green-100 dark:bg-green-900"
                                    : status === "processing"
                                    ? "bg-blue-100 dark:bg-blue-900"
                                    : "bg-muted"
                                }`}
                              >
                                {status === "processing" ? (
                                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                ) : status === "completed" ? (
                                  <Check className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Icon className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{stage.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {stage.description}
                                </p>
                              </div>
                            </div>

                            <AnimatePresence>
                              {status === "completed" && Object.keys(details).length > 0 && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-2 pt-2 border-t text-xs space-y-1"
                                >
                                  {stage.id === "risk_scoring" && details.riskScore !== undefined && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Risk Score:</span>
                                      <Badge
                                        variant="secondary"
                                        className={
                                          Number(details.riskScore) > 70
                                            ? "bg-red-100 text-red-700"
                                            : Number(details.riskScore) > 40
                                            ? "bg-amber-100 text-amber-700"
                                            : "bg-green-100 text-green-700"
                                        }
                                      >
                                        {Number(details.riskScore)}%
                                      </Badge>
                                    </div>
                                  )}
                                  {stage.id === "pattern_matching" && details.patternsDetected !== undefined && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Patterns:</span>
                                      <span>{Number(details.patternsDetected)}</span>
                                    </div>
                                  )}
                                  {stage.id === "validation" && details.validationPassed !== undefined && (
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Valid:</span>
                                      <Badge variant={Boolean(details.validationPassed) ? "secondary" : "destructive"}>
                                        {Boolean(details.validationPassed) ? "Yes" : "No"}
                                      </Badge>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </CardContent>
                        </Card>
                      </motion.div>
                      {idx < PIPELINE_STAGES.length - 1 && (
                        <ArrowRight className="w-5 h-5 text-muted-foreground hidden md:block flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>

              {batchInfo && (
                <div className="mt-4">
                  <Progress
                    value={(batchInfo.progress.completed / batchInfo.progress.total) * 100}
                    className="h-2"
                    data-testid="progress-pipeline"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {batchInfo.progress.completed} of {batchInfo.progress.total} claims processed
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {pipelineComplete && outcome && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card data-testid="card-outcome">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Final Outcome
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Badge className={`text-lg px-4 py-2 ${getOutcomeColor(outcome)}`} data-testid="badge-outcome">
                      {formatOutcome(outcome)}
                    </Badge>
                  </div>

                  {currentItem?.createdEntityType === "fwa_case" && currentItem?.createdEntityId && (
                    <div className="flex items-center gap-2" data-testid="link-fwa-case">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <span>FWA Case Created:</span>
                      <Link href={`/fwa/cases/${currentItem.createdEntityId}`} className="text-primary hover:underline flex items-center">
                        View Case <ExternalLink className="w-3 h-3 ml-1" />
                      </Link>
                    </div>
                  )}

                  {currentItem?.createdEntityType === "preauth_claim" && currentItem?.createdEntityId && (
                    <div className="flex items-center gap-2" data-testid="link-preauth">
                      <Clock className="w-4 h-4 text-amber-500" />
                      <span>Pre-Auth Claim Created:</span>
                      <Link href={`/pre-auth/claims/${currentItem.createdEntityId}`} className="text-primary hover:underline flex items-center">
                        View Claim <ExternalLink className="w-3 h-3 ml-1" />
                      </Link>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={handleReset} data-testid="button-reset">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Reset
                    </Button>
                    <Button variant="outline" data-testid="button-export">
                      <Download className="w-4 h-4 mr-2" />
                      Export Results
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {!pipelineComplete && (
            <Card data-testid="card-processing">
              <CardContent className="py-8 text-center">
                <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
                <p className="font-medium">Processing claim through pipeline...</p>
                <p className="text-sm text-muted-foreground">This may take a few moments</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
