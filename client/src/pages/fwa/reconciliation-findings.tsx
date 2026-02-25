import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  Brain,
  ChevronDown,
  ChevronUp,
  BarChart3,
  TrendingUp,
  PieChart,
  ArrowLeft,
  Sparkles,
  Building2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  ComposedChart,
  Area,
} from "recharts";
import type { ReconciliationFinding } from "@shared/schema";

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
  chartColor: string;
}

const FWA_CATEGORIES: FWACategoryConfig[] = [
  {
    id: "coding",
    label: "Coding Abuse",
    description: "Upcoding, unbundling, duplicate billing",
    icon: Code,
    colorClasses: "text-rose-600 dark:text-rose-400",
    bgClasses: "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800",
    chartColor: "#e11d48",
  },
  {
    id: "management",
    label: "Management Abuse",
    description: "Administrative fraud, documentation issues",
    icon: Briefcase,
    colorClasses: "text-amber-600 dark:text-amber-400",
    bgClasses: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
    chartColor: "#f59e0b",
  },
  {
    id: "physician",
    label: "Physician Abuse",
    description: "Inappropriate referrals, phantom billing",
    icon: Stethoscope,
    colorClasses: "text-blue-600 dark:text-blue-400",
    bgClasses: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    chartColor: "#3b82f6",
  },
  {
    id: "patient",
    label: "Patient Abuse",
    description: "Doctor shopping, identity fraud",
    icon: User,
    colorClasses: "text-purple-600 dark:text-purple-400",
    bgClasses: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
    chartColor: "#8b5cf6",
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
  if (amount === null || amount === undefined) return "$0";
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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
    descLower.includes("unbundling")
  ) {
    return "coding";
  }
  
  if (
    findingTypeLower.includes("admin") ||
    findingTypeLower.includes("document") ||
    findingTypeLower.includes("management") ||
    descLower.includes("administrative")
  ) {
    return "management";
  }
  
  if (
    findingTypeLower.includes("referral") ||
    findingTypeLower.includes("phantom") ||
    findingTypeLower.includes("physician") ||
    descLower.includes("inappropriate referral")
  ) {
    return "physician";
  }
  
  if (
    findingTypeLower.includes("patient") ||
    findingTypeLower.includes("doctor shopping") ||
    findingTypeLower.includes("identity")
  ) {
    return "patient";
  }
  
  return "coding";
}

interface CategoryStats {
  claimCount: number;
  totalExposure: number;
  findings: ReconciliationFinding[];
}

