import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, Search, FileWarning, Eye, ShieldCheck,
  AlertTriangle, DollarSign, Users, Building2, RotateCcw, Loader2, ChevronDown,
  Sparkles, CheckCircle, XCircle, Play, FlaskConical, Target, TrendingUp
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FwaRule {
  id: string;
  ruleCode: string;
  name: string;
  description: string;
  category: string;
  severity: string;
  ruleType: string;
  conditions: any;
  weight: string;
  isActive: boolean;
  regulatoryReference: string;
  createdAt: string;
}

const categoryIcons: Record<string, typeof ShieldCheck> = {
  upcoding: DollarSign,
  unbundling: Building2,
  phantom_billing: AlertTriangle,
  duplicate_billing: FileWarning,
  identity_fraud: Users,
  kickback: DollarSign,
  medical_necessity: ShieldCheck,
  eligibility: Users,
};

const categoryColors: Record<string, string> = {
  upcoding: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  unbundling: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  phantom_billing: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  duplicate_billing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  identity_fraud: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  kickback: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  medical_necessity: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  eligibility: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  provider_pattern: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  clinical_plausibility: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  frequency_abuse: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  temporal_anomaly: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  geographic_anomaly: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const defaultCategoryStyle = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

const severityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
  low: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
};

const VALID_OPERATORS = [
  "equals", "not_equals", "greater_than", "less_than",
  "greater_than_or_equals", "less_than_or_equals", "between",
  "contains", "not_contains", "starts_with", "not_starts_with",
  "ends_with", "in", "not_in", "regex", "not_null", "is_null"
];

interface FieldRegistryItem {
  name: string;
  aliases: string[];
  type: string;
  category: string;
  description: string;
  descriptionAr: string;
  operators: string[];
}

interface FieldRegistryResponse {
  fields: FieldRegistryItem[];
  operators: string[];
  categories: string[];
}

interface FieldStatsResult {
  field: string;
  rulesAffected: number;
  details?: string[];
}

interface BulkEditState {
  operationType: "update_field" | "update_value" | "update_operator";
  oldField?: string;
  newField?: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  oldOperator?: string;
  newOperator?: string;
  categoryFilter?: string;
}

