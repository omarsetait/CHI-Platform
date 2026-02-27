import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  AlertTriangle,
  DollarSign,
  ShieldAlert,
  Eye,
  Search,
  Flag,
} from "lucide-react";

interface FlaggedClaim {
  id: string;
  claimId: string;
  patientName: string;
  providerId: string;
  providerName: string;
  insurerName: string;
  icdCode: string;
  icdDescription: string;
  cptCode: string;
  cptDescription: string;
  claimAmount: number;
  flagReason: string;
  flagCategory: string;
  riskScore: number;
  detectedAt: string;
  status: string;
  detectionMethod: string;
}

interface FlaggedClaimsSummary {
  totalFlagged: number;
  totalExposure: number;
  confirmedFraud: number;
  underReview: number;
  pendingInvestigation: number;
}

interface FlaggedClaimsResponse {
  claims: FlaggedClaim[];
  summary: FlaggedClaimsSummary;
}

const CATEGORY_LABELS: Record<string, string> = {
  dental_phantom_billing: "Phantom Billing",
  obgyn_upcoding: "OB/GYN Upcoding",
  referral_churning: "Referral Churning",
  duplicate_cross_insurer: "Duplicate Cross-Insurer",
  unnecessary_admission: "Unnecessary Admission",
  unbundling: "Unbundling",
};

const STATUS_LABELS: Record<string, string> = {
  under_review: "Under Review",
  confirmed_fraud: "Confirmed Fraud",
  pending_investigation: "Pending Investigation",
};

function getCategoryBadgeClasses(category: string): string {
  switch (category) {
    case "dental_phantom_billing":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    case "obgyn_upcoding":
      return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
    case "referral_churning":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    case "duplicate_cross_insurer":
      return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800";
    case "unnecessary_admission":
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
    case "unbundling":
      return "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800";
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
    case "pending_investigation":
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
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
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function FlaggedClaimsPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useQuery<FlaggedClaimsResponse>({
    queryKey: ["/api/fwa/flagged-claims"],
  });

  const claims = data?.claims ?? [];
  const summary = data?.summary;

  const filtered = useMemo(() => {
    return claims.filter((claim) => {
      const matchesSearch =
        !search ||
        claim.claimId.toLowerCase().includes(search.toLowerCase()) ||
        claim.providerName.toLowerCase().includes(search.toLowerCase()) ||
        claim.patientName.toLowerCase().includes(search.toLowerCase()) ||
        claim.insurerName.toLowerCase().includes(search.toLowerCase()) ||
        claim.icdCode.toLowerCase().includes(search.toLowerCase()) ||
        claim.cptCode.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" || claim.flagCategory === categoryFilter;

      const matchesStatus =
        statusFilter === "all" || claim.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [claims, search, categoryFilter, statusFilter]);

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
              <TableHead>Claim ID</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Insurer</TableHead>
              <TableHead>ICD / CPT</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Detected</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((claim) => (
              <TableRow key={claim.id} className="hover-elevate">
                <TableCell>
                  <p className="font-medium font-mono text-sm">
                    {claim.claimId}
                  </p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-sm">{claim.providerName}</p>
                  <p className="text-xs text-muted-foreground">
                    {claim.patientName}
                  </p>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{claim.insurerName}</span>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex gap-1.5">
                      <Badge variant="outline" className="text-xs font-mono">
                        {claim.icdCode}
                      </Badge>
                      <Badge variant="outline" className="text-xs font-mono">
                        {claim.cptCode}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground max-w-[220px] truncate">
                      {claim.flagReason}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(claim.claimAmount)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 min-w-[100px]">
                    <Progress
                      value={claim.riskScore}
                      className={`w-14 h-2 ${getRiskProgressColor(claim.riskScore)}`}
                    />
                    <span
                      className={`text-sm font-semibold ${getRiskColor(claim.riskScore)}`}
                    >
                      {claim.riskScore}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={`text-xs whitespace-nowrap ${getCategoryBadgeClasses(claim.flagCategory)}`}
                  >
                    {CATEGORY_LABELS[claim.flagCategory] ?? claim.flagCategory}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    className={`text-xs whitespace-nowrap ${getStatusBadgeClasses(claim.status)}`}
                  >
                    {STATUS_LABELS[claim.status] ?? claim.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatDate(claim.detectedAt)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
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
    </div>
  );
}
