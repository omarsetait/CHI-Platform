import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertTriangle,
  DollarSign,
  ShieldAlert,
  Eye,
  Search,
  Flag,
  Bot,
  FileText,
  MapPin,
  Stethoscope,
  Calendar,
  X,
  Filter,
  ArrowRight,
  ClipboardList,
  Activity,
  Building2,
  Layers,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

// DB-backed claim shape (matches Drizzle claims table)
interface FlaggedClaim {
  id: string;
  claimNumber: string;
  policyNumber: string;
  registrationDate: string;
  claimType: string;
  hospital: string;
  amount: string;
  outlierScore: string;
  description: string | null;
  icd: string | null;
  providerName: string | null;
  patientName: string | null;
  serviceDate: string | null;
  status: string | null;
  category: string | null;
  flagged: boolean;
  flagReason: string | null;
  cptCodes: string[] | null;
  diagnosisCodes: string[] | null;
  providerCity: string | null;
  providerRegion: string | null;
  specialty: string | null;
  providerType: string | null;
  providerId: string | null;
  gender: string | null;
  nationality: string | null;
  claimIcd10Descriptions: string | null;
  aiStatus: string | null;
}

interface FlaggedClaimsSummary {
  totalFlagged: number;
  totalExposure: number;
  confirmedFraud: number;
  underReview: number;
}

interface FlaggedClaimsResponse {
  claims: FlaggedClaim[];
  summary: FlaggedClaimsSummary;
}

// ─── Category labels matching DB category values ───
const CATEGORY_LABELS: Record<string, string> = {
  phantom_billing: "Phantom Billing",
  upcoding: "Upcoding",
  cross_insurer_duplicate: "Cross-Insurer Duplicate",
  unbundling: "Unbundling",
  referral_churning: "Referral Churning",
  unnecessary_admission: "Unnecessary Admission",
  dental_phantom_billing: "Phantom Billing",
  obgyn_upcoding: "OB/GYN Upcoding",
  duplicate_cross_insurer: "Duplicate Cross-Insurer",
};

// ─── Region labels matching Saudi heatmap region codes ───
const REGION_LABELS: Record<string, string> = {
  RIY: "Riyadh",
  MAK: "Makkah",
  EST: "Eastern Province",
  MDN: "Madinah",
  ASR: "Asir",
  QSM: "Qassim",
  TBK: "Tabuk",
  HAL: "Hail",
  JZN: "Jazan",
  NJR: "Najran",
  BAH: "Al Baha",
  JOF: "Al Jouf",
  NBR: "Northern Borders",
};

// ─── Arabic region labels (mirrors saudi-heatmap.tsx) ───
const REGION_LABELS_AR: Record<string, string> = {
  RIY: "الرياض",
  MAK: "مكة المكرمة",
  EST: "المنطقة الشرقية",
  MDN: "المدينة المنورة",
  ASR: "عسير",
  QSM: "القصيم",
  TBK: "تبوك",
  HAL: "حائل",
  JZN: "جازان",
  NJR: "نجران",
  BAH: "الباحة",
  JOF: "الجوف",
  NBR: "الحدود الشمالية",
};

// ─── Status labels matching DB status values ───
const STATUS_LABELS: Record<string, string> = {
  confirmed_fraud: "Confirmed Fraud",
  under_review: "Under Review",
  pending_review: "Pending Review",
  flagged: "Flagged",
  pending_investigation: "Pending Investigation",
};

// ─── Fraud pattern badge colors based on flagReason text ───
function getFlagReasonBadgeClasses(flagReason: string | null): string {
  if (!flagReason) return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
  const lower = flagReason.toLowerCase();
  if (lower.includes("phantom billing") || lower.includes("phantom"))
    return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
  if (lower.includes("upcoding") || lower.includes("upcode"))
    return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
  if (lower.includes("cross-insurer") || lower.includes("duplicate"))
    return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800";
  if (lower.includes("unbundling") || lower.includes("unbundle"))
    return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
  if (lower.includes("referral") || lower.includes("churning"))
    return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
  return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
}

