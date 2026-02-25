import { useState, useCallback, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import {
  Upload,
  FileSpreadsheet,
  FileJson,
  File,
  X,
  Check,
  AlertCircle,
  Loader2,
  ArrowRight,
  RefreshCw,
  Download,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import * as XLSX from "xlsx";

type ImportTarget = "provider_directory" | "operational_findings" | "claims_data" | "benchmark_data";

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  isRequired: boolean;
  isValid: boolean;
}

interface PreviewRow {
  rowIndex: number;
  data: Record<string, any>;
  isValid: boolean;
  errors: string[];
}

interface TargetConfig {
  label: string;
  description: string;
  fields: { name: string; label: string; required: boolean }[];
}

const TARGET_CONFIGS: Record<ImportTarget, TargetConfig> = {
  provider_directory: {
    label: "Provider Directory",
    description: "Import provider information including NPI, name, specialty, and contact details",
    fields: [
      { name: "npi", label: "NPI", required: true },
      { name: "name", label: "Provider Name", required: true },
      { name: "specialty", label: "Specialty", required: true },
      { name: "organization", label: "Organization", required: false },
      { name: "email", label: "Email", required: false },
      { name: "phone", label: "Phone", required: false },
      { name: "address", label: "Address", required: false },
      { name: "city", label: "City", required: false },
      { name: "region", label: "Region", required: false },
      { name: "networkTier", label: "Network Tier", required: false },
      { name: "licenseNumber", label: "License Number", required: false },
    ],
  },
  operational_findings: {
    label: "Operational Findings",
    description: "Import operational findings and discrepancies for reconciliation",
    fields: [
      { name: "findingId", label: "Finding ID", required: true },
      { name: "providerId", label: "Provider ID", required: true },
      { name: "findingType", label: "Finding Type", required: true },
      { name: "description", label: "Description", required: true },
      { name: "amount", label: "Amount", required: false },
      { name: "severity", label: "Severity", required: false },
      { name: "status", label: "Status", required: false },
      { name: "dateIdentified", label: "Date Identified", required: false },
    ],
  },
  claims_data: {
    label: "Claims Data",
    description: "Import claims data for analysis and benchmarking",
    fields: [
      { name: "claimId", label: "Claim ID", required: true },
      { name: "providerId", label: "Provider ID", required: true },
      { name: "memberId", label: "Member ID", required: true },
      { name: "claimDate", label: "Claim Date", required: true },
      { name: "amount", label: "Amount", required: true },
      { name: "claimType", label: "Claim Type", required: false },
      { name: "diagnosis", label: "Diagnosis Code", required: false },
      { name: "procedure", label: "Procedure Code", required: false },
      { name: "status", label: "Status", required: false },
    ],
  },
  benchmark_data: {
    label: "Benchmark Data",
    description: "Import benchmark metrics for provider comparison",
    fields: [
      { name: "providerId", label: "Provider ID", required: true },
      { name: "providerName", label: "Provider Name", required: true },
      { name: "costPerMember", label: "Cost Per Member", required: true },
      { name: "memberCount", label: "Member Count", required: false },
      { name: "totalClaims", label: "Total Claims", required: false },
      { name: "peerPercentile", label: "Peer Percentile", required: false },
      { name: "deviationFromPeer", label: "Deviation from Peer", required: false },
      { name: "period", label: "Period", required: false },
    ],
  },
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "xlsx" || ext === "xls") {
    return <FileSpreadsheet className="w-8 h-8 text-green-600" />;
  }
  if (ext === "json") {
    return <FileJson className="w-8 h-8 text-amber-600" />;
  }
  return <File className="w-8 h-8 text-muted-foreground" />;
}

