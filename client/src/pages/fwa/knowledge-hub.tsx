import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocumentUploadDialog } from "@/components/document-upload-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Upload,
  FileText,
  Search,
  Database,
  FileType,
  Clock,
  Layers,
  RefreshCcw,
  MoreHorizontal,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type KnowledgeDocumentRow = {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  category: string;
  title: string;
  title_ar: string | null;
  description: string | null;
  source_authority: string | null;
  file_size: number;
  page_count: number | null;
  processing_status: string;
  processing_error: string | null;
  chunk_count: number | null;
  created_at: string;
  updated_at: string;
};

type KnowledgeDocumentsResponse = {
  success: boolean;
  data: {
    documents: KnowledgeDocumentRow[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
};

type KnowledgeStatsResponse = {
  success: boolean;
  data: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    totalChunks: number;
  };
};

type UploadJobItemRow = {
  id: string;
  documentId: string;
  originalFilename: string;
  title: string;
  category: string;
  sourceAuthority: string | null;
  status: "queued" | "in_progress" | "completed" | "failed";
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type UploadJobRow = {
  id: string;
  status: "queued" | "in_progress" | "completed" | "completed_with_errors" | "failed";
  createdBy: string | null;
  totalFiles: number;
  queuedFiles: number;
  inProgressFiles: number;
  completedFiles: number;
  failedFiles: number;
  progressPercent: number;
  metadata: Record<string, unknown>;
  createdAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string | null;
  items?: UploadJobItemRow[];
};

type UploadJobsResponse = {
  success: boolean;
  data: {
    jobs: UploadJobRow[];
  };
};

type UploadJobResponse = {
  success: boolean;
  data: UploadJobRow;
};

const STATUS_BADGES: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  completed: { label: "Completed", variant: "default" },
  extracting_text: { label: "Extracting", variant: "secondary" },
  chunking: { label: "Chunking", variant: "secondary" },
  generating_embeddings: { label: "Embedding", variant: "secondary" },
  processing: { label: "Processing", variant: "secondary" },
  pending: { label: "Pending", variant: "outline" },
  failed: { label: "Failed", variant: "destructive" },
};

const FILE_TYPE_LABELS: Record<string, string> = {
  pdf: "PDF",
  word: "DOC",
  image: "IMG",
  text: "TXT",
  html: "HTML",
  excel: "XLS",
};

const JOB_STATUS_BADGES: Record<
  UploadJobRow["status"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  queued: { label: "Queued", variant: "outline" },
  in_progress: { label: "In Progress", variant: "secondary" },
  completed: { label: "Completed", variant: "default" },
  completed_with_errors: { label: "Completed with Errors", variant: "destructive" },
  failed: { label: "Failed", variant: "destructive" },
};

const JOB_ITEM_STATUS_BADGES: Record<
  UploadJobItemRow["status"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  queued: { label: "Queued", variant: "outline" },
  in_progress: { label: "Processing", variant: "secondary" },
  completed: { label: "Completed", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
};

const TERMINAL_JOB_STATUSES = new Set<UploadJobRow["status"]>([
  "completed",
  "completed_with_errors",
  "failed",
]);

const categoryLabels: Record<string, string> = {
  law_regulation: "Law & Regulation",
  resolution_circular: "Resolution & Circular",
  chi_mandatory_policy: "CHI Mandatory Policy",
  clinical_manual: "Clinical Manual",
  drug_formulary: "Drug Formulary",
  training_material: "Training Material",
  other: "Other",
};

export default function KnowledgeHub() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    data: documentsResponse,
    isLoading: isLoadingDocuments,
    refetch: refetchDocuments,
  } = useQuery<KnowledgeDocumentsResponse>({
    queryKey: ["/api/knowledge-documents"],
  });

  const { data: statsResponse } = useQuery<KnowledgeStatsResponse>({
    queryKey: ["/api/knowledge-documents/stats"],
  });

  const {
    data: jobsResponse,
    refetch: refetchJobs,
  } = useQuery<UploadJobsResponse>({
    queryKey: ["/api/knowledge-documents/upload-jobs"],
    refetchInterval: 5000,
  });

  const activeJobQueryKey = activeJobId
    ? [`/api/knowledge-documents/upload-jobs/${activeJobId}`]
    : ["/api/knowledge-documents/upload-jobs/none"];
  const { data: activeJobResponse } = useQuery<UploadJobResponse>({
    queryKey: activeJobQueryKey,
    enabled: Boolean(activeJobId),
    refetchInterval: 2000,
  });

  useEffect(() => {
    if (!activeJobId) {
      const latestJobId = jobsResponse?.data?.jobs?.[0]?.id;
      if (latestJobId) {
        setActiveJobId(latestJobId);
      }
    }
  }, [jobsResponse, activeJobId]);

  useEffect(() => {
    const status = activeJobResponse?.data?.status;
    if (status && TERMINAL_JOB_STATUSES.has(status)) {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-documents/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-documents/upload-jobs"] });
    }
  }, [activeJobResponse?.data?.status, queryClient]);

  const retryFailedMutation = useMutation({
    mutationFn: async () => {
      if (!activeJobId) throw new Error("No active job selected");
      const response = await fetch(`/api/knowledge-documents/upload-jobs/${activeJobId}/retry-failed`, {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Retry failed");
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/knowledge-documents/upload-jobs"] });
      if (activeJobId) {
        await queryClient.invalidateQueries({ queryKey: [`/api/knowledge-documents/upload-jobs/${activeJobId}`] });
      }
    },
  });

  const { toast } = useToast();

  const deleteDocumentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/knowledge-documents/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Delete failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-documents/stats"] });
      toast({ title: "Document deleted", description: "The document has been removed from the knowledge base." });
    },
    onError: (error: Error) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    },
  });

  const reprocessDocumentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/knowledge-documents/${id}/reprocess`, {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Reprocess failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-documents/stats"] });
      toast({ title: "Reprocessing queued", description: "The document has been queued for reprocessing." });
    },
    onError: (error: Error) => {
      toast({ title: "Reprocess failed", description: error.message, variant: "destructive" });
    },
  });

  const documents = documentsResponse?.data?.documents ?? [];

  const filteredDocs = useMemo(() => {
    let filtered = documents;

    if (categoryFilter !== "all") {
      filtered = filtered.filter((doc) => doc.category === categoryFilter);
    }

    const query = searchQuery.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter((doc) => {
        const searchable = [doc.filename, doc.original_filename, doc.title, doc.category]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return searchable.includes(query);
      });
    }

    return filtered;
  }, [documents, searchQuery, categoryFilter]);

  const stats = {
    totalDocs: statsResponse?.data?.total ?? documents.length,
    totalChunks:
      statsResponse?.data?.totalChunks ??
      documents.reduce((sum, doc) => sum + (doc.chunk_count ?? 0), 0),
    indexed: statsResponse?.data?.completed ?? 0,
    processing: statsResponse?.data?.processing ?? 0,
  };
  const activeJob = activeJobResponse?.data;

  return (
    <div className="space-y-6" data-testid="page-knowledge-hub">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalDocs}</p>
              <p className="text-sm text-muted-foreground">Total Documents</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Layers className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalChunks}</p>
              <p className="text-sm text-muted-foreground">Knowledge Chunks</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Database className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.indexed}</p>
              <p className="text-sm text-muted-foreground">Indexed</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Clock className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.processing}</p>
              <p className="text-sm text-muted-foreground">Processing</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {activeJob && (
        <Card data-testid="card-upload-job-progress">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Latest Upload Queue Job</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={JOB_STATUS_BADGES[activeJob.status].variant}>
                  {JOB_STATUS_BADGES[activeJob.status].label}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchJobs()}
                  data-testid="button-refresh-upload-jobs"
                >
                  <RefreshCcw className="h-3.5 w-3.5 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="font-semibold">{activeJob.totalFiles}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Queued</p>
                <p className="font-semibold">{activeJob.queuedFiles}</p>
              </div>
              <div>
                <p className="text-muted-foreground">In Progress</p>
                <p className="font-semibold">{activeJob.inProgressFiles}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Completed</p>
                <p className="font-semibold">{activeJob.completedFiles}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Failed</p>
                <p className="font-semibold">{activeJob.failedFiles}</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2 text-sm">
                <span>Progress</span>
                <span className="font-mono">{activeJob.progressPercent}%</span>
              </div>
              <Progress value={activeJob.progressPercent} />
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => retryFailedMutation.mutate()}
                disabled={activeJob.failedFiles === 0 || retryFailedMutation.isPending}
                data-testid="button-retry-failed-files"
              >
                {retryFailedMutation.isPending ? "Retrying..." : "Retry Failed Files"}
              </Button>
            </div>

            {activeJob.items && activeJob.items.length > 0 && (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeJob.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm">{item.originalFilename}</TableCell>
                        <TableCell>
                          <Badge variant={JOB_ITEM_STATUS_BADGES[item.status].variant}>
                            {JOB_ITEM_STATUS_BADGES[item.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.attempts}/{item.maxAttempts}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.lastError || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Document Library</CardTitle>
            <Button
              onClick={() => setUploadOpen(true)}
              data-testid="button-upload-document"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Documents
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="max-w-sm"
              data-testid="input-search-documents"
            />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-category-filter">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {!isLoadingDocuments && filteredDocs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-empty-documents">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No documents yet</p>
              <p className="text-sm">Upload documents to build the knowledge base for Daman AI</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Chunks</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs.map((doc) => {
                  const statusInfo = STATUS_BADGES[doc.processing_status] ?? STATUS_BADGES.pending;
                  const fileType = FILE_TYPE_LABELS[doc.file_type] ?? doc.file_type.toUpperCase();

                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{doc.title || doc.original_filename}</p>
                          <p className="text-xs text-muted-foreground">{doc.original_filename}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-mono">
                          <FileType className="h-3 w-3 mr-1" />
                          {fileType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{categoryLabels[doc.category] || doc.category || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {doc.chunk_count ?? 0}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-doc-actions-${doc.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => reprocessDocumentMutation.mutate(doc.id)}
                              disabled={reprocessDocumentMutation.isPending}
                            >
                              <RotateCcw className="h-4 w-4 mr-2" />
                              Re-process
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => {
                                if (window.confirm(`Delete "${doc.title || doc.original_filename}"? This cannot be undone.`)) {
                                  deleteDocumentMutation.mutate(doc.id);
                                }
                              }}
                              disabled={deleteDocumentMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DocumentUploadDialog
        open={uploadOpen}
        onUploadQueued={(jobId) => {
          setActiveJobId(jobId);
          void queryClient.invalidateQueries({ queryKey: ["/api/knowledge-documents/upload-jobs"] });
          void queryClient.invalidateQueries({ queryKey: [`/api/knowledge-documents/upload-jobs/${jobId}`] });
        }}
        onOpenChange={(open) => {
          setUploadOpen(open);
          if (!open) {
            void refetchDocuments();
            void refetchJobs();
          }
        }}
      />
    </div>
  );
}