function getFlagReasonLabel(flagReason: string | null): string {
  if (!flagReason) return "Unknown";
  const lower = flagReason.toLowerCase();
  if (lower.includes("phantom")) return "Phantom Billing";
  if (lower.includes("upcoding") || lower.includes("upcode")) return "Upcoding";
  if (lower.includes("cross-insurer") || lower.includes("duplicate")) return "Cross-Insurer Duplicate";
  if (lower.includes("unbundling") || lower.includes("unbundle")) return "Unbundling";
  if (lower.includes("referral") || lower.includes("churning")) return "Referral Churning";
  return "Suspicious Pattern";
}

function getCategoryBadgeClasses(category: string): string {
  switch (category) {
    case "dental_phantom_billing":
    case "phantom_billing":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    case "obgyn_upcoding":
    case "upcoding":
      return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
    case "referral_churning":
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
    case "duplicate_cross_insurer":
    case "cross_insurer_duplicate":
      return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800";
    case "unnecessary_admission":
      return "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800";
    case "unbundling":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
  }
}

function getStatusBadgeClasses(status: string): string {
  switch (status) {
    case "confirmed_fraud":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    case "under_review":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    case "pending_review":
    case "pending_investigation":
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
    case "flagged":
      return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
  }
}

function getRiskColor(score: number): string {
  if (score >= 90) return "text-red-600 dark:text-red-400";
  if (score >= 75) return "text-orange-600 dark:text-orange-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-green-600 dark:text-green-400";
}

function getRiskProgressColor(score: number): string {
  if (score >= 90) return "[&>div]:bg-red-500";
  if (score >= 75) return "[&>div]:bg-orange-500";
  if (score >= 50) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-green-500";
}

