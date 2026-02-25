import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, NoResults } from "@/components/ui/empty-state";
import { 
  ArrowLeft,
  Search,
  Users,
  FileText,
  ChevronRight,
  Download,
  Plus,
  Building2,
  Phone,
  Mail,
  Calendar,
  Clock,
  FileCheck,
  MessageSquare,
  Filter,
  Eye,
  Send
} from "lucide-react";
import tachyHealthLogo from "@assets/logo.svg";

interface Provider {
  id: string;
  npi: string;
  name: string;
  specialty: string;
  contractStatus: "Active" | "Pending" | "Expired";
  networkTier: string;
  email: string | null;
  phone: string | null;
  lastContact?: string;
  memberCount: number;
}

interface Settlement {
  id: string;
  settlementNumber: string;
  providerId: string;
  providerName: string;
  period?: string;
  periodStart?: string;
  periodEnd?: string;
  status: "proposed" | "negotiating" | "agreed" | "finalized" | "disputed";
  proposedAmount: string;
  agreedAmount?: string | null;
  discrepancy?: number;
  createdAt?: string;
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

interface CommunicationLog {
  id: string;
  providerId: string;
  providerName: string;
  type: "Email" | "Phone" | "Meeting" | "Letter";
  subject: string;
  date?: string;
  createdAt?: string;
  status: "Sent" | "Received" | "Pending";
  assignee: string | null;
}

export default function ProviderRelations() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("directory");

  const { data: providers = [], isLoading: isLoadingProviders } = useQuery<Provider[]>({
    queryKey: ["/api/provider-relations/providers"],
  });

  const { data: settlements = [], isLoading: isLoadingSettlements } = useQuery<Settlement[]>({
    queryKey: ["/api/provider-relations/settlements"],
  });

  const { data: contracts = [], isLoading: isLoadingContracts } = useQuery<Contract[]>({
    queryKey: ["/api/provider-relations/contracts"],
  });

  const { data: communications = [], isLoading: isLoadingCommunications } = useQuery<CommunicationLog[]>({
    queryKey: ["/api/provider-relations/communications"],
  });

  const filteredProviders = providers.filter((provider) => {
    const matchesSearch = provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.npi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || provider.contractStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getContractStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
      case "active":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" data-testid={`badge-status-active`}>Active</Badge>;
      case "Pending":
      case "pending":
      case "Pending Renewal":
      case "Draft":
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" data-testid={`badge-status-pending`}>Pending</Badge>;
      case "Expired":
      case "expired":
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" data-testid={`badge-status-expired`}>Expired</Badge>;
      default:
        return <Badge variant="outline" data-testid={`badge-status-unknown`}>{status}</Badge>;
    }
  };

