import { useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MetricCard } from "@/components/metric-card";
import { DonutChart } from "@/components/donut-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, FileText, AlertTriangle, Users, UserCheck, TrendingUp, FileCheck, TrendingDown, LayoutDashboard } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area, ComposedChart, Legend } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AIScoreBadge } from "@/components/ai-score-badge";

interface Claim {
  id: string;
  claimNumber: string;
  patientName: string;
  providerName: string;
  claimType: string;
  amount: number;
  outlierScore: number;
  icd?: string;
  icdDescription?: string;
  hospitalName?: string;
  hospital?: string;
  lengthOfStay?: number;
  registrationDate?: string;
  engineViolations?: Array<{ type: string; code: string; details: string }>;
  riskIndicators?: Array<{ name: string; reason?: string | null }>;
}

interface Provider {
  id: string;
  providerName?: string;
  name?: string;
  riskScore: string;
  specialty?: string;
  organization?: string;
  hospital?: string;
}

interface Patient {
  id: string;
  patientName?: string;
  name?: string;
  riskScore: string;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const { data: claims = [], isLoading: isLoadingClaims } = useQuery<Claim[]>({
    queryKey: ["/api/demo/claims"],
  });

  const { data: providers = [], isLoading: isLoadingProviders } = useQuery<Provider[]>({
    queryKey: ["/api/demo/providers"],
  });

  const { data: patients = [], isLoading: isLoadingPatients } = useQuery<Patient[]>({
    queryKey: ["/api/demo/patients"],
  });

  const isLoading = isLoadingClaims || isLoadingProviders || isLoadingPatients;

  const stats = useMemo(() => {
    const totalClaimAmount = claims.reduce((sum, c) => sum + c.amount, 0);
    const outlierClaims = claims.filter((c) => c.outlierScore >= 0.5);
    const outlierAmount = outlierClaims.reduce((sum, c) => sum + c.amount, 0);
    const highRiskProviders = providers.filter((p) => parseFloat(p.riskScore) >= 70);
    const highRiskPatients = patients.filter((p) => parseFloat(p.riskScore) >= 70);

    return {
      totalClaimAmount,
      totalClaims: claims.length,
      outlierClaims: outlierClaims.length,
      outlierAmount,
      nonOutlierAmount: totalClaimAmount - outlierAmount,
      nonOutlierClaims: claims.length - outlierClaims.length,
      highRiskProviders: highRiskProviders.length,
      totalProviders: providers.length,
      highRiskPatients: highRiskPatients.length,
      totalPatients: patients.length,
    };
  }, [claims, providers, patients]);

  const riskDistribution = useMemo(() => {
    const highRisk = claims.filter((c) => c.outlierScore >= 0.7).length;
    const mediumRisk = claims.filter((c) => c.outlierScore >= 0.4 && c.outlierScore < 0.7).length;
    const lowRisk = claims.filter((c) => c.outlierScore < 0.4).length;
    const total = claims.length || 1;
    
    return [
      { category: "High Risk (0.7+)", count: highRisk, percentage: (highRisk / total) * 100 },
      { category: "Medium Risk (0.4-0.7)", count: mediumRisk, percentage: (mediumRisk / total) * 100 },
      { category: "Low Risk (<0.4)", count: lowRisk, percentage: (lowRisk / total) * 100 },
    ];
  }, [claims]);

  const topOutlierClaims = useMemo(() => {
    return [...claims]
      .sort((a, b) => b.outlierScore - a.outlierScore)
      .slice(0, 5);
  }, [claims]);