function formatCurrency(amount: number): string {
  return `SAR ${Number(amount).toLocaleString()}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function FlaggedClaimsPage() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const regionFilter = useMemo(() => {
    const params = new URLSearchParams(searchString);
    const code = (params.get("region") || "").toUpperCase();
    return code && REGION_LABELS[code] ? code : "";
  }, [searchString]);

  // Date-window drill-through (set when arriving from the heatmap with a
  // selected range). Both the API request and the UI banner honor it.
  const dateWindow = useMemo(() => {
    const params = new URLSearchParams(searchString);
    const fromRaw = params.get("from");
    const toRaw = params.get("to");
    const fromDate = fromRaw ? new Date(fromRaw) : null;
    const toDate = toRaw ? new Date(toRaw) : null;
    return {
      from: fromDate && !isNaN(fromDate.getTime()) ? fromRaw : null,
      to: toDate && !isNaN(toDate.getTime()) ? toRaw : null,
      fromDate: fromDate && !isNaN(fromDate.getTime()) ? fromDate : null,
      toDate: toDate && !isNaN(toDate.getTime()) ? toDate : null,
    };
  }, [searchString]);

  const dateWindowLabel = useMemo(() => {
    if (!dateWindow.fromDate || !dateWindow.toDate) return "";
    const ms = dateWindow.toDate.getTime() - dateWindow.fromDate.getTime();
    const days = Math.round(ms / (24 * 60 * 60 * 1000));
    if (days === 7) return "Last 7 days";
    if (days === 30) return "Last 30 days";
    if (days === 90) return "Last 90 days";
    return `${dateWindow.fromDate.toLocaleDateString()} – ${dateWindow.toDate.toLocaleDateString()}`;
  }, [dateWindow]);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedClaim, setSelectedClaim] = useState<FlaggedClaim | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Read entity-filter URL params via wouter (e.g. ?provider=PRV-CS1-001)
  const [, setLocation] = useLocation();
  const entityParams = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const providerFilter = entityParams.get("provider") || "";
  const patientFilter = entityParams.get("patient") || "";
  const doctorFilter = entityParams.get("doctor") || "";

  const queryString = useMemo(() => {
    const sp = new URLSearchParams();
    if (providerFilter) sp.set("provider", providerFilter);
    if (patientFilter) sp.set("patient", patientFilter);
    if (doctorFilter) sp.set("doctor", doctorFilter);
    if (dateWindow.from) sp.set("from", dateWindow.from);
    if (dateWindow.to) sp.set("to", dateWindow.to);
    const s = sp.toString();
    return s ? `?${s}` : "";
  }, [providerFilter, patientFilter, doctorFilter, dateWindow.from, dateWindow.to]);

  const { data, isLoading } = useQuery<FlaggedClaimsResponse>({
    queryKey: [
      "/api/fwa/flagged-claims",
      { provider: providerFilter, patient: patientFilter, doctor: doctorFilter },
      dateWindow.from,
      dateWindow.to,
    ],
    queryFn: async () => {
      const res = await fetch(`/api/fwa/flagged-claims${queryString}`, { credentials: "include" });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      return res.json();
    },
  });

  // Helper to navigate while preserving the rest of the URL filter set so
  // dropping one banner (region/date/entity) doesn't accidentally drop the
  // others.
  const navigatePreservingExcept = (keysToDrop: string[]) => {
    const next = new URLSearchParams(searchString);
    for (const k of keysToDrop) next.delete(k);
    const qs = next.toString();
    navigate(`/fwa/flagged-claims${qs ? `?${qs}` : ""}`);
  };

  const clearEntityFilter = () => {
    navigatePreservingExcept(["provider", "patient", "doctor"]);
  };

  const entityFilterLabel = providerFilter
    ? `Provider: ${providerFilter}`
    : patientFilter
      ? `Patient: ${patientFilter}`
      : doctorFilter
        ? `Doctor: ${doctorFilter}`
        : "";

  const claims = data?.claims ?? [];
  const summary = data?.summary;

  const clearRegionFilter = () => {
    navigatePreservingExcept(["region"]);
  };

  const clearDateFilter = () => {
    navigatePreservingExcept(["from", "to"]);
  };

  const filtered = useMemo(() => {
    return claims.filter((claim) => {
      const matchesSearch =
        !search ||
        (claim.claimNumber || "").toLowerCase().includes(search.toLowerCase()) ||
        (claim.providerName || "").toLowerCase().includes(search.toLowerCase()) ||
        (claim.patientName || "").toLowerCase().includes(search.toLowerCase()) ||
        (claim.icd || "").toLowerCase().includes(search.toLowerCase()) ||
        (claim.flagReason || "").toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" || claim.category === categoryFilter;

      const matchesStatus =
        statusFilter === "all" || claim.status === statusFilter;

      const matchesRegion =
        !regionFilter ||
        (claim.providerRegion || "").toUpperCase() === regionFilter;

      return matchesSearch && matchesCategory && matchesStatus && matchesRegion;
    });
  }, [claims, search, categoryFilter, statusFilter, regionFilter]);

  // Region snapshot: compute breakdown of *why* this region was painted red/orange
  // on the Saudi heatmap. Numbers come from the same /api/fwa/flagged-claims data
  // we already fetched (no extra request) and are restricted to the active region
  // — independent of search / category / status filters so investigators see the
  // full picture even after narrowing the table below.
  const regionSnapshot = useMemo(() => {
    if (!regionFilter) return null;

    const inRegion = claims.filter(
      (c) => (c.providerRegion || "").toUpperCase() === regionFilter,
    );

    const totalCount = inRegion.length;
    const totalExposure = inRegion.reduce(
      (sum, c) => sum + Number(c.amount || 0),
      0,
    );

    // Top 3 fraud categories by claim count
    const categoryMap = new Map<string, number>();
    for (const c of inRegion) {
      const key = c.category || "uncategorized";
      categoryMap.set(key, (categoryMap.get(key) ?? 0) + 1);
    }
    const topCategories = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Top 3 providers driving the region's risk score. We rank by a risk-weighted
    // contribution (sum of per-claim risk scores) so a provider with several
    // high-risk claims outranks a provider with one outlier — this mirrors how
    // the heatmap aggregates risk across claims. Average risk and total
    // exposure are surfaced as secondary metrics on each row.
    interface ProviderAgg {
      name: string;
      claimCount: number;
      exposure: number;
      riskSum: number;
    }
    const providerMap = new Map<string, ProviderAgg>();
    for (const c of inRegion) {
      const name = c.providerName || "Unknown Provider";
      const agg =
        providerMap.get(name) ?? {
          name,
          claimCount: 0,
          exposure: 0,
          riskSum: 0,
        };
      agg.claimCount += 1;
      agg.exposure += Number(c.amount || 0);
      agg.riskSum += Math.round(Number(c.outlierScore || 0) * 100);
      providerMap.set(name, agg);
    }
    const topProviders = Array.from(providerMap.values())
      .map((p) => ({
        name: p.name,
        claimCount: p.claimCount,
        exposure: p.exposure,
        avgRisk: p.claimCount > 0 ? Math.round(p.riskSum / p.claimCount) : 0,
        // Risk contribution = sum of risk scores across claims. Drives the
        // ranking and matches how regional risk accumulates on the heatmap.
        riskContribution: p.riskSum,
      }))
      .sort(
        (a, b) =>
          b.riskContribution - a.riskContribution ||
          b.avgRisk - a.avgRisk ||
          b.claimCount - a.claimCount,
      )
      .slice(0, 3);

    return { totalCount, totalExposure, topCategories, topProviders };
  }, [claims, regionFilter]);

  const handleClaimClick = (claim: FlaggedClaim) => {
    setSelectedClaim(claim);
    setSheetOpen(true);
  };

  // Fetch full detail (services, encounter, policy) when sidebar opens
  const { data: claimDetail, isLoading: claimDetailLoading } = useQuery<{
    claim: {
      encounterStart: string | null;
      encounterEnd: string | null;
      lengthOfStay: number | null;
      serviceDuration: number | null;
      dischargeDisposition: string | null;
      secondaryDiagnosis: string | null;
      otherDiagnosis: string | null;
      policyEffectiveDate: string | null;
      policyExpiryDate: string | null;
      groupNo: string | null;
      coverageRelationship: string | null;
      providerLicense: string | null;
      city: string | null;
      isChronic: boolean | null;
    };
    services: Array<{
      id: string;
      lineNumber: number;
      serviceCode: string;
      serviceDescription: string;
      activityType: string | null;
      quantity: string;
      totalPrice: string;
      approvedAmount: string | null;
      approvalStatus: string | null;
      adjudicationStatus: string | null;
    }>;
    practitionerName: string | null;
  }>({
    queryKey: ["/api/fwa/flagged-claims", selectedClaim?.id ?? selectedClaim?.claimNumber, "detail"],
    queryFn: async () => {
      const key = selectedClaim?.id || selectedClaim?.claimNumber;
      if (!key) throw new Error("No claim selected");
      const res = await fetch(`/api/fwa/flagged-claims/${encodeURIComponent(key)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      return res.json();
    },
    enabled: sheetOpen && !!(selectedClaim?.id || selectedClaim?.claimNumber),
  });

  const outlierScorePercent = (score: string | null | undefined): number => {
    return Math.round(Number(score || 0) * 100);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-96" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="flex gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-48" />
          ))}
        </div>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Flagged Claims</h1>
        <p className="text-muted-foreground mt-1">
          Flagged Claims{" "}
          <span className="font-arabic" dir="rtl">
            المطالبات المُبلّغة
          </span>
        </p>
      </div>

      {/* Region drill-down banner (set when arriving from the Saudi heatmap) */}
      {regionFilter && (
        <div
          className="flex items-center justify-between gap-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm dark:border-blue-900/40 dark:bg-blue-950/30"
          data-testid="banner-region-filter"
        >
          <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
            <MapPin className="h-4 w-4" />
            <span>
              Showing claims in{" "}
              <span className="font-semibold" data-testid="text-region-filter-label">
                {REGION_LABELS[regionFilter]}
              </span>{" "}
              <span className="text-blue-700/70 dark:text-blue-300/70">({regionFilter})</span>
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearRegionFilter}
            className="h-7 px-2 text-blue-900 hover:bg-blue-100 dark:text-blue-200 dark:hover:bg-blue-900/40"
            data-testid="button-clear-region-filter"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        </div>
      )}

      {/* Entity filter chip (from URL params) */}
      {entityFilterLabel && (
        <div className="flex items-center gap-2" data-testid="entity-filter-chip">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filtered by:</span>
          <Badge
            variant="outline"
            className="gap-1 pr-1 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800"
            data-testid="badge-entity-filter"
          >
            <span className="font-mono text-xs">{entityFilterLabel}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearEntityFilter}
              className="h-5 w-5 p-0 ml-1 hover:bg-purple-200 dark:hover:bg-purple-800"
              data-testid="button-clear-entity-filter"
              aria-label="Clear entity filter"
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        </div>
      )}

      {/* Date-window banner (set when arriving from the Saudi heatmap range) */}
      {dateWindowLabel && (
        <div
          className="flex items-center justify-between gap-3 rounded-md border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm dark:border-violet-900/40 dark:bg-violet-950/30"
          data-testid="banner-date-filter"
        >
          <div className="flex items-center gap-2 text-violet-900 dark:text-violet-200">
            <Calendar className="h-4 w-4" />
            <span>
              Showing claims from{" "}
              <span className="font-semibold" data-testid="text-date-filter-label">
                {dateWindowLabel}
              </span>
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearDateFilter}
            className="h-7 px-2 text-violet-900 hover:bg-violet-100 dark:text-violet-200 dark:hover:bg-violet-900/40"
            data-testid="button-clear-date-filter"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        </div>
      )}

      {/* Region Snapshot — explains *why* this region is hot on the heatmap */}
      {regionFilter && regionSnapshot && (
        <Card data-testid="card-region-snapshot">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">
                  Region Snapshot
                </CardTitle>
                <span className="text-sm text-muted-foreground">
                  · {REGION_LABELS[regionFilter]}{" "}
                  <span className="font-arabic" dir="rtl">
                    {REGION_LABELS_AR[regionFilter]}
                  </span>{" "}
                  <span className="text-muted-foreground/70">({regionFilter})</span>
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {regionSnapshot.totalCount === 0 ? (
              <p
                className="text-sm text-muted-foreground"
                data-testid="text-region-snapshot-empty"
              >
                No flagged claims found for this region in the current dataset.
              </p>
            ) : (
              <>
                {/* Top stats: FWA count + total exposure */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-md border bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Flag className="h-3.5 w-3.5" />
                      <span className="text-xs">FWA Claims in Region</span>
                    </div>
                    <p
                      className="text-2xl font-bold mt-1"
                      data-testid="text-region-fwa-count"
                    >
                      {regionSnapshot.totalCount}
                    </p>
                  </div>
                  <div className="rounded-md border bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span className="text-xs">Total Exposure</span>
                    </div>
                    <p
                      className="text-2xl font-bold mt-1"
                      data-testid="text-region-total-exposure"
                    >
                      {formatCurrency(regionSnapshot.totalExposure)}
                    </p>
                  </div>
                </div>

                {/* Two columns: top categories + top providers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Top 3 fraud categories */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <Layers className="h-4 w-4" />
                      Top Fraud Categories
                    </h4>
                    <div className="space-y-2">
                      {regionSnapshot.topCategories.map((cat, i) => (
                        <div
                          key={cat.category}
                          className="flex items-center justify-between gap-3"
                          data-testid={`row-region-category-${i}`}
                        >
                          <Badge
                            className={`text-xs whitespace-nowrap ${getCategoryBadgeClasses(cat.category)}`}
                          >
                            {CATEGORY_LABELS[cat.category] ?? cat.category}
                          </Badge>
                          <span
                            className="text-sm font-medium tabular-nums"
                            data-testid={`text-region-category-count-${i}`}
                          >
                            {cat.count} claim{cat.count === 1 ? "" : "s"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top 3 providers driving the region's risk score */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <Building2 className="h-4 w-4" />
                      Top Providers by Risk
                    </h4>
                    <div className="space-y-2">
                      {regionSnapshot.topProviders.map((p, i) => (
                        <div
                          key={p.name}
                          className="flex items-center justify-between gap-3"
                          data-testid={`row-region-provider-${i}`}
                        >
                          <div className="min-w-0 flex-1">
                            <p
                              className="text-sm font-medium truncate"
                              data-testid={`text-region-provider-name-${i}`}
                              title={p.name}
                            >
                              {p.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {p.claimCount} claim{p.claimCount === 1 ? "" : "s"}
                              {" · "}
                              <span data-testid={`text-region-provider-exposure-${i}`}>
                                {formatCurrency(p.exposure)}
                              </span>
                            </p>
                          </div>
                          <span
                            className={`text-sm font-semibold tabular-nums whitespace-nowrap ${getRiskColor(p.avgRisk)}`}
                            data-testid={`text-region-provider-risk-${i}`}
                            title="Average risk score across this provider's flagged claims in the region"
                          >
                            {p.avgRisk}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Total Flagged
              </span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {summary?.totalFlagged ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Total Exposure (SAR)
              </span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {formatCurrency(summary?.totalExposure ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">
                Confirmed Fraud
              </span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">
              {summary?.confirmedFraud ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">
                Under Review
              </span>
            </div>
            <p className="text-2xl font-bold mt-1 text-amber-600">
              {summary?.underReview ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search claims, providers, patients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Claims Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Claim #</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>ICD / CPT</TableHead>
              <TableHead>Flag Reason</TableHead>
              <TableHead className="text-right">Amount (SAR)</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((claim) => {
              const riskScore = outlierScorePercent(claim.outlierScore);
              const isAiFlagged = Number(claim.outlierScore || 0) > 0.7;
              return (
                <TableRow
                  key={claim.id}
                  className="hover-elevate cursor-pointer"
                  onClick={() => handleClaimClick(claim)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <p className="font-medium font-mono text-sm">
                        {claim.claimNumber}
                      </p>
                      {isAiFlagged && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-700"
                        >
                          <Bot className="h-3 w-3 mr-0.5" />
                          AI
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">{claim.providerName || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">
                      {claim.patientName || "Unknown"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex gap-1.5 flex-wrap">
                        {claim.icd && (
                          <Badge variant="outline" className="text-xs font-mono">
                            {claim.icd}
                          </Badge>
                        )}
                        {claim.cptCodes && claim.cptCodes.length > 0 && (
                          <Badge variant="outline" className="text-xs font-mono">
                            {claim.cptCodes[0]}
                            {claim.cptCodes.length > 1 && ` +${claim.cptCodes.length - 1}`}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`text-xs whitespace-nowrap ${getFlagReasonBadgeClasses(claim.flagReason)}`}
                    >
                      {getFlagReasonLabel(claim.flagReason)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(claim.amount || 0))}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <Progress
                        value={riskScore}
                        className={`w-14 h-2 ${getRiskProgressColor(riskScore)}`}
                      />
                      <span
                        className={`text-sm font-semibold ${getRiskColor(riskScore)}`}
                      >
                        {riskScore}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`text-xs whitespace-nowrap ${getCategoryBadgeClasses(claim.category || "")}`}
                    >
                      {CATEGORY_LABELS[claim.category || ""] ?? claim.category ?? "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`text-xs whitespace-nowrap ${getStatusBadgeClasses(claim.status || "")}`}
                    >
                      {STATUS_LABELS[claim.status || ""] ?? claim.status ?? "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(claim.registrationDate)}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-muted-foreground py-8"
                >
                  <div className="flex flex-col items-center gap-2">
                    <AlertTriangle className="h-8 w-8 text-muted-foreground/50" />
                    <p>No flagged claims found matching your filters</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Claim Detail Sheet (slide-out panel) */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedClaim && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Claim Detail
                </SheetTitle>
                <SheetDescription>
                  {selectedClaim.claimNumber}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Amount prominently displayed */}
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">Claim Amount</p>
                  <p className="text-3xl font-bold">
                    {formatCurrency(Number(selectedClaim.amount || 0))}
                  </p>
                </div>

                {/* Flag Reason Badge */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Flag Reason</h4>
                  <Badge
                    className={`text-sm ${getFlagReasonBadgeClasses(selectedClaim.flagReason)}`}
                  >
                    {getFlagReasonLabel(selectedClaim.flagReason)}
                  </Badge>
                  {selectedClaim.flagReason && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedClaim.flagReason}
                    </p>
                  )}
                </div>

                <Separator />

                {/* Provider & Patient */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Provider</h4>
                    <p className="text-sm font-medium">{selectedClaim.providerName || "N/A"}</p>
                    {selectedClaim.providerCity && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {selectedClaim.providerCity}
                        {selectedClaim.providerRegion && `, ${selectedClaim.providerRegion}`}
                      </p>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Patient</h4>
                    <p className="text-sm font-medium">{selectedClaim.patientName || "N/A"}</p>
                  </div>
                </div>

                <Separator />

                {/* Clinical Details */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <Stethoscope className="h-4 w-4" />
                    Clinical Details
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <span className="text-xs text-muted-foreground">ICD Code</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        {selectedClaim.icd ? (
                          <Badge variant="outline" className="font-mono">
                            {selectedClaim.icd}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">N/A</span>
                        )}
                        {selectedClaim.claimIcd10Descriptions && (
                          <span className="text-sm text-muted-foreground">
                            {selectedClaim.claimIcd10Descriptions}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">CPT Codes</span>
                      <div className="flex flex-wrap gap-1.5 mt-0.5">
                        {selectedClaim.cptCodes && selectedClaim.cptCodes.length > 0 ? (
                          selectedClaim.cptCodes.map((code, i) => (
                            <Badge key={i} variant="outline" className="font-mono">
                              {code}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">N/A</span>
                        )}
                      </div>
                    </div>
                    {selectedClaim.specialty && (
                      <div>
                        <span className="text-xs text-muted-foreground">Specialty</span>
                        <p className="text-sm">{selectedClaim.specialty}</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Status & Detection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Status</h4>
                    <Badge
                      className={`text-xs ${getStatusBadgeClasses(selectedClaim.status || "")}`}
                    >
                      {STATUS_LABELS[selectedClaim.status || ""] ?? selectedClaim.status ?? "N/A"}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Category</h4>
                    <Badge
                      className={`text-xs ${getCategoryBadgeClasses(selectedClaim.category || "")}`}
                    >
                      {CATEGORY_LABELS[selectedClaim.category || ""] ?? selectedClaim.category ?? "N/A"}
                    </Badge>
                  </div>
                </div>

                {/* Detection Confidence (from outlierScore) */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Detection Confidence</h4>
                  <div className="flex items-center gap-3">
                    <Progress
                      value={outlierScorePercent(selectedClaim.outlierScore)}
                      className={`flex-1 h-3 ${getRiskProgressColor(outlierScorePercent(selectedClaim.outlierScore))}`}
                    />
                    <span className={`text-lg font-bold ${getRiskColor(outlierScorePercent(selectedClaim.outlierScore))}`}>
                      {outlierScorePercent(selectedClaim.outlierScore)}%
                    </span>
                  </div>
                  {Number(selectedClaim.outlierScore || 0) > 0.7 && (
                    <Badge
                      variant="outline"
                      className="text-xs bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-700"
                    >
                      <Bot className="h-3 w-3 mr-1" />
                      AI Flagged - High Confidence
                    </Badge>
                  )}
                </div>

                <Separator />

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Registration Date
                    </h4>
                    <p className="text-sm mt-0.5">{formatDate(selectedClaim.registrationDate)}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Service Date
                    </h4>
                    <p className="text-sm mt-0.5">{formatDate(selectedClaim.serviceDate)}</p>
                  </div>
                </div>

                {/* Encounter (from detail endpoint) */}
                {claimDetail?.claim && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                        <Activity className="h-4 w-4" />
                        Encounter
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Length of Stay</p>
                          <p>
                            {claimDetail.claim.lengthOfStay !== null
                              ? `${claimDetail.claim.lengthOfStay} day(s)`
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Service Duration</p>
                          <p>
                            {claimDetail.claim.serviceDuration !== null
                              ? `${claimDetail.claim.serviceDuration} min`
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Disposition</p>
                          <p>{claimDetail.claim.dischargeDisposition ?? "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Group</p>
                          <p className="truncate">{claimDetail.claim.groupNo ?? "—"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Policy */}
                    {(claimDetail.claim.policyEffectiveDate || claimDetail.claim.policyExpiryDate) && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-muted-foreground">Policy</h4>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">Effective</p>
                              <p>{formatDate(claimDetail.claim.policyEffectiveDate)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Expiry</p>
                              <p>{formatDate(claimDetail.claim.policyExpiryDate)}</p>
                            </div>
                            {claimDetail.claim.coverageRelationship && (
                              <div>
                                <p className="text-xs text-muted-foreground">Relationship</p>
                                <p className="capitalize">{claimDetail.claim.coverageRelationship}</p>
                              </div>
                            )}
                            {claimDetail.claim.isChronic && (
                              <div className="flex items-end">
                                <Badge variant="outline" className="text-xs">Chronic</Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}

                {/* Services Included */}
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                      <ClipboardList className="h-4 w-4" />
                      Services Included
                    </h4>
                    {claimDetail && (
                      <Badge variant="outline" className="text-xs" data-testid="badge-service-count">
                        {claimDetail.services.length}
                      </Badge>
                    )}
                  </div>
                  {claimDetailLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : claimDetail && claimDetail.services.length > 0 ? (
                    <div className="space-y-2">
                      {claimDetail.services.map((s) => {
                        const status = (s.approvalStatus || s.adjudicationStatus || "").toLowerCase();
                        const accepted = status === "approved" || status.includes("accept");
                        return (
                          <div
                            key={s.id}
                            className="rounded-md border p-2.5 text-sm"
                            data-testid={`sidebar-service-${s.lineNumber}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {s.serviceCode}
                                  </Badge>
                                  {s.activityType && (
                                    <span className="text-xs text-muted-foreground">
                                      {s.activityType}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs mt-1 line-clamp-2">{s.serviceDescription}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-sm font-medium">
                                  {formatCurrency(Number(s.totalPrice))}
                                </p>
                                <Badge
                                  variant="outline"
                                  className={`text-xs mt-1 ${
                                    accepted
                                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                      : "bg-rose-100 text-rose-800 border-rose-300"
                                  }`}
                                >
                                  {accepted ? "Approved" : "Denied"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No service lines recorded.</p>
                  )}
                </div>

                {/* View Full Details */}
                <Separator />
                <Link
                  href={`/fwa/claims/${encodeURIComponent(selectedClaim.claimNumber)}`}
                  data-testid="link-view-full-details"
                >
                  <Button className="w-full" size="lg">
                    View Full Details
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
