import { useState, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
    Files,
    X,
    Loader2,
    Settings2,
    Plus,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface KnowledgeBatchUploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUploadQueued?: (jobId: string) => void;
}

const documentCategories = [
    { value: "law_regulation", label: "Law & Regulation" },
    { value: "resolution_circular", label: "Resolution & Circular" },
    { value: "chi_mandatory_policy", label: "CHI Mandatory Policy" },
    { value: "clinical_manual", label: "Clinical Manual" },
    { value: "drug_formulary", label: "Drug Formulary" },
    { value: "training_material", label: "Training Material" },
    { value: "other", label: "Other" },
];

const sourceAuthorities = [
    { value: "CHI", label: "Council of Health Insurance (CHI)" },
    { value: "MOH", label: "Ministry of Health (MOH)" },
    { value: "SCFHS", label: "Saudi Commission for Health Specialties (SCFHS)" },
    { value: "NPHIES", label: "National Platform for Health and Insurance Exchange" },
    { value: "INTERNAL", label: "Internal Policy" },
    { value: "OTHER", label: "Other" },
];

interface BatchFile {
    id: string;
    file: File;
    name: string;
    nameAr: string;
    category: string;
    sourceAuthority: string;
    description: string;
    status: "pending" | "uploading" | "success" | "error";
    error?: string;
}

