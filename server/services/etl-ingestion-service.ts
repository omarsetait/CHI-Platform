/**
 * ETL Ingestion Service
 * Handles bulk data ingestion with validation, transformation, and error handling
 * Designed for millions of records across providers, doctors, patients, and claims
 */

import { db, pool } from "../db";
import { claims, providerDirectory, fwaHighRiskDoctors, fwaHighRiskPatients, auditLogs } from "@shared/schema";
import { sql } from "drizzle-orm";
import { z } from "zod";

// ===========================================
// VALIDATION SCHEMAS
// ===========================================

export const claimIngestionSchema = z.object({
  id: z.string().optional(),
  claimNumber: z.string().min(1, "Claim number required"),
  registrationDate: z.string().or(z.date()).transform(v => new Date(v)).optional().nullable(),
  claimType: z.string().optional().nullable(),
  hospital: z.string().optional().nullable(),
  amount: z.number().or(z.string()).transform(v => Number(v)),
  outlierScore: z.number().or(z.string()).transform(v => Number(v)).default(0),
  description: z.string().optional().nullable(),
  primaryDiagnosis: z.string().optional().nullable(),
  hasSurgery: z.string().optional().nullable(),
  surgeryFee: z.number().or(z.string()).transform(v => v ? Number(v) : null).optional().nullable(),
  hasIcu: z.string().optional().nullable(),
  lengthOfStay: z.number().optional().nullable(),
  providerId: z.string().optional().nullable(),
  memberId: z.string().optional().nullable(),
  serviceDate: z.string().or(z.date()).transform(v => v ? new Date(v) : null).optional().nullable(),
  status: z.string().default("pending"),
  category: z.string().optional().nullable(),
  flagged: z.boolean().default(false),
  flagReason: z.string().optional().nullable(),
  cptCodes: z.array(z.string()).optional().nullable(),
  icdCodes: z.array(z.string()).optional().nullable(),
  specialty: z.string().optional().nullable(),
  practitionerId: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  providerType: z.string().optional().nullable(),
});

export const providerIngestionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Provider name required"),
  nameAr: z.string().optional().nullable(),
  type: z.string().min(1, "Provider type required"),
  licenseNumber: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  status: z.string().default("active"),
  riskTier: z.string().default("low"),
  contractStartDate: z.string().or(z.date()).transform(v => v ? new Date(v) : null).optional().nullable(),
  contractEndDate: z.string().or(z.date()).transform(v => v ? new Date(v) : null).optional().nullable(),
  specialties: z.array(z.string()).optional().nullable(),
  bedCount: z.number().optional().nullable(),
  accreditation: z.string().optional().nullable(),
});

export const doctorIngestionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Doctor name required"),
  nameAr: z.string().optional().nullable(),
  licenseNumber: z.string().min(1, "License number required"),
  specialty: z.string().min(1, "Specialty required"),
  providerId: z.string().optional().nullable(),
  providerName: z.string().optional().nullable(),
  yearsExperience: z.number().optional().nullable(),
  qualifications: z.array(z.string()).optional().nullable(),
  status: z.string().default("active"),
});

export const patientIngestionSchema = z.object({
  id: z.string().optional(),
  nationalId: z.string().min(1, "National ID required"),
  name: z.string().min(1, "Patient name required"),
  dateOfBirth: z.string().or(z.date()).transform(v => v ? new Date(v) : null).optional().nullable(),
  gender: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  insuranceId: z.string().optional().nullable(),
  insuranceClass: z.string().optional().nullable(),
  riskCategory: z.string().default("normal"),
});

// ===========================================
// ETL RESULT TYPES
// ===========================================

export interface ETLResult {
  success: boolean;
  totalRecords: number;
  successCount: number;
  errorCount: number;
  errors: ETLError[];
  processingTimeMs: number;
  batchId: string;
}

export interface ETLError {
  rowIndex: number;
  field?: string;
  value?: any;
  message: string;
  severity: "error" | "warning";
}

