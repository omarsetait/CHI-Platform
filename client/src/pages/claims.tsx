import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { RiskBadge } from "@/components/risk-badge";
import { FilterBar, FilterState } from "@/components/filter-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, FileText, AlertTriangle, Clock, TrendingUp, TrendingDown, FileX } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Claim {
  id: string;
  claimNumber: string;
  policyNumber: string;
  registrationDate: string;
  claimType: string;
  hospital: string;
  hospitalName: string;
  amount: number;
  outlierScore: number;
  description: string;
  icd: string;
  icdDescription?: string;
  hasSurgery?: string;
  surgeryFee?: number;
  hasIcu?: string;
  lengthOfStay: number;
  patientName: string;
  providerName: string;
  patientId: string;
  providerId: string;
}

export default function Claims() {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    riskLevel: "all",
    amountMin: 0,
    amountMax: 10000000,
    claimType: "all",
  });
  const [sortField, setSortField] = useState<string>("outlierScore");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [, setLocation] = useLocation();

  const { data: claims = [], isLoading } = useQuery<Claim[]>({
    queryKey: ["/api/demo/claims"],
  });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const filteredClaims = useMemo(() => {
    return claims
      .filter((claim) => {
        const matchesSearch =
          claim.claimNumber.toLowerCase().includes(filters.search.toLowerCase()) ||
          claim.policyNumber.toLowerCase().includes(filters.search.toLowerCase()) ||
          claim.hospital.toLowerCase().includes(filters.search.toLowerCase()) ||
          claim.providerName.toLowerCase().includes(filters.search.toLowerCase()) ||
          claim.patientName.toLowerCase().includes(filters.search.toLowerCase());

        const matchesRisk =
          filters.riskLevel === "all" ||
          (filters.riskLevel === "high" && claim.outlierScore >= 0.7) ||
          (filters.riskLevel === "medium" && claim.outlierScore >= 0.4 && claim.outlierScore < 0.7) ||
          (filters.riskLevel === "low" && claim.outlierScore < 0.4);

        const matchesAmount =
          claim.amount >= filters.amountMin && claim.amount <= filters.amountMax;

        const matchesClaimType =
          !filters.claimType || filters.claimType === "all" || claim.claimType === filters.claimType;

        return matchesSearch && matchesRisk && matchesAmount && matchesClaimType;
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
  }, [claims, filters, sortField, sortDirection]);

  const handleClaimClick = (claimId: string) => {
    setLocation(`/claims/${claimId}`);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDirection === "desc" ? (
      <TrendingDown className="h-3 w-3 inline ml-1" />
    ) : (
      <TrendingUp className="h-3 w-3 inline ml-1" />
    );
  };

  const totalAmount = claims.reduce((sum, c) => sum + c.amount, 0);
  const highRiskCount = claims.filter((c) => c.outlierScore >= 0.7).length;
  const avgScore = claims.length > 0 ? claims.reduce((sum, c) => sum + c.outlierScore, 0) / claims.length : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">WorkQueue Claims</h1>
          <p className="text-muted-foreground mt-1">Review and analyze flagged claims</p>
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

  if (claims.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">WorkQueue Claims</h1>
          <p className="text-muted-foreground mt-1">Review and analyze flagged claims</p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <FileX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Claims Found</h3>
            <p className="text-muted-foreground">There are no claims in the system yet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">WorkQueue Claims</h1>
        <p className="text-muted-foreground mt-1">Review and analyze flagged claims</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Claims</span>
            </div>
            <p className="text-2xl font-bold mt-1">{claims.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Amount</span>
            </div>
            <p className="text-2xl font-bold mt-1">${(totalAmount / 1000).toFixed(0)}K</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-chart-2" />
              <span className="text-sm text-muted-foreground">High Risk Claims</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-chart-2">{highRiskCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Avg Outlier Score</span>
            </div>
            <p className="text-2xl font-bold mt-1">{avgScore.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <FilterBar filters={filters} onFilterChange={setFilters} type="claims" />

          <div className="border rounded-md mt-4">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead
                    className="font-semibold cursor-pointer"
                    onClick={() => handleSort("claimNumber")}
                  >
                    CLAIM NUMBER <SortIcon field="claimNumber" />
                  </TableHead>
                  <TableHead className="font-semibold">PATIENT</TableHead>
                  <TableHead className="font-semibold">PROVIDER</TableHead>
                  <TableHead
                    className="font-semibold cursor-pointer"
                    onClick={() => handleSort("registrationDate")}
                  >
                    DATE <SortIcon field="registrationDate" />
                  </TableHead>
                  <TableHead className="font-semibold">TYPE</TableHead>
                  <TableHead className="font-semibold">ICD</TableHead>
                  <TableHead className="font-semibold">HOSPITAL</TableHead>
                  <TableHead
                    className="font-semibold text-right cursor-pointer"
                    onClick={() => handleSort("amount")}
                  >
                    AMOUNT <SortIcon field="amount" />
                  </TableHead>
                  <TableHead
                    className="font-semibold text-right cursor-pointer"
                    onClick={() => handleSort("lengthOfStay")}
                  >
                    LOS <SortIcon field="lengthOfStay" />
                  </TableHead>
                  <TableHead className="font-semibold">REASON</TableHead>
                  <TableHead
                    className="font-semibold text-right cursor-pointer"
                    onClick={() => handleSort("outlierScore")}
                  >
                    SCORE <SortIcon field="outlierScore" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClaims.map((claim) => (
                  <TableRow
                    key={claim.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => handleClaimClick(claim.id)}
                    data-testid={`row-claim-${claim.id}`}
                  >
                    <TableCell className="font-medium text-primary">{claim.claimNumber}</TableCell>
                    <TableCell className="text-sm">{claim.patientName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{claim.providerName}</TableCell>
                    <TableCell className="text-sm">{claim.registrationDate}</TableCell>
                    <TableCell className="text-sm">{claim.claimType}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{claim.icd}</span>
                        <p className="text-xs text-muted-foreground truncate max-w-[100px]">
                          {claim.icdDescription}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{claim.hospitalName}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${claim.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={claim.lengthOfStay && claim.lengthOfStay > 14 ? "text-chart-2 font-medium" : ""}>
                        {claim.lengthOfStay} days
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {claim.outlierScore > 0.7 && <RiskBadge type="Claim Cost" />}
                        {claim.lengthOfStay && claim.lengthOfStay > 10 && (
                          <RiskBadge type="Length of Stay" />
                        )}
                        {claim.hasSurgery === "YES" && claim.surgeryFee && claim.surgeryFee > 10000 && (
                          <RiskBadge type="Surgery Fee" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`font-semibold ${
                          claim.outlierScore >= 0.7
                            ? "text-chart-2"
                            : claim.outlierScore >= 0.4
                            ? "text-chart-3"
                            : "text-chart-4"
                        }`}
                      >
                        {claim.outlierScore.toFixed(2)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredClaims.length} of {claims.length} claims
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
