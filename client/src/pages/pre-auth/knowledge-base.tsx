import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { 
  Library, 
  Upload, 
  FileText, 
  Trash2, 
  Search, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Plus,
  Shield,
  FileCheck,
  Stethoscope,
  ClipboardList,
  UserCheck,
  ExternalLink,
  Files,
  X,
  Settings2,
  Eye,
  ChevronUp
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PreAuthDocument } from "@shared/schema";

type PreAuthDocumentType = "regulatory" | "policy" | "medical_guidelines" | "patient_history" | "declaration";

const documentTypeConfig: Record<PreAuthDocumentType, { label: string; icon: typeof Shield; phase: number; description: string; requiresId: "policyPlanId" | "memberId" | null }> = {
  regulatory: { 
    label: "Regulatory Guidelines", 
    icon: Shield, 
    phase: 1,
    description: "CHI mandates, compliance requirements, and regulatory documents",
    requiresId: null
  },
  policy: { 
    label: "Policy Terms & Conditions", 
    icon: FileCheck, 
    phase: 2,
    description: "Insurance policy documents, coverage terms, and benefit limits",
    requiresId: "policyPlanId"
  },
  medical_guidelines: { 
    label: "Medical Guidelines", 
    icon: Stethoscope, 
    phase: 3,
    description: "Clinical guidelines, medical necessity criteria, and treatment protocols",
    requiresId: null
  },
  patient_history: { 
    label: "Patient History", 
    icon: ClipboardList, 
    phase: 4,
    description: "Historical care records, previous claims, and visit history (CSV, Excel, PDF)",
    requiresId: "memberId"
  },
  declaration: { 
    label: "Member Declarations", 
    icon: UserCheck, 
    phase: 5,
    description: "Pre-existing condition declarations and member disclosure forms",
    requiresId: "memberId"
  },
};

interface UploadFormData {
  name: string;
  description: string;
  documentType: PreAuthDocumentType;
  targetPhase: number | null;
  policyPlanId: string;
  memberId: string;
  file: File | null;
  sourceUrl: string;
  pastedContent: string;
}

