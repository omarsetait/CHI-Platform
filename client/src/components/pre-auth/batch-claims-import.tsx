import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  X,
  Loader2,
  FileWarning,
  ArrowLeft,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PreAuthPriority = "HIGH" | "NORMAL" | "LOW";

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  confidence: number;
}

interface ValidationError {
  row: number;
  field: string;
  value: string | number | undefined;
  error: string;
  severity: "error" | "warning";
}

interface ParsedClaim {
  rowNumber: number;
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  data: Record<string, unknown>;
}

interface ParseResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  columnMappings: ColumnMapping[];
  claims: ParsedClaim[];
  parseErrors: string[];
}

type ImportStep = "upload" | "mapping" | "preview" | "submit";

const TARGET_FIELDS = [
  { value: "", label: "-- Skip --" },
  { value: "claimId", label: "Claim ID", required: true },
  { value: "payerId", label: "Payer ID", required: true },
  { value: "memberId", label: "Member ID", required: true },
  { value: "memberDob", label: "Date of Birth" },
  { value: "memberGender", label: "Gender" },
  { value: "policyPlanId", label: "Policy Plan ID" },
  { value: "providerId", label: "Provider NPI" },
  { value: "specialty", label: "Specialty" },
  { value: "networkStatus", label: "Network Status" },
  { value: "encounterType", label: "Encounter Type" },
  { value: "totalAmount", label: "Total Amount" },
  { value: "diagnosisCode", label: "Diagnosis Code (ICD-10)" },
  { value: "diagnosisDesc", label: "Diagnosis Description" },
];

interface PreAuthBatchClaimsImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport?: (params: {
    claims: ParsedClaim[];
    batchName: string;
    priority: PreAuthPriority;
  }) => Promise<void>;
}

