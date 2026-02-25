import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Search,
  Download,
  Plus,
  ChevronRight,
  Filter,
  Package,
  Lock,
  Presentation,
  FileJson,
  FileText,
  Paperclip,
  Eye,
  X,
  Calendar,
  Building2,
  DollarSign,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { EvidencePack, ProviderDirectory } from "@shared/schema";
import { z } from "zod";

type EvidencePackStatus = "draft" | "locked" | "presented" | "archived";

const evidencePackFormSchema = z.object({
  providerId: z.string().min(1, "Provider is required"),
  providerName: z.string().min(1, "Provider name is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});
type EvidencePackFormData = z.infer<typeof evidencePackFormSchema>;

export default function EvidencePacksPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("all");
  const [selectedPack, setSelectedPack] = useState<EvidencePack | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: evidencePacks = [], isLoading } = useQuery<EvidencePack[]>({
    queryKey: ["/api/provider-relations/evidence-packs"],
  });

  const { data: providers = [] } = useQuery<ProviderDirectory[]>({
    queryKey: ["/api/provider-relations/providers"],
  });

  const form = useForm<EvidencePackFormData>({
    resolver: zodResolver(evidencePackFormSchema),
    defaultValues: {
      providerId: "",
      providerName: "",
      title: "",
      description: "",
    },
  });

  const createEvidencePackMutation = useMutation({
    mutationFn: async (data: EvidencePackFormData) => {
      const response = await apiRequest("POST", "/api/provider-relations/evidence-packs", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider-relations/evidence-packs"] });
      toast({ title: "Success", description: "Evidence pack created" });
      setCreateDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create evidence pack", variant: "destructive" });
    },
  });

  const lockMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("PATCH", `/api/provider-relations/evidence-packs/${id}/lock`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider-relations/evidence-packs"] });
      toast({ title: "Success", description: "Evidence pack locked" });
      setIsDetailOpen(false);
      setSelectedPack(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to lock evidence pack", variant: "destructive" });
    },
  });

  const presentMutation = useMutation({
    mutationFn: async ({ id, sessionId }: { id: string; sessionId?: string }) => {
      const response = await apiRequest("PATCH", `/api/provider-relations/evidence-packs/${id}/present`, { sessionId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider-relations/evidence-packs"] });
      toast({ title: "Success", description: "Evidence pack marked as presented" });
      setIsDetailOpen(false);
      setSelectedPack(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to mark as presented", variant: "destructive" });
    },
  });

  const filteredPacks = evidencePacks.filter((pack) => {
    const matchesSearch = 
      (pack.packNumber?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (pack.title?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      (pack.providerName?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    const matchesStatus = statusFilter === "all" || pack.status === statusFilter;
    const matchesProvider = providerFilter === "all" || pack.providerId === providerFilter;
    return matchesSearch && matchesStatus && matchesProvider;
  });

  const getStatusBadge = (status: EvidencePackStatus | string | null) => {
    switch (status) {
      case "draft":
        return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" data-testid="badge-status-draft">Draft</Badge>;
      case "locked":
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" data-testid="badge-status-locked">Locked</Badge>;
      case "presented":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" data-testid="badge-status-presented">Presented</Badge>;
      case "archived":
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" data-testid="badge-status-archived">Archived</Badge>;
      default:
        return null;
    }
  };

  const handleLockPack = (pack: EvidencePack) => {
    lockMutation.mutate(pack.id);
  };

  const handlePresentPack = (pack: EvidencePack) => {
    presentMutation.mutate({ id: pack.id });
  };

  const handleExportPDF = (pack: EvidencePack) => {
    toast({
      title: "Exporting PDF",
      description: `Generating PDF for ${pack.packNumber}...`,
    });
  };

  const handleExportJSON = (pack: EvidencePack) => {
    const jsonData = JSON.stringify(pack, null, 2);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pack.packNumber}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "JSON Exported",
      description: `${pack.packNumber}.json has been downloaded.`,
    });
  };

  const onSubmitCreate = (data: EvidencePackFormData) => {
    createEvidencePackMutation.mutate(data);
  };

  const handleProviderChange = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    form.setValue("providerId", providerId);
    form.setValue("providerName", provider?.name || "");
  };

  const totalPacks = evidencePacks.length;
  const draftCount = evidencePacks.filter(p => p.status === "draft").length;
  const lockedCount = evidencePacks.filter(p => p.status === "locked").length;
  const presentedCount = evidencePacks.filter(p => p.status === "presented").length;
  const totalTargetAmount = evidencePacks.reduce((sum, p) => sum + parseFloat(p.targetAmount || "0"), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" data-testid="loading-state">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Evidence Packs</h1>
          <p className="text-muted-foreground">
            Manage evidence packs for reconciliation negotiations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-create-pack">
                <Plus className="h-4 w-4" />
                Create Evidence Pack
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Evidence Pack</DialogTitle>
                <DialogDescription>
                  Create a new evidence pack to collect claims and findings for reconciliation.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitCreate)} className="space-y-4 py-4">
                  <FormField
                    control={form.control}
                    name="providerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Provider</FormLabel>
                        <Select 
                          value={field.value} 
                          onValueChange={handleProviderChange}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-new-pack-provider">
                              <SelectValue placeholder="Select provider..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {providers.map((provider) => (
                              <SelectItem key={provider.id} value={provider.id}>
                                {provider.name}
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
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter pack title..."
                            {...field}
                            data-testid="input-new-pack-title"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter description..."
                            {...field}
                            data-testid="input-new-pack-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setCreateDialogOpen(false)} 
                      data-testid="button-cancel-create"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createEvidencePackMutation.isPending}
                      data-testid="button-confirm-create"
                    >
                      {createEvidencePackMutation.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Create Pack
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Total Packs</p>
                <p className="text-2xl font-bold" data-testid="text-total-packs">{totalPacks}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Draft</p>
                <p className="text-2xl font-bold" data-testid="text-draft-count">{draftCount}</p>
              </div>
              <div className="p-3 rounded-full bg-gray-100 dark:bg-gray-800">
                <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Locked</p>
                <p className="text-2xl font-bold" data-testid="text-locked-count">{lockedCount}</p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Lock className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Target Amount</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-total-amount">
                  ${totalTargetAmount.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
          <CardTitle>Evidence Pack List</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search packs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
                data-testid="input-pack-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="locked">Locked</SelectItem>
                <SelectItem value="presented">Presented</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={providerFilter} onValueChange={setProviderFilter}>
              <SelectTrigger className="w-48" data-testid="select-provider-filter">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pack Number</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead className="text-center">Claims</TableHead>
                <TableHead className="text-right">Target Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Created</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPacks.map((pack) => (
                <TableRow 
                  key={pack.id} 
                  className="cursor-pointer hover-elevate"
                  onClick={() => {
                    setSelectedPack(pack);
                    setIsDetailOpen(true);
                  }}
                  data-testid={`row-pack-${pack.packNumber}`}
                >
                  <TableCell className="font-medium">{pack.packNumber}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{pack.title}</TableCell>
                  <TableCell>{pack.providerName}</TableCell>
                  <TableCell className="text-center">{pack.totalClaimCount || 0}</TableCell>
                  <TableCell className="text-right font-medium">
                    ${parseFloat(pack.targetAmount || "0").toLocaleString()}
                  </TableCell>
                  <TableCell>{getStatusBadge(pack.status)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {pack.createdAt ? new Date(pack.createdAt).toLocaleDateString() : "N/A"}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
              {filteredPacks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No evidence packs found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          {selectedPack && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DialogTitle className="text-xl">{selectedPack.packNumber}</DialogTitle>
                    <DialogDescription className="mt-1">
                      {selectedPack.title}
                    </DialogDescription>
                  </div>
                  {getStatusBadge(selectedPack.status)}
                </div>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Provider</p>
                    <p className="text-sm font-medium" data-testid="text-detail-provider">{selectedPack.providerName}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Total Claims</p>
                    <p className="text-sm font-medium" data-testid="text-detail-claims">{selectedPack.totalClaimCount || 0}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Target Amount</p>
                    <p className="text-sm font-medium text-green-600" data-testid="text-detail-amount">
                      ${parseFloat(selectedPack.targetAmount || "0").toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Prepared By</p>
                    <p className="text-sm font-medium" data-testid="text-detail-preparer">{selectedPack.preparedBy || "N/A"}</p>
                  </div>
                </div>

                {selectedPack.description && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p className="text-sm" data-testid="text-detail-description">{selectedPack.description}</p>
                  </div>
                )}

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Category Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedPack.categories && Array.isArray(selectedPack.categories) && selectedPack.categories.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-center">Claims</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-center">Confidence</TableHead>
                            <TableHead className="text-center">Sample Size</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(selectedPack.categories as Array<{ name: string; claimCount: number; amount: number; confidence: string; sampleSize: number }>).map((cat, idx) => (
                            <TableRow key={idx} data-testid={`row-category-${idx}`}>
                              <TableCell className="font-medium">{cat.name}</TableCell>
                              <TableCell className="text-center">{cat.claimCount}</TableCell>
                              <TableCell className="text-right">${cat.amount.toLocaleString()}</TableCell>
                              <TableCell className="text-center">
                                <Badge className={
                                  cat.confidence === "HIGH" 
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                }>
                                  {cat.confidence}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">{cat.sampleSize}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No categories defined yet.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      Attachments ({selectedPack.attachments && Array.isArray(selectedPack.attachments) ? selectedPack.attachments.length : 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedPack.attachments && Array.isArray(selectedPack.attachments) && selectedPack.attachments.length > 0 ? (
                      <div className="space-y-2">
                        {(selectedPack.attachments as Array<{ fileName: string; fileType: string; fileSize: number; uploadedAt: string }>).map((att, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-center justify-between p-3 rounded-lg border"
                            data-testid={`attachment-${idx}`}
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{att.fileName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {(att.fileSize / 1024).toFixed(1)} KB • {new Date(att.uploadedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" data-testid={`button-download-attachment-${idx}`}>
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No attachments uploaded yet.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {selectedPack.notes && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Notes</p>
                    <p className="text-sm p-3 bg-muted rounded-lg" data-testid="text-detail-notes">
                      {selectedPack.notes}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p>{selectedPack.createdAt ? new Date(selectedPack.createdAt).toLocaleDateString() : "N/A"}</p>
                  </div>
                  {selectedPack.lockedAt && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Locked</p>
                      <p>{new Date(selectedPack.lockedAt).toLocaleDateString()} by {selectedPack.lockedBy}</p>
                    </div>
                  )}
                  {selectedPack.presentedAt && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Presented</p>
                      <p>{new Date(selectedPack.presentedAt).toLocaleDateString()}</p>
                    </div>
                  )}
                  {selectedPack.sessionId && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Session</p>
                      <p>{selectedPack.sessionId}</p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleExportJSON(selectedPack)}
                    data-testid="button-export-json"
                  >
                    <FileJson className="h-4 w-4 mr-2" />
                    Export JSON
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleExportPDF(selectedPack)}
                    data-testid="button-export-pdf"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  {selectedPack.status === "draft" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          disabled={lockMutation.isPending}
                          data-testid="button-lock-pack"
                        >
                          {lockMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Lock className="h-4 w-4 mr-2" />
                          )}
                          Lock Pack
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Lock Evidence Pack?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Locking this pack will freeze it for presentation. No further edits can be made after locking. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-lock">Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleLockPack(selectedPack)}
                            data-testid="button-confirm-lock"
                          >
                            Lock Pack
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  {selectedPack.status === "locked" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          size="sm" 
                          disabled={presentMutation.isPending}
                          data-testid="button-present-pack"
                        >
                          {presentMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Presentation className="h-4 w-4 mr-2" />
                          )}
                          Mark as Presented
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Mark as Presented?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will mark the evidence pack as having been presented in a reconciliation session.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel data-testid="button-cancel-present">Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handlePresentPack(selectedPack)}
                            data-testid="button-confirm-present"
                          >
                            Mark as Presented
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  {selectedPack.status === "presented" && (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Completed
                    </Badge>
                  )}
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