interface BatchFile {
  id: string;
  file: File;
  name: string;
  documentType: PreAuthDocumentType;
  policyPlanId: string;
  memberId: string;
  description: string;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

interface BatchUploadResult {
  fileName: string;
  success: boolean;
  documentId?: string;
  error?: string;
}

export default function PreAuthKnowledgeBase() {
  const [, params] = useRoute("/pre-auth/knowledge-base/:type");
  const docType = params?.type as string | undefined;
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isBatchUploadOpen, setIsBatchUploadOpen] = useState(false);
  const [batchMode, setBatchMode] = useState<"quick" | "advanced">("quick");
  const [batchFiles, setBatchFiles] = useState<BatchFile[]>([]);
  const [sharedConfig, setSharedConfig] = useState({
    documentType: "" as PreAuthDocumentType | "",
    policyPlanId: "",
    memberId: "",
    description: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [expandedPreviews, setExpandedPreviews] = useState<Record<string, string | null>>({});
  const [loadingPreviews, setLoadingPreviews] = useState<Record<string, boolean>>({});

  const togglePreview = async (docId: string) => {
    if (expandedPreviews[docId] !== undefined) {
      setExpandedPreviews(prev => {
        const next = { ...prev };
        delete next[docId];
        return next;
      });
      return;
    }

    setLoadingPreviews(prev => ({ ...prev, [docId]: true }));
    try {
      const response = await fetch(`/api/pre-auth/documents/${docId}/chunks`);
      const chunks = await response.json();
      const preview = chunks.length > 0 ? chunks[0].content.slice(0, 300) : "No content available";
      setExpandedPreviews(prev => ({ ...prev, [docId]: preview }));
    } catch {
      setExpandedPreviews(prev => ({ ...prev, [docId]: "Failed to load preview" }));
    } finally {
      setLoadingPreviews(prev => ({ ...prev, [docId]: false }));
    }
  };
  
  const getDocTypeFromRoute = (type: string | undefined): PreAuthDocumentType => {
    if (type === "regulatory") return "regulatory";
    if (type === "policy") return "policy";
    if (type === "medical") return "medical_guidelines";
    if (type === "history") return "patient_history";
    if (type === "declarations") return "declaration";
    return "regulatory";
  };

  const [formData, setFormData] = useState<UploadFormData>({
    name: "",
    description: "",
    documentType: getDocTypeFromRoute(docType),
    targetPhase: null,
    policyPlanId: "",
    memberId: "",
    file: null,
    sourceUrl: "",
    pastedContent: "",
  });

  const getApiTypeParam = (type: string | undefined): string => {
    if (type === "regulatory") return "regulatory";
    if (type === "policy") return "policy";
    if (type === "medical") return "medical_guidelines";
    if (type === "history") return "patient_history";
    if (type === "declarations") return "declaration";
    return "";
  };

  const apiPath = docType 
    ? `/api/pre-auth/documents?type=${getApiTypeParam(docType)}`
    : "/api/pre-auth/documents";

  const { data: documents, isLoading } = useQuery<PreAuthDocument[]>({
    queryKey: ["/api/pre-auth/documents", docType],
    queryFn: () => fetch(apiPath).then(res => res.json()),
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: UploadFormData) => {
      let fileContent = null;
      let mimeType = null;
      let fileName = null;
      
      if (data.file) {
        const buffer = await data.file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          const chunk = bytes.subarray(i, i + chunkSize);
          binary += String.fromCharCode.apply(null, Array.from(chunk));
        }
        fileContent = btoa(binary);
        mimeType = data.file.type;
        fileName = data.file.name;
      }
      
      return apiRequest("POST", "/api/pre-auth/documents", {
        name: data.name,
        description: data.description,
        documentType: data.documentType,
        targetPhase: data.targetPhase,
        policyPlanId: data.policyPlanId || null,
        memberId: data.memberId || null,
        fileContent,
        fileName,
        mimeType,
        sourceUrl: data.sourceUrl || null,
        pastedContent: data.pastedContent?.trim() || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pre-auth/documents"] });
      setIsUploadOpen(false);
      setFormData({
        name: "",
        description: "",
        documentType: formData.documentType,
        targetPhase: null,
        policyPlanId: "",
        memberId: "",
        file: null,
        sourceUrl: "",
        pastedContent: "",
      });
      toast({
        title: "Document uploaded",
        description: "The document is being processed. This may take a few moments.",
      });
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Failed to upload the document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const batchUploadMutation = useMutation({
    mutationFn: async (): Promise<{ results: BatchUploadResult[]; successCount: number; failCount: number }> => {
      const filesData = await Promise.all(
        batchFiles.map(async (bf) => {
          const buffer = await bf.file.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, Array.from(chunk));
          }
          
          return {
            fileName: bf.file.name,
            name: bf.name,
            fileContent: btoa(binary),
            mimeType: bf.file.type,
            documentType: batchMode === "quick" ? undefined : bf.documentType,
            policyPlanId: batchMode === "quick" ? undefined : bf.policyPlanId,
            memberId: batchMode === "quick" ? undefined : bf.memberId,
            description: batchMode === "quick" ? undefined : bf.description,
          };
        })
      );
      
      const response = await apiRequest("POST", "/api/pre-auth/documents/batch", {
        mode: batchMode,
        sharedConfig: batchMode === "quick" ? sharedConfig : undefined,
        files: filesData,
      });
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pre-auth/documents"] });
      
      if (data.failCount === 0) {
        toast({
          title: "Batch upload complete",
          description: `Successfully uploaded ${data.successCount} document(s).`,
        });
        setIsBatchUploadOpen(false);
        setBatchFiles([]);
        setSharedConfig({ documentType: "", policyPlanId: "", memberId: "", description: "" });
      } else {
        toast({
          title: "Batch upload partially complete",
          description: `${data.successCount} succeeded, ${data.failCount} failed.`,
          variant: "destructive",
        });
        
        setBatchFiles(prev => prev.map(bf => {
          const result = data.results.find(r => r.fileName === bf.file.name);
          if (result) {
            return {
              ...bf,
              status: result.success ? "success" : "error",
              error: result.error,
            };
          }
          return bf;
        }));
      }
    },
    onError: () => {
      toast({
        title: "Batch upload failed",
        description: "Failed to process the batch upload. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/pre-auth/documents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pre-auth/documents"] });
      toast({
        title: "Document deleted",
        description: "The document has been removed from the knowledge base.",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({ 
        ...prev, 
        file,
        name: prev.name || file.name.replace(/\.[^/.]+$/, ""),
      }));
    }
  };

  const handleBatchFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const defaultType = (sharedConfig.documentType as PreAuthDocumentType) || "regulatory";
    const newBatchFiles: BatchFile[] = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      name: file.name.replace(/\.[^/.]+$/, ""),
      documentType: defaultType,
      policyPlanId: sharedConfig.policyPlanId || "",
      memberId: sharedConfig.memberId || "",
      description: sharedConfig.description || "",
      status: "pending",
    }));
    
    setBatchFiles(prev => [...prev, ...newBatchFiles]);
  };