  const hospitalData = useMemo(() => {
    const hospitalMap = new Map<string, { claims: number; amount: number; outliers: number }>();
    
    claims.forEach((claim: any) => {
      const hospital = claim.hospitalName || claim.hospital || "Unknown";
      const existing = hospitalMap.get(hospital) || { claims: 0, amount: 0, outliers: 0 };
      existing.claims += 1;
      existing.amount += claim.amount;
      if (claim.outlierScore >= 0.5) {
        existing.outliers += 1;
      }
      hospitalMap.set(hospital, existing);
    });

    return Array.from(hospitalMap.entries())
      .map(([name, data]) => ({
        name,
        claims: data.claims,
        amount: data.amount,
        outlierRate: data.claims > 0 ? data.outliers / data.claims : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [claims]);

  const diagnosisData = useMemo(() => {
    const diagMap = new Map<string, number>();
    const colors = [
      "hsl(217 90% 55%)",
      "hsl(38 95% 50%)",
      "hsl(0 0% 60%)",
      "hsl(0 0% 30%)",
      "hsl(142 70% 45%)",
    ];
    
    claims.forEach((claim) => {
      if (claim.icd && claim.icdDescription) {
        const key = `${claim.icd} - ${claim.icdDescription}`;
        diagMap.set(key, (diagMap.get(key) || 0) + 1);
      } else if (claim.claimType) {
        diagMap.set(claim.claimType, (diagMap.get(claim.claimType) || 0) + 1);
      }
    });

    return Array.from(diagMap.entries())
      .map(([name, value], idx) => ({ name, value, color: colors[idx % colors.length] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [claims]);

  const reasonsData = useMemo(() => {
    const reasonMap = new Map<string, number>();
    const colors = [
      "hsl(0 85% 60%)",
      "hsl(0 0% 60%)",
      "hsl(142 70% 45%)",
      "hsl(0 0% 50%)",
      "hsl(217 90% 55%)",
    ];
    
    claims.forEach((claim) => {
      if (claim.riskIndicators && claim.riskIndicators.length > 0) {
        claim.riskIndicators.forEach((indicator) => {
          const reason = indicator.reason || indicator.name;
          if (reason) {
            reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1);
          }
        });
      } else if (claim.outlierScore >= 0.5) {
        reasonMap.set("High Outlier Score", (reasonMap.get("High Outlier Score") || 0) + 1);
      }
    });

    if (reasonMap.size === 0) {
      reasonMap.set("Normal Claims", claims.length);
    }

    return Array.from(reasonMap.entries())
      .map(([name, value], idx) => ({ name, value, color: colors[idx % colors.length] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [claims]);

  const trendingProviders = useMemo(() => {
    return providers
      .map((p) => ({
        providerId: p.id,
        name: p.providerName || p.name || "Unknown",
        specialty: p.specialty || "General",
        hospital: p.organization || p.hospital || "N/A",
        aiScore: parseFloat(p.riskScore) / 100 || 0,
        riskScore: parseFloat(p.riskScore) || 0,
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5);
  }, [providers]);

  const handleReconcile = (hospitalName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const slug = hospitalName.toLowerCase().replace(/\s+/g, '-');
    setLocation(`/reconciliation/${slug}`);
  };

  const handleProviderClick = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      const hospitalName = provider.organization || provider.hospital || "default";
      const slug = hospitalName.toLowerCase().replace(/\s+/g, '-');
      setLocation(`/reconciliation/${slug}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of outlier claims and fraud detection analytics</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <Skeleton className="h-[250px] w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-[250px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (claims.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of outlier claims and fraud detection analytics</p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <LayoutDashboard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Data Available</h3>
            <p className="text-muted-foreground">There are no claims in the system yet to display analytics.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const outlierPercentage = stats.totalClaims > 0 ? ((stats.outlierClaims / stats.totalClaims) * 100).toFixed(1) : "0";
  const outlierAmountPercentage = stats.totalClaimAmount > 0 ? ((stats.outlierAmount / stats.totalClaimAmount) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of outlier claims and fraud detection analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Claim Amount</span>
            </div>
            <p className="text-2xl font-bold mt-2">${(stats.totalClaimAmount / 1000000).toFixed(1)}M</p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-chart-1 rounded-full"></span>
                  Outlier
                </span>
                <span>{outlierAmountPercentage}% - ${(stats.outlierAmount / 1000000).toFixed(1)}M</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-chart-4 rounded-full"></span>
                  Non-Outlier
                </span>
                <span>{(100 - parseFloat(outlierAmountPercentage)).toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Number of Claims</span>
            </div>
            <p className="text-2xl font-bold mt-2">{stats.totalClaims.toLocaleString()}</p>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-chart-1 rounded-full"></span>
                  Outlier
                </span>
                <span>{outlierPercentage}% - {stats.outlierClaims.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-chart-4 rounded-full"></span>
                  Non-Outlier
                </span>
                <span>{(100 - parseFloat(outlierPercentage)).toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-chart-2" />
              <span className="text-sm text-muted-foreground">High Risk Providers</span>
            </div>
            <p className="text-2xl font-bold mt-2 text-chart-2">
              {stats.highRiskProviders}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              out of {stats.totalProviders} total providers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-chart-3" />
              <span className="text-sm text-muted-foreground">High Risk Patients</span>
            </div>
            <p className="text-2xl font-bold mt-2 text-chart-3">
              {stats.highRiskPatients}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              out of {stats.totalPatients} total patients
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Claims by Type</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const claimsByType = claims.reduce((acc, claim) => {
                const type = claim.claimType || "Other";
                acc[type] = (acc[type] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              const chartData = Object.entries(claimsByType)
                .map(([type, count]) => ({ type, count, amount: claims.filter(c => c.claimType === type).reduce((s, c) => s + c.amount, 0) / 1000 }))
                .sort((a, b) => b.count - a.count);
              
              return (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="type" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(value: number, name: string) => [name === 'count' ? value : `$${value.toFixed(0)}K`, name === 'count' ? 'Claims' : 'Amount']} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" name="Claims" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              );
            })()}
            <div className="mt-4 flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Total Claims:</span>
                <span className="font-bold">{stats.totalClaims.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="font-bold">${(stats.totalClaimAmount / 1000000).toFixed(1)}M</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {riskDistribution.map((item) => (
              <div key={item.category} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{item.category}</span>
                  <span className="font-medium">{item.count.toLocaleString()}</span>
                </div>
                <Progress 
                  value={item.percentage} 
                  className={`h-2 ${
                    item.category.includes("High") ? "[&>div]:bg-chart-2" :
                    item.category.includes("Medium") ? "[&>div]:bg-chart-3" :
                    "[&>div]:bg-chart-4"
                  }`}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-chart-2" />
            Top High-Risk Providers
            <Badge variant="outline" className="ml-2 text-xs">By Risk Score</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {trendingProviders.map((provider, idx) => (
              <div
                key={provider.providerId}
                className="p-3 rounded-md bg-muted/50 hover-elevate cursor-pointer"
                onClick={() => handleProviderClick(provider.providerId)}
                data-testid={`card-trending-provider-${provider.providerId}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={idx < 3 ? "default" : "outline"} className="text-xs">
                    #{idx + 1}
                  </Badge>
                  <AIScoreBadge score={provider.aiScore} />
                </div>
                <p className="font-medium text-sm truncate">{provider.name}</p>
                <p className="text-xs text-muted-foreground truncate">{provider.specialty}</p>
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Risk Score</span>
                    <span className={`font-bold ${provider.riskScore >= 70 ? "text-chart-2" : provider.riskScore >= 40 ? "text-chart-3" : ""}`}>
                      {provider.riskScore.toFixed(0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Hospital</span>
                    <span className="truncate max-w-[80px]" title={provider.hospital}>
                      {provider.hospital}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <DonutChart data={diagnosisData} title="TOP DIAGNOSIS" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <DonutChart data={reasonsData} title="TOP REASONS" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Outlier Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topOutlierClaims.map((claim) => (
                <div
                  key={claim.id}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/50 hover-elevate cursor-pointer"
                  onClick={() => setLocation(`/claims/${claim.id}`)}
                  data-testid={`card-claim-${claim.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-primary">{claim.claimNumber}</span>
                      <Badge variant="outline" className="text-xs">{claim.claimType}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {claim.patientName} - {claim.providerName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${claim.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    <p className={`text-sm font-semibold ${
                      claim.outlierScore >= 0.7 ? "text-chart-2" : "text-chart-3"
                    }`}>
                      Score: {claim.outlierScore.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Hospital Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {hospitalData.map((hospital) => (
                <div
                  key={hospital.name}
                  className="p-3 rounded-md bg-muted/50"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm flex-1">{hospital.name}</span>
                    <span className={`text-xs font-medium shrink-0 ${
                      hospital.outlierRate > 0.04 ? "text-chart-2" : "text-chart-4"
                    }`}>
                      {(hospital.outlierRate * 100).toFixed(1)}% outlier
                    </span>
                    <Button
                      size="sm"
                      variant="default"
                      className="gap-1.5 shrink-0"
                      onClick={(e) => handleReconcile(hospital.name, e)}
                      data-testid={`button-reconcile-${hospital.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <FileCheck className="h-3.5 w-3.5" />
                      Reconcile
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>{hospital.claims.toLocaleString()} claims</span>
                    <span>${(hospital.amount / 1000000).toFixed(1)}M total</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
