import { db } from "../db";
import { claims } from "@shared/schema";
import { sql } from "drizzle-orm";
import * as XLSX from "xlsx";

export interface ImportResult {
  success: boolean;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errors: string[];
  warnings: string[];
  processingTimeMs: number;
}

export interface ClaimImportRow {
  Id?: string;
  LotNo?: number;
  BatchType?: string;
  MdgfClaimNumber?: string;
  HCPID?: string;
  InsuredID?: string;
  DateofBirth?: string | Date;
  Gender?: string;
  OccurrenceDate?: string | Date;
  PrimaryDiagnosis?: string;
  SecondaryICDs?: string;
  PolicyNo?: string;
  PractionerId?: string;
  SpecialityCode?: string;
  ClaimBenefit?: string;
  LengthofStay?: number;
  DischargeDiagnosisCodes?: string;
  DischargeOtherDiag?: string;
  ServiceType?: string;
  ServiceCode?: string;
  HCPCode?: string;
  ServiceDescription?: string;
  ProviderServiceDescription?: string;
  StartDate?: string | Date;
  RQuantity?: number;
  Duration?: number;
  UnitPrice?: number;
  PatientShareLC?: number;
  ServiceLineNo?: number;
  ProviderType?: string;
  GroupNo?: string;
  ProviderCity?: string;
  ProviderRegion?: string;
  ProviderNetwork?: string;
  ProviderContractID?: string;
  CoverageRelationship?: string;
  Nationality?: string;
  Speciality?: string;
  PreAuthorizationID?: string;
  PreAuthorizationStatus?: string;
  PreAuthorizationPatientId?: string;
  PreAuthorizationPractionerId?: string;
  Source?: string;
  PreAuthorizationChiefComplainInfo?: string;
  PolicyEffectiveDate?: string | Date;
  PolicyExpiryDate?: string | Date;
  MaternityFlag?: string | boolean;
  NewbornFlag?: string | boolean;
  ChronicFlag?: string | boolean;
  PreExistingFlag?: string | boolean;
  Resubmission?: string | boolean;
  DateOfClaimSubmission?: string | Date;
  DischargeDate?: string | Date;
  DischargeDisposition?: string;
  OnAdmission?: string;
  AdmissionDate?: string | Date;
  ServiceClaimedAmount?: number;
  NetPayableAmount?: number;
  IsPreAuthorizationRequired?: string | boolean;
  IsPreAuthorized?: string | boolean;
  ClaimIcd10sDescriptions?: string;
  ListedServiceCode?: string;
  ListedServiceDesc?: string;
  TachyActivityType?: string;
  AIStatus?: string;
  AITopFeatures?: string;
  AIProviderStatus?: string;
  AIPatientStatus?: string;
  IsRetrievedByWQ?: string | boolean;
  WQAction?: string;
  PreAuthorizationIcd10s?: string;
  MedicationDuration?: number;
  ClaimType?: string;
  WorkQueueFeedback?: string;
  AdjudicationStatus?: string;
  AdjudicationSource?: string;
  AITopFeaturePositive?: string;
  Validation?: string;
  Comment?: string;
}

function parseDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  
  const str = String(value).trim();
  if (!str || str === "null" || str === "undefined") return null;
  
  // Handle Excel serial date numbers
  if (typeof value === "number") {
    const date = new Date((value - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) return date;
  }
  
  // Try standard date parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;
  
  // Try yyyy-mm-dd format
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  }
  
  return null;
}

function parseBoolean(value: any): boolean {
  if (typeof value === "boolean") return value;
  if (!value) return false;
  const str = String(value).toLowerCase().trim();
  return str === "true" || str === "yes" || str === "1" || str === "y";
}

function parseDecimal(value: any): string | null {
  if (value === null || value === undefined || value === "") return null;
  const num = parseFloat(String(value));
  return isNaN(num) ? null : num.toFixed(2);
}

function parseInteger(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const str = String(value).trim();
  if (!str || str === "NaN" || str === "undefined" || str === "null") return null;
  const num = parseInt(str, 10);
  return isNaN(num) ? null : num;
}

