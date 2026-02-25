import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Filter, 
  Plus,
  FileText,
  FileSpreadsheet,
  Grid,
  List,
  Loader2,
  Upload,
  AlertCircle,
  CheckCircle,
  XCircle,
  MessageSquare,
  UserPlus,
  ChevronDown
} from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PreAuthClaim } from "@shared/schema";

type ViewMode = "grid" | "list";
type PreAuthClaimStatus = "ingested" | "analyzing" | "aggregated" | "pending_review" | "approved" | "rejected" | "request_info";

const statusFilters: { value: PreAuthClaimStatus | "all"; label: string }[] = [
  { value: "all", label: "All Requests" },
  { value: "ingested", label: "Ingested" },
  { value: "analyzing", label: "Analyzing" },
  { value: "aggregated", label: "Aggregated" },
  { value: "pending_review", label: "Pending Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "request_info", label: "Request Info" },
];

const statusColors: Record<string, string> = {
  ingested: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  analyzing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  aggregated: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  pending_review: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  request_info: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

function PreAuthClaimCard({ 
  claim, 
  isSelected, 
  onSelectionChange 
}: { 
  claim: PreAuthClaim; 
  isSelected: boolean;
  onSelectionChange: (claimId: string, checked: boolean) => void;
}) {
  return (
    <Card className="hover-elevate cursor-pointer" data-testid={`claim-card-${claim.id}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelectionChange(claim.id.toString(), !!checked)}
              onClick={(e) => e.stopPropagation()}
              data-testid={`checkbox-claim-${claim.id}`}
            />
            <Link href={`/pre-auth/claims/${claim.id}`}>
              <span className="font-mono text-sm font-medium hover:underline">{claim.claimId}</span>
            </Link>
          </div>
          <Badge className={statusColors[claim.status || "ingested"]}>
            {(claim.status || "ingested").replace("_", " ")}
          </Badge>
        </div>
        <Link href={`/pre-auth/claims/${claim.id}`}>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Member: {claim.memberId}</p>
            {claim.providerId && <p>Provider: {claim.providerId}</p>}
            {claim.specialty && <p>Specialty: {claim.specialty}</p>}
          </div>
          <div className="flex items-center justify-between gap-2 flex-wrap mt-3">
            {claim.totalAmount && (
              <p className="text-sm font-medium">
                ${Number(claim.totalAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
            )}
            {claim.priority && (
              <Badge variant="outline" className="text-xs">
                {claim.priority}
              </Badge>
            )}
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}

function PreAuthClaimListItem({ 
  claim, 
  isSelected, 
  onSelectionChange 
}: { 
  claim: PreAuthClaim; 
  isSelected: boolean;
  onSelectionChange: (claimId: string, checked: boolean) => void;
}) {
  return (
    <Card className="hover-elevate cursor-pointer" data-testid={`claim-list-item-${claim.id}`}>
      <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelectionChange(claim.id.toString(), !!checked)}
            onClick={(e) => e.stopPropagation()}
            data-testid={`checkbox-claim-list-${claim.id}`}
          />
          <Link href={`/pre-auth/claims/${claim.id}`}>
            <span className="font-mono text-sm font-medium hover:underline">{claim.claimId}</span>
          </Link>
          <span className="text-sm text-muted-foreground">Member: {claim.memberId}</span>
          {claim.providerId && (
            <span className="text-sm text-muted-foreground">Provider: {claim.providerId}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {claim.totalAmount && (
            <span className="text-sm font-medium">
              ${Number(claim.totalAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </span>
          )}
          <Badge className={statusColors[claim.status || "ingested"]}>
            {(claim.status || "ingested").replace("_", " ")}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PreAuthClaimsList() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PreAuthClaimStatus | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [selectedClaims, setSelectedClaims] = useState<Set<string>>(new Set());

  const { data: claims, isLoading } = useQuery<PreAuthClaim[]>({
    queryKey: ["/api/pre-auth/claims"],
  });

  const importBatchMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/pre-auth/claims/batch", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to import batch");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pre-auth/claims"] });
      toast({
        title: "Batch imported successfully",
        description: `Imported ${data?.count || 0} claims from the file.`,
      });
      setImportDialogOpen(false);
      setImportFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ claimIds, status }: { claimIds: string[]; status: string }) => {
      return apiRequest("PATCH", "/api/pre-auth/claims/bulk-status", { claimIds, status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pre-auth/claims"] });
      toast({
        title: "Status updated",
        description: `Updated ${selectedClaims.size} claims successfully.`,
      });
      setSelectedClaims(new Set());
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredClaims = claims?.filter((claim) => {
    const matchesSearch = 
      claim.claimId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.memberId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (claim.providerId && claim.providerId.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || claim.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusCounts = claims?.reduce((acc, claim) => {
    const status = claim.status || "ingested";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  const handleImport = () => {
    if (importFile) {
      importBatchMutation.mutate(importFile);
    }
  };

  const handleSelectionChange = (claimId: string, checked: boolean) => {
    const newSelection = new Set(selectedClaims);
    if (checked) {
      newSelection.add(claimId);
    } else {
      newSelection.delete(claimId);
    }
    setSelectedClaims(newSelection);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && filteredClaims) {
      setSelectedClaims(new Set(filteredClaims.map(c => c.id.toString())));
    } else {
      setSelectedClaims(new Set());
    }
  };

  const handleBulkAction = (status: string) => {
    if (selectedClaims.size === 0) return;
    bulkStatusMutation.mutate({ 
      claimIds: Array.from(selectedClaims), 
      status 
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const allSelected = filteredClaims && filteredClaims.length > 0 && 
    filteredClaims.every(c => selectedClaims.has(c.id.toString()));
  const someSelected = filteredClaims && filteredClaims.some(c => selectedClaims.has(c.id.toString()));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Pre-Auth Queue</h1>
          <p className="text-muted-foreground">
            View and manage all pre-authorization requests
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedClaims.size > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" data-testid="button-bulk-actions">
                  Bulk Actions ({selectedClaims.size})
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => handleBulkAction("approved")}
                  data-testid="bulk-action-approve"
                  disabled={bulkStatusMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                  Approve All
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleBulkAction("rejected")}
                  data-testid="bulk-action-reject"
                  disabled={bulkStatusMutation.isPending}
                >
                  <XCircle className="w-4 h-4 mr-2 text-red-600" />
                  Reject All
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleBulkAction("request_info")}
                  data-testid="bulk-action-request-info"
                  disabled={bulkStatusMutation.isPending}
                >
                  <MessageSquare className="w-4 h-4 mr-2 text-orange-600" />
                  Request Info
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleBulkAction("pending_review")}
                  data-testid="bulk-action-assign"
                  disabled={bulkStatusMutation.isPending}
                >
                  <UserPlus className="w-4 h-4 mr-2 text-blue-600" />
                  Assign to User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button 
            variant="outline" 
            onClick={() => setImportDialogOpen(true)}
            data-testid="button-batch-import"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Import Batch
          </Button>
          <Button asChild data-testid="button-new-preauth">
            <Link href="/pre-auth/claims/new">
              <Plus className="w-4 h-4 mr-2" />
              New Pre-Auth
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by claim ID, member ID, or provider..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PreAuthClaimStatus | "all")}>
            <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              {statusFilters.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  <div className="flex items-center gap-2">
                    {filter.label}
                    {filter.value !== "all" && statusCounts[filter.value] !== undefined && (
                      <Badge variant="secondary" className="text-xs ml-2">
                        {statusCounts[filter.value]}
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="grid" data-testid="view-grid">
                <Grid className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="list" data-testid="view-list">
                <List className="w-4 h-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={allSelected}
            ref={undefined}
            onCheckedChange={handleSelectAll}
            data-testid="checkbox-select-all"
          />
          <span className="text-sm text-muted-foreground">Select All</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {statusFilters.slice(1).map((filter) => (
            <Button
              key={filter.value}
              variant={statusFilter === filter.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(statusFilter === filter.value ? "all" : filter.value)}
              className="gap-1.5"
              data-testid={`filter-${filter.value}`}
            >
              {filter.label}
              {statusCounts[filter.value] !== undefined && (
                <Badge variant={statusFilter === filter.value ? "secondary" : "outline"} className="text-xs">
                  {statusCounts[filter.value] || 0}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredClaims && filteredClaims.length > 0 ? (
        viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClaims.map((claim) => (
              <PreAuthClaimCard 
                key={claim.id} 
                claim={claim}
                isSelected={selectedClaims.has(claim.id.toString())}
                onSelectionChange={handleSelectionChange}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredClaims.map((claim) => (
              <PreAuthClaimListItem 
                key={claim.id} 
                claim={claim}
                isSelected={selectedClaims.has(claim.id.toString())}
                onSelectionChange={handleSelectionChange}
              />
            ))}
          </div>
        )
      ) : (
        <Card data-testid="empty-state-claims">
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-medium mb-1">
              {searchQuery || statusFilter !== "all" ? "No requests found" : "No pre-auth requests yet"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery || statusFilter !== "all" 
                ? "Try adjusting your search or filters"
                : "Submit your first pre-authorization request to get started"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button asChild>
                <Link href="/pre-auth/claims/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Submit New Pre-Auth
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {filteredClaims && filteredClaims.length > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {filteredClaims.length} of {claims?.length || 0} requests</span>
          {selectedClaims.size > 0 && (
            <span>{selectedClaims.size} selected</span>
          )}
        </div>
      )}

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent data-testid="dialog-import-batch">
          <DialogHeader>
            <DialogTitle>Import Batch Claims</DialogTitle>
            <DialogDescription>
              Upload a file containing multiple pre-authorization claims to process in batch.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              data-testid="dropzone-import"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json,.xlsx"
                onChange={handleFileChange}
                className="hidden"
                data-testid="input-file-import"
              />
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                Supported formats: CSV, JSON, XLSX
              </p>
            </div>

            {importFile && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-md" data-testid="file-preview">
                <FileSpreadsheet className="w-8 h-8 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{importFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(importFile.size)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setImportFile(null)}
                  data-testid="button-remove-file"
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            )}

            {importBatchMutation.isError && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md" data-testid="import-error">
                <AlertCircle className="w-4 h-4" />
                <p className="text-sm">Failed to import. Please check your file format.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImportDialogOpen(false);
                setImportFile(null);
              }}
              data-testid="button-cancel-import"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importFile || importBatchMutation.isPending}
              data-testid="button-confirm-import"
            >
              {importBatchMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
