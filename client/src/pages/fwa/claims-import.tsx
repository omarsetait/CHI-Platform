import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Database,
  AlertTriangle,
  FileUp,
  Download,
  RefreshCw,
} from "lucide-react";

interface ImportResult {
  success: boolean;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errors: string[];
  warnings: string[];
  processingTimeMs: number;
}

interface ImportStats {
  totalClaims: number;
  importedToday: number;
  sources: { source: string; count: number }[];
}

export default function ClaimsImportPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validateOnly, setValidateOnly] = useState(false);
  const [maxRows, setMaxRows] = useState<number | "">("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<ImportStats>({
    queryKey: ["/api/claims/import/stats"],
    refetchInterval: 30000,
  });

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      if (validateOnly) {
        formData.append("validateOnly", "true");
      }
      if (maxRows && Number(maxRows) > 0) {
        formData.append("maxRows", String(maxRows));
      }

      const response = await fetch("/api/claims/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Import failed");
      }

      return response.json() as Promise<ImportResult>;
    },
    onSuccess: (result) => {
      setImportResult(result);
      queryClient.invalidateQueries({ queryKey: ["/api/claims/import/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/claims"] });
      
      if (result.success) {
        toast({
          title: validateOnly ? "Validation Complete" : "Import Complete",
          description: validateOnly 
            ? `Validated ${result.totalRows} rows with ${result.errors.length} errors`
            : `Successfully imported ${result.importedRows} of ${result.totalRows} claims`,
        });
      } else {
        toast({
          title: "Import Issues",
          description: `${result.errors.length} errors occurred during import`,
          variant: "destructive",
        });
      }
      
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import claims",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = useCallback((file: File) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    
    if (!validTypes.includes(file.type) && !file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast({
        title: "Invalid File Type",
        description: "Please select an Excel file (.xlsx or .xls)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Maximum file size is 50MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setImportResult(null);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleImport = () => {
    if (!selectedFile) return;
    importMutation.mutate(selectedFile);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Claims Data Import</h1>
          <p className="text-muted-foreground">Import healthcare claims from Excel files with validation</p>
        </div>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-claims">
              {statsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (stats?.totalClaims ?? 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Imported Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-imported-today">
              {statsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (stats?.importedToday ?? 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Import Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1" data-testid="text-import-sources">
              {statsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                stats?.sources?.slice(0, 3).map((s, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {s.source}: {s.count}
                  </Badge>
                )) ?? <span className="text-muted-foreground text-sm">No data</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload Claims Excel File
          </CardTitle>
          <CardDescription>
            Supports Saudi healthcare claims format with 84 columns including pre-authorization, policy flags, and geographic data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
              ${selectedFile ? "bg-muted/50" : ""}
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            data-testid="dropzone-file-upload"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                  handleFileSelect(files[0]);
                }
              }}
              data-testid="input-file-upload"
            />
            
            {selectedFile ? (
              <div className="space-y-2">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-primary" />
                <p className="font-medium" data-testid="text-selected-file">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedFile(null);
                    setImportResult(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  data-testid="button-clear-file"
                >
                  Clear Selection
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-lg font-medium">Drop your Excel file here</p>
                <p className="text-sm text-muted-foreground">or</p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-browse-files"
                >
                  <FileUp className="h-4 w-4 mr-2" />
                  Browse Files
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Max file size: 50MB • Formats: .xlsx, .xls
                </p>
              </div>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Validate Only</Label>
                  <p className="text-xs text-muted-foreground">Check data without importing</p>
                </div>
                <Switch
                  checked={validateOnly}
                  onCheckedChange={setValidateOnly}
                  data-testid="switch-validate-only"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxRows">Maximum Rows (optional)</Label>
              <Input
                id="maxRows"
                type="number"
                placeholder="Leave empty for all rows"
                value={maxRows}
                onChange={(e) => setMaxRows(e.target.value ? parseInt(e.target.value) : "")}
                data-testid="input-max-rows"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleImport}
              disabled={!selectedFile || importMutation.isPending}
              className="flex-1"
              data-testid="button-import-claims"
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {validateOnly ? "Validating..." : "Importing..."}
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  {validateOnly ? "Validate File" : "Import Claims"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold" data-testid="text-result-total">{importResult.totalRows}</p>
                <p className="text-sm text-muted-foreground">Total Rows</p>
              </div>
              <div className="text-center p-4 bg-green-500/10 rounded-lg">
                <p className="text-2xl font-bold text-green-600" data-testid="text-result-imported">{importResult.importedRows}</p>
                <p className="text-sm text-muted-foreground">Imported</p>
              </div>
              <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600" data-testid="text-result-skipped">{importResult.skippedRows}</p>
                <p className="text-sm text-muted-foreground">Skipped</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold" data-testid="text-result-time">{(importResult.processingTimeMs / 1000).toFixed(2)}s</p>
                <p className="text-sm text-muted-foreground">Processing Time</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Errors ({importResult.errors.length})</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 max-h-40 overflow-y-auto">
                    {importResult.errors.slice(0, 10).map((error, i) => (
                      <li key={i} className="text-sm">{error}</li>
                    ))}
                    {importResult.errors.length > 10 && (
                      <li className="text-sm">...and {importResult.errors.length - 10} more errors</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {importResult.warnings.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Warnings ({importResult.warnings.length})</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 max-h-40 overflow-y-auto">
                    {importResult.warnings.slice(0, 10).map((warning, i) => (
                      <li key={i} className="text-sm">{warning}</li>
                    ))}
                    {importResult.warnings.length > 10 && (
                      <li className="text-sm">...and {importResult.warnings.length - 10} more warnings</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Supported Fields
          </CardTitle>
          <CardDescription>
            The import supports 84 fields matching Saudi healthcare claims structure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Claim Identifiers</h4>
              <ul className="text-muted-foreground space-y-1">
                <li>MdgfClaimNumber</li>
                <li>InsuredID</li>
                <li>HCPID</li>
                <li>PolicyNo</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Pre-Authorization</h4>
              <ul className="text-muted-foreground space-y-1">
                <li>PreAuthorizationID</li>
                <li>PreAuthorizationStatus</li>
                <li>IsPreAuthorizationRequired</li>
                <li>IsPreAuthorized</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Policy Flags</h4>
              <ul className="text-muted-foreground space-y-1">
                <li>MaternityFlag</li>
                <li>ChronicFlag</li>
                <li>PreExistingFlag</li>
                <li>NewbornFlag</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Geographic</h4>
              <ul className="text-muted-foreground space-y-1">
                <li>ProviderCity</li>
                <li>ProviderRegion</li>
                <li>ProviderNetwork</li>
                <li>SpecialityCode</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
