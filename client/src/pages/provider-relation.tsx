import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
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
  Building2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Users,
  FileText,
  ChevronRight,
  Download,
  Bell,
  ArrowUpRight,
  Sparkles
} from "lucide-react";
import { AgenticWorkflowModal } from "@/components/agentic-workflow-modal";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import tachyHealthLogo from "@assets/logo.svg";

interface DemoProvider {
  id: string;
  providerId: string;
  providerName: string;
  providerType: string;
  specialty: string;
  organization: string;
  riskScore: string;
  riskLevel: string;
  totalClaims: number;
  flaggedClaims: number;
  denialRate: string;
  avgClaimAmount: string;
  totalExposure: string;
  claimsPerMonth: string;
  cpmTrend: string;
  cpmPeerAverage: string;
  fwaCaseCount: number;
  reasons: string[];
  lastFlaggedDate: string;
}

interface Provider {
  id: string;
  name: string;
  region: string;
  type: string;
  specialty: string;
  network: string;
  contractTier: string;
  cpm: number;
  cpmTrend: number;
  memberCount: number;
  claimCount: number;
  riskLevel: "high" | "medium" | "low";
  fraudCases: number;
  complaints: number;
  lastAudit: string;
  topPolicies: string[];
  services: string[];
  billingVariance: number;
}

interface Trigger {
  id: string;
  type: "warning" | "info" | "critical";
  title: string;
  description: string;
  providerId: string;
  providerName: string;
}

function mapDemoProviderToProvider(demo: DemoProvider): Provider {
  const riskScore = parseFloat(demo.riskScore);
  let riskLevel: "high" | "medium" | "low" = "low";
  if (riskScore >= 65) riskLevel = "high";
  else if (riskScore >= 40) riskLevel = "medium";

  const regions = ["Central", "Western", "Eastern", "Northern", "Southern"];
  const networks = ["Premium", "VIP", "Standard"];
  const tiers = ["Tier 1", "Tier 2", "Tier 3"];
  
  const hash = demo.id.split("").reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
  
  return {
    id: demo.providerId,
    name: demo.providerName,
    region: regions[Math.abs(hash) % regions.length],
    type: demo.providerType,
    specialty: demo.specialty,
    network: networks[Math.abs(hash) % networks.length],
    contractTier: tiers[Math.abs(hash) % tiers.length],
    cpm: parseFloat(demo.avgClaimAmount) || 1000,
    cpmTrend: parseFloat(demo.cpmTrend) || 0,
    memberCount: demo.totalClaims * 5,
    claimCount: demo.totalClaims,
    riskLevel,
    fraudCases: demo.fwaCaseCount,
    complaints: demo.flaggedClaims > 100 ? Math.floor(demo.flaggedClaims / 100) : 1,
    lastAudit: new Date(demo.lastFlaggedDate).toISOString().split("T")[0],
    topPolicies: ["Gold Plus", "Corporate Elite", "Family Care"],
    services: demo.providerType === "Hospital" 
      ? ["Inpatient", "Outpatient", "Emergency", "Lab", "Radiology"]
      : demo.providerType === "Pharmacy"
      ? ["Dispensing", "Consultation"]
      : ["Outpatient", "Lab"],
    billingVariance: Math.round((parseFloat(demo.denialRate) || 10) * 2 - 10),
  };
}

function generateTriggersFromProviders(providers: Provider[]): Trigger[] {
  const triggers: Trigger[] = [];
  
  providers.forEach((provider, index) => {
    if (provider.riskLevel === "high" && triggers.length < 4) {
      if (provider.billingVariance > 20) {
        triggers.push({
          id: `T${index + 1}01`,
          type: "critical",
          title: "High CPM Alert",
          description: `CPM ${provider.billingVariance}% above peer average`,
          providerId: provider.id,
          providerName: provider.name,
        });
      } else if (provider.fraudCases > 0) {
        triggers.push({
          id: `T${index + 1}02`,
          type: "warning",
          title: "Billing Anomaly",
          description: `${provider.fraudCases} FWA cases detected`,
          providerId: provider.id,
          providerName: provider.name,
        });
      }
    } else if (provider.riskLevel === "medium" && triggers.length < 4) {
      triggers.push({
        id: `T${index + 1}03`,
        type: "info",
        title: "Settlement Due",
        description: "Quarterly reconciliation pending",
        providerId: provider.id,
        providerName: provider.name,
      });
    }
  });
  
  return triggers.slice(0, 4);
}

