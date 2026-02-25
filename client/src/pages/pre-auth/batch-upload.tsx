import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Upload, 
  FileJson, 
  Table2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Loader2,
  ArrowUpCircle,
  ArrowRightCircle,
  ArrowDownCircle,
} from "lucide-react";
import type { PreAuthBatch } from "@shared/schema";

type PreAuthPriority = "HIGH" | "NORMAL" | "LOW";

const EXAMPLE_JSON = `[
  {
    "claimId": "PA-BATCH-001",
    "payerId": "PAYER-001",
    "memberId": "MEM-12345",
    "memberDob": "1985-03-15",
    "memberGender": "M",
    "providerId": "PROV-001",
    "specialty": "Cardiology",
    "networkStatus": "InNetwork",
    "totalAmount": "1500.00",
    "diagnoses": [{"code_system": "ICD-10", "code": "I25.10", "desc": "Atherosclerotic heart disease"}]
  },
  {
    "claimId": "PA-BATCH-002",
    "payerId": "PAYER-001",
    "memberId": "MEM-67890",
    "memberDob": "1978-07-22",
    "memberGender": "F",
    "providerId": "PROV-002",
    "specialty": "Orthopedics",
    "networkStatus": "InNetwork",
    "totalAmount": "2300.00",
    "diagnoses": [{"code_system": "ICD-10", "code": "M17.11", "desc": "Primary osteoarthritis, right knee"}]
  }
]`;

const EXAMPLE_CSV = `claimId,payerId,memberId,memberDob,memberGender,providerId,specialty,networkStatus,totalAmount,diagnosisCode,diagnosisDesc
PA-BATCH-001,PAYER-001,MEM-12345,1985-03-15,M,PROV-001,Cardiology,InNetwork,1500.00,I25.10,Atherosclerotic heart disease
PA-BATCH-002,PAYER-001,MEM-67890,1978-07-22,F,PROV-002,Orthopedics,InNetwork,2300.00,M17.11,Primary osteoarthritis right knee`;