export function PreAuthBatchClaimsImport({
  open,
  onOpenChange,
  onImport,
}: PreAuthBatchClaimsImportProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [selectedClaims, setSelectedClaims] = useState<Set<number>>(new Set());
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [batchName, setBatchName] = useState("");
  const [priority, setPriority] = useState<PreAuthPriority>("NORMAL");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setBatchName(selectedFile.name.replace(/\.(csv|xlsx?)$/i, ""));
    }
  };

  const handleParse = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Parse the uploaded file and create result for preview
      // TODO: Replace with actual CSV/Excel parsing library (e.g., papaparse, xlsx)
      const parsedResult: ParseResult = {
        totalRows: 10,
        validRows: 8,
        invalidRows: 2,
        columnMappings: [
          { sourceColumn: "Claim_ID", targetField: "claimId", confidence: 0.95 },
          { sourceColumn: "Payer_ID", targetField: "payerId", confidence: 0.9 },
          { sourceColumn: "Member_ID", targetField: "memberId", confidence: 0.85 },
          { sourceColumn: "Amount", targetField: "totalAmount", confidence: 0.8 },
          { sourceColumn: "ICD_Code", targetField: "diagnosisCode", confidence: 0.75 },
        ],
        claims: Array.from({ length: 10 }, (_, i) => ({
          rowNumber: i + 1,
          isValid: i !== 2 && i !== 7,
          errors:
            i === 2
              ? [{ row: 3, field: "claimId", value: "", error: "Required field", severity: "error" as const }]
              : i === 7
              ? [{ row: 8, field: "totalAmount", value: "abc", error: "Invalid number", severity: "error" as const }]
              : [],
          warnings: i === 4 ? [{ row: 5, field: "diagnosisCode", value: "Z99", error: "Unusual code", severity: "warning" as const }] : [],
          data: {
            claimId: i === 2 ? "" : `CLM-${1000 + i}`,
            payerId: `PAY-00${i + 1}`,
            memberId: `MEM-${2000 + i}`,
            totalAmount: i === 7 ? "abc" : (1000 + i * 100).toString(),
            diagnosisCode: `J${18 + i}`,
          },
        })),
        parseErrors: [],
      };

      setParseResult(parsedResult);
      setColumnMappings(parsedResult.columnMappings);
      setSelectedClaims(new Set(parsedResult.claims.filter((c) => c.isValid).map((c) => c.rowNumber)));
      setStep("mapping");
    } catch (error) {
      console.error("Parse error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMappingChange = (sourceColumn: string, targetField: string) => {
    setColumnMappings((prev) =>
      prev.map((m) => (m.sourceColumn === sourceColumn ? { ...m, targetField } : m))
    );
  };

  const handlePreview = async () => {
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setStep("preview");
    setIsProcessing(false);
  };

  const handleSubmit = async () => {
    if (!parseResult || !onImport) return;

    setIsSubmitting(true);
    try {
      const claimsToSubmit = parseResult.claims.filter((c) => selectedClaims.has(c.rowNumber));
      await onImport({ claims: claimsToSubmit, batchName, priority });
      handleClose();
    } catch (error) {
      console.error("Submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep("upload");
    setFile(null);
    setParseResult(null);
    setColumnMappings([]);
    setSelectedClaims(new Set());
    setBatchName("");
    setPriority("NORMAL");
    onOpenChange(false);
  };

  const toggleClaimSelection = (rowNumber: number) => {
    setSelectedClaims((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) {
        next.delete(rowNumber);
      } else {
        next.add(rowNumber);
      }
      return next;
    });
  };

  const toggleAllClaims = () => {
    if (!parseResult) return;
    const validClaims = parseResult.claims.filter((c) => c.isValid).map((c) => c.rowNumber);
    const allSelected = validClaims.every((r) => selectedClaims.has(r));
    setSelectedClaims(allSelected ? new Set() : new Set(validClaims));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col" data-testid="preauth-batch-import-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Batch Claims Import
          </DialogTitle>
          <DialogDescription>
            Import multiple claims from a CSV or Excel file
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          {(["upload", "mapping", "preview", "submit"] as ImportStep[]).map((s, idx) => (
            <div key={s} className="flex items-center gap-2">
              <Badge
                variant={step === s ? "default" : step === "submit" && idx < 3 ? "secondary" : "outline"}
                className={cn(
                  step === s && "ring-2 ring-offset-2 ring-primary",
                  idx < ["upload", "mapping", "preview", "submit"].indexOf(step) && "bg-green-100 text-green-700"
                )}
              >
                {idx + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
              </Badge>
              {idx < 3 && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-hidden">
          {step === "upload" && (
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                      "hover:border-primary/50"
                    )}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm font-medium mb-1">
                      {file ? file.name : "Click to select a CSV or Excel file"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supports .csv, .xls, .xlsx files
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xls,.xlsx"
                      className="hidden"
                      onChange={handleFileChange}
                      data-testid="input-batch-file"
                    />
                  </div>
                </CardContent>
              </Card>

              {file && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setFile(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="batch-name">Batch Name</Label>
                  <Input
                    id="batch-name"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder="Enter batch name"
                    data-testid="input-batch-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as PreAuthPriority)}>
                    <SelectTrigger id="priority" data-testid="select-batch-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="NORMAL">Normal</SelectItem>
                      <SelectItem value="LOW">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {step === "mapping" && parseResult && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Column Mapping</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-64">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Source Column</TableHead>
                          <TableHead>Target Field</TableHead>
                          <TableHead className="text-right">Confidence</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {columnMappings.map((mapping) => (
                          <TableRow key={mapping.sourceColumn} data-testid={`mapping-row-${mapping.sourceColumn}`}>
                            <TableCell className="font-medium">{mapping.sourceColumn}</TableCell>
                            <TableCell>
                              <Select
                                value={mapping.targetField}
                                onValueChange={(v) => handleMappingChange(mapping.sourceColumn, v)}
                              >
                                <SelectTrigger className="w-48">
                                  <SelectValue placeholder="Select field" />
                                </SelectTrigger>
                                <SelectContent>
                                  {TARGET_FIELDS.map((field) => (
                                    <SelectItem key={field.value} value={field.value}>
                                      {field.label}
                                      {field.required && " *"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant="outline"
                                className={cn(
                                  mapping.confidence >= 0.8 && "text-green-600 border-green-300",
                                  mapping.confidence >= 0.5 && mapping.confidence < 0.8 && "text-amber-600 border-amber-300",
                                  mapping.confidence < 0.5 && "text-red-600 border-red-300"
                                )}
                              >
                                {(mapping.confidence * 100).toFixed(0)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>

              <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-md">
                <div className="flex items-center gap-2">
                  <Badge variant="default">{parseResult.totalRows}</Badge>
                  <span className="text-sm">Total Rows</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600 border-green-300">
                    {parseResult.validRows}
                  </Badge>
                  <span className="text-sm">Valid</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-red-600 border-red-300">
                    {parseResult.invalidRows}
                  </Badge>
                  <span className="text-sm">Invalid</span>
                </div>
              </div>
            </div>
          )}

          {step === "preview" && parseResult && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    id="skip-invalid"
                    checked={skipInvalid}
                    onCheckedChange={setSkipInvalid}
                    data-testid="switch-skip-invalid"
                  />
                  <Label htmlFor="skip-invalid" className="text-sm">
                    Skip invalid rows
                  </Label>
                </div>
                <span className="text-sm text-muted-foreground">
                  {selectedClaims.size} of {parseResult.claims.length} selected
                </span>
              </div>

              <ScrollArea className="h-64 border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={
                            parseResult.claims.filter((c) => c.isValid).length > 0 &&
                            parseResult.claims.filter((c) => c.isValid).every((c) => selectedClaims.has(c.rowNumber))
                          }
                          onCheckedChange={toggleAllClaims}
                          data-testid="checkbox-select-all"
                        />
                      </TableHead>
                      <TableHead>Row</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Claim ID</TableHead>
                      <TableHead>Payer ID</TableHead>
                      <TableHead>Member ID</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parseResult.claims.map((claim) => (
                      <TableRow
                        key={claim.rowNumber}
                        className={cn(!claim.isValid && "bg-red-50 dark:bg-red-950/20")}
                        data-testid={`preview-row-${claim.rowNumber}`}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedClaims.has(claim.rowNumber)}
                            onCheckedChange={() => toggleClaimSelection(claim.rowNumber)}
                            disabled={!claim.isValid && skipInvalid}
                          />
                        </TableCell>
                        <TableCell>{claim.rowNumber}</TableCell>
                        <TableCell>
                          {claim.isValid ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <FileWarning className="w-4 h-4 text-red-600" />
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {(claim.data.claimId as string) || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {(claim.data.payerId as string) || "-"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {(claim.data.memberId as string) || "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {(claim.data.totalAmount as string) || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {parseResult.claims.some((c) => c.errors.length > 0 || c.warnings.length > 0) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      Validation Issues
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="max-h-32">
                      <div className="space-y-1 text-sm">
                        {parseResult.claims.flatMap((claim) =>
                          [...claim.errors, ...claim.warnings].map((issue, idx) => (
                            <div
                              key={`${claim.rowNumber}-${idx}`}
                              className={cn(
                                "flex items-center gap-2 p-1 rounded",
                                issue.severity === "error" ? "text-red-600" : "text-amber-600"
                              )}
                            >
                              <Badge variant="outline" className="text-xs">
                                Row {issue.row}
                              </Badge>
                              <span>{issue.field}:</span>
                              <span>{issue.error}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0">
          {step !== "upload" && (
            <Button
              variant="outline"
              onClick={() => setStep(step === "preview" ? "mapping" : "upload")}
              disabled={isProcessing || isSubmitting}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}

          <div className="flex-1" />

          {step === "upload" && (
            <Button onClick={handleParse} disabled={!file || isProcessing} data-testid="button-parse">
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  Parse File
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}

          {step === "mapping" && (
            <Button onClick={handlePreview} disabled={isProcessing} data-testid="button-preview">
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Preview Claims
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}

          {step === "preview" && (
            <Button
              onClick={handleSubmit}
              disabled={selectedClaims.size === 0 || isSubmitting}
              data-testid="button-submit-import"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Import {selectedClaims.size} Claims
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
