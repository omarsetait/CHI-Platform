import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
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
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Filter,
  Calculator,
  Loader2,
  ChevronRight,
  Target,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { KpiDefinition } from "@shared/schema";

const KPI_CATEGORIES = [
  { value: "financial", label: "Financial" },
  { value: "utilization", label: "Utilization" },
  { value: "fwa", label: "FWA" },
  { value: "claims_adjudication", label: "Claims Adjudication" },
  { value: "reconciliation", label: "Reconciliation" },
  { value: "benchmarking", label: "Benchmarking" },
  { value: "quality", label: "Quality" },
] as const;

const DATA_SOURCES = [
  { value: "claims", label: "Claims" },
  { value: "fwa_findings", label: "FWA Findings" },
  { value: "adjudication", label: "Adjudication" },
  { value: "settlements", label: "Settlements" },
  { value: "sessions", label: "Sessions" },
  { value: "membership", label: "Membership" },
  { value: "providers", label: "Providers" },
  { value: "contracts", label: "Contracts" },
  { value: "manual", label: "Manual" },
] as const;

const UNITS = [
  { value: "number", label: "Number" },
  { value: "currency", label: "Currency ($)" },
  { value: "percentage", label: "Percentage (%)" },
  { value: "ratio", label: "Ratio" },
  { value: "days", label: "Days" },
] as const;

const PEER_GROUP_DIMENSIONS = [
  "region",
  "specialty",
  "tier",
  "providerType",
  "networkStatus",
  "contractType",
];

const kpiFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").regex(/^[A-Z0-9_]+$/, "Code must be uppercase alphanumeric with underscores"),
  description: z.string().optional(),
  category: z.enum(["financial", "utilization", "fwa", "claims_adjudication", "reconciliation", "benchmarking", "quality"]),
  status: z.enum(["active", "draft", "archived"]).default("active"),
  numeratorLabel: z.string().min(1, "Numerator label is required"),
  numeratorFormula: z.string().min(1, "Numerator formula is required"),
  numeratorSource: z.enum(["claims", "fwa_findings", "adjudication", "settlements", "sessions", "membership", "providers", "contracts", "manual"]),
  denominatorLabel: z.string().min(1, "Denominator label is required"),
  denominatorFormula: z.string().min(1, "Denominator formula is required"),
  denominatorSource: z.enum(["claims", "fwa_findings", "adjudication", "settlements", "sessions", "membership", "providers", "contracts", "manual"]),
  inclusions: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),
  unit: z.string().default("number"),
  decimalPlaces: z.number().min(0).max(6).default(2),
  enableBenchmarking: z.boolean().default(false),
  peerGroupDimensions: z.array(z.string()).default([]),
  warningThreshold: z.string().optional(),
  criticalThreshold: z.string().optional(),
  thresholdDirection: z.enum(["above", "below"]).default("above"),
});

type KpiFormData = z.infer<typeof kpiFormSchema>;

