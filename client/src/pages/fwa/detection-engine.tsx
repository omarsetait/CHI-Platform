import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
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
import { 
  ShieldCheck, Brain, BarChart3, Network, FileSearch,
  AlertTriangle, CheckCircle, Clock, Loader2,
  Zap, TrendingUp, AlertCircle, Info, Upload,
  FileSpreadsheet, CheckCircle2, FolderUp, PlayCircle,
  Flag, Files, RefreshCw, Building2, User, Calendar,
  Stethoscope, MapPin, FileText, Sparkles, XCircle
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { FwaBatch } from "@shared/schema";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";

const SAUDI_PAYERS = [
  { value: "tawuniya", label: "Tawuniya" },
  { value: "bupa-arabia", label: "Bupa Arabia" },
  { value: "medgulf", label: "MedGulf" },
  { value: "saico", label: "SAICO" },
  { value: "alrajhi-takaful", label: "Al Rajhi Takaful" },
  { value: "walaa", label: "Walaa" },
];

const SAUDI_CITIES = [
  "Riyadh", "Jeddah", "Makkah", "Madinah", "Dammam", "Al Qatif", 
  "Al Khobar", "Abha", "Tabuk", "Taif", "Buraydah", "Khamis Mushait", 
  "Hail", "Najran", "Jubail", "Yanbu"
];

const SPECIALTY_CODES = [
  { value: "PED", label: "PED - Pediatrics" },
  { value: "IM", label: "IM - Internal Medicine" },
  { value: "CAR", label: "CAR - Cardiology" },
  { value: "ORT", label: "ORT - Orthopedics" },
  { value: "RAD", label: "RAD - Radiology" },
  { value: "GS", label: "GS - General Surgery" },
  { value: "OBG", label: "OBG - Obstetrics & Gynecology" },
  { value: "DER", label: "DER - Dermatology" },
  { value: "NEU", label: "NEU - Neurology" },
  { value: "PSY", label: "PSY - Psychiatry" },
];

const PROVIDER_TYPES = [
  { value: "hospital", label: "Hospital" },
  { value: "clinic", label: "Clinic" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "laboratory", label: "Laboratory" },
  { value: "imaging-center", label: "Imaging Center" },
];

const BENEFIT_CODES = [
  { value: "MED", label: "MED - Medical Services" },
  { value: "SURG", label: "SURG - Surgical Services" },
  { value: "LAB", label: "LAB - Laboratory Services" },
  { value: "RAD", label: "RAD - Radiology Services" },
  { value: "PHARM", label: "PHARM - Pharmacy Services" },
  { value: "ER", label: "ER - Emergency Room" },
  { value: "ICU", label: "ICU - Intensive Care Unit" },
  { value: "MAT", label: "MAT - Maternity Services" },
  { value: "DENT", label: "DENT - Dental Services" },
  { value: "VIS", label: "VIS - Vision Services" },
];

interface DetectionConfig {
  method: string;
  name: string;
  isEnabled: boolean;
  weight: string;
  threshold: string;
  description: string;
}

interface DetectionResult {
  claimId: string;
  compositeScore: number;
  compositeRiskLevel: string;
  ruleEngineScore: number;
  statisticalScore: number;
  unsupervisedScore: number;
  ragLlmScore: number;
  semanticScore: number;
  ruleEngineFindings: any;
  statisticalFindings: any;
  unsupervisedFindings: any;
  ragLlmFindings: any;
  semanticFindings: any;
  primaryDetectionMethod: string;
  detectionSummary: string;
  recommendedAction: string;
  processingTimeMs: number;
}

const methodIcons: Record<string, typeof Brain> = {
  rule_engine: ShieldCheck,
  statistical_learning: BarChart3,
  unsupervised_learning: Network,
  rag_llm: Brain,
  semantic_validation: FileSearch
};

const methodColors: Record<string, string> = {
  rule_engine: "text-blue-500",
  statistical_learning: "text-green-500",
  unsupervised_learning: "text-purple-500",
  rag_llm: "text-amber-500",
  semantic_validation: "text-cyan-500"
};

function getRiskBadge(level: string) {
  switch (level) {
    case "critical":
      return <Badge variant="destructive" data-testid="badge-risk-critical">Critical Risk</Badge>;
    case "high":
      return <Badge variant="destructive" data-testid="badge-risk-high">High Risk</Badge>;
    case "medium":
      return <Badge variant="secondary" data-testid="badge-risk-medium">Medium Risk</Badge>;
    default:
      return <Badge variant="secondary" data-testid="badge-risk-low">Low Risk</Badge>;
  }
}

function ScoreBar({ label, score, color, testId }: { label: string; score: number; color: string; testId?: string }) {
  return (
    <div className="space-y-1" data-testid={testId}>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-medium" data-testid={testId ? `${testId}-value` : undefined}>{score.toFixed(1)}</span>
      </div>
      <Progress value={score} className={`h-2 ${color}`} />
    </div>
  );
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleString();
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case "completed":
      return <Badge variant="outline" className="gap-1 border-green-500 text-green-600 dark:text-green-400" data-testid="badge-status-completed"><CheckCircle2 className="w-3 h-3" />Completed</Badge>;
    case "processing":
      return <Badge variant="secondary" className="gap-1" data-testid="badge-status-processing"><Loader2 className="w-3 h-3 animate-spin" />Processing</Badge>;
    case "failed":
      return <Badge variant="destructive" className="gap-1" data-testid="badge-status-failed"><AlertCircle className="w-3 h-3" />Failed</Badge>;
    case "cancelled":
      return <Badge variant="outline" className="gap-1" data-testid="badge-status-cancelled"><AlertCircle className="w-3 h-3" />Cancelled</Badge>;
    default:
      return <Badge variant="secondary" className="gap-1" data-testid="badge-status-pending"><Clock className="w-3 h-3" />Pending</Badge>;
  }
}