export interface ETLProgress {
  batchId: string;
  totalRecords: number;
  processedRecords: number;
  successCount: number;
  errorCount: number;
  status: "pending" | "processing" | "completed" | "failed";
  startTime: Date;
  estimatedTimeRemaining?: number;
}

// In-memory progress tracking
const etlProgressMap = new Map<string, ETLProgress>();

// ===========================================
// DATA QUALITY RULES
// ===========================================

interface DataQualityRule {
  name: string;
  check: (record: any) => boolean;
  message: string;
  severity: "error" | "warning";
}

const claimQualityRules: DataQualityRule[] = [
  {
    name: "amount_positive",
    check: (r) => Number(r.amount) > 0,
    message: "Claim amount must be positive",
    severity: "error"
  },
  {
    name: "amount_reasonable",
    check: (r) => Number(r.amount) < 10000000,
    message: "Claim amount exceeds reasonable threshold (10M SAR)",
    severity: "warning"
  },
  {
    name: "date_not_future",
    check: (r) => !r.serviceDate || new Date(r.serviceDate) <= new Date(),
    message: "Service date cannot be in the future",
    severity: "error"
  },
  {
    name: "los_reasonable",
    check: (r) => !r.lengthOfStay || (r.lengthOfStay >= 0 && r.lengthOfStay <= 365),
    message: "Length of stay must be between 0 and 365 days",
    severity: "warning"
  },
  {
    name: "outlier_score_range",
    check: (r) => !r.outlierScore || (Number(r.outlierScore) >= 0 && Number(r.outlierScore) <= 1),
    message: "Outlier score must be between 0 and 1",
    severity: "warning"
  },
  {
    name: "icd_format",
    check: (r) => !r.primaryDiagnosis || /^[A-Z]\d{2}(\.\d{1,2})?$/i.test(r.primaryDiagnosis),
    message: "ICD code format appears invalid",
    severity: "warning"
  },
];

const providerQualityRules: DataQualityRule[] = [
  {
    name: "valid_email",
    check: (r) => !r.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email),
    message: "Invalid email format",
    severity: "warning"
  },
  {
    name: "valid_phone",
    check: (r) => !r.phone || /^[\d\s\-\+\(\)]+$/.test(r.phone),
    message: "Invalid phone format",
    severity: "warning"
  },
  {
    name: "bed_count_reasonable",
    check: (r) => !r.bedCount || (r.bedCount > 0 && r.bedCount < 5000),
    message: "Bed count seems unreasonable",
    severity: "warning"
  },
];

// ===========================================
// ETL FUNCTIONS
// ===========================================

/**
 * Generate unique batch ID
 */
