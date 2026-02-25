import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Database,
  Upload,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  Stethoscope,
} from "lucide-react";

interface EmbeddingStats {
  cpt: {
    totalRecords: number;
    withEmbeddings: number;
    withoutEmbeddings: number;
    embeddingCoverage: number;
  };
  icd10: {
    totalRecords: number;
    withEmbeddings: number;
    withoutEmbeddings: number;
    embeddingCoverage: number;
  };
}

interface ImportProgress {
  jobId: string;
  type: "cpt" | "icd10";
  status: "pending" | "in_progress" | "completed" | "failed";
  processedRecords: number;
  totalRecords: number;
  embeddedRecords: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export function SemanticEmbeddingsAdmin() {
  const { toast } = useToast();
  const [importJobs, setImportJobs] = useState<ImportProgress[]>([]);
  const [pollingJobs, setPollingJobs] = useState<Set<string>>(new Set());

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<EmbeddingStats>({
    queryKey: ["/api/semantic/stats"],
    refetchInterval: 30000,
  });

  const cptImportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/semantic/import/cpt");
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "CPT Import Started",
        description: `Job ${data.jobId} is now processing CPT codes.`,
      });
      setPollingJobs(prev => new Set(Array.from(prev).concat(data.jobId)));
    },
    onError: (error: any) => {
      toast({
        title: "CPT Import Failed",
        description: error.message || "Failed to start CPT import",
        variant: "destructive",
      });
    },
  });

  const icd10ImportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/semantic/import/icd10");
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "ICD-10 Import Started",
        description: `Job ${data.jobId} is now processing ICD-10 codes.`,
      });
      setPollingJobs(prev => new Set(Array.from(prev).concat(data.jobId)));
    },
    onError: (error: any) => {
      toast({
        title: "ICD-10 Import Failed",
        description: error.message || "Failed to start ICD-10 import",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const pollJobStatuses = async () => {
      for (const jobId of Array.from(pollingJobs)) {
        try {
          const response = await fetch(`/api/semantic/import/status/${jobId}`, {
            credentials: "include"
          });
          if (response.ok) {
            const jobStatus = await response.json();
            const mappedJob: ImportProgress = {
              ...jobStatus,
              jobId: String(jobStatus.id || jobId)
            };
            setImportJobs(prev => {
              const existing = prev.findIndex(j => j.jobId === mappedJob.jobId);
              if (existing >= 0) {
                const updated = [...prev];
                updated[existing] = mappedJob;
                return updated;
              }
              return [...prev, mappedJob];
            });

            if (mappedJob.status === "completed" || mappedJob.status === "failed") {
              setPollingJobs(prev => {
                const next = new Set(Array.from(prev));
                next.delete(jobId);
                return next;
              });
              refetchStats();
              
              if (mappedJob.status === "completed") {
                toast({
                  title: "Import Completed",
                  description: `Successfully imported ${mappedJob.embeddedRecords} embeddings.`,
                });
              } else {
                toast({
                  title: "Import Failed",
                  description: mappedJob.errorMessage || "Import encountered errors",
                  variant: "destructive",
                });
              }
            }
          }
        } catch (error) {
          console.error(`Failed to poll job ${jobId}:`, error);
        }
      }
    };

    if (pollingJobs.size > 0) {
      const interval = setInterval(pollJobStatuses, 3000);
      return () => clearInterval(interval);
    }
  }, [pollingJobs, refetchStats, toast]);

  const getActiveJob = (type: "cpt" | "icd10") => {
    return importJobs.find(j => j.type === type && (j.status === "pending" || j.status === "in_progress"));
  };

  const cptActiveJob = getActiveJob("cpt");
  const icd10ActiveJob = getActiveJob("icd10");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Semantic Embeddings
        </CardTitle>
        <CardDescription>
          Manage ICD-10 and CPT code embeddings for semantic validation of procedure-diagnosis relationships
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                CPT Codes
              </CardTitle>
              <CardDescription>Procedure codes with clinical explanations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {statsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading stats...
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span>Total Records</span>
                    <Badge variant="outline" data-testid="badge-cpt-total">
                      {stats?.cpt?.totalRecords?.toLocaleString() || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>With Embeddings</span>
                    <Badge 
                      variant={stats?.cpt?.withEmbeddings ? "default" : "secondary"}
                      data-testid="badge-cpt-embedded"
                    >
                      {stats?.cpt?.withEmbeddings?.toLocaleString() || 0}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>Coverage</span>
                      <span className="font-medium">
                        {(stats?.cpt?.embeddingCoverage || 0).toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={stats?.cpt?.embeddingCoverage || 0} 
                      className="h-2"
                      data-testid="progress-cpt-coverage"
                    />
                  </div>
                </>
              )}

              {cptActiveJob && (
                <div className="space-y-2 p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {cptActiveJob.status === "pending" ? "Preparing..." : "Processing..."}
                  </div>
                  <Progress 
                    value={(cptActiveJob.processedRecords / Math.max(cptActiveJob.totalRecords, 1)) * 100}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    {cptActiveJob.processedRecords.toLocaleString()} / {cptActiveJob.totalRecords.toLocaleString()} processed
                    {cptActiveJob.embeddedRecords > 0 && ` (${cptActiveJob.embeddedRecords} embedded)`}
                  </p>
                </div>
              )}

              <Separator />
              
              <Button
                onClick={() => cptImportMutation.mutate()}
                disabled={cptImportMutation.isPending || !!cptActiveJob}
                className="w-full"
                data-testid="button-import-cpt"
              >
                {cptImportMutation.isPending || cptActiveJob ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import CPT Embeddings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                ICD-10 Codes
              </CardTitle>
              <CardDescription>Diagnosis codes with clinical context</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {statsLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading stats...
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span>Total Records</span>
                    <Badge variant="outline" data-testid="badge-icd10-total">
                      {stats?.icd10?.totalRecords?.toLocaleString() || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>With Embeddings</span>
                    <Badge 
                      variant={stats?.icd10?.withEmbeddings ? "default" : "secondary"}
                      data-testid="badge-icd10-embedded"
                    >
                      {stats?.icd10?.withEmbeddings?.toLocaleString() || 0}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>Coverage</span>
                      <span className="font-medium">
                        {(stats?.icd10?.embeddingCoverage || 0).toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={stats?.icd10?.embeddingCoverage || 0} 
                      className="h-2"
                      data-testid="progress-icd10-coverage"
                    />
                  </div>
                </>
              )}

              {icd10ActiveJob && (
                <div className="space-y-2 p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {icd10ActiveJob.status === "pending" ? "Preparing..." : "Processing..."}
                  </div>
                  <Progress 
                    value={(icd10ActiveJob.processedRecords / Math.max(icd10ActiveJob.totalRecords, 1)) * 100}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    {icd10ActiveJob.processedRecords.toLocaleString()} / {icd10ActiveJob.totalRecords.toLocaleString()} processed
                    {icd10ActiveJob.embeddedRecords > 0 && ` (${icd10ActiveJob.embeddedRecords} embedded)`}
                  </p>
                </div>
              )}

              <Separator />
              
              <Button
                onClick={() => icd10ImportMutation.mutate()}
                disabled={icd10ImportMutation.isPending || !!icd10ActiveJob}
                className="w-full"
                data-testid="button-import-icd10"
              >
                {icd10ImportMutation.isPending || icd10ActiveJob ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import ICD-10 Embeddings
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Semantic Validation Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 text-sm">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Similarity Thresholds</p>
                  <p className="text-muted-foreground">
                    70%+ = Low Risk, 50-69% = Medium Risk, 30-49% = High Risk, &lt;30% = Critical
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium">Detection Weight</p>
                  <p className="text-muted-foreground">
                    Semantic validation contributes 15% to the composite FWA detection score
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Database className="h-4 w-4 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium">Embedding Model</p>
                  <p className="text-muted-foreground">
                    AI Embedding Model (1536 dimensions) with pgvector cosine similarity
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => refetchStats()}
            disabled={statsLoading}
            data-testid="button-refresh-stats"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${statsLoading ? "animate-spin" : ""}`} />
            Refresh Stats
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