const cpmTrendData = [
  { month: "Jan", current: 1180, previous: 1050 },
  { month: "Feb", current: 1220, previous: 1080 },
  { month: "Mar", current: 1195, previous: 1120 },
  { month: "Apr", current: 1280, previous: 1100 },
  { month: "May", current: 1310, previous: 1150 },
  { month: "Jun", current: 1290, previous: 1180 },
  { month: "Jul", current: 1350, previous: 1200 },
  { month: "Aug", current: 1420, previous: 1220 },
];

const billingVarianceData = [
  { type: "Hospitals", variance: 8.2, fill: "#28AAE2" },
  { type: "Clinics", variance: 4.1, fill: "#1863DC" },
  { type: "Pharmacies", variance: -2.3, fill: "#22C55E" },
  { type: "Labs", variance: 1.8, fill: "#F59E0B" },
];

export default function ProviderRelation() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [networkFilter, setNetworkFilter] = useState("all");
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);

  const { data: demoProviders = [], isLoading } = useQuery<DemoProvider[]>({
    queryKey: ["/api/demo/providers"],
  });

  const providers = demoProviders.map(mapDemoProviderToProvider);
  const triggers = generateTriggersFromProviders(providers);

  const filteredProviders = providers.filter((provider) => {
    const matchesSearch = provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = regionFilter === "all" || provider.region === regionFilter;
    const matchesType = typeFilter === "all" || provider.type === typeFilter;
    const matchesNetwork = networkFilter === "all" || provider.network === networkFilter;
    return matchesSearch && matchesRegion && matchesType && matchesNetwork;
  });

  const totalProviders = providers.length;
  const avgCPM = providers.length > 0 
    ? Math.round(providers.reduce((sum, p) => sum + p.cpm, 0) / providers.length)
    : 0;
  const flaggedProviders = providers.filter(p => p.riskLevel === "high").length;
  const pendingSettlements = 8;
  const pendingValue = 2.4;

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "high":
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">High</Badge>;
      case "medium":
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Medium</Badge>;
      case "low":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Low</Badge>;
      default:
        return null;
    }
  };

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case "info":
        return <Bell className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card sticky top-0 z-50">
          <div className="container flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <img 
                src={tachyHealthLogo} 
                alt="TachyHealth" 
                className="h-8 cursor-pointer"
                data-testid="img-header-logo"
              />
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h1 className="font-semibold">Provider Relation</h1>
              </div>
            </div>
          </div>
        </header>
        <div className="container px-6 py-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-[400px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
              <Building2 className="h-5 w-5 text-primary" />
              <h1 className="font-semibold">Provider Relation</h1>
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
            <h2 className="text-2xl font-bold">Provider Relation Dashboard</h2>
            <p className="text-muted-foreground">
              Comprehensive benchmarking and reconciliation for provider settlements
            </p>
          </div>
          <Button 
            onClick={() => setWorkflowModalOpen(true)} 
            className="gap-2"
            data-testid="button-generate-reports"
          >
            <Sparkles className="h-4 w-4" />
            Generate Reports
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search provider..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-provider-search"
            />
          </div>
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger className="w-36" data-testid="select-region">
              <SelectValue placeholder="Region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              <SelectItem value="Central">Central</SelectItem>
              <SelectItem value="Western">Western</SelectItem>
              <SelectItem value="Eastern">Eastern</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36" data-testid="select-type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Hospital">Hospital</SelectItem>
              <SelectItem value="Clinic">Clinic</SelectItem>
              <SelectItem value="Pharmacy">Pharmacy</SelectItem>
            </SelectContent>
          </Select>
          <Select value={networkFilter} onValueChange={setNetworkFilter}>
            <SelectTrigger className="w-36" data-testid="select-network">
              <SelectValue placeholder="Network" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Networks</SelectItem>
              <SelectItem value="Premium">Premium</SelectItem>
              <SelectItem value="VIP">VIP</SelectItem>
              <SelectItem value="Standard">Standard</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Providers</p>
                  <p className="text-2xl font-bold">{totalProviders}</p>
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {totalProviders > 0 ? `${totalProviders} active` : "No providers"}
                  </p>
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
                  <p className="text-sm text-muted-foreground">Average CPM</p>
                  <p className="text-2xl font-bold">${avgCPM.toLocaleString()}</p>
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    +5.2% YoY
                  </p>
                </div>
                <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Flagged Providers</p>
                  <p className="text-2xl font-bold">{flaggedProviders}</p>
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" />
                    High risk providers
                  </p>
                </div>
                <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover-elevate"
            onClick={() => setLocation("/provider-relation/settlement")}
            data-testid="card-pending-settlement"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Settlement</p>
                  <p className="text-2xl font-bold">{pendingSettlements}</p>
                  <p className="text-xs text-muted-foreground">
                    ${pendingValue}M value
                  </p>
                </div>
                <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <FileText className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle>Provider Benchmarking</CardTitle>
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-export-csv">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {filteredProviders.length === 0 ? (
                <EmptyState
                  title="No providers found"
                  description="Try adjusting your search or filter criteria"
                  icon={<Building2 className="h-12 w-12 text-muted-foreground" />}
                />
              ) : (
                <div className="overflow-auto max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provider Name</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">CPM</TableHead>
                        <TableHead className="text-right">Trend</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProviders.map((provider) => (
                        <TableRow 
                          key={provider.id} 
                          className="cursor-pointer hover-elevate"
                          onClick={() => setLocation(`/provider-relation/${provider.id}`)}
                          data-testid={`row-provider-${provider.id}`}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{provider.name}</p>
                              <p className="text-xs text-muted-foreground">{provider.id}</p>
                            </div>
                          </TableCell>
                          <TableCell>{provider.region}</TableCell>
                          <TableCell>{provider.type}</TableCell>
                          <TableCell className="text-right font-medium">
                            ${provider.cpm.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`flex items-center justify-end gap-1 ${provider.cpmTrend >= 0 ? "text-red-600" : "text-green-600"}`}>
                              {provider.cpmTrend >= 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {provider.cpmTrend >= 0 ? "+" : ""}{provider.cpmTrend}%
                            </span>
                          </TableCell>
                          <TableCell>{getRiskBadge(provider.riskLevel)}</TableCell>
                          <TableCell>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">CPM Trends - Year over Year</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={cpmTrendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="current" 
                      name="2024"
                      stroke="#28AAE2" 
                      strokeWidth={2}
                      dot={{ fill: "#28AAE2" }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="previous" 
                      name="2023"
                      stroke="#94a3b8" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: "#94a3b8" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Billing Variance by Provider Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={billingVarianceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="type" className="text-xs" width={80} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Bar dataKey="variance" fill="#28AAE2" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Automated Triggers
            </CardTitle>
            <Button variant="ghost" size="sm" className="gap-1" data-testid="button-view-all-triggers">
              View All Triggers
              <ArrowUpRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {triggers.length === 0 ? (
              <EmptyState
                title="No triggers"
                description="All providers are within normal parameters"
                icon={<Bell className="h-12 w-12 text-muted-foreground" />}
              />
            ) : (
              <div className="space-y-3">
                {triggers.map((trigger) => (
                  <div 
                    key={trigger.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer"
                    onClick={() => setLocation(`/provider-relation/${trigger.providerId}`)}
                    data-testid={`trigger-${trigger.id}`}
                  >
                    <div className="flex items-center gap-3">
                      {getTriggerIcon(trigger.type)}
                      <div>
                        <p className="font-medium">{trigger.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {trigger.providerName} - {trigger.description}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="gap-1">
                      Review
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <AgenticWorkflowModal 
        open={workflowModalOpen} 
        onOpenChange={setWorkflowModalOpen} 
      />
    </div>
  );
}
