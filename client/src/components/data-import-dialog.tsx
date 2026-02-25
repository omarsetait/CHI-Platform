import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import {
  Upload,
  FileSpreadsheet,
  FileJson,
  X,
  Check,
  AlertCircle,
  Loader2,
  FileText,
  Database,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type DataType = "claims" | "providers" | "doctors" | "patients";

interface ImportResult {
  success: boolean;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  errors: Array<{
    rowIndex: number;
    message: string;
    severity: string;
  }>;
  processingTimeMs: number;
  batchId: string;
  message: string;
}

interface DataImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDataType?: DataType;
}

const DATA_TYPE_CONFIG: Record<DataType, {
  label: string;
  labelAr: string;
  description: string;
  endpoint: string;
  requiredFields: string[];
  sampleFields: string[];
}> = {
  claims: {
    label: "Claims",
    labelAr: "المطالبات",
    description: "Healthcare claims data for FWA analysis",
    endpoint: "/api/etl/claims/bulk",
    requiredFields: ["claimNumber", "policyNumber", "registrationDate", "claimType", "hospital", "amount"],
    sampleFields: ["claimNumber", "policyNumber", "registrationDate", "claimType", "hospital", "amount", "patientId", "patientName", "providerId", "serviceDate"],
  },
  providers: {
    label: "Providers",
    labelAr: "مقدمي الخدمات",
    description: "Healthcare provider directory",
    endpoint: "/api/etl/providers/bulk",
    requiredFields: ["name", "type", "licenseNumber"],
    sampleFields: ["name", "nameAr", "type", "licenseNumber", "city", "region", "status"],
  },
  doctors: {
    label: "Doctors",
    labelAr: "الأطباء",
    description: "Physician information",
    endpoint: "/api/etl/doctors/bulk",
    requiredFields: ["name", "licenseNumber", "specialty"],
    sampleFields: ["name", "nameAr", "licenseNumber", "specialty", "providerId", "status"],
  },
  patients: {
    label: "Patients",
    labelAr: "المرضى",
    description: "Patient demographic data",
    endpoint: "/api/etl/patients/bulk",
    requiredFields: ["nationalId", "name"],
    sampleFields: ["nationalId", "name", "dateOfBirth", "gender", "city", "insuranceId"],
  },
};