  const getSettlementStatusBadge = (status: string) => {
    switch (status) {
      case "finalized":
      case "agreed":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" data-testid={`badge-recon-status-completed`}>Completed</Badge>;
      case "negotiating":
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" data-testid={`badge-recon-status-inprogress`}>In Progress</Badge>;
      case "proposed":
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" data-testid={`badge-recon-status-pending`}>Pending</Badge>;
      case "disputed":
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" data-testid={`badge-recon-status-disputed`}>Disputed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCommunicationIcon = (type: string) => {
    switch (type) {
      case "Email":
        return <Mail className="h-4 w-4 text-blue-500" />;
      case "Phone":
        return <Phone className="h-4 w-4 text-green-500" />;
      case "Meeting":
        return <Calendar className="h-4 w-4 text-purple-500" />;
      case "Letter":
        return <FileText className="h-4 w-4 text-amber-500" />;
      default:
        return null;
    }
  };

  const totalProviders = providers.length;
  const activeContracts = contracts.filter(c => c.status === "active" || c.status === "Active").length;
  const pendingReconciliations = settlements.filter(r => r.status === "proposed" || r.status === "negotiating").length;
  const pendingCommunications = communications.filter(c => c.status === "Pending").length;

  const isLoadingStats = isLoadingProviders || isLoadingContracts || isLoadingSettlements || isLoadingCommunications;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (amount?: string | number | null) => {
    if (!amount) return "-";
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return `$${numAmount.toLocaleString()}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <img 
              src={tachyHealthLogo} 
              alt="TachyHealth" 
              className="h-8 cursor-pointer"
              onClick={() => setLocation("/")}
              data-testid="img-header-logo"
            />
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h1 className="font-semibold">Provider Relations</h1>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="gap-2"
            data-testid="button-back-home"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </header>

      <div className="container px-6 py-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold" data-testid="text-page-title">Provider Relations</h2>
            <p className="text-muted-foreground">
              Manage provider relationships, contracts, and reconciliation workflows
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Providers</p>
                  {isLoadingStats ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold" data-testid="text-total-providers">{totalProviders}</p>
                  )}
                  <p className="text-xs text-muted-foreground">in network</p>
                </div>
                <div className="p-3 rounded-full bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Contracts</p>
                  {isLoadingStats ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold" data-testid="text-active-contracts">{activeContracts}</p>
                  )}
                  <p className="text-xs text-green-600">all compliant</p>
                </div>
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                  <FileCheck className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Reconciliations</p>
                  {isLoadingStats ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold" data-testid="text-pending-reconciliations">{pendingReconciliations}</p>
                  )}
                  <p className="text-xs text-amber-600">requires action</p>
                </div>
                <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Communications</p>
                  {isLoadingStats ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold" data-testid="text-pending-communications">{pendingCommunications}</p>
                  )}
                  <p className="text-xs text-muted-foreground">to follow up</p>
                </div>
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="directory" data-testid="tab-directory">
              <Users className="h-4 w-4 mr-2" />
              Provider Directory
            </TabsTrigger>
            <TabsTrigger value="reconciliation" data-testid="tab-reconciliation">
              <FileText className="h-4 w-4 mr-2" />
              Reconciliation Reports
            </TabsTrigger>
            <TabsTrigger value="contracts" data-testid="tab-contracts">
              <FileCheck className="h-4 w-4 mr-2" />
              Contract Management
            </TabsTrigger>
            <TabsTrigger value="communications" data-testid="tab-communications">
              <MessageSquare className="h-4 w-4 mr-2" />
              Communication Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="directory" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                <CardTitle>Provider Directory</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search providers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-64"
                      data-testid="input-provider-search"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36" data-testid="select-status-filter">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingProviders ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <Card key={i}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="space-y-2">
                              <Skeleton className="h-5 w-48" />
                              <Skeleton className="h-4 w-24" />
                            </div>
                            <Skeleton className="h-6 w-16" />
                          </div>
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-28" />
                            <Skeleton className="h-4 w-40" />
                          </div>
                          <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                            <Skeleton className="h-8 flex-1" />
                            <Skeleton className="h-8 flex-1" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : filteredProviders.length === 0 ? (
                  searchQuery || statusFilter !== "all" ? (
                    <NoResults 
                      searchTerm={searchQuery} 
                      onClearSearch={() => { setSearchQuery(""); setStatusFilter("all"); }}
                      entityName="providers"
                    />
                  ) : (
                    <EmptyState
                      variant="no-data"
                      icon={Users}
                      title="No providers yet"
                      description="Add providers to your network to manage relationships and contracts."
                    />
                  )
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProviders.map((provider) => (
                      <Card 
                        key={provider.id} 
                        className="hover-elevate cursor-pointer"
                        data-testid={`card-provider-${provider.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold" data-testid={`text-provider-name-${provider.id}`}>{provider.name}</h3>
                              <p className="text-sm text-muted-foreground">{provider.npi || provider.id}</p>
                            </div>
                            {getContractStatusBadge(provider.contractStatus)}
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Building2 className="h-3 w-3" />
                              <span>{provider.specialty}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Users className="h-3 w-3" />
                              <span>{(provider.memberCount || 0).toLocaleString()} members</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-3 w-3" />
                              <span className="truncate">{provider.email || "No email"}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 gap-1"
                              data-testid={`button-view-details-${provider.id}`}
                            >
                              <Eye className="h-3 w-3" />
                              View Details
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1 gap-1"
                              data-testid={`button-send-comm-${provider.id}`}
                            >
                              <Send className="h-3 w-3" />
                              Send Communication
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reconciliation" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                <CardTitle>Reconciliation Reports</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2" data-testid="button-export-reports">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                  <Button size="sm" className="gap-2" data-testid="button-generate-report">
                    <Plus className="h-4 w-4" />
                    Generate Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingSettlements ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Report ID</TableHead>
                        <TableHead>Report Name</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Discrepancy</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Created</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : settlements.length === 0 ? (
                  <EmptyState
                    variant="no-data"
                    icon={FileText}
                    title="No reconciliation reports yet"
                    description="Generate settlement reports to track provider reconciliations."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Report ID</TableHead>
                        <TableHead>Report Name</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Discrepancy</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Created</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {settlements.map((settlement) => (
                        <TableRow 
                          key={settlement.id} 
                          className="cursor-pointer hover-elevate"
                          data-testid={`row-report-${settlement.id}`}
                        >
                          <TableCell className="font-medium">{settlement.settlementNumber || settlement.id}</TableCell>
                          <TableCell>Settlement Report</TableCell>
                          <TableCell>{settlement.providerName}</TableCell>
                          <TableCell>{settlement.period || `${formatDate(settlement.periodStart)} - ${formatDate(settlement.periodEnd)}`}</TableCell>
                          <TableCell className="text-right">{formatCurrency(settlement.proposedAmount)}</TableCell>
                          <TableCell className="text-right">
                            {settlement.discrepancy && settlement.discrepancy > 0 ? (
                              <span className="text-amber-600">{formatCurrency(settlement.discrepancy)}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{getSettlementStatusBadge(settlement.status)}</TableCell>
                          <TableCell className="text-right">{formatDate(settlement.createdAt)}</TableCell>
                          <TableCell>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contracts" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                <CardTitle>Contract Management</CardTitle>
                <Button size="sm" className="gap-2" data-testid="button-new-contract">
                  <Plus className="h-4 w-4" />
                  New Contract
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingContracts ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contract ID</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...Array(4)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : contracts.length === 0 ? (
                  <EmptyState
                    variant="no-data"
                    icon={FileCheck}
                    title="No contracts yet"
                    description="Create contracts to formalize provider agreements."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contract ID</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contracts.map((contract) => (
                        <TableRow 
                          key={contract.id} 
                          className="cursor-pointer hover-elevate"
                          data-testid={`row-contract-${contract.id}`}
                        >
                          <TableCell className="font-medium">{contract.contractNumber || contract.id}</TableCell>
                          <TableCell>{contract.providerName}</TableCell>
                          <TableCell>{contract.contractType}</TableCell>
                          <TableCell>{formatDate(contract.startDate)}</TableCell>
                          <TableCell>{formatDate(contract.endDate)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(contract.value)}</TableCell>
                          <TableCell>{getContractStatusBadge(contract.status)}</TableCell>
                          <TableCell>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="communications" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                <CardTitle>Communication Log</CardTitle>
                <Button size="sm" className="gap-2" data-testid="button-new-communication">
                  <Plus className="h-4 w-4" />
                  New Communication
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingCommunications ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Assignee</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...Array(4)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : communications.length === 0 ? (
                  <EmptyState
                    variant="no-data"
                    icon={MessageSquare}
                    title="No communications yet"
                    description="Log communications with providers to track interactions."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Provider</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Assignee</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {communications.map((comm) => (
                        <TableRow 
                          key={comm.id} 
                          className="cursor-pointer hover-elevate"
                          data-testid={`row-communication-${comm.id}`}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getCommunicationIcon(comm.type)}
                              <span>{comm.type}</span>
                            </div>
                          </TableCell>
                          <TableCell>{comm.providerName}</TableCell>
                          <TableCell>{comm.subject}</TableCell>
                          <TableCell>{formatDate(comm.date || comm.createdAt)}</TableCell>
                          <TableCell>{comm.assignee || "-"}</TableCell>
                          <TableCell>
                            <Badge 
                              className={
                                comm.status === "Sent" 
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : comm.status === "Received"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              }
                              data-testid={`badge-comm-status-${comm.id}`}
                            >
                              {comm.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
