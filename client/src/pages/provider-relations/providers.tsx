import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Users,
  Plus,
  Building2,
  Mail,
  Filter,
  Eye,
  Send,
  Download,
  Upload,
  LayoutGrid,
  List,
  Phone,
  X,
  Loader2,
} from "lucide-react";
import { ReconciliationPanel } from "@/components/shared/reconciliation-panel";
import { insertProviderDirectorySchema } from "@shared/schema";
import type { ProviderDirectory } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const SPECIALTY_OPTIONS = [
  "Multi-specialty",
  "General Medicine",
  "Cardiology",
  "Orthopedics",
  "Pediatrics",
  "Oncology",
  "Neurology",
  "Dermatology",
];

const NETWORK_TIER_OPTIONS = [
  { value: "Tier 1", label: "Tier 1 (Premium)" },
  { value: "Tier 2", label: "Tier 2 (Standard)" },
  { value: "Tier 3", label: "Tier 3 (Basic)" },
];

const providerFormSchema = insertProviderDirectorySchema.extend({
  npi: z.string().min(10, "NPI must be exactly 10 digits").max(10, "NPI must be exactly 10 digits").regex(/^\d{10}$/, "NPI must be exactly 10 digits"),
  name: z.string().min(1, "Provider name is required"),
  specialty: z.string().min(1, "Specialty is required"),
  organization: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  networkTier: z.string().default("Tier 2"),
  licenseNumber: z.string().optional(),
  licenseExpiry: z.string().optional(),
});

type ProviderFormData = z.infer<typeof providerFormSchema>;

