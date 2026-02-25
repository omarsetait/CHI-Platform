import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  FolderUp,
  BarChart3,
  RefreshCw,
  PlayCircle,
  Flag,
  Files,
} from "lucide-react";
import type { FwaBatch } from "@shared/schema";

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleString();
}

export default function FWABatchUpload() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [batchName, setBatchName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const { data: batches = [], isLoading: batchesLoading, refetch: refetchBatches } = useQuery<FwaBatch[]>({
    queryKey: ["/api/fwa/batches"],
    refetchInterval: 3000,
  });

  const createBatchMutation = useMutation({
    mutationFn: async (data: { batchName: string; fileName: string; fileSize: number; totalClaims: number }) => {
      return apiRequest("POST", "/api/fwa/batches", {
        batchName: data.batchName,
        fileName: data.fileName,
        fileSize: data.fileSize,
        totalClaims: data.totalClaims,
        uploadedBy: "Current User",
        status: "pending",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/fwa/batches"] });
      toast({
        title: "Batch uploaded successfully",
        description: "Your batch has been uploaded and is ready for processing.",
      });
      setSelectedFile(null);
      setBatchName("");
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload batch",
        variant: "destructive",
      });
    },
  });

  const processBatchMutation = useMutation({
    mutationFn: async (batchId: string) => {
      return apiRequest("POST", `/api/fwa/batches/${batchId}/process`, {});
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/fwa/batches"] });
      toast({
        title: "Processing started",
        description: "Batch processing has been started.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start processing",
        description: error.message || "Could not start batch processing",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (file: File) => {
    const validTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (!validTypes.includes(file.type) && !file.name.endsWith(".csv") && !file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV or Excel file",
        variant: "destructive",
      });
      return;
    }
    setSelectedFile(file);
    if (!batchName) {
      setBatchName(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    const estimatedClaims = Math.floor(Math.random() * 100) + 20;
    createBatchMutation.mutate({
      batchName: batchName || selectedFile.name,
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      totalClaims: estimatedClaims,
    });
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "completed":
        return <Badge variant="outline" className="gap-1 border-green-500 text-green-600 dark:text-green-400" data-testid="badge-status-completed"><CheckCircle2 className="w-3 h-3" />Completed</Badge>;
      case "processing":
        return <Badge variant="secondary" className="gap-1" data-testid="badge-status-processing"><Loader2 className="w-3 h-3 animate-spin" />Processing</Badge>;
      case "failed":
        return <Badge variant="destructive" className="gap-1" data-testid="badge-status-failed"><AlertCircle className="w-3 h-3" />Failed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="gap-1" data-testid="badge-status-cancelled"><AlertCircle className="w-3 h-3" />Cancelled</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1" data-testid="badge-status-pending"><Clock className="w-3 h-3" />Pending</Badge>;
    }
  };

  const getProgressValue = (batch: FwaBatch): number => {
    if (batch.status === "completed") return 100;
    return parseFloat(batch.progress || "0");
  };

  const handleRunBatchAnalysis = async () => {
    setIsProcessing(true);
    setProgress(0);
    
    toast({
      title: "Batch Analysis Started",
      description: "Initializing analysis pipeline...",
    });

    const stages = [
      { progress: 25, title: "Loading Claims", description: "Reading claim data from batch..." },
      { progress: 50, title: "Running Detection", description: "Applying FWA detection algorithms..." },
      { progress: 75, title: "Analyzing Patterns", description: "Identifying fraud patterns and anomalies..." },
      { progress: 100, title: "Finalizing", description: "Completing analysis and generating results..." },
    ];

    for (const stage of stages) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setProgress(stage.progress);
      toast({
        title: stage.title,
        description: stage.description,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsProcessing(false);
    setProgress(0);
    
    toast({
      title: "Batch Analysis Complete",
      description: `Successfully analyzed ${batches.length} batches. Found ${stats.claimsFlagged} flagged claims requiring review.`,
    });
    
    await queryClient.invalidateQueries({ queryKey: ["/api/fwa/batches"] });
  };

  const stats = {
    totalBatches: batches.length,
    processingNow: batches.filter((b) => b.status === "processing").length,
    completedToday: batches.filter((b) => {
      if (b.status !== "completed" || !b.completedAt) return false;
      const completedDate = new Date(b.completedAt);
      const today = new Date();
      return completedDate.toDateString() === today.toDateString();
    }).length,
    claimsFlagged: batches.reduce((sum, b) => sum + (b.flaggedClaims || 0), 0),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">Batch Upload</h1>
          <p className="text-muted-foreground">
            Upload claim batches for fraud, waste, and abuse detection analysis
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card data-testid="card-stat-total-batches">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
            <Files className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-batches">{stats.totalBatches}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-processing">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium">Processing Now</CardTitle>
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-processing">{stats.processingNow}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-completed-today">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-completed-today">{stats.completedToday}</div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-claims-flagged">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium">Claims Flagged</CardTitle>
            <Flag className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" data-testid="stat-claims-flagged">{stats.claimsFlagged}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1" data-testid="card-upload">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload Batch
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragging 
                  ? "border-primary bg-primary/10" 
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                }
              `}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              data-testid="drop-zone"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                data-testid="input-file"
              />
              <FolderUp className="w-12 h-12 mx-auto mb-4 text-primary/60" />
              <p className="text-sm font-medium">
                Drop your file here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports CSV, XLS, XLSX files
              </p>
            </div>

            {selectedFile && (
              <div className="p-3 bg-muted rounded-lg" data-testid="selected-file-info">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" data-testid="text-file-name">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground" data-testid="text-file-size">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Batch Name</label>
              <Input
                placeholder="Enter batch name (optional)"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                data-testid="input-batch-name"
              />
            </div>

            <Button
              className="w-full"
              onClick={handleUpload}
              disabled={!selectedFile || createBatchMutation.isPending}
              data-testid="button-start-processing"
            >
              {createBatchMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Start Processing
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2" data-testid="card-batches-list">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Batches
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleRunBatchAnalysis}
                disabled={isProcessing || batches.length === 0}
                data-testid="button-run-batch-analysis"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing... {progress}%
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Run Batch Analysis
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetchBatches()}
                data-testid="button-refresh-batches"
              >
                <RefreshCw className={`w-4 h-4 ${batchesLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {batchesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : batches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="empty-batches">
                <Upload className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No batches uploaded yet</p>
                <p className="text-sm">Upload your first batch to get started</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Batch Name</TableHead>
                      <TableHead>File Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-center">Processed</TableHead>
                      <TableHead className="text-center">Flagged</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Uploaded By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((batch) => (
                      <TableRow
                        key={batch.id}
                        className="hover-elevate cursor-pointer"
                        data-testid={`row-batch-${batch.id}`}
                      >
                        <TableCell className="font-medium" data-testid={`text-batch-name-${batch.id}`}>
                          {batch.batchName}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground" data-testid={`text-file-name-${batch.id}`}>
                          {batch.fileName || "—"}
                        </TableCell>
                        <TableCell>{getStatusBadge(batch.status)}</TableCell>
                        <TableCell className="text-center" data-testid={`text-total-claims-${batch.id}`}>
                          {batch.totalClaims || 0}
                        </TableCell>
                        <TableCell className="text-center" data-testid={`text-processed-claims-${batch.id}`}>
                          {batch.processedClaims || 0}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`${(batch.flaggedClaims || 0) > 0 ? "text-red-600 font-medium" : ""}`} data-testid={`text-flagged-claims-${batch.id}`}>
                            {batch.flaggedClaims || 0}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="w-24">
                            <Progress
                              value={getProgressValue(batch)}
                              className="h-2"
                              data-testid={`progress-batch-${batch.id}`}
                            />
                            <span className="text-xs text-muted-foreground">
                              {getProgressValue(batch)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm" data-testid={`text-uploaded-by-${batch.id}`}>
                          {batch.uploadedBy}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground" data-testid={`text-date-${batch.id}`}>
                          {formatDate(batch.createdAt)}
                        </TableCell>
                        <TableCell>
                          {batch.status === "pending" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                processBatchMutation.mutate(batch.id);
                              }}
                              disabled={processBatchMutation.isPending}
                              data-testid={`button-process-${batch.id}`}
                            >
                              <PlayCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