  const handleSharedConfigChange = (key: string, value: string) => {
    setSharedConfig(prev => ({ ...prev, [key]: value }));
    
    if (batchMode === "quick" && batchFiles.length > 0) {
      if (key === "documentType") {
        setBatchFiles(prev => prev.map(bf => ({ ...bf, documentType: value as PreAuthDocumentType, status: "pending" })));
      } else if (key === "policyPlanId") {
        setBatchFiles(prev => prev.map(bf => ({ ...bf, policyPlanId: value, status: "pending" })));
      } else if (key === "memberId") {
        setBatchFiles(prev => prev.map(bf => ({ ...bf, memberId: value, status: "pending" })));
      } else if (key === "description") {
        setBatchFiles(prev => prev.map(bf => ({ ...bf, description: value, status: "pending" })));
      }
    }
  };

  const removeBatchFile = (id: string) => {
    setBatchFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateBatchFile = (id: string, updates: Partial<BatchFile>) => {
    setBatchFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleUpload = () => {
    if (!formData.name || !formData.documentType) {
      toast({
        title: "Missing information",
        description: "Please provide a name and select a document type.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.file && !formData.sourceUrl && !formData.pastedContent.trim()) {
      toast({
        title: "No content provided",
        description: "Please upload a file, provide a URL, or paste content.",
        variant: "destructive",
      });
      return;
    }
    
    uploadMutation.mutate(formData);
  };

  const handleBatchUpload = () => {
    if (batchFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to upload.",
        variant: "destructive",
      });
      return;
    }
    
    if (batchMode === "quick") {
      if (!sharedConfig.documentType) {
        toast({
          title: "Document type required",
          description: "Please select a document type for the batch.",
          variant: "destructive",
        });
        return;
      }
      
      const typeConfig = documentTypeConfig[sharedConfig.documentType];
      if (typeConfig.requiresId === "policyPlanId" && !sharedConfig.policyPlanId) {
        toast({
          title: "Policy Plan ID required",
          description: "Policy documents require a Policy Plan ID.",
          variant: "destructive",
        });
        return;
      }
      
      if (typeConfig.requiresId === "memberId" && !sharedConfig.memberId) {
        toast({
          title: "Member ID required",
          description: "Patient history and declaration documents require a Member ID.",
          variant: "destructive",
        });
        return;
      }
    }
    
    batchUploadMutation.mutate();
  };

  const filteredDocuments = documents?.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Ready</Badge>;
      case "processing":
        return <Badge variant="secondary"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processing</Badge>;
      case "failed":
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const currentTypeConfig = docType 
    ? documentTypeConfig[getDocTypeFromRoute(docType)]
    : null;

  const pageTitle = currentTypeConfig?.label || "All Documents";
  const pageDescription = currentTypeConfig?.description || "Manage your knowledge base documents for claims processing";
  const PageIcon = currentTypeConfig?.icon || Library;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <PageIcon className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">{pageTitle}</h1>
            <p className="text-muted-foreground text-sm">{pageDescription}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isBatchUploadOpen} onOpenChange={setIsBatchUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-batch-upload">
                <Files className="w-4 h-4 mr-2" />
                Batch Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Batch Upload Documents</DialogTitle>
                <DialogDescription>
                  Upload multiple documents at once with shared or individual metadata.
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-hidden flex flex-col space-y-4">
                <div className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Upload Mode:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${batchMode === "quick" ? "font-medium" : "text-muted-foreground"}`}>Quick</span>
                    <Switch 
                      checked={batchMode === "advanced"}
                      onCheckedChange={(checked) => setBatchMode(checked ? "advanced" : "quick")}
                      data-testid="switch-batch-mode"
                    />
                    <span className={`text-sm ${batchMode === "advanced" ? "font-medium" : "text-muted-foreground"}`}>Advanced</span>
                  </div>
                </div>
                
                {batchMode === "quick" && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Shared Settings</CardTitle>
                      <CardDescription>These settings apply to all uploaded files</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Document Type</Label>
                          <Select 
                            value={sharedConfig.documentType} 
                            onValueChange={(value: PreAuthDocumentType) => handleSharedConfigChange("documentType", value)}
                          >
                            <SelectTrigger data-testid="select-batch-document-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(documentTypeConfig).map(([key, config]) => (
                                <SelectItem key={key} value={key}>
                                  <div className="flex items-center gap-2">
                                    <config.icon className="w-4 h-4" />
                                    {config.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {sharedConfig.documentType && documentTypeConfig[sharedConfig.documentType]?.requiresId === "policyPlanId" && (
                          <div className="space-y-2">
                            <Label>Policy Plan ID (Required)</Label>
                            <Input 
                              value={sharedConfig.policyPlanId}
                              onChange={(e) => handleSharedConfigChange("policyPlanId", e.target.value)}
                              placeholder="e.g., POL-KSA-GOV-BASIC-2024"
                              data-testid="input-batch-policy-id"
                            />
                          </div>
                        )}
                        
                        {sharedConfig.documentType && documentTypeConfig[sharedConfig.documentType]?.requiresId === "memberId" && (
                          <div className="space-y-2">
                            <Label>Member ID (Required)</Label>
                            <Input 
                              value={sharedConfig.memberId}
                              onChange={(e) => handleSharedConfigChange("memberId", e.target.value)}
                              placeholder="e.g., MEM-12345"
                              data-testid="input-batch-member-id"
                            />
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Description (Optional)</Label>
                        <Textarea 
                          value={sharedConfig.description}
                          onChange={(e) => handleSharedConfigChange("description", e.target.value)}
                          placeholder="Shared description for all documents"
                          data-testid="input-batch-description"
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Files ({batchFiles.length})</Label>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => batchFileInputRef.current?.click()}
                      data-testid="button-add-batch-files"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Files
                    </Button>
                    <input
                      ref={batchFileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.csv,.txt,.xlsx,.xls"
                      onChange={handleBatchFilesChange}
                      className="hidden"
                    />
                  </div>
                  
                  {batchFiles.length > 0 ? (
                    <ScrollArea className="h-[300px] border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>File</TableHead>
                            <TableHead>Name</TableHead>
                            {batchMode === "advanced" && (
                              <>
                                <TableHead>Type</TableHead>
                                <TableHead>Linking ID</TableHead>
                              </>
                            )}
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {batchFiles.map((bf) => (
                            <TableRow key={bf.id}>
                              <TableCell className="font-mono text-xs max-w-[150px] truncate">
                                {bf.file.name}
                              </TableCell>
                              <TableCell>
                                {batchMode === "advanced" ? (
                                  <Input 
                                    value={bf.name}
                                    onChange={(e) => updateBatchFile(bf.id, { name: e.target.value })}
                                    className="h-8"
                                    data-testid={`input-file-name-${bf.id}`}
                                  />
                                ) : (
                                  <span className="text-sm">{bf.name}</span>
                                )}
                              </TableCell>
                              {batchMode === "advanced" && (
                                <>
                                  <TableCell>
                                    <Select 
                                      value={bf.documentType} 
                                      onValueChange={(value: PreAuthDocumentType) => updateBatchFile(bf.id, { documentType: value })}
                                    >
                                      <SelectTrigger className="h-8 w-[140px]" data-testid={`select-file-type-${bf.id}`}>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {Object.entries(documentTypeConfig).map(([key, config]) => (
                                          <SelectItem key={key} value={key}>
                                            {config.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    {documentTypeConfig[bf.documentType]?.requiresId === "policyPlanId" && (
                                      <Input 
                                        value={bf.policyPlanId}
                                        onChange={(e) => updateBatchFile(bf.id, { policyPlanId: e.target.value })}
                                        placeholder="Policy ID"
                                        className="h-8 w-[150px]"
                                        data-testid={`input-file-policy-${bf.id}`}
                                      />
                                    )}
                                    {documentTypeConfig[bf.documentType]?.requiresId === "memberId" && (
                                      <Input 
                                        value={bf.memberId}
                                        onChange={(e) => updateBatchFile(bf.id, { memberId: e.target.value })}
                                        placeholder="Member ID"
                                        className="h-8 w-[150px]"
                                        data-testid={`input-file-member-${bf.id}`}
                                      />
                                    )}
                                    {!documentTypeConfig[bf.documentType]?.requiresId && (
                                      <span className="text-muted-foreground text-sm">N/A</span>
                                    )}
                                  </TableCell>
                                </>
                              )}
                              <TableCell>
                                {bf.status === "pending" && <Badge variant="outline">Pending</Badge>}
                                {bf.status === "uploading" && <Badge variant="secondary"><Loader2 className="w-3 h-3 animate-spin mr-1" />Uploading</Badge>}
                                {bf.status === "success" && <Badge variant="default" className="bg-green-500">Success</Badge>}
                                {bf.status === "error" && (
                                  <Badge variant="destructive" title={bf.error}>Error</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => removeBatchFile(bf.id)}
                                  data-testid={`button-remove-file-${bf.id}`}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  ) : (
                    <div className="border rounded-md p-8 text-center text-muted-foreground">
                      <Files className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No files selected. Click "Add Files" to get started.</p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => {
                  setIsBatchUploadOpen(false);
                  setBatchFiles([]);
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleBatchUpload} 
                  disabled={batchUploadMutation.isPending || batchFiles.length === 0}
                  data-testid="button-submit-batch"
                >
                  {batchUploadMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload {batchFiles.length} File{batchFiles.length !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-upload-document">
                <Plus className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
                <DialogDescription>
                  Add a new document to the knowledge base for claims processing.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="docType">Document Type</Label>
                  <Select 
                    value={formData.documentType} 
                    onValueChange={(value: PreAuthDocumentType) => setFormData(prev => ({ ...prev, documentType: value }))}
                  >
                    <SelectTrigger data-testid="select-document-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(documentTypeConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <config.icon className="w-4 h-4" />
                            {config.label} (Phase {config.phase})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Document Name</Label>
                  <Input 
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., CHI Essential Benefit Package 2022"
                    data-testid="input-document-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea 
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the document contents"
                    data-testid="input-document-description"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Upload File</Label>
                  <div className="flex gap-2">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.csv,.txt,.xlsx,.xls"
                      onChange={handleFileChange}
                      className="flex-1"
                      data-testid="input-file-upload"
                    />
                  </div>
                  {formData.file && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {formData.file.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sourceUrl">Or provide URL (Optional)</Label>
                  <Input 
                    id="sourceUrl"
                    type="url"
                    value={formData.sourceUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, sourceUrl: e.target.value }))}
                    placeholder="https://..."
                    disabled={!!formData.pastedContent.trim()}
                    data-testid="input-source-url"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pastedContent">Or paste content (for protected sites)</Label>
                  <Textarea 
                    id="pastedContent"
                    value={formData.pastedContent}
                    onChange={(e) => setFormData(prev => ({ ...prev, pastedContent: e.target.value }))}
                    placeholder="Copy text from the webpage and paste it here..."
                    className="min-h-[120px] font-mono text-sm"
                    disabled={!!formData.sourceUrl.trim()}
                    data-testid="input-pasted-content"
                  />
                </div>

                {formData.documentType === "policy" && (
                  <div className="space-y-2">
                    <Label htmlFor="policyPlanId">Policy Plan ID (Required)</Label>
                    <Input 
                      id="policyPlanId"
                      value={formData.policyPlanId}
                      onChange={(e) => setFormData(prev => ({ ...prev, policyPlanId: e.target.value }))}
                      placeholder="e.g., POL-KSA-GOV-BASIC-2024"
                      data-testid="input-policy-plan-id"
                    />
                  </div>
                )}
                
                {(formData.documentType === "patient_history" || formData.documentType === "declaration") && (
                  <div className="space-y-2">
                    <Label htmlFor="memberId">Member ID (Required)</Label>
                    <Input 
                      id="memberId"
                      value={formData.memberId}
                      onChange={(e) => setFormData(prev => ({ ...prev, memberId: e.target.value }))}
                      placeholder="e.g., MEM-12345"
                      data-testid="input-member-id"
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpload} 
                  disabled={uploadMutation.isPending}
                  data-testid="button-submit-upload"
                >
                  {uploadMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search documents..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-documents"
          />
        </div>
        <Badge variant="outline" className="text-sm">
          {filteredDocuments?.length || 0} documents
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredDocuments && filteredDocuments.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => {
            const typeConfig = documentTypeConfig[doc.documentType as PreAuthDocumentType];
            const TypeIcon = typeConfig?.icon || FileText;
            
            return (
              <Card key={doc.id} className="hover-elevate" data-testid={`card-document-${doc.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <TypeIcon className="w-5 h-5 text-primary" />
                      <CardTitle className="text-base line-clamp-1">{doc.name}</CardTitle>
                    </div>
                    {getStatusBadge(doc.status || "pending")}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {doc.description || typeConfig?.label || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Type:</span>
                      <Badge variant="outline" className="text-xs">
                        Phase {typeConfig?.phase || "?"}
                      </Badge>
                    </div>
                    {doc.totalChunks && doc.totalChunks > 0 && (
                      <div className="flex items-center justify-between">
                        <span>Chunks:</span>
                        <span>{doc.totalChunks}</span>
                      </div>
                    )}
                    {doc.policyPlanId && (
                      <div className="flex items-center justify-between">
                        <span>Policy:</span>
                        <span className="font-mono text-xs">{doc.policyPlanId}</span>
                      </div>
                    )}
                    {doc.memberId && (
                      <div className="flex items-center justify-between">
                        <span>Member:</span>
                        <span className="font-mono text-xs">{doc.memberId}</span>
                      </div>
                    )}
                    {doc.sourceUrl && (
                      <div className="flex items-center justify-between">
                        <span>Source:</span>
                        <a 
                          href={doc.sourceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          URL <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                  {expandedPreviews[doc.id] !== undefined && (
                    <div className="mt-3 p-2 bg-muted rounded-md">
                      <p className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">
                        {expandedPreviews[doc.id]}...
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => togglePreview(doc.id)}
                      disabled={loadingPreviews[doc.id]}
                      data-testid={`button-preview-${doc.id}`}
                    >
                      {loadingPreviews[doc.id] ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : expandedPreviews[doc.id] !== undefined ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => deleteMutation.mutate(doc.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${doc.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Library className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2" data-testid="text-empty-state">No documents yet</h3>
            <p className="text-muted-foreground mb-4">
              Upload documents to build your knowledge base for claims processing.
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => setIsBatchUploadOpen(true)} data-testid="button-batch-upload-empty">
                <Files className="w-4 h-4 mr-2" />
                Batch Upload
              </Button>
              <Button onClick={() => setIsUploadOpen(true)} data-testid="button-upload-empty">
                <Plus className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
