import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Users, DollarSign, AlertTriangle, Activity, FileCheck, Brain, Sparkles, UserX } from "lucide-react";
import { AIScoreBadge } from "@/components/ai-score-badge";
import { FilterBar, FilterState } from "@/components/filter-bar";
import { DetailPanel } from "@/components/detail-panel";
import { Badge } from "@/components/ui/badge";
import { AgenticWorkflowModal } from "@/components/agentic-workflow-modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Provider {
  id: string;
  name: string;
  specialty: string;
  hospital: string;
  totalClaimedAmount: number;
  outlierClaimsCount: number;
  aiScore: number;
  mlFlags?: Array<{ feature: string; value: string; benchmark: string }>;
}

interface Claim {
  id: string;
  claimNumber: string;
  providerId: string;
  patientName: string;
  amount: number;
  outlierScore: number;
}

export default function Providers() {
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    riskLevel: "all",
    amountMin: 0,
    amountMax: 10000000,
    specialty: "all",
  });
  const [sortField, setSortField] = useState<string>("aiScore");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);

  const { data: providers = [], isLoading: isLoadingProviders } = useQuery<Provider[]>({
    queryKey: ["/api/demo/providers"],
    select: (data: any[]) => data.map((p) => ({
      id: p.id || p.providerId,
      name: p.providerName || p.name,
      specialty: p.specialty,
      hospital: p.organization || p.hospital || "N/A",
      totalClaimedAmount: parseFloat(p.totalExposure) || p.totalClaims * parseFloat(p.avgClaimAmount || "0") || 0,
      outlierClaimsCount: p.flaggedClaims || 0,
      aiScore: parseFloat(p.riskScore) / 100 || 0,
      mlFlags: p.reasons?.map((r: string) => ({ feature: r, value: "Flagged", benchmark: "N/A" })) || [],
    })),
  });

  const { data: claims = [], isLoading: isLoadingClaims } = useQuery<Claim[]>({
    queryKey: ["/api/demo/claims"],
    select: (data: any[]) => data.map((c) => ({
      id: c.id,
      claimNumber: c.claimNumber,
      providerId: c.providerId,
      patientName: c.patientName,
      amount: c.amount,
      outlierScore: c.outlierScore,
    })),
  });

  const isLoading = isLoadingProviders || isLoadingClaims;

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleReconcile = (provider: Provider, e: React.MouseEvent) => {
    e.stopPropagation();
    const hospitalSlug = provider.hospital.toLowerCase().replace(/\s+/g, '-');
    setLocation(`/reconciliation/${hospitalSlug}`);
  };

  const filteredAndSortedProviders = useMemo(() => {
    return providers
      .filter((provider) => {
        const matchesSearch =
          provider.name.toLowerCase().includes(filters.search.toLowerCase()) ||
          provider.specialty.toLowerCase().includes(filters.search.toLowerCase()) ||
          provider.id.toLowerCase().includes(filters.search.toLowerCase());

        const matchesRisk =
          filters.riskLevel === "all" ||
          (filters.riskLevel === "high" && provider.aiScore >= 0.7) ||
          (filters.riskLevel === "medium" && provider.aiScore >= 0.4 && provider.aiScore < 0.7) ||
          (filters.riskLevel === "low" && provider.aiScore < 0.4);

        const matchesAmount =
          provider.totalClaimedAmount >= filters.amountMin &&
          provider.totalClaimedAmount <= filters.amountMax;

        const matchesSpecialty =
          !filters.specialty || filters.specialty === "all" || provider.specialty === filters.specialty;

        return matchesSearch && matchesRisk && matchesAmount && matchesSpecialty;
      })
      .sort((a, b) => {
        let aVal = a[sortField as keyof typeof a];
        let bVal = b[sortField as keyof typeof b];

        if (typeof aVal === "string") aVal = aVal.toLowerCase();
        if (typeof bVal === "string") bVal = bVal.toLowerCase();

        if (sortDirection === "asc") {
          return (aVal as any) < (bVal as any) ? -1 : (aVal as any) > (bVal as any) ? 1 : 0;
        } else {
          return (aVal as any) > (bVal as any) ? -1 : (aVal as any) < (bVal as any) ? 1 : 0;
        }
      });
  }, [providers, filters, sortField, sortDirection]);

  const relatedClaims = useMemo(() => {
    if (!selectedProvider) return [];
    return claims.filter((claim) => claim.providerId === selectedProvider.id);
  }, [selectedProvider, claims]);

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDirection === "desc" ? (
      <TrendingDown className="h-3 w-3 inline ml-1" />
    ) : (
      <TrendingUp className="h-3 w-3 inline ml-1" />
    );
  };

  const totalClaimed = providers.reduce((sum, p) => sum + p.totalClaimedAmount, 0);
  const totalOutliers = providers.reduce((sum, p) => sum + p.outlierClaimsCount, 0);
  const avgAiScore = providers.length > 0 ? providers.reduce((sum, p) => sum + p.aiScore, 0) / providers.length : 0;
  const highRiskCount = providers.filter((p) => p.aiScore >= 0.7).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Providers</h1>
            <p className="text-muted-foreground mt-1">
              Healthcare providers ranked by AI-driven risk analytics
            </p>
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-10 w-full mb-4" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Providers</h1>
            <p className="text-muted-foreground mt-1">
              Healthcare providers ranked by AI-driven risk analytics
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <UserX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Providers Found</h3>
            <p className="text-muted-foreground">There are no providers in the system yet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Providers</h1>
          <p className="text-muted-foreground mt-1">
            Healthcare providers ranked by AI-driven risk analytics. Click Reconcile to prepare provider review reports.
          </p>
        </div>
        <Button
          onClick={() => setWorkflowModalOpen(true)}
          className="gap-2"
          data-testid="button-agentic-workflow"
        >
          <Sparkles className="h-4 w-4" />
          AI Agentic Workflow
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Providers</span>
            </div>
            <p className="text-2xl font-bold mt-1">{providers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Claimed</span>
            </div>
            <p className="text-2xl font-bold mt-1">${(totalClaimed / 1000000).toFixed(1)}M</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-chart-3" />
              <span className="text-sm text-muted-foreground">High Risk Providers</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-chart-2">{highRiskCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Avg AI Score</span>
            </div>
            <p className="text-2xl font-bold mt-1">{avgAiScore.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <FilterBar filters={filters} onFilterChange={setFilters} type="providers" />

          <div className="border rounded-md mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">PROVIDER ID</TableHead>
                  <TableHead
                    className="font-semibold cursor-pointer"
                    onClick={() => handleSort("name")}
                  >
                    PROVIDER NAME <SortIcon field="name" />
                  </TableHead>
                  <TableHead className="font-semibold">SPECIALTY</TableHead>
                  <TableHead className="font-semibold">HOSPITAL</TableHead>
                  <TableHead
                    className="font-semibold text-right cursor-pointer"
                    onClick={() => handleSort("totalClaimedAmount")}
                  >
                    TOTAL CLAIMED <SortIcon field="totalClaimedAmount" />
                  </TableHead>
                  <TableHead
                    className="font-semibold text-right cursor-pointer"
                    onClick={() => handleSort("outlierClaimsCount")}
                  >
                    OUTLIERS <SortIcon field="outlierClaimsCount" />
                  </TableHead>
                  <TableHead
                    className="font-semibold cursor-pointer"
                    onClick={() => handleSort("aiScore")}
                  >
                    AI SCORE <SortIcon field="aiScore" />
                  </TableHead>
                  <TableHead className="font-semibold">ML FLAGS</TableHead>
                  <TableHead className="font-semibold text-center">ACTION</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedProviders.map((provider) => {
                  const topFlag = provider.mlFlags?.[0];
                  return (
                    <TableRow
                      key={provider.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => setSelectedProvider(provider)}
                      data-testid={`row-provider-${provider.id}`}
                    >
                      <TableCell className="font-medium text-primary">{provider.id}</TableCell>
                      <TableCell className="font-medium">{provider.name}</TableCell>
                      <TableCell className="text-muted-foreground">{provider.specialty}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{provider.hospital}</TableCell>
                      <TableCell className="text-right font-medium">
                        ${provider.totalClaimedAmount.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={provider.outlierClaimsCount > 30 ? "text-chart-2 font-medium" : ""}>
                          {provider.outlierClaimsCount}
                        </span>
                      </TableCell>
                      <TableCell>
                        <AIScoreBadge score={provider.aiScore} />
                      </TableCell>
                      <TableCell>
                        {topFlag && (
                          <div className="max-w-[180px]">
                            <Badge variant="outline" className="text-xs truncate block">
                              {topFlag.feature}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {topFlag.value} vs {topFlag.benchmark}
                            </span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="default"
                          className="gap-1.5"
                          onClick={(e) => handleReconcile(provider, e)}
                          data-testid={`button-reconcile-${provider.id}`}
                        >
                          <FileCheck className="h-3.5 w-3.5" />
                          Reconcile
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredAndSortedProviders.length} of {providers.length} providers
          </div>
        </CardContent>
      </Card>

      {selectedProvider && (
        <DetailPanel
          type="provider"
          data={selectedProvider}
          onClose={() => setSelectedProvider(null)}
          relatedClaims={relatedClaims}
        />
      )}

      <AgenticWorkflowModal
        open={workflowModalOpen}
        onOpenChange={setWorkflowModalOpen}
      />
    </div>
  );
}
