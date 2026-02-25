import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileText,
  Image,
  File,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const documentCategories = [
  { value: "medical_guideline", label: "Medical Guideline", labelAr: "دليل طبي" },
  { value: "clinical_pathway", label: "Clinical Pathway", labelAr: "مسار سريري" },
  { value: "policy_violation", label: "Policy Violation", labelAr: "مخالفة سياسة" },
  { value: "regulation", label: "Regulation", labelAr: "لائحة" },
  { value: "circular", label: "Circular", labelAr: "تعميم" },
  { value: "contract", label: "Contract", labelAr: "عقد" },
  { value: "procedure_manual", label: "Procedure Manual", labelAr: "دليل إجراءات" },
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
  "image/jpeg": { icon: Image, label: "JPEG", color: "text-green-500" },
  "image/png": { icon: Image, label: "PNG", color: "text-green-500" },
  "image/webp": { icon: Image, label: "WEBP", color: "text-green-500" },
  "text/plain": { icon: File, label: "TXT", color: "text-gray-500" },
};

export function DocumentUploadDialog({ open, onOpenChange }: DocumentUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [sourceAuthority, setSourceAuthority] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/knowledge-documents/upload", {
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
        title: "Document Uploaded",
        description: data.data.message || "Document is being processed for AI retrieval.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/knowledge-documents/stats"] });
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
    setFile(null);
    setTitle("");
    setTitleAr("");
    setCategory("");
    setDescription("");
    setSourceAuthority("");
    setUploadProgress(0);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && Object.keys(acceptedFileTypes).includes(droppedFile.type)) {
      setFile(droppedFile);
      if (!title) {
        setTitle(droppedFile.name.replace(/\.[^/.]+$/, ""));
      }
    } else {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF, Word document, or image file.",
        variant: "destructive",
      });
    }
  }, [title, toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleSubmit = async () => {
    if (!file || !title || !category) {
      toast({
        title: "Missing Required Fields",
        description: "Please provide a file, title, and category.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("category", category);
    if (titleAr) formData.append("titleAr", titleAr);
    if (description) formData.append("description", description);
    if (sourceAuthority) formData.append("sourceAuthority", sourceAuthority);

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
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            } ${file ? "bg-muted/50" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            data-testid="drop-zone"
          >
            {file ? (
              <div className="flex items-center justify-between p-3 bg-background rounded-md border">
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
                  onClick={() => setFile(null)}
                  data-testid="button-remove-file"
                >
                  <X className="w-4 h-4" />
                </Button>
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
                  <Badge variant="outline">Images</Badge>
                  <Badge variant="outline">Text</Badge>
                </div>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.txt"
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
                <Label htmlFor="title">Title (English) *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Document title"
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
                data-testid="input-description"
              />
            </div>
          </div>

          {uploadMutation.isPending && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Processing document...</span>
              </div>
              <Progress value={uploadProgress} />
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
              disabled={!file || !title || !category || uploadMutation.isPending}
              data-testid="button-upload-submit"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
