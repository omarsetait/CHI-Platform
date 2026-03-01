import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileText,
  Image,
  File,
  X,
  Loader2,
} from "lucide-react";

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadQueued?: (jobId: string) => void;
}

const documentCategories = [
  { value: "law_regulation", label: "Law & Regulation", labelAr: "نظام ولائحة" },
  { value: "resolution_circular", label: "Resolution & Circular", labelAr: "قرار وتعميم" },
  { value: "chi_mandatory_policy", label: "CHI Mandatory Policy", labelAr: "سياسة مجلس الضمان الإلزامية" },
  { value: "clinical_manual", label: "Clinical Manual", labelAr: "دليل سريري" },
  { value: "drug_formulary", label: "Drug Formulary", labelAr: "قائمة الأدوية" },
  { value: "training_material", label: "Training Material", labelAr: "مادة تدريبية" },
  { value: "other", label: "Other", labelAr: "أخرى" },
];

const sourceAuthorities = [
  { value: "CHI", label: "Council of Health Insurance (CHI)" },
  { value: "MOH", label: "Ministry of Health (MOH)" },
  { value: "SCFHS", label: "Saudi Commission for Health Specialties (SCFHS)" },
  { value: "NPHIES", label: "National Platform for Health and Insurance Exchange" },
  { value: "INTERNAL", label: "Internal Policy" },
  { value: "OTHER", label: "Other" },
];

const acceptedFileTypes = {
  "application/pdf": { icon: FileText, label: "PDF", color: "text-red-500" },
  "application/msword": { icon: FileText, label: "DOC", color: "text-blue-500" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { icon: FileText, label: "DOCX", color: "text-blue-500" },
  "application/vnd.ms-excel": { icon: FileText, label: "XLS", color: "text-emerald-600" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { icon: FileText, label: "XLSX", color: "text-emerald-600" },
  "text/csv": { icon: FileText, label: "CSV", color: "text-emerald-600" },
  "image/jpeg": { icon: Image, label: "JPEG", color: "text-green-500" },
  "image/png": { icon: Image, label: "PNG", color: "text-green-500" },
  "image/webp": { icon: Image, label: "WEBP", color: "text-green-500" },
  "text/plain": { icon: File, label: "TXT", color: "text-gray-500" },
};

export function DocumentUploadDialog({ open, onOpenChange, onUploadQueued }: DocumentUploadDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [sourceAuthority, setSourceAuthority] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/knowledge-documents/upload-batch", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Batch Queued",
        description: `Queued ${data?.data?.uploaded ?? files.length} document(s) for background processing.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-documents/stats"] });
      if (data?.data?.jobId) {
        onUploadQueued?.(data.data.jobId);
      }
      resetForm();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFiles([]);
    setTitle("");
    setTitleAr("");
    setCategory("");
    setDescription("");
    setSourceAuthority("");
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles = droppedFiles.filter((candidate) => Object.keys(acceptedFileTypes).includes(candidate.type));
    if (validFiles.length === 0) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF, Word, Excel, CSV, text, or image file.",
        variant: "destructive",
      });
      return;
    }
    setFiles((prev) => [...prev, ...validFiles]);
    if (!title && validFiles.length === 1) {
      setTitle(validFiles[0].name.replace(/\.[^/.]+$/, ""));
    }
  }, [title, toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setFiles((prev) => [...prev, ...selectedFiles]);
      if (!title && selectedFiles.length === 1) {
        setTitle(selectedFiles[0].name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleSubmit = async () => {
    if (files.length === 0 || !category) {
      toast({
        title: "Missing Required Fields",
        description: "Please provide at least one file and a category.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    formData.append("category", category);
    if (sourceAuthority) formData.append("sourceAuthority", sourceAuthority);
    const metadata = files.map((file, index) => ({
      title:
        files.length === 1
          ? title || file.name.replace(/\.[^/.]+$/, "")
          : file.name.replace(/\.[^/.]+$/, ""),
      titleAr: files.length === 1 ? titleAr || undefined : undefined,
      description: files.length === 1 ? description || undefined : undefined,
      sourceAuthority: sourceAuthority || undefined,
      category,
      index,
    }));
    formData.append("metadata", JSON.stringify(metadata));

    uploadMutation.mutate(formData);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileInfo = (mimeType: string) => {
    return acceptedFileTypes[mimeType as keyof typeof acceptedFileTypes] || { icon: File, label: "File", color: "text-gray-500" };
  };

  const removeFileAtIndex = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Knowledge Document
          </DialogTitle>
          <DialogDescription>
            Upload PDF, Word, or image files to enable AI-powered semantic search and RAG retrieval.
            Documents will be automatically processed, chunked, and embedded for intelligent analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            } ${files.length > 0 ? "bg-muted/50" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            data-testid="drop-zone"
          >
            {files.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {files.length} file{files.length > 1 ? "s" : ""} selected
                </p>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {files.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center justify-between p-3 bg-background rounded-md border">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const fileInfo = getFileInfo(file.type);
                          const IconComponent = fileInfo.icon;
                          return <IconComponent className={`w-8 h-8 ${fileInfo.color}`} />;
                        })()}
                        <div className="text-left">
                          <p className="font-medium truncate max-w-[300px]" data-testid="text-filename">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {getFileInfo(file.type).label} • {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFileAtIndex(index)}
                        data-testid="button-remove-file"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Drag and drop your file here</p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to browse
                </p>
                <div className="flex justify-center gap-2 mt-4">
                  <Badge variant="outline">PDF</Badge>
                  <Badge variant="outline">Word</Badge>
                  <Badge variant="outline">Excel</Badge>
                  <Badge variant="outline">Images</Badge>
                  <Badge variant="outline">CSV</Badge>
                  <Badge variant="outline">Text</Badge>
                </div>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp,.txt"
                  multiple
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  data-testid="input-file"
                />
              </div>
            )}
          </div>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title (English) {files.length <= 1 ? "*" : "(single-file only)"}</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={files.length <= 1 ? "Document title" : "Auto-filled from each filename"}
                  disabled={files.length > 1}
                  data-testid="input-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="titleAr">Title (Arabic)</Label>
                <Input
                  id="titleAr"
                  value={titleAr}
                  onChange={(e) => setTitleAr(e.target.value)}
                  placeholder="عنوان المستند"
                  className="text-right"
                  dir="rtl"
                  disabled={files.length > 1}
                  data-testid="input-title-ar"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {documentCategories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sourceAuthority">Source Authority</Label>
                <Select value={sourceAuthority} onValueChange={setSourceAuthority}>
                  <SelectTrigger data-testid="select-source">
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceAuthorities.map((src) => (
                      <SelectItem key={src.value} value={src.value}>
                        {src.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the document content..."
                className="min-h-[80px]"
                disabled={files.length > 1}
                data-testid="input-description"
              />
            </div>
          </div>

          {uploadMutation.isPending && (
            <div className="space-y-2 border rounded-md p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Queuing documents for background processing...</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => { resetForm(); onOpenChange(false); }}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={files.length === 0 || !category || uploadMutation.isPending}
              data-testid="button-upload-submit"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Queueing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload {files.length > 1 ? "Documents" : "Document"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