function generateBatchId(): string {
  return `ETL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate records against quality rules
 */
function validateRecords(
  records: any[],
  rules: DataQualityRule[]
): { valid: any[]; errors: ETLError[] } {
  const valid: any[] = [];
  const errors: ETLError[] = [];

  records.forEach((record, index) => {
    let hasError = false;
    
    for (const rule of rules) {
      if (!rule.check(record)) {
        errors.push({
          rowIndex: index,
          message: `${rule.name}: ${rule.message}`,
          severity: rule.severity
        });
        if (rule.severity === "error") {
          hasError = true;
        }
      }
    }

    if (!hasError) {
      valid.push(record);
    }
  });

  return { valid, errors };
}

/**
 * Deduplicate records by key field
 */
function deduplicateRecords<T>(
  records: T[],
  keyFn: (record: T) => string
): { unique: T[]; duplicateCount: number } {
  const seen = new Set<string>();
  const unique: T[] = [];
  let duplicateCount = 0;

  for (const record of records) {
    const key = keyFn(record);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(record);
    } else {
      duplicateCount++;
    }
  }

  return { unique, duplicateCount };
}

/**
 * Bulk insert claims with batch processing
 */
export async function bulkIngestClaims(
  rawRecords: any[],
  options: { 
    skipDuplicates?: boolean;
    batchSize?: number;
    userId?: string;
  } = {}
): Promise<ETLResult> {
  const startTime = Date.now();
  const batchId = generateBatchId();
  const batchSize = options.batchSize || 500;
  const errors: ETLError[] = [];
  let successCount = 0;

  // Initialize progress
  etlProgressMap.set(batchId, {
    batchId,
    totalRecords: rawRecords.length,
    processedRecords: 0,
    successCount: 0,
    errorCount: 0,
    status: "processing",
    startTime: new Date()
  });

  try {
    // Step 1: Parse and validate schema
    const parsedRecords: any[] = [];
    rawRecords.forEach((record, index) => {
      try {
        const parsed = claimIngestionSchema.parse(record);
        // Generate ID if not provided
        if (!parsed.id) {
          parsed.id = `CLM-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 6)}`;
        }
        parsedRecords.push(parsed);
      } catch (err: any) {
        errors.push({
          rowIndex: index,
          message: `Schema validation failed: ${err.message}`,
          severity: "error"
        });
      }
    });

    // Step 2: Apply data quality rules
    const { valid: qualityValidRecords, errors: qualityErrors } = validateRecords(
      parsedRecords,
      claimQualityRules
    );
    errors.push(...qualityErrors);

    // Step 3: Deduplicate by claim number
    const { unique: deduplicatedRecords, duplicateCount } = deduplicateRecords(
      qualityValidRecords,
      (r) => r.claimNumber
    );
    
    if (duplicateCount > 0) {
      errors.push({
        rowIndex: -1,
        message: `Removed ${duplicateCount} duplicate claim numbers within batch`,
        severity: "warning"
      });
    }

    // Step 4: Check for existing records in database (if skipDuplicates)
    let recordsToInsert = deduplicatedRecords;
    if (options.skipDuplicates && deduplicatedRecords.length > 0) {
      const claimNumbers = deduplicatedRecords.map(r => r.claimNumber);
      const existing = await db.execute(
        sql`SELECT claim_number FROM claims_v2 WHERE claim_number = ANY(ARRAY[${sql.join(claimNumbers.map(cn => sql`${cn}`), sql`,`)}]::text[])`
      );
      const existingSet = new Set((existing.rows as any[]).map(r => r.claim_number));
      recordsToInsert = deduplicatedRecords.filter(r => !existingSet.has(r.claimNumber));
      
      const skippedCount = deduplicatedRecords.length - recordsToInsert.length;
      if (skippedCount > 0) {
        errors.push({
          rowIndex: -1,
          message: `Skipped ${skippedCount} records already in database`,
          severity: "warning"
        });
      }
    }

    // Step 5: Batch insert
    for (let i = 0; i < recordsToInsert.length; i += batchSize) {
      const batch = recordsToInsert.slice(i, i + batchSize);
      
      try {
        // Use raw SQL for bulk insert performance
        const values = batch.map(r => ({
          id: r.id,
          claimNumber: r.claimNumber,
          registrationDate: r.registrationDate,
          claimType: r.claimType,
          hospital: r.hospital,
          amount: String(r.amount),
          outlierScore: String(r.outlierScore || 0),
          description: r.description,
          primaryDiagnosis: r.primaryDiagnosis,
          hasSurgery: r.hasSurgery,
          surgeryFee: r.surgeryFee ? String(r.surgeryFee) : null,
          hasIcu: r.hasIcu,
          lengthOfStay: r.lengthOfStay,
          providerId: r.providerId,
          memberId: r.memberId,
          practitionerId: r.practitionerId,
          specialty: r.specialty,
          city: r.city,
          providerType: r.providerType,
          serviceDate: r.serviceDate,
          status: r.status,
          category: r.category,
          flagged: r.flagged,
          flagReason: r.flagReason,
          cptCodes: r.cptCodes,
          icdCodes: r.icdCodes,
        }));

        await db.insert(claims).values(values).onConflictDoNothing();
        successCount += batch.length;

        // Update progress
        const progress = etlProgressMap.get(batchId);
        if (progress) {
          progress.processedRecords += batch.length;
          progress.successCount = successCount;
          progress.errorCount = errors.filter(e => e.severity === "error").length;
        }
      } catch (insertError: any) {
        // Handle batch insert error - try individual inserts
        for (const record of batch) {
          try {
            await db.insert(claims).values({
              id: record.id,
              claimNumber: record.claimNumber,
              registrationDate: record.registrationDate,
              claimType: record.claimType,
              hospital: record.hospital,
              amount: String(record.amount),
              outlierScore: String(record.outlierScore || 0),
              description: record.description,
              primaryDiagnosis: record.primaryDiagnosis,
              hasSurgery: record.hasSurgery,
              surgeryFee: record.surgeryFee ? String(record.surgeryFee) : null,
              hasIcu: record.hasIcu,
              lengthOfStay: record.lengthOfStay,
              providerId: record.providerId,
              memberId: record.memberId,
              practitionerId: record.practitionerId,
              specialty: record.specialty,
              city: record.city,
              providerType: record.providerType,
              serviceDate: record.serviceDate,
              status: record.status,
              category: record.category,
              flagged: record.flagged,
              flagReason: record.flagReason,
              cptCodes: record.cptCodes,
              icdCodes: record.icdCodes,
            }).onConflictDoNothing();
            successCount++;
          } catch (err: any) {
            errors.push({
              rowIndex: i + batch.indexOf(record),
              message: `Insert failed: ${err.message}`,
              severity: "error"
            });
          }
        }
      }
    }

    // Step 6: Log audit entry
    if (options.userId) {
      await db.insert(auditLogs).values({
        userId: options.userId,
        action: "BULK_INGEST_CLAIMS",
        resourceType: "claims",
        resourceId: batchId,
        details: {
          totalRecords: rawRecords.length,
          successCount,
          errorCount: errors.filter(e => e.severity === "error").length
        }
      });
    }

    // Update final progress
    const progress = etlProgressMap.get(batchId);
    if (progress) {
      progress.status = "completed";
      progress.successCount = successCount;
      progress.errorCount = errors.filter(e => e.severity === "error").length;
    }

    return {
      success: successCount > 0,
      totalRecords: rawRecords.length,
      successCount,
      errorCount: errors.filter(e => e.severity === "error").length,
      errors: errors.slice(0, 100), // Limit errors returned
      processingTimeMs: Date.now() - startTime,
      batchId
    };

  } catch (error: any) {
    const progress = etlProgressMap.get(batchId);
    if (progress) {
      progress.status = "failed";
    }

    return {
      success: false,
      totalRecords: rawRecords.length,
      successCount: 0,
      errorCount: rawRecords.length,
      errors: [{ rowIndex: -1, message: `ETL failed: ${error.message}`, severity: "error" }],
      processingTimeMs: Date.now() - startTime,
      batchId
    };
  }
}

/**
 * Bulk insert providers
 */
export async function bulkIngestProviders(
  rawRecords: any[],
  options: { skipDuplicates?: boolean; batchSize?: number } = {}
): Promise<ETLResult> {
  const startTime = Date.now();
  const batchId = generateBatchId();
  const batchSize = options.batchSize || 100;
  const errors: ETLError[] = [];
  let successCount = 0;

  try {
    // Parse and validate
    const parsedRecords: any[] = [];
    rawRecords.forEach((record, index) => {
      try {
        const parsed = providerIngestionSchema.parse(record);
        if (!parsed.id) {
          parsed.id = `PRV-${Date.now()}-${index}`;
        }
        parsedRecords.push(parsed);
      } catch (err: any) {
        errors.push({
          rowIndex: index,
          message: `Schema validation failed: ${err.message}`,
          severity: "error"
        });
      }
    });

    // Apply quality rules
    const { valid, errors: qualityErrors } = validateRecords(parsedRecords, providerQualityRules);
    errors.push(...qualityErrors);

    // Deduplicate by name
    const { unique } = deduplicateRecords(valid, (r) => r.name);

    // Batch insert into provider_directory table
    for (let i = 0; i < unique.length; i += batchSize) {
      const batch = unique.slice(i, i + batchSize);
      try {
        await db.insert(providerDirectory).values(batch.map(r => ({
          id: r.id,
          name: r.name,
          nameAr: r.nameAr,
          specialty: r.type, // Map type to specialty
          npi: r.licenseNumber,
          city: r.city,
          address: r.address,
          phone: r.phone,
          email: r.email,
          contractStatus: r.status,
        }))).onConflictDoNothing();
        successCount += batch.length;
      } catch (err: any) {
        errors.push({
          rowIndex: i,
          message: `Batch insert failed: ${err.message}`,
          severity: "error"
        });
      }
    }

    return {
      success: successCount > 0,
      totalRecords: rawRecords.length,
      successCount,
      errorCount: errors.filter(e => e.severity === "error").length,
      errors: errors.slice(0, 100),
      processingTimeMs: Date.now() - startTime,
      batchId
    };
  } catch (error: any) {
    return {
      success: false,
      totalRecords: rawRecords.length,
      successCount: 0,
      errorCount: rawRecords.length,
      errors: [{ rowIndex: -1, message: `ETL failed: ${error.message}`, severity: "error" }],
      processingTimeMs: Date.now() - startTime,
      batchId
    };
  }
}

/**
 * Bulk insert doctors
 */
export async function bulkIngestDoctors(
  rawRecords: any[],
  options: { skipDuplicates?: boolean; batchSize?: number } = {}
): Promise<ETLResult> {
  const startTime = Date.now();
  const batchId = generateBatchId();
  const batchSize = options.batchSize || 100;
  const errors: ETLError[] = [];
  let successCount = 0;

  try {
    const parsedRecords: any[] = [];
    rawRecords.forEach((record, index) => {
      try {
        const parsed = doctorIngestionSchema.parse(record);
        if (!parsed.id) {
          parsed.id = `DOC-${Date.now()}-${index}`;
        }
        parsedRecords.push(parsed);
      } catch (err: any) {
        errors.push({
          rowIndex: index,
          message: `Schema validation failed: ${err.message}`,
          severity: "error"
        });
      }
    });

    // Deduplicate by license number
    const { unique } = deduplicateRecords(parsedRecords, (r) => r.licenseNumber);

    for (let i = 0; i < unique.length; i += batchSize) {
      const batch = unique.slice(i, i + batchSize);
      try {
        await db.insert(fwaHighRiskDoctors).values(batch.map(r => ({
          doctorId: r.licenseNumber || r.id,
          doctorName: r.name,
          specialty: r.specialty,
          licenseNumber: r.licenseNumber,
          organization: r.providerName,
          riskScore: "0.00",
        }))).onConflictDoNothing();
        successCount += batch.length;
      } catch (err: any) {
        errors.push({
          rowIndex: i,
          message: `Batch insert failed: ${err.message}`,
          severity: "error"
        });
      }
    }

    return {
      success: successCount > 0,
      totalRecords: rawRecords.length,
      successCount,
      errorCount: errors.filter(e => e.severity === "error").length,
      errors: errors.slice(0, 100),
      processingTimeMs: Date.now() - startTime,
      batchId
    };
  } catch (error: any) {
    return {
      success: false,
      totalRecords: rawRecords.length,
      successCount: 0,
      errorCount: rawRecords.length,
      errors: [{ rowIndex: -1, message: `ETL failed: ${error.message}`, severity: "error" }],
      processingTimeMs: Date.now() - startTime,
      batchId
    };
  }
}

/**
 * Bulk insert patients
 */
export async function bulkIngestPatients(
  rawRecords: any[],
  options: { skipDuplicates?: boolean; batchSize?: number } = {}
): Promise<ETLResult> {
  const startTime = Date.now();
  const batchId = generateBatchId();
  const batchSize = options.batchSize || 100;
  const errors: ETLError[] = [];
  let successCount = 0;

  try {
    const parsedRecords: any[] = [];
    rawRecords.forEach((record, index) => {
      try {
        const parsed = patientIngestionSchema.parse(record);
        if (!parsed.id) {
          parsed.id = `PAT-${Date.now()}-${index}`;
        }
        parsedRecords.push(parsed);
      } catch (err: any) {
        errors.push({
          rowIndex: index,
          message: `Schema validation failed: ${err.message}`,
          severity: "error"
        });
      }
    });

    // Deduplicate by national ID
    const { unique } = deduplicateRecords(parsedRecords, (r) => r.nationalId);

    for (let i = 0; i < unique.length; i += batchSize) {
      const batch = unique.slice(i, i + batchSize);
      try {
        await db.insert(fwaHighRiskPatients).values(batch.map(r => ({
          patientId: r.nationalId || r.id,
          patientName: r.name,
          memberId: r.insuranceId,
          riskScore: "0.00",
        }))).onConflictDoNothing();
        successCount += batch.length;
      } catch (err: any) {
        errors.push({
          rowIndex: i,
          message: `Batch insert failed: ${err.message}`,
          severity: "error"
        });
      }
    }

    return {
      success: successCount > 0,
      totalRecords: rawRecords.length,
      successCount,
      errorCount: errors.filter(e => e.severity === "error").length,
      errors: errors.slice(0, 100),
      processingTimeMs: Date.now() - startTime,
      batchId
    };
  } catch (error: any) {
    return {
      success: false,
      totalRecords: rawRecords.length,
      successCount: 0,
      errorCount: rawRecords.length,
      errors: [{ rowIndex: -1, message: `ETL failed: ${error.message}`, severity: "error" }],
      processingTimeMs: Date.now() - startTime,
      batchId
    };
  }
}

/**
 * Get ETL job progress
 */
export function getETLProgress(batchId: string): ETLProgress | null {
  return etlProgressMap.get(batchId) || null;
}

/**
 * Refresh materialized views (call after bulk ingestion)
 */
export async function refreshMaterializedViews(): Promise<{ success: boolean; message: string }> {
  try {
    await db.execute(sql`SELECT refresh_fwa_materialized_views()`);
    return { success: true, message: "Materialized views refreshed successfully" };
  } catch (error: any) {
    console.error("[ETL] Failed to refresh materialized views:", error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Get database statistics for monitoring
 */
export async function getDatabaseStats(): Promise<{
  tableCounts: Record<string, number>;
  indexStats: any[];
  connectionPoolStats: any;
}> {
  try {
    // Table counts
    const countQueries = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM claims_v2`),
      db.execute(sql`SELECT COUNT(*) as count FROM providers`),
      db.execute(sql`SELECT COUNT(*) as count FROM doctors`),
      db.execute(sql`SELECT COUNT(*) as count FROM patients`),
      db.execute(sql`SELECT COUNT(*) as count FROM fwa_cases`),
    ]);

    const tableCounts = {
      claims: Number((countQueries[0].rows[0] as any)?.count || 0),
      providers: Number((countQueries[1].rows[0] as any)?.count || 0),
      doctors: Number((countQueries[2].rows[0] as any)?.count || 0),
      patients: Number((countQueries[3].rows[0] as any)?.count || 0),
      fwaCases: Number((countQueries[4].rows[0] as any)?.count || 0),
    };

    // Index statistics
    const indexStats = await db.execute(sql`
      SELECT 
        schemaname, tablename, indexname, 
        idx_scan, idx_tup_read, idx_tup_fetch
      FROM pg_stat_user_indexes
      ORDER BY idx_scan DESC
      LIMIT 20
    `);

    // Connection pool stats
    const connectionPoolStats = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };

    return {
      tableCounts,
      indexStats: indexStats.rows as any[],
      connectionPoolStats
    };
  } catch (error: any) {
    console.error("[ETL] Failed to get database stats:", error.message);
    return {
      tableCounts: {},
      indexStats: [],
      connectionPoolStats: {}
    };
  }
}