function parseArray(value: any): string[] | null {
  if (!value) return null;
  if (Array.isArray(value)) return value.map(String);
  const str = String(value).trim();
  if (!str) return null;
  
  // Handle comma-separated values
  if (str.includes(",")) {
    return str.split(",").map(s => s.trim()).filter(s => s);
  }
  
  // Handle semicolon-separated values
  if (str.includes(";")) {
    return str.split(";").map(s => s.trim()).filter(s => s);
  }
  
  return [str];
}

function generateClaimId(row: ClaimImportRow, index: number): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `claim-${timestamp}-${random}-${index}`;
}

export function mapRowToClaim(row: ClaimImportRow, index: number): any {
  const now = new Date();
  
  return {
    id: generateClaimId(row, index),
    claimNumber: row.MdgfClaimNumber || row.Id || `IMPORT-${Date.now()}-${index}`,
    policyNumber: row.PolicyNo || "UNKNOWN",
    registrationDate: parseDate(row.DateOfClaimSubmission) || parseDate(row.OccurrenceDate) || now,
    claimType: row.ClaimType || row.ServiceType || "Medical",
    hospital: row.HCPCode || row.HCPID || "Unknown Provider",
    amount: parseDecimal(row.ServiceClaimedAmount) || parseDecimal(row.NetPayableAmount) || "0.00",
    outlierScore: "0.00",
    description: row.ServiceDescription || row.ProviderServiceDescription || "",
    icd: row.PrimaryDiagnosis || "",
    hasSurgery: null,
    surgeryFee: null,
    hasIcu: null,
    lengthOfStay: parseInteger(row.LengthofStay),
    similarClaims: null,
    similarClaimsInHospital: null,
    providerId: row.HCPID || "",
    providerName: row.HCPCode || "",
    patientId: row.InsuredID || "",
    patientName: "",
    serviceDate: parseDate(row.StartDate) || parseDate(row.OccurrenceDate),
    status: "pending",
    category: row.ServiceType || null,
    flagged: false,
    flagReason: null,
    cptCodes: row.ServiceCode ? [row.ServiceCode] : null,
    diagnosisCodes: parseArray(row.SecondaryICDs) || (row.PrimaryDiagnosis ? [row.PrimaryDiagnosis] : null),
    
    // New fields
    mdgfClaimNumber: row.MdgfClaimNumber || null,
    lotNo: parseInteger(row.LotNo),
    batchType: row.BatchType || null,
    secondaryIcds: parseArray(row.SecondaryICDs),
    dischargeDiagnosisCodes: parseArray(row.DischargeDiagnosisCodes),
    dischargeOtherDiag: row.DischargeOtherDiag || null,
    claimIcd10Descriptions: row.ClaimIcd10sDescriptions || null,
    insuredId: row.InsuredID || null,
    dateOfBirth: parseDate(row.DateofBirth),
    gender: row.Gender || null,
    nationality: row.Nationality || null,
    coverageRelationship: row.CoverageRelationship || null,
    hcpId: row.HCPID || null,
    hcpCode: row.HCPCode || null,
    practitionerId: row.PractionerId || null,
    specialtyCode: row.SpecialityCode || null,
    specialty: row.Speciality || null,
    providerType: row.ProviderType || null,
    providerCity: row.ProviderCity || null,
    providerRegion: row.ProviderRegion || null,
    providerNetwork: row.ProviderNetwork || null,
    providerContractId: row.ProviderContractID || null,
    serviceType: row.ServiceType || null,
    serviceCode: row.ServiceCode || null,
    serviceDescription: row.ServiceDescription || null,
    providerServiceDescription: row.ProviderServiceDescription || null,
    listedServiceCode: row.ListedServiceCode || null,
    listedServiceDesc: row.ListedServiceDesc || null,
    startDate: parseDate(row.StartDate),
    rQuantity: parseInteger(row.RQuantity),
    duration: parseInteger(row.Duration),
    unitPrice: parseDecimal(row.UnitPrice),
    patientShareLc: parseDecimal(row.PatientShareLC),
    serviceLineNo: parseInteger(row.ServiceLineNo),
    serviceClaimedAmount: parseDecimal(row.ServiceClaimedAmount),
    netPayableAmount: parseDecimal(row.NetPayableAmount),
    claimBenefit: row.ClaimBenefit || null,
    preAuthorizationId: row.PreAuthorizationID || null,
    preAuthorizationStatus: row.PreAuthorizationStatus || null,
    preAuthorizationPatientId: row.PreAuthorizationPatientId || null,
    preAuthorizationPractitionerId: row.PreAuthorizationPractionerId || null,
    preAuthorizationChiefComplaint: row.PreAuthorizationChiefComplainInfo || null,
    preAuthorizationIcd10s: parseArray(row.PreAuthorizationIcd10s),
    isPreAuthorizationRequired: parseBoolean(row.IsPreAuthorizationRequired),
    isPreAuthorized: parseBoolean(row.IsPreAuthorized),
    policyEffectiveDate: parseDate(row.PolicyEffectiveDate),
    policyExpiryDate: parseDate(row.PolicyExpiryDate),
    groupNo: row.GroupNo || null,
    maternityFlag: parseBoolean(row.MaternityFlag),
    newbornFlag: parseBoolean(row.NewbornFlag),
    chronicFlag: parseBoolean(row.ChronicFlag),
    preExistingFlag: parseBoolean(row.PreExistingFlag),
    resubmission: parseBoolean(row.Resubmission),
    occurrenceDate: parseDate(row.OccurrenceDate),
    dateOfClaimSubmission: parseDate(row.DateOfClaimSubmission),
    dischargeDate: parseDate(row.DischargeDate),
    dischargeDisposition: row.DischargeDisposition || null,
    onAdmission: row.OnAdmission || null,
    admissionDate: parseDate(row.AdmissionDate),
    aiStatus: row.AIStatus || null,
    aiTopFeatures: row.AITopFeatures || null,
    aiProviderStatus: row.AIProviderStatus || null,
    aiPatientStatus: row.AIPatientStatus || null,
    aiTopFeaturePositive: row.AITopFeaturePositive || null,
    isRetrievedByWq: parseBoolean(row.IsRetrievedByWQ),
    wqAction: row.WQAction || null,
    tachyActivityType: row.TachyActivityType || null,
    medicationDuration: parseInteger(row.MedicationDuration),
    workQueueFeedback: row.WorkQueueFeedback || null,
    adjudicationStatus: row.AdjudicationStatus || null,
    adjudicationSource: row.AdjudicationSource || null,
    // source field removed - use description for tracking import source
    validationStatus: row.Validation || null,
    validationComment: row.Comment || null,
  };
}

