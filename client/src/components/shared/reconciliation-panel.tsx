import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertTriangle,
  Shield,
  FileCheck,
  DollarSign,
  Target,
  FileText,
  AlertCircle,
  Code,
  Briefcase,
  Stethoscope,
  User,
} from "lucide-react";
import type { ReconciliationFinding } from "@shared/schema";

interface ReconciliationPanelProps {
  entityId: string;
  entityType: "provider" | "patient" | "doctor";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ReconciliationResponse {
  findings: ReconciliationFinding[];
  summary: {
    totalFindings: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    totalExposure: number;
  };
}

type FWACategoryType = "coding" | "management" | "physician" | "patient";

interface FWACategoryConfig {
  id: FWACategoryType;
  label: string;
  description: string;
  icon: typeof Code;
  colorClasses: string;
  bgClasses: string;
}

const FWA_CATEGORIES: FWACategoryConfig[] = [
  {
    id: "coding",
    label: "Coding Abuse",
    description: "Upcoding, unbundling, duplicate billing",
    icon: Code,
    colorClasses: "text-blue-600 dark:text-blue-400",
    bgClasses: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  },
  {
    id: "management",
    label: "Management Abuse",
    description: "Administrative fraud, documentation issues",
    icon: Briefcase,
    colorClasses: "text-amber-600 dark:text-amber-400",
    bgClasses: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
  },
  {
    id: "physician",
    label: "Physician Abuse",
    description: "Inappropriate referrals, phantom billing",
    icon: Stethoscope,
    colorClasses: "text-purple-600 dark:text-purple-400",
    bgClasses: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
  },
  {
    id: "patient",
    label: "Patient Abuse",
    description: "Doctor shopping, identity fraud",
    icon: User,
    colorClasses: "text-green-600 dark:text-green-400",
    bgClasses: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  },
];

function getSeverityBadgeClasses(severity: string) {
  switch (severity) {
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

function getModuleIcon(moduleSource: string) {
  switch (moduleSource) {
    case "pre_auth":
      return <FileCheck className="w-4 h-4" />;
    case "claims":
      return <FileText className="w-4 h-4" />;
    case "audit":
      return <Shield className="w-4 h-4" />;
    default:
      return <AlertCircle className="w-4 h-4" />;
  }
}

function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "$0.00";
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numAmount);
}

function determineFWACategory(finding: ReconciliationFinding): FWACategoryType {
  if (finding.fwaCategory) {
    return finding.fwaCategory as FWACategoryType;
  }
  
  const findingTypeLower = finding.findingType.toLowerCase();
  const descLower = finding.description?.toLowerCase() || "";
  
  if (
    findingTypeLower.includes("upcod") ||
    findingTypeLower.includes("unbundl") ||
    findingTypeLower.includes("duplicate") ||
    findingTypeLower.includes("coding") ||
    descLower.includes("upcoding") ||
    descLower.includes("unbundling") ||
    descLower.includes("duplicate billing") ||
    descLower.includes("code")
  ) {
    return "coding";
  }
  
  if (
    findingTypeLower.includes("admin") ||
    findingTypeLower.includes("document") ||
    findingTypeLower.includes("management") ||
    descLower.includes("administrative") ||
    descLower.includes("documentation") ||
    descLower.includes("missing documentation")
  ) {
    return "management";
  }
  
  if (
    findingTypeLower.includes("referral") ||
    findingTypeLower.includes("phantom") ||
    findingTypeLower.includes("physician") ||
    findingTypeLower.includes("provider") ||
    descLower.includes("inappropriate referral") ||
    descLower.includes("phantom billing") ||
    descLower.includes("kickback")
  ) {
    return "physician";
  }
  
  if (
    findingTypeLower.includes("patient") ||
    findingTypeLower.includes("doctor shopping") ||
    findingTypeLower.includes("identity") ||
    descLower.includes("doctor shopping") ||
    descLower.includes("identity fraud") ||
    descLower.includes("eligibility")
  ) {
    return "patient";
  }
  
  return "coding";
}

function FindingCard({ finding }: { finding: ReconciliationFinding }) {
  const confidence = finding.confidence
    ? parseFloat(finding.confidence as string)
    : 0;

  return (
    <Card
      className="border-purple-200 dark:border-purple-800"
      data-testid={`card-finding-${finding.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {getModuleIcon(finding.moduleSource)}
            <CardTitle className="text-sm font-medium">
              {finding.findingType}
            </CardTitle>
          </div>
          <Badge
            variant="outline"
            className={getSeverityBadgeClasses(finding.severity)}
            data-testid={`badge-severity-${finding.id}`}
          >
            {finding.severity}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p
          className="text-sm text-muted-foreground"
          data-testid={`text-description-${finding.id}`}
        >
          {finding.description}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Confidence</p>
            <div className="flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span
                className="text-sm font-medium"
                data-testid={`text-confidence-${finding.id}`}
              >
                {(confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Financial Exposure</p>
            <div className="flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span
                className="text-sm font-medium"
                data-testid={`text-exposure-${finding.id}`}
              >
                {formatCurrency(finding.financialExposure)}
              </span>
            </div>
          </div>
        </div>

        {finding.recommendedAction && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Recommended Action</p>
            <p
              className="text-sm bg-purple-50 dark:bg-purple-900/20 p-2 rounded-md border border-purple-200 dark:border-purple-800"
              data-testid={`text-action-${finding.id}`}
            >
              {finding.recommendedAction}
            </p>
          </div>
        )}

        {finding.relatedClaimIds && finding.relatedClaimIds.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Related Claims</p>
            <div
              className="flex flex-wrap gap-1"
              data-testid={`list-claims-${finding.id}`}
            >
              {finding.relatedClaimIds.map((claimId) => (
                <Badge
                  key={claimId}
                  variant="secondary"
                  className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                >
                  {claimId}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CategoryStats {
  claimCount: number;
  totalExposure: number;
  findings: ReconciliationFinding[];
}

function FWACategoryAccordion({
  category,
  stats,
}: {
  category: FWACategoryConfig;
  stats: CategoryStats;
}) {
  const IconComponent = category.icon;

  if (stats.findings.length === 0) {
    return null;
  }

  return (
    <AccordionItem
      value={category.id}
      className={`border rounded-lg mb-3 ${category.bgClasses}`}
      data-testid={`accordion-category-${category.id}`}
    >
      <AccordionTrigger
        className="px-4 hover:no-underline"
        data-testid={`trigger-category-${category.id}`}
      >
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-3">
            <IconComponent className={`w-5 h-5 ${category.colorClasses}`} />
            <div className="text-left">
              <p className="font-medium text-sm">{category.label}</p>
              <p className="text-xs text-muted-foreground">
                {category.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p
                className="text-xs text-muted-foreground"
                data-testid={`text-claim-count-${category.id}`}
              >
                {stats.claimCount} {stats.claimCount === 1 ? "claim" : "claims"}
              </p>
              <p
                className={`text-sm font-semibold ${category.colorClasses}`}
                data-testid={`text-exposure-${category.id}`}
              >
                {formatCurrency(stats.totalExposure)}
              </p>
            </div>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="space-y-3">
          {stats.findings.map((finding) => (
            <FindingCard key={finding.id} finding={finding} />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function FindingsTabContent({
  findings,
  isLoading,
  moduleSource,
}: {
  findings: ReconciliationFinding[];
  isLoading: boolean;
  moduleSource: string;
}) {
  const filteredFindings = findings.filter(
    (f) => f.moduleSource === moduleSource
  );

  const categorizedFindings = FWA_CATEGORIES.reduce<
    Record<FWACategoryType, CategoryStats>
  >(
    (acc, category) => {
      acc[category.id] = {
        claimCount: 0,
        totalExposure: 0,
        findings: [],
      };
      return acc;
    },
    {} as Record<FWACategoryType, CategoryStats>
  );

  filteredFindings.forEach((finding) => {
    const category = determineFWACategory(finding);
    categorizedFindings[category].findings.push(finding);
    categorizedFindings[category].totalExposure +=
      typeof finding.financialExposure === "string"
        ? parseFloat(finding.financialExposure) || 0
        : finding.financialExposure || 0;
    const claimIds = finding.relatedClaimIds || [];
    categorizedFindings[category].claimCount += Math.max(1, claimIds.length);
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  if (filteredFindings.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 text-muted-foreground"
        data-testid={`empty-${moduleSource}`}
      >
        <AlertCircle className="w-10 h-10 mb-3 text-purple-400" />
        <p className="text-sm">No findings from this module</p>
      </div>
    );
  }

  const categoriesWithFindings = FWA_CATEGORIES.filter(
    (cat) => categorizedFindings[cat.id].findings.length > 0
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {filteredFindings.length}{" "}
          {filteredFindings.length === 1 ? "finding" : "findings"} across{" "}
          {categoriesWithFindings.length}{" "}
          {categoriesWithFindings.length === 1 ? "category" : "categories"}
        </p>
      </div>
      <Accordion
        type="multiple"
        defaultValue={categoriesWithFindings.map((c) => c.id)}
        className="w-full"
        data-testid={`accordion-${moduleSource}`}
      >
        {FWA_CATEGORIES.map((category) => (
          <FWACategoryAccordion
            key={category.id}
            category={category}
            stats={categorizedFindings[category.id]}
          />
        ))}
      </Accordion>
    </div>
  );
}

export function ReconciliationPanel({
  entityId,
  entityType,
  open,
  onOpenChange,
}: ReconciliationPanelProps) {
  const { data, isLoading } = useQuery<ReconciliationResponse>({
    queryKey: ["/api/reconciliation", entityType, entityId],
    enabled: open && !!entityId,
  });

  const findings = data?.findings ?? [];
  const summary = data?.summary ?? {
    totalFindings: 0,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    totalExposure: 0,
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl border-l-purple-300 dark:border-l-purple-800"
        data-testid="panel-reconciliation"
      >
        <SheetHeader className="pb-4 border-b border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <SheetTitle className="text-purple-700 dark:text-purple-300">
              Reconciliation Findings
            </SheetTitle>
          </div>
          <SheetDescription>
            Consolidated findings for {entityType}: {entityId}
          </SheetDescription>
        </SheetHeader>

        <div className="py-4">
          <div
            className="grid grid-cols-3 gap-3 mb-6"
            data-testid="summary-stats"
          >
            <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs text-muted-foreground">
                    Total Findings
                  </span>
                </div>
                <p
                  className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1"
                  data-testid="stat-total-findings"
                >
                  {summary.totalFindings}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <span className="text-xs text-muted-foreground">
                    Critical
                  </span>
                </div>
                <p
                  className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1"
                  data-testid="stat-critical-count"
                >
                  {summary.criticalCount}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs text-muted-foreground">
                    Exposure
                  </span>
                </div>
                <p
                  className="text-lg font-bold text-purple-700 dark:text-purple-300 mt-1"
                  data-testid="stat-total-exposure"
                >
                  {formatCurrency(summary.totalExposure)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="pre_auth" className="w-full">
            <TabsList
              className="w-full bg-purple-100 dark:bg-purple-900/30"
              data-testid="tabs-modules"
            >
              <TabsTrigger
                value="pre_auth"
                className="flex-1 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                data-testid="tab-pre-auth"
              >
                <FileCheck className="w-4 h-4 mr-2" />
                Pre-Auth
              </TabsTrigger>
              <TabsTrigger
                value="claims"
                className="flex-1 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                data-testid="tab-claims"
              >
                <FileText className="w-4 h-4 mr-2" />
                Claims
              </TabsTrigger>
              <TabsTrigger
                value="audit"
                className="flex-1 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                data-testid="tab-audit"
              >
                <Shield className="w-4 h-4 mr-2" />
                Audit/FWA
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[calc(100vh-350px)] mt-4 pr-4">
              <TabsContent value="pre_auth">
                <FindingsTabContent
                  findings={findings}
                  isLoading={isLoading}
                  moduleSource="pre_auth"
                />
              </TabsContent>
              <TabsContent value="claims">
                <FindingsTabContent
                  findings={findings}
                  isLoading={isLoading}
                  moduleSource="claims"
                />
              </TabsContent>
              <TabsContent value="audit">
                <FindingsTabContent
                  findings={findings}
                  isLoading={isLoading}
                  moduleSource="audit"
                />
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default ReconciliationPanel;
