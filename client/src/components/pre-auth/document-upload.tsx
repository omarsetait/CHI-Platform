import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Upload, 
  FileText, 
  Image, 
  X, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  File
} from "lucide-react";
import { cn } from "@/lib/utils";

type PreAuthDocumentType = "regulatory" | "policy" | "medical_guidelines" | "patient_history" | "declaration";
type UploadStatus = "pending" | "uploading" | "processing" | "success" | "error";

interface UploadedFile {
  id: string;
  file: File;
  documentType: PreAuthDocumentType;
  status: UploadStatus;
  progress: number;
  error?: string;
}

interface PreAuthDocumentUploadProps {
  onUpload?: (files: Array<{ file: File; documentType: PreAuthDocumentType }>) => Promise<void>;
  onFilesChange?: (files: UploadedFile[]) => void;
  acceptedTypes?: string[];
  maxFileSizeMB?: number;
  className?: string;
}

const documentTypeLabels: Record<PreAuthDocumentType, { label: string; description: string }> = {
  regulatory: { label: "Regulatory", description: "Regulatory compliance documents" },
  policy: { label: "Policy", description: "Insurance policy documents" },
  medical_guidelines: { label: "Medical Guidelines", description: "Clinical guidelines and protocols" },
  patient_history: { label: "Patient History", description: "Medical history and records" },
  declaration: { label: "Declaration", description: "Declarations and attestations" },
};

export function PreAuthDocumentUpload({
  onUpload,
  onFilesChange,
  acceptedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  maxFileSizeMB = 20,
  className,
}: PreAuthDocumentUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedType, setSelectedType] = useState<PreAuthDocumentType>("patient_history");
  const [isUploading, setIsUploading] = useState(false);

  const updateFiles = useCallback((newFiles: UploadedFile[]) => {
    setFiles(newFiles);
    onFilesChange?.(newFiles);
  }, [onFilesChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, [selectedType]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
    e.target.value = "";
  };

  const processFiles = (newFiles: File[]) => {
    const validFiles: UploadedFile[] = [];

    for (const file of newFiles) {
      if (!acceptedTypes.includes(file.type)) {
        continue;
      }

      if (file.size > maxFileSizeMB * 1024 * 1024) {
        continue;
      }

      validFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        documentType: selectedType,
        status: "pending",
        progress: 0,
      });
    }

    updateFiles([...files, ...validFiles]);
  };

  const removeFile = (id: string) => {
    updateFiles(files.filter(f => f.id !== id));
  };

  const updateFileType = (id: string, type: PreAuthDocumentType) => {
    updateFiles(files.map(f => f.id === id ? { ...f, documentType: type } : f));
  };

  const handleUpload = async () => {
    if (!onUpload || files.length === 0) return;

    setIsUploading(true);
    
    try {
      updateFiles(files.map(f => ({ ...f, status: "uploading" as UploadStatus, progress: 50 })));
      
      await onUpload(files.map(f => ({ file: f.file, documentType: f.documentType })));
      
      updateFiles(files.map(f => ({ ...f, status: "success" as UploadStatus, progress: 100 })));
      
      setTimeout(() => {
        updateFiles([]);
      }, 2000);
    } catch (error) {
      updateFiles(files.map(f => ({ 
        ...f, 
        status: "error" as UploadStatus, 
        error: "Upload failed" 
      })));
    } finally {
      setIsUploading(false);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return Image;
    if (mimeType === "application/pdf") return FileText;
    return File;
  };

  const getStatusIcon = (status: UploadStatus) => {
    switch (status) {
      case "uploading":
      case "processing":
        return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      default:
        return null;
    }
  };

  return (
    <Card className={cn("", className)} data-testid="preauth-document-upload">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Document Upload
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="doc-type">Default Document Type</Label>
          <Select value={selectedType} onValueChange={(v) => setSelectedType(v as PreAuthDocumentType)}>
            <SelectTrigger id="doc-type" data-testid="select-document-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(documentTypeLabels).map(([value, { label, description }]) => (
                <SelectItem key={value} value={value}>
                  <div className="flex flex-col">
                    <span>{label}</span>
                    <span className="text-xs text-muted-foreground">{description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
            isDragging 
              ? "border-primary bg-primary/5" 
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          data-testid="document-dropzone"
        >
          <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium mb-1">
            Drag and drop files here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Supports: PDF, JPEG, PNG, WebP (max {maxFileSizeMB}MB)
          </p>
          <input
            type="file"
            id="file-upload"
            className="hidden"
            multiple
            accept={acceptedTypes.join(",")}
            onChange={handleFileSelect}
            data-testid="input-file-upload"
          />
          <Button variant="outline" size="sm" asChild>
            <label htmlFor="file-upload" className="cursor-pointer">
              Browse Files
            </label>
          </Button>
        </div>

        {files.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Files to Upload ({files.length})</span>
              <Button
                size="sm"
                onClick={handleUpload}
                disabled={isUploading || files.every(f => f.status === "success")}
                data-testid="button-upload-files"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload All
                  </>
                )}
              </Button>
            </div>

            <ScrollArea className="max-h-64">
              <div className="space-y-2">
                {files.map((uploadedFile) => {
                  const FileIcon = getFileIcon(uploadedFile.file.type);
                  return (
                    <div
                      key={uploadedFile.id}
                      className="flex items-center gap-3 p-3 rounded-md bg-muted/50"
                      data-testid={`uploaded-file-${uploadedFile.id}`}
                    >
                      <FileIcon className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{uploadedFile.file.name}</p>
                          {getStatusIcon(uploadedFile.status)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{(uploadedFile.file.size / 1024).toFixed(1)} KB</span>
                          <Select 
                            value={uploadedFile.documentType} 
                            onValueChange={(v) => updateFileType(uploadedFile.id, v as PreAuthDocumentType)}
                            disabled={uploadedFile.status !== "pending"}
                          >
                            <SelectTrigger className="h-6 text-xs w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(documentTypeLabels).map(([value, { label }]) => (
                                <SelectItem key={value} value={value} className="text-xs">
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {(uploadedFile.status === "uploading" || uploadedFile.status === "processing") && (
                          <Progress value={uploadedFile.progress} className="h-1" />
                        )}
                        {uploadedFile.error && (
                          <p className="text-xs text-destructive">{uploadedFile.error}</p>
                        )}
                      </div>

                      {uploadedFile.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFile(uploadedFile.id)}
                          className="flex-shrink-0"
                          data-testid={`button-remove-file-${uploadedFile.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}

                      {uploadedFile.status === "success" && (
                        <Badge variant="outline" className="text-green-600 border-green-300 flex-shrink-0">
                          Uploaded
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