export async function importClaimsFromExcel(
  fileBuffer: Buffer,
  options: {
    sheetName?: string;
    startRow?: number;
    maxRows?: number;
    validateOnly?: boolean;
  } = {}
): Promise<ImportResult> {
  const startTime = Date.now();
  const result: ImportResult = {
    success: false,
    totalRows: 0,
    importedRows: 0,
    skippedRows: 0,
    errors: [],
    warnings: [],
    processingTimeMs: 0
  };

  try {
    const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
    
    const sheetName = options.sheetName || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    if (!sheet) {
      result.errors.push(`Sheet "${sheetName}" not found`);
      result.processingTimeMs = Date.now() - startTime;
      return result;
    }

    const rows: ClaimImportRow[] = XLSX.utils.sheet_to_json(sheet, {
      range: options.startRow || 0,
      defval: null
    });

    result.totalRows = options.maxRows ? Math.min(rows.length, options.maxRows) : rows.length;

    if (result.totalRows === 0) {
      result.warnings.push("No data rows found in the sheet");
      result.processingTimeMs = Date.now() - startTime;
      return result;
    }

    const rowsToProcess = options.maxRows ? rows.slice(0, options.maxRows) : rows;
    const claimsToInsert: any[] = [];

    for (let i = 0; i < rowsToProcess.length; i++) {
      const row = rowsToProcess[i];
      
      try {
        // Basic validation
        if (!row.InsuredID && !row.HCPID && !row.MdgfClaimNumber) {
          result.warnings.push(`Row ${i + 1}: Skipped - No patient ID, provider ID, or claim number`);
          result.skippedRows++;
          continue;
        }

        const claimData = mapRowToClaim(row, i);
        
        // Validate required fields
        if (!claimData.claimNumber) {
          result.warnings.push(`Row ${i + 1}: Missing claim number`);
        }

        claimsToInsert.push(claimData);
      } catch (error) {
        result.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : "Unknown error"}`);
        result.skippedRows++;
      }
    }

    if (options.validateOnly) {
      result.importedRows = claimsToInsert.length;
      result.success = result.errors.length === 0;
      result.processingTimeMs = Date.now() - startTime;
      return result;
    }

    // Insert claims in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < claimsToInsert.length; i += BATCH_SIZE) {
      const batch = claimsToInsert.slice(i, i + BATCH_SIZE);
      
      try {
        await db.insert(claims).values(batch).onConflictDoNothing();
        result.importedRows += batch.length;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Database error";
        result.errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${errorMsg}`);
        result.skippedRows += batch.length;
      }
    }

    result.success = result.importedRows > 0;
    result.processingTimeMs = Date.now() - startTime;

  } catch (error) {
    result.errors.push(`Import failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    result.processingTimeMs = Date.now() - startTime;
  }

  return result;
}

export async function importClaimsFromCSV(csvPath: string, options: { maxRows?: number } = {}): Promise<ImportResult> {
  const fs = await import('fs');
  const readline = await import('readline');
  const startTime = Date.now();
  
  const result: ImportResult = {
    success: false,
    totalRows: 0,
    importedRows: 0,
    skippedRows: 0,
    errors: [],
    warnings: [],
    processingTimeMs: 0
  };

  try {
    const fileStream = fs.createReadStream(csvPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let headers: string[] = [];
    let lineNumber = 0;
    let batch: any[] = [];
    const BATCH_SIZE = 500;
    
    for await (const line of rl) {
      lineNumber++;
      
      if (lineNumber === 1) {
        // Parse headers
        headers = parseCSVLine(line);
        console.log(`[CSV Import] Found ${headers.length} columns`);
        continue;
      }
      
      if (options.maxRows && result.totalRows >= options.maxRows) {
        console.log(`[CSV Import] Reached maxRows limit: ${options.maxRows}`);
        break;
      }
      
      result.totalRows++;
      
      try {
        const values = parseCSVLine(line);
        const row: any = {};
        headers.forEach((header, i) => {
          row[header] = values[i] || '';
        });
        
        const claim = mapRowToClaim(row as ClaimImportRow, result.totalRows);
        batch.push(claim);
        
        if (batch.length >= BATCH_SIZE) {
          try {
            await db.insert(claims).values(batch).onConflictDoNothing();
            result.importedRows += batch.length;
            if (result.importedRows % 10000 === 0) {
              console.log(`[CSV Import] Imported ${result.importedRows} claims...`);
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Database error";
            result.errors.push(`Batch at row ${result.totalRows}: ${errorMsg}`);
            result.skippedRows += batch.length;
          }
          batch = [];
        }
      } catch (error) {
        result.skippedRows++;
        if (result.errors.length < 10) {
          result.errors.push(`Row ${lineNumber}: ${error instanceof Error ? error.message : "Parse error"}`);
        }
      }
    }
    
    // Insert remaining batch
    if (batch.length > 0) {
      try {
        await db.insert(claims).values(batch).onConflictDoNothing();
        result.importedRows += batch.length;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Database error";
        result.errors.push(`Final batch: ${errorMsg}`);
        result.skippedRows += batch.length;
      }
    }

    result.success = result.importedRows > 0;
    result.processingTimeMs = Date.now() - startTime;
    console.log(`[CSV Import] Complete: ${result.importedRows}/${result.totalRows} claims imported in ${result.processingTimeMs}ms`);

  } catch (error) {
    result.errors.push(`Import failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    result.processingTimeMs = Date.now() - startTime;
  }

  return result;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = false;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}

export async function getImportStats(): Promise<{
  totalClaims: number;
  importedToday: number;
  sources: { source: string; count: number }[];
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get basic counts - use claim_type instead of source since source column may not exist
  const [totalResult, todayResult, typesResult] = await Promise.all([
    db.execute(sql`SELECT COUNT(*)::int as count FROM claims`),
    db.execute(sql`SELECT COUNT(*)::int as count FROM claims WHERE registration_date >= ${today}`),
    db.execute(sql`
      SELECT COALESCE(claim_type, 'Unknown') as type, COUNT(*)::int as count 
      FROM claims 
      GROUP BY claim_type 
      ORDER BY count DESC 
      LIMIT 10
    `)
  ]);

  return {
    totalClaims: Number(totalResult.rows[0]?.count || 0),
    importedToday: Number(todayResult.rows[0]?.count || 0),
    sources: typesResult.rows.map(r => ({
      source: String(r.type),
      count: Number(r.count)
    }))
  };
}
