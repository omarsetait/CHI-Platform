import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataImportDialog } from "@/components/data-import-dialog";
import { DocumentUploadDialog } from "@/components/document-upload-dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Shield,
  Search,
  Upload,
  FileText,
  Calendar,
  ExternalLink,
  Download,
  AlertTriangle,
  Activity,
  Stethoscope,
  Scale,
  MessageSquare,
  Plus,
  Eye,
  X,
  Zap,
} from "lucide-react";
import type { 
  FwaRegulatoryDoc, 
  FwaMedicalGuideline,
  PolicyViolationCatalogue,
  ClinicalPathwayRule,
  ProviderComplaint,
} from "@shared/schema";

type DetailType = "violation" | "pathway" | "complaint" | "regulation" | "guideline" | null;
type DetailItem = PolicyViolationCatalogue | ClinicalPathwayRule | ProviderComplaint | FwaRegulatoryDoc | FwaMedicalGuideline | null;

const severityColors: Record<string, string> = {
  minor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  moderate: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  major: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const sanctionColors: Record<string, string> = {
  warning: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  fine: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  suspension: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  exclusion: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  license_revocation: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const statusColors: Record<string, string> = {
  received: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  under_review: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  investigated: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  dismissed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  escalated: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const sourceColors: Record<string, string> = {
  NPHIES: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  CHI: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  MOH: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "Insurance Authority": "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  chi_portal: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  nphies: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  patient_hotline: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  insurance_company: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

export default function KnowledgeBase() {
  const [activeTab, setActiveTab] = useState("violations");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailType, setDetailType] = useState<DetailType>(null);
  const [detailItem, setDetailItem] = useState<DetailItem>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [documentUploadOpen, setDocumentUploadOpen] = useState(false);

  const openDetail = (type: DetailType, item: DetailItem) => {
    setDetailType(type);
    setDetailItem(item);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailType(null);
    setDetailItem(null);
  };

  const { data: policyViolations, isLoading: loadingViolations } = useQuery<PolicyViolationCatalogue[]>({
    queryKey: ["/api/fwa/chi/policy-violations"],
  });

  const { data: clinicalPathways, isLoading: loadingPathways } = useQuery<ClinicalPathwayRule[]>({
    queryKey: ["/api/fwa/chi/clinical-pathways"],
  });

  const { data: complaints, isLoading: loadingComplaints } = useQuery<ProviderComplaint[]>({
    queryKey: ["/api/fwa/chi/complaints"],
  });

  const { data: regulatoryDocs, isLoading: loadingDocs } = useQuery<FwaRegulatoryDoc[]>({
    queryKey: ["/api/fwa/regulatory-docs"],
  });

  const { data: medicalGuidelines, isLoading: loadingGuidelines } = useQuery<FwaMedicalGuideline[]>({
    queryKey: ["/api/fwa/medical-guidelines"],
  });

  // Detection statistics from Knowledge Hub
  const { data: detectionStats } = useQuery<{
    totalDetections: number;
    detectionsWithRules: number;
    highRiskDetections: number;
    lastDetectionAt: string;
    ruleHitCounts: Array<{
      ruleCode: string;
      ruleName: string;
      category: string;
      severity: string;
      hitCount: number;
    }>;
  }>({
    queryKey: ["/api/fwa/knowledge-base/stats"],
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const violations = policyViolations || [];
  const pathways = clinicalPathways || [];
  const complaintList = complaints || [];
  const docs = regulatoryDocs || [];
  const guidelines = medicalGuidelines || [];

  const filteredViolations = violations.filter((v) => {
    const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.violationCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || v.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredPathways = pathways.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.ruleCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const filteredComplaints = complaintList.filter((c) => {
    const matchesSearch = c.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.complaintNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const stats = {
    violations: violations.length,
    pathways: pathways.filter(p => p.isActive).length,
    complaints: complaintList.filter(c => c.status !== "resolved" && c.status !== "dismissed").length,
    regulations: docs.length,
    guidelines: guidelines.length,
  };

  const isLoading = loadingViolations || loadingPathways || loadingComplaints || loadingDocs || loadingGuidelines;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Knowledge Hub</h1>
          <p className="text-muted-foreground">
            Clinical and policy reference for investigation decisions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" data-testid="button-import-data" onClick={() => setImportDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import Data
          </Button>
          <Button variant="outline" data-testid="button-upload-document" onClick={() => setDocumentUploadOpen(true)}>
            <FileText className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
          <Button data-testid="button-add">
            <Plus className="w-4 h-4 mr-2" />
            Add Entry
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Scale className="w-5 h-5 text-red-600" />
              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">{stats.violations}</Badge>
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="stat-violations">{stats.violations}</p>
            <p className="text-xs text-muted-foreground">Policy Violations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Activity className="w-5 h-5 text-purple-600" />
              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">{stats.pathways}</Badge>
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="stat-pathways">{stats.pathways}</p>
            <p className="text-xs text-muted-foreground">Clinical Pathways</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <MessageSquare className="w-5 h-5 text-amber-600" />
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">{stats.complaints}</Badge>
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="stat-complaints">{stats.complaints}</p>
            <p className="text-xs text-muted-foreground">Active Complaints</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Shield className="w-5 h-5 text-blue-600" />
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{stats.regulations}</Badge>
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="stat-regulations">{stats.regulations}</p>
            <p className="text-xs text-muted-foreground">Regulations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Stethoscope className="w-5 h-5 text-green-600" />
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{stats.guidelines}</Badge>
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="stat-guidelines">{stats.guidelines}</p>
            <p className="text-xs text-muted-foreground">Medical Guidelines</p>
          </CardContent>
        </Card>
      </div>

      {/* Detection Sync Status */}
      {detectionStats && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Detection Engine Sync
            </CardTitle>
            <CardDescription>
              Knowledge Hub rules actively applied during FWA detection - Last run: {detectionStats.lastDetectionAt ? new Date(detectionStats.lastDetectionAt).toLocaleString() : "Never"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 rounded-lg bg-background">
                <p className="text-2xl font-bold text-primary">{detectionStats.totalDetections}</p>
                <p className="text-xs text-muted-foreground">Total Detections</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-background">
                <p className="text-2xl font-bold text-green-600">{detectionStats.detectionsWithRules}</p>
                <p className="text-xs text-muted-foreground">Rules Matched</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-background">
                <p className="text-2xl font-bold text-red-600">{detectionStats.highRiskDetections}</p>
                <p className="text-xs text-muted-foreground">High Risk</p>
              </div>
            </div>
            {detectionStats.ruleHitCounts.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Top Matched Rules:</p>
                <div className="flex flex-wrap gap-2">
                  {detectionStats.ruleHitCounts.slice(0, 6).map((rule) => (
                    <Badge 
                      key={rule.ruleCode} 
                      variant="outline"
                      className={
                        rule.severity === "critical" ? "border-red-500 text-red-600" :
                        rule.severity === "high" || rule.severity === "major" ? "border-orange-500 text-orange-600" :
                        "border-amber-500 text-amber-600"
                      }
                    >
                      {rule.ruleCode}: {rule.hitCount} hits
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            AI-Integrated Knowledge Base
          </CardTitle>
          <CardDescription>
            All knowledge entries are embedded in a vector database for semantic search and AI-powered analysis during provider evaluation and enforcement decisions.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="violations" data-testid="tab-violations">
            <Scale className="w-4 h-4 mr-2" />
            Policy Violations
          </TabsTrigger>
          <TabsTrigger value="pathways" data-testid="tab-pathways">
            <Activity className="w-4 h-4 mr-2" />
            Clinical Pathways
          </TabsTrigger>
          <TabsTrigger value="complaints" data-testid="tab-complaints">
            <MessageSquare className="w-4 h-4 mr-2" />
            Complaints
          </TabsTrigger>
          <TabsTrigger value="regulations" data-testid="tab-regulations">
            <Shield className="w-4 h-4 mr-2" />
            Regulations
          </TabsTrigger>
          <TabsTrigger value="guidelines" data-testid="tab-guidelines">
            <Stethoscope className="w-4 h-4 mr-2" />
            Medical Guidelines
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            {activeTab === "violations" && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="fraud">Fraud</SelectItem>
                  <SelectItem value="documentation">Documentation</SelectItem>
                  <SelectItem value="clinical">Clinical</SelectItem>
                  <SelectItem value="administrative">Administrative</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <TabsContent value="violations">
            <Card>
              {loadingViolations ? (
                <div className="p-4 space-y-2">
                  {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : filteredViolations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Scale className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No policy violations found. Add violations to define enforcement rules.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Default Sanction</TableHead>
                      <TableHead>Fine Range (SAR)</TableHead>
                      <TableHead>Regulatory Basis</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredViolations.map((violation) => (
                      <TableRow key={violation.id} data-testid={`row-violation-${violation.id}`}>
                        <TableCell className="font-mono font-medium">{violation.violationCode}</TableCell>
                        <TableCell className="max-w-[300px]">{violation.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{violation.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={severityColors[violation.severity] || ""}>{violation.severity}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={sanctionColors[violation.defaultSanction] || ""}>
                            {violation.defaultSanction.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {violation.fineRangeMin && violation.fineRangeMax
                            ? `${Number(violation.fineRangeMin).toLocaleString()} - ${Number(violation.fineRangeMax).toLocaleString()}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{violation.regulatoryBasis || "-"}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            data-testid={`button-view-violation-${violation.id}`}
                            onClick={() => openDetail("violation", violation)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="pathways">
            <Card>
              {loadingPathways ? (
                <div className="p-4 space-y-2">
                  {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : filteredPathways.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No clinical pathway rules found. Add rules to enforce care-level standards.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rule Code</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Specialty</TableHead>
                      <TableHead>Allowed Settings</TableHead>
                      <TableHead>Prohibited Settings</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPathways.map((pathway) => (
                      <TableRow key={pathway.id} data-testid={`row-pathway-${pathway.id}`}>
                        <TableCell className="font-mono font-medium">{pathway.ruleCode}</TableCell>
                        <TableCell className="max-w-[300px]">{pathway.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{pathway.category.replace("_", " ")}</Badge>
                        </TableCell>
                        <TableCell>{pathway.specialty || "All"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {pathway.allowedSettings && pathway.allowedSettings.length > 0 ? pathway.allowedSettings.map((s) => (
                              <Badge key={s} className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">{s}</Badge>
                            )) : "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {pathway.prohibitedSettings && pathway.prohibitedSettings.length > 0 ? pathway.prohibitedSettings.map((s) => (
                              <Badge key={s} className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs">{s}</Badge>
                            )) : "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={pathway.isActive ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-gray-100 text-gray-800"}>
                            {pathway.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            data-testid={`button-view-pathway-${pathway.id}`}
                            onClick={() => openDetail("pathway", pathway)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="complaints">
            <Card>
              {loadingComplaints ? (
                <div className="p-4 space-y-2">
                  {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : filteredComplaints.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No provider complaints found. Complaints from external sources will appear here.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Complaint #</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Received</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredComplaints.map((complaint) => (
                      <TableRow key={complaint.id} data-testid={`row-complaint-${complaint.id}`}>
                        <TableCell className="font-mono font-medium">{complaint.complaintNumber}</TableCell>
                        <TableCell>{complaint.providerName}</TableCell>
                        <TableCell>
                          <Badge className={sourceColors[complaint.source] || "bg-gray-100 text-gray-800"}>
                            {complaint.source.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{complaint.category.replace("_", " ")}</Badge>
                        </TableCell>
                        <TableCell>
                          {complaint.severity ? (
                            <Badge className={severityColors[complaint.severity] || ""}>{complaint.severity}</Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[complaint.status || ""] || ""}>{(complaint.status || "unknown").replace("_", " ")}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {complaint.receivedDate ? new Date(complaint.receivedDate).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            data-testid={`button-view-complaint-${complaint.id}`}
                            onClick={() => openDetail("complaint", complaint)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="regulations">
            <Card>
              {loadingDocs ? (
                <div className="p-4 space-y-2">
                  {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : docs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No regulatory documents found. Import regulations from CHI, MOH, or NPHIES.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Regulation ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Jurisdiction</TableHead>
                      <TableHead>Effective Date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {docs.map((doc) => (
                      <TableRow key={doc.id} data-testid={`row-regulation-${doc.id}`}>
                        <TableCell className="font-mono font-medium">{doc.regulationId}</TableCell>
                        <TableCell className="max-w-[300px]">{doc.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{doc.category}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{doc.jurisdiction}</TableCell>
                        <TableCell className="text-sm">
                          {doc.effectiveDate ? new Date(doc.effectiveDate).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            data-testid={`button-view-regulation-${doc.id}`}
                            onClick={() => openDetail("regulation", doc)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="guidelines">
            <Card>
              {loadingGuidelines ? (
                <div className="p-4 space-y-2">
                  {[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : guidelines.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Stethoscope className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No medical guidelines found. Import clinical guidelines and protocols.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Specialty Area</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Source Authority</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {guidelines.map((guideline) => (
                      <TableRow key={guideline.id} data-testid={`row-guideline-${guideline.id}`}>
                        <TableCell className="max-w-[300px]">{guideline.title}</TableCell>
                        <TableCell>{guideline.specialtyArea || "General"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{guideline.category.replace("_", " ")}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{guideline.sourceAuthority}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            data-testid={`button-view-guideline-${guideline.id}`}
                            onClick={() => openDetail("guideline", guideline)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-detail">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailType === "violation" && <Scale className="w-5 h-5" />}
              {detailType === "pathway" && <Activity className="w-5 h-5" />}
              {detailType === "complaint" && <MessageSquare className="w-5 h-5" />}
              {detailType === "regulation" && <FileText className="w-5 h-5" />}
              {detailType === "guideline" && <Stethoscope className="w-5 h-5" />}
              {detailType === "violation" && "Policy Violation Details"}
              {detailType === "pathway" && "Clinical Pathway Rule Details"}
              {detailType === "complaint" && "Provider Complaint Details"}
              {detailType === "regulation" && "Regulatory Document Details"}
              {detailType === "guideline" && "Medical Guideline Details"}
            </DialogTitle>
            <DialogDescription>
              View detailed information about this knowledge base entry
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {detailType === "violation" && detailItem && (
              <ViolationDetail violation={detailItem as PolicyViolationCatalogue} />
            )}
            {detailType === "pathway" && detailItem && (
              <PathwayDetail pathway={detailItem as ClinicalPathwayRule} />
            )}
            {detailType === "complaint" && detailItem && (
              <ComplaintDetail complaint={detailItem as ProviderComplaint} />
            )}
            {detailType === "regulation" && detailItem && (
              <RegulationDetail doc={detailItem as FwaRegulatoryDoc} />
            )}
            {detailType === "guideline" && detailItem && (
              <GuidelineDetail guideline={detailItem as FwaMedicalGuideline} />
            )}
          </div>

          <div className="flex justify-end mt-6">
            <Button variant="outline" onClick={closeDetail} data-testid="button-close-detail">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <DataImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        defaultDataType="claims"
      />

      <DocumentUploadDialog
        open={documentUploadOpen}
        onOpenChange={setDocumentUploadOpen}
      />
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-2 border-b last:border-0">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm col-span-2">{value || "-"}</span>
    </div>
  );
}

function ViolationDetail({ violation }: { violation: PolicyViolationCatalogue }) {
  return (
    <div className="space-y-2">
      <DetailRow label="Violation Code" value={<span className="font-mono">{violation.violationCode}</span>} />
      <DetailRow label="Title" value={violation.title} />
      <DetailRow label="Description" value={violation.description} />
      <DetailRow label="Category" value={<Badge variant="outline" className="capitalize">{violation.category.replace("_", " ")}</Badge>} />
      <DetailRow label="Severity" value={<Badge className={severityColors[violation.severity || ""] || ""}>{violation.severity}</Badge>} />
      <DetailRow label="Default Sanction" value={<Badge className={sanctionColors[violation.defaultSanction || ""] || ""}>{(violation.defaultSanction || "").replace("_", " ")}</Badge>} />
      <DetailRow label="Fine Range" value={violation.fineRangeMin && violation.fineRangeMax ? `SAR ${Number(violation.fineRangeMin).toLocaleString()} - ${Number(violation.fineRangeMax).toLocaleString()}` : "-"} />
      <DetailRow label="Regulatory Basis" value={violation.regulatoryBasis} />
    </div>
  );
}

function PathwayDetail({ pathway }: { pathway: ClinicalPathwayRule }) {
  return (
    <div className="space-y-2">
      <DetailRow label="Rule Code" value={<span className="font-mono">{pathway.ruleCode}</span>} />
      <DetailRow label="Title" value={pathway.title} />
      <DetailRow label="Description" value={pathway.description} />
      <DetailRow label="Category" value={<Badge variant="outline" className="capitalize">{pathway.category.replace("_", " ")}</Badge>} />
      <DetailRow label="Specialty" value={pathway.specialty || "All"} />
      <DetailRow label="Diagnosis Codes" value={pathway.diagnosisCodes && pathway.diagnosisCodes.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {pathway.diagnosisCodes.map((c) => (
            <Badge key={c} variant="outline" className="font-mono text-xs">{c}</Badge>
          ))}
        </div>
      ) : "-"} />
      <DetailRow label="Allowed Settings" value={
        pathway.allowedSettings && pathway.allowedSettings.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {pathway.allowedSettings.map((s) => (
              <Badge key={s} className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">{s}</Badge>
            ))}
          </div>
        ) : "-"
      } />
      <DetailRow label="Prohibited Settings" value={
        pathway.prohibitedSettings && pathway.prohibitedSettings.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {pathway.prohibitedSettings.map((s) => (
              <Badge key={s} className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-xs">{s}</Badge>
            ))}
          </div>
        ) : "-"
      } />
      <DetailRow label="Status" value={pathway.isActive ? <Badge className="bg-green-100 text-green-800">Active</Badge> : <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>} />
    </div>
  );
}

function ComplaintDetail({ complaint }: { complaint: ProviderComplaint }) {
  return (
    <div className="space-y-2">
      <DetailRow label="Complaint #" value={<span className="font-mono">{complaint.complaintNumber}</span>} />
      <DetailRow label="Provider" value={complaint.providerName} />
      <DetailRow label="Provider ID" value={<span className="font-mono">{complaint.providerId}</span>} />
      <DetailRow label="Source" value={<Badge className={sourceColors[complaint.source] || "bg-gray-100 text-gray-800"}>{complaint.source.replace("_", " ")}</Badge>} />
      <DetailRow label="Category" value={<Badge variant="outline" className="capitalize">{complaint.category.replace("_", " ")}</Badge>} />
      <DetailRow label="Severity" value={<Badge className={severityColors[complaint.severity || ""] || ""}>{complaint.severity}</Badge>} />
      <DetailRow label="Status" value={<Badge className={statusColors[complaint.status || ""] || ""}>{(complaint.status || "unknown").replace("_", " ")}</Badge>} />
      <DetailRow label="Description" value={complaint.description} />
      <DetailRow label="Received Date" value={complaint.receivedDate ? new Date(complaint.receivedDate).toLocaleDateString() : "-"} />
      <DetailRow label="Resolved Date" value={complaint.resolvedDate ? new Date(complaint.resolvedDate).toLocaleDateString() : "-"} />
      <DetailRow label="Resolution" value={complaint.resolution} />
      <DetailRow label="Linked Case" value={complaint.linkedEnforcementId ? <span className="font-mono">{complaint.linkedEnforcementId}</span> : "-"} />
    </div>
  );
}

function RegulationDetail({ doc }: { doc: FwaRegulatoryDoc }) {
  return (
    <div className="space-y-2">
      <DetailRow label="Regulation ID" value={<span className="font-mono">{doc.regulationId}</span>} />
      <DetailRow label="Title" value={doc.title} />
      <DetailRow label="Category" value={<Badge variant="outline" className="capitalize">{doc.category}</Badge>} />
      <DetailRow label="Jurisdiction" value={doc.jurisdiction} />
      <DetailRow label="Effective Date" value={doc.effectiveDate ? new Date(doc.effectiveDate).toLocaleDateString() : "-"} />
      <DetailRow label="Content" value={doc.content} />
    </div>
  );
}

function GuidelineDetail({ guideline }: { guideline: FwaMedicalGuideline }) {
  return (
    <div className="space-y-2">
      <DetailRow label="Title" value={guideline.title} />
      <DetailRow label="Specialty Area" value={guideline.specialtyArea || "General"} />
      <DetailRow label="Category" value={<Badge variant="outline" className="capitalize">{guideline.category.replace("_", " ")}</Badge>} />
      <DetailRow label="Source Authority" value={guideline.sourceAuthority} />
      <DetailRow label="Content" value={guideline.content} />
      <DetailRow label="Created" value={guideline.createdAt ? new Date(guideline.createdAt).toLocaleDateString() : "-"} />
    </div>
  );
}
