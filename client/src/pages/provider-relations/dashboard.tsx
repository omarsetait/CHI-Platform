import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  FileCheck,
  Clock,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Users,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";

interface DashboardStats {
  totalProviders: number;
  activeContracts: number;
  pendingSettlements: number;
  pendingSettlementValue: number;
  openFindings: number;
  scheduledSessions: number;
  draftReports: number;
  avgCpm: string;
  avgDenialRate: string;
}

interface Settlement {
  id: string;
  settlementNumber: string;
  providerId: string;
  providerName: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  proposedAmount: string | null;
  agreedAmount: string | null;
  discrepancyAmount: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Contract {
  id: string;
  contractNumber: string;
  providerId: string;
  providerName: string;
  contractType: string;
  startDate: string;
  endDate: string;
  status: string;
  value: string | null;
}

interface Communication {
  id: string;
  providerId: string;
  providerName: string;
  type: string;
  subject: string;
  status: string;
  date: string;
  assignee: string | null;
}

function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  iconBgClass,
  iconClass,
  isLoading,
}: {
  title: string;
  value: number | string;
  description: string;
  icon: React.ElementType;
  trend?: { value: number; isPositive: boolean };
  iconBgClass?: string;
  iconClass?: string;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card data-testid={`stats-card-${title.toLowerCase().replace(/\s+/g, "-")}`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-12 w-12 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid={`stats-card-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className={`p-3 rounded-lg ${iconBgClass || "bg-primary/10"}`}>
            <Icon className={`w-5 h-5 ${iconClass || "text-primary"}`} />
          </div>
        </div>
        {trend && (
          <div className={`mt-2 flex items-center gap-1 text-xs ${trend.isPositive ? "text-green-600" : "text-red-600"}`}>
            {trend.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.isPositive ? "+" : "-"}{trend.value}% from last month
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ProviderRelationsDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/provider-relations/stats"],
  });

  const { data: settlements = [], isLoading: settlementsLoading } = useQuery<Settlement[]>({
    queryKey: ["/api/provider-relations/settlements"],
  });

  const { data: contracts = [], isLoading: contractsLoading } = useQuery<Contract[]>({
    queryKey: ["/api/provider-relations/contracts"],
  });

  const { data: communications = [], isLoading: communicationsLoading } = useQuery<Communication[]>({
    queryKey: ["/api/provider-relations/communications"],
  });

  const totalProviders = stats?.totalProviders ?? 0;
  const activeContracts = contracts.filter(c => c.status === "active").length || stats?.activeContracts || 0;
  const pendingReconciliations = settlements.filter(s => s.status === "proposed" || s.status === "negotiating").length || stats?.pendingSettlements || 0;
  const totalContractValue = contracts.reduce((sum, c) => sum + (c.value ? parseFloat(c.value) : 0), 0);
  const avgCpm = stats?.avgCpm ? parseFloat(stats.avgCpm) : 1245;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
      case "Active":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</Badge>;
      case "proposed":
      case "Pending":
      case "Pending Renewal":
      case "negotiating":
      case "In Progress":
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Pending</Badge>;
      case "expired":
      case "Expired":
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Expired</Badge>;
      case "finance_approved":
      case "Completed":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Completed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatPeriod = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[start.getMonth()]}-${months[end.getMonth()]} ${end.getFullYear()}`;
  };

  const recentSettlements = settlements.slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Provider Relations Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of provider network, contracts, and relationship management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild data-testid="button-view-providers">
            <Link href="/provider-relations/providers">
              <Users className="w-4 h-4 mr-2" />
              View Providers
            </Link>
          </Button>
          <Button asChild data-testid="button-new-provider">
            <Link href="/provider-relations/providers">
              <Building2 className="w-4 h-4 mr-2" />
              Add Provider
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Providers"
          value={totalProviders}
          description="In network"
          icon={Building2}
          trend={{ value: 12, isPositive: true }}
          isLoading={statsLoading}
        />
        <StatsCard
          title="Active Contracts"
          value={activeContracts}
          description="All compliant"
          icon={FileCheck}
          iconBgClass="bg-green-100 dark:bg-green-900/30"
          iconClass="text-green-600"
          isLoading={statsLoading || contractsLoading}
        />
        <StatsCard
          title="Pending Reconciliations"
          value={pendingReconciliations}
          description="Requires action"
          icon={Clock}
          iconBgClass="bg-amber-100 dark:bg-amber-900/30"
          iconClass="text-amber-600"
          isLoading={statsLoading || settlementsLoading}
        />
        <StatsCard
          title="Avg CPM"
          value={`$${avgCpm.toLocaleString()}`}
          description="Cost per member"
          icon={DollarSign}
          trend={{ value: 5.2, isPositive: false }}
          iconBgClass="bg-blue-100 dark:bg-blue-900/30"
          iconClass="text-blue-600"
          isLoading={statsLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-lg">Recent Reconciliations</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/provider-relations/reconciliation">
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {settlementsLoading ? (
                <div className="space-y-0">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 border-b">
                      <div className="flex items-center gap-4">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentSettlements.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No reconciliation reports</p>
                  <p className="text-sm">Create a settlement report to get started</p>
                </div>
              ) : (
                recentSettlements.map((settlement) => (
                  <div
                    key={settlement.id}
                    className="flex items-center justify-between p-4 border-b hover-elevate cursor-pointer"
                    data-testid={`recon-row-${settlement.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="font-medium text-sm">{settlement.providerName}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatPeriod(settlement.periodStart, settlement.periodEnd)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">
                        ${settlement.proposedAmount ? parseFloat(settlement.proposedAmount).toLocaleString() : "0"}
                      </span>
                      {settlement.discrepancyAmount && parseFloat(settlement.discrepancyAmount) > 0 && (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          ${parseFloat(settlement.discrepancyAmount).toLocaleString()} discrepancy
                        </Badge>
                      )}
                      {getStatusBadge(settlement.status)}
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Contract Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contractsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-8" />
                      </div>
                      <Skeleton className="h-2 w-full" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Active Contracts</span>
                      <span className="font-medium">{contracts.filter(c => c.status === "active").length}</span>
                    </div>
                    <Progress value={contracts.length > 0 ? (contracts.filter(c => c.status === "active").length / contracts.length) * 100 : 0} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Pending Renewal</span>
                      <span className="font-medium">{contracts.filter(c => c.status === "pending_renewal").length}</span>
                    </div>
                    <Progress value={contracts.length > 0 ? (contracts.filter(c => c.status === "pending_renewal").length / contracts.length) * 100 : 0} className="h-2 [&>div]:bg-amber-500" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Expired</span>
                      <span className="font-medium">{contracts.filter(c => c.status === "expired").length}</span>
                    </div>
                    <Progress value={contracts.length > 0 ? (contracts.filter(c => c.status === "expired").length / contracts.length) * 100 : 0} className="h-2 [&>div]:bg-red-500" />
                  </div>
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Contract Value</span>
                      <span className="font-bold">${(totalContractValue / 1000000).toFixed(1)}M</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/provider-relations/reconciliation">
                  <FileCheck className="w-4 h-4 mr-2" />
                  Generate Settlement Report
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/provider-relations/contracts">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  Review Pending Contracts
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/provider-relations/communications">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  View Communications
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
