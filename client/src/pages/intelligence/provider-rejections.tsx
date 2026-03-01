import { useState } from "react";
import { useParams } from "wouter";
import { usePersona } from "@/hooks/use-persona";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/portal/data-table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  ShieldAlert,
  DollarSign,
  BarChart3,
  FileWarning,
  Lightbulb,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

interface RejectionRecord {
  id: string;
  providerCode: string;
  claimRef: string;
  patientMrn: string | null;
  icdCode: string;
  icdDescription: string | null;
  cptCode: string | null;
  cptDescription: string | null;
  denialReason: string;
  denialCategory: string;
  amountSar: string;
  recommendation: string | null;
  claimDate: string;
  denialDate: string;
}

interface CategoryBreakdown {
  category: string;
  count: number;
  percent: number;
}

interface RejectionsResponse {
  totalRejections: number;
  totalAmountSar: number;
  categoryBreakdown: CategoryBreakdown[];
  rejections: RejectionRecord[];
  generatedAt: string;
}

interface ScorecardData {
  month: string;
  rejectionRate: string;
}

interface ProviderProfileResponse {
  currentScorecard: ScorecardData;
  scorecardHistory: ScorecardData[];
}

export default function ProviderRejectionsPage() {
  const params = useParams<{ code: string }>();
  const [personaCode] = usePersona("intelligence");
  const code = params.code || personaCode;
  const [selectedRejection, setSelectedRejection] =
    useState<RejectionRecord | null>(null);

  const { data, isLoading } = useQuery<RejectionsResponse>({
    queryKey: ["/api/intelligence/portal/provider", code, "rejections"],
    queryFn: () =>
      fetch(`/api/intelligence/portal/provider/${code}/rejections`).then((r) =>
        r.json()
      ),
    enabled: !!code,
  });

  // Also fetch scorecard history for the monthly rejection trend
  const { data: profileData } = useQuery<ProviderProfileResponse>({
    queryKey: ["/api/intelligence/portal/provider", code],
    queryFn: () =>
      fetch(`/api/intelligence/portal/provider/${code}`).then((r) => r.json()),
    enabled: !!code,
  });

  if (!code) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        No provider code specified.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading rejection data...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        No rejection data available.
      </div>
    );
  }

  const { totalRejections, totalAmountSar, categoryBreakdown, rejections } =
    data;

  // Calculate rejection rate from profile data if available
  const currentRejectionRate = profileData?.currentScorecard
    ? Number(profileData.currentScorecard.rejectionRate)
    : null;

  // Monthly rejection trend from scorecard history
  const monthlyTrend = profileData?.scorecardHistory?.map((s) => ({
    month: s.month,
    rate: Number(s.rejectionRate),
  }));

  // Horizontal bar chart data for category breakdown
  const barData = categoryBreakdown.map((c) => ({
    category: c.category,
    count: c.count,
    percent: c.percent,
  }));

  // Table columns
  const columns: Column<RejectionRecord>[] = [
    {
      key: "claimRef",
      label: "Claim Ref",
      sortable: true,
      render: (val: string) => (
        <span className="font-mono text-xs font-medium">{val}</span>
      ),
    },
    {
      key: "claimDate",
      label: "Claim Date",
      sortable: true,
      render: (val: string) => (
        <span className="text-xs">
          {new Date(val).toLocaleDateString("en-SA")}
        </span>
      ),
    },
    {
      key: "icdCode",
      label: "ICD Code",
      sortable: true,
      render: (val: string) => (
        <Badge variant="outline" className="font-mono text-xs">
          {val}
        </Badge>
      ),
    },
    {
      key: "icdDescription",
      label: "ICD Description",
      sortable: false,
      render: (val: string | null) => (
        <span className="text-xs truncate max-w-[200px] block">
          {val || "—"}
        </span>
      ),
    },
    {
      key: "denialCategory",
      label: "Category",
      sortable: true,
      render: (val: string) => (
        <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
          {val}
        </Badge>
      ),
    },
    {
      key: "amountSar",
      label: "Amount (SAR)",
      sortable: true,
      align: "right" as const,
      render: (val: string) => (
        <span className="font-medium text-xs">
          {Number(val).toLocaleString()} SAR
        </span>
      ),
    },
    {
      key: "denialReason",
      label: "Reason",
      sortable: false,
      render: (val: string) => (
        <span className="text-xs truncate max-w-[250px] block">{val}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShieldAlert className="h-7 w-7 text-blue-500" />
          Rejection Deep-Dive
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Detailed rejection analysis for provider {code}
        </p>
      </div>

      {/* 1. Summary Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-rose-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Rejections
                </p>
                <p className="text-3xl font-bold text-rose-600">
                  {totalRejections.toLocaleString()}
                </p>
              </div>
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-rose-50 text-rose-500">
                <FileWarning className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Rejection Rate
                </p>
                <p className="text-3xl font-bold text-amber-600">
                  {currentRejectionRate != null
                    ? `${currentRejectionRate.toFixed(1)}%`
                    : "—"}
                </p>
              </div>
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-amber-50 text-amber-500">
                <BarChart3 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total SAR at Risk
                </p>
                <p className="text-3xl font-bold text-orange-600">
                  {totalAmountSar.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">SAR</p>
              </div>
              <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-orange-50 text-orange-500">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. Denial Category Breakdown — Horizontal Bar Chart */}
      {barData.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Denial Category Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(200, barData.length * 45)}>
              <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e2e8f0"
                  horizontal={false}
                />
                <XAxis type="number" tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis
                  dataKey="category"
                  type="category"
                  width={160}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                />
                <Tooltip
                  formatter={(value: number, _name: string, props: any) => [
                    `${value} (${props.payload.percent}%)`,
                    "Rejections",
                  ]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#3b82f6"
                  radius={[0, 4, 4, 0]}
                  barSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 3. DataTable of Individual Rejections */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Rejected Claims</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={rejections}
            searchable
            searchPlaceholder="Search claims by ref, ICD, category..."
            onRowClick={(row) => setSelectedRejection(row)}
            pageSize={10}
          />
        </CardContent>
      </Card>

      {/* 4. Monthly Rejection Trend */}
      {monthlyTrend && monthlyTrend.length > 1 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Monthly Rejection Rate Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                />
                <YAxis
                  domain={[0, "auto"]}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  formatter={(value: number) => [
                    `${value.toFixed(1)}%`,
                    "Rejection Rate",
                  ]}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#ef4444" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Slide-over Sheet for Claim Details */}
      <Sheet
        open={!!selectedRejection}
        onOpenChange={(open) => {
          if (!open) setSelectedRejection(null);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileWarning className="h-5 w-5 text-rose-500" />
              Claim Details
            </SheetTitle>
            <SheetDescription>
              {selectedRejection?.claimRef}
            </SheetDescription>
          </SheetHeader>

          {selectedRejection && (
            <div className="mt-6 space-y-5">
              {/* Claim Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Claim Information
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Claim Ref</span>
                    <p className="font-mono font-medium">
                      {selectedRejection.claimRef}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Patient MRN</span>
                    <p className="font-medium">
                      {selectedRejection.patientMrn || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Claim Date</span>
                    <p className="font-medium">
                      {new Date(selectedRejection.claimDate).toLocaleDateString(
                        "en-SA"
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Denial Date</span>
                    <p className="font-medium">
                      {new Date(
                        selectedRejection.denialDate
                      ).toLocaleDateString("en-SA")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Diagnosis & Procedure */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Diagnosis & Procedure
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">ICD Code</span>
                    <p className="font-medium">
                      <Badge
                        variant="outline"
                        className="font-mono mr-2"
                      >
                        {selectedRejection.icdCode}
                      </Badge>
                      {selectedRejection.icdDescription}
                    </p>
                  </div>
                  {selectedRejection.cptCode && (
                    <div>
                      <span className="text-muted-foreground">CPT Code</span>
                      <p className="font-medium">
                        <Badge
                          variant="outline"
                          className="font-mono mr-2"
                        >
                          {selectedRejection.cptCode}
                        </Badge>
                        {selectedRejection.cptDescription}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Denial Details */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Denial Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Category</span>
                    <p>
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200">
                        {selectedRejection.denialCategory}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Amount</span>
                    <p className="font-bold text-lg">
                      {Number(selectedRejection.amountSar).toLocaleString()} SAR
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Denial Reason</span>
                    <p className="leading-relaxed">
                      {selectedRejection.denialReason}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recommendation */}
              {selectedRejection.recommendation && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Recommendation
                  </h3>
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-blue-800 leading-relaxed">
                        {selectedRejection.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