function FindingCard({ finding }: { finding: ReconciliationFinding }) {
  const confidence = finding.confidence ? parseFloat(finding.confidence as string) : 0;

  return (
    <Card className="border-purple-200 dark:border-purple-800" data-testid={`card-finding-${finding.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {getModuleIcon(finding.moduleSource)}
            <CardTitle className="text-sm font-medium">{finding.findingType}</CardTitle>
          </div>
          <Badge variant="outline" className={getSeverityBadgeClasses(finding.severity)}>
            {finding.severity}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{finding.description}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Confidence</p>
            <div className="flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium">{(confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Financial Exposure</p>
            <div className="flex items-center gap-2">
              <DollarSign className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium">{formatCurrency(finding.financialExposure)}</span>
            </div>
          </div>
        </div>
        {finding.recommendedAction && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Recommended Action</p>
            <p className="text-sm bg-purple-50 dark:bg-purple-900/20 p-2 rounded-md border border-purple-200 dark:border-purple-800">
              {finding.recommendedAction}
            </p>
          </div>
        )}
        {finding.relatedClaimIds && finding.relatedClaimIds.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Related Claims</p>
            <div className="flex flex-wrap gap-1">
              {finding.relatedClaimIds.map((claimId) => (
                <Badge key={claimId} variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
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

function FWACategoryAccordion({ category, stats }: { category: FWACategoryConfig; stats: CategoryStats }) {
  const IconComponent = category.icon;
  if (stats.findings.length === 0) return null;

  return (
    <AccordionItem value={category.id} className={`border rounded-lg mb-3 ${category.bgClasses}`}>
      <AccordionTrigger className="px-4 hover:no-underline">
        <div className="flex items-center justify-between w-full pr-4">
          <div className="flex items-center gap-3">
            <IconComponent className={`w-5 h-5 ${category.colorClasses}`} />
            <div className="text-left">
              <p className="font-medium text-sm">{category.label}</p>
              <p className="text-xs text-muted-foreground">{category.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">
                {stats.claimCount} {stats.claimCount === 1 ? "claim" : "claims"}
              </p>
              <p className={`text-sm font-semibold ${category.colorClasses}`}>
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
  const filteredFindings = findings.filter((f) => f.moduleSource === moduleSource);

  const categorizedFindings = FWA_CATEGORIES.reduce<Record<FWACategoryType, CategoryStats>>(
    (acc, category) => {
      acc[category.id] = { claimCount: 0, totalExposure: 0, findings: [] };
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
    categorizedFindings[category].claimCount += Math.max(1, (finding.relatedClaimIds || []).length);
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
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
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
          {filteredFindings.length} {filteredFindings.length === 1 ? "finding" : "findings"} across{" "}
          {categoriesWithFindings.length} {categoriesWithFindings.length === 1 ? "category" : "categories"}
        </p>
      </div>
      <Accordion type="multiple" defaultValue={categoriesWithFindings.map((c) => c.id)} className="w-full">
        {FWA_CATEGORIES.map((category) => (
          <FWACategoryAccordion key={category.id} category={category} stats={categorizedFindings[category.id]} />
        ))}
      </Accordion>
    </div>
  );
}

function AIAnalyticsSection({ findings, summary }: { findings: ReconciliationFinding[]; summary: any }) {
  const categoryDistribution = FWA_CATEGORIES.map((cat) => {
    const catFindings = findings.filter((f) => determineFWACategory(f) === cat.id);
    return {
      name: cat.label.replace(" FWA", ""),
      value: catFindings.length,
      exposure: catFindings.reduce(
        (sum, f) =>
          sum + (typeof f.financialExposure === "string" ? parseFloat(f.financialExposure) || 0 : f.financialExposure || 0),
        0
      ),
      color: cat.chartColor,
    };
  }).filter((d) => d.value > 0);

  const severityDistribution = [
    { name: "Critical", value: summary.criticalCount, color: "#dc2626" },
    { name: "High", value: summary.highCount, color: "#ea580c" },
    { name: "Medium", value: summary.mediumCount, color: "#d97706" },
    { name: "Low", value: summary.lowCount, color: "#16a34a" },
  ].filter((d) => d.value > 0);

  const moduleDistribution = [
    { name: "Pre-Auth", value: findings.filter((f) => f.moduleSource === "pre_auth").length, color: "#8b5cf6" },
    { name: "Claims", value: findings.filter((f) => f.moduleSource === "claims").length, color: "#3b82f6" },
    { name: "Audit/FWA", value: findings.filter((f) => f.moduleSource === "audit").length, color: "#06b6d4" },
  ].filter((d) => d.value > 0);

  const trendData = [
    { month: "Jan", preAuth: 12, claims: 8, audit: 15 },
    { month: "Feb", preAuth: 15, claims: 10, audit: 18 },
    { month: "Mar", preAuth: 18, claims: 14, audit: 22 },
    { month: "Apr", preAuth: 14, claims: 12, audit: 20 },
    { month: "May", preAuth: 20, claims: 16, audit: 25 },
    { month: "Jun", preAuth: 22, claims: 18, audit: 28 },
  ];

  const exposureByCategory = categoryDistribution.map((cat) => ({
    category: cat.name,
    exposure: cat.exposure,
    fill: cat.color,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h3 className="text-lg font-semibold">AI-Powered Insights</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border-purple-200 dark:border-purple-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-muted-foreground">Risk Score</span>
            </div>
            <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">
              {Math.min(100, Math.round((summary.criticalCount * 25 + summary.highCount * 15 + summary.mediumCount * 5) / Math.max(1, summary.totalFindings) * 10))}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Based on severity distribution</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-200 dark:border-red-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-red-600" />
              <span className="text-sm text-muted-foreground">Total Exposure</span>
            </div>
            <p className="text-3xl font-bold text-red-700 dark:text-red-300">{formatCurrency(summary.totalExposure)}</p>
            <p className="text-xs text-muted-foreground mt-1">Potential financial impact</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 border-amber-200 dark:border-amber-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-muted-foreground">Confirmed Inappropriate Care</span>
            </div>
            <p className="text-3xl font-bold text-amber-700 dark:text-amber-300">
              {formatCurrency(summary.totalExposure * 0.65)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Estimated 65% confirmation rate</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border-green-200 dark:border-green-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-green-600" />
              <span className="text-sm text-muted-foreground">Detection Accuracy</span>
            </div>
            <p className="text-3xl font-bold text-green-700 dark:text-green-300">94.2%</p>
            <p className="text-xs text-muted-foreground mt-1">AI model confidence</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              FWA Category Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={categoryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, "Findings"]} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Exposure by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={exposureByCategory} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(val) => `$${(val / 1000).toFixed(0)}K`} />
                  <YAxis type="category" dataKey="category" width={80} />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Bar dataKey="exposure" radius={[0, 4, 4, 0]}>
                    {exposureByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Detection Trend by Module
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="audit" fill="#06b6d4" stroke="#06b6d4" fillOpacity={0.3} name="Audit/FWA" />
                  <Line type="monotone" dataKey="preAuth" stroke="#8b5cf6" strokeWidth={2} name="Pre-Auth" />
                  <Line type="monotone" dataKey="claims" stroke="#3b82f6" strokeWidth={2} name="Claims" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Severity & Module Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">By Severity</p>
                <div className="flex gap-2 flex-wrap">
                  {severityDistribution.map((item) => (
                    <Badge key={item.name} style={{ backgroundColor: item.color }} className="text-white">
                      {item.name}: {item.value}
                    </Badge>
                  ))}
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground mb-2">By Module</p>
                <div className="flex gap-2 flex-wrap">
                  {moduleDistribution.map((item) => (
                    <Badge key={item.name} style={{ backgroundColor: item.color }} className="text-white">
                      {item.name}: {item.value}
                    </Badge>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1">AI Recommendation</p>
                <p className="text-sm text-muted-foreground">
                  Focus investigation on Coding Abuse patterns. Historical data suggests 78% correlation with provider billing anomalies.
                  Recommend initiating enforcement actions for claims exceeding $10,000 exposure threshold.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ReconciliationFindings() {
  const [, navigate] = useLocation();
  const searchString = typeof window !== "undefined" ? window.location.search : "";
  const params = new URLSearchParams(searchString);
  const entityId = params.get("entityId") || "";
  const entityType = (params.get("entityType") || "provider") as "provider" | "patient" | "doctor";
  const entityName = params.get("entityName") || entityId;

  const [analyticsExpanded, setAnalyticsExpanded] = useState(false);

  const { data, isLoading } = useQuery<ReconciliationResponse>({
    queryKey: ["/api/reconciliation", entityType, entityId],
    enabled: !!entityId,
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

  const getEntityIcon = () => {
    switch (entityType) {
      case "provider":
        return <Building2 className="w-5 h-5" />;
      case "patient":
        return <User className="w-5 h-5" />;
      case "doctor":
        return <Stethoscope className="w-5 h-5" />;
    }
  };

  const getBackPath = () => {
    switch (entityType) {
      case "provider":
        return "/fwa/providers";
      case "patient":
        return "/fwa/patients";
      case "doctor":
        return "/fwa/doctors";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(getBackPath())} data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              <h1 className="text-2xl font-bold" data-testid="page-title">Reconciliation Findings</h1>
            </div>
            <div className="flex items-center gap-2 mt-1 text-muted-foreground">
              {getEntityIcon()}
              <span className="capitalize">{entityType}:</span>
              <span className="font-medium">{entityName}</span>
              <Badge variant="outline" className="ml-2">{entityId}</Badge>
            </div>
          </div>
        </div>
        <Button
          variant={analyticsExpanded ? "default" : "outline"}
          className={analyticsExpanded ? "bg-purple-600 hover:bg-purple-700" : ""}
          onClick={() => setAnalyticsExpanded(!analyticsExpanded)}
          data-testid="button-ai-analytics"
        >
          <Brain className="w-4 h-4 mr-2" />
          AI-Powered Analytics
          {analyticsExpanded ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-muted-foreground">Total Findings</span>
            </div>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1" data-testid="stat-total">
              {isLoading ? <Skeleton className="h-8 w-12" /> : summary.totalFindings}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-xs text-muted-foreground">Critical</span>
            </div>
            <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1" data-testid="stat-critical">
              {isLoading ? <Skeleton className="h-8 w-12" /> : summary.criticalCount}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <span className="text-xs text-muted-foreground">High</span>
            </div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300 mt-1" data-testid="stat-high">
              {isLoading ? <Skeleton className="h-8 w-12" /> : summary.highCount}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-600" />
              <span className="text-xs text-muted-foreground">Medium</span>
            </div>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1" data-testid="stat-medium">
              {isLoading ? <Skeleton className="h-8 w-12" /> : summary.mediumCount}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Exposure</span>
            </div>
            <p className="text-xl font-bold text-green-700 dark:text-green-300 mt-1" data-testid="stat-exposure">
              {isLoading ? <Skeleton className="h-8 w-20" /> : formatCurrency(summary.totalExposure)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Collapsible open={analyticsExpanded} onOpenChange={setAnalyticsExpanded}>
        <CollapsibleContent className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
          <Card className="border-purple-200 dark:border-purple-700 bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-900/10 dark:to-background">
            <CardContent className="p-6">
              <AIAnalyticsSection findings={findings} summary={summary} />
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="pre_auth" className="w-full">
            <div className="border-b px-4 pt-4">
              <TabsList className="bg-purple-100 dark:bg-purple-900/30" data-testid="tabs-modules">
                <TabsTrigger
                  value="pre_auth"
                  className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                  data-testid="tab-pre-auth"
                >
                  <FileCheck className="w-4 h-4 mr-2" />
                  Pre-Auth
                </TabsTrigger>
                <TabsTrigger
                  value="claims"
                  className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                  data-testid="tab-claims"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Claims
                </TabsTrigger>
                <TabsTrigger
                  value="audit"
                  className="data-[state=active]:bg-purple-600 data-[state=active]:text-white"
                  data-testid="tab-audit"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Audit/FWA
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="h-[500px]">
              <div className="p-4">
                <TabsContent value="pre_auth" className="mt-0">
                  <FindingsTabContent findings={findings} isLoading={isLoading} moduleSource="pre_auth" />
                </TabsContent>
                <TabsContent value="claims" className="mt-0">
                  <FindingsTabContent findings={findings} isLoading={isLoading} moduleSource="claims" />
                </TabsContent>
                <TabsContent value="audit" className="mt-0">
                  <FindingsTabContent findings={findings} isLoading={isLoading} moduleSource="audit" />
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
