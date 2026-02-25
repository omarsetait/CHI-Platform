import { useState, useMemo, useRef } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  DollarSign,
  Clock,
  FileText,
  TrendingUp,
  TrendingDown,
  Shield,
  CheckCircle2,
  XCircle,
  Calendar,
  Activity,
  Stethoscope,
  Building2,
  Download,
  Printer,
  Plus,
  AlertCircle,
  Pill,
  FlaskConical,
  Copy,
  FileWarning,
  Ban,
  Layers,
  Brain,
  BarChart3,
  Users,
} from "lucide-react";
import { AIScoreBadge } from "@/components/ai-score-badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import { generateReportData, generateCSVReport, downloadReport, ClaimData, ProviderData } from "@/lib/report-generator";
import { useToast } from "@/hooks/use-toast";

interface ReconInsight {
  id: string;
  category: "pre-auth" | "claims" | "audit";
  subcategory: "technical" | "medical" | "ml-flag";
  severity: "high" | "medium" | "low";
  engineCode: string;
  title: string;
  description: string;
  metric: string;
  benchmark: string;
  variance: string;
  recommendation: string;
  primaryClaimIds: string[];
  additionalClaimIds: string[];
  icon: any;
}

interface ApiClaim {
  id: string;
  claimNumber: string;
  patientName: string;
  patientId: string;
  patientGender?: string;
  patientAge?: number;
  providerName: string;
  providerId: string;
  hospital: string;
  hospitalName: string;
  amount: number;
  outlierScore: number;
  registrationDate: string;
  claimType: string;
  lengthOfStay: number;
  engineViolations?: Array<{ type: string; code: string; details: string }>;
}

interface ApiProvider {
  id: string;
  providerName?: string;
  name?: string;
  specialty?: string;
  organization?: string;
  hospital?: string;
  riskScore: string;
  totalClaims: number;
  flaggedClaims: number;
  reasons?: string[];
}