export default function PreAuthBatchUpload() {
  const { toast } = useToast();
  const [batchName, setBatchName] = useState("");
  const [priority, setPriority] = useState<PreAuthPriority>("NORMAL");
  const [inputType, setInputType] = useState<"json" | "csv">("json");
  const [claimsInput, setClaimsInput] = useState("");

  const { data: batchList = [], isLoading: batchesLoading, refetch: refetchBatches } = useQuery<PreAuthBatch[]>({
    queryKey: ["/api/pre-auth/batches"],
    refetchInterval: 5000,
  });

  const submitBatchMutation = useMutation({
    mutationFn: async (data: { name: string; priority: PreAuthPriority; claims: unknown[] }) => {
      return apiRequest("POST", "/api/pre-auth/claims/batch", data);
    },
    onSuccess: async (response) => {
      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/pre-auth/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pre-auth/claims"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pre-auth/stats"] });
      
      let description = `Batch "${result.name}" with ${result.totalClaims} claims is now processing`;
      if (result.failedCount > 0) {
        description += `. ${result.failedCount} claim(s) failed to import`;
        if (result.failedClaims?.length > 0) {
          const firstError = result.failedClaims[0];
          description += `: ${firstError.error}`;
        }
      }
      
      toast({
        title: result.failedCount > 0 ? "Batch submitted with warnings" : "Batch submitted successfully",
        description,
        variant: result.failedCount > 0 ? "destructive" : "default",
      });
      setBatchName("");
      setClaimsInput("");
    },
    onError: (error: Error) => {
      toast({
        title: "Batch submission failed",
        description: error.message || "Failed to submit batch",
        variant: "destructive",
      });
    },
  });

  const parseClaimsInput = (): unknown[] | null => {
    if (!claimsInput.trim()) {
      toast({
        title: "Input required",
        description: "Please enter claims data in JSON or CSV format",
        variant: "destructive",
      });
      return null;
    }

    try {
      if (inputType === "json") {
        const parsed = JSON.parse(claimsInput);
        if (!Array.isArray(parsed)) {
          throw new Error("JSON must be an array of claims");
        }
        return parsed;
      } else {
        const lines = claimsInput.trim().split("\n");
        if (lines.length < 2) {
          throw new Error("CSV must have a header row and at least one data row");
        }
        
        const headers = lines[0].split(",").map(h => h.trim());
        const claims: Record<string, unknown>[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map(v => v.trim());
          const claim: Record<string, unknown> = {};
          
          headers.forEach((header, idx) => {
            if (header === "diagnosisCode" || header === "diagnosisDesc") {
              if (!claim.diagnoses) claim.diagnoses = [{}];
              const diagnoses = claim.diagnoses as Record<string, string>[];
              if (header === "diagnosisCode") {
                diagnoses[0].code_system = "ICD-10";
                diagnoses[0].code = values[idx];
              } else {
                diagnoses[0].desc = values[idx];
              }
            } else {
              claim[header] = values[idx];
            }
          });
          
          claims.push(claim);
        }
        
        return claims;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to parse claims data";
      toast({
        title: "Parse error",
        description: message,
        variant: "destructive",
      });
      return null;
    }
  };

  const handleSubmit = () => {
    const claims = parseClaimsInput();
    if (claims && claims.length > 0) {
      submitBatchMutation.mutate({
        name: batchName || `Pre-Auth Batch ${new Date().toLocaleString()}`,
        priority,
        claims,
      });
    }
  };

  const loadExample = () => {
    setClaimsInput(inputType === "json" ? EXAMPLE_JSON : EXAMPLE_CSV);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="gap-1"><CheckCircle2 className="w-3 h-3" />Completed</Badge>;
      case "processing":
        return <Badge variant="secondary" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" />Processing</Badge>;
      case "failed":
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />Failed</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
    }
  };

  const getPriorityBadge = (p: string | null) => {
    switch (p) {
      case "HIGH":
        return <Badge variant="destructive" className="gap-1"><ArrowUpCircle className="w-3 h-3" />HIGH</Badge>;
      case "LOW":
        return <Badge variant="outline" className="gap-1"><ArrowDownCircle className="w-3 h-3" />LOW</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><ArrowRightCircle className="w-3 h-3" />NORMAL</Badge>;
    }
  };

  const getProgressValue = (batch: PreAuthBatch): number => {
    if (batch.status === "completed") return 100;
    if (batch.totalClaims && batch.totalClaims > 0) {
      return Math.round(((batch.processedClaims || 0) + (batch.failedClaims || 0)) / batch.totalClaims * 100);
    }
    return 0;
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="page-title">Pre-Auth Batch Upload</h1>
        <p className="text-muted-foreground">
          Submit multiple pre-authorization claims at once for batch processing
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Submit Batch
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="batch-name">Batch Name (optional)</Label>
              <Input
                id="batch-name"
                placeholder="e.g., Q4 Pre-Authorization Requests"
                value={batchName}
                onChange={(e) => setBatchName(e.target.value)}
                data-testid="input-batch-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority Level</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as PreAuthPriority)}>
                <SelectTrigger data-testid="select-priority">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HIGH">HIGH - Process First</SelectItem>
                  <SelectItem value="NORMAL">NORMAL - Standard Queue</SelectItem>
                  <SelectItem value="LOW">LOW - Process Last</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Tabs value={inputType} onValueChange={(v) => setInputType(v as "json" | "csv")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="json" className="gap-2" data-testid="tab-json">
                  <FileJson className="w-4 h-4" />
                  JSON
                </TabsTrigger>
                <TabsTrigger value="csv" className="gap-2" data-testid="tab-csv">
                  <Table2 className="w-4 h-4" />
                  CSV
                </TabsTrigger>
              </TabsList>
              <TabsContent value="json" className="space-y-2">
                <Label htmlFor="claims-json">Claims Data (JSON Array)</Label>
                <Textarea
                  id="claims-json"
                  placeholder='[{"claimId": "PA-001", "payerId": "P001", "memberId": "M001", ...}]'
                  className="min-h-[200px] font-mono text-sm"
                  value={claimsInput}
                  onChange={(e) => setClaimsInput(e.target.value)}
                  data-testid="textarea-claims-json"
                />
              </TabsContent>
              <TabsContent value="csv" className="space-y-2">
                <Label htmlFor="claims-csv">Claims Data (CSV)</Label>
                <Textarea
                  id="claims-csv"
                  placeholder="claimId,payerId,memberId,totalAmount,..."
                  className="min-h-[200px] font-mono text-sm"
                  value={claimsInput}
                  onChange={(e) => setClaimsInput(e.target.value)}
                  data-testid="textarea-claims-csv"
                />
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={loadExample}
                data-testid="button-load-example"
              >
                Load Example
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitBatchMutation.isPending || !claimsInput.trim()}
                data-testid="button-submit-batch"
              >
                {submitBatchMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Submit Batch
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle>Recent Batches</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetchBatches()}
              data-testid="button-refresh-batches"
            >
              <RefreshCw className={`w-4 h-4 ${batchesLoading ? "animate-spin" : ""}`} />
            </Button>
          </CardHeader>
          <CardContent>
            {batchesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : batchList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground" data-testid="empty-batches">
                <Upload className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No batches submitted yet</p>
                <p className="text-sm">Submit your first batch using the form</p>
              </div>
            ) : (
              <div className="space-y-4">
                {batchList.slice(0, 10).map((batch) => (
                  <div
                    key={batch.id}
                    className="p-4 border rounded-md space-y-3"
                    data-testid={`batch-item-${batch.id}`}
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-medium">{batch.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {batch.createdAt ? new Date(batch.createdAt).toLocaleString() : ""}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {getPriorityBadge(batch.priority)}
                        {getStatusBadge(batch.status)}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>
                          {(batch.processedClaims || 0) + (batch.failedClaims || 0)} / {batch.totalClaims || 0} claims
                        </span>
                      </div>
                      <Progress 
                        value={getProgressValue(batch)} 
                        className="h-2"
                        data-testid={`progress-${batch.id}`}
                      />
                    </div>

                    {(batch.failedClaims || 0) > 0 && (
                      <p className="text-sm text-destructive">
                        {batch.failedClaims} claim(s) failed processing
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
