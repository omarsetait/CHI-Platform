import { useParams } from "wouter";
import { usePersona } from "@/hooks/use-persona";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { EntityHeader } from "@/components/portal/entity-header";
import { DataTable, type Column } from "@/components/portal/data-table";
import {
  Building2,
  ShieldCheck,
  AlertTriangle,
  Users,
  CalendarClock,
  DollarSign,
  FileWarning,
  Clock,
  UserCheck,
  UserX,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────

interface Employer {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
  crNumber: string;
  sector: string;
  sizeBand: string | null;
  employeeCount: number;
  insuredCount: number;
  pendingEnrollment: number | null;
  city: string;
  region: string;
  complianceStatus: string;
}

interface Policy {
  id: string;
  employerCode: string;
  insurerCode: string;
  insurerName: string;
  planTier: string;
  premiumPerEmployee: string;
  totalAnnualPremium: string | null;
  coverageStart: string;
  coverageEnd: string;
  dependentsCount: number | null;
  renewalDaysRemaining: number | null;
}

interface Violation {
  id: string;
  employerCode: string;
  violationType: string;
  description: string | null;
  fineAmountSar: string | null;
  status: string | null;
  issuedDate: string;
  resolvedDate: string | null;
}

interface EmployerProfileResponse {
  employer: Employer;
  policies: Policy[];
  violations: Violation[];
  summary: {
    totalAnnualPremium: number;
    totalDependents: number;
    nearestRenewalDays: number | null;
    openViolations: number;
  };
  generatedAt: string;
}

// ── Helpers ────────────────────────────────────────────────────────

function complianceStatusVariant(
  status: string
): "success" | "warning" | "danger" {
  switch (status) {
    case "compliant":
      return "success";
    case "action_required":
      return "warning";
    case "suspended":
      return "danger";
    default:
      return "warning";
  }
}

function complianceLabel(status: string): string {
  switch (status) {
    case "compliant":
      return "Compliant";
    case "action_required":
      return "Action Required";
    case "suspended":
      return "Suspended";
    default:
      return status;
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatSector(sector: string): string {
  return sector
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ── Violation table columns ────────────────────────────────────────

const violationColumns: Column<Violation>[] = [
  {
    key: "violationType",
    label: "Violation Type",
    sortable: true,
    render: (value: string) => (
      <span className="font-medium capitalize">
        {value.replace(/_/g, " ")}
      </span>
    ),
  },
  {
    key: "description",
    label: "Description",
    render: (value: string | null) => (
      <span className="text-muted-foreground">{value || "—"}</span>
    ),
  },
  {
    key: "fineAmountSar",
    label: "Fine (SAR)",
    align: "right",
    sortable: true,
    render: (value: string | null) =>
      value ? (
        <span className="font-bold text-red-600">
          {Number(value).toLocaleString()}
        </span>
      ) : (
        "—"
      ),
  },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (value: string | null) => {
      const s = value || "unknown";
      const color =
        s === "resolved"
          ? "bg-emerald-100 text-emerald-800"
          : s === "pending"
            ? "bg-amber-100 text-amber-800"
            : "bg-red-100 text-red-800";
      return (
        <Badge variant="outline" className={`text-xs capitalize ${color}`}>
          {s}
        </Badge>
      );
    },
  },
  {
    key: "issuedDate",
    label: "Issued Date",
    sortable: true,
    render: (value: string) => formatDate(value),
  },
];

// ── Main Component ─────────────────────────────────────────────────

export default function EmployerProfilePage() {
  const params = useParams<{ code: string }>();
  const [personaCode] = usePersona("business");
  const code = params.code || personaCode;

  const { data, isLoading } = useQuery<EmployerProfileResponse>({
    queryKey: ["/api/business/portal/employer", code],
    queryFn: () =>
      fetch(`/api/business/portal/employer/${code}`).then((r) => r.json()),
    enabled: !!code,
  });

  if (!code) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No employer code provided.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading employer profile...
      </div>
    );
  }

  if (!data?.employer) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Employer not found.
      </div>
    );
  }

  const { employer, policies, violations, summary } = data;
  const currentPolicy = policies[0];
  const insuredPercent =
    employer.employeeCount > 0
      ? Math.round((employer.insuredCount / employer.employeeCount) * 100)
      : 0;
  const pending = employer.pendingEnrollment ?? 0;

  const compVariant = complianceStatusVariant(employer.complianceStatus);

  return (
    <div className="space-y-6">
      {/* 1. EntityHeader */}
      <EntityHeader
        icon={Building2}
        name={employer.name}
        nameAr={employer.nameAr ?? undefined}
        identifiers={[
          { label: "CR", value: employer.crNumber },
          { label: "Sector", value: formatSector(employer.sector) },
          { label: "Location", value: `${employer.city}, ${employer.region}` },
        ]}
        status={{
          label: complianceLabel(employer.complianceStatus),
          variant: compVariant,
        }}
        pillarTheme="bg-green-50 text-green-600"
      />

      {/* 2. Large Compliance Status Banner */}
      <div
        className={`rounded-lg border p-4 flex items-center gap-3 ${
          compVariant === "success"
            ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800"
            : compVariant === "warning"
              ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
              : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
        }`}
      >
        <ShieldCheck
          className={`h-8 w-8 ${
            compVariant === "success"
              ? "text-emerald-600"
              : compVariant === "warning"
                ? "text-amber-600"
                : "text-red-600"
          }`}
        />
        <div>
          <h2
            className={`text-lg font-semibold ${
              compVariant === "success"
                ? "text-emerald-800 dark:text-emerald-300"
                : compVariant === "warning"
                  ? "text-amber-800 dark:text-amber-300"
                  : "text-red-800 dark:text-red-300"
            }`}
          >
            Compliance Status: {complianceLabel(employer.complianceStatus)}
          </h2>
          <p className="text-sm text-muted-foreground">
            {compVariant === "success"
              ? "This employer meets all CHI mandatory health insurance requirements."
              : compVariant === "warning"
                ? "This employer has pending compliance issues that require attention."
                : "This employer's insurance coverage has been suspended due to compliance violations."}
          </p>
        </div>
      </div>

      {/* 3. Employee Coverage Summary */}
      <Card className="border-l-4 border-l-green-500 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-green-600" />
            Employee Coverage Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">
                  Total Employees
                </p>
                <p className="text-xl font-bold">
                  {employer.employeeCount.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
              <UserCheck className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-xs text-muted-foreground">Insured</p>
                <p className="text-xl font-bold">
                  {employer.insuredCount.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
              <UserX className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">
                  Pending Enrollment
                </p>
                <p className="text-xl font-bold">{pending.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Coverage Progress</span>
              <span className="font-medium">{insuredPercent}% Insured</span>
            </div>
            <Progress value={insuredPercent} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* 4. Current Policy Card */}
      {currentPolicy && (
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-5 w-5 text-green-600" />
              Current Policy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Insurer</p>
                <p className="font-semibold">{currentPolicy.insurerName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Plan Tier</p>
                <Badge variant="secondary" className="mt-0.5">
                  {currentPolicy.planTier}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Premium / Employee
                </p>
                <p className="font-semibold">
                  {Number(currentPolicy.premiumPerEmployee).toLocaleString()}{" "}
                  SAR
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Total Annual Premium
                </p>
                <p className="font-semibold">
                  {summary.totalAnnualPremium.toLocaleString()} SAR
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Coverage Period</p>
                <p className="font-semibold text-sm">
                  {formatDate(currentPolicy.coverageStart)} -{" "}
                  {formatDate(currentPolicy.coverageEnd)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Dependents</p>
                <p className="font-semibold">
                  {summary.totalDependents.toLocaleString()}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">
                  Renewal Countdown
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <CalendarClock className="h-4 w-4 text-green-600" />
                  {summary.nearestRenewalDays != null ? (
                    <span
                      className={`font-semibold ${
                        summary.nearestRenewalDays <= 30
                          ? "text-red-600"
                          : summary.nearestRenewalDays <= 90
                            ? "text-amber-600"
                            : "text-emerald-600"
                      }`}
                    >
                      {summary.nearestRenewalDays} days remaining
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. Pending Enrollment Alert */}
      {pending > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4">
          <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-300">
              {pending.toLocaleString()} employee
              {pending !== 1 ? "s" : ""} missing coverage
            </p>
            <p className="text-sm text-muted-foreground">
              These employees are not yet enrolled in the employer health
              insurance plan. Enrollment is mandatory under CHI regulations.
            </p>
          </div>
        </div>
      )}

      {/* 6. Violation History */}
      {violations.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileWarning className="h-5 w-5 text-red-500" />
              Violation History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={violationColumns}
              data={violations}
              searchable
              searchPlaceholder="Search violations..."
              pageSize={5}
            />
          </CardContent>
        </Card>
      )}

      {/* Footer timestamp */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-2">
        <Clock className="h-3 w-3" />
        Data generated: {formatDate(data.generatedAt)}
      </div>
    </div>
  );
}