export default function Reconciliation() {
  const params = useParams();
  const hospitalId = params.hospitalId || "default-hospital";
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());
  const [loadedAdditional, setLoadedAdditional] = useState<Set<string>>(new Set());
  const [selectedClaims, setSelectedClaims] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [cpmModalOpen, setCpmModalOpen] = useState(false);
  const [selectedProviderCPM, setSelectedProviderCPM] = useState<any>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const { data: allClaims = [], isLoading: isLoadingClaims } = useQuery<ApiClaim[]>({
    queryKey: ["/api/demo/claims"],
  });

  const { data: allProviders = [], isLoading: isLoadingProviders } = useQuery<ApiProvider[]>({
    queryKey: ["/api/demo/providers"],
  });

  const isLoading = isLoadingClaims || isLoadingProviders;

  const hospitalData = useMemo(() => {
    const hospitalMap = new Map<string, { name: string; claims: number; amount: number; outliers: number }>();
    
    allClaims.forEach((claim) => {
      const hospitalName = claim.hospitalName || claim.hospital || "Unknown Hospital";
      const existing = hospitalMap.get(hospitalName) || { name: hospitalName, claims: 0, amount: 0, outliers: 0 };
      existing.claims += 1;
      existing.amount += claim.amount;
      if (claim.outlierScore >= 0.5) {
        existing.outliers += 1;
      }
      hospitalMap.set(hospitalName, existing);
    });

    return Array.from(hospitalMap.values()).map(h => ({
      ...h,
      outlierRate: h.claims > 0 ? h.outliers / h.claims : 0,
    }));
  }, [allClaims]);

  const hospital = useMemo(() => {
    const normalizedId = hospitalId.toLowerCase().replace(/-/g, " ");
    const found = hospitalData.find(
      (h) => h.name.toLowerCase().includes(normalizedId.split(" ")[0])
    );
    return found || hospitalData[0] || { name: "Unknown Hospital", claims: 0, amount: 0, outlierRate: 0 };
  }, [hospitalId, hospitalData]);

  const hospitalClaims = useMemo(() => {
    if (!hospital?.name) return allClaims;
    return allClaims.filter((c) => {
      const claimHospital = c.hospitalName || c.hospital || "";
      return claimHospital.toLowerCase().includes(hospital.name.toLowerCase().split(" ")[0]);
    });
  }, [allClaims, hospital]);

  const hospitalProviders = useMemo(() => {
    return allProviders.map(p => ({
      id: p.id,
      name: p.providerName || p.name || "Unknown",
      specialty: p.specialty || "General",
      hospital: p.organization || p.hospital || "N/A",
      aiScore: parseFloat(p.riskScore) / 100 || 0,
      mlFlags: p.reasons?.map(r => ({ feature: r, value: "Flagged", benchmark: "N/A" })) || [],
    })).filter((p) => {
      if (!hospital?.name) return true;
      return p.hospital.toLowerCase().includes(hospital.name.toLowerCase().split(" ")[0]);
    });
  }, [allProviders, hospital]);

  const transformedProviders = useMemo(() => {
    return allProviders.map(p => ({
      id: p.id,
      name: p.providerName || p.name || "Unknown",
      specialty: p.specialty || "General",
      hospital: p.organization || p.hospital || "N/A",
      aiScore: parseFloat(p.riskScore) / 100 || 0,
      mlFlags: p.reasons?.map(r => ({ feature: r, value: "Flagged", benchmark: "N/A" })) || [],
    }));
  }, [allProviders]);

  const getProviderDetails = (providerId: string) => {
    const provider = transformedProviders.find((p) => p.id === providerId);
    if (!provider) return null;
    const providerClaims = hospitalClaims.filter(c => c.providerId === providerId);
    const totalAmount = providerClaims.reduce((sum, c) => sum + c.amount, 0);
    const avgAmount = providerClaims.length > 0 ? totalAmount / providerClaims.length : 0;
    return {
      ...provider,
      claimCount: providerClaims.length,
      totalAmount,
      avgAmount,
      outlierCount: providerClaims.filter(c => c.outlierScore >= 0.5).length,
    };
  };

  const getPeerProviders = (providerId: string) => {
    const provider = transformedProviders.find((p) => p.id === providerId);
    if (!provider) return [];
    return transformedProviders
      .filter((p) => p.id !== providerId && p.specialty === provider.specialty)
      .slice(0, 5);
  };

  const openCPMAnalysis = (providerId: string) => {
    const providerDetails = getProviderDetails(providerId);
    if (providerDetails) {
      setSelectedProviderCPM(providerDetails);
      setCpmModalOpen(true);
    }
  };

  const insights: ReconInsight[] = useMemo(() => {
    const billingErrorClaims = hospitalClaims.filter((c) =>
      c.engineViolations?.some((v) => v.type === "billing_error")
    );
    const duplicateClaims = hospitalClaims.filter((c) =>
      c.engineViolations?.some((v) => v.type === "duplicate_claim")
    );
    const genderViolationClaims = hospitalClaims.filter((c) =>
      c.engineViolations?.some((v) => v.type === "gender_violation")
    );
    const labRetestClaims = hospitalClaims.filter((c) =>
      c.engineViolations?.some((v) => v.type === "lab_retest_period")
    );
    const unbundlingClaims = hospitalClaims.filter((c) =>
      c.engineViolations?.some((v) => v.type === "unbundling")
    );
    const bundlingClaims = hospitalClaims.filter((c) =>
      c.engineViolations?.some((v) => v.type === "bundling")
    );
    const drugInteractionClaims = hospitalClaims.filter((c) =>
      c.engineViolations?.some((v) => v.type === "drug_interaction")
    );
    const clinicalClaims = hospitalClaims.filter((c) =>
      c.engineViolations?.some((v) => v.type === "clinical_appropriateness")
    );
    const preauthMismatchClaims = hospitalClaims.filter((c) =>
      c.engineViolations?.some((v) => v.type === "preauth_mismatch" || v.type === "preauth_expired")
    );
    const highCostClaims = hospitalClaims.filter((c) => c.outlierScore >= 0.7);
    const longStayClaims = hospitalClaims.filter((c) => c.lengthOfStay > 14);

    // NEW FWA Pattern Filters - Pre-Auth
    const autoApprovalExpiryClaims = hospitalClaims.filter((c) =>
      c.engineViolations?.some((v) => v.type === "auto_approval_near_expiry")
    );
    const suspectedUncoveredClaims = hospitalClaims.filter((c) =>
      c.engineViolations?.some((v) => v.type === "suspected_uncovered_diagnosis")
    );
    const inpatientUnbundlingClaims = hospitalClaims.filter((c) =>
      c.engineViolations?.some((v) => v.type === "inpatient_unbundling")
    );
    const unlistedCodeClaims = hospitalClaims.filter((c) =>
      c.engineViolations?.some((v) => v.type === "unlisted_code_rejection")
    );
    const preopPanelClaims = hospitalClaims.filter((c) =>
      c.engineViolations?.some((v) => v.type === "preop_panel_unbundling")
    );
    const approvalExceededClaims = hospitalClaims.filter((c) =>
      c.engineViolations?.some((v) => v.type === "approval_exceeded")
    );

    // NEW FWA Pattern Filters - AI Audit
    const multipleProcedureFraudClaims = hospitalClaims.filter((c) =>
      c.engineViolations?.some((v) => v.type === "multiple_procedure_fraud")
    );
    const contractualViolationClaims = hospitalClaims.filter((c) =>
      c.engineViolations?.some((v) => v.type === "contractual_violation")
    );
    const impossibleTimelineClaims = hospitalClaims.filter((c) =>
      c.engineViolations?.some((v) => v.type === "impossible_timeline")
    );
    const credentialFraudClaims = hospitalClaims.filter((c) =>
      c.engineViolations?.some((v) => v.type === "credential_fraud")
    );
    const adverseSelectionClaims = hospitalClaims.filter((c) =>
      c.engineViolations?.some((v) => v.type === "adverse_selection")
    );

    const additionalGenderViolations = allClaims
      .filter((c) => c.engineViolations?.some((v) => v.type === "gender_violation") && !hospitalClaims.includes(c))
      .map((c) => c.id);
    const additionalLabRetest = allClaims
      .filter((c) => c.engineViolations?.some((v) => v.type === "lab_retest_period") && !hospitalClaims.includes(c))
      .map((c) => c.id);
    const additionalUnbundling = allClaims
      .filter((c) => c.engineViolations?.some((v) => v.type === "unbundling") && !hospitalClaims.includes(c))
      .map((c) => c.id);
    const additionalDrugInteraction = allClaims
      .filter((c) => c.engineViolations?.some((v) => v.type === "drug_interaction") && !hospitalClaims.includes(c))
      .map((c) => c.id);
    const additionalHighCost = allClaims
      .filter((c) => c.outlierScore >= 0.7 && !hospitalClaims.includes(c))
      .map((c) => c.id);
    // Additional claims for new FWA patterns
    const additionalAutoApproval = allClaims
      .filter((c) => c.engineViolations?.some((v) => v.type === "auto_approval_near_expiry") && !hospitalClaims.includes(c))
      .map((c) => c.id);
    const additionalSuspectedUncovered = allClaims
      .filter((c) => c.engineViolations?.some((v) => v.type === "suspected_uncovered_diagnosis") && !hospitalClaims.includes(c))
      .map((c) => c.id);
    const additionalPreopPanel = allClaims
      .filter((c) => c.engineViolations?.some((v) => v.type === "preop_panel_unbundling") && !hospitalClaims.includes(c))
      .map((c) => c.id);
    const additionalMultipleProcedure = allClaims
      .filter((c) => c.engineViolations?.some((v) => v.type === "multiple_procedure_fraud") && !hospitalClaims.includes(c))
      .map((c) => c.id);

    const result: ReconInsight[] = [];

    if (genderViolationClaims.length > 0) {
      result.push({
        id: "gender-violation",
        category: "claims",
        subcategory: "technical",
        severity: "high",
        engineCode: "GND-001",
        title: "Gender-Diagnosis Mismatch",
        description: `${genderViolationClaims.length} claims have diagnosis codes inconsistent with patient gender. These require clinical documentation for validation.`,
        metric: `${genderViolationClaims.length} violations`,
        benchmark: "0 expected",
        variance: "Hard reject pending documentation",
        recommendation: "Request clinical documentation confirming diagnosis. Male breast cancer (ICD C50) is valid but rare (<1% of cases). Prostate/ovarian conditions must match patient gender.",
        primaryClaimIds: genderViolationClaims.map((c) => c.id),
        additionalClaimIds: additionalGenderViolations,
        icon: AlertCircle,
      });
    }

    if (labRetestClaims.length > 0) {
      result.push({
        id: "lab-retest",
        category: "claims",
        subcategory: "technical",
        severity: "medium",
        engineCode: "LAB-001",
        title: "Lab Retest Period Violations",
        description: `${labRetestClaims.length} claims contain lab tests ordered before minimum retest intervals (e.g., HbA1c every 90 days, Lipid Panel every 180 days).`,
        metric: `${labRetestClaims.length} early retests`,
        benchmark: "Per clinical guidelines",
        variance: "Soft reject - documentation required",
        recommendation: "Review if early retesting was clinically justified (e.g., medication changes, acute illness). Reject duplicates without justification.",
        primaryClaimIds: labRetestClaims.map((c) => c.id),
        additionalClaimIds: additionalLabRetest,
        icon: FlaskConical,
      });
    }

    if (unbundlingClaims.length > 0) {
      result.push({
        id: "unbundling",
        category: "claims",
        subcategory: "technical",
        severity: "high",
        engineCode: "UNB-001",
        title: "Unbundling Detected",
        description: `${unbundlingClaims.length} claims show separate billing for procedures that should be billed as comprehensive/bundled codes.`,
        metric: `${unbundlingClaims.length} unbundled claims`,
        benchmark: "0 unbundling expected",
        variance: "Potential overbilling",
        recommendation: "Request corrected billing with proper bundled procedure codes. Compare to CCI/NCCI edits for correct bundling requirements.",
        primaryClaimIds: unbundlingClaims.map((c) => c.id),
        additionalClaimIds: additionalUnbundling,
        icon: Layers,
      });
    }

    if (bundlingClaims.length > 0) {
      result.push({
        id: "bundling",
        category: "claims",
        subcategory: "technical",
        severity: "medium",
        engineCode: "BUN-001",
        title: "Services Require Bundling",
        description: `${bundlingClaims.length} claims have services billed separately that should be combined into package codes.`,
        metric: `${bundlingClaims.length} bundling issues`,
        benchmark: "Per CCI edits",
        variance: "Billing correction needed",
        recommendation: "Request rebilling with appropriate bundled codes per NCCI/CCI guidelines.",
        primaryClaimIds: bundlingClaims.map((c) => c.id),
        additionalClaimIds: [],
        icon: Copy,
      });
    }

    if (preauthMismatchClaims.length > 0) {
      result.push({
        id: "preauth-issues",
        category: "pre-auth",
        subcategory: "technical",
        severity: "high",
        engineCode: "PAM-001",
        title: "Pre-Authorization Discrepancies",
        description: `${preauthMismatchClaims.length} claims exceed approved pre-authorization amounts or were performed after authorization expiry.`,
        metric: `${preauthMismatchClaims.length} PA issues`,
        benchmark: "100% PA compliance",
        variance: "Authorization gap identified",
        recommendation: "Request retroactive authorization or deny excess charges. For expired PAs, verify if extension was requested.",
        primaryClaimIds: preauthMismatchClaims.map((c) => c.id),
        additionalClaimIds: [],
        icon: Shield,
      });
    }

    if (duplicateClaims.length > 0) {
      result.push({
        id: "duplicates",
        category: "claims",
        subcategory: "technical",
        severity: "high",
        engineCode: "DUP-001",
        title: "Duplicate Claims Detected",
        description: `${duplicateClaims.length} potential duplicate services identified based on same patient, date, and procedure codes.`,
        metric: `${duplicateClaims.length} duplicates`,
        benchmark: "0 expected",
        variance: "Hard reject if confirmed",
        recommendation: "Verify if services are true duplicates or separate medically necessary encounters. Reject confirmed duplicate billing.",
        primaryClaimIds: duplicateClaims.map((c) => c.id),
        additionalClaimIds: [],
        icon: Copy,
      });
    }

    if (billingErrorClaims.length > 0) {
      result.push({
        id: "billing-errors",
        category: "claims",
        subcategory: "technical",
        severity: "high",
        engineCode: "BIL-001",
        title: "Billing Code Errors",
        description: `${billingErrorClaims.length} claims have invalid procedure codes, missing modifiers, or code format errors.`,
        metric: `${billingErrorClaims.length} errors`,
        benchmark: "0 expected",
        variance: "Correction required",
        recommendation: "Return to provider for billing correction. Claims cannot process with invalid codes.",
        primaryClaimIds: billingErrorClaims.map((c) => c.id),
        additionalClaimIds: [],
        icon: Ban,
      });
    }

    if (drugInteractionClaims.length > 0) {
      result.push({
        id: "drug-interactions",
        category: "audit",
        subcategory: "medical",
        severity: "medium",
        engineCode: "DDI-001",
        title: "Drug-Drug Interaction Alerts",
        description: `${drugInteractionClaims.length} claims show potentially harmful medication combinations requiring clinical review.`,
        metric: `${drugInteractionClaims.length} DDI alerts`,
        benchmark: "Documented monitoring",
        variance: "Clinical review required",
        recommendation: "Verify appropriate monitoring is documented for known interactions (e.g., INR for Warfarin+Aspirin). Flag NSAID use in cardiac/renal patients.",
        primaryClaimIds: drugInteractionClaims.map((c) => c.id),
        additionalClaimIds: additionalDrugInteraction,
        icon: Pill,
      });
    }

    if (clinicalClaims.length > 0) {
      result.push({
        id: "clinical-appropriateness",
        category: "audit",
        subcategory: "medical",
        severity: "medium",
        engineCode: "CLI-001",
        title: "Clinical Appropriateness Review",
        description: `${clinicalClaims.length} claims require medical review for treatment patterns, polypharmacy, or extended care duration.`,
        metric: `${clinicalClaims.length} for review`,
        benchmark: "Per clinical guidelines",
        variance: "Medical director review",
        recommendation: "Route to medical director for appropriateness review. Request clinical notes, MDT documentation, or treatment rationale.",
        primaryClaimIds: clinicalClaims.map((c) => c.id),
        additionalClaimIds: [],
        icon: Stethoscope,
      });
    }

    if (highCostClaims.length > 0) {
      result.push({
        id: "high-cost-outliers",
        category: "audit",
        subcategory: "ml-flag",
        severity: "high",
        engineCode: "COST-ML",
        title: "AI-Flagged High Cost Outliers",
        description: `${highCostClaims.length} claims flagged by ML model with outlier scores >= 0.70, indicating costs significantly above DRG benchmarks.`,
        metric: `${highCostClaims.length} flagged claims`,
        benchmark: "<2% expected",
        variance: `${((highCostClaims.length / Math.max(hospitalClaims.length, 1)) * 100).toFixed(1)}% flagged`,
        recommendation: "Priority review for itemized billing, procedure appropriateness, and comparison to similar cases. Cross-reference with provider patterns.",
        primaryClaimIds: highCostClaims.map((c) => c.id),
        additionalClaimIds: additionalHighCost,
        icon: Brain,
      });
    }

    if (longStayClaims.length > 0) {
      result.push({
        id: "extended-los",
        category: "audit",
        subcategory: "ml-flag",
        severity: "medium",
        engineCode: "LOS-ML",
        title: "Extended Length of Stay",
        description: `${longStayClaims.length} admissions exceed 14 days, flagged for medical necessity review against DRG benchmarks.`,
        metric: `Avg ${(longStayClaims.reduce((sum, c) => sum + c.lengthOfStay, 0) / Math.max(longStayClaims.length, 1)).toFixed(1)} days`,
        benchmark: "5-7 days typical",
        variance: "+185% above expected",
        recommendation: "Request daily clinical notes justifying continued inpatient status. Compare to similar DRG patterns.",
        primaryClaimIds: longStayClaims.map((c) => c.id),
        additionalClaimIds: [],
        icon: Clock,
      });
    }

    // ===== NEW FWA INSIGHTS - Pre-Auth Category =====

    // 1. Auto-Approval Near Policy Expiry (75%+ dental/optical)
    if (autoApprovalExpiryClaims.length > 0) {
      result.push({
        id: "auto-approval-expiry",
        category: "pre-auth",
        subcategory: "technical",
        severity: "high",
        engineCode: "AAE-001",
        title: "Auto-Approval Fraud Near Policy Expiry",
        description: `${autoApprovalExpiryClaims.length} dental/optical pre-auth requests auto-approved within 30 days of policy expiry. Pattern suggests gaming of auto-approval system.`,
        metric: `${autoApprovalExpiryClaims.length} suspicious approvals`,
        benchmark: "<25% near expiry expected",
        variance: "75%+ near expiry detected",
        recommendation: "Implement manual review queue for dental/optical requests in final 30 days of policy. Flag providers with >50% end-of-term requests for audit.",
        primaryClaimIds: autoApprovalExpiryClaims.map((c) => c.id),
        additionalClaimIds: additionalAutoApproval,
        icon: Calendar,
      });
    }

    // 2. Suspected Uncovered Diagnosis Masking (acne, infertility, work injury)
    if (suspectedUncoveredClaims.length > 0) {
      result.push({
        id: "suspected-uncovered",
        category: "pre-auth",
        subcategory: "technical",
        severity: "high",
        engineCode: "SUD-001",
        title: "Suspected Uncovered Diagnosis Masking",
        description: `${suspectedUncoveredClaims.length} pre-auth requests with diagnosis codes that may mask excluded conditions: cosmetic (acne), infertility, or work-related injuries.`,
        metric: `${suspectedUncoveredClaims.length} masked diagnoses`,
        benchmark: "0 expected",
        variance: "Policy exclusion bypass detected",
        recommendation: "Request detailed clinical notes, photographs, incident reports. Cross-reference with treatment patterns. Deny if excluded condition confirmed (acne=cosmetic, infertility=N97, work injury=WICA).",
        primaryClaimIds: suspectedUncoveredClaims.map((c) => c.id),
        additionalClaimIds: additionalSuspectedUncovered,
        icon: FileWarning,
      });
    }

    // 3. Inpatient Package Unbundling
    if (inpatientUnbundlingClaims.length > 0) {
      result.push({
        id: "inpatient-unbundling",
        category: "pre-auth",
        subcategory: "technical",
        severity: "high",
        engineCode: "IPU-001",
        title: "Inpatient Package Unbundling",
        description: `${inpatientUnbundlingClaims.length} inpatient pre-auth requests include package codes PLUS separately itemized services. Packages are all-inclusive by definition.`,
        metric: `${inpatientUnbundlingClaims.length} package violations`,
        benchmark: "Package = all-inclusive",
        variance: "Double billing detected",
        recommendation: "Reject separate itemization when package code is present. Approve package rate only. Escalate for fraud review if pattern repeats.",
        primaryClaimIds: inpatientUnbundlingClaims.map((c) => c.id),
        additionalClaimIds: [],
        icon: Layers,
      });
    }

    // 4. Unlisted Code Rejection for Contracted Providers
    if (unlistedCodeClaims.length > 0) {
      result.push({
        id: "unlisted-code-rejection",
        category: "pre-auth",
        subcategory: "technical",
        severity: "high",
        engineCode: "UCR-001",
        title: "Unlisted Code Rejection",
        description: `${unlistedCodeClaims.length} pre-auth requests from contracted providers using unlisted procedure codes. Contracted providers must use designated fee schedule codes.`,
        metric: `${unlistedCodeClaims.length} code violations`,
        benchmark: "0 unlisted codes expected",
        variance: "Contract fee bypass attempt",
        recommendation: "Auto-reject unlisted codes from contracted providers. Request rebilling with specific procedure codes from negotiated fee schedule.",
        primaryClaimIds: unlistedCodeClaims.map((c) => c.id),
        additionalClaimIds: [],
        icon: Ban,
      });
    }

    // 5. Pre-Operative Panel Unbundling (CBC + ECG + PT + PTT)
    if (preopPanelClaims.length > 0) {
      result.push({
        id: "preop-panel-unbundling",
        category: "pre-auth",
        subcategory: "technical",
        severity: "medium",
        engineCode: "PPU-001",
        title: "Pre-Operative Panel Unbundling",
        description: `${preopPanelClaims.length} claims bill pre-op tests (CBC, ECG, PT, PTT, CMP) separately instead of bundled panel rate. Overbilling by 100-150% typical.`,
        metric: `${preopPanelClaims.length} unbundled panels`,
        benchmark: "Bundled panel rate",
        variance: "+111% overbilling avg",
        recommendation: "Apply pre-operative panel bundled rate. Reject individual test charges. Flag provider for unbundling pattern monitoring.",
        primaryClaimIds: preopPanelClaims.map((c) => c.id),
        additionalClaimIds: additionalPreopPanel,
        icon: FlaskConical,
      });
    }

    // 6. Approval Violations - Claim Exceeds Authorized Amount
    if (approvalExceededClaims.length > 0) {
      result.push({
        id: "approval-exceeded",
        category: "pre-auth",
        subcategory: "technical",
        severity: "high",
        engineCode: "AEX-001",
        title: "Approval Violations - Exceeded Authorization",
        description: `${approvalExceededClaims.length} claims significantly exceed pre-authorized amounts without supplementary approval. Additional services added post-authorization.`,
        metric: `${approvalExceededClaims.length} overruns`,
        benchmark: "+/-10% variance allowed",
        variance: ">50% over authorized",
        recommendation: "Pay up to pre-authorized amount only. Deny excess unless retroactive authorization obtained with clinical justification. Flag for pattern analysis.",
        primaryClaimIds: approvalExceededClaims.map((c) => c.id),
        additionalClaimIds: [],
        icon: AlertTriangle,
      });
    }

    // ===== NEW FWA INSIGHTS - AI Audit Category =====

    // 7. Multiple Procedure Billing Fraud (ENT example)
    if (multipleProcedureFraudClaims.length > 0) {
      result.push({
        id: "multiple-procedure-fraud",
        category: "audit",
        subcategory: "ml-flag",
        severity: "high",
        engineCode: "MPF-001",
        title: "Multiple Procedure Billing Fraud",
        description: `${multipleProcedureFraudClaims.length} claims bill same procedure multiple times under different codes (e.g., ENT fiberoptic, nasopharyngoscopy, sinus endoscopy = same exam).`,
        metric: `${multipleProcedureFraudClaims.length} duplicate procedures`,
        benchmark: "1 code per procedure",
        variance: "3-5x overbilling detected",
        recommendation: "Pay minimum appropriate single-code rate. Reject duplicate billing. Refer to SIU for fraud investigation - intentional code manipulation.",
        primaryClaimIds: multipleProcedureFraudClaims.map((c) => c.id),
        additionalClaimIds: additionalMultipleProcedure,
        icon: Copy,
      });
    }

    // 8. Contractual Violations - Per Diem Billing
    if (contractualViolationClaims.length > 0) {
      result.push({
        id: "contractual-violation",
        category: "audit",
        subcategory: "technical",
        severity: "high",
        engineCode: "CON-001",
        title: "Contractual Violations - Per Diem Breach",
        description: `${contractualViolationClaims.length} claims from per diem contract providers billing individual services. Per diem = flat daily rate, all-inclusive. Itemized billing prohibited.`,
        metric: `${contractualViolationClaims.length} contract breaches`,
        benchmark: "Per diem rate only",
        variance: "117% overbilling avg",
        recommendation: "Apply per diem contract rate. Reject all itemized charges. Escalate for contract compliance review and potential termination.",
        primaryClaimIds: contractualViolationClaims.map((c) => c.id),
        additionalClaimIds: [],
        icon: FileText,
      });
    }

    // 9. Impossible Timeline - Delivery 6 Months Apart
    if (impossibleTimelineClaims.length > 0) {
      result.push({
        id: "impossible-timeline",
        category: "audit",
        subcategory: "ml-flag",
        severity: "high",
        engineCode: "ITL-001",
        title: "Impossible Timeline Fraud",
        description: `${impossibleTimelineClaims.length} claims with biologically impossible timelines detected. Example: Two deliveries 6 months apart (human gestation = 9+ months).`,
        metric: `${impossibleTimelineClaims.length} impossible events`,
        benchmark: "Biologically valid only",
        variance: "Physical impossibility",
        recommendation: "Immediate rejection. Investigate: (1) Patient identity verification, (2) Duplicate billing check, (3) Coding error (twins?), (4) Identity fraud/card sharing. Refer to SIU.",
        primaryClaimIds: impossibleTimelineClaims.map((c) => c.id),
        additionalClaimIds: [],
        icon: AlertCircle,
      });
    }

    // 10. Credential Fraud - Billing Outside Specialty
    if (credentialFraudClaims.length > 0) {
      result.push({
        id: "credential-fraud",
        category: "audit",
        subcategory: "ml-flag",
        severity: "high",
        engineCode: "CRF-001",
        title: "Credential Fraud - Specialty Mismatch",
        description: `${credentialFraudClaims.length} claims where provider bills for services outside their registered specialty. Potential identity theft or unlicensed practice.`,
        metric: `${credentialFraudClaims.length} specialty violations`,
        benchmark: "Specialty match required",
        variance: "Credential mismatch",
        recommendation: "Reject entire claim. Verify provider identity against medical council registration. Cross-reference license with claimed specialty. Report to licensing authority.",
        primaryClaimIds: credentialFraudClaims.map((c) => c.id),
        additionalClaimIds: [],
        icon: Users,
      });
    }

    // 11. Adverse Selection - High-Cost Claim Within 1 Month
    if (adverseSelectionClaims.length > 0) {
      result.push({
        id: "adverse-selection",
        category: "audit",
        subcategory: "ml-flag",
        severity: "high",
        engineCode: "AVS-001",
        title: "Adverse Selection Pattern",
        description: `${adverseSelectionClaims.length} high-cost claims filed within 30 days of policy enrollment. Suggests pre-existing condition fraud - patient knew treatment needed before enrolling.`,
        metric: `${adverseSelectionClaims.length} early high-cost claims`,
        benchmark: "180+ days typical",
        variance: "<30 days enrollment-claim gap",
        recommendation: "Invoke waiting period clause. Request pre-enrollment medical records. Investigate for pre-existing condition. Flag member for SIU review if pattern confirms adverse selection.",
        primaryClaimIds: adverseSelectionClaims.map((c) => c.id),
        additionalClaimIds: [],
        icon: TrendingUp,
      });
    }

    return result;
  }, [hospitalClaims]);

  const filteredInsights = useMemo(() => {
    if (activeCategory === "all") return insights;
    return insights.filter((i) => i.category === activeCategory);
  }, [insights, activeCategory]);

  const toggleInsight = (id: string) => {
    setExpandedInsights((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const loadAdditionalClaims = (insightId: string) => {
    setLoadedAdditional((prev) => {
      const next = new Set(prev);
      next.add(insightId);
      return next;
    });
  };

  const toggleClaimSelection = (claimId: string) => {
    setSelectedClaims((prev) => {
      const next = new Set(prev);
      if (next.has(claimId)) {
        next.delete(claimId);
      } else {
        next.add(claimId);
      }
      return next;
    });
  };

  const selectAllClaimsForInsight = (claimIds: string[]) => {
    setSelectedClaims((prev) => {
      const next = new Set(prev);
      claimIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const getClaimById = (id: string) => allClaims.find((c) => c.id === id);

  const totalClaimsAmount = hospitalClaims.reduce((sum, c) => sum + c.amount, 0);
  const avgClaimAmount = totalClaimsAmount / Math.max(hospitalClaims.length, 1);
  const highRiskCount = hospitalClaims.filter((c) => c.outlierScore >= 0.7).length;
  const technicalViolations = insights.filter((i) => i.subcategory === "technical").length;
  const medicalReviews = insights.filter((i) => i.subcategory === "medical").length;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "pre-auth":
        return <Shield className="h-4 w-4" />;
      case "claims":
        return <FileText className="h-4 w-4" />;
      case "audit":
        return <Activity className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getSubcategoryBadge = (subcategory: string) => {
    switch (subcategory) {
      case "technical":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Technical Validation</Badge>;
      case "medical":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Medical Review</Badge>;
      case "ml-flag":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">ML Model Flag</Badge>;
      default:
        return null;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-chart-2 text-white";
      case "medium":
        return "bg-chart-3 text-foreground";
      case "low":
        return "bg-chart-4 text-white";
      default:
        return "bg-muted";
    }
  };

  const handleExportReport = () => {
    try {
      const claimsForReport: ClaimData[] = allClaims.map(c => ({
        id: c.id,
        claimNumber: c.claimNumber,
        patientName: c.patientName,
        patientGender: c.patientGender || "Unknown",
        patientAge: c.patientAge || 0,
        providerName: c.providerName,
        registrationDate: c.registrationDate,
        amount: c.amount,
        outlierScore: c.outlierScore,
        icdDescription: "",
        claimType: c.claimType,
        lengthOfStay: c.lengthOfStay,
        hospitalName: c.hospitalName,
        hospital: c.hospital,
        engineViolations: c.engineViolations,
      }));
      
      const providersForReport: ProviderData[] = transformedProviders.map(p => ({
        id: p.id,
        name: p.name,
        specialty: p.specialty,
        hospital: p.hospital,
        aiScore: p.aiScore,
        mlFlags: p.mlFlags?.map((f: any) => ({
          feature: f.feature,
          importance: f.importance || 0,
          value: f.value,
          benchmark: f.benchmark,
          interpretation: f.interpretation || "",
        })) || [],
      }));
      
      const reportData = generateReportData(hospital, insights, selectedClaims, claimsForReport, providersForReport);
      
      if (!reportData || !reportData.insights) {
        throw new Error("Failed to generate report data");
      }
      
      // Check if any claims were included
      const totalClaims = reportData.insights.reduce((sum, insight) => sum + insight.claims.length, 0);
      
      if (selectedClaims.size > 0 && totalClaims === 0) {
        toast({
          title: "Export Warning",
          description: "Selected claims could not be mapped to report data. Please try selecting different claims.",
          variant: "destructive",
        });
        return;
      }
      
      const csvContent = generateCSVReport(reportData);
      
      if (!csvContent) {
        throw new Error("Failed to generate CSV content");
      }
      
      const filename = `FWA_Reconciliation_Report_${hospital.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
      downloadReport(filename, csvContent, "csv");
      
      toast({
        title: "Report Exported Successfully",
        description: `Comprehensive report with ${reportData.insights.length} insights, ${totalClaims} claims, and ${reportData.providers.length} providers downloaded.`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: "There was an error generating the report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePrintSummary = () => {
    toast({
      title: "Preparing Print Preview",
      description: "Opening print dialog for the reconciliation summary...",
    });
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const selectedCount = selectedClaims.size;

  const peerProviders = selectedProviderCPM ? getPeerProviders(selectedProviderCPM.id) : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-6" />
              <Skeleton className="h-8 w-64" />
            </div>
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
        </div>
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (allClaims.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold" data-testid="text-page-title">
                Provider Reconciliation
              </h1>
            </div>
          </div>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Claims Data Available</h3>
            <p className="text-muted-foreground">There are no claims in the system to reconcile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" ref={reportRef}>
      <div className="hidden print:block print:mb-6">
        <h1 className="text-2xl font-bold">Provider Reconciliation Report</h1>
        <p className="text-muted-foreground">{hospital.name}</p>
        <p className="text-sm text-muted-foreground">Report Date: {new Date().toLocaleDateString()}</p>
      </div>
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold" data-testid="text-page-title">
                Provider Reconciliation
              </h1>
            </div>
            <p className="text-muted-foreground mt-1">{hospital.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <Badge className="mr-2">{selectedCount} claims selected</Badge>
          )}
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportReport} data-testid="button-export">
            <Download className="h-4 w-4" />
            Export Report {selectedCount > 0 && `(${selectedCount})`}
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handlePrintSummary} data-testid="button-print">
            <Printer className="h-4 w-4" />
            Print Summary
          </Button>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium">Monthly Reconciliation Review</p>
              <p className="text-sm text-muted-foreground mt-1">
                This report consolidates pre-authorization, claims validation, and audit findings from our FWA detection engine. 
                Click each insight to see supporting claims. Use "Load More" to include additional claims with the same issue pattern for comprehensive reporting.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Claims</span>
            </div>
            <p className="text-2xl font-bold mt-1">{hospitalClaims.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Amount</span>
            </div>
            <p className="text-2xl font-bold mt-1">${(totalClaimsAmount / 1000).toFixed(0)}K</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileWarning className="h-4 w-4 text-chart-2" />
              <span className="text-sm text-muted-foreground">Technical Issues</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-chart-2">{technicalViolations}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-chart-3" />
              <span className="text-sm text-muted-foreground">Medical Reviews</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-chart-3">{medicalReviews}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">AI Flags</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-primary">{highRiskCount}</p>
          </CardContent>
        </Card>
      </div>

      {hospitalProviders.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              Associated Providers - Risk Analysis
              <Badge variant="outline" className="ml-2 text-xs print:hidden">Click for Details</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hospitalProviders.map((provider) => {
                const providerClaims = hospitalClaims.filter(c => c.providerId === provider.id);
                const totalAmount = providerClaims.reduce((sum, c) => sum + c.amount, 0);
                const outlierCount = providerClaims.filter(c => c.outlierScore >= 0.5).length;
                const outlierRate = providerClaims.length > 0 ? (outlierCount / providerClaims.length) * 100 : 0;

                return (
                  <div
                    key={provider.id}
                    className="p-4 rounded-md bg-muted/50 space-y-3 hover-elevate cursor-pointer print:cursor-default print:bg-white print:border print:border-gray-200"
                    onClick={() => openCPMAnalysis(provider.id)}
                    data-testid={`card-provider-cpm-${provider.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{provider.name}</p>
                        <p className="text-sm text-muted-foreground">{provider.specialty}</p>
                      </div>
                      <AIScoreBadge score={provider.aiScore} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="bg-background rounded p-2">
                        <p className="text-xs text-muted-foreground">Claims</p>
                        <p className="font-bold">{providerClaims.length}</p>
                      </div>
                      <div className="bg-background rounded p-2">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-bold">${(totalAmount / 1000).toFixed(0)}K</p>
                      </div>
                      <div className="bg-background rounded p-2">
                        <p className="text-xs text-muted-foreground">Outlier %</p>
                        <p className={`font-bold ${outlierRate > 20 ? "text-chart-2" : outlierRate > 10 ? "text-chart-3" : ""}`}>
                          {outlierRate.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    {provider.mlFlags && provider.mlFlags.length > 0 && (
                      <div className="text-xs">
                        <p className="text-muted-foreground mb-1">Top ML Flag:</p>
                        <Badge variant="outline" className="truncate max-w-full">
                          {provider.mlFlags[0].feature}: {provider.mlFlags[0].value}
                        </Badge>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2 print:hidden">
        <span className="text-sm font-medium">Filter by Source:</span>
        <div className="flex gap-2">
          {["all", "pre-auth", "claims", "audit"].map((category) => (
            <Button
              key={category}
              variant={activeCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveCategory(category)}
              className="capitalize"
              data-testid={`button-filter-${category}`}
            >
              {category === "all" ? "All Insights" : category.replace("-", " ")}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-chart-3" />
          Engine Findings & Insights ({filteredInsights.length})
        </h2>

        {filteredInsights.length === 0 && (
          <Card className="p-8">
            <div className="text-center text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-chart-4" />
              <p className="font-medium">No issues found in this category</p>
              <p className="text-sm mt-1">All claims passed validation checks</p>
            </div>
          </Card>
        )}

        {filteredInsights.map((insight) => {
          const InsightIcon = insight.icon;
          const showingAdditional = loadedAdditional.has(insight.id);
          const allClaimIds = showingAdditional
            ? [...insight.primaryClaimIds, ...insight.additionalClaimIds]
            : insight.primaryClaimIds;

          return (
            <Card key={insight.id} className="overflow-hidden">
              <Collapsible
                open={expandedInsights.has(insight.id)}
                onOpenChange={() => toggleInsight(insight.id)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover-elevate p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-0.5">
                          {expandedInsights.has(insight.id) ? (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <InsightIcon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={getSeverityColor(insight.severity)}>
                              {insight.severity.toUpperCase()}
                            </Badge>
                            {getSubcategoryBadge(insight.subcategory)}
                            <Badge variant="outline" className="gap-1 font-mono text-xs">
                              {insight.engineCode}
                            </Badge>
                          </div>
                          <h3 className="font-semibold mt-2">{insight.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {insight.description}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-lg">{insight.metric}</p>
                        <p className="text-xs text-muted-foreground">{insight.benchmark}</p>
                        <p
                          className={`text-sm font-medium ${
                            insight.severity === "high"
                              ? "text-chart-2"
                              : insight.severity === "medium"
                              ? "text-chart-3"
                              : "text-muted-foreground"
                          }`}
                        >
                          {insight.variance}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 pb-4">
                    <div className="border-t pt-4 space-y-4">
                      <div className="bg-muted/50 rounded-md p-3">
                        <p className="text-sm font-medium flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-chart-4" />
                          Recommended Action
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {insight.recommendation}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          Supporting Claims ({allClaimIds.length})
                          {showingAdditional && insight.additionalClaimIds.length > 0 && (
                            <span className="text-primary ml-2">
                              +{insight.additionalClaimIds.length} additional loaded
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 print:hidden">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              selectAllClaimsForInsight(allClaimIds);
                            }}
                            data-testid={`button-select-all-${insight.id}`}
                          >
                            Select All for Export
                          </Button>
                          {insight.additionalClaimIds.length > 0 && !showingAdditional && (
                            <Button
                              variant="default"
                              size="sm"
                              className="gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                loadAdditionalClaims(insight.id);
                              }}
                              data-testid={`button-load-more-${insight.id}`}
                            >
                              <Plus className="h-3 w-3" />
                              Load {insight.additionalClaimIds.length} More Claims
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="border rounded-md overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="w-10 print:hidden">
                                <span className="sr-only">Select</span>
                              </TableHead>
                              <TableHead className="font-semibold">CLAIM #</TableHead>
                              <TableHead className="font-semibold">PATIENT</TableHead>
                              <TableHead className="font-semibold">PROVIDER</TableHead>
                              <TableHead className="font-semibold">DATE</TableHead>
                              <TableHead className="font-semibold">VIOLATION</TableHead>
                              <TableHead className="font-semibold text-right">AMOUNT</TableHead>
                              <TableHead className="font-semibold text-right">SCORE</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {allClaimIds.map((claimId) => {
                              const claim = getClaimById(claimId);
                              if (!claim) return null;
                              const violation = claim.engineViolations?.[0];
                              const isAdditional = insight.additionalClaimIds.includes(claimId);
                              return (
                                <TableRow
                                  key={claim.id}
                                  className={isAdditional ? "bg-primary/5" : ""}
                                  data-testid={`row-claim-${claim.id}`}
                                >
                                  <TableCell className="print:hidden">
                                    <Checkbox
                                      checked={selectedClaims.has(claim.id)}
                                      onCheckedChange={() => toggleClaimSelection(claim.id)}
                                      data-testid={`checkbox-claim-${claim.id}`}
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium text-primary">
                                    <div className="flex items-center gap-1">
                                      {claim.claimNumber}
                                      {isAdditional && (
                                        <Badge variant="outline" className="text-xs ml-1">
                                          Additional
                                        </Badge>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div>
                                      <span>{claim.patientName}</span>
                                      <span className="text-xs text-muted-foreground block">
                                        {claim.patientGender}, {claim.patientAge}y
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">
                                    {claim.providerName}
                                  </TableCell>
                                  <TableCell>{claim.registrationDate}</TableCell>
                                  <TableCell>
                                    {violation && (
                                      <div className="text-xs">
                                        <Badge variant="outline" className="font-mono mb-1">
                                          {violation.code}
                                        </Badge>
                                        <p className="text-muted-foreground truncate max-w-[200px]">
                                          {violation.details}
                                        </p>
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right font-medium">
                                    ${claim.amount.toLocaleString(undefined, {
                                      maximumFractionDigits: 0,
                                    })}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <span
                                      className={`font-semibold ${
                                        claim.outlierScore >= 0.7
                                          ? "text-chart-2"
                                          : claim.outlierScore >= 0.4
                                          ? "text-chart-3"
                                          : "text-chart-4"
                                      }`}
                                    >
                                      {claim.outlierScore.toFixed(2)}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="bg-muted/30 rounded-md p-3">
                          <p className="text-muted-foreground">Total Amount</p>
                          <p className="font-bold text-lg">
                            $
                            {(
                              allClaimIds.reduce((sum, id) => {
                                const claim = getClaimById(id);
                                return sum + (claim?.amount || 0);
                              }, 0) / 1000
                            ).toFixed(0)}
                            K
                          </p>
                        </div>
                        <div className="bg-muted/30 rounded-md p-3">
                          <p className="text-muted-foreground">Avg Outlier Score</p>
                          <p className="font-bold text-lg">
                            {(
                              allClaimIds.reduce((sum, id) => {
                                const claim = getClaimById(id);
                                return sum + (claim?.outlierScore || 0);
                              }, 0) / allClaimIds.length
                            ).toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-muted/30 rounded-md p-3">
                          <p className="text-muted-foreground">Selected for Export</p>
                          <p className="font-bold text-lg">
                            {allClaimIds.filter((id) => selectedClaims.has(id)).length} / {allClaimIds.length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>

      <Card className="border-chart-4/30 bg-chart-4/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Executive Summary for Provider Meeting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="prose prose-sm max-w-none text-muted-foreground">
            <p>
              <strong>Provider:</strong> {hospital.name}
            </p>
            <p>
              <strong>Review Period:</strong> Last 6 months
            </p>
            <p>
              <strong>Engine Validation Summary:</strong>
            </p>
            <ul className="mt-2 space-y-1">
              <li>
                <strong>Technical Validations:</strong> {insights.filter((i) => i.subcategory === "technical").length} issues requiring correction (billing, duplicates, gender/age violations, lab retesting, bundling)
              </li>
              <li>
                <strong>Medical Reviews:</strong> {insights.filter((i) => i.subcategory === "medical").length} items for clinical appropriateness review (drug interactions, treatment patterns)
              </li>
              <li>
                <strong>ML Model Flags:</strong> {insights.filter((i) => i.subcategory === "ml-flag").length} AI-detected anomalies (cost outliers, LOS patterns)
              </li>
              <li>
                Total claims under review: {hospitalClaims.length} valued at $
                {(totalClaimsAmount / 1000).toFixed(0)}K
              </li>
              {selectedCount > 0 && (
                <li className="text-primary">
                  <strong>{selectedCount} claims selected for detailed export report</strong>
                </li>
              )}
            </ul>
            <p className="mt-4">
              <strong>Discussion Points for Provider Relations:</strong>
            </p>
            <ol className="mt-2 space-y-2">
              {insights
                .filter((i) => i.severity === "high")
                .slice(0, 5)
                .map((insight, idx) => (
                  <li key={insight.id}>
                    <strong>{insight.title} [{insight.engineCode}]:</strong> {insight.recommendation}
                  </li>
                ))}
            </ol>
          </div>
        </CardContent>
      </Card>

      <Dialog open={cpmModalOpen} onOpenChange={setCpmModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Provider Risk Analysis
            </DialogTitle>
            <DialogDescription>
              Provider claims analysis and risk metrics compared with specialty peers.
            </DialogDescription>
          </DialogHeader>

          {selectedProviderCPM && (
            <div className="space-y-6 mt-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-md">
                <div>
                  <h3 className="font-semibold text-lg">{selectedProviderCPM.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedProviderCPM.specialty} - {selectedProviderCPM.hospital}</p>
                </div>
                <AIScoreBadge score={selectedProviderCPM.aiScore} />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Total Claims</p>
                    <p className="text-2xl font-bold">{selectedProviderCPM.claimCount || 0}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Total Amount</p>
                    <p className="text-2xl font-bold">${((selectedProviderCPM.totalAmount || 0) / 1000).toFixed(0)}K</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Avg per Claim</p>
                    <p className="text-2xl font-bold text-chart-4">${(selectedProviderCPM.avgAmount || 0).toFixed(0)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Outlier Claims</p>
                    <p className={`text-2xl font-bold ${(selectedProviderCPM.outlierCount || 0) > 0 ? "text-chart-2" : ""}`}>
                      {selectedProviderCPM.outlierCount || 0}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Specialty Peer Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {peerProviders.length > 0 ? peerProviders.map((peer) => {
                      const peerClaims = hospitalClaims.filter(c => c.providerId === peer.id);
                      const peerTotal = peerClaims.reduce((s, c) => s + c.amount, 0);
                      const peerOutliers = peerClaims.filter(c => c.outlierScore >= 0.5).length;
                      const isSelected = peer.id === selectedProviderCPM.id;
                      
                      return (
                        <div
                          key={peer.id}
                          className={`p-3 rounded-md ${isSelected ? "bg-primary/10 border border-primary" : "bg-muted/50"}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className={`font-medium ${isSelected ? "text-primary" : ""}`}>
                                {peer.name}
                                {isSelected && <Badge className="ml-2" variant="default">Selected</Badge>}
                              </p>
                              <p className="text-xs text-muted-foreground">{peer.specialty}</p>
                            </div>
                            <AIScoreBadge score={peer.aiScore} />
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Claims:</span>
                              <span className="ml-1 font-medium">{peerClaims.length}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Total:</span>
                              <span className="ml-1 font-medium">${(peerTotal / 1000).toFixed(0)}K</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Outliers:</span>
                              <span className={`ml-1 font-medium ${peerOutliers > 0 ? "text-chart-2" : ""}`}>
                                {peerOutliers}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No specialty peers found for comparison</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-chart-3/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-chart-3" />
                    Provider Risk Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {(selectedProviderCPM.outlierCount || 0) > 0 && (
                      <div className="flex items-start gap-2 p-2 bg-chart-2/10 rounded">
                        <AlertCircle className="h-4 w-4 text-chart-2 mt-0.5 shrink-0" />
                        <p>
                          Provider has <strong>{selectedProviderCPM.outlierCount} outlier claims</strong> requiring review.
                        </p>
                      </div>
                    )}
                    {selectedProviderCPM.aiScore > 0.7 && (
                      <div className="flex items-start gap-2 p-2 bg-chart-2/10 rounded">
                        <XCircle className="h-4 w-4 text-chart-2 mt-0.5 shrink-0" />
                        <p>
                          High AI risk score of <strong>{(selectedProviderCPM.aiScore * 100).toFixed(0)}%</strong>. Recommend enhanced review.
                        </p>
                      </div>
                    )}
                    <div className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                      <TrendingUp className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <p>
                        Average claim amount: <strong>${(selectedProviderCPM.avgAmount || 0).toFixed(0)}</strong> across {selectedProviderCPM.claimCount || 0} total claims.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
