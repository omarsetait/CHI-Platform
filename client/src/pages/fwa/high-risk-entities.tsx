import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, User, UserCog, AlertTriangle, DollarSign, TrendingUp, ExternalLink, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { FwaHighRiskProvider, FwaHighRiskPatient, FwaHighRiskDoctor } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Link } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

function getRiskLevelBadgeClasses(level: string | null) {
  switch (level) {
    case "critical":
      return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
    case "high":
      return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
    case "medium":
      return "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800";
    case "low":
      return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800";
  }
}

function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "SAR 0";
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount);
}

function ProvidersTab() {
  const [search, setSearch] = useState("");
  const { data: providers = [], isLoading } = useQuery<FwaHighRiskProvider[]>({
    queryKey: ["/api/fwa/high-risk-providers"],
  });

  const filtered = providers.filter(p => 
    p.providerName?.toLowerCase().includes(search.toLowerCase()) ||
    p.providerId?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: providers.length,
    critical: providers.filter(p => p.riskLevel === "critical").length,
    high: providers.filter(p => p.riskLevel === "high").length,
    totalExposure: providers.reduce((sum, p) => sum + parseFloat(p.totalExposure || "0"), 0),
  };

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Providers</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Critical Risk</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{stats.critical}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">High Risk</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-orange-600">{stats.high}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Exposure</span>
            </div>
            <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalExposure)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search providers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-search-providers"
        />
      </div>

      <Card>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider ID</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead className="text-right">Exposure</TableHead>
                <TableHead>FWA Reasons</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((provider) => (
                <TableRow key={provider.id} data-testid={`row-provider-${provider.id}`} className="hover-elevate cursor-pointer">
                  <TableCell>
                    <p className="font-medium font-mono">{provider.providerId}</p>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRiskLevelBadgeClasses(provider.riskLevel)}>
                      {provider.riskLevel || "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(parseFloat(provider.riskScore || "0"), 100)} className="w-16 h-2" />
                      <span className="text-sm">{parseFloat(provider.riskScore || "0").toFixed(1)}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(provider.totalExposure)}
                  </TableCell>
                  <TableCell>
                    {provider.reasons && provider.reasons.length > 0 ? (
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        {provider.reasons.slice(0, 3).map((reason, i) => (
                          <li key={i} className="truncate max-w-[200px]">{reason}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-sm text-muted-foreground">No flags detected</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/fwa/provider/${provider.providerId}`}>
                      <Button size="sm" variant="outline" data-testid={`button-view-provider-${provider.id}`}>
                        <FileText className="h-3 w-3 mr-1" />
                        View Profile
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No providers found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
}

function PatientsTab() {
  const [search, setSearch] = useState("");
  const { data: patients = [], isLoading } = useQuery<FwaHighRiskPatient[]>({
    queryKey: ["/api/fwa/high-risk-patients"],
  });

  const filtered = patients.filter(p => 
    p.patientName?.toLowerCase().includes(search.toLowerCase()) ||
    p.patientId?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: patients.length,
    critical: patients.filter(p => p.riskLevel === "critical").length,
    high: patients.filter(p => p.riskLevel === "high").length,
    totalAmount: patients.reduce((sum, p) => sum + parseFloat(p.totalAmount || "0"), 0),
  };

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Patients</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Critical Risk</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{stats.critical}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">High Risk</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-orange-600">{stats.high}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Claims</span>
            </div>
            <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalAmount)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search patients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-search-patients"
        />
      </div>

      <Card>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient ID</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Primary Reason</TableHead>
                <TableHead className="text-right">Total Claims</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((patient) => (
                <TableRow key={patient.id} data-testid={`row-patient-${patient.id}`} className="hover-elevate cursor-pointer">
                  <TableCell>
                    <p className="font-medium font-mono">{patient.patientId}</p>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRiskLevelBadgeClasses(patient.riskLevel)}>
                      {patient.riskLevel || "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(parseFloat(patient.riskScore || "0"), 100)} className="w-16 h-2" />
                      <span className="text-sm">{parseFloat(patient.riskScore || "0").toFixed(1)}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{patient.reasons?.[0] || "-"}</span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(patient.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/context/patient-360/${patient.patientId}`}>
                      <Button size="sm" variant="outline" data-testid={`button-view-patient-${patient.id}`}>
                        <FileText className="h-3 w-3 mr-1" />
                        View 360
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No patients found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
}

function DoctorsTab() {
  const [search, setSearch] = useState("");
  const { data: doctors = [], isLoading } = useQuery<FwaHighRiskDoctor[]>({
    queryKey: ["/api/fwa/high-risk-doctors"],
  });

  const filtered = doctors.filter(d => 
    d.doctorName?.toLowerCase().includes(search.toLowerCase()) ||
    d.doctorId?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: doctors.length,
    critical: doctors.filter(d => d.riskLevel === "critical").length,
    high: doctors.filter(d => d.riskLevel === "high").length,
    totalExposure: doctors.reduce((sum, d) => sum + parseFloat(d.totalExposure || "0"), 0),
  };

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <UserCog className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Doctors</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Critical Risk</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{stats.critical}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">High Risk</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-orange-600">{stats.high}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Exposure</span>
            </div>
            <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalExposure)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search doctors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          data-testid="input-search-doctors"
        />
      </div>

      <Card>
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doctor ID</TableHead>
                <TableHead>Specialty</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead className="text-right">Exposure</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((doctor) => (
                <TableRow key={doctor.id} data-testid={`row-doctor-${doctor.id}`} className="hover-elevate cursor-pointer">
                  <TableCell>
                    <p className="font-medium font-mono">{doctor.doctorId}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{doctor.specialty || "General"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRiskLevelBadgeClasses(doctor.riskLevel)}>
                      {doctor.riskLevel || "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={Math.min(parseFloat(doctor.riskScore || "0"), 100)} className="w-16 h-2" />
                      <span className="text-sm">{parseFloat(doctor.riskScore || "0").toFixed(1)}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(doctor.totalExposure)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/context/doctor-360/${doctor.doctorId}`}>
                      <Button size="sm" variant="outline" data-testid={`button-view-doctor-${doctor.id}`}>
                        <FileText className="h-3 w-3 mr-1" />
                        View 360
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No doctors found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </Card>
    </div>
  );
}

export default function HighRiskEntities() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">High-Risk Entities</h1>
          <p className="text-muted-foreground">
            Monitor providers, members, and clinicians with elevated risk
          </p>
        </div>
      </div>

      <Tabs defaultValue="providers" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="providers" className="flex items-center gap-2" data-testid="tab-providers">
            <Building2 className="h-4 w-4" />
            Providers
          </TabsTrigger>
          <TabsTrigger value="patients" className="flex items-center gap-2" data-testid="tab-patients">
            <User className="h-4 w-4" />
            Patients
          </TabsTrigger>
          <TabsTrigger value="doctors" className="flex items-center gap-2" data-testid="tab-doctors">
            <UserCog className="h-4 w-4" />
            Doctors
          </TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="mt-6">
          <ProvidersTab />
        </TabsContent>

        <TabsContent value="patients" className="mt-6">
          <PatientsTab />
        </TabsContent>

        <TabsContent value="doctors" className="mt-6">
          <DoctorsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