export default function ProvidersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedProvider, setSelectedProvider] = useState<ProviderDirectory | null>(null);
  const [reconcileProvider, setReconcileProvider] = useState<ProviderDirectory | null>(null);
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [addProviderDialogOpen, setAddProviderDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const { toast } = useToast();

  const form = useForm<ProviderFormData>({
    resolver: zodResolver(providerFormSchema),
    defaultValues: {
      npi: "",
      name: "",
      specialty: "",
      organization: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      region: "",
      networkTier: "Tier 2",
      licenseNumber: "",
      licenseExpiry: "",
    },
  });

  const { data: providers = [], isLoading } = useQuery<ProviderDirectory[]>({
    queryKey: ["/api/provider-relations/providers"],
  });

  const createProviderMutation = useMutation({
    mutationFn: async (data: ProviderFormData) => {
      const response = await apiRequest("POST", "/api/provider-relations/providers", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Provider Added",
        description: "The provider has been successfully added to the directory.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/provider-relations/providers"] });
      setAddProviderDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      const errorMessage = error.message.includes("409") 
        ? "A provider with this NPI already exists." 
        : error.message || "Failed to add provider. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const importProvidersMutation = useMutation({
    mutationFn: async (providers: any[]) => {
      const res = await apiRequest("POST", "/api/provider-relations/providers/batch", { providers });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider-relations/providers"] });
      toast({
        title: "Import Successful",
        description: `Successfully imported ${data.created} providers. ${data.skipped || 0} skipped (duplicates).`,
      });
      setImportDialogOpen(false);
      setImportFile(null);
      setImportPreview([]);
      setImportErrors([]);
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = async (file: File) => {
    setImportFile(file);
    setImportErrors([]);
    
    const text = await file.text();
    let parsedData: any[] = [];
    
    if (file.name.endsWith('.json')) {
      try {
        parsedData = JSON.parse(text);
        if (!Array.isArray(parsedData)) parsedData = [parsedData];
      } catch (e) {
        setImportErrors(["Invalid JSON format"]);
        return;
      }
    } else if (file.name.endsWith('.csv')) {
      const lines = text.trim().split('\n');
      if (lines.length < 2) {
        setImportErrors(["CSV must have headers and at least one data row"]);
        return;
      }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      parsedData = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj: any = {};
        headers.forEach((h, i) => {
          if (h === 'npi') obj.npi = values[i];
          else if (h === 'name' || h === 'provider_name') obj.name = values[i];
          else if (h === 'specialty') obj.specialty = values[i];
          else if (h === 'organization') obj.organization = values[i];
          else if (h === 'email') obj.email = values[i];
          else if (h === 'phone') obj.phone = values[i];
          else if (h === 'network_tier' || h === 'networktier' || h === 'tier') obj.networkTier = values[i];
          else if (h === 'address') obj.address = values[i];
          else if (h === 'city') obj.city = values[i];
          else if (h === 'region') obj.region = values[i];
        });
        return obj;
      });
    } else {
      setImportErrors(["Unsupported file format. Please use CSV or JSON."]);
      return;
    }
    
    const errors: string[] = [];
    parsedData.forEach((row, i) => {
      if (!row.npi) errors.push(`Row ${i+1}: Missing NPI`);
      else if (!/^\d{10}$/.test(row.npi)) errors.push(`Row ${i+1}: Invalid NPI format (must be 10 digits)`);
      if (!row.name) errors.push(`Row ${i+1}: Missing provider name`);
      if (!row.specialty) errors.push(`Row ${i+1}: Missing specialty`);
    });
    
    if (errors.length > 0) {
      setImportErrors(errors.slice(0, 10));
      if (errors.length > 10) setImportErrors(prev => [...prev, `...and ${errors.length - 10} more errors`]);
    }
    
    setImportPreview(parsedData);
  };

  const onSubmit = (data: ProviderFormData) => {
    createProviderMutation.mutate(data);
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    setAddProviderDialogOpen(open);
  };

  const filteredProviders = providers.filter((provider) => {
    const matchesSearch = provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.npi.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || provider.contractStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getContractStatusBadge = (status: string | null) => {
    switch (status) {
      case "Active":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" data-testid="badge-status-active">Active</Badge>;
      case "Pending":
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" data-testid="badge-status-pending">Pending</Badge>;
      case "Expired":
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" data-testid="badge-status-expired">Expired</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400" data-testid="badge-status-unknown">{status || "Unknown"}</Badge>;
    }
  };

  const getRiskColor = (score: number | string | null) => {
    const numScore = typeof score === 'string' ? parseFloat(score) : score;
    if (!numScore) return "text-gray-600 dark:text-gray-400";
    if (numScore >= 70) return "text-red-600 dark:text-red-400";
    if (numScore >= 50) return "text-orange-600 dark:text-orange-400";
    if (numScore >= 30) return "text-amber-600 dark:text-amber-400";
    return "text-green-600 dark:text-green-400";
  };

  const handleReconcile = () => {
    if (selectedProvider) {
      setReconcileProvider(selectedProvider);
      setSelectedProvider(null);
      setShowReconciliation(true);
    }
  };
  
  const handleReconciliationClose = (open: boolean) => {
    setShowReconciliation(open);
    if (!open) {
      setReconcileProvider(null);
    }
  };

  const activeCount = providers.filter((p) => p.contractStatus === "Active").length;
  const pendingCount = providers.filter((p) => p.contractStatus === "Pending").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Provider Directory</h1>
          <p className="text-muted-foreground">
            Manage and view all providers in your network
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)} data-testid="button-import-providers">
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm" data-testid="button-export">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={() => setAddProviderDialogOpen(true)} data-testid="button-add-provider">
            <Plus className="w-4 h-4 mr-2" />
            Add Provider
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Providers</p>
                <p className="text-2xl font-bold" data-testid="text-total-providers">
                  {providers.length}
                </p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-active-count">
                  {activeCount}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <Users className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-amber-600" data-testid="text-pending-count">
                  {pendingCount}
                </p>
              </div>
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Members</p>
                <p className="text-2xl font-bold" data-testid="text-total-members">
                  {providers.reduce((sum, p) => sum + (p.memberCount || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
          <CardTitle>Provider Directory</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search providers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
                data-testid="input-provider-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
                data-testid="button-view-grid"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("table")}
                data-testid="button-view-table"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProviders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {providers.length === 0
                ? "No providers found. Click 'Add Provider' to add one."
                : "No providers match your search criteria."}
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProviders.map((provider) => (
                <Card 
                  key={provider.id} 
                  className="hover-elevate cursor-pointer"
                  onClick={() => setSelectedProvider(provider)}
                  data-testid={`card-provider-${provider.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold" data-testid={`text-provider-name-${provider.id}`}>{provider.name}</h3>
                        <p className="text-sm text-muted-foreground">{provider.npi}</p>
                      </div>
                      {getContractStatusBadge(provider.contractStatus)}
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        <span>{provider.specialty}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{(provider.memberCount || 0).toLocaleString()} members</span>
                      </div>
                      {provider.email && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{provider.email}</span>
                        </div>
                      )}
                      {provider.riskScore && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Risk:</span>
                          <span className={`font-medium ${getRiskColor(provider.riskScore)}`}>
                            {parseFloat(provider.riskScore).toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProvider(provider);
                        }}
                        data-testid={`button-view-details-${provider.id}`}
                      >
                        <Eye className="h-3 w-3" />
                        View Details
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 gap-1"
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`button-send-comm-${provider.id}`}
                      >
                        <Send className="h-3 w-3" />
                        Contact
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NPI</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead className="text-right">Members</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProviders.map((provider) => (
                  <TableRow 
                    key={provider.id} 
                    className="cursor-pointer hover-elevate"
                    onClick={() => setSelectedProvider(provider)}
                    data-testid={`row-provider-${provider.id}`}
                  >
                    <TableCell className="font-medium">{provider.npi}</TableCell>
                    <TableCell>{provider.name}</TableCell>
                    <TableCell>{provider.specialty}</TableCell>
                    <TableCell>{provider.networkTier}</TableCell>
                    <TableCell className="text-right">{(provider.memberCount || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      {provider.riskScore && (
                        <span className={`font-medium ${getRiskColor(provider.riskScore)}`}>
                          {parseFloat(provider.riskScore).toFixed(0)}%
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{getContractStatusBadge(provider.contractStatus)}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProvider(provider);
                        }}
                        data-testid={`button-view-${provider.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedProvider} onOpenChange={(open) => !open && setSelectedProvider(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto" data-testid="sheet-provider-detail">
          {selectedProvider && (
            <>
              <SheetHeader className="pb-4 border-b">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-xl">{selectedProvider.name}</SheetTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedProvider(null)}
                    data-testid="button-close-sheet"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{selectedProvider.npi}</p>
              </SheetHeader>

              <div className="space-y-6 py-6">
                <div>
                  <h4 className="font-semibold mb-3 text-indigo-600 dark:text-indigo-400">Provider Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Specialty</span>
                      <span className="font-medium">{selectedProvider.specialty}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Network Tier</span>
                      <span className="font-medium">{selectedProvider.networkTier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      {getContractStatusBadge(selectedProvider.contractStatus)}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Members</span>
                      <span className="font-medium">{(selectedProvider.memberCount || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 text-indigo-600 dark:text-indigo-400">Contact Information</h4>
                  <div className="space-y-2 text-sm">
                    {selectedProvider.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedProvider.email}</span>
                      </div>
                    )}
                    {selectedProvider.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{selectedProvider.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedProvider.riskScore && (
                  <div>
                    <h4 className="font-semibold mb-3 text-indigo-600 dark:text-indigo-400">Risk Metrics</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Risk Score</span>
                          <span className={`font-medium ${getRiskColor(selectedProvider.riskScore)}`}>
                            {parseFloat(selectedProvider.riskScore).toFixed(0)}%
                          </span>
                        </div>
                        <Progress value={parseFloat(selectedProvider.riskScore)} className="h-2" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" className="flex-1" onClick={handleReconcile} data-testid="button-reconcile">
                    Reconcile
                  </Button>
                  <Button className="flex-1" data-testid="button-view-full-profile">
                    View Full Profile
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={addProviderDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[600px]" data-testid="dialog-add-provider">
          <DialogHeader>
            <DialogTitle>Add New Provider</DialogTitle>
            <DialogDescription>
              Enter the provider details below. Fields marked with * are required.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="npi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NPI *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="10-digit NPI"
                          maxLength={10}
                          data-testid="input-npi"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provider Name *</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter provider name"
                          data-testid="input-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="specialty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialty *</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-specialty">
                            <SelectValue placeholder="Select specialty" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SPECIALTY_OPTIONS.map((specialty) => (
                            <SelectItem key={specialty} value={specialty}>
                              {specialty}
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
                  name="networkTier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Network Tier</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-network-tier">
                            <SelectValue placeholder="Select tier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {NETWORK_TIER_OPTIONS.map((tier) => (
                            <SelectItem key={tier.value} value={tier.value}>
                              {tier.label}
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
                name="organization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter organization name"
                        data-testid="input-organization"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="email@example.com"
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="+966 XX XXX XXXX"
                          data-testid="input-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter address"
                        data-testid="input-address"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter city"
                          data-testid="input-city"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="region"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Region</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter region"
                          data-testid="input-region"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="licenseNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Number</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter license number"
                          data-testid="input-license-number"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="licenseExpiry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Expiry</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="date"
                          data-testid="input-license-expiry"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDialogClose(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createProviderMutation.isPending}
                  data-testid="button-save-provider"
                >
                  {createProviderMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Provider"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {showReconciliation && reconcileProvider && (
        <ReconciliationPanel
          open={showReconciliation}
          onOpenChange={handleReconciliationClose}
          entityType="provider"
          entityId={reconcileProvider.id}
          entityName={reconcileProvider.name}
        />
      )}

      <Dialog open={importDialogOpen} onOpenChange={(open) => {
        setImportDialogOpen(open);
        if (!open) {
          setImportFile(null);
          setImportPreview([]);
          setImportErrors([]);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Providers</DialogTitle>
            <DialogDescription>
              Upload a CSV or JSON file with provider data. Required fields: NPI, Name, Specialty.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                type="file"
                id="import-file"
                accept=".csv,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                data-testid="input-import-file"
              />
              <label htmlFor="import-file" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {importFile ? importFile.name : "Click to select a file or drag and drop"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports CSV and JSON formats
                </p>
              </label>
            </div>
            
            {importErrors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm font-medium text-destructive mb-2">Validation Errors:</p>
                <ul className="text-xs text-destructive space-y-1">
                  {importErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {importPreview.length > 0 && importErrors.length === 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Preview ({importPreview.length} providers):</p>
                <div className="max-h-48 overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>NPI</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Specialty</TableHead>
                        <TableHead>Organization</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importPreview.slice(0, 5).map((row, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-mono text-xs">{row.npi}</TableCell>
                          <TableCell>{row.name}</TableCell>
                          <TableCell>{row.specialty}</TableCell>
                          <TableCell>{row.organization || "-"}</TableCell>
                        </TableRow>
                      ))}
                      {importPreview.length > 5 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground text-sm">
                            ...and {importPreview.length - 5} more
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">CSV Schema:</p>
              <code className="bg-muted px-2 py-1 rounded">
                npi,name,specialty,organization,email,phone,network_tier,address,city,region
              </code>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => importProvidersMutation.mutate(importPreview)}
              disabled={importPreview.length === 0 || importErrors.length > 0 || importProvidersMutation.isPending}
              data-testid="button-confirm-import"
            >
              {importProvidersMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                `Import ${importPreview.length} Providers`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
