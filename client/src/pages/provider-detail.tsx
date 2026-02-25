import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  ArrowLeft,
  Building2,
  MapPin,
  Stethoscope,
  Users,
  AlertTriangle,
  FileText,
  Link2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  ChevronRight,
  Download,
  FileCheck,
  Star
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
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
  city: string;
  zone: string;
  type: string;
  specialty: string;
  network: string;
  contractTier: string;
  since: string;
  cpm: number;
  cpmTrend: number;
  peerAvgCpm: number;
  memberCount: number;
  memberTrend: number;
  claimCount: number;
  claimTrend: number;
  avgClaimAmount: number;
  riskScore: number;
  fraudCases: number;
  complaints: number;
  lastAudit: string;
  billingVariance: number;
  peerRank: number;
  totalPeers: number;
  topPolicies: string[];
  networks: string[];
  services: { name: string; enabled: boolean }[];
}

interface PeerProvider {
  id: string;
  name: string;
  cpm: number;
  members: number;
  claims: number;
  variance: number;
  isCurrent: boolean;
}

interface TopService {
  name: string;
  volume: number;
  revenue: number;
  vsPeers: number;
  trend: "up" | "down" | "stable";
  flagged: boolean;
}

function mapDemoProviderToDetail(demo: DemoProvider, allProviders: DemoProvider[]): Provider {
  const riskScore = parseFloat(demo.riskScore);
  const regions = ["Central", "Western", "Eastern", "Northern", "Southern"];
  const cities = ["Riyadh", "Jeddah", "Dammam", "Mecca", "Medina"];
  const zones = ["Zone 1", "Zone 2", "Zone 3", "Zone 4"];
  const networks = ["Premium", "VIP", "Standard"];
  const tiers = ["Tier 1", "Tier 2", "Tier 3"];
  
  const hash = demo.id.split("").reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
  const avgCpm = parseFloat(demo.avgClaimAmount) || 1000;
  const peerAvg = parseFloat(demo.cpmPeerAverage) || avgCpm * 0.85;
  const variance = Math.round(((avgCpm - peerAvg) / peerAvg) * 100);
  
  const sortedProviders = [...allProviders].sort((a, b) => 
    parseFloat(b.riskScore) - parseFloat(a.riskScore)
  );
  const peerRank = sortedProviders.findIndex(p => p.providerId === demo.providerId) + 1;

  return {
    id: demo.providerId,
    name: demo.providerName,
    region: regions[Math.abs(hash) % regions.length],
    city: cities[Math.abs(hash) % cities.length],
    zone: zones[Math.abs(hash) % zones.length],
    type: demo.providerType,
    specialty: demo.specialty,
    network: networks[Math.abs(hash) % networks.length],
    contractTier: tiers[Math.abs(hash) % tiers.length],
    since: String(2015 + (Math.abs(hash) % 8)),
    cpm: avgCpm,
    cpmTrend: parseFloat(demo.cpmTrend) || 0,
    peerAvgCpm: peerAvg,
    memberCount: demo.totalClaims * 5,
    memberTrend: 12 + (Math.abs(hash) % 10),
    claimCount: demo.totalClaims,
    claimTrend: 15 + (Math.abs(hash) % 10),
    avgClaimAmount: avgCpm,
    riskScore,
    fraudCases: demo.fwaCaseCount,
    complaints: demo.flaggedClaims > 100 ? Math.floor(demo.flaggedClaims / 100) : 1,
    lastAudit: new Date(demo.lastFlaggedDate).toISOString().split("T")[0],
    billingVariance: variance,
    peerRank,
    totalPeers: allProviders.length,
    topPolicies: ["Gold Plus", "Corporate Elite", "Family Care", "Basic Health", "Senior Shield"],
    networks: [networks[Math.abs(hash) % networks.length] + " Network", "Standard Network"],
    services: demo.providerType === "Hospital" 
      ? [
          { name: "Inpatient", enabled: true },
          { name: "Outpatient", enabled: true },
          { name: "Emergency", enabled: true },
          { name: "Lab", enabled: true },
          { name: "Radiology", enabled: true },
          { name: "Pharmacy", enabled: Math.abs(hash) % 2 === 0 },
        ]
      : demo.providerType === "Pharmacy"
      ? [
          { name: "Dispensing", enabled: true },
          { name: "Consultation", enabled: true },
        ]
      : [
          { name: "Outpatient", enabled: true },
          { name: "Lab", enabled: true },
          { name: "Consultation", enabled: true },
        ],
  };
}