export default function KpiBuilderPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<KpiDefinition | null>(null);
  const [deletingKpi, setDeletingKpi] = useState<KpiDefinition | null>(null);
  const [viewingKpi, setViewingKpi] = useState<KpiDefinition | null>(null);
  const [inclusionInput, setInclusionInput] = useState("");
  const [exclusionInput, setExclusionInput] = useState("");

  const form = useForm<KpiFormData>({
    resolver: zodResolver(kpiFormSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      category: "financial",
      status: "active",
      numeratorLabel: "",
      numeratorFormula: "",
      numeratorSource: "claims",
      denominatorLabel: "",
      denominatorFormula: "",
      denominatorSource: "claims",
      inclusions: [],
      exclusions: [],
      unit: "number",
      decimalPlaces: 2,
      enableBenchmarking: false,
      peerGroupDimensions: [],
      warningThreshold: "",
      criticalThreshold: "",
      thresholdDirection: "above",
    },
  });

  const { data: kpiDefinitions = [], isLoading } = useQuery<KpiDefinition[]>({
    queryKey: ["/api/provider-relations/kpi-definitions"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: KpiFormData) => {
      const response = await apiRequest("POST", "/api/provider-relations/kpi-definitions", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider-relations/kpi-definitions"] });
      toast({ title: "Success", description: "KPI definition created successfully" });
      handleDialogClose();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to create KPI definition", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: KpiFormData }) => {
      const response = await apiRequest("PUT", `/api/provider-relations/kpi-definitions/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider-relations/kpi-definitions"] });
      toast({ title: "Success", description: "KPI definition updated successfully" });
      handleDialogClose();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to update KPI definition", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/provider-relations/kpi-definitions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider-relations/kpi-definitions"] });
      toast({ title: "Success", description: "KPI definition deleted successfully" });
      setDeleteDialogOpen(false);
      setDeletingKpi(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to delete KPI definition", variant: "destructive" });
    },
  });

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingKpi(null);
    setInclusionInput("");
    setExclusionInput("");
    form.reset();
  };

  const handleCreate = () => {
    setEditingKpi(null);
    form.reset({
      name: "",
      code: "",
      description: "",
      category: "financial",
      status: "active",
      numeratorLabel: "",
      numeratorFormula: "",
      numeratorSource: "claims",
      denominatorLabel: "",
      denominatorFormula: "",
      denominatorSource: "claims",
      inclusions: [],
      exclusions: [],
      unit: "number",
      decimalPlaces: 2,
      enableBenchmarking: false,
      peerGroupDimensions: [],
      warningThreshold: "",
      criticalThreshold: "",
      thresholdDirection: "above",
    });
    setDialogOpen(true);
  };

  const handleEdit = (kpi: KpiDefinition) => {
    setEditingKpi(kpi);
    form.reset({
      name: kpi.name,
      code: kpi.code,
      description: kpi.description || "",
      category: kpi.category as KpiFormData["category"],
      status: kpi.status as KpiFormData["status"],
      numeratorLabel: kpi.numeratorLabel,
      numeratorFormula: kpi.numeratorFormula,
      numeratorSource: kpi.numeratorSource as KpiFormData["numeratorSource"],
      denominatorLabel: kpi.denominatorLabel,
      denominatorFormula: kpi.denominatorFormula,
      denominatorSource: kpi.denominatorSource as KpiFormData["denominatorSource"],
      inclusions: (kpi.inclusions as string[]) || [],
      exclusions: (kpi.exclusions as string[]) || [],
      unit: kpi.unit || "number",
      decimalPlaces: kpi.decimalPlaces || 2,
      enableBenchmarking: kpi.enableBenchmarking || false,
      peerGroupDimensions: (kpi.peerGroupDimensions as string[]) || [],
      warningThreshold: kpi.warningThreshold || "",
      criticalThreshold: kpi.criticalThreshold || "",
      thresholdDirection: (kpi.thresholdDirection as "above" | "below") || "above",
    });
    setDialogOpen(true);
  };

  const handleView = (kpi: KpiDefinition) => {
    setViewingKpi(kpi);
    setViewDialogOpen(true);
  };

  const handleDelete = (kpi: KpiDefinition) => {
    setDeletingKpi(kpi);
    setDeleteDialogOpen(true);
  };

  const onSubmit = (data: KpiFormData) => {
    if (editingKpi) {
      updateMutation.mutate({ id: editingKpi.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const addInclusion = () => {
    if (inclusionInput.trim()) {
      const current = form.getValues("inclusions") || [];
      form.setValue("inclusions", [...current, inclusionInput.trim()]);
      setInclusionInput("");
    }
  };

  const removeInclusion = (index: number) => {
    const current = form.getValues("inclusions") || [];
    form.setValue("inclusions", current.filter((_, i) => i !== index));
  };

  const addExclusion = () => {
    if (exclusionInput.trim()) {
      const current = form.getValues("exclusions") || [];
      form.setValue("exclusions", [...current, exclusionInput.trim()]);
      setExclusionInput("");
    }
  };

  const removeExclusion = (index: number) => {
    const current = form.getValues("exclusions") || [];
    form.setValue("exclusions", current.filter((_, i) => i !== index));
  };

  const filteredKpis = kpiDefinitions.filter((kpi) => {
    const matchesSearch =
      kpi.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kpi.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (kpi.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || kpi.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || kpi.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      financial: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      utilization: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      fwa: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      claims_adjudication: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      reconciliation: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      benchmarking: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
      quality: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    };
    const label = KPI_CATEGORIES.find((c) => c.value === category)?.label || category;
    return <Badge className={colors[category] || ""}>{label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Active</Badge>;
      case "draft":
        return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">Draft</Badge>;
      case "archived":
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Archived</Badge>;
      default:
        return null;
    }
  };

  const getFormulaSummary = (kpi: KpiDefinition) => {
    return `${kpi.numeratorLabel} / ${kpi.denominatorLabel}`;
  };

  const activeCount = kpiDefinitions.filter((k) => k.status === "active").length;
  const draftCount = kpiDefinitions.filter((k) => k.status === "draft").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">
            KPI Builder
          </h1>
          <p className="text-muted-foreground">Define and manage Key Performance Indicators for provider analytics</p>
        </div>
        <Button size="sm" className="gap-2" onClick={handleCreate} data-testid="button-create-kpi">
          <Plus className="h-4 w-4" />
          New KPI Definition
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total KPIs</p>
                <p className="text-2xl font-bold" data-testid="text-total-kpis">
                  {kpiDefinitions.length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Calculator className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-active-kpis">
                  {activeCount}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Draft</p>
                <p className="text-2xl font-bold text-gray-600" data-testid="text-draft-kpis">
                  {draftCount}
                </p>
              </div>
              <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-900/30">
                <Edit2 className="h-5 w-5 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">With Benchmarking</p>
                <p className="text-2xl font-bold text-cyan-600" data-testid="text-benchmarking-kpis">
                  {kpiDefinitions.filter((k) => k.enableBenchmarking).length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-cyan-100 dark:bg-cyan-900/30">
                <Target className="h-5 w-5 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
          <CardTitle>KPI Definitions</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search KPIs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
                data-testid="input-search-kpi"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40" data-testid="select-category-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {KPI_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredKpis.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {kpiDefinitions.length === 0
                ? "No KPI definitions found. Click 'New KPI Definition' to create one."
                : "No KPIs match your search criteria."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Formula Summary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredKpis.map((kpi) => (
                  <TableRow key={kpi.id} className="hover-elevate" data-testid={`row-kpi-${kpi.code}`}>
                    <TableCell className="font-medium">{kpi.name}</TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">{kpi.code}</code>
                    </TableCell>
                    <TableCell>{getCategoryBadge(kpi.category)}</TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {getFormulaSummary(kpi)}
                    </TableCell>
                    <TableCell>{getStatusBadge(kpi.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleView(kpi)}
                          data-testid={`button-view-${kpi.code}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleEdit(kpi)}
                          data-testid={`button-edit-${kpi.code}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(kpi)}
                          data-testid={`button-delete-${kpi.code}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && handleDialogClose()}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto" data-testid="dialog-kpi-form">
          <DialogHeader>
            <DialogTitle>{editingKpi ? "Edit KPI Definition" : "New KPI Definition"}</DialogTitle>
            <DialogDescription>
              {editingKpi
                ? "Update the KPI definition settings below."
                : "Define a new Key Performance Indicator with calculation formula and thresholds."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Cost Per Member" data-testid="input-kpi-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., CPM"
                          className="uppercase"
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                          data-testid="input-kpi-code"
                        />
                      </FormControl>
                      <FormDescription>Unique identifier (uppercase, underscores allowed)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Describe this KPI..." rows={2} data-testid="input-kpi-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-kpi-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {KPI_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-kpi-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-medium">Numerator</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="numeratorLabel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Label *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Total Paid Amount" data-testid="input-numerator-label" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="numeratorSource"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Source *</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-numerator-source">
                              <SelectValue placeholder="Select source" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DATA_SOURCES.map((src) => (
                              <SelectItem key={src.value} value={src.value}>
                                {src.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="numeratorFormula"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Formula *</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="e.g., SUM(paid_amount) or field reference"
                          rows={2}
                          data-testid="input-numerator-formula"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-medium">Denominator</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="denominatorLabel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Label *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Unique Member Count" data-testid="input-denominator-label" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="denominatorSource"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data Source *</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-denominator-source">
                              <SelectValue placeholder="Select source" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DATA_SOURCES.map((src) => (
                              <SelectItem key={src.value} value={src.value}>
                                {src.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="denominatorFormula"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Formula *</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="e.g., COUNT(DISTINCT member_id)"
                          rows={2}
                          data-testid="input-denominator-formula"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-medium">Inclusions</h4>
                  <div className="flex gap-2">
                    <Input
                      value={inclusionInput}
                      onChange={(e) => setInclusionInput(e.target.value)}
                      placeholder="Add inclusion..."
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addInclusion())}
                      data-testid="input-inclusion"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addInclusion}>
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.watch("inclusions")?.map((item, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1">
                        {item}
                        <button
                          type="button"
                          onClick={() => removeInclusion(idx)}
                          className="ml-1 hover:text-destructive"
                        >
                          x
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 p-4 border rounded-lg">
                  <h4 className="font-medium">Exclusions</h4>
                  <div className="flex gap-2">
                    <Input
                      value={exclusionInput}
                      onChange={(e) => setExclusionInput(e.target.value)}
                      placeholder="Add exclusion..."
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addExclusion())}
                      data-testid="input-exclusion"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addExclusion}>
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.watch("exclusions")?.map((item, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1">
                        {item}
                        <button
                          type="button"
                          onClick={() => removeExclusion(idx)}
                          className="ml-1 hover:text-destructive"
                        >
                          x
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-kpi-unit">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {UNITS.map((unit) => (
                            <SelectItem key={unit.value} value={unit.value}>
                              {unit.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="decimalPlaces"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Decimal Places</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min={0}
                          max={6}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-decimal-places"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="thresholdDirection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Threshold Direction</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-threshold-direction">
                            <SelectValue placeholder="Select direction" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="above">Alert when above</SelectItem>
                          <SelectItem value="below">Alert when below</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="warningThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Warning Threshold</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="any" placeholder="e.g., 1000" data-testid="input-warning-threshold" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="criticalThreshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Critical Threshold</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="any" placeholder="e.g., 1500" data-testid="input-critical-threshold" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 p-4 border rounded-lg">
                <FormField
                  control={form.control}
                  name="enableBenchmarking"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div>
                        <FormLabel>Enable Benchmarking</FormLabel>
                        <FormDescription>Compare against peer groups</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-benchmarking" />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch("enableBenchmarking") && (
                  <FormField
                    control={form.control}
                    name="peerGroupDimensions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Peer Group Dimensions</FormLabel>
                        <div className="flex flex-wrap gap-2">
                          {PEER_GROUP_DIMENSIONS.map((dim) => (
                            <Badge
                              key={dim}
                              variant={field.value?.includes(dim) ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => {
                                const current = field.value || [];
                                if (current.includes(dim)) {
                                  field.onChange(current.filter((d) => d !== dim));
                                } else {
                                  field.onChange([...current, dim]);
                                }
                              }}
                              data-testid={`badge-dimension-${dim}`}
                            >
                              {dim}
                            </Badge>
                          ))}
                        </div>
                        <FormDescription>Select dimensions for peer comparison</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleDialogClose} data-testid="button-cancel">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-kpi"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : editingKpi ? (
                    "Update KPI"
                  ) : (
                    "Create KPI"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]" data-testid="dialog-view-kpi">
          <DialogHeader>
            <DialogTitle>KPI Calculation Breakdown</DialogTitle>
            <DialogDescription>
              {viewingKpi?.name} ({viewingKpi?.code})
            </DialogDescription>
          </DialogHeader>
          {viewingKpi && (
            <div className="space-y-6">
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-lg font-semibold text-primary mb-2">{viewingKpi.name}</p>
                <p className="text-2xl font-mono">
                  {viewingKpi.numeratorLabel} / {viewingKpi.denominatorLabel}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Numerator</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="font-medium">{viewingKpi.numeratorLabel}</p>
                    <p className="text-sm text-muted-foreground">
                      <code className="bg-muted px-2 py-1 rounded">{viewingKpi.numeratorFormula}</code>
                    </p>
                    <Badge variant="outline">
                      Source: {DATA_SOURCES.find((s) => s.value === viewingKpi.numeratorSource)?.label}
                    </Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Denominator</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="font-medium">{viewingKpi.denominatorLabel}</p>
                    <p className="text-sm text-muted-foreground">
                      <code className="bg-muted px-2 py-1 rounded">{viewingKpi.denominatorFormula}</code>
                    </p>
                    <Badge variant="outline">
                      Source: {DATA_SOURCES.find((s) => s.value === viewingKpi.denominatorSource)?.label}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              {((viewingKpi.inclusions as string[])?.length > 0 || (viewingKpi.exclusions as string[])?.length > 0) && (
                <div className="grid grid-cols-2 gap-4">
                  {(viewingKpi.inclusions as string[])?.length > 0 && (
                    <div>
                      <p className="font-medium text-sm mb-2">Inclusions</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        {(viewingKpi.inclusions as string[]).map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(viewingKpi.exclusions as string[])?.length > 0 && (
                    <div>
                      <p className="font-medium text-sm mb-2">Exclusions</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        {(viewingKpi.exclusions as string[]).map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Unit:</span>
                  <Badge variant="outline">{UNITS.find((u) => u.value === viewingKpi.unit)?.label || viewingKpi.unit}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Category:</span>
                  {getCategoryBadge(viewingKpi.category)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Status:</span>
                  {getStatusBadge(viewingKpi.status)}
                </div>
              </div>

              {(viewingKpi.warningThreshold || viewingKpi.criticalThreshold) && (
                <div className="p-4 border rounded-lg">
                  <p className="font-medium text-sm mb-2">Thresholds ({viewingKpi.thresholdDirection === "above" ? "Alert when above" : "Alert when below"})</p>
                  <div className="flex items-center gap-4">
                    {viewingKpi.warningThreshold && (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <span className="text-sm">Warning: {viewingKpi.warningThreshold}</span>
                      </div>
                    )}
                    {viewingKpi.criticalThreshold && (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <span className="text-sm">Critical: {viewingKpi.criticalThreshold}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {viewingKpi.enableBenchmarking && (
                <div className="p-4 border rounded-lg">
                  <p className="font-medium text-sm mb-2">Benchmarking Enabled</p>
                  <div className="flex flex-wrap gap-2">
                    {(viewingKpi.peerGroupDimensions as string[])?.map((dim, idx) => (
                      <Badge key={idx} variant="secondary">
                        {dim}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-kpi">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete KPI Definition</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingKpi?.name}" ({deletingKpi?.code})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingKpi && deleteMutation.mutate(deletingKpi.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