export default function DetectionEnginePage() {
  const { toast } = useToast();
  const [ingestionMode, setIngestionMode] = useState<"single" | "batch" | "production">("single");
  const [prodSearchQuery, setProdSearchQuery] = useState("");
  const [selectedProdClaim, setSelectedProdClaim] = useState<any>(null);
  const [prodAnalysisResult, setProdAnalysisResult] = useState<DetectionResult | null>(null);
  const [prodActiveTab, setProdActiveTab] = useState("overview");
  
  const [claimData, setClaimData] = useState({
    id: "",
    claimReference: "",
    payer: "",
    batchNumber: "",
    batchDate: "",
    patientId: "",
    dateOfBirth: "",
    gender: "",
    isNewborn: false,
    isChronic: false,
    isPreExisting: false,
    policyNo: "",
    policyEffectiveDate: "",
    policyExpiryDate: "",
    providerId: "",
    practitionerLicense: "",
    specialtyCode: "",
    city: "",
    providerType: "",
    networkStatus: "in-network",
    claimType: "outpatient",
    claimOccurrenceDate: "",
    benefitCode: "",
    amount: "",
    isPreAuthorized: false,
    principalDiagnosisCode: "",
    secondaryDiagnosisCodes: "",
    procedureCode: "",
    serviceLines: "",
    medications: "",
    description: "",
  });
  
  const [analysisResult, setAnalysisResult] = useState<DetectionResult | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [batchName, setBatchName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // AI Field Mapping state
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [mappingResult, setMappingResult] = useState<any>(null);
  const [parsedFileData, setParsedFileData] = useState<{columns: string[], data: any[]}>({ columns: [], data: [] });
  const [isLoadingMapping, setIsLoadingMapping] = useState(false);
  const [confirmedMappings, setConfirmedMappings] = useState<Record<string, string>>({});

  const { data: configs = [] } = useQuery<DetectionConfig[]>({
    queryKey: ["/api/fwa/detection-engine/configs"]
  });

  const { data: batches = [], isLoading: batchesLoading, refetch: refetchBatches } = useQuery<FwaBatch[]>({
    queryKey: ["/api/fwa/batches"],
    refetchInterval: 3000,
  });

  const { data: claimsStats } = useQuery<{ totalClaims: number; avgAmount: number; uniqueProviders: number; uniquePatients: number }>({
    queryKey: ["/api/fwa/claims-stats"],
    enabled: ingestionMode === "production",
  });

  const { data: rulesLibrary = [], refetch: refetchRules } = useQuery<any[]>({
    queryKey: ["/api/fwa/rules-library"],
    enabled: ingestionMode === "production",
  });

  const { data: searchResults = [], refetch: refetchSearch } = useQuery<any[]>({
    queryKey: ["/api/fwa/analyzed-claims/search", prodSearchQuery],
    queryFn: async () => {
      const response = await fetch(`/api/fwa/analyzed-claims/search?q=${encodeURIComponent(prodSearchQuery)}&limit=20`);
      if (!response.ok) throw new Error("Search failed");
      return response.json();
    },
    enabled: ingestionMode === "production" && prodSearchQuery.length >= 2,
  });

  const { data: detectionRuns = [] } = useQuery<any[]>({
    queryKey: ["/api/fwa/detection-runs"],
    enabled: ingestionMode === "production",
  });

  const seedRulesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/fwa/rules-library/seed", {});
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/rules-library"] });
      toast({
        title: "Rules Library Seeded",
        description: `${result.rulesSeeded} rules have been loaded.`,
      });
    }
  });

  const importClaimsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/fwa/claims-import", {});
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/claims-stats"] });
      toast({
        title: "Claims Imported",
        description: `${result.import?.imported || 0} claims imported. Features computed for ${result.features?.providers || 0} providers.`,
      });
    }
  });

  const prodAnalyzeMutation = useMutation({
    mutationFn: async (claimId: string) => {
      const response = await apiRequest("POST", "/api/fwa/production-detection/analyze", {
        claimId,
        skipRagLlm: false
      });
      return response.json();
    },
    onSuccess: (result) => {
      setProdAnalysisResult(result);
      setProdActiveTab("overview");
    }
  });

  const batchProdAnalyzeMutation = useMutation({
    mutationFn: async (limit: number) => {
      const response = await apiRequest("POST", "/api/fwa/production-detection/batch-analyze", {
        limit,
        skipRagLlm: true
      });
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/detection-runs"] });
      toast({
        title: "Batch Analysis Complete",
        description: `Analyzed ${result.analyzed} claims. ${result.summary.flaggedCount} flagged for review.`,
      });
    }
  });

  const analyzeMutation = useMutation({
    mutationFn: async (claim: any) => {
      const response = await apiRequest("POST", "/api/fwa/detection-engine/analyze", {
        claim: {
          ...claim,
          amount: parseFloat(claim.amount) || 0
        },
        save: false
      });
      return response.json();
    },
    onSuccess: (result) => {
      setAnalysisResult(result);
      setActiveTab("overview");
    }
  });

  const createBatchMutation = useMutation({
    mutationFn: async (data: { batchName: string; fileName: string; fileSize: number; totalClaims: number }) => {
      return apiRequest("POST", "/api/fwa/batches", {
        batchName: data.batchName,
        fileName: data.fileName,
        fileSize: data.fileSize,
        totalClaims: data.totalClaims,
        uploadedBy: "Current User",
        status: "pending",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/fwa/batches"] });
      toast({
        title: "Batch uploaded successfully",
        description: "Your batch has been uploaded and is ready for processing.",
      });
      setSelectedFile(null);
      setBatchName("");
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload batch",
        variant: "destructive",
      });
    },
  });

  const processBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      return apiRequest("POST", `/api/fwa/batches/${batchId}/process`, {});
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/fwa/batches"] });
      toast({
        title: "Processing started",
        description: "Batch processing has been started.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start processing",
        description: error.message || "Could not start batch processing",
        variant: "destructive",
      });
    },
  });

  const handleAnalyze = () => {
    if (!claimData.amount || !claimData.description) return;
    analyzeMutation.mutate(claimData);
  };

  const loadSampleClaim = async () => {
    try {
      const response = await fetch("/api/fwa/random-claim");
      if (!response.ok) {
        throw new Error("Failed to fetch sample claim");
      }
      const claim = await response.json();
      
      const serviceLines = claim.claimServices?.map((s: any) => 
        `${s.cptCode || s.code || "99213"}|${s.quantity || 1}|${s.unitPrice || s.amount || 500}|${s.description || "Service"}`
      ).join("\n") || "92928|1|45000|PCI with Drug-Eluting Stent\n93458|1|8500|Left Heart Catheterization\n99223|1|2500|Initial Hospital Care";
      
      const medications = claim.medications?.map((m: any) =>
        `${m.code || m.ndcCode || "00023-0001-01"}|${m.name || "Medication"}|${m.quantity || 1}|${m.dosage || "10mg"}`
      ).join("\n") || "00023-5523-60|Ticagrelor 90mg|60|90mg BID\n00006-0749-54|Atorvastatin 80mg|30|80mg daily\n00591-0307-01|Aspirin 81mg|30|81mg daily";
      
      setClaimData({
        id: claim.id || "sample-" + Date.now(),
        claimReference: claim.claimNumber || claim.claimReference || "CLM-" + Date.now(),
        payer: "tawuniya",
        batchNumber: claim.batchNumber || "BATCH-" + Math.floor(Math.random() * 1000),
        batchDate: claim.registrationDate ? new Date(claim.registrationDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        patientId: claim.patientId || "PAT-KSA-" + Math.floor(Math.random() * 10000),
        dateOfBirth: "1985-03-15",
        gender: "male",
        isNewborn: false,
        isChronic: true,
        isPreExisting: false,
        policyNo: claim.policyNumber || "POL-KSA-GOV-BASIC-2024-004",
        policyEffectiveDate: "2024-01-01",
        policyExpiryDate: "2024-12-31",
        providerId: claim.providerId || "PRV-KSA-001",
        practitionerLicense: "LIC-SA-" + Math.floor(Math.random() * 100000),
        specialtyCode: "CAR",
        city: claim.hospital ? "Riyadh" : "Riyadh",
        providerType: "hospital",
        networkStatus: "in-network",
        claimType: claim.claimType?.toLowerCase() || "inpatient",
        claimOccurrenceDate: claim.serviceDate ? new Date(claim.serviceDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        benefitCode: claim.category === "Surgery" ? "SURG" : "ICU",
        amount: claim.amount || "50000",
        isPreAuthorized: true,
        principalDiagnosisCode: claim.principalDiagnosisCode || claim.icd || "I21.0",
        secondaryDiagnosisCodes: claim.diagnosisCodes?.join("|") || "I10|E11.9",
        procedureCode: claim.procedureCode || claim.cpt || "92928",
        serviceLines: serviceLines,
        medications: medications,
        description: claim.description || "Standard medical care provided.",
      });
      
      toast({
        title: "Sample Claim Loaded",
        description: `Loaded claim ${claim.claimNumber || claim.id} from database with ${claim.claimServices?.length || 0} services`,
      });
    } catch (error) {
      console.error("Failed to load sample claim:", error);
      setClaimData({
        id: "sample-" + Date.now(),
        claimReference: "CLM-KSA-2026-" + Math.floor(Math.random() * 10000),
        payer: "tawuniya",
        batchNumber: "BATCH-" + Math.floor(Math.random() * 1000),
        batchDate: new Date().toISOString().split('T')[0],
        patientId: "PAT-KSA-" + Math.floor(Math.random() * 10000),
        dateOfBirth: "1985-03-15",
        gender: "male",
        isNewborn: false,
        isChronic: true,
        isPreExisting: false,
        policyNo: "POL-KSA-GOV-BASIC-2024-004",
        policyEffectiveDate: "2024-01-01",
        policyExpiryDate: "2024-12-31",
        providerId: "PRV-KSA-001",
        practitionerLicense: "LIC-SA-" + Math.floor(Math.random() * 100000),
        specialtyCode: "CAR",
        city: "Riyadh",
        providerType: "hospital",
        networkStatus: "in-network",
        claimType: "inpatient",
        claimOccurrenceDate: new Date().toISOString().split('T')[0],
        benefitCode: "ICU",
        amount: "125000",
        isPreAuthorized: true,
        principalDiagnosisCode: "I21.0",
        secondaryDiagnosisCodes: "I10|E11.9|Z82.49",
        procedureCode: "92928",
        serviceLines: "92928|1|45000|PCI with Drug-Eluting Stent\n93458|1|8500|Left Heart Catheterization\n99223|1|2500|Initial Hospital Care\n36556|1|1200|Central Venous Catheter\n94640|2|800|Nebulizer Treatment",
        medications: "00023-5523-60|Ticagrelor 90mg|60|90mg BID\n00006-0749-54|Atorvastatin 80mg|30|80mg daily\n00591-0307-01|Aspirin 81mg|30|81mg daily\n00093-0311-01|Metoprolol 50mg|60|50mg BID\n68180-0355-01|Lisinopril 10mg|30|10mg daily",
        description: "Inpatient hospital admission for acute ST-elevation myocardial infarction (STEMI). Emergency PCI performed with drug-eluting stent placement.",
      });
      toast({
        title: "Using Fallback",
        description: "Using default sample data (database unavailable)",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (file: File) => {
    const validTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (!validTypes.includes(file.type) && !file.name.endsWith(".csv") && !file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV or Excel file",
        variant: "destructive",
      });
      return;
    }
    setSelectedFile(file);
    if (!batchName) {
      setBatchName(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // AI Field Mapping function
  const handleAIMapping = async () => {
    if (!selectedFile) return;
    
    setIsLoadingMapping(true);
    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

      if (jsonData.length < 2) {
        toast({
          title: "Invalid File",
          description: "File must contain at least a header row and one data row",
          variant: "destructive",
        });
        setIsLoadingMapping(false);
        return;
      }

      const headers = (jsonData[0] as string[]).map((h: string) => String(h || "").trim());
      const rows = jsonData.slice(1, 6); // Sample first 5 data rows

      // Convert rows to objects with column headers
      const sampleData = rows.map((row: unknown[]) => {
        const obj: Record<string, any> = {};
        headers.forEach((header, idx) => {
          obj[header] = (row as unknown[])[idx];
        });
        return obj;
      });

      setParsedFileData({ columns: headers, data: sampleData });

      // Call AI mapping API
      const response = await apiRequest("POST", "/api/fwa/batch/ai-mapping", {
        columns: headers,
        sampleData: sampleData,
        fileName: selectedFile.name
      });
      
      const result = await response.json();
      
      if (result.success) {
        setMappingResult(result);
        
        // Pre-populate confirmed mappings from AI suggestions
        const confirmed: Record<string, string> = {};
        result.mappings?.forEach((m: any) => {
          if (m.sourceColumn && m.confidence >= 70) {
            confirmed[m.schemaField] = m.sourceColumn;
          }
        });
        setConfirmedMappings(confirmed);
        
        setShowMappingDialog(true);
      } else {
        toast({
          title: "Mapping Error",
          description: result.error || "Failed to analyze file structure",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("AI mapping error:", error);
      toast({
        title: "Mapping Failed",
        description: error instanceof Error ? error.message : "Failed to analyze file structure",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMapping(false);
    }
  };

  const handleConfirmMapping = (schemaField: string, sourceColumn: string) => {
    setConfirmedMappings(prev => ({
      ...prev,
      [schemaField]: sourceColumn
    }));
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];

      if (jsonData.length < 2) {
        toast({
          title: "Invalid File",
          description: "File must contain at least a header row and one data row",
          variant: "destructive",
        });
        return;
      }

      const headers = (jsonData[0] as string[]).map((h: string) => String(h).toLowerCase().trim().replace(/\s+/g, "_"));
      const rows = jsonData.slice(1).filter((row: unknown[]) => row.some((cell) => cell !== undefined && cell !== ""));

      // Expanded column mapping to handle various medical claims formats (GlobeMed, CHI, etc.)
      const columnMap: Record<string, string[]> = {
        claimNumber: [
          "claim_reference", "claim_number", "claim_id", "reference", "claimno", "claim_ref",
          "claimreference", "claimid", "claim_no", "ref_no", "authorization_no", "auth_no",
          "transaction_id", "trans_id", "invoice_no", "invoice_number", "voucher_no",
          "clm_no", "claim", "claimid", "clm_id", "clm_ref", "serial", "serial_no", "row_id"
        ],
        patientId: [
          "patient_id", "patientid", "patient", "member_id", "memberid", "member_no",
          "beneficiary_id", "insured_id", "card_no", "card_number", "iqama", "id_number",
          "member", "insured", "beneficiary", "patient_no", "mbr_id", "mbr_no"
        ],
        policyNumber: [
          "policy_no", "policy_number", "policy_id", "policyno", "policy", "contract_no",
          "group_no", "group_number", "plan_no", "plan_number", "certificate_no",
          "policy", "grp_no", "grp_id", "contract", "certificate"
        ],
        amount: [
          "amount", "total_amount", "claim_amount", "value", "net_amount", "gross_amount",
          "claimed_amount", "approved_amount", "paid_amount", "billed_amount", "total",
          "net", "gross", "total_cost", "cost", "charge", "price",
          // GlobeMed specific
          "net_claim_amount", "gross_claim_amount", "claim_value", "net_amt", "gross_amt",
          "total_claimed", "total_approved", "net_payable", "payable_amount", "sum",
          "clm_amt", "clm_amount", "approved_amt", "paid_amt", "requested_amount",
          // TachyHealth/GlobeMed Excel columns
          "unitprice", "unit_price", "patientsharelc", "patient_share_lc"
        ],
        icd: [
          "principal_diagnosis_code", "diagnosis_code", "icd", "icd_code", "diagnosis", "dx_code",
          "icd10", "icd_10", "primary_diagnosis", "main_diagnosis", "diag_code", "dx",
          "principal_icd", "primary_icd", "icd_primary", "diagnosis_1", "dx_1", "diag",
          // TachyHealth/GlobeMed
          "principaldiagnosiscode", "primarydiagnosiscm", "aidiagnosis", "claimdaignosis"
        ],
        description: [
          "description", "claim_description", "service_description", "details", "remarks",
          "notes", "procedure_description", "diagnosis_description", "treatment", "services",
          "diagnosis_desc", "diag_desc", "procedure", "service", "item_description",
          // TachyHealth/GlobeMed
          "servicedescription", "providerservicedescription", "claimsupportinginfo"
        ],
        providerId: [
          "provider_id", "providerid", "provider", "facility_id", "facility", "provider_no",
          "hospital_id", "clinic_id", "facility_code", "provider_code",
          "prov_id", "prov_no", "hosp_id", "hosp_no", "facility_no"
        ],
        providerName: [
          "provider_name", "hospital_name", "facility_name", "hospital", "clinic_name",
          "provider", "facility", "medical_center", "health_center",
          "prov_name", "hosp_name", "clinic", "provider_nm", "facility_nm"
        ],
        serviceDate: [
          "service_date", "date_of_service", "dos", "date", "claim_date", "treatment_date",
          "visit_date", "admission_date", "discharge_date", "encounter_date", "from_date",
          "svc_date", "service_dt", "claim_dt", "adm_date", "disch_date", "from_dt", "to_date",
          // TachyHealth/GlobeMed
          "claimoccurrencedate", "startdate", "batchdate"
        ],
        claimType: [
          "claim_type", "type", "category", "service_type", "visit_type", "encounter_type",
          "claim_category", "benefit_type", "treatment_type",
          "clm_type", "svc_type", "benefit", "coverage_type", "class",
          // TachyHealth/GlobeMed
          "claimtype", "servicetype", "providertype"
        ],
        hospital: [
          "hospital", "facility", "provider", "hospital_name", "clinic", "medical_center",
          "hosp", "hosp_name", "facility_name", "provider_name"
        ],
      };

      const findColumnIndex = (field: string): number => {
        // Use confirmed AI mappings if available
        if (confirmedMappings[field]) {
          const mappedColumn = confirmedMappings[field].toLowerCase().trim().replace(/\s+/g, "_");
          const idx = headers.indexOf(mappedColumn);
          if (idx !== -1) {
            console.log(`  ${field}: Using AI confirmed mapping -> column ${idx} (${headers[idx]})`);
            return idx;
          }
        }
        // Fall back to auto-detection
        const possibleNames = columnMap[field] || [];
        for (const name of possibleNames) {
          const idx = headers.indexOf(name);
          if (idx !== -1) return idx;
        }
        return -1;
      };

      const colIndices: Record<string, number> = {};
      for (const field of Object.keys(columnMap)) {
        colIndices[field] = findColumnIndex(field);
      }

      // Log column mapping results for debugging
      console.log("Excel headers found:", headers.slice(0, 20));
      console.log("Column mapping results:");
      Object.entries(colIndices).forEach(([field, idx]) => {
        console.log(`  ${field}: ${idx !== -1 ? `column ${idx} (${headers[idx]})` : 'NOT FOUND'}`);
      });
      
      // Sample first row for debugging
      if (rows.length > 0) {
        console.log("First row sample:", rows[0].slice(0, 15));
      }

      const claims = rows.map((row: unknown[], idx: number) => {
        const getValue = (field: string): string => {
          const colIdx = colIndices[field];
          if (colIdx === -1 || row[colIdx] === undefined) return "";
          return String(row[colIdx]).trim();
        };

        const amountStr = getValue("amount").replace(/[^0-9.-]/g, "");
        const amount = parseFloat(amountStr) || 0;

        return {
          claimNumber: getValue("claimNumber") || `CLM-${Date.now()}-${idx + 1}`,
          patientId: getValue("patientId") || undefined,
          policyNumber: getValue("policyNumber") || undefined,
          amount: amount.toFixed(2),
          icd: getValue("icd") || undefined,
          description: getValue("description") || undefined,
          providerId: getValue("providerId") || undefined,
          providerName: getValue("providerName") || getValue("hospital") || undefined,
          serviceDate: getValue("serviceDate") || undefined,
          claimType: getValue("claimType") || "inpatient",
          hospital: getValue("hospital") || getValue("providerName") || undefined,
          status: "pending" as const,
        };
      }).filter((claim) => claim.amount > 0 || claim.claimNumber);

      if (claims.length === 0) {
        toast({
          title: "No Valid Claims",
          description: "Could not parse any valid claims from the file. Check column headers.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "File Parsed Successfully",
        description: `Found ${claims.length} claims. Uploading...`,
      });

      // Include confirmed AI mappings if any were set
      const hasConfirmedMappings = Object.keys(confirmedMappings).length > 0;
      
      const response = await apiRequest("POST", "/api/fwa/batches/create-with-claims", {
        batchName: batchName || selectedFile.name,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        claims,
        fieldMappings: hasConfirmedMappings ? confirmedMappings : undefined,
      });

      const result = await response.json();

      toast({
        title: "Batch Created",
        description: `Successfully created batch with ${result.claimsCreated || claims.length} claims`,
      });

      setSelectedFile(null);
      setBatchName("");
      setConfirmedMappings({}); // Clear AI mappings after successful upload
      await queryClient.invalidateQueries({ queryKey: ["/api/fwa/batches"] });

    } catch (error) {
      console.error("File upload error:", error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to parse and upload file",
        variant: "destructive",
      });
    }
  };

  const getProgressValue = (batch: FwaBatch): number => {
    if (batch.status === "completed") return 100;
    return parseFloat(batch.progress || "0");
  };

  const handleRunBatchAnalysis = async () => {
    const pendingBatches = batches.filter(b => b.status === "pending" || b.status === "failed");
    
    if (pendingBatches.length === 0) {
      toast({
        title: "No Pending Batches",
        description: "All batches have already been processed",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    
    toast({
      title: "Batch Analysis Started",
      description: `Analyzing ${pendingBatches.length} batch(es)...`,
    });

    let totalProcessed = 0;
    let totalFlagged = 0;

    for (const batch of pendingBatches) {
      try {
        toast({
          title: "Processing Batch",
          description: `Analyzing ${batch.batchName}...`,
        });

        const response = await apiRequest("POST", `/api/fwa/batches/${batch.id}/run-analysis`);
        const result = await response.json();

        totalProcessed += result.processed || 0;
        totalFlagged += result.flagged || 0;

        const batchProgress = ((pendingBatches.indexOf(batch) + 1) / pendingBatches.length) * 100;
        setProgress(batchProgress);

        toast({
          title: "Batch Completed",
          description: `${batch.batchName}: ${result.processed} claims analyzed, ${result.flagged} flagged`,
        });

      } catch (error) {
        console.error(`Failed to analyze batch ${batch.id}:`, error);
        toast({
          title: "Batch Analysis Failed",
          description: `Failed to analyze ${batch.batchName}: ${error instanceof Error ? error.message : "Unknown error"}`,
          variant: "destructive",
        });
      }
    }

    setIsProcessing(false);
    setProgress(0);
    
    toast({
      title: "Batch Analysis Complete",
      description: `Processed ${totalProcessed} claims across ${pendingBatches.length} batches. Found ${totalFlagged} flagged claims.`,
    });
    
    await queryClient.invalidateQueries({ queryKey: ["/api/fwa/batches"] });
  };

  const batchStats = {
    totalBatches: batches.length,
    processingNow: batches.filter((b) => b.status === "processing").length,
    completedToday: batches.filter((b) => {
      if (b.status !== "completed" || !b.completedAt) return false;
      const completedDate = new Date(b.completedAt);
      const today = new Date();
      return completedDate.toDateString() === today.toDateString();
    }).length,
    claimsFlagged: batches.reduce((sum, b) => sum + (b.flaggedClaims || 0), 0),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Detection Engine</h1>
          <p className="text-muted-foreground">
            Run multi-method FWA screening on claims and batches
          </p>
        </div>
      </div>

      <Tabs value={ingestionMode} onValueChange={(v) => setIngestionMode(v as "single" | "batch" | "production")} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="single" className="flex items-center gap-2" data-testid="tab-single-claim">
            <FileSearch className="h-4 w-4" />
            Single Claim
          </TabsTrigger>
          <TabsTrigger value="batch" className="flex items-center gap-2" data-testid="tab-batch-upload">
            <Upload className="h-4 w-4" />
            Batch Upload
          </TabsTrigger>
          <TabsTrigger value="production" className="flex items-center gap-2" data-testid="tab-production">
            <ShieldCheck className="h-4 w-4" />
            Production Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSearch className="h-5 w-5" />
                  Claim Analysis
                </CardTitle>
                <CardDescription>
                  Enter claim details for regulatory detection analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-6">
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" onClick={loadSampleClaim} data-testid="button-load-sample">
                        Load Sample Claim
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <FileText className="h-4 w-4" />
                        Claim Information
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="claimReference">Claim Reference *</Label>
                          <Input
                            id="claimReference"
                            placeholder="CLM-KSA-2026-0001"
                            value={claimData.claimReference}
                            onChange={(e) => setClaimData({ ...claimData, claimReference: e.target.value })}
                            data-testid="input-claim-reference"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="payer">Payer / Group No</Label>
                          <Select value={claimData.payer} onValueChange={(v) => setClaimData({ ...claimData, payer: v })}>
                            <SelectTrigger data-testid="select-payer">
                              <SelectValue placeholder="Select payer" />
                            </SelectTrigger>
                            <SelectContent>
                              {SAUDI_PAYERS.map((p) => (
                                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="batchNumber">Batch Number</Label>
                          <Input
                            id="batchNumber"
                            placeholder="BATCH-001"
                            value={claimData.batchNumber}
                            onChange={(e) => setClaimData({ ...claimData, batchNumber: e.target.value })}
                            data-testid="input-batch-number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="batchDate">Batch Date</Label>
                          <Input
                            id="batchDate"
                            type="date"
                            value={claimData.batchDate}
                            onChange={(e) => setClaimData({ ...claimData, batchDate: e.target.value })}
                            data-testid="input-batch-date"
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <User className="h-4 w-4" />
                        Patient Information
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="patientId">Patient ID *</Label>
                          <Input
                            id="patientId"
                            placeholder="PAT-KSA-001"
                            value={claimData.patientId}
                            onChange={(e) => setClaimData({ ...claimData, patientId: e.target.value })}
                            data-testid="input-patient-id"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dateOfBirth">Date of Birth</Label>
                          <Input
                            id="dateOfBirth"
                            type="date"
                            value={claimData.dateOfBirth}
                            onChange={(e) => setClaimData({ ...claimData, dateOfBirth: e.target.value })}
                            data-testid="input-dob"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="gender">Gender</Label>
                          <Select value={claimData.gender} onValueChange={(v) => setClaimData({ ...claimData, gender: v })}>
                            <SelectTrigger data-testid="select-gender">
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2 pt-6">
                          <div className="flex flex-wrap gap-4">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={claimData.isNewborn}
                                onCheckedChange={(v) => setClaimData({ ...claimData, isNewborn: v })}
                                data-testid="switch-newborn"
                              />
                              <Label className="text-xs">Newborn</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={claimData.isChronic}
                                onCheckedChange={(v) => setClaimData({ ...claimData, isChronic: v })}
                                data-testid="switch-chronic"
                              />
                              <Label className="text-xs">Chronic</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={claimData.isPreExisting}
                                onCheckedChange={(v) => setClaimData({ ...claimData, isPreExisting: v })}
                                data-testid="switch-preexisting"
                              />
                              <Label className="text-xs">Pre-Existing</Label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <FileText className="h-4 w-4" />
                        Policy Information
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="policyNo">Policy No *</Label>
                          <Input
                            id="policyNo"
                            placeholder="POL-KSA-001"
                            value={claimData.policyNo}
                            onChange={(e) => setClaimData({ ...claimData, policyNo: e.target.value })}
                            data-testid="input-policy-no"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="policyEffectiveDate">Effective Date</Label>
                          <Input
                            id="policyEffectiveDate"
                            type="date"
                            value={claimData.policyEffectiveDate}
                            onChange={(e) => setClaimData({ ...claimData, policyEffectiveDate: e.target.value })}
                            data-testid="input-policy-effective"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="policyExpiryDate">Expiry Date</Label>
                          <Input
                            id="policyExpiryDate"
                            type="date"
                            value={claimData.policyExpiryDate}
                            onChange={(e) => setClaimData({ ...claimData, policyExpiryDate: e.target.value })}
                            data-testid="input-policy-expiry"
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <Building2 className="h-4 w-4" />
                        Provider Information
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="providerId">Provider ID</Label>
                          <Input
                            id="providerId"
                            placeholder="PRV-KSA-001"
                            value={claimData.providerId}
                            onChange={(e) => setClaimData({ ...claimData, providerId: e.target.value })}
                            data-testid="input-provider-id"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="practitionerLicense">Practitioner License</Label>
                          <Input
                            id="practitionerLicense"
                            placeholder="LIC-SA-12345"
                            value={claimData.practitionerLicense}
                            onChange={(e) => setClaimData({ ...claimData, practitionerLicense: e.target.value })}
                            data-testid="input-license"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="specialtyCode">Specialty Code</Label>
                          <Select value={claimData.specialtyCode} onValueChange={(v) => setClaimData({ ...claimData, specialtyCode: v })}>
                            <SelectTrigger data-testid="select-specialty">
                              <SelectValue placeholder="Select specialty" />
                            </SelectTrigger>
                            <SelectContent>
                              {SPECIALTY_CODES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Select value={claimData.city} onValueChange={(v) => setClaimData({ ...claimData, city: v })}>
                            <SelectTrigger data-testid="select-city">
                              <SelectValue placeholder="Select city" />
                            </SelectTrigger>
                            <SelectContent>
                              {SAUDI_CITIES.map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="providerType">Provider Type</Label>
                          <Select value={claimData.providerType} onValueChange={(v) => setClaimData({ ...claimData, providerType: v })}>
                            <SelectTrigger data-testid="select-provider-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {PROVIDER_TYPES.map((p) => (
                                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="networkStatus">Network Status</Label>
                          <Select value={claimData.networkStatus} onValueChange={(v) => setClaimData({ ...claimData, networkStatus: v })}>
                            <SelectTrigger data-testid="select-network">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="in-network">In Network</SelectItem>
                              <SelectItem value="out-of-network">Out of Network</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <Calendar className="h-4 w-4" />
                        Encounter / Claim Details
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="claimType">Claim Type</Label>
                          <Select value={claimData.claimType} onValueChange={(v) => setClaimData({ ...claimData, claimType: v })}>
                            <SelectTrigger data-testid="select-claim-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="inpatient">Inpatient</SelectItem>
                              <SelectItem value="outpatient">Outpatient</SelectItem>
                              <SelectItem value="emergency">Emergency</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="claimOccurrenceDate">Occurrence Date</Label>
                          <Input
                            id="claimOccurrenceDate"
                            type="date"
                            value={claimData.claimOccurrenceDate}
                            onChange={(e) => setClaimData({ ...claimData, claimOccurrenceDate: e.target.value })}
                            data-testid="input-occurrence-date"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="benefitCode">Benefit Code</Label>
                          <Select value={claimData.benefitCode} onValueChange={(v) => setClaimData({ ...claimData, benefitCode: v })}>
                            <SelectTrigger data-testid="select-benefit">
                              <SelectValue placeholder="Select benefit" />
                            </SelectTrigger>
                            <SelectContent>
                              {BENEFIT_CODES.map((b) => (
                                <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="amount">Total Amount (SAR) *</Label>
                          <Input
                            id="amount"
                            type="number"
                            placeholder="50000"
                            value={claimData.amount}
                            onChange={(e) => setClaimData({ ...claimData, amount: e.target.value })}
                            data-testid="input-amount"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={claimData.isPreAuthorized}
                          onCheckedChange={(v) => setClaimData({ ...claimData, isPreAuthorized: v })}
                          data-testid="switch-preauth"
                        />
                        <Label>Is Pre-Authorized</Label>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <Stethoscope className="h-4 w-4" />
                        Diagnosis & Clinical Information
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="principalDiagnosisCode">Principal Diagnosis (ICD-10-AM) *</Label>
                          <Input
                            id="principalDiagnosisCode"
                            placeholder="I21.0"
                            value={claimData.principalDiagnosisCode}
                            onChange={(e) => setClaimData({ ...claimData, principalDiagnosisCode: e.target.value })}
                            data-testid="input-principal-diagnosis"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="secondaryDiagnosisCodes">Secondary Diagnoses</Label>
                          <Input
                            id="secondaryDiagnosisCodes"
                            placeholder="I10|E11.9|Z82.49"
                            value={claimData.secondaryDiagnosisCodes}
                            onChange={(e) => setClaimData({ ...claimData, secondaryDiagnosisCodes: e.target.value })}
                            data-testid="input-secondary-diagnoses"
                          />
                          <p className="text-xs text-muted-foreground">Pipe-separated (|) additional diagnoses</p>
                        </div>
                      </div>
                      
                      <Separator className="my-2" />
                      <p className="text-sm font-medium flex items-center gap-2">
                        <Stethoscope className="h-4 w-4" />
                        Services & Medications
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="procedureCode">Primary Procedure (CPT)</Label>
                          <Input
                            id="procedureCode"
                            placeholder="92928"
                            value={claimData.procedureCode}
                            onChange={(e) => setClaimData({ ...claimData, procedureCode: e.target.value })}
                            data-testid="input-procedure-code"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Service Count</Label>
                          <Input
                            disabled
                            value={claimData.serviceLines ? claimData.serviceLines.split("\n").filter(l => l.trim()).length + " service lines" : "0 service lines"}
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="serviceLines">Service Lines (CPT|Qty|Price|Description)</Label>
                        <Textarea
                          id="serviceLines"
                          placeholder="92928|1|45000|PCI with Drug-Eluting Stent&#10;93458|1|8500|Left Heart Catheterization"
                          value={claimData.serviceLines}
                          onChange={(e) => setClaimData({ ...claimData, serviceLines: e.target.value })}
                          rows={3}
                          className="font-mono text-xs"
                          data-testid="textarea-service-lines"
                        />
                        <p className="text-xs text-muted-foreground">One service per line: CPT Code | Quantity | Unit Price | Description</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="medications">Medications (NDC|Name|Qty|Dosage)</Label>
                        <Textarea
                          id="medications"
                          placeholder="00023-5523-60|Ticagrelor 90mg|60|90mg BID&#10;00006-0749-54|Atorvastatin 80mg|30|80mg daily"
                          value={claimData.medications}
                          onChange={(e) => setClaimData({ ...claimData, medications: e.target.value })}
                          rows={3}
                          className="font-mono text-xs"
                          data-testid="textarea-medications"
                        />
                        <p className="text-xs text-muted-foreground">One medication per line: NDC Code | Drug Name | Quantity | Dosage</p>
                      </div>
                      
                      <Separator className="my-2" />
                      
                      <div className="space-y-2">
                        <Label htmlFor="description">Claim Description *</Label>
                        <Textarea
                          id="description"
                          placeholder="Describe the clinical encounter, services provided, and any relevant context..."
                          value={claimData.description}
                          onChange={(e) => setClaimData({ ...claimData, description: e.target.value })}
                          rows={3}
                          data-testid="textarea-description"
                        />
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full" 
                      onClick={handleAnalyze}
                      disabled={analyzeMutation.isPending || !claimData.amount || !claimData.description}
                      data-testid="button-analyze"
                    >
                      {analyzeMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing with 4 Detection Methods...
                        </>
                      ) : (
                        <>
                          <Zap className="mr-2 h-4 w-4" />
                          Run Full Detection Analysis
                        </>
                      )}
                    </Button>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Detection Results
                </CardTitle>
                <CardDescription>
                  Multi-method FWA analysis with composite risk scoring
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!analysisResult ? (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <Brain className="h-12 w-12 mb-4 opacity-50" />
                    <p>Enter claim details and click analyze to see detection results</p>
                  </div>
                ) : (
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-6">
                      <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
                      <TabsTrigger value="rules" data-testid="tab-rules">Rules</TabsTrigger>
                      <TabsTrigger value="statistical" data-testid="tab-statistical">Statistical</TabsTrigger>
                      <TabsTrigger value="unsupervised" data-testid="tab-unsupervised">Anomaly</TabsTrigger>
                      <TabsTrigger value="rag" data-testid="tab-rag">RAG/LLM</TabsTrigger>
                      <TabsTrigger value="semantic" data-testid="tab-semantic">Semantic</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4 mt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Composite Risk Score</p>
                          <p className="text-4xl font-bold" data-testid="text-composite-score">
                            {analysisResult.compositeScore.toFixed(1)}
                          </p>
                        </div>
                        <div className="text-right">
                          {getRiskBadge(analysisResult.compositeRiskLevel)}
                          <p className="text-xs text-muted-foreground mt-1">
                            <Clock className="inline h-3 w-3 mr-1" />
                            {analysisResult.processingTimeMs}ms
                          </p>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-3">
                        <ScoreBar label="Rule Engine" score={analysisResult.ruleEngineScore} color="bg-blue-500" testId="score-rule-engine" />
                        <ScoreBar label="Statistical Learning" score={analysisResult.statisticalScore} color="bg-green-500" testId="score-statistical" />
                        <ScoreBar label="Unsupervised Learning" score={analysisResult.unsupervisedScore} color="bg-purple-500" testId="score-unsupervised" />
                        <ScoreBar label="RAG/LLM Analysis" score={analysisResult.ragLlmScore} color="bg-amber-500" testId="score-rag-llm" />
                        <ScoreBar label="Semantic Validation" score={analysisResult.semanticScore ?? 0} color="bg-cyan-500" testId="score-semantic" />
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Detection Summary</p>
                        <p className="text-sm text-muted-foreground" data-testid="text-summary">
                          {analysisResult.detectionSummary}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm font-medium flex items-center gap-1">
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                          Recommended Action
                        </p>
                        <p className="text-sm text-muted-foreground" data-testid="text-recommendation">
                          {analysisResult.recommendedAction}
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="rules" className="mt-4">
                      <ScrollArea className="h-64">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              Rule Engine Score: {analysisResult.ruleEngineScore.toFixed(1)}
                            </p>
                            <Badge variant="outline">
                              {analysisResult.ruleEngineFindings.violationCount} Violations
                            </Badge>
                          </div>
                          
                          {analysisResult.ruleEngineFindings.matchedRules?.length > 0 ? (
                            analysisResult.ruleEngineFindings.matchedRules.map((rule: any, idx: number) => (
                              <Card key={idx} className="p-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-medium text-sm">{rule.ruleName}</p>
                                    <p className="text-xs text-muted-foreground">{rule.category}</p>
                                  </div>
                                  <Badge variant={rule.severity === 'critical' ? 'destructive' : 'secondary'}>
                                    {rule.severity}
                                  </Badge>
                                </div>
                                <p className="text-xs mt-2 text-muted-foreground">{rule.description}</p>
                                <p className="text-xs mt-1">Confidence: {(rule.confidence * 100).toFixed(0)}%</p>
                              </Card>
                            ))
                          ) : (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm">No rule violations detected</span>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="statistical" className="mt-4">
                      <ScrollArea className="h-64">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              Statistical Score: {analysisResult.statisticalScore.toFixed(1)}
                            </p>
                            <Badge variant="outline">
                              ML Prediction: {(analysisResult.statisticalFindings.modelPrediction * 100).toFixed(0)}%
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Feature Importance</p>
                            {analysisResult.statisticalFindings.featureImportance?.map((feat: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{feat.feature.replace(/_/g, ' ')}</span>
                                <span className="font-mono">{(feat.importance * 100).toFixed(0)}%</span>
                              </div>
                            ))}
                          </div>
                          
                          <Separator />
                          
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Peer Comparison</p>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">Mean</p>
                                <p className="font-mono">{analysisResult.statisticalFindings.peerComparison?.mean?.toFixed(1)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Std Dev</p>
                                <p className="font-mono">{analysisResult.statisticalFindings.peerComparison?.stdDev?.toFixed(1)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Z-Score</p>
                                <p className="font-mono">{analysisResult.statisticalFindings.peerComparison?.zScore?.toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="unsupervised" className="mt-4">
                      <ScrollArea className="h-80">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              Anomaly Score: {analysisResult.unsupervisedScore.toFixed(1)}
                            </p>
                            <Badge variant="outline">
                              Cluster #{analysisResult.unsupervisedFindings.clusterAssignment}
                            </Badge>
                          </div>
                          
                          {analysisResult.unsupervisedFindings.algorithmScores && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium flex items-center gap-2">
                                <Network className="h-4 w-4 text-purple-500" />
                                5-Algorithm Comparison
                              </p>
                              <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <RadarChart
                                    data={[
                                      { algorithm: 'Isolation Forest', score: analysisResult.unsupervisedFindings.algorithmScores.isolationForest * 100, fullMark: 100 },
                                      { algorithm: 'LOF', score: analysisResult.unsupervisedFindings.algorithmScores.lof * 100, fullMark: 100 },
                                      { algorithm: 'DBSCAN', score: analysisResult.unsupervisedFindings.algorithmScores.dbscan * 100, fullMark: 100 },
                                      { algorithm: 'Autoencoder', score: analysisResult.unsupervisedFindings.algorithmScores.autoencoder * 100, fullMark: 100 },
                                      { algorithm: 'Deep Learning', score: analysisResult.unsupervisedFindings.algorithmScores.deepLearning * 100, fullMark: 100 },
                                    ]}
                                  >
                                    <PolarGrid stroke="#888" strokeOpacity={0.3} />
                                    <PolarAngleAxis 
                                      dataKey="algorithm" 
                                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                                    />
                                    <PolarRadiusAxis 
                                      angle={90} 
                                      domain={[0, 100]} 
                                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                                    />
                                    <Radar
                                      name="Risk Score"
                                      dataKey="score"
                                      stroke="#8b5cf6"
                                      fill="#8b5cf6"
                                      fillOpacity={0.4}
                                    />
                                  </RadarChart>
                                </ResponsiveContainer>
                              </div>
                              <div className="grid grid-cols-5 gap-1 text-center">
                                <div className="p-1">
                                  <p className="text-xs text-muted-foreground">IF</p>
                                  <p className="text-sm font-bold text-purple-600">{(analysisResult.unsupervisedFindings.algorithmScores.isolationForest * 100).toFixed(0)}%</p>
                                </div>
                                <div className="p-1">
                                  <p className="text-xs text-muted-foreground">LOF</p>
                                  <p className="text-sm font-bold text-purple-600">{(analysisResult.unsupervisedFindings.algorithmScores.lof * 100).toFixed(0)}%</p>
                                </div>
                                <div className="p-1">
                                  <p className="text-xs text-muted-foreground">DBSCAN</p>
                                  <p className="text-sm font-bold text-purple-600">{(analysisResult.unsupervisedFindings.algorithmScores.dbscan * 100).toFixed(0)}%</p>
                                </div>
                                <div className="p-1">
                                  <p className="text-xs text-muted-foreground">AE</p>
                                  <p className="text-sm font-bold text-purple-600">{(analysisResult.unsupervisedFindings.algorithmScores.autoencoder * 100).toFixed(0)}%</p>
                                </div>
                                <div className="p-1">
                                  <p className="text-xs text-muted-foreground">DL</p>
                                  <p className="text-sm font-bold text-purple-600">{(analysisResult.unsupervisedFindings.algorithmScores.deepLearning * 100).toFixed(0)}%</p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {analysisResult.unsupervisedFindings.outlierReason?.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium flex items-center gap-1">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                Anomaly Indicators
                              </p>
                              {analysisResult.unsupervisedFindings.outlierReason.map((reason: string, idx: number) => (
                                <p key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                  {reason}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="rag" className="mt-4">
                      <ScrollArea className="h-64">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              RAG/LLM Score: {analysisResult.ragLlmScore.toFixed(1)}
                            </p>
                            <Badge variant="outline">
                              Confidence: {(analysisResult.ragLlmFindings.confidence * 100).toFixed(0)}%
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-sm font-medium flex items-center gap-1">
                              <Info className="h-4 w-4" />
                              Contextual Analysis
                            </p>
                            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                              {analysisResult.ragLlmFindings.contextualAnalysis || "No contextual analysis available."}
                            </p>
                          </div>
                          
                          {analysisResult.ragLlmFindings.knowledgeBaseMatches?.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Knowledge Base Matches</p>
                              {analysisResult.ragLlmFindings.knowledgeBaseMatches.map((match: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                                  <span className="text-muted-foreground">{match.title}</span>
                                  <Badge variant="outline">{(match.relevance * 100).toFixed(0)}%</Badge>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div className="space-y-2">
                            <p className="text-sm font-medium">LLM Recommendation</p>
                            <p className="text-sm text-muted-foreground">
                              {analysisResult.ragLlmFindings.recommendation || "Standard review recommended."}
                            </p>
                          </div>
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="semantic" className="mt-4">
                      <ScrollArea className="h-64">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              Semantic Validation Score: {(analysisResult.semanticScore ?? 0).toFixed(1)}
                            </p>
                            <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">
                              ICD-10/CPT Match
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-sm font-medium flex items-center gap-1">
                              <FileSearch className="h-4 w-4 text-cyan-500" />
                              Procedure-Diagnosis Validation
                            </p>
                            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                              {analysisResult.semanticFindings?.analysis || "Semantic validation compares procedure codes against diagnosis codes using vector embeddings to ensure clinical appropriateness."}
                            </p>
                          </div>
                          
                          {analysisResult.semanticFindings?.matchResults?.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Semantic Match Results</p>
                              {analysisResult.semanticFindings.matchResults.map((match: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                                  <span className="text-muted-foreground">{match.procedure} ↔ {match.diagnosis}</span>
                                  <Badge variant={match.similarity >= 0.7 ? "secondary" : match.similarity >= 0.5 ? "outline" : "destructive"}>
                                    {(match.similarity * 100).toFixed(0)}% match
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Risk Assessment</p>
                            <p className="text-sm text-muted-foreground">
                              {analysisResult.semanticFindings?.riskAssessment || "Procedure-diagnosis combinations are within expected clinical parameters."}
                            </p>
                          </div>
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="batch" className="mt-6">
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card data-testid="card-stat-total-batches">
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
                <Files className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-total-batches">{batchStats.totalBatches}</div>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-processing">
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                <CardTitle className="text-sm font-medium">Processing Now</CardTitle>
                <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-processing">{batchStats.processingNow}</div>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-completed-today">
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="stat-completed-today">{batchStats.completedToday}</div>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-claims-flagged">
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                <CardTitle className="text-sm font-medium">Claims Flagged</CardTitle>
                <Flag className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive" data-testid="stat-claims-flagged">{batchStats.claimsFlagged}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1" data-testid="card-upload">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Batch
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className={`
                    border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                    ${isDragging 
                      ? "border-primary bg-primary/10" 
                      : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                    }
                  `}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="drop-zone"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file);
                    }}
                    data-testid="input-file"
                  />
                  <FolderUp className="w-10 h-10 mx-auto mb-3 text-primary/60" />
                  <p className="text-sm font-medium">
                    Drop your file here or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports CSV, XLS, XLSX files
                  </p>
                </div>

                {selectedFile && (
                  <div className="p-3 bg-muted rounded-lg" data-testid="selected-file-info">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-8 h-8 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" data-testid="text-file-name">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground" data-testid="text-file-size">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Batch Name</label>
                  <Input
                    placeholder="Enter batch name (optional)"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    data-testid="input-batch-name"
                  />
                </div>
                
                <div className="p-3 bg-muted/50 rounded-lg border">
                  <p className="text-xs font-medium mb-2 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Saudi Claims Schema
                  </p>
                  <ScrollArea className="h-32">
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p><span className="font-medium">Required:</span> claim_reference, patient_id, policy_no, amount, principal_diagnosis_code, description</p>
                      <p><span className="font-medium">Claim:</span> payer, batch_number, batch_date</p>
                      <p><span className="font-medium">Patient:</span> date_of_birth, gender, is_newborn, is_chronic, is_pre_existing</p>
                      <p><span className="font-medium">Policy:</span> policy_effective_date, policy_expiry_date</p>
                      <p><span className="font-medium">Provider:</span> provider_id, practitioner_license, specialty_code, city, provider_type, network_status</p>
                      <p><span className="font-medium">Encounter:</span> claim_type, claim_occurrence_date, benefit_code, is_pre_authorized</p>
                      <p><span className="font-medium">Diagnosis:</span> secondary_diagnosis_codes (pipe-separated)</p>
                    </div>
                  </ScrollArea>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-500"
                    onClick={handleAIMapping}
                    disabled={!selectedFile || isLoadingMapping}
                    data-testid="button-ai-map-fields"
                  >
                    {isLoadingMapping ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        AI Map Fields
                      </>
                    )}
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleUpload}
                    disabled={!selectedFile || createBatchMutation.isPending}
                    data-testid="button-start-processing"
                  >
                    {createBatchMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Start Processing
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2" data-testid="card-batches-list">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Batches
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleRunBatchAnalysis}
                    disabled={isProcessing || batches.length === 0}
                    data-testid="button-run-batch-analysis"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing... {progress}%
                      </>
                    ) : (
                      <>
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Run Batch Analysis
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => refetchBatches()}
                    data-testid="button-refresh-batches"
                  >
                    <RefreshCw className={`w-4 h-4 ${batchesLoading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {batchesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : batches.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground" data-testid="empty-batches">
                    <Upload className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No batches uploaded yet</p>
                    <p className="text-sm">Upload your first batch to get started</p>
                  </div>
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Batch Name</TableHead>
                          <TableHead>File Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-center">Total</TableHead>
                          <TableHead className="text-center">Processed</TableHead>
                          <TableHead className="text-center">Flagged</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Uploaded By</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batches.map((batch) => (
                          <TableRow
                            key={batch.id}
                            className="hover-elevate cursor-pointer"
                            data-testid={`row-batch-${batch.id}`}
                          >
                            <TableCell className="font-medium" data-testid={`text-batch-name-${batch.id}`}>
                              {batch.batchName}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground" data-testid={`text-file-name-${batch.id}`}>
                              {batch.fileName || "—"}
                            </TableCell>
                            <TableCell>{getStatusBadge(batch.status)}</TableCell>
                            <TableCell className="text-center" data-testid={`text-total-claims-${batch.id}`}>
                              {batch.totalClaims || 0}
                            </TableCell>
                            <TableCell className="text-center" data-testid={`text-processed-claims-${batch.id}`}>
                              {batch.processedClaims || 0}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className={`${(batch.flaggedClaims || 0) > 0 ? "text-red-600 font-medium" : ""}`} data-testid={`text-flagged-claims-${batch.id}`}>
                                {batch.flaggedClaims || 0}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="w-24">
                                <Progress
                                  value={getProgressValue(batch)}
                                  className="h-2"
                                  data-testid={`progress-batch-${batch.id}`}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {getProgressValue(batch)}%
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm" data-testid={`text-uploaded-by-${batch.id}`}>
                              {batch.uploadedBy}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground" data-testid={`text-date-${batch.id}`}>
                              {formatDate(batch.createdAt)}
                            </TableCell>
                            <TableCell>
                              {batch.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    processBatchMutation.mutate(batch.id);
                                  }}
                                  disabled={processBatchMutation.isPending}
                                  data-testid={`button-process-${batch.id}`}
                                >
                                  <PlayCircle className="w-4 h-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="production" className="mt-6">
          <div className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card data-testid="card-total-claims">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted text-blue-500">
                      <Files className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{claimsStats?.totalClaims?.toLocaleString() || 0}</p>
                      <p className="text-xs text-muted-foreground">Imported Claims</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="card-unique-providers">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted text-green-500">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{claimsStats?.uniqueProviders?.toLocaleString() || 0}</p>
                      <p className="text-xs text-muted-foreground">Unique Providers</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="card-unique-patients">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted text-purple-500">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{claimsStats?.uniquePatients?.toLocaleString() || 0}</p>
                      <p className="text-xs text-muted-foreground">Unique Patients</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card data-testid="card-rules-count">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted text-amber-500">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{rulesLibrary.length}</p>
                      <p className="text-xs text-muted-foreground">Active Rules</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSearch className="h-5 w-5" />
                    Search Production Claims
                  </CardTitle>
                  <CardDescription>
                    Search and analyze claims from the imported 10,002-claim dataset
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search by claim reference, provider ID, patient ID..."
                      value={prodSearchQuery}
                      onChange={(e) => setProdSearchQuery(e.target.value)}
                      data-testid="input-prod-search"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => importClaimsMutation.mutate()}
                      disabled={importClaimsMutation.isPending}
                      data-testid="button-import-claims"
                    >
                      {importClaimsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderUp className="h-4 w-4" />}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => seedRulesMutation.mutate()}
                      disabled={seedRulesMutation.isPending}
                      data-testid="button-seed-rules"
                    >
                      {seedRulesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    </Button>
                  </div>

                  {prodSearchQuery.length >= 2 && (
                    <ScrollArea className="h-[300px] border rounded-md">
                      {searchResults.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                          <FileSearch className="h-8 w-8 mb-2 opacity-50" />
                          <p className="text-sm">No claims found matching your search</p>
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead>Claim Reference</TableHead>
                              <TableHead>Provider</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {searchResults.map((claim: any) => (
                              <TableRow 
                                key={claim.id}
                                className={`hover-elevate cursor-pointer ${selectedProdClaim?.id === claim.id ? "bg-muted" : ""}`}
                                onClick={() => setSelectedProdClaim(claim)}
                                data-testid={`row-prod-claim-${claim.id}`}
                              >
                                <TableCell className="font-medium">{claim.claimReference}</TableCell>
                                <TableCell>{claim.providerId}</TableCell>
                                <TableCell>{claim.totalAmount ? `${parseFloat(claim.totalAmount).toLocaleString()} SAR` : "—"}</TableCell>
                                <TableCell>
                                  <Badge variant={claim.originalStatus === "approved" ? "secondary" : "outline"}>
                                    {claim.originalStatus || "Unknown"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedProdClaim(claim);
                                      prodAnalyzeMutation.mutate(claim.id);
                                    }}
                                    disabled={prodAnalyzeMutation.isPending}
                                    data-testid={`button-analyze-${claim.id}`}
                                  >
                                    {prodAnalyzeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </ScrollArea>
                  )}

                  {selectedProdClaim && (
                    <Card className="bg-muted/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center justify-between gap-2 flex-wrap">
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Selected Claim: {selectedProdClaim.claimReference}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => prodAnalyzeMutation.mutate(selectedProdClaim.id)}
                            disabled={prodAnalyzeMutation.isPending}
                            data-testid="button-analyze-selected"
                          >
                            {prodAnalyzeMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <Zap className="h-4 w-4 mr-2" />
                                Run Full Detection
                              </>
                            )}
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Provider</p>
                            <p className="font-medium">{selectedProdClaim.providerId}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Patient</p>
                            <p className="font-medium">{selectedProdClaim.patientId}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Amount</p>
                            <p className="font-medium">{selectedProdClaim.totalAmount ? `${parseFloat(selectedProdClaim.totalAmount).toLocaleString()} SAR` : "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Specialty</p>
                            <p className="font-medium">{selectedProdClaim.specialtyCode || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Diagnosis</p>
                            <p className="font-medium">{selectedProdClaim.principalDiagnosisCode || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Service</p>
                            <p className="font-medium">{selectedProdClaim.serviceCode || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">City</p>
                            <p className="font-medium">{selectedProdClaim.city || "—"}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Pre-Auth</p>
                            <p className="font-medium">{selectedProdClaim.isPreAuthorized ? "Yes" : "No"}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" />
                    Rules Library
                  </CardTitle>
                  <CardDescription>
                    {rulesLibrary.length} configurable detection rules
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {rulesLibrary.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                        <ShieldCheck className="h-8 w-8 mb-2 opacity-50" />
                        <p className="text-sm">No rules loaded</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => seedRulesMutation.mutate()}
                          disabled={seedRulesMutation.isPending}
                        >
                          Load Default Rules
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {rulesLibrary.slice(0, 15).map((rule: any) => (
                          <div key={rule.id} className="p-2 border rounded-md text-sm">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="font-medium">{rule.ruleCode}</span>
                              <Badge variant={rule.severity === "critical" ? "destructive" : rule.severity === "high" ? "default" : "secondary"}>
                                {rule.severity}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{rule.name}</p>
                          </div>
                        ))}
                        {rulesLibrary.length > 15 && (
                          <p className="text-xs text-muted-foreground text-center">
                            +{rulesLibrary.length - 15} more rules
                          </p>
                        )}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {prodAnalysisResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Production Detection Results
                  </CardTitle>
                  <CardDescription>
                    5-method analysis using real claims data and feature store
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs value={prodActiveTab} onValueChange={setProdActiveTab}>
                    <TabsList className="grid w-full grid-cols-6">
                      <TabsTrigger value="overview" data-testid="prod-tab-overview">Overview</TabsTrigger>
                      <TabsTrigger value="rules" data-testid="prod-tab-rules">Rules</TabsTrigger>
                      <TabsTrigger value="statistical" data-testid="prod-tab-statistical">Statistical</TabsTrigger>
                      <TabsTrigger value="unsupervised" data-testid="prod-tab-unsupervised">Anomaly</TabsTrigger>
                      <TabsTrigger value="rag" data-testid="prod-tab-rag">RAG/LLM</TabsTrigger>
                      <TabsTrigger value="semantic" data-testid="prod-tab-semantic">Semantic</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4 mt-4">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <p className="text-sm text-muted-foreground">Composite Risk Score</p>
                          <p className="text-4xl font-bold" data-testid="prod-text-composite-score">
                            {prodAnalysisResult.compositeScore.toFixed(1)}
                          </p>
                        </div>
                        <div className="text-right">
                          {getRiskBadge(prodAnalysisResult.compositeRiskLevel)}
                          <p className="text-xs text-muted-foreground mt-1">
                            <Clock className="inline h-3 w-3 mr-1" />
                            {prodAnalysisResult.processingTimeMs}ms
                          </p>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-3">
                        <ScoreBar label="Rule Engine" score={prodAnalysisResult.ruleEngineScore} color="bg-blue-500" testId="prod-score-rule-engine" />
                        <ScoreBar label="Statistical Learning" score={prodAnalysisResult.statisticalScore} color="bg-green-500" testId="prod-score-statistical" />
                        <ScoreBar label="Unsupervised Learning" score={prodAnalysisResult.unsupervisedScore} color="bg-purple-500" testId="prod-score-unsupervised" />
                        <ScoreBar label="RAG/LLM Analysis" score={prodAnalysisResult.ragLlmScore} color="bg-amber-500" testId="prod-score-rag-llm" />
                        <ScoreBar label="Semantic Validation" score={prodAnalysisResult.semanticScore ?? 0} color="bg-cyan-500" testId="prod-score-semantic" />
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Detection Summary</p>
                        <p className="text-sm text-muted-foreground" data-testid="prod-text-summary">
                          {prodAnalysisResult.detectionSummary}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm font-medium flex items-center gap-1">
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                          Recommended Action
                        </p>
                        <p className="text-sm text-muted-foreground" data-testid="prod-text-recommendation">
                          {prodAnalysisResult.recommendedAction}
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="rules" className="mt-4">
                      <ScrollArea className="h-64">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-sm font-medium">
                              Rule Engine Score: {prodAnalysisResult.ruleEngineScore.toFixed(1)}
                            </p>
                            <Badge variant="outline">
                              {prodAnalysisResult.ruleEngineFindings?.violationCount || 0} Violations
                            </Badge>
                          </div>
                          
                          {prodAnalysisResult.ruleEngineFindings?.matchedRules?.length > 0 ? (
                            prodAnalysisResult.ruleEngineFindings.matchedRules.map((rule: any, idx: number) => (
                              <Card key={idx} className="p-3">
                                <div className="flex items-start justify-between gap-2 flex-wrap">
                                  <div>
                                    <p className="font-medium text-sm">{rule.ruleCode || rule.ruleName}</p>
                                    <p className="text-xs text-muted-foreground">{rule.category}</p>
                                  </div>
                                  <Badge variant={rule.severity === "critical" ? "destructive" : "secondary"}>
                                    {rule.severity}
                                  </Badge>
                                </div>
                                <p className="text-xs mt-2 text-muted-foreground">{rule.description}</p>
                              </Card>
                            ))
                          ) : (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm">No rule violations detected</span>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="statistical" className="mt-4">
                      <ScrollArea className="h-64">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-sm font-medium">
                              Statistical Score: {prodAnalysisResult.statisticalScore.toFixed(1)}
                            </p>
                            {prodAnalysisResult.statisticalFindings?.zScoreAmount !== undefined && (
                              <Badge variant="outline">
                                Z-Score: {prodAnalysisResult.statisticalFindings.zScoreAmount?.toFixed(2)}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-sm font-medium">Peer Comparison</p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="p-2 border rounded">
                                <p className="text-muted-foreground">Peer Average</p>
                                <p className="font-medium">{prodAnalysisResult.statisticalFindings?.peerAverage?.toLocaleString() || "—"} SAR</p>
                              </div>
                              <div className="p-2 border rounded">
                                <p className="text-muted-foreground">Percentile</p>
                                <p className="font-medium">{prodAnalysisResult.statisticalFindings?.percentile?.toFixed(0) || "—"}%</p>
                              </div>
                            </div>
                          </div>
                          
                          {prodAnalysisResult.statisticalFindings?.featureImportance && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Feature Importance</p>
                              {prodAnalysisResult.statisticalFindings.featureImportance.map((feat: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                  <span className="text-muted-foreground">{feat.feature?.replace(/_/g, " ")}</span>
                                  <span className="font-mono">{(feat.importance * 100).toFixed(0)}%</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="unsupervised" className="mt-4">
                      <ScrollArea className="h-80">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-sm font-medium">
                              Unsupervised Score: {prodAnalysisResult.unsupervisedScore.toFixed(1)}
                            </p>
                            <Badge variant="outline">
                              Cluster #{prodAnalysisResult.unsupervisedFindings?.clusterAssignment || "—"}
                            </Badge>
                          </div>
                          
                          {prodAnalysisResult.unsupervisedFindings?.algorithmScores && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium flex items-center gap-2">
                                <Network className="h-4 w-4 text-purple-500" />
                                5-Algorithm Comparison
                              </p>
                              <div className="h-48 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <RadarChart
                                    data={[
                                      { algorithm: 'Isolation Forest', score: prodAnalysisResult.unsupervisedFindings.algorithmScores.isolationForest * 100, fullMark: 100 },
                                      { algorithm: 'LOF', score: prodAnalysisResult.unsupervisedFindings.algorithmScores.lof * 100, fullMark: 100 },
                                      { algorithm: 'DBSCAN', score: prodAnalysisResult.unsupervisedFindings.algorithmScores.dbscan * 100, fullMark: 100 },
                                      { algorithm: 'Autoencoder', score: prodAnalysisResult.unsupervisedFindings.algorithmScores.autoencoder * 100, fullMark: 100 },
                                      { algorithm: 'Deep Learning', score: prodAnalysisResult.unsupervisedFindings.algorithmScores.deepLearning * 100, fullMark: 100 },
                                    ]}
                                  >
                                    <PolarGrid stroke="#888" strokeOpacity={0.3} />
                                    <PolarAngleAxis 
                                      dataKey="algorithm" 
                                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                                    />
                                    <PolarRadiusAxis 
                                      angle={90} 
                                      domain={[0, 100]} 
                                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }}
                                    />
                                    <Radar
                                      name="Risk Score"
                                      dataKey="score"
                                      stroke="#8b5cf6"
                                      fill="#8b5cf6"
                                      fillOpacity={0.4}
                                    />
                                  </RadarChart>
                                </ResponsiveContainer>
                              </div>
                              <div className="grid grid-cols-5 gap-1 text-center">
                                <div className="p-1">
                                  <p className="text-xs text-muted-foreground">IF</p>
                                  <p className="text-sm font-bold text-purple-600">{(prodAnalysisResult.unsupervisedFindings.algorithmScores.isolationForest * 100).toFixed(0)}%</p>
                                </div>
                                <div className="p-1">
                                  <p className="text-xs text-muted-foreground">LOF</p>
                                  <p className="text-sm font-bold text-purple-600">{(prodAnalysisResult.unsupervisedFindings.algorithmScores.lof * 100).toFixed(0)}%</p>
                                </div>
                                <div className="p-1">
                                  <p className="text-xs text-muted-foreground">DBSCAN</p>
                                  <p className="text-sm font-bold text-purple-600">{(prodAnalysisResult.unsupervisedFindings.algorithmScores.dbscan * 100).toFixed(0)}%</p>
                                </div>
                                <div className="p-1">
                                  <p className="text-xs text-muted-foreground">AE</p>
                                  <p className="text-sm font-bold text-purple-600">{(prodAnalysisResult.unsupervisedFindings.algorithmScores.autoencoder * 100).toFixed(0)}%</p>
                                </div>
                                <div className="p-1">
                                  <p className="text-xs text-muted-foreground">DL</p>
                                  <p className="text-sm font-bold text-purple-600">{(prodAnalysisResult.unsupervisedFindings.algorithmScores.deepLearning * 100).toFixed(0)}%</p>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {prodAnalysisResult.unsupervisedFindings?.outlierReason?.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium flex items-center gap-1">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                Anomaly Indicators
                              </p>
                              {prodAnalysisResult.unsupervisedFindings.outlierReason.map((reason: string, idx: number) => (
                                <p key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                  {reason}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="rag" className="mt-4">
                      <ScrollArea className="h-64">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-sm font-medium">
                              RAG/LLM Score: {prodAnalysisResult.ragLlmScore.toFixed(1)}
                            </p>
                            {prodAnalysisResult.ragLlmFindings?.confidence !== undefined && (
                              <Badge variant="outline">
                                Confidence: {(prodAnalysisResult.ragLlmFindings.confidence * 100).toFixed(0)}%
                              </Badge>
                            )}
                          </div>
                          
                          {prodAnalysisResult.ragLlmFindings?.contextualAnalysis && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Contextual Analysis</p>
                              <p className="text-sm text-muted-foreground border p-2 rounded">
                                {prodAnalysisResult.ragLlmFindings.contextualAnalysis}
                              </p>
                            </div>
                          )}
                          
                          {prodAnalysisResult.ragLlmFindings?.knowledgeBaseMatches?.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Knowledge Base Matches</p>
                              {prodAnalysisResult.ragLlmFindings.knowledgeBaseMatches.map((match: any, idx: number) => (
                                <div key={idx} className="p-2 border rounded text-sm">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <span className="font-medium">{match.title}</span>
                                    <Badge variant="outline">{(match.relevance * 100).toFixed(0)}%</Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">Source: {match.source}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {prodAnalysisResult.ragLlmFindings?.recommendation && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">AI Recommendation</p>
                              <p className="text-sm text-muted-foreground border p-2 rounded">
                                {prodAnalysisResult.ragLlmFindings.recommendation}
                              </p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="semantic" className="mt-4">
                      <ScrollArea className="h-64">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <p className="text-sm font-medium">
                              Semantic Validation Score: {(prodAnalysisResult.semanticScore ?? 0).toFixed(1)}
                            </p>
                            <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">
                              ICD-10/CPT Match
                            </Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <p className="text-sm font-medium flex items-center gap-1">
                              <FileSearch className="h-4 w-4 text-cyan-500" />
                              Procedure-Diagnosis Validation
                            </p>
                            <p className="text-sm text-muted-foreground border p-2 rounded">
                              {prodAnalysisResult.semanticFindings?.analysis || "Semantic validation compares procedure codes against diagnosis codes using vector embeddings to ensure clinical appropriateness."}
                            </p>
                          </div>
                          
                          {prodAnalysisResult.semanticFindings?.matchResults?.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Semantic Match Results</p>
                              {prodAnalysisResult.semanticFindings.matchResults.map((match: any, idx: number) => (
                                <div key={idx} className="p-2 border rounded text-sm">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <span className="text-muted-foreground">{match.procedure} ↔ {match.diagnosis}</span>
                                    <Badge variant={match.similarity >= 0.7 ? "secondary" : match.similarity >= 0.5 ? "outline" : "destructive"}>
                                      {(match.similarity * 100).toFixed(0)}% match
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {prodAnalysisResult.semanticFindings?.riskAssessment && (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Risk Assessment</p>
                              <p className="text-sm text-muted-foreground border p-2 rounded">
                                {prodAnalysisResult.semanticFindings.riskAssessment}
                              </p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Batch Production Analysis
                  </CardTitle>
                  <CardDescription>
                    Run detection on random sample of imported claims
                  </CardDescription>
                </div>
                <Button
                  onClick={() => batchProdAnalyzeMutation.mutate(10)}
                  disabled={batchProdAnalyzeMutation.isPending}
                  data-testid="button-batch-prod-analyze"
                >
                  {batchProdAnalyzeMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Analyze 10 Random Claims
                    </>
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                {detectionRuns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                    <BarChart3 className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No detection runs yet</p>
                    <p className="text-xs">Run a batch analysis to see results</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Run Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Claims</TableHead>
                        <TableHead className="text-center">Flagged</TableHead>
                        <TableHead className="text-center">Avg Score</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detectionRuns.slice(0, 5).map((run: any) => (
                        <TableRow key={run.id}>
                          <TableCell className="font-medium">{run.runName}</TableCell>
                          <TableCell>{getStatusBadge(run.status)}</TableCell>
                          <TableCell className="text-center">{run.totalClaims || 0}</TableCell>
                          <TableCell className="text-center">
                            <span className={run.flaggedClaims > 0 ? "text-red-600 font-medium" : ""}>
                              {run.flaggedClaims || 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">{run.avgCompositeScore ? parseFloat(String(run.avgCompositeScore)).toFixed(1) : "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {run.processingTimeMs ? `${(run.processingTimeMs / 1000).toFixed(1)}s` : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>

      {/* AI Field Mapping Dialog - preserves mappings until explicit reset or successful upload */}
      <Dialog open={showMappingDialog} onOpenChange={(open) => {
        setShowMappingDialog(open);
        // Only clear mappingResult dialog state, preserve confirmedMappings for upload
        if (!open) {
          setMappingResult(null);
          // Don't clear confirmedMappings - they are used by handleUpload
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-ai-field-mapping">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI Field Mapping
            </DialogTitle>
            <DialogDescription>
              AI has analyzed your file columns and suggested mappings to the FWA detection schema. 
              Please review and confirm the mappings below, especially those with low confidence.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {mappingResult && (
              <>
                {/* Overall confidence */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg" data-testid="mapping-overall-confidence">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Overall Mapping Confidence</span>
                  </div>
                  <Badge 
                    variant={mappingResult.overallConfidence >= 80 ? "default" : 
                              mappingResult.overallConfidence >= 60 ? "secondary" : "destructive"}
                    data-testid="badge-overall-confidence"
                  >
                    {mappingResult.overallConfidence}%
                  </Badge>
                </div>

                {/* Warnings */}
                {mappingResult.warnings?.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-lg" data-testid="mapping-warnings">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                      <div className="text-sm text-amber-700 dark:text-amber-400">
                        <p className="font-medium mb-1">Warnings:</p>
                        <ul className="list-disc ml-4 space-y-0.5">
                          {mappingResult.warnings.map((w: string, i: number) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Mapping table */}
                <div className="border rounded-lg overflow-hidden" data-testid="mapping-table">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Schema Field</TableHead>
                        <TableHead>Required</TableHead>
                        <TableHead>Mapped Column</TableHead>
                        <TableHead className="text-center">Confidence</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappingResult.mappings?.map((mapping: any) => (
                        <TableRow 
                          key={mapping.schemaField}
                          className={mapping.needsConfirmation ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}
                          data-testid={`mapping-row-${mapping.schemaField}`}
                        >
                          <TableCell className="font-medium">{mapping.schemaField}</TableCell>
                          <TableCell>
                            {mapping.required ? (
                              <Badge variant="destructive" className="text-xs">Required</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Optional</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={confirmedMappings[mapping.schemaField] || mapping.sourceColumn || "__none__"}
                              onValueChange={(value) => handleConfirmMapping(mapping.schemaField, value === "__none__" ? "" : value)}
                            >
                              <SelectTrigger className="w-48" data-testid={`select-mapping-${mapping.schemaField}`}>
                                <SelectValue placeholder="Select column..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">
                                  <span className="text-muted-foreground">(No mapping)</span>
                                </SelectItem>
                                {parsedFileData.columns.map((col) => (
                                  <SelectItem key={col} value={col}>{col}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={
                                mapping.confidence >= 80 ? "default" :
                                mapping.confidence >= 60 ? "secondary" :
                                mapping.confidence >= 40 ? "outline" : "destructive"
                              }
                              data-testid={`badge-confidence-${mapping.schemaField}`}
                            >
                              {mapping.confidence}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                            {mapping.reason}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Unmapped columns */}
                {mappingResult.unmappedColumns?.length > 0 && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm font-medium mb-2">Unmapped File Columns:</p>
                    <div className="flex flex-wrap gap-2">
                      {mappingResult.unmappedColumns.map((col: string) => (
                        <Badge key={col} variant="outline" className="text-xs">{col}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Data preview */}
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm font-medium mb-2">Sample Data Preview:</p>
                  <ScrollArea className="h-32">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(parsedFileData.data.slice(0, 2), null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowMappingDialog(false)}
              data-testid="button-cancel-mapping"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast({
                  title: "Mapping Confirmed",
                  description: "Field mappings saved. You can now proceed with batch upload.",
                });
                setShowMappingDialog(false);
              }}
              data-testid="button-confirm-mapping"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Mappings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