export default function DataImportPage() {
  const { toast } = useToast();
  const [selectedTarget, setSelectedTarget] = useState<ImportTarget>("provider_directory");
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<Record<string, any>[]>([]);
  const [sourceColumns, setSourceColumns] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "importing">("upload");
  const [isDragOver, setIsDragOver] = useState(false);

  const targetConfig = TARGET_CONFIGS[selectedTarget];

  const importMutation = useMutation({
    mutationFn: async (data: { target: ImportTarget; records: Record<string, any>[] }) => {
      const formData = new FormData();
      formData.append("target", data.target);
      formData.append("records", JSON.stringify(data.records));
      if (file) {
        formData.append("file", file);
      }
      const res = await apiRequest("POST", "/api/provider-relations/import", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Import Successful",
        description: `Successfully imported ${data.imported || data.created || 0} records.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/provider-relations/providers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/provider-relations/benchmarks"] });
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import data. Please try again.",
        variant: "destructive",
      });
      setStep("preview");
      setImportProgress(0);
    },
  });

  const resetForm = useCallback(() => {
    setFile(null);
    setRawData([]);
    setSourceColumns([]);
    setColumnMappings([]);
    setPreviewRows([]);
    setImportProgress(0);
    setStep("upload");
  }, []);

  const parseFile = useCallback(async (uploadedFile: File) => {
    const ext = uploadedFile.name.split(".").pop()?.toLowerCase();
    let parsedData: Record<string, any>[] = [];

    try {
      if (ext === "json") {
        const text = await uploadedFile.text();
        const json = JSON.parse(text);
        parsedData = Array.isArray(json) ? json : [json];
      } else if (ext === "csv") {
        const text = await uploadedFile.text();
        const lines = text.trim().split("\n");
        if (lines.length < 2) {
          throw new Error("CSV file must have headers and at least one data row");
        }
        const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
        parsedData = lines.slice(1).map((line) => {
          const values = line.split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
          const row: Record<string, any> = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx] || "";
          });
          return row;
        });
      } else if (ext === "xlsx" || ext === "xls") {
        const buffer = await uploadedFile.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        parsedData = XLSX.utils.sheet_to_json(firstSheet);
      } else {
        throw new Error("Unsupported file format. Please use XLSX, CSV, or JSON.");
      }

      if (parsedData.length === 0) {
        throw new Error("No data found in the file");
      }

      const columns = Object.keys(parsedData[0]);
      setSourceColumns(columns);
      setRawData(parsedData);

      const autoMappings = targetConfig.fields.map((field) => {
        const matchingColumn = columns.find(
          (col) =>
            col.toLowerCase().replace(/[_\s-]/g, "") ===
            field.name.toLowerCase().replace(/[_\s-]/g, "")
        );
        return {
          sourceColumn: matchingColumn || "",
          targetField: field.name,
          isRequired: field.required,
          isValid: !field.required || !!matchingColumn,
        };
      });

      setColumnMappings(autoMappings);
      setStep("mapping");

      toast({
        title: "File Parsed",
        description: `Found ${parsedData.length} rows and ${columns.length} columns.`,
      });
    } catch (error: any) {
      toast({
        title: "Parse Error",
        description: error.message || "Failed to parse the file",
        variant: "destructive",
      });
    }
  }, [targetConfig, toast]);

  const handleFileSelect = useCallback(
    (selectedFile: File) => {
      const validExtensions = [".xlsx", ".xls", ".csv", ".json"];
      const ext = selectedFile.name.toLowerCase();
      if (!validExtensions.some((ve) => ext.endsWith(ve))) {
        toast({
          title: "Invalid File",
          description: "Please upload an XLSX, CSV, or JSON file.",
          variant: "destructive",
        });
        return;
      }
      setFile(selectedFile);
      parseFile(selectedFile);
    },
    [parseFile, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const updateMapping = useCallback(
    (targetField: string, sourceColumn: string) => {
      setColumnMappings((prev) =>
        prev.map((m) =>
          m.targetField === targetField
            ? {
                ...m,
                sourceColumn,
                isValid: !m.isRequired || !!sourceColumn,
              }
            : m
        )
      );
    },
    []
  );

  const validateRow = useCallback(
    (row: Record<string, any>, mappings: ColumnMapping[]): { isValid: boolean; errors: string[] } => {
      const errors: string[] = [];

      mappings.forEach((mapping) => {
        if (mapping.isRequired && mapping.sourceColumn) {
          const value = row[mapping.sourceColumn];
          if (value === undefined || value === null || value === "") {
            errors.push(`Missing required field: ${mapping.targetField}`);
          }
        }
      });

      if (selectedTarget === "provider_directory") {
        const npiMapping = mappings.find((m) => m.targetField === "npi");
        if (npiMapping?.sourceColumn) {
          const npi = String(row[npiMapping.sourceColumn] || "");
          if (npi && !/^\d{10}$/.test(npi)) {
            errors.push("NPI must be exactly 10 digits");
          }
        }
      }

      return { isValid: errors.length === 0, errors };
    },
    [selectedTarget]
  );

  const generatePreview = useCallback(() => {
    const hasAllRequiredMappings = columnMappings
      .filter((m) => m.isRequired)
      .every((m) => m.sourceColumn);

    if (!hasAllRequiredMappings) {
      toast({
        title: "Missing Required Mappings",
        description: "Please map all required fields before previewing.",
        variant: "destructive",
      });
      return;
    }

    const preview: PreviewRow[] = rawData.slice(0, 10).map((row, index) => {
      const { isValid, errors } = validateRow(row, columnMappings);
      const mappedData: Record<string, any> = {};
      columnMappings.forEach((mapping) => {
        if (mapping.sourceColumn) {
          mappedData[mapping.targetField] = row[mapping.sourceColumn];
        }
      });
      return {
        rowIndex: index + 1,
        data: mappedData,
        isValid,
        errors,
      };
    });

    setPreviewRows(preview);
    setStep("preview");
  }, [columnMappings, rawData, validateRow, toast]);

  const handleImport = useCallback(() => {
    const mappedRecords = rawData.map((row) => {
      const mappedData: Record<string, any> = {};
      columnMappings.forEach((mapping) => {
        if (mapping.sourceColumn) {
          mappedData[mapping.targetField] = row[mapping.sourceColumn];
        }
      });
      return mappedData;
    });

    const validRecords = mappedRecords.filter((record) => {
      const { isValid } = validateRow(
        columnMappings.reduce((acc, m) => {
          if (m.sourceColumn) {
            acc[m.sourceColumn] = record[m.targetField];
          }
          return acc;
        }, {} as Record<string, any>),
        columnMappings
      );
      return isValid;
    });

    if (validRecords.length === 0) {
      toast({
        title: "No Valid Records",
        description: "All records failed validation. Please check your data.",
        variant: "destructive",
      });
      return;
    }

    setStep("importing");
    setImportProgress(10);

    const progressInterval = setInterval(() => {
      setImportProgress((prev) => Math.min(prev + 10, 90));
    }, 200);

    importMutation.mutate(
      { target: selectedTarget, records: validRecords },
      {
        onSettled: () => {
          clearInterval(progressInterval);
          setImportProgress(100);
        },
      }
    );
  }, [rawData, columnMappings, validateRow, selectedTarget, importMutation, toast]);

  const validationSummary = useMemo(() => {
    const validCount = previewRows.filter((r) => r.isValid).length;
    const invalidCount = previewRows.filter((r) => !r.isValid).length;
    return { validCount, invalidCount, total: previewRows.length };
  }, [previewRows]);

  const displayColumns = useMemo(() => {
    return columnMappings.filter((m) => m.sourceColumn).slice(0, 6);
  }, [columnMappings]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="page-title">
            Data Import
          </h1>
          <p className="text-muted-foreground">
            Import data from XLSX, CSV, or JSON files into the Provider Relations system
          </p>
        </div>
        {step !== "upload" && (
          <Button variant="outline" onClick={resetForm} data-testid="button-reset">
            <RefreshCw className="w-4 h-4 mr-2" />
            Start Over
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Import Target</CardTitle>
          <CardDescription>Select the type of data you want to import</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedTarget}
            onValueChange={(value: ImportTarget) => {
              setSelectedTarget(value);
              if (step !== "upload") {
                resetForm();
              }
            }}
            disabled={step !== "upload"}
            data-testid="select-target"
          >
            <SelectTrigger className="w-full max-w-md" data-testid="select-target-trigger">
              <SelectValue placeholder="Select import target" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TARGET_CONFIGS).map(([key, config]) => (
                <SelectItem key={key} value={key} data-testid={`select-target-${key}`}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-2 text-sm text-muted-foreground">{targetConfig.description}</p>
        </CardContent>
      </Card>

      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upload File</CardTitle>
            <CardDescription>
              Drag and drop or click to select an XLSX, CSV, or JSON file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              data-testid="dropzone"
            >
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Drop your file here</p>
              <p className="text-sm text-muted-foreground mb-4">
                Supports .xlsx, .csv, and .json files
              </p>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv,.json"
                className="hidden"
                id="file-input"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile) handleFileSelect(selectedFile);
                }}
                data-testid="input-file"
              />
              <Button asChild data-testid="button-browse">
                <label htmlFor="file-input" className="cursor-pointer">
                  Browse Files
                </label>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {file && step !== "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Selected File</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {getFileIcon(file.name)}
              <div className="flex-1">
                <p className="font-medium" data-testid="text-filename">
                  {file.name}
                </p>
                <p className="text-sm text-muted-foreground" data-testid="text-filesize">
                  {formatFileSize(file.size)} • {rawData.length} rows • {sourceColumns.length} columns
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={resetForm}
                data-testid="button-remove-file"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "mapping" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Column Mapping</CardTitle>
            <CardDescription>
              Map your file columns to the database fields. Fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              {targetConfig.fields.map((field) => {
                const mapping = columnMappings.find((m) => m.targetField === field.name);
                return (
                  <div key={field.name} className="flex items-center gap-4">
                    <div className="w-48">
                      <span className="text-sm font-medium">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <Select
                      value={mapping?.sourceColumn || ""}
                      onValueChange={(value) => updateMapping(field.name, value)}
                      data-testid={`select-mapping-${field.name}`}
                    >
                      <SelectTrigger
                        className="w-64"
                        data-testid={`select-mapping-trigger-${field.name}`}
                      >
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- Not Mapped --</SelectItem>
                        {sourceColumns.map((col) => (
                          <SelectItem key={col} value={col}>
                            {col}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {mapping?.sourceColumn && (
                      <Badge
                        className={
                          mapping.isValid
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }
                        data-testid={`badge-mapping-${field.name}`}
                      >
                        {mapping.isValid ? (
                          <Check className="w-3 h-3 mr-1" />
                        ) : (
                          <AlertCircle className="w-3 h-3 mr-1" />
                        )}
                        {mapping.isValid ? "Mapped" : "Required"}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={generatePreview} data-testid="button-preview">
                Preview Data
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "preview" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Data Preview</CardTitle>
                <CardDescription>
                  Showing first {previewRows.length} of {rawData.length} rows
                </CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <Check className="w-3 h-3 mr-1" />
                    {validationSummary.validCount} Valid
                  </Badge>
                  {validationSummary.invalidCount > 0 && (
                    <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {validationSummary.invalidCount} Invalid
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Row</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    {displayColumns.map((mapping) => (
                      <TableHead key={mapping.targetField}>
                        {targetConfig.fields.find((f) => f.name === mapping.targetField)?.label ||
                          mapping.targetField}
                      </TableHead>
                    ))}
                    <TableHead>Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row) => (
                    <TableRow
                      key={row.rowIndex}
                      className={!row.isValid ? "bg-red-50 dark:bg-red-950/20" : ""}
                      data-testid={`preview-row-${row.rowIndex}`}
                    >
                      <TableCell className="font-mono text-sm">{row.rowIndex}</TableCell>
                      <TableCell>
                        {row.isValid ? (
                          <Badge
                            className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            data-testid={`badge-valid-${row.rowIndex}`}
                          >
                            <Check className="w-3 h-3" />
                          </Badge>
                        ) : (
                          <Badge
                            className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            data-testid={`badge-invalid-${row.rowIndex}`}
                          >
                            <X className="w-3 h-3" />
                          </Badge>
                        )}
                      </TableCell>
                      {displayColumns.map((mapping) => (
                        <TableCell
                          key={mapping.targetField}
                          className="max-w-[200px] truncate"
                          title={String(row.data[mapping.targetField] || "")}
                        >
                          {row.data[mapping.targetField] ?? "-"}
                        </TableCell>
                      ))}
                      <TableCell className="text-red-600 dark:text-red-400 text-xs max-w-[300px]">
                        {row.errors.join(", ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between gap-4 pt-4">
              <Button variant="outline" onClick={() => setStep("mapping")} data-testid="button-back">
                Back to Mapping
              </Button>
              <Button
                onClick={handleImport}
                disabled={validationSummary.validCount === 0 || importMutation.isPending}
                data-testid="button-import"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Import {rawData.length} Records
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "importing" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Importing Data</CardTitle>
            <CardDescription>Please wait while your data is being imported...</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={importProgress} className="h-3" data-testid="progress-import" />
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Processing {rawData.length} records...</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Field Reference</CardTitle>
          <CardDescription>Required and optional fields for {targetConfig.label}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {targetConfig.fields.map((field) => (
              <div key={field.name} className="flex items-center gap-2">
                {field.required ? (
                  <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">
                    Required
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Optional
                  </Badge>
                )}
                <span className="text-sm">{field.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