export function KnowledgeBatchUploadDialog({
    open,
    onOpenChange,
    onUploadQueued,
}: KnowledgeBatchUploadDialogProps) {
    const [batchMode, setBatchMode] = useState<"quick" | "advanced">("quick");
    const [batchFiles, setBatchFiles] = useState<BatchFile[]>([]);
    const [sharedConfig, setSharedConfig] = useState({
        category: "",
        sourceAuthority: "",
        description: "",
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const resetForm = useCallback(() => {
        setBatchFiles([]);
        setSharedConfig({
            category: "",
            sourceAuthority: "",
            description: "",
        });
        setBatchMode("quick");
    }, []);

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            resetForm();
        }
        onOpenChange(newOpen);
    };

    const uploadBatchMutation = useMutation({
        mutationFn: async () => {
            const formData = new FormData();

            batchFiles.forEach((bf) => {
                formData.append("files", bf.file);
            });

            // Instead of appending category directly, use metadata for everything since it can be advanced
            // Quick mode just sets the same metadata on all
            const metadata = batchFiles.map((bf, index) => ({
                title: bf.name,
                titleAr: bf.nameAr || undefined,
                description: batchMode === "quick" ? sharedConfig.description : bf.description || undefined,
                category: batchMode === "quick" ? sharedConfig.category : bf.category,
                sourceAuthority: batchMode === "quick" ? sharedConfig.sourceAuthority : bf.sourceAuthority || undefined,
                index,
            }));

            formData.append("metadata", JSON.stringify(metadata));

            // Also provide fallback single category to satisfy backend if required
            if (batchMode === "quick" && sharedConfig.category) {
                formData.append("category", sharedConfig.category);
                if (sharedConfig.sourceAuthority) {
                    formData.append("sourceAuthority", sharedConfig.sourceAuthority);
                }
            } else if (batchMode === "advanced" && batchFiles.length > 0) {
                // Fallback just use the first one if the API forces a single top-level category field (it does currently in some places)
                // We will update the API to handle the array better.
                formData.append("category", batchFiles[0].category);
            }

            const response = await fetch("/api/knowledge-documents/upload-batch", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Batch upload failed");
            }

            return response.json();
        },
        onSuccess: (data) => {
            toast({
                title: "Batch Queued",
                description: `Queued ${batchFiles.length} document(s) for background processing.`,
            });
            queryClient.invalidateQueries({ queryKey: ["/api/knowledge-documents"] });
            queryClient.invalidateQueries({ queryKey: ["/api/knowledge-documents/stats"] });
            if (data?.data?.jobId && onUploadQueued) {
                onUploadQueued(data.data.jobId);
            }
            handleOpenChange(false);
        },
        onError: (error: Error) => {
            toast({
                title: "Batch Upload Failed",
                description: error.message,
                variant: "destructive",
            });
        },
    });

    const handleBatchFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const newBatchFiles: BatchFile[] = files.map((file, index) => ({
            id: `${Date.now()}-${index}`,
            file,
            name: file.name.replace(/\.[^/.]+$/, ""),
            nameAr: "",
            category: sharedConfig.category,
            sourceAuthority: sharedConfig.sourceAuthority,
            description: sharedConfig.description,
            status: "pending",
        }));

        setBatchFiles((prev) => [...prev, ...newBatchFiles]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleSharedConfigChange = (key: string, value: string) => {
        setSharedConfig((prev) => ({ ...prev, [key]: value }));

        if (batchMode === "quick" && batchFiles.length > 0) {
            setBatchFiles((prev) =>
                prev.map((bf) => ({ ...bf, [key]: value, status: "pending" }))
            );
        }
    };

    const updateBatchFile = (id: string, updates: Partial<BatchFile>) => {
        setBatchFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
        );
    };

    const removeBatchFile = (id: string) => {
        setBatchFiles((prev) => prev.filter((f) => f.id !== id));
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

        if (batchMode === "quick" && !sharedConfig.category) {
            toast({
                title: "Category required",
                description: "Please select a category for the batch.",
                variant: "destructive",
            });
            return;
        }

        if (batchMode === "advanced") {
            const missingCategory = batchFiles.some((f) => !f.category);
            if (missingCategory) {
                toast({
                    title: "Missing categories",
                    description: "Please ensure all files have a category assigned.",
                    variant: "destructive",
                });
                return;
            }
        }

        uploadBatchMutation.mutate();
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-[1000px] max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>Advanced Batch Upload</DialogTitle>
                    <DialogDescription>
                        Upload multiple documents at once with shared or individual metadata configurations.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col space-y-4">
                    <div className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-md shrink-0">
                        <div className="flex items-center gap-2">
                            <Settings2 className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Upload Mode:</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span
                                className={`text-sm ${batchMode === "quick" ? "font-medium" : "text-muted-foreground"
                                    }`}
                            >
                                Quick Setup
                            </span>
                            <Switch
                                checked={batchMode === "advanced"}
                                onCheckedChange={(checked) =>
                                    setBatchMode(checked ? "advanced" : "quick")
                                }
                            />
                            <span
                                className={`text-sm ${batchMode === "advanced" ? "font-medium" : "text-muted-foreground"
                                    }`}
                            >
                                Individual Meta
                            </span>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 -mx-2 px-2">
                        <div className="space-y-4 pb-4">
                            {batchMode === "quick" && (
                                <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
                                    <div className="col-span-2">
                                        <h3 className="text-sm font-medium mb-1">Shared Settings</h3>
                                        <p className="text-xs text-muted-foreground mb-4">
                                            These settings apply to all uploaded files
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Category *</Label>
                                        <Select
                                            value={sharedConfig.category}
                                            onValueChange={(value) =>
                                                handleSharedConfigChange("category", value)
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select shared category" />
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
                                        <Label>Source Authority</Label>
                                        <Select
                                            value={sharedConfig.sourceAuthority}
                                            onValueChange={(value) =>
                                                handleSharedConfigChange("sourceAuthority", value)
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select shared authority" />
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

                                    <div className="space-y-2 col-span-2">
                                        <Label>Description</Label>
                                        <Textarea
                                            value={sharedConfig.description}
                                            onChange={(e) =>
                                                handleSharedConfigChange("description", e.target.value)
                                            }
                                            placeholder="Shared description for all documents..."
                                            className="h-20"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <div className="flex items-center justify-between mb-2">
                                    <Label className="text-base">Files ({batchFiles.length})</Label>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Plus className="w-4 h-4 mr-1" />
                                        Add Files
                                    </Button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp,.txt"
                                        onChange={handleBatchFilesChange}
                                        className="hidden"
                                    />
                                </div>

                                {batchFiles.length > 0 ? (
                                    <div className="border rounded-md overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead className="w-[200px]">File & Name</TableHead>
                                                    {batchMode === "advanced" && (
                                                        <>
                                                            <TableHead className="w-[180px]">Category *</TableHead>
                                                            <TableHead className="w-[180px]">Source Authority</TableHead>
                                                        </>
                                                    )}
                                                    <TableHead className="w-[80px]">Status</TableHead>
                                                    <TableHead className="w-[50px] text-right"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {batchFiles.map((bf) => (
                                                    <TableRow key={bf.id}>
                                                        <TableCell>
                                                            <div className="space-y-2">
                                                                <span
                                                                    className="text-xs text-muted-foreground truncate block max-w-[200px]"
                                                                    title={bf.file.name}
                                                                >
                                                                    {bf.file.name}
                                                                </span>
                                                                {batchMode === "advanced" ? (
                                                                    <>
                                                                        <Input
                                                                            placeholder="Title (En)"
                                                                            value={bf.name}
                                                                            onChange={(e) =>
                                                                                updateBatchFile(bf.id, { name: e.target.value })
                                                                            }
                                                                            className="h-8"
                                                                        />
                                                                        <Input
                                                                            placeholder="Title (Ar)"
                                                                            value={bf.nameAr}
                                                                            onChange={(e) =>
                                                                                updateBatchFile(bf.id, { nameAr: e.target.value })
                                                                            }
                                                                            className="h-8"
                                                                            dir="rtl"
                                                                        />
                                                                    </>
                                                                ) : (
                                                                    <div className="font-medium text-sm truncate max-w-[200px]">
                                                                        {bf.name}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </TableCell>

                                                        {batchMode === "advanced" && (
                                                            <>
                                                                <TableCell>
                                                                    <Select
                                                                        value={bf.category}
                                                                        onValueChange={(value) =>
                                                                            updateBatchFile(bf.id, { category: value })
                                                                        }
                                                                    >
                                                                        <SelectTrigger className="h-8">
                                                                            <SelectValue placeholder="Category" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {documentCategories.map((cat) => (
                                                                                <SelectItem key={cat.value} value={cat.value}>
                                                                                    {cat.label}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Select
                                                                        value={bf.sourceAuthority}
                                                                        onValueChange={(value) =>
                                                                            updateBatchFile(bf.id, { sourceAuthority: value })
                                                                        }
                                                                    >
                                                                        <SelectTrigger className="h-8">
                                                                            <SelectValue placeholder="Authority" />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {sourceAuthorities.map((src) => (
                                                                                <SelectItem key={src.value} value={src.value}>
                                                                                    {src.label}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </TableCell>
                                                            </>
                                                        )}

                                                        <TableCell>
                                                            {bf.status === "pending" && <Badge variant="outline">Ready</Badge>}
                                                            {bf.status === "uploading" && (
                                                                <Badge variant="secondary">
                                                                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                                                    Uploading
                                                                </Badge>
                                                            )}
                                                            {bf.status === "success" && (
                                                                <Badge variant="default" className="bg-green-500">
                                                                    Success
                                                                </Badge>
                                                            )}
                                                            {bf.status === "error" && (
                                                                <Badge variant="destructive" title={bf.error}>
                                                                    Error
                                                                </Badge>
                                                            )}
                                                        </TableCell>

                                                        <TableCell className="text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => removeBatchFile(bf.id)}
                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="border-2 border-dashed rounded-md p-12 text-center text-muted-foreground bg-muted/20">
                                        <Files className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p className="font-medium">No files selected</p>
                                        <p className="text-sm mt-1">Click "Add Files" above to get started.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </ScrollArea>
                </div>

                <DialogFooter className="mt-4 pt-4 border-t shrink-0">
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleBatchUpload}
                        disabled={uploadBatchMutation.isPending || batchFiles.length === 0}
                    >
                        {uploadBatchMutation.isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Processing...
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
    );
}
