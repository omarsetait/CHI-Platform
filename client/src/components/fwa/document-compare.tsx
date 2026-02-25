import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Files, Brain, AlertTriangle, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DocumentCompareSectionProps {
  claimReference?: string;
}

export function DocumentCompareSection({ claimReference: initialClaimRef }: DocumentCompareSectionProps) {
  const { toast } = useToast();
  const [ocrText, setOcrText] = useState("");
  const [claimReference, setClaimReference] = useState(initialClaimRef || "");
  const [documentType, setDocumentType] = useState("discharge_summary");
  const [comparisonResult, setComparisonResult] = useState<any>(null);

  useEffect(() => {
    if (initialClaimRef) {
      setClaimReference(initialClaimRef);
    }
  }, [initialClaimRef]);

  const uploadMutation = useMutation({
    mutationFn: async (data: { ocrText: string; claimReference: string; documentType: string }) => {
      const response = await apiRequest("POST", "/api/documents/upload", {
        claimReference: data.claimReference,
        documentType: data.documentType,
        fileName: `${data.documentType}_${Date.now()}.txt`,
        ocrText: data.ocrText,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Document Uploaded", description: "Document saved for analysis" });
      if (data.document?.id) {
        compareMutation.mutate({ documentId: data.document.id, claimReference });
      }
    },
  });

  const compareMutation = useMutation({
    mutationFn: async (data: { documentId: string; claimReference: string }) => {
      const claimsRes = await fetch(`/api/claims?search=${encodeURIComponent(data.claimReference)}&limit=1`);
      const claimsData = await claimsRes.json();
      const claim = claimsData.claims?.[0] || claimsData[0];
      
      const claimData = claim ? {
        claimReference: claim.claimReference || data.claimReference,
        amount: claim.claimAmount || claim.netAmount || 0,
        principalDiagnosisCode: claim.principalDiagnosisCode || claim.icdCode || "N/A",
        secondaryDiagnosisCodes: claim.secondaryDiagnosisCodes?.join(", ") || "",
        description: claim.claimNarrative || claim.description || "",
        providerId: claim.providerId || "",
        specialtyCode: claim.specialtyCode || "",
        claimType: claim.claimType || "",
      } : {
        claimReference: data.claimReference,
        amount: 0,
        principalDiagnosisCode: "N/A",
        description: "Claim not found - comparing with document only",
      };
      
      const response = await apiRequest("POST", `/api/documents/${data.documentId}/compare`, { claimData });
      return response.json();
    },
    onSuccess: (data) => {
      setComparisonResult(data.comparison);
      toast({ title: "Comparison Complete", description: `Match score: ${data.comparison?.matchScore || 0}%` });
    },
  });

  const isProcessing = uploadMutation.isPending || compareMutation.isPending;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Files className="h-5 w-5" />
            Document vs Claim Comparison
          </CardTitle>
          <CardDescription>
            Upload medical documents (OCR text) to compare against claim data and detect discrepancies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="docClaimRef">Claim Reference</Label>
            <Input
              id="docClaimRef"
              placeholder="CLM-KSA-2026-0001"
              value={claimReference}
              onChange={(e) => setClaimReference(e.target.value)}
              data-testid="input-doc-claim-ref"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="docType">Document Type</Label>
            <Select value={documentType} onValueChange={setDocumentType}>
              <SelectTrigger data-testid="select-doc-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="discharge_summary">Discharge Summary</SelectItem>
                <SelectItem value="lab_report">Lab Report</SelectItem>
                <SelectItem value="radiology_report">Radiology Report</SelectItem>
                <SelectItem value="prescription">Prescription</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="medical_record">Medical Record</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ocrText">Document OCR Text</Label>
            <Textarea
              id="ocrText"
              placeholder="Paste OCR-extracted text from medical document here...&#10;&#10;Example:&#10;Patient: Ahmed Al-Rashid, DOB: 15/03/1985&#10;Diagnosis: J18.9 Pneumonia, unspecified&#10;Treatment: IV Antibiotics - Amoxicillin 500mg&#10;Total Charges: SAR 12,500"
              value={ocrText}
              onChange={(e) => setOcrText(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
              data-testid="textarea-ocr-text"
            />
          </div>
          <Button
            onClick={() => uploadMutation.mutate({ ocrText, claimReference, documentType })}
            disabled={!ocrText || !claimReference || isProcessing}
            className="w-full"
            data-testid="button-analyze-document"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Analyze Document
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            AI Comparison Results
          </CardTitle>
          <CardDescription>
            Discrepancies detected between document and claim data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!comparisonResult ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Files className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-sm">Upload a document to see comparison results</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Match Score</span>
                  <div className="flex items-center gap-2">
                    <Progress value={comparisonResult.matchScore} className="w-32 h-2" />
                    <span className="font-mono text-sm">{comparisonResult.matchScore}%</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Recommendation</span>
                  <Badge variant={
                    comparisonResult.recommendation === "approve" ? "default" :
                    comparisonResult.recommendation === "reject" ? "destructive" :
                    "secondary"
                  }>
                    {comparisonResult.recommendation?.toUpperCase()}
                  </Badge>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Discrepancies Found</h4>
                  {comparisonResult.discrepancies?.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No discrepancies detected</p>
                  ) : (
                    <div className="space-y-2">
                      {comparisonResult.discrepancies?.map((d: any, i: number) => (
                        <div key={i} className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{d.field}</span>
                            <Badge variant={
                              d.severity === "critical" ? "destructive" :
                              d.severity === "high" ? "secondary" : "outline"
                            }>
                              {d.severity}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>Claim: {d.claimValue}</p>
                            <p>Document: {d.documentValue}</p>
                            <p className="italic">{d.explanation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {comparisonResult.riskIndicators?.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Risk Indicators</h4>
                      <div className="flex flex-wrap gap-2">
                        {comparisonResult.riskIndicators.map((r: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-orange-600">
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
