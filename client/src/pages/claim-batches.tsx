import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Search,
  ChevronRight,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Package,
  Inbox
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import tachyHealthLogo from "@assets/logo.svg";

interface ClaimBatch {
  id: string;
  submitDate: string;
  claimCount: number;
  amount: number;
  status: "approved" | "rejected" | "partial" | "pending";
  issueCount: number;
  approvedAmount?: number;
  rejectedAmount?: number;
}

interface RejectionReason {
  reason: string;
  count: number;
  percentage: number;
}

interface BatchesResponse {
  batches: ClaimBatch[];
  rejectionReasons: RejectionReason[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function ClaimBatches() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/provider-relation/:id/batches");
  const providerId = params?.id || "PR001";
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");

  const { data: batchesData, isLoading } = useQuery<BatchesResponse>({
    queryKey: ["/api/provider-relations/settlements", providerId, "batches"],
  });

  const batches = batchesData?.batches ?? [];
  const rejectionReasons = batchesData?.rejectionReasons ?? [];

  const filteredBatches = batches.filter((batch) => {
    const matchesSearch = batch.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || batch.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalBatches = batches.length;
  const totalValue = batches.reduce((sum, b) => sum + b.amount, 0);
  const approvedBatches = batches.filter((b) => b.status === "approved");
  const approvedCount = approvedBatches.length;
  const approvedPercentage = totalBatches > 0 ? Math.round((approvedCount / totalBatches) * 100) : 0;
  const rejectedBatches = batches.filter((b) => b.status === "rejected");
  const rejectedCount = rejectedBatches.length;
  const rejectedPercentage = totalBatches > 0 ? Math.round((rejectedCount / totalBatches) * 100) : 0;
  const pendingBatches = batches.filter((b) => b.status === "pending");
  const pendingCount = pendingBatches.length;
  const pendingValue = pendingBatches.reduce((sum, b) => sum + b.amount, 0);

  const getStatusBadge = (status: ClaimBatch["status"]) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30" data-testid="badge-batch-status-approved">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30" data-testid="badge-batch-status-rejected">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case "partial":
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30" data-testid="badge-batch-status-partial">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Partial
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-gray-500/10 text-gray-600 border-gray-500/30" data-testid="badge-batch-status-pending">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
    }
  };

  const barColors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-card border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={tachyHealthLogo} alt="TachyHealth" className="h-8" />
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-semibold">Claim Batches</h1>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setLocation(`/provider-relation/${providerId}`)}
              data-testid="button-back-to-provider"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Provider
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
          <button
            onClick={() => setLocation(`/provider-relation/${providerId}`)}
            className="hover:text-foreground"
            data-testid="link-provider-detail"
          >
            Provider Detail
          </button>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground font-medium">Claim Batches</span>
        </div>

        <div>
          <h2 className="text-lg font-medium">Review claim submissions by batch for reconciliation</h2>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search Batch ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-batch"
            />
          </div>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px]" data-testid="select-date-range">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Batches</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <p className="text-2xl font-bold" data-testid="text-total-batches">{totalBatches}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(totalValue)}</p>
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
                  <p className="text-sm text-muted-foreground">Approved</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-green-600" data-testid="text-approved-count">{approvedCount}</p>
                      <p className="text-xs text-green-600">{approvedPercentage}% of total</p>
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
                  <p className="text-sm text-muted-foreground">Rejected</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-red-600" data-testid="text-rejected-count">{rejectedCount}</p>
                      <p className="text-xs text-red-600">{rejectedPercentage}% of total</p>
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
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-amber-600" data-testid="text-pending-count">{pendingCount}</p>
                      <p className="text-xs text-amber-600">{formatCurrency(pendingValue)}</p>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
              <CardTitle className="text-lg">Batch List</CardTitle>
              <Button variant="outline" size="sm" data-testid="button-export-batches">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredBatches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Inbox className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Batches Found</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    No claim batches match your search criteria. Try adjusting your filters.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch ID</TableHead>
                      <TableHead>Submit Date</TableHead>
                      <TableHead className="text-right">Claims</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Issues</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBatches.map((batch) => (
                      <TableRow 
                        key={batch.id} 
                        className="hover-elevate cursor-pointer"
                        onClick={() => setLocation(`/provider-relation/${providerId}/batches/${batch.id}`)}
                        data-testid={`row-batch-${batch.id}`}
                      >
                        <TableCell className="font-medium">{batch.id}</TableCell>
                        <TableCell>{formatDate(batch.submitDate)}</TableCell>
                        <TableCell className="text-right">{batch.claimCount}</TableCell>
                        <TableCell className="text-right">{formatCurrency(batch.amount)}</TableCell>
                        <TableCell>{getStatusBadge(batch.status)}</TableCell>
                        <TableCell className="text-right">
                          {batch.issueCount > 0 ? (
                            <Badge variant="secondary">{batch.issueCount}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" data-testid={`button-view-batch-${batch.id}`}>
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rejection Reasons</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-[280px] w-full" />
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-6 w-full" />
                  ))}
                </div>
              ) : rejectionReasons.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle className="w-10 h-10 text-green-500 mb-4" />
                  <p className="text-sm text-muted-foreground">No rejection reasons to display</p>
                </div>
              ) : (
                <>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={rejectionReasons}
                        margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" />
                        <YAxis 
                          type="category" 
                          dataKey="reason" 
                          width={120}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip
                          formatter={(value: number) => [
                            `${value} claims`,
                            "Count"
                          ]}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                          {rejectionReasons.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 space-y-2">
                    {rejectionReasons.map((item, index) => (
                      <div key={item.reason} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-sm" 
                            style={{ backgroundColor: barColors[index % barColors.length] }}
                          />
                          <span className="text-muted-foreground truncate max-w-[140px]">
                            {item.reason.split(" ")[0]}
                          </span>
                        </div>
                        <span className="font-medium">{item.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
