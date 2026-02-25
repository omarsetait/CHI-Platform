import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Users, DollarSign, AlertTriangle, Activity, UserX } from "lucide-react";
import { AIScoreBadge } from "@/components/ai-score-badge";
import { FilterBar, FilterState } from "@/components/filter-bar";
import { DetailPanel } from "@/components/detail-panel";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  policyNumber: string;
  chronicConditions: string[];
  totalClaimedAmount: number;
  costPerClaim: number;
  avgClaimFrequency: number;
  outlierClaimsCount: number;
  aiScore: number;
}

interface Claim {
  id: string;
  claimNumber: string;
  patientId: string;
  patientName: string;
  amount: number;
  outlierScore: number;
}

export default function Patients() {
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    riskLevel: "all",
    amountMin: 0,
    amountMax: 10000000,
  });
  const [sortField, setSortField] = useState<string>("aiScore");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const { data: patients = [], isLoading: isLoadingPatients } = useQuery<Patient[]>({
    queryKey: ["/api/demo/patients"],
    select: (data: any[]) => data.map((p) => ({
      id: p.id || p.patientId,
      name: p.patientName || p.name,
      age: p.dateOfBirth ? Math.floor((Date.now() - new Date(p.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 45,
      gender: p.gender || "Unknown",
      policyNumber: p.memberId || p.policyNumber || "N/A",
      chronicConditions: p.primaryDiagnosis ? [p.primaryDiagnosis] : [],
      totalClaimedAmount: parseFloat(p.totalAmount) || 0,
      costPerClaim: p.totalClaims > 0 ? (parseFloat(p.totalAmount) || 0) / p.totalClaims : 0,
      avgClaimFrequency: p.visitCount / 12 || 0,
      outlierClaimsCount: p.flaggedClaims || 0,
      aiScore: parseFloat(p.riskScore) / 100 || 0,
    })),
  });

  const { data: claims = [], isLoading: isLoadingClaims } = useQuery<Claim[]>({
    queryKey: ["/api/demo/claims"],
    select: (data: any[]) => data.map((c) => ({
      id: c.id,
      claimNumber: c.claimNumber,
      patientId: c.patientId,
      patientName: c.patientName,
      amount: c.amount,
      outlierScore: c.outlierScore,
    })),
  });

  const isLoading = isLoadingPatients || isLoadingClaims;

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const filteredAndSortedPatients = useMemo(() => {
    return patients
      .filter((patient) => {
        const matchesSearch =
          patient.name.toLowerCase().includes(filters.search.toLowerCase()) ||
          patient.id.toLowerCase().includes(filters.search.toLowerCase()) ||
          patient.policyNumber.toLowerCase().includes(filters.search.toLowerCase());

        const matchesRisk =
          filters.riskLevel === "all" ||
          (filters.riskLevel === "high" && patient.aiScore >= 0.7) ||
          (filters.riskLevel === "medium" && patient.aiScore >= 0.4 && patient.aiScore < 0.7) ||
          (filters.riskLevel === "low" && patient.aiScore < 0.4);

        const matchesAmount =
          patient.totalClaimedAmount >= filters.amountMin &&
          patient.totalClaimedAmount <= filters.amountMax;

        return matchesSearch && matchesRisk && matchesAmount;
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
  }, [patients, filters, sortField, sortDirection]);

  const relatedClaims = useMemo(() => {
    if (!selectedPatient) return [];
    return claims.filter((claim) => claim.patientId === selectedPatient.id);
  }, [selectedPatient, claims]);

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null;
    return sortDirection === "desc" ? (
      <TrendingDown className="h-3 w-3 inline ml-1" />
    ) : (
      <TrendingUp className="h-3 w-3 inline ml-1" />
    );
  };

  const totalClaimed = patients.reduce((sum, p) => sum + p.totalClaimedAmount, 0);
  const totalOutliers = patients.reduce((sum, p) => sum + p.outlierClaimsCount, 0);
  const avgAiScore = patients.length > 0 ? patients.reduce((sum, p) => sum + p.aiScore, 0) / patients.length : 0;
  const highRiskCount = patients.filter((p) => p.aiScore >= 0.7).length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Patients</h1>
          <p className="text-muted-foreground mt-1">
            Patients ranked by AI-driven risk analytics
          </p>
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

  if (patients.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Patients</h1>
          <p className="text-muted-foreground mt-1">
            Patients ranked by AI-driven risk analytics
          </p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <UserX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Patients Found</h3>
            <p className="text-muted-foreground">There are no patients in the system yet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Patients</h1>
        <p className="text-muted-foreground mt-1">
          Patients ranked by AI-driven risk analytics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Patients</span>
            </div>
            <p className="text-2xl font-bold mt-1">{patients.length}</p>
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
              <span className="text-sm text-muted-foreground">High Risk Patients</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-chart-2">{highRiskCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Avg AI Score</span>
            </div>
            <p className="text-2xl font-bold mt-1">{avgAiScore.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <FilterBar filters={filters} onFilterChange={setFilters} type="patients" />

          <div className="border rounded-md mt-4">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">PATIENT ID</TableHead>
                  <TableHead
                    className="font-semibold cursor-pointer"
                    onClick={() => handleSort("name")}
                  >
                    PATIENT NAME <SortIcon field="name" />
                  </TableHead>
                  <TableHead
                    className="font-semibold text-right cursor-pointer"
                    onClick={() => handleSort("age")}
                  >
                    AGE <SortIcon field="age" />
                  </TableHead>
                  <TableHead className="font-semibold">GENDER</TableHead>
                  <TableHead className="font-semibold">CONDITIONS</TableHead>
                  <TableHead
                    className="font-semibold text-right cursor-pointer"
                    onClick={() => handleSort("totalClaimedAmount")}
                  >
                    TOTAL CLAIMED <SortIcon field="totalClaimedAmount" />
                  </TableHead>
                  <TableHead
                    className="font-semibold text-right cursor-pointer"
                    onClick={() => handleSort("costPerClaim")}
                  >
                    COST/CLAIM <SortIcon field="costPerClaim" />
                  </TableHead>
                  <TableHead
                    className="font-semibold text-right cursor-pointer"
                    onClick={() => handleSort("avgClaimFrequency")}
                  >
                    FREQ/MONTH <SortIcon field="avgClaimFrequency" />
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedPatients.map((patient) => (
                  <TableRow
                    key={patient.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => setSelectedPatient(patient)}
                    data-testid={`row-patient-${patient.id}`}
                  >
                    <TableCell className="font-medium text-primary">{patient.id}</TableCell>
                    <TableCell className="font-medium">{patient.name}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{patient.age}</TableCell>
                    <TableCell className="text-muted-foreground">{patient.gender}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {patient.chronicConditions.slice(0, 2).map((condition) => (
                          <Badge key={condition} variant="secondary" className="text-xs">
                            {condition}
                          </Badge>
                        ))}
                        {patient.chronicConditions.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{patient.chronicConditions.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${patient.totalClaimedAmount.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      ${patient.costPerClaim.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </TableCell>
                    <TableCell className="text-right">{patient.avgClaimFrequency.toFixed(1)}</TableCell>
                    <TableCell className="text-right">
                      <span className={patient.outlierClaimsCount > 10 ? "text-chart-2 font-medium" : ""}>
                        {patient.outlierClaimsCount}
                      </span>
                    </TableCell>
                    <TableCell>
                      <AIScoreBadge score={patient.aiScore} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredAndSortedPatients.length} of {patients.length} patients
          </div>
        </CardContent>
      </Card>

      {selectedPatient && (
        <DetailPanel
          type="patient"
          data={selectedPatient}
          onClose={() => setSelectedPatient(null)}
          relatedClaims={relatedClaims}
        />
      )}
    </div>
  );
}