export function DataImportDialog({ open, onOpenChange, defaultDataType = "claims" }: DataImportDialogProps) {
  const { toast } = useToast();
  const [dataType, setDataType] = useState<DataType>(defaultDataType);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [step, setStep] = useState<"select" | "preview" | "uploading" | "complete">("select");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const config = DATA_TYPE_CONFIG[dataType];

  const resetDialog = useCallback(() => {
    setFile(null);
    setParsedData([]);
    setParseError(null);
    setStep("select");
    setUploadProgress(0);
    setImportResult(null);
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParseError(null);

    try {
      const text = await selectedFile.text();
      let data: any[] = [];

      if (selectedFile.name.endsWith(".json")) {
        const parsed = JSON.parse(text);
        data = Array.isArray(parsed) ? parsed : parsed.records || parsed.data || [parsed];
      } else if (selectedFile.name.endsWith(".csv")) {
        data = parseCSV(text);
      } else {
        throw new Error("Unsupported file format. Please use JSON or CSV.");
      }

      if (data.length === 0) {
        throw new Error("No records found in file");
      }

      if (data.length > 50000) {
        throw new Error(`File contains ${data.length} records. Maximum is 50,000 per upload.`);
      }

      setParsedData(data);
      setStep("preview");
    } catch (error: any) {
      setParseError(error.message);
      setParsedData([]);
    }
  }, []);

  const parseCSV = (text: string): any[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    const records: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === headers.length) {
        const record: Record<string, any> = {};
        headers.forEach((header, idx) => {
          record[header] = values[idx];
        });
        records.push(record);
      }
    }

    return records;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      setStep("uploading");
      setUploadProgress(10);

      const response = await apiRequest("POST", config.endpoint, {
        records: parsedData,
        options: {
          skipDuplicates: true,
          batchSize: 500,
        },
      });

      setUploadProgress(100);
      return response.json();
    },
    onSuccess: (result: ImportResult) => {
      setImportResult(result);
      setStep("complete");

      if (result.success) {
        toast({
          title: "Import Complete",
          description: `Successfully imported ${result.successCount} of ${result.totalRecords} records`,
        });

        queryClient.invalidateQueries({ queryKey: ["/api/fwa"] });
        queryClient.invalidateQueries({ queryKey: ["/api/etl"] });
        queryClient.invalidateQueries({ queryKey: ["/api/claims"] });
      } else {
        toast({
          title: "Import Completed with Errors",
          description: `${result.errorCount} records failed. Check the results for details.`,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      setStep("preview");
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Bulk Data Import / استيراد البيانات
          </DialogTitle>
          <DialogDescription>
            Upload CSV or JSON files to import data into the system
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Type / نوع البيانات</label>
              <Select value={dataType} onValueChange={(v) => setDataType(v as DataType)}>
                <SelectTrigger data-testid="select-data-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DATA_TYPE_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      {cfg.label} / {cfg.labelAr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{config.description}</p>
            </div>

            <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-4">
              <div className="flex justify-center gap-4">
                <FileSpreadsheet className="w-12 h-12 text-green-600" />
                <FileJson className="w-12 h-12 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Drop your file here or click to browse</p>
                <p className="text-sm text-muted-foreground">Supports CSV and JSON files up to 50,000 records</p>
              </div>
              <input
                type="file"
                accept=".csv,.json"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                data-testid="input-file-upload"
              />
              <Button asChild variant="outline">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  Select File
                </label>
              </Button>
            </div>

            {parseError && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
                <AlertCircle className="w-4 h-4" />
                <span>{parseError}</span>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium">Required Fields:</p>
              <div className="flex flex-wrap gap-2">
                {config.requiredFields.map((field) => (
                  <Badge key={field} variant="outline" className="bg-amber-50 dark:bg-amber-900/20">
                    {field}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Sample JSON Format:</p>
              <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
{JSON.stringify({
  records: [
    config.sampleFields.reduce((acc, field) => ({ ...acc, [field]: `<${field}>` }), {}),
  ],
}, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                <span className="font-medium">{file?.name}</span>
                <Badge>{parsedData.length} records</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={resetDialog}>
                <X className="w-4 h-4 mr-1" />
                Change File
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      {Object.keys(parsedData[0] || {}).slice(0, 6).map((key) => (
                        <TableHead key={key}>{key}</TableHead>
                      ))}
                      {Object.keys(parsedData[0] || {}).length > 6 && (
                        <TableHead>...</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 5).map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        {Object.values(row).slice(0, 6).map((val: any, i) => (
                          <TableCell key={i} className="max-w-32 truncate">
                            {String(val ?? "")}
                          </TableCell>
                        ))}
                        {Object.values(row).length > 6 && (
                          <TableCell className="text-muted-foreground">...</TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsedData.length > 5 && (
                <div className="p-2 bg-muted text-center text-sm text-muted-foreground">
                  Showing 5 of {parsedData.length} records
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetDialog}>
                Cancel
              </Button>
              <Button
                onClick={() => uploadMutation.mutate()}
                disabled={uploadMutation.isPending}
                data-testid="button-start-import"
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Import {parsedData.length} Records
              </Button>
            </div>
          </div>
        )}

        {step === "uploading" && (
          <div className="space-y-6 py-8">
            <div className="text-center space-y-2">
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
              <p className="font-medium">Importing data...</p>
              <p className="text-sm text-muted-foreground">
                جاري استيراد البيانات... Processing {parsedData.length} records
              </p>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {step === "complete" && importResult && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              {importResult.success ? (
                <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
              ) : (
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-amber-600" />
                </div>
              )}
              <p className="font-medium text-lg">Import Complete</p>
              <p className="text-muted-foreground">{importResult.message}</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-2xl font-bold">{importResult.totalRecords}</p>
                <p className="text-sm text-muted-foreground">Total Records</p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                <p className="text-2xl font-bold text-green-600">{importResult.successCount}</p>
                <p className="text-sm text-muted-foreground">Successful</p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                <p className="text-2xl font-bold text-red-600">{importResult.errorCount}</p>
                <p className="text-sm text-muted-foreground">Errors</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Errors ({importResult.errors.length}):</p>
                <div className="max-h-32 overflow-auto border rounded-lg p-2 space-y-1">
                  {importResult.errors.slice(0, 10).map((err, idx) => (
                    <div key={idx} className="text-xs text-destructive">
                      {err.rowIndex >= 0 && <span className="font-mono">Row {err.rowIndex + 1}: </span>}
                      {err.message}
                    </div>
                  ))}
                  {importResult.errors.length > 10 && (
                    <p className="text-xs text-muted-foreground">
                      ... and {importResult.errors.length - 10} more errors
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={resetDialog} data-testid="button-import-more">
                Import More Data
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