function generatePeers(currentProvider: Provider, allProviders: DemoProvider[]): PeerProvider[] {
  const peers: PeerProvider[] = [{
    id: currentProvider.id,
    name: `${currentProvider.name.split(" ")[0]} (You)`,
    cpm: currentProvider.cpm,
    members: currentProvider.memberCount,
    claims: currentProvider.claimCount,
    variance: currentProvider.billingVariance,
    isCurrent: true,
  }];

  const otherProviders = allProviders
    .filter(p => p.providerId !== currentProvider.id)
    .slice(0, 3);

  otherProviders.forEach(p => {
    const cpm = parseFloat(p.avgClaimAmount) || 1000;
    const peerAvg = parseFloat(p.cpmPeerAverage) || cpm * 0.85;
    peers.push({
      id: p.providerId,
      name: p.providerName,
      cpm,
      members: p.totalClaims * 5,
      claims: p.totalClaims,
      variance: Math.round(((cpm - peerAvg) / peerAvg) * 100),
      isCurrent: false,
    });
  });

  return peers;
}

function generateTopServices(provider: Provider): TopService[] {
  if (provider.type === "Hospital") {
    return [
      { name: "Cardiac Catheterization", volume: 245, revenue: 1200000, vsPeers: 45, trend: "up", flagged: true },
      { name: "MRI Scans", volume: 890, revenue: 445000, vsPeers: 12, trend: "up", flagged: false },
      { name: "ICU Days", volume: 1240, revenue: 2100000, vsPeers: 28, trend: "up", flagged: true },
      { name: "Laboratory Tests", volume: 12400, revenue: 620000, vsPeers: -5, trend: "down", flagged: false },
      { name: "Pharmacy Dispensing", volume: 8900, revenue: 890000, vsPeers: 8, trend: "up", flagged: false },
    ];
  } else if (provider.type === "Pharmacy") {
    return [
      { name: "Prescription Dispensing", volume: 5600, revenue: 280000, vsPeers: 15, trend: "up", flagged: false },
      { name: "OTC Sales", volume: 3200, revenue: 64000, vsPeers: 5, trend: "stable", flagged: false },
      { name: "Specialty Medications", volume: 450, revenue: 225000, vsPeers: 22, trend: "up", flagged: true },
    ];
  }
  return [
    { name: "Consultations", volume: 2400, revenue: 360000, vsPeers: 10, trend: "up", flagged: false },
    { name: "Lab Tests", volume: 1800, revenue: 90000, vsPeers: -3, trend: "down", flagged: false },
    { name: "Minor Procedures", volume: 650, revenue: 195000, vsPeers: 18, trend: "up", flagged: false },
  ];
}

function generateCpmTrendData(provider: Provider) {
  const base = provider.cpm * 0.88;
  return [
    { month: "Jan", value: Math.round(base) },
    { month: "Feb", value: Math.round(base * 1.03) },
    { month: "Mar", value: Math.round(base * 1.01) },
    { month: "Apr", value: Math.round(base * 1.08) },
    { month: "May", value: Math.round(base * 1.10) },
    { month: "Jun", value: Math.round(base * 1.08) },
    { month: "Jul", value: Math.round(base * 1.13) },
    { month: "Aug", value: Math.round(provider.cpm) },
  ];
}

function generateMemberTrendData(provider: Provider) {
  const base = provider.memberCount * 0.92;
  return [
    { month: "Jan", value: Math.round(base) },
    { month: "Feb", value: Math.round(base * 1.01) },
    { month: "Mar", value: Math.round(base * 1.03) },
    { month: "Apr", value: Math.round(base * 1.04) },
    { month: "May", value: Math.round(base * 1.05) },
    { month: "Jun", value: Math.round(base * 1.07) },
    { month: "Jul", value: Math.round(base * 1.08) },
    { month: "Aug", value: Math.round(provider.memberCount) },
  ];
}

function generateClaimVolumeData(provider: Provider) {
  const base = provider.claimCount * 0.85;
  return [
    { month: "Jan", value: Math.round(base) },
    { month: "Feb", value: Math.round(base * 1.03) },
    { month: "Mar", value: Math.round(base * 1.08) },
    { month: "Apr", value: Math.round(base * 1.13) },
    { month: "May", value: Math.round(base * 1.11) },
    { month: "Jun", value: Math.round(base * 1.14) },
    { month: "Jul", value: Math.round(base * 1.16) },
    { month: "Aug", value: Math.round(provider.claimCount) },
  ];
}

