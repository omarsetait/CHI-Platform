import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
  ArrowLeft,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Download,
  Send,
  Calendar,
  Printer,
  Archive,
  Users,
  FileSpreadsheet,
  Eye,
  ChevronRight,
  Package,
  Inbox
} from "lucide-react";
import tachyHealthLogo from "@assets/logo.svg";

interface TriggerCategory {
  id: string;
  category: string;
  riskLevel: "high" | "medium" | "low";
  claimCount: number;
  value: number;
  status: "open" | "pending" | "resolved";
}

interface PackageItem {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  required: boolean;
}

interface SettlementData {
  id: string;
  providerId: string;
  providerName: string;
  period: string;
  totalBilled: number;
  totalBilledClaims: number;
  totalApproved: number;
  approvalRate: number;
  totalRejected: number;
  rejectedClaims: number;
  netSettlement: number;
  status: string;
  triggers: TriggerCategory[];
}

interface ProviderOption {
  id: string;
  providerId: string;
  providerName: string;
  name?: string;
}

const initialPackageItems: PackageItem[] = [
  { id: "PKG-001", label: "Executive Summary Report", description: "High-level overview of settlement items", checked: true, required: true },
  { id: "PKG-002", label: "CPM Analysis with Peer Comparison", description: "Cost per member benchmarking data", checked: true, required: true },
  { id: "PKG-003", label: "Rejected Claims Detail", description: "Line-by-line rejected claims breakdown", checked: true, required: true },
  { id: "PKG-004", label: "Supporting Attachments", description: "All relevant claim documentation", checked: true, required: false },
  { id: "PKG-005", label: "Code Validation Report", description: "Service code matching analysis", checked: true, required: false },
  { id: "PKG-006", label: "YoY Trend Analysis", description: "Year-over-year performance comparison", checked: true, required: false },
  { id: "PKG-007", label: "Contract Terms Reference", description: "Applicable contract terms and rates", checked: false, required: false },
  { id: "PKG-008", label: "Previous Settlement History", description: "Historical settlement records", checked: false, required: false },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function CommercialSettlement() {
  const [, setLocation] = useLocation();
  const [providerFilter, setProviderFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("q4-2024");
  const [packageItems, setPackageItems] = useState(initialPackageItems);

  const { data: settlementData, isLoading: isLoadingSettlement } = useQuery<SettlementData>({
    queryKey: ["/api/provider-relations/settlements", providerFilter, periodFilter],
  });

  const { data: providersData, isLoading: isLoadingProviders } = useQuery<ProviderOption[]>({
    queryKey: ["/api/demo/providers"],
  });

  const totalBilled = settlementData?.totalBilled ?? 0;
  const totalBilledClaims = settlementData?.totalBilledClaims ?? 0;
  const totalApproved = settlementData?.totalApproved ?? 0;
  const approvalRate = settlementData?.approvalRate ?? 0;
  const totalRejected = settlementData?.totalRejected ?? 0;
  const rejectedClaims = settlementData?.rejectedClaims ?? 0;
  const netSettlement = settlementData?.netSettlement ?? 0;
  const triggers = settlementData?.triggers ?? [];

  const togglePackageItem = (id: string) => {
    setPackageItems((items) =>
      items.map((item) =>
        item.id === id && !item.required
          ? { ...item, checked: !item.checked }
          : item
      )
    );
  };

  const getRiskDot = (level: TriggerCategory["riskLevel"]) => {
    switch (level) {
      case "high":
        return <div className="w-3 h-3 rounded-full bg-red-500" />;
      case "medium":
        return <div className="w-3 h-3 rounded-full bg-amber-500" />;
      case "low":
        return <div className="w-3 h-3 rounded-full bg-green-500" />;
    }
  };

  const getStatusBadge = (status: TriggerCategory["status"]) => {
    switch (status) {
      case "open":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30" data-testid="badge-trigger-status-open">
            Open
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30" data-testid="badge-trigger-status-pending">
            Pending
          </Badge>
        );
      case "resolved":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30" data-testid="badge-trigger-status-resolved">
            Resolved
          </Badge>
        );
    }
  };

  const isLoading = isLoadingSettlement || isLoadingProviders;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={tachyHealthLogo} alt="TachyHealth" className="h-8" />
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-semibold">Commercial Settlement</h1>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setLocation("/provider-relation")}
              data-testid="button-back-to-dashboard"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button
            onClick={() => setLocation("/provider-relation")}
            className="hover:text-foreground"
            data-testid="link-provider-dashboard"
          >
            Provider Relation
          </button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">Commercial Settlement</span>
        </div>

        <div>
          <h2 className="text-lg font-medium">Prepare reconciliation packages for provider negotiations</h2>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="w-[240px]" data-testid="select-provider">
              <SelectValue placeholder="Select Provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Providers</SelectItem>
              {providersData?.map((provider) => (
                <SelectItem key={provider.providerId || provider.id} value={provider.providerId || provider.id}>
                  {provider.providerName || provider.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-period">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="q4-2024">Q4 2024</SelectItem>
              <SelectItem value="q3-2024">Q3 2024</SelectItem>
              <SelectItem value="q2-2024">Q2 2024</SelectItem>
              <SelectItem value="q1-2024">Q1 2024</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Billed</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <>
                      <p className="text-2xl font-bold" data-testid="text-total-billed">{formatCurrency(totalBilled)}</p>
                      <p className="text-xs text-muted-foreground">{totalBilledClaims} claims</p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Approved</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-green-600" data-testid="text-total-approved">{formatCurrency(totalApproved)}</p>
                      <p className="text-xs text-green-600">{approvalRate}% approval rate</p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Rejected</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-red-600" data-testid="text-total-rejected">{formatCurrency(totalRejected)}</p>
                      <p className="text-xs text-red-600">{rejectedClaims} claims</p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Settlement</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <>
                      <p className="text-2xl font-bold" data-testid="text-net-settlement">{formatCurrency(netSettlement)}</p>
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs" data-testid="badge-net-settlement-status">
                        {settlementData?.status || "Pending"}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reconciliation Triggers for Negotiation</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : triggers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Inbox className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Triggers Found</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  No reconciliation triggers found for the selected provider and period.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Claims</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {triggers.map((trigger) => (
                    <TableRow key={trigger.id} className="hover-elevate" data-testid={`row-trigger-${trigger.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {getRiskDot(trigger.riskLevel)}
                          <span className="font-medium">{trigger.category}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-trigger-claims-${trigger.id}`}>{trigger.claimCount}</TableCell>
                      <TableCell className="text-right font-medium" data-testid={`text-trigger-value-${trigger.id}`}>{formatCurrency(trigger.value)}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm" data-testid={`button-review-${trigger.id}`}>
                          Review
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </TableCell>
                      <TableCell>{getStatusBadge(trigger.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="text-lg">Documentation Package Builder</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" data-testid="button-preview-package">
                <Eye className="w-4 h-4 mr-2" />
                Preview Package
              </Button>
              <Button variant="outline" size="sm" data-testid="button-download-all-docs">
                <Download className="w-4 h-4 mr-2" />
                Download All
              </Button>
              <Button size="sm" data-testid="button-send-to-provider">
                <Send className="w-4 h-4 mr-2" />
                Send to Provider
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {packageItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg border hover-elevate"
                  data-testid={`package-item-${item.id}`}
                >
                  <Checkbox
                    id={item.id}
                    checked={item.checked}
                    onCheckedChange={() => togglePackageItem(item.id)}
                    disabled={item.required}
                    data-testid={`checkbox-${item.id}`}
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={item.id}
                      className="text-sm font-medium cursor-pointer flex items-center gap-2"
                    >
                      {item.label}
                      {item.required && (
                        <Badge variant="secondary" className="text-xs">Required</Badge>
                      )}
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Button variant="outline" className="flex flex-col h-auto py-4 gap-2" data-testid="button-generate-report">
                <FileText className="w-5 h-5" />
                <span className="text-xs">Generate Report</span>
              </Button>
              <Button variant="outline" className="flex flex-col h-auto py-4 gap-2" data-testid="button-schedule-meeting">
                <Calendar className="w-5 h-5" />
                <span className="text-xs">Schedule Meeting</span>
              </Button>
              <Button variant="outline" className="flex flex-col h-auto py-4 gap-2" data-testid="button-create-agreement">
                <Users className="w-5 h-5" />
                <span className="text-xs">Create Agreement</span>
              </Button>
              <Button variant="outline" className="flex flex-col h-auto py-4 gap-2" data-testid="button-export-excel">
                <FileSpreadsheet className="w-5 h-5" />
                <span className="text-xs">Export to Excel</span>
              </Button>
              <Button variant="outline" className="flex flex-col h-auto py-4 gap-2" data-testid="button-print-summary">
                <Printer className="w-5 h-5" />
                <span className="text-xs">Print Summary</span>
              </Button>
              <Button variant="outline" className="flex flex-col h-auto py-4 gap-2" data-testid="button-archive-period">
                <Archive className="w-5 h-5" />
                <span className="text-xs">Archive Period</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
