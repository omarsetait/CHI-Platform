import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Search,
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  DollarSign,
  User,
  Building,
  Calendar,
  ChevronDown,
  Activity,
  Stethoscope,
  ClipboardList,
  Heart,
  Thermometer,
  Droplets,
  FlaskConical,
  Sparkles,
  Files,
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { FwaCase, FwaAnalysisFinding, FwaCategory, FwaAction, FwaClaimService, FwaClinicalDocumentation } from "@shared/schema";
import { DocumentCompareSection } from "@/components/fwa/document-compare";

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
  lastFlaggedDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface DemoPatient {
  id: string;
  patientId: string;
  patientName: string;
  memberId: string;
  dateOfBirth: Date;
  gender: string;
  riskScore: string;
  riskLevel: string;
  totalClaims: number;
  flaggedClaims: number;
  totalAmount: string;
  avgClaimAmount: string;
  visitCount: number;
  uniqueProviders: number;
  primaryDiagnosis: string;
  fwaCaseCount: number;
  reasons: string[];
  lastClaimDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

function PhaseProgressRail({ currentPhase }: { currentPhase: string }) {
  const phases = [
    { id: "A1", label: "Analysis", description: "Initial FWA Detection", sectionId: "findings-a1" },
    { id: "A2", label: "Categorization", description: "FWA Classification", sectionId: "categories-a2" },
    { id: "A3", label: "Action", description: "Remediation Steps", sectionId: "actions-a3" },
  ];

  const getPhaseIndex = (phase: string) => {
    if (phase === "A1" || phase === "a1_analysis") return 0;
    if (phase === "A2" || phase === "a2_categorization") return 1;
    if (phase === "A3" || phase === "a3_action") return 2;
    return 0;
  };

  const currentIndex = getPhaseIndex(currentPhase);

  const scrollToSection = (sectionId: string) => {
    const element = document.querySelector(`[data-testid="accordion-${sectionId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <Card data-testid="phase-progress-rail">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {phases.map((phase, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const isFuture = idx > currentIndex;

            return (
              <div key={phase.id} className="flex items-center flex-1">
                <button
                  className="flex flex-col items-center flex-1 cursor-pointer group"
                  onClick={() => scrollToSection(phase.sectionId)}
                  data-testid={`button-scroll-${phase.id}`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors group-hover:ring-2 group-hover:ring-purple-400 group-hover:ring-offset-2 ${
                      isCompleted
                        ? "bg-purple-600 text-white"
                        : isCurrent
                        ? "bg-purple-100 border-2 border-purple-600 text-purple-600 dark:bg-purple-900/50 dark:text-purple-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                    data-testid={`phase-indicator-${phase.id}`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      phase.id
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p
                      className={`text-sm font-medium ${
                        isCurrent
                          ? "text-purple-600 dark:text-purple-400"
                          : isFuture
                          ? "text-muted-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {phase.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{phase.description}</p>
                  </div>
                </button>
                {idx < phases.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 ${
                      idx < currentIndex
                        ? "bg-purple-600"
                        : "bg-muted"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ClaimInformationSection({
  claimId,
  patientId,
  patientName,
  providerId,
  providerName,
  providerType,
  specialty,
  isLoading,
  caseId,
}: {
  claimId: string;
  patientId: string;
  patientName?: string;
  providerId: string;
  providerName: string;
  providerType: string;
  specialty: string;
  isLoading?: boolean;
  caseId?: string;
}) {
  if (isLoading) {
    return (
      <Card data-testid="claim-information-section">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Claim Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-5 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const viewClaimsUrl = caseId 
    ? `/findings/${caseId}/claims?source=fwa&providerId=${providerId}`
    : null;

  return (
    <Card data-testid="claim-information-section">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Claim Information
          </CardTitle>
          {viewClaimsUrl && (
            <Link href={viewClaimsUrl}>
              <Button variant="outline" size="sm" className="gap-2" data-testid="button-view-related-claims">
                <FileText className="w-4 h-4" />
                View Related Claims
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Claim Details</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Claim ID</p>
              <p className="text-sm font-medium" data-testid="text-claim-id">{claimId || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Patient Name</p>
              <p className="text-sm font-medium" data-testid="text-patient-name">{patientName || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Patient ID</p>
              <p className="text-sm font-medium" data-testid="text-patient-id">{patientId || "N/A"}</p>
            </div>
          </div>
        </div>
        <Separator />
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Provider Information</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Provider Name</p>
              <p className="text-sm font-medium" data-testid="text-provider-name">{providerName || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Provider ID</p>
              <p className="text-sm font-medium" data-testid="text-provider-id">{providerId || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Provider Type</p>
              <p className="text-sm font-medium" data-testid="text-provider-type">{providerType || "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Specialty</p>
              <p className="text-sm font-medium" data-testid="text-specialty">{specialty || "N/A"}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type ClaimServiceData = {
  id: string;
  claimId: string;
  serviceCode: string | null;
  serviceName: string | null;
  quantity: number | null;
  unitPrice: string | null;
  totalPrice: string | null;
  serviceDate: string | null;
  diagnosisCode: string | null;
  modifiers: string | null;
  renderingProviderId: string | null;
  status: string | null;
  notes: string | null;
};

function ServicesTableSection({ services, isLoading }: { services: ClaimServiceData[] | undefined; isLoading?: boolean }) {
  const [isOpen, setIsOpen] = useState(true);

  const getStatusBadgeStyle = (status: string | null) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "denied":
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "pending":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const serviceCount = services?.length || 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card data-testid="services-table-section">
        <CardHeader className="pb-3">
          <CollapsibleTrigger
            className="flex items-center justify-between w-full"
            data-testid="button-toggle-services"
          >
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Claim Services ({serviceCount})
            </CardTitle>
            <ChevronDown
              className={`w-5 h-5 text-muted-foreground transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : serviceCount === 0 ? (
              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <ClipboardList className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No claim services found</p>
                <p className="text-xs text-muted-foreground mt-1">Services will appear here when associated claims have service line items</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Line #</TableHead>
                      <TableHead>Service Code</TableHead>
                      <TableHead className="min-w-[200px]">Description</TableHead>
                      <TableHead>Diagnosis</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services?.map((service, index) => (
                      <TableRow
                        key={service.id}
                        data-testid={`row-service-${index + 1}`}
                      >
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {service.serviceCode || "N/A"}
                          </code>
                        </TableCell>
                        <TableCell className="text-sm">{service.serviceName || "N/A"}</TableCell>
                        <TableCell>
                          {service.diagnosisCode ? (
                            <code className="text-xs bg-muted px-1 py-0.5 rounded">
                              {service.diagnosisCode}
                            </code>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{service.quantity || 1}</TableCell>
                        <TableCell className="text-right">
                          {service.unitPrice ? `$${parseFloat(service.unitPrice).toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {service.totalPrice ? `$${parseFloat(service.totalPrice).toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeStyle(service.status)}>
                            {service.status || "pending"}
                          </Badge>
                        </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function ClinicalDocumentationSection({ doc }: { doc: FwaClinicalDocumentation }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card data-testid="clinical-documentation-section">
        <CardHeader className="pb-3">
          <CollapsibleTrigger
            className="flex items-center justify-between w-full"
            data-testid="button-toggle-clinical"
          >
            <CardTitle className="text-lg flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Clinical Documentation
            </CardTitle>
            <ChevronDown
              className={`w-5 h-5 text-muted-foreground transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <Accordion type="multiple" defaultValue={["chief-complaint", "vitals", "labs", "treatment"]} className="space-y-2">
              <AccordionItem value="chief-complaint" className="border rounded-lg px-4">
                <AccordionTrigger data-testid="accordion-chief-complaint" className="hover:no-underline">
                  <span className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Chief Complaint
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground" data-testid="text-chief-complaint">
                    {doc.chiefComplaint || "No chief complaint documented"}
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="vitals" className="border rounded-lg px-4">
                <AccordionTrigger data-testid="accordion-vital-signs" className="hover:no-underline">
                  <span className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Vital Signs
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  {doc.vitalSigns ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {doc.vitalSigns.bloodPressure && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Activity className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Blood Pressure</span>
                          </div>
                          <p className="text-sm font-medium">{doc.vitalSigns.bloodPressure}</p>
                        </div>
                      )}
                      {doc.vitalSigns.heartRate && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Heart className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Heart Rate</span>
                          </div>
                          <p className="text-sm font-medium">{doc.vitalSigns.heartRate} bpm</p>
                        </div>
                      )}
                      {doc.vitalSigns.temperature && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Thermometer className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Temperature</span>
                          </div>
                          <p className="text-sm font-medium">{doc.vitalSigns.temperature}°C</p>
                        </div>
                      )}
                      {doc.vitalSigns.oxygenSaturation && (
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Droplets className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">O2 Saturation</span>
                          </div>
                          <p className="text-sm font-medium">{doc.vitalSigns.oxygenSaturation}%</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No vital signs documented</p>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="labs" className="border rounded-lg px-4">
                <AccordionTrigger data-testid="accordion-lab-results" className="hover:no-underline">
                  <span className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Lab Results
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  {doc.labResults && doc.labResults.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Test</TableHead>
                            <TableHead>Result</TableHead>
                            <TableHead>Normal Range</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {doc.labResults.map((lab, idx) => (
                            <TableRow
                              key={idx}
                              className={lab.isAbnormal ? "bg-rose-50 dark:bg-rose-950/20" : ""}
                              data-testid={`row-lab-${idx}`}
                            >
                              <TableCell className="font-medium">{lab.testName}</TableCell>
                              <TableCell>
                                <span className={lab.isAbnormal ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                                  {lab.result} {lab.unit}
                                </span>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{lab.normalRange}</TableCell>
                              <TableCell className="text-muted-foreground">{lab.testDate}</TableCell>
                              <TableCell>
                                {lab.isAbnormal ? (
                                  <Badge variant="destructive" className="text-xs">Abnormal</Badge>
                                ) : (
                                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs">Normal</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No lab results documented</p>
                  )}
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="treatment" className="border rounded-lg px-4">
                <AccordionTrigger data-testid="accordion-treatment-plan" className="hover:no-underline">
                  <span className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Treatment Plan
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-treatment-plan">
                    {doc.treatmentPlan || "No treatment plan documented"}
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function generateTimelineFromCase(fwaCase: FwaCase | undefined): Array<{ date: string; event: string; agent: string }> {
  if (!fwaCase) return [];
  
  const timeline: Array<{ date: string; event: string; agent: string }> = [];
  const createdDate = fwaCase.createdAt ? new Date(fwaCase.createdAt) : new Date();
  
  const formatDate = (date: Date, minutesOffset: number = 0) => {
    const d = new Date(date.getTime() + minutesOffset * 60000);
    return d.toISOString().replace("T", " ").substring(0, 16);
  };
  
  timeline.push({
    date: formatDate(createdDate),
    event: "Case created and ingested into FWA system",
    agent: "System"
  });
  
  timeline.push({
    date: formatDate(createdDate, 1),
    event: "A1 Analysis initiated",
    agent: "Analysis Agent"
  });
  
  if (fwaCase.phase === "a2_categorization" || fwaCase.phase === "a3_action") {
    timeline.push({
      date: formatDate(createdDate, 5),
      event: "A1 Analysis completed - Findings generated",
      agent: "Analysis Agent"
    });
    timeline.push({
      date: formatDate(createdDate, 6),
      event: "A2 Categorization initiated",
      agent: "Categorization Agent"
    });
  }
  
  if (fwaCase.phase === "a3_action") {
    timeline.push({
      date: formatDate(createdDate, 10),
      event: "A2 Categorization completed - FWA category assigned",
      agent: "Categorization Agent"
    });
    timeline.push({
      date: formatDate(createdDate, 11),
      event: "A3 Action phase initiated",
      agent: "Action Agent"
    });
  }
  
  if (fwaCase.status === "resolved") {
    const updatedDate = fwaCase.updatedAt ? new Date(fwaCase.updatedAt) : createdDate;
    timeline.push({
      date: formatDate(updatedDate),
      event: "Case resolved and closed",
      agent: "System"
    });
  }
  
  return timeline;
}

export default function FWACaseDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const [isProgressDialogOpen, setIsProgressDialogOpen] = useState(false);

  const { data: fwaCase, isLoading: isLoadingCase } = useQuery<FwaCase>({
    queryKey: ["/api/fwa/cases", id],
  });

  const caseUuid = fwaCase?.id;

  const { data: findings, isLoading: isLoadingFindings } = useQuery<FwaAnalysisFinding[]>({
    queryKey: ["/api/fwa/cases", caseUuid, "findings"],
    enabled: !!caseUuid,
  });

  const { data: categories, isLoading: isLoadingCategories } = useQuery<FwaCategory[]>({
    queryKey: ["/api/fwa/cases", caseUuid, "categories"],
    enabled: !!caseUuid,
  });

  const { data: actions, isLoading: isLoadingActions } = useQuery<FwaAction[]>({
    queryKey: ["/api/fwa/cases", caseUuid, "actions"],
    enabled: !!caseUuid,
  });

  const { data: claimServices, isLoading: isLoadingServices } = useQuery<Array<{
    id: string;
    claimId: string;
    serviceCode: string | null;
    serviceName: string | null;
    quantity: number | null;
    unitPrice: string | null;
    totalPrice: string | null;
    serviceDate: string | null;
    diagnosisCode: string | null;
    modifiers: string | null;
    renderingProviderId: string | null;
    status: string | null;
    notes: string | null;
  }>>({
    queryKey: ["/api/fwa/cases", caseUuid, "services"],
    enabled: !!caseUuid,
  });

  const { data: providers } = useQuery<DemoProvider[]>({
    queryKey: ["/api/demo/providers"],
  });

  const { data: patients } = useQuery<DemoPatient[]>({
    queryKey: ["/api/demo/patients"],
  });

  const progressMutation = useMutation({
    mutationFn: async ({ phase, status }: { phase: string; status: string }) => {
      if (!caseUuid) {
        throw new Error("Case not loaded yet. Please wait and try again.");
      }
      const response = await apiRequest("POST", `/api/fwa/cases/${caseUuid}/run-analysis`, { targetPhase: phase });
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/cases", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/cases", caseUuid, "findings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/cases", caseUuid, "categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/cases", caseUuid, "actions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/cases"] });
      const targetLabel = variables.status === "resolved" 
        ? "Complete" 
        : variables.phase === "a2_categorization" ? "A2" : "A3";
      toast({
        title: "AI Analysis Complete",
        description: `${data.itemsCreated || 0} items generated. Case advanced to ${targetLabel}.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to run AI analysis.",
        variant: "destructive",
      });
    },
  });

  const runCurrentPhaseAnalysisMutation = useMutation({
    mutationFn: async () => {
      if (!caseUuid || !fwaCase) {
        throw new Error("Case not loaded yet. Please wait and try again.");
      }
      const currentPhase = fwaCase.phase || "a1_analysis";
      const response = await apiRequest("POST", `/api/fwa/cases/${caseUuid}/run-analysis`, { targetPhase: currentPhase });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/cases", caseUuid, "findings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/cases", caseUuid, "categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/cases", caseUuid, "actions"] });
      toast({
        title: "AI Analysis Complete",
        description: `Generated ${data.itemsCreated || 0} new items for current phase.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to run AI analysis.",
        variant: "destructive",
      });
    },
  });

  const getNextPhaseInfo = () => {
    const currentPhase = fwaCase?.phase || "a1_analysis";
    if (currentPhase === "a1_analysis") {
      return {
        targetPhase: "a2_categorization",
        targetStatus: "categorized",
        label: "A2",
        description: "This will run AI agents to classify the detected FWA patterns into categories (upcoding, unbundling, phantom billing, etc.) with confidence scores. The AI will analyze billing patterns and generate categorization results.",
      };
    } else if (currentPhase === "a2_categorization") {
      return {
        targetPhase: "a3_action",
        targetStatus: "action_pending",
        label: "A3",
        description: "This will run AI agents to generate corrective actions based on inappropriate care findings. The AI will calculate potential exposure amounts and recommend specific actions based on the categorized findings.",
      };
    } else {
      return {
        targetPhase: "a3_action",
        targetStatus: "resolved",
        label: "Complete",
        description: "Completing this case will mark it as resolved. All findings, categories, and actions will be finalized and the case will be closed.",
      };
    }
  };

  const handleProgressConfirm = () => {
    const { targetPhase, targetStatus } = getNextPhaseInfo();
    progressMutation.mutate({ phase: targetPhase, status: targetStatus });
    setIsProgressDialogOpen(false);
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportReport = () => {
    if (!fwaCase) return;

    setIsExporting(true);

    try {
      const escapeCSV = (value: string | number | null | undefined): string => {
        const str = String(value ?? "");
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csvRows: string[] = [];

      csvRows.push("FWA Case Export Report");
      csvRows.push(`Generated At,${new Date().toISOString()}`);
      csvRows.push("");

      csvRows.push("CASE DETAILS");
      csvRows.push("Field,Value");
      csvRows.push(`Case ID,${escapeCSV(fwaCase.caseId)}`);
      csvRows.push(`Status,${escapeCSV(fwaCase.status)}`);
      csvRows.push(`Phase,${escapeCSV(displayPhase)}`);
      csvRows.push(`Priority,${escapeCSV(fwaCase.priority)}`);
      csvRows.push(`Total Amount,${displayAmount}`);
      csvRows.push(`Exposure Amount,${displayExposureAmount}`);
      csvRows.push(`Date Detected,${escapeCSV(displayDateDetected)}`);
      csvRows.push(`Provider ID,${escapeCSV(provider?.providerId || fwaCase.providerId)}`);
      csvRows.push(`Provider Name,${escapeCSV(provider?.providerName || "Unknown")}`);
      csvRows.push(`Patient ID,${escapeCSV(patient?.patientId || fwaCase.patientId)}`);
      csvRows.push(`Patient Name,${escapeCSV(patient?.patientName || "Unknown")}`);
      csvRows.push("");

      csvRows.push("FINDINGS (A1 Analysis)");
      csvRows.push("Finding Type,Description,Confidence,Severity");
      if (a1Findings.length > 0) {
        a1Findings.forEach(f => {
          csvRows.push(`${escapeCSV(f.findingType)},${escapeCSV(f.description)},${f.confidence}%,${escapeCSV(f.severity)}`);
        });
      } else {
        csvRows.push("No findings available,,,");
      }
      csvRows.push("");

      csvRows.push("CATEGORIES (A2 Categorization)");
      csvRows.push("Category Type,Sub-Category,Confidence,Severity");
      if (a2Categories.length > 0) {
        a2Categories.forEach(c => {
          csvRows.push(`${escapeCSV(c.categoryType)},${escapeCSV(c.subCategory)},${c.confidenceScore}%,${c.severityScore}%`);
        });
      } else {
        csvRows.push("No categories available,,,");
      }
      csvRows.push("");

      csvRows.push("ACTIONS (A3 Remediation)");
      csvRows.push("Action Type,Status,Amount,Justification");
      if (a3Actions.length > 0) {
        a3Actions.forEach(a => {
          csvRows.push(`${escapeCSV(a.actionType)},${escapeCSV(a.status)},${a.amount || 0},${escapeCSV(a.justification)}`);
        });
      } else {
        csvRows.push("No actions available,,,");
      }

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `fwa-case-${fwaCase.caseId}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Report Exported",
        description: `Case report downloaded as fwa-case-${fwaCase.caseId}.csv`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export the case report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const provider = providers?.find(p => p.providerId === fwaCase?.providerId);
  const patient = patients?.find(p => p.patientId === fwaCase?.patientId);

  const isResolved = fwaCase?.status === "resolved";
  const canProgress = fwaCase && !isResolved && !progressMutation.isPending;

  const statusConfig: Record<string, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" },
    analyzing: { label: "Analyzing", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    categorized: { label: "Categorized", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
    action_pending: { label: "Action Pending", className: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
    resolved: { label: "Resolved", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  };

  const getDisplayPhase = (phase: string | null | undefined) => {
    if (!phase) return "A1";
    if (phase === "a1_analysis") return "A1";
    if (phase === "a2_categorization") return "A2";
    if (phase === "a3_action") return "A3";
    return phase;
  };

  const displayPhase = getDisplayPhase(fwaCase?.phase);
  const displayStatus = fwaCase?.status || "analyzing";
  const displayAmount = fwaCase?.totalAmount ? Number(fwaCase.totalAmount) : 0;
  const displayExposureAmount = fwaCase?.recoveryAmount ? Number(fwaCase.recoveryAmount) : 0;
  const displayDateDetected = fwaCase?.createdAt ? new Date(fwaCase.createdAt).toISOString().split("T")[0] : "N/A";
  
  const status = statusConfig[displayStatus] || statusConfig.analyzing;

  const a1Findings = findings || [];
  const a2Categories = categories || [];
  const a3Actions = actions || [];

  const prospectiveActions = a3Actions.filter((a) => a.actionType === "preventive" || (a.actionType as string) === "prospective");
  const retrospectiveActions = a3Actions.filter((a) => a.actionType === "recovery" || (a.actionType as string) === "retrospective");

  const timeline = generateTimelineFromCase(fwaCase);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/fwa/cases">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="flex-1">
          {isLoadingCase ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : fwaCase ? (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold" data-testid="page-title">Case {fwaCase.caseId}</h1>
                <Badge className={status.className}>{status.label}</Badge>
                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                  Phase {displayPhase}
                </Badge>
                {fwaCase.priority && (
                  <Badge variant={fwaCase.priority === "high" ? "destructive" : fwaCase.priority === "medium" ? "secondary" : "outline"}>
                    {fwaCase.priority.toUpperCase()}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">{provider?.providerName || fwaCase.providerId}</p>
            </>
          ) : (
            <div>
              <h1 className="text-2xl font-bold text-muted-foreground">Case Not Found</h1>
              <p className="text-muted-foreground">No FWA case exists for this claim. The claim may not have been flagged for investigation yet.</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" data-testid="button-export" onClick={handleExportReport} disabled={!fwaCase || isExporting}>{isExporting ? "Exporting..." : "Export Report"}</Button>
          <Button 
            variant="outline"
            data-testid="button-run-ai-analysis" 
            disabled={!fwaCase || runCurrentPhaseAnalysisMutation.isPending || isResolved}
            onClick={() => runCurrentPhaseAnalysisMutation.mutate()}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {runCurrentPhaseAnalysisMutation.isPending ? "Analyzing..." : `Run ${displayPhase} AI Analysis`}
          </Button>
          <Button 
            data-testid="button-progress-workflow" 
            disabled={!canProgress}
            onClick={() => setIsProgressDialogOpen(true)}
          >
            {progressMutation.isPending ? "Running AI Analysis..." : `Progress to ${displayPhase === "A1" ? "A2" : displayPhase === "A2" ? "A3" : "Complete"}`}
          </Button>
        </div>
      </div>

      <AlertDialog open={isProgressDialogOpen} onOpenChange={setIsProgressDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="dialog-title">
              Advance to Phase {getNextPhaseInfo().label}?
            </AlertDialogTitle>
            <AlertDialogDescription data-testid="dialog-description">
              {getNextPhaseInfo().description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-dialog-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              data-testid="button-dialog-confirm"
              onClick={handleProgressConfirm}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PhaseProgressRail currentPhase={fwaCase?.phase ?? "a1_analysis"} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <DollarSign className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Amount</p>
                {isLoadingCase ? (
                  <Skeleton className="h-6 w-20" />
                ) : (
                  <p className="text-lg font-bold" data-testid="text-total-amount">
                    ${displayAmount.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Exposure Amount</p>
                {isLoadingCase ? (
                  <Skeleton className="h-6 w-20" />
                ) : (
                  <p className="text-lg font-bold text-green-600" data-testid="text-exposure-amount">
                    ${displayExposureAmount.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Building className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Provider</p>
                {isLoadingCase ? (
                  <Skeleton className="h-5 w-20" />
                ) : (
                  <p className="text-sm font-medium" data-testid="text-provider-id">{fwaCase?.providerId || "N/A"}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Detected</p>
                {isLoadingCase ? (
                  <Skeleton className="h-5 w-24" />
                ) : (
                  <p className="text-sm font-medium" data-testid="text-date-detected">{displayDateDetected}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ClaimInformationSection
        claimId={fwaCase?.claimId || ""}
        patientId={fwaCase?.patientId || ""}
        patientName={patient?.patientName}
        providerId={fwaCase?.providerId || ""}
        providerName={provider?.providerName || ""}
        providerType={provider?.providerType || ""}
        specialty={provider?.specialty || ""}
        isLoading={isLoadingCase}
        caseId={fwaCase?.id}
      />

      <ServicesTableSection services={claimServices} isLoading={isLoadingServices} />

      {/* All investigation sections in one accordion */}
      <Accordion type="multiple" defaultValue={["document-comparison", "findings-a1", "categories-a2", "actions-a3"]} className="space-y-4">
        <AccordionItem value="document-comparison" className="border rounded-lg">
          <AccordionTrigger
            className="px-4 hover:no-underline"
            data-testid="accordion-document-comparison"
          >
            <span className="flex items-center gap-2">
              <Files className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="font-semibold">Document Comparison</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <DocumentCompareSection claimReference={fwaCase?.claimId || ""} />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="findings-a1" className="border rounded-lg">
          <AccordionTrigger
            className="px-4 hover:no-underline"
            data-testid="accordion-findings-a1"
          >
            <span className="flex items-center gap-2">
              <Search className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="font-semibold">A1 - Analysis Findings</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            {isLoadingFindings ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : a1Findings.length > 0 ? (
              <div className="space-y-4">
                {a1Findings.map((finding) => (
                  <div key={finding.id} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{finding.findingType}</Badge>
                      <span className="text-sm text-muted-foreground">{Number(finding.confidence)}% confidence</span>
                    </div>
                    <p className="text-sm">{finding.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No analysis findings available yet</p>
                <p className="text-xs text-muted-foreground mt-1">Findings will appear here once A1 analysis is complete</p>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="categories-a2" className="border rounded-lg">
          <AccordionTrigger
            className="px-4 hover:no-underline"
            data-testid="accordion-categories-a2"
          >
            <span className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="font-semibold">A2 - FWA Categorization</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            {isLoadingCategories ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : a2Categories.length > 0 ? (
              <div className="space-y-4">
                {a2Categories.map((cat) => (
                  <div key={cat.id} className="p-4 bg-muted/50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Category</p>
                        <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 mt-1">
                          {cat.categoryType}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Sub-Category</p>
                        <p className="font-medium mt-1">{cat.subCategory}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Confidence</p>
                        <p className="font-medium mt-1">{Number(cat.confidenceScore)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Severity</p>
                        <p className="font-medium mt-1">{Number(cat.severityScore)}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No FWA categorization available yet</p>
                <p className="text-xs text-muted-foreground mt-1">Categories will appear here once A2 categorization is complete</p>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="actions-a3" className="border rounded-lg">
          <AccordionTrigger
            className="px-4 hover:no-underline"
            data-testid="accordion-actions-a3"
          >
            <span className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="font-semibold">A3 - Remediation Actions</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            {isLoadingActions ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-24 w-full" />
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-24 w-full" />
                </div>
              </div>
            ) : a3Actions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    Prospective Actions
                  </h4>
                  {prospectiveActions.length > 0 ? prospectiveActions.map((action) => (
                    <div key={action.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {action.status === "completed" ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-600" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{action.justification}</p>
                          <p className="text-xs text-muted-foreground capitalize">{action.status}</p>
                        </div>
                      </div>
                      {action.amount && (
                        <span className="text-sm font-medium text-green-600">
                          ${Number(action.amount).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground">No prospective actions yet</p>
                  )}
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-purple-600" />
                    Retrospective Actions
                  </h4>
                  {retrospectiveActions.length > 0 ? retrospectiveActions.map((action) => (
                    <div key={action.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {action.status === "completed" ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-600" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{action.justification}</p>
                          <p className="text-xs text-muted-foreground capitalize">{action.status}</p>
                        </div>
                      </div>
                      {action.amount && Number(action.amount) > 0 && (
                        <span className="text-sm font-medium text-purple-600">
                          ${Number(action.amount).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground">No retrospective actions yet</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <TrendingUp className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No remediation actions available yet</p>
                <p className="text-xs text-muted-foreground mt-1">Actions will appear here once A3 phase is initiated</p>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Accordion type="multiple" defaultValue={["timeline"]} className="space-y-4">
        <AccordionItem value="timeline" className="border rounded-lg">
          <AccordionTrigger
            className="px-4 hover:no-underline"
            data-testid="accordion-timeline"
          >
            <span className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="font-semibold">Case Timeline</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="relative" data-testid="timeline-section">
              {timeline.length > 0 ? (
                timeline.map((event, idx) => (
                  <div key={idx} className="flex gap-4 pb-6 last:pb-0" data-testid={`timeline-event-${idx}`}>
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      {idx < timeline.length - 1 && (
                        <div className="w-0.5 flex-1 bg-purple-200 dark:bg-purple-800 mt-2" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{event.event}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">{event.date}</span>
                        <Badge variant="outline" className="text-xs">{event.agent}</Badge>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-muted/30 rounded-lg text-center">
                  <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No timeline events available</p>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