export default function ProviderDetail() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const providerId = params.id;

  const { data: demoProviders = [], isLoading } = useQuery<DemoProvider[]>({
    queryKey: ["/api/demo/providers"],
  });

  const demoProvider = demoProviders.find(
    p => p.providerId === providerId || p.id === providerId
  );
  
  const provider = demoProvider ? mapDemoProviderToDetail(demoProvider, demoProviders) : null;
  const peers = provider ? generatePeers(provider, demoProviders) : [];
  const topServices = provider ? generateTopServices(provider) : [];
  const cpmTrendData = provider ? generateCpmTrendData(provider) : [];
  const memberTrendData = provider ? generateMemberTrendData(provider) : [];
  const claimVolumeData = provider ? generateClaimVolumeData(provider) : [];

  const peerAverage = peers.length > 0 
    ? Math.round(peers.reduce((sum, p) => sum + p.cpm, 0) / peers.length)
    : 0;

  const getInitials = (name: string) => {
    return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card sticky top-0 z-50">
          <div className="container flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <img src={tachyHealthLogo} alt="TachyHealth" className="h-8" />
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h1 className="font-semibold">Provider Relation</h1>
              </div>
            </div>
          </div>
        </header>
        <div className="container px-6 py-6 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-6">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-96" />
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!provider) {
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
              onClick={() => setLocation("/provider-relation")}
              className="gap-2"
              data-testid="button-back-dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </header>
        <div className="container px-6 py-6">
          <EmptyState
            title="Provider not found"
            description={`No provider found with ID: ${providerId}`}
            icon={Building2}
            action={{
              label: "Back to Provider List",
              onClick: () => setLocation("/provider-relation")
            }}
          />
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
            onClick={() => setLocation("/provider-relation")}
            className="gap-2"
            data-testid="button-back-dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <div className="container px-6 py-6 space-y-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {getInitials(provider.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">{provider.name}</h2>
                    <p className="text-muted-foreground">Provider ID: {provider.id}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      className="gap-2" 
                      onClick={() => setLocation("/provider-relation/settlement")}
                      data-testid="button-generate-settlement"
                    >
                      <FileCheck className="h-4 w-4" />
                      Settlement Report
                    </Button>
                    <Button 
                      variant="outline" 
                      className="gap-2"
                      onClick={() => setLocation(`/provider-relation/${providerId}/batches`)}
                      data-testid="button-view-batches"
                    >
                      <FileText className="h-4 w-4" />
                      Claim Batches
                    </Button>
                    <Button variant="outline" className="gap-2" data-testid="button-export-data">
                      <Download className="h-4 w-4" />
                      Export Data
                    </Button>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {provider.region}
                  </span>
                  <span>{provider.type}</span>
                  <span>{provider.network} Network</span>
                  <span>{provider.specialty}</span>
                  <span>{provider.contractTier}</span>
                  <span>Since {provider.since}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Geographic
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Region</dt>
                  <dd>{provider.region}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">City</dt>
                  <dd>{provider.city}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Zone</dt>
                  <dd>{provider.zone}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-muted-foreground" />
                Services
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {provider.services.map((service) => (
                  <Badge 
                    key={service.name}
                    variant={service.enabled ? "default" : "outline"}
                    className={!service.enabled ? "opacity-50" : ""}
                  >
                    {service.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Members</dt>
                  <dd>{provider.memberCount.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Claims/Month</dt>
                  <dd>{provider.claimCount.toLocaleString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Avg Claim</dt>
                  <dd>${provider.avgClaimAmount}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                Risk Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Fraud Cases</dt>
                  <dd className={provider.fraudCases > 0 ? "text-red-600 font-medium" : ""}>{provider.fraudCases}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Complaints</dt>
                  <dd>{provider.complaints}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Last Audit</dt>
                  <dd>{provider.lastAudit}</dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-muted-foreground">Risk Score</dt>
                  <dd className="flex items-center gap-2">
                    <Progress value={provider.riskScore} className="w-16 h-2" />
                    <span className={provider.riskScore > 60 ? "text-red-600 font-medium" : ""}>{provider.riskScore}/100</span>
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Top Policies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-1 text-sm">
                {provider.topPolicies.map((policy, idx) => (
                  <li key={policy} className="flex items-center gap-2">
                    <span className="text-muted-foreground w-4">{idx + 1}.</span>
                    {policy}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                Networks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {provider.networks.map((network) => (
                  <Badge key={network} variant="outline">{network}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Cost Per Member (CPM)</span>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-3xl font-bold">${provider.cpm.toLocaleString()}</p>
                <p className={`text-sm flex items-center gap-1 ${provider.cpmTrend > 0 ? "text-red-600" : "text-green-600"}`}>
                  {provider.cpmTrend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {provider.cpmTrend > 0 ? "+" : ""}{provider.cpmTrend}% vs last year
                </p>
                <p className={`text-sm ${provider.billingVariance > 0 ? "text-red-600" : "text-green-600"}`}>
                  {provider.billingVariance > 0 ? "+" : ""}{provider.billingVariance}% vs peer average
                </p>
                <ResponsiveContainer width="100%" height={60}>
                  <LineChart data={cpmTrendData}>
                    <Line type="monotone" dataKey="value" stroke="#28AAE2" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Billing Variance</span>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className={`text-3xl font-bold ${provider.billingVariance > 0 ? "text-red-600" : "text-green-600"}`}>
                  {provider.billingVariance > 0 ? "+" : ""}{provider.billingVariance}%
                </p>
                <p className="text-sm text-muted-foreground">vs peer average</p>
                <p className="text-sm text-muted-foreground">
                  Peer Avg: ${provider.peerAvgCpm.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Your Rank: {provider.peerRank} of {provider.totalPeers}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Member Count Trend</span>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-3xl font-bold">{(provider.memberCount / 1000).toFixed(1)}K</p>
                <p className="text-sm flex items-center gap-1 text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  +{provider.memberTrend}% YoY
                </p>
                <ResponsiveContainer width="100%" height={60}>
                  <LineChart data={memberTrendData}>
                    <Line type="monotone" dataKey="value" stroke="#22C55E" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Claim Volume Trend</span>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-3xl font-bold">{(provider.claimCount / 1000).toFixed(1)}K/mo</p>
                <p className="text-sm flex items-center gap-1 text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  +{provider.claimTrend}% YoY
                </p>
                <ResponsiveContainer width="100%" height={60}>
                  <BarChart data={claimVolumeData}>
                    <Bar dataKey="value" fill="#28AAE2" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Peer Comparison - Similar Providers ({provider.region} Region, {provider.type}, {provider.contractTier})</CardTitle>
          </CardHeader>
          <CardContent>
            {peers.length === 0 ? (
              <EmptyState
                title="No peer data"
                description="No comparable providers found"
                icon={Users}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead className="text-right">CPM</TableHead>
                    <TableHead className="text-right">Members</TableHead>
                    <TableHead className="text-right">Claims</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {peers.map((peer) => (
                    <TableRow key={peer.id} className={peer.isCurrent ? "bg-primary/5" : ""}>
                      <TableCell className="font-medium">
                        {peer.isCurrent && <Star className="h-4 w-4 text-primary inline mr-2" />}
                        {peer.name}
                      </TableCell>
                      <TableCell className="text-right">${peer.cpm.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{peer.members.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{peer.claims.toLocaleString()}</TableCell>
                      <TableCell className={`text-right ${peer.variance > 20 ? "text-red-600" : peer.variance < 0 ? "text-green-600" : ""}`}>
                        {peer.variance > 0 ? "+" : ""}{peer.variance}%
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold border-t-2">
                    <TableCell>Peer Average</TableCell>
                    <TableCell className="text-right">${peerAverage.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{Math.round(peers.reduce((s, p) => s + p.members, 0) / peers.length).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{Math.round(peers.reduce((s, p) => s + p.claims, 0) / peers.length).toLocaleString()}</TableCell>
                    <TableCell className="text-right">--</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Top Utilized Services</CardTitle>
              <CardDescription>Service utilization compared to peer providers</CardDescription>
            </div>
            <Button variant="ghost" size="sm" data-testid="button-compare-peers">
              Compare to Peers
            </Button>
          </CardHeader>
          <CardContent>
            {topServices.length === 0 ? (
              <EmptyState
                title="No service data"
                description="No service utilization data available"
                icon={Stethoscope}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">vs Peers</TableHead>
                    <TableHead className="text-right">Trend</TableHead>
                    <TableHead className="text-center">Flag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topServices.map((service) => (
                    <TableRow key={service.name}>
                      <TableCell className="font-medium">{service.name}</TableCell>
                      <TableCell className="text-right">{service.volume.toLocaleString()}</TableCell>
                      <TableCell className="text-right">${(service.revenue / 1000000).toFixed(1)}M</TableCell>
                      <TableCell className={`text-right ${service.vsPeers > 20 ? "text-red-600" : service.vsPeers < 0 ? "text-green-600" : ""}`}>
                        {service.vsPeers > 0 ? "+" : ""}{service.vsPeers}%
                      </TableCell>
                      <TableCell className="text-right">
                        {service.trend === "up" ? (
                          <TrendingUp className="h-4 w-4 text-red-500 inline" />
                        ) : service.trend === "down" ? (
                          <TrendingDown className="h-4 w-4 text-green-500 inline" />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {service.flagged && <AlertTriangle className="h-4 w-4 text-amber-500 inline" />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="mt-4">
              <Button variant="ghost" size="sm" className="gap-1">
                View All Services
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button 
            size="lg" 
            className="gap-2"
            onClick={() => setLocation(`/provider-relation/${providerId}/batches`)}
            data-testid="button-view-claim-batches"
          >
            View Claim Batches
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