export default function FWARuleStudio() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [selectedRule, setSelectedRule] = useState<FwaRule | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [bulkEditExpanded, setBulkEditExpanded] = useState(false);
  const [previewResults, setPreviewResults] = useState<FieldStatsResult | null>(null);
  const [bulkEditData, setBulkEditData] = useState<BulkEditState>({
    operationType: "update_field",
    categoryFilter: "all",
  });
  
  // AI Rule Generator state
  const [showAIGeneratorDialog, setShowAIGeneratorDialog] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [generatedRule, setGeneratedRule] = useState<any>(null);
  
  // Rule Sandbox state
  const [activeTab, setActiveTab] = useState("rules");
  const [sandboxRuleId, setSandboxRuleId] = useState<string>("");
  const [sandboxSampleSize, setSandboxSampleSize] = useState(100);
  const [sandboxClaimType, setSandboxClaimType] = useState("all");
  const [sandboxMinAmount, setSandboxMinAmount] = useState("");
  const [sandboxMaxAmount, setSandboxMaxAmount] = useState("");
  const [sandboxResult, setSandboxResult] = useState<any>(null);
  
  const [newRule, setNewRule] = useState({
    ruleCode: "",
    name: "",
    description: "",
    category: "upcoding",
    severity: "medium",
    ruleType: "pattern",
    weight: "0.15",
    regulatoryReference: "",
  });
  const { toast } = useToast();

  const { data: rules = [], isLoading } = useQuery<FwaRule[]>({
    queryKey: ["/api/fwa/rules-library"],
  });

  const { data: fieldRegistryData } = useQuery<FieldRegistryResponse>({
    queryKey: ["/api/fwa/rules-library/field-registry"],
  });
  const fieldRegistry = fieldRegistryData?.fields || [];

  const toggleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const response = await apiRequest("PATCH", `/api/fwa/rules-library/${ruleId}/toggle`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/rules-library"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to toggle rule", variant: "destructive" });
    },
  });

  const reseedMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/fwa/rules-library/reseed");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/rules-library"] });
      toast({ 
        title: "Rules Reseeded", 
        description: `${data.rulesReseeded} rules restored to defaults` 
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to reseed rules", variant: "destructive" });
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: async (ruleData: typeof newRule) => {
      const response = await apiRequest(
        "POST",
        "/api/fwa/rules-library",
        {
          ...ruleData,
          conditions: {},
          isActive: true,
        }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/rules-library"] });
      setShowAddDialog(false);
      setNewRule({
        ruleCode: "",
        name: "",
        description: "",
        category: "upcoding",
        severity: "medium",
        ruleType: "pattern",
        weight: "0.15",
        regulatoryReference: "",
      });
      toast({ title: "Rule Created", description: "New detection rule has been added successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create rule. Please try again.", variant: "destructive" });
    },
  });

  // AI Rule Generation mutation
  const aiGenerateMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await apiRequest("POST", "/api/fwa/rules/ai-generate", { prompt });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.rule) {
        setGeneratedRule(data.rule);
        toast({ 
          title: "Rule Generated", 
          description: `AI generated rule "${data.rule.name}" with ${data.rule.confidence}% confidence` 
        });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate rule with AI. Please try again.", variant: "destructive" });
    },
  });

  // Save AI-generated rule
  const saveGeneratedRuleMutation = useMutation({
    mutationFn: async (rule: any) => {
      const response = await apiRequest("POST", "/api/fwa/rules-library", {
        ruleCode: rule.ruleCode,
        name: rule.name,
        description: rule.description,
        category: rule.category,
        severity: rule.severity,
        ruleType: rule.ruleType,
        conditions: rule.conditions,
        weight: String(rule.weight),
        regulatoryReference: rule.regulatoryReference || "",
        applicableClaimTypes: rule.applicableClaimTypes,
        isActive: true,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/rules-library"] });
      setShowAIGeneratorDialog(false);
      setAiPrompt("");
      setGeneratedRule(null);
      toast({ title: "Rule Saved", description: "AI-generated rule has been added to the library." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save rule. Please try again.", variant: "destructive" });
    },
  });

  const fieldStatsMutation = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams();
      if (bulkEditData.operationType === "update_field" && bulkEditData.oldField) {
        params.append("field", bulkEditData.oldField);
      } else if (bulkEditData.operationType === "update_value" && bulkEditData.field) {
        params.append("field", bulkEditData.field);
      } else if (bulkEditData.operationType === "update_operator" && bulkEditData.field) {
        params.append("field", bulkEditData.field);
      }
      if (bulkEditData.categoryFilter && bulkEditData.categoryFilter !== "all") {
        params.append("category", bulkEditData.categoryFilter);
      }

      const response = await apiRequest(
        "GET",
        `/api/fwa/rules-library/field-stats?${params.toString()}`
      );
      return response.json();
    },
    onSuccess: (data) => {
      setPreviewResults(data);
      toast({ 
        title: "Preview Results", 
        description: `${data.rulesAffected} rule(s) would be affected` 
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to preview changes", variant: "destructive" });
    },
  });

  const bulkUpdateFieldMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "PATCH",
        "/api/fwa/rules-library/bulk-update-field",
        {
          oldField: bulkEditData.oldField,
          newField: bulkEditData.newField,
          categoryFilter: bulkEditData.categoryFilter === "all" ? undefined : bulkEditData.categoryFilter,
        }
      );
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/rules-library"] });
      setPreviewResults(null);
      setBulkEditData({ operationType: "update_field", categoryFilter: "all" });
      toast({ 
        title: "Changes Applied", 
        description: `Updated field name in ${data.affectedRules || 0} rule(s)` 
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to apply changes", variant: "destructive" });
    },
  });

  const bulkUpdateValueMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "PATCH",
        "/api/fwa/rules-library/bulk-update-value",
        {
          field: bulkEditData.field,
          oldValue: bulkEditData.oldValue,
          newValue: bulkEditData.newValue,
          categoryFilter: bulkEditData.categoryFilter === "all" ? undefined : bulkEditData.categoryFilter,
        }
      );
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/rules-library"] });
      setPreviewResults(null);
      setBulkEditData({ operationType: "update_field", categoryFilter: "all" });
      toast({ 
        title: "Changes Applied", 
        description: `Updated values in ${data.affectedRules || 0} rule(s)` 
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to apply changes", variant: "destructive" });
    },
  });

  const bulkUpdateOperatorMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "PATCH",
        "/api/fwa/rules-library/bulk-update-operator",
        {
          field: bulkEditData.field,
          oldOperator: bulkEditData.oldOperator,
          newOperator: bulkEditData.newOperator,
          categoryFilter: bulkEditData.categoryFilter === "all" ? undefined : bulkEditData.categoryFilter,
        }
      );
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/fwa/rules-library"] });
      setPreviewResults(null);
      setBulkEditData({ operationType: "update_field", categoryFilter: "all" });
      toast({ 
        title: "Changes Applied", 
        description: `Updated operators in ${data.affectedRules || 0} rule(s)` 
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to apply changes", variant: "destructive" });
    },
  });

  // Rule Sandbox mutation
  const sandboxMutation = useMutation({
    mutationFn: async () => {
      const filters: any = {};
      if (sandboxClaimType !== "all") filters.claimType = sandboxClaimType;
      if (sandboxMinAmount) filters.minAmount = parseFloat(sandboxMinAmount);
      if (sandboxMaxAmount) filters.maxAmount = parseFloat(sandboxMaxAmount);
      
      const response = await apiRequest("POST", "/api/fwa/rules/sandbox", {
        ruleId: sandboxRuleId,
        sampleSize: sandboxSampleSize,
        filters: Object.keys(filters).length > 0 ? filters : undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setSandboxResult(data);
      toast({
        title: "Sandbox Test Complete",
        description: `Tested rule against ${data.summary.totalSampleClaims} claims - ${data.summary.flaggedClaims} flagged (${data.summary.hitRate}%)`,
      });
    },
    onError: (error) => {
      toast({
        title: "Sandbox Error",
        description: error instanceof Error ? error.message : "Failed to run sandbox test",
        variant: "destructive",
      });
    },
  });

  const filteredRules = rules.filter(rule => {
    const matchesSearch = 
      rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.ruleCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || rule.category === categoryFilter;
    const matchesSeverity = severityFilter === "all" || rule.severity === severityFilter;
    return matchesSearch && matchesCategory && matchesSeverity;
  });

  const categories = Array.from(new Set(rules.map(r => r.category)));
  const severities = Array.from(new Set(rules.map(r => r.severity)));

  const stats = {
    total: rules.length,
    active: rules.filter(r => r.isActive).length,
    critical: rules.filter(r => r.severity === "critical").length,
    high: rules.filter(r => r.severity === "high").length,
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="page-title">
            <FileWarning className="h-6 w-6 text-purple-600" />
            Rule Management Studio
          </h1>
          <p className="text-muted-foreground">
            Create, test, and manage FWA detection rules
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => reseedMutation.mutate()} 
            disabled={reseedMutation.isPending}
            data-testid="button-reseed-rules"
          >
            {reseedMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-2" />
            )}
            Reseed Defaults
          </Button>
          <Button data-testid="button-add-rule" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Rule
          </Button>
          <Button 
            data-testid="button-ai-generate-rule" 
            onClick={() => setShowAIGeneratorDialog(true)}
            className="bg-gradient-to-r from-purple-500 to-indigo-500"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            AI Generate Rule
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileWarning className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Rules</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Active Rules</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-green-600">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Critical Rules</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{stats.critical}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">High Priority</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-orange-600">{stats.high}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList data-testid="tabs-rule-studio">
          <TabsTrigger value="rules" data-testid="tab-rules">
            <FileWarning className="h-4 w-4 mr-2" />
            Rules Library
          </TabsTrigger>
          <TabsTrigger value="sandbox" data-testid="tab-sandbox">
            <FlaskConical className="h-4 w-4 mr-2" />
            Rule Sandbox
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-6">
          <Collapsible open={bulkEditExpanded} onOpenChange={setBulkEditExpanded}>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger className="flex w-full items-center justify-between p-0 hover:opacity-75 transition-opacity" data-testid="button-bulk-edit-toggle">
              <div className="flex items-center gap-2">
                <CardTitle>Bulk Edit Operations</CardTitle>
                <ChevronDown className={`h-4 w-4 transition-transform ${bulkEditExpanded ? "rotate-180" : ""}`} />
              </div>
            </CollapsibleTrigger>
            <CardDescription>
              Update multiple rules at once by field name, value, or operator
            </CardDescription>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-6 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="operation-type">Operation Type</Label>
                  <Select
                    value={bulkEditData.operationType}
                    onValueChange={(value: any) =>
                      setBulkEditData({ ...bulkEditData, operationType: value })
                    }
                  >
                    <SelectTrigger data-testid="select-operation-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="update_field">Update Field Name</SelectItem>
                      <SelectItem value="update_value">Update Value</SelectItem>
                      <SelectItem value="update_operator">Update Operator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="bulk-category-filter">Category Filter (Optional)</Label>
                  <Select
                    value={bulkEditData.categoryFilter || "all"}
                    onValueChange={(value) =>
                      setBulkEditData({ ...bulkEditData, categoryFilter: value })
                    }
                  >
                    <SelectTrigger data-testid="select-bulk-category">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {bulkEditData.operationType === "update_field" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="old-field">Old Field Name</Label>
                    <Select
                      value={bulkEditData.oldField || ""}
                      onValueChange={(value) =>
                        setBulkEditData({ ...bulkEditData, oldField: value })
                      }
                    >
                      <SelectTrigger data-testid="select-old-field">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldRegistry.map((item) => (
                          <SelectItem key={item.name} value={item.name}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="new-field">New Field Name</Label>
                    <Input
                      id="new-field"
                      placeholder="Enter new field name"
                      value={bulkEditData.newField || ""}
                      onChange={(e) =>
                        setBulkEditData({ ...bulkEditData, newField: e.target.value })
                      }
                      data-testid="input-new-field"
                    />
                  </div>
                </div>
              )}

              {bulkEditData.operationType === "update_value" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="field">Field</Label>
                    <Select
                      value={bulkEditData.field || ""}
                      onValueChange={(value) =>
                        setBulkEditData({ ...bulkEditData, field: value })
                      }
                    >
                      <SelectTrigger data-testid="select-value-field">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldRegistry.map((item) => (
                          <SelectItem key={item.name} value={item.name}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="old-value">Old Value</Label>
                    <Input
                      id="old-value"
                      placeholder="Enter old value"
                      value={bulkEditData.oldValue || ""}
                      onChange={(e) =>
                        setBulkEditData({ ...bulkEditData, oldValue: e.target.value })
                      }
                      data-testid="input-old-value"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-value">New Value</Label>
                    <Input
                      id="new-value"
                      placeholder="Enter new value"
                      value={bulkEditData.newValue || ""}
                      onChange={(e) =>
                        setBulkEditData({ ...bulkEditData, newValue: e.target.value })
                      }
                      data-testid="input-new-value"
                    />
                  </div>
                </div>
              )}

              {bulkEditData.operationType === "update_operator" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="operator-field">Field</Label>
                    <Select
                      value={bulkEditData.field || ""}
                      onValueChange={(value) =>
                        setBulkEditData({ ...bulkEditData, field: value })
                      }
                    >
                      <SelectTrigger data-testid="select-operator-field">
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldRegistry.map((item) => (
                          <SelectItem key={item.name} value={item.name}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="old-operator">Old Operator</Label>
                    <Select
                      value={bulkEditData.oldOperator || ""}
                      onValueChange={(value) =>
                        setBulkEditData({ ...bulkEditData, oldOperator: value })
                      }
                    >
                      <SelectTrigger data-testid="select-old-operator">
                        <SelectValue placeholder="Select operator" />
                      </SelectTrigger>
                      <SelectContent>
                        {VALID_OPERATORS.map((op) => (
                          <SelectItem key={op} value={op}>
                            {op.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="new-operator">New Operator</Label>
                    <Select
                      value={bulkEditData.newOperator || ""}
                      onValueChange={(value) =>
                        setBulkEditData({ ...bulkEditData, newOperator: value })
                      }
                    >
                      <SelectTrigger data-testid="select-new-operator">
                        <SelectValue placeholder="Select operator" />
                      </SelectTrigger>
                      <SelectContent>
                        {VALID_OPERATORS.map((op) => (
                          <SelectItem key={op} value={op}>
                            {op.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => fieldStatsMutation.mutate()}
                  disabled={
                    fieldStatsMutation.isPending ||
                    (bulkEditData.operationType === "update_field" && !bulkEditData.oldField) ||
                    (bulkEditData.operationType === "update_value" && (!bulkEditData.field || !bulkEditData.oldValue)) ||
                    (bulkEditData.operationType === "update_operator" && (!bulkEditData.field || !bulkEditData.oldOperator))
                  }
                  data-testid="button-preview-changes"
                >
                  {fieldStatsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Preview
                </Button>
                <Button
                  onClick={() => {
                    if (bulkEditData.operationType === "update_field") {
                      bulkUpdateFieldMutation.mutate();
                    } else if (bulkEditData.operationType === "update_value") {
                      bulkUpdateValueMutation.mutate();
                    } else {
                      bulkUpdateOperatorMutation.mutate();
                    }
                  }}
                  disabled={
                    (!previewResults && !fieldStatsMutation.isSuccess) ||
                    (bulkEditData.operationType === "update_field" &&
                      (!bulkEditData.oldField || !bulkEditData.newField)) ||
                    (bulkEditData.operationType === "update_value" &&
                      (!bulkEditData.field || !bulkEditData.oldValue || !bulkEditData.newValue)) ||
                    (bulkEditData.operationType === "update_operator" &&
                      (!bulkEditData.field || !bulkEditData.oldOperator || !bulkEditData.newOperator)) ||
                    bulkUpdateFieldMutation.isPending ||
                    bulkUpdateValueMutation.isPending ||
                    bulkUpdateOperatorMutation.isPending
                  }
                  data-testid="button-apply-changes"
                >
                  {bulkUpdateFieldMutation.isPending ||
                  bulkUpdateValueMutation.isPending ||
                  bulkUpdateOperatorMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Apply Changes
                </Button>
              </div>

              {previewResults && (
                <div className="border-t pt-4 space-y-3">
                  <h4 className="font-semibold">Preview Results</h4>
                  <div className="bg-muted p-3 rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Rules Affected:</span>
                      <Badge data-testid="preview-affected-count">
                        {previewResults.rulesAffected}
                      </Badge>
                    </div>
                    {previewResults.details && previewResults.details.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        <p className="font-medium mb-2">Affected Rules:</p>
                        <ul className="space-y-1 max-h-40 overflow-y-auto">
                          {previewResults.details.map((detail, idx) => (
                            <li key={idx} className="text-xs">
                              • {detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rules by code, name, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-rules"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>{cat.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[150px]" data-testid="select-severity">
            <SelectValue placeholder="All Severities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            {severities.map(sev => (
              <SelectItem key={sev} value={sev}>{sev}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Detection Rules ({filteredRules.length})</CardTitle>
          <CardDescription>
            Rules used by the Rule Engine method for pattern-based FWA detection
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Code</TableHead>
                  <TableHead>Rule Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRules.map((rule) => {
                  const Icon = categoryIcons[rule.category] || FileWarning;
                  return (
                    <TableRow key={rule.id} className="cursor-pointer hover-elevate" data-testid={`row-rule-${rule.ruleCode}`}>
                      <TableCell className="font-mono text-sm font-medium">{rule.ruleCode}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{rule.name}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-xs">
                            {rule.description}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={categoryColors[rule.category] || defaultCategoryStyle}>
                          <Icon className="h-3 w-3 mr-1" />
                          {rule.category.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={severityColors[rule.severity] || "bg-gray-100"}>
                          {rule.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{parseFloat(rule.weight).toFixed(1)}x</span>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={() => toggleMutation.mutate(rule.id)}
                          disabled={toggleMutation.isPending}
                          data-testid={`switch-rule-${rule.ruleCode}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedRule(rule)}
                          data-testid={`button-view-${rule.ruleCode}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredRules.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No rules found matching your criteria
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={!!selectedRule} onOpenChange={() => setSelectedRule(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-purple-600">{selectedRule?.ruleCode}</span>
              <span>{selectedRule?.name}</span>
            </DialogTitle>
            <DialogDescription>{selectedRule?.description}</DialogDescription>
          </DialogHeader>
          {selectedRule && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <Badge className={categoryColors[selectedRule.category] || defaultCategoryStyle}>
                    {selectedRule.category.replace(/_/g, " ")}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Severity</p>
                  <Badge className={severityColors[selectedRule.severity] || "bg-gray-100"}>
                    {selectedRule.severity}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Rule Type</p>
                  <p className="font-medium">{selectedRule.ruleType}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Weight</p>
                  <p className="font-medium">{parseFloat(selectedRule.weight).toFixed(1)}x</p>
                </div>
              </div>
              {selectedRule.regulatoryReference && (
                <div>
                  <p className="text-sm text-muted-foreground">Regulatory Reference</p>
                  <p className="font-medium">{selectedRule.regulatoryReference}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Conditions</p>
                <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto max-h-48">
                  {JSON.stringify(selectedRule.conditions, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Detection Rule</DialogTitle>
            <DialogDescription>Create a new FWA detection rule for the Rule Engine</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="ruleCode">Rule Code</Label>
                <Input
                  id="ruleCode"
                  placeholder="e.g., UC-201"
                  value={newRule.ruleCode}
                  onChange={(e) => setNewRule({ ...newRule, ruleCode: e.target.value })}
                  data-testid="input-rule-code"
                />
              </div>
              <div>
                <Label htmlFor="weight">Weight (multiplier)</Label>
                <Input
                  id="weight"
                  type="number"
                  min="0.1"
                  max="3.0"
                  step="0.1"
                  placeholder="1.0"
                  value={newRule.weight}
                  onChange={(e) => setNewRule({ ...newRule, weight: e.target.value })}
                  data-testid="input-weight"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="name">Rule Name</Label>
              <Input
                id="name"
                placeholder="Enter rule name"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                data-testid="input-rule-name"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this rule detects"
                value={newRule.description}
                onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                data-testid="input-rule-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={newRule.category} onValueChange={(v) => setNewRule({ ...newRule, category: v })}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoding">Upcoding</SelectItem>
                    <SelectItem value="unbundling">Unbundling</SelectItem>
                    <SelectItem value="phantom_billing">Phantom Billing</SelectItem>
                    <SelectItem value="duplicate_billing">Duplicate Billing</SelectItem>
                    <SelectItem value="identity_fraud">Identity Fraud</SelectItem>
                    <SelectItem value="kickback">Kickback</SelectItem>
                    <SelectItem value="medical_necessity">Medical Necessity</SelectItem>
                    <SelectItem value="eligibility">Eligibility</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="severity">Severity</Label>
                <Select value={newRule.severity} onValueChange={(v) => setNewRule({ ...newRule, severity: v })}>
                  <SelectTrigger data-testid="select-severity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="regulatoryReference">Regulatory Reference (optional)</Label>
              <Input
                id="regulatoryReference"
                placeholder="e.g., CHI Circular 2024-05"
                value={newRule.regulatoryReference}
                onChange={(e) => setNewRule({ ...newRule, regulatoryReference: e.target.value })}
                data-testid="input-regulatory-reference"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button
              onClick={() => createRuleMutation.mutate(newRule)}
              disabled={!newRule.ruleCode || !newRule.name || !newRule.description || createRuleMutation.isPending}
              data-testid="button-create-rule"
            >
              {createRuleMutation.isPending ? "Creating..." : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Rule Generator Dialog */}
      <Dialog open={showAIGeneratorDialog} onOpenChange={(open) => {
        setShowAIGeneratorDialog(open);
        if (!open) {
          setAiPrompt("");
          setGeneratedRule(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI Rule Generator
            </DialogTitle>
            <DialogDescription>
              Describe the FWA detection rule you want to create in plain language. The AI will generate a complete rule configuration.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!generatedRule ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="ai-prompt">Describe the rule you want to create</Label>
                  <Textarea
                    id="ai-prompt"
                    placeholder="Example: Create a rule that flags claims where the billed amount exceeds 50,000 SAR for outpatient visits, as this may indicate upcoding or billing fraud..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={5}
                    data-testid="input-ai-prompt"
                  />
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Example prompts:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• "Flag claims with more than 10 procedures in a single visit"</li>
                    <li>• "Detect when the same procedure is billed multiple times on the same day"</li>
                    <li>• "Alert when pharmacy claims exceed 5000 SAR without prior authorization"</li>
                    <li>• "Identify lab tests performed on weekends at high frequency"</li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Generated Rule</h3>
                  <Badge 
                    variant={generatedRule.confidence >= 80 ? "default" : generatedRule.confidence >= 60 ? "secondary" : "outline"}
                    className={generatedRule.confidence >= 80 ? "bg-green-500" : ""}
                  >
                    {generatedRule.confidence}% Confidence
                  </Badge>
                </div>

                <div className="grid gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="w-32 text-muted-foreground">Rule Code:</Label>
                    <span className="font-mono">{generatedRule.ruleCode}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="w-32 text-muted-foreground">Name:</Label>
                    <span className="font-medium">{generatedRule.name}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Label className="w-32 text-muted-foreground">Description:</Label>
                    <span className="text-sm">{generatedRule.description}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="w-32 text-muted-foreground">Category:</Label>
                    <Badge className={categoryColors[generatedRule.category] || defaultCategoryStyle}>
                      {generatedRule.category?.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="w-32 text-muted-foreground">Severity:</Label>
                    <Badge className={severityColors[generatedRule.severity]}>
                      {generatedRule.severity}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="w-32 text-muted-foreground">Rule Type:</Label>
                    <span>{generatedRule.ruleType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="w-32 text-muted-foreground">Weight:</Label>
                    <span>{generatedRule.weight}</span>
                  </div>
                  {generatedRule.regulatoryReference && (
                    <div className="flex items-start gap-2">
                      <Label className="w-32 text-muted-foreground">Regulatory Ref:</Label>
                      <span className="text-sm">{generatedRule.regulatoryReference}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <Label className="w-32 text-muted-foreground">Conditions:</Label>
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto flex-1">
                      {JSON.stringify(generatedRule.conditions, null, 2)}
                    </pre>
                  </div>
                </div>

                {generatedRule.confidence < 70 && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">Low confidence - please review carefully before saving</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            {!generatedRule ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setShowAIGeneratorDialog(false)}
                  data-testid="button-cancel-ai"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => aiGenerateMutation.mutate(aiPrompt)}
                  disabled={aiPrompt.length < 10 || aiGenerateMutation.isPending}
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
                  data-testid="button-generate-rule"
                >
                  {aiGenerateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Rule
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setGeneratedRule(null)}
                  data-testid="button-try-again"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={() => saveGeneratedRuleMutation.mutate(generatedRule)}
                  disabled={saveGeneratedRuleMutation.isPending}
                  data-testid="button-save-generated-rule"
                >
                  {saveGeneratedRuleMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save Rule
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

        </TabsContent>

        <TabsContent value="sandbox" className="space-y-4">
          {/* Rule Sandbox Section */}
          <Card data-testid="card-rule-sandbox">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-purple-600" />
                Rule Sandbox
              </CardTitle>
              <CardDescription>
                Test rules against sample claims to simulate their impact before deployment
              </CardDescription>
            </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Rule Selection */}
            <div>
              <Label>Select Rule to Test</Label>
              <Select 
                value={sandboxRuleId} 
                onValueChange={setSandboxRuleId}
              >
                <SelectTrigger data-testid="select-sandbox-rule">
                  <SelectValue placeholder="Choose a rule..." />
                </SelectTrigger>
                <SelectContent>
                  {rules.map(rule => (
                    <SelectItem key={rule.id} value={rule.id}>
                      <span className="font-medium">{rule.ruleCode}</span>
                      <span className="text-muted-foreground ml-2">{rule.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sample Size */}
            <div>
              <Label>Sample Size</Label>
              <Select 
                value={String(sandboxSampleSize)} 
                onValueChange={(v) => setSandboxSampleSize(parseInt(v))}
              >
                <SelectTrigger data-testid="select-sandbox-sample-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 claims</SelectItem>
                  <SelectItem value="100">100 claims</SelectItem>
                  <SelectItem value="200">200 claims</SelectItem>
                  <SelectItem value="500">500 claims</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Claim Type Filter */}
            <div>
              <Label>Claim Type (Optional)</Label>
              <Select 
                value={sandboxClaimType} 
                onValueChange={setSandboxClaimType}
              >
                <SelectTrigger data-testid="select-sandbox-claim-type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="inpatient">Inpatient</SelectItem>
                  <SelectItem value="outpatient">Outpatient</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="pharmacy">Pharmacy</SelectItem>
                  <SelectItem value="dental">Dental</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Run Button */}
            <div className="flex items-end">
              <Button
                onClick={() => sandboxMutation.mutate()}
                disabled={!sandboxRuleId || sandboxMutation.isPending}
                className="w-full"
                data-testid="button-run-sandbox"
              >
                {sandboxMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running Test...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Sandbox Test
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Optional Amount Filters */}
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <Label>Min Amount (SAR)</Label>
              <Input
                type="number"
                placeholder="0"
                value={sandboxMinAmount}
                onChange={(e) => setSandboxMinAmount(e.target.value)}
                data-testid="input-sandbox-min-amount"
              />
            </div>
            <div className="flex-1">
              <Label>Max Amount (SAR)</Label>
              <Input
                type="number"
                placeholder="No limit"
                value={sandboxMaxAmount}
                onChange={(e) => setSandboxMaxAmount(e.target.value)}
                data-testid="input-sandbox-max-amount"
              />
            </div>
          </div>

          {/* Results Section */}
          {sandboxResult && (
            <div className="space-y-4 pt-4 border-t" data-testid="sandbox-results">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Sample Size</span>
                    </div>
                    <p className="text-2xl font-bold mt-1" data-testid="text-sample-size">
                      {sandboxResult.summary.totalSampleClaims}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-muted-foreground">Claims Flagged</span>
                    </div>
                    <p className="text-2xl font-bold mt-1 text-red-600" data-testid="text-flagged-claims">
                      {sandboxResult.summary.flaggedClaims}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-500" />
                      <span className="text-sm text-muted-foreground">Hit Rate</span>
                    </div>
                    <p className="text-2xl font-bold mt-1 text-purple-600" data-testid="text-hit-rate">
                      {sandboxResult.summary.hitRate}%
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-muted-foreground">Total Exposure</span>
                    </div>
                    <p className="text-2xl font-bold mt-1 text-green-600" data-testid="text-exposure">
                      {sandboxResult.summary.totalExposure.toLocaleString()} SAR
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Rule Info */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-4 flex-wrap" data-testid="sandbox-rule-info">
                    <div>
                      <span className="text-sm text-muted-foreground">Rule:</span>
                      <span className="ml-2 font-medium" data-testid="text-sandbox-rule-code">{sandboxResult.rule.ruleCode}</span>
                      <span className="ml-2" data-testid="text-sandbox-rule-name">{sandboxResult.rule.name}</span>
                    </div>
                    <Badge variant={sandboxResult.rule.severity === "critical" || sandboxResult.rule.severity === "high" ? "destructive" : "secondary"} data-testid="badge-sandbox-severity">
                      {sandboxResult.rule.severity}
                    </Badge>
                    <Badge variant="outline" data-testid="badge-sandbox-category">{sandboxResult.rule.category}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Hits Table */}
              {sandboxResult.hits.length > 0 ? (
                <div>
                  <h4 className="font-medium mb-2">Flagged Claims ({sandboxResult.hits.length})</h4>
                  <ScrollArea className="h-64">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Claim #</TableHead>
                          <TableHead>Provider</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Why Flagged</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sandboxResult.hits.map((hit: any, idx: number) => (
                          <TableRow key={idx} data-testid={`sandbox-hit-row-${idx}`}>
                            <TableCell className="font-medium">{hit.claimNumber || hit.claimId}</TableCell>
                            <TableCell>{hit.providerName || hit.providerId || "—"}</TableCell>
                            <TableCell>{hit.patientId || "—"}</TableCell>
                            <TableCell className="text-right">
                              {parseFloat(hit.amount || "0").toLocaleString()} SAR
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{hit.claimType || "—"}</Badge>
                            </TableCell>
                            <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                              {hit.reason || "Rule conditions matched"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ShieldCheck className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p>No claims would be flagged by this rule in the sample.</p>
                </div>
              )}
            </div>
          )}

          {/* Loading State */}
          {sandboxMutation.isPending && (
            <Card data-testid="sandbox-loading">
              <CardContent className="py-12">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 mx-auto mb-3 animate-spin text-purple-500" />
                  <p className="font-medium">Running Sandbox Test...</p>
                  <p className="text-sm text-muted-foreground mt-1">Evaluating rule against sample claims</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!sandboxResult && !sandboxMutation.isPending && (
            <Card data-testid="sandbox-empty-state">
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <FlaskConical className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium" data-testid="text-empty-title">Select a rule and run a sandbox test</p>
                  <p className="text-sm mt-1" data-testid="text-empty-description">See how many claims would be flagged before deploying the rule</p>
                </div>
              </CardContent>
            </Card>
          )}
          </CardContent>
        </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
