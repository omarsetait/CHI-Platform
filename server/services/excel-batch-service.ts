import XLSX from 'xlsx';
import { db } from '../db';
import { claims, fwaDetectionResults, fwaDetectionRuns, fwaBatches } from '@shared/schema';
import { sql, eq } from 'drizzle-orm';
import { runProductionDetection, AnalyzedClaimData } from './production-detection-engine';
import { runEntityDetectionForBatch, refresh360ForBatch } from './entity-detection-service';
import { nanoid } from 'nanoid';

interface ExcelClaimRow {
  BATCHNUMBER: number;
  BATCHDATE: number;
  CLAIMREFERENCE: number | string;
  PROVIDERID: string;
  PATIENTID: string;
  DATEOFBIRTH: number;
  GENDER: string;
  CLAIMOCCURRENCEDATE: number;
  PRINCIPALDIAGNOSISCODE: string;
  SECONDARYDIAGNOSISCODES: string;
  POLICYNO: string;
  PRACTITIONERLICENSE: number | string;
  SPECIALITYCODE: number | string;
  CLAIMBENEFITCODE: string;
  LENGTHOFSTAY: number;
  CLAIMSUPPORTINGINFO: string;
  SERVICETYPE: string;
  SERVICECODE: string;
  TYPE: string;
  INTERNALSERVICECODE: string;
  SERVICEDESCRIPTION: string;
  PROVIDERSERVICEDESCRIPTION: string;
  STARTDATE: number;
  DURATION: number;
  UNITPRICE: number;
  PATIENTSHARELC: number;
  LISTEDSERVICECODE: number;
  LISTEDSERVICEDESC: string;
  TACHYACTIVITYTYPE: string;
  ISUNLISTEDSERVICE: number;
  ISAUTOMAPPEDSERVICE: number;
  MAPPINGSOURCE: string;
  PRIMARYDIAGNOSISCM: string;
  SECONDARYICDSCM: string;
  AIDIAGNOSIS: string;
  AIDIAGNOSISCM: string;
  CLAIMDAIGNOSIS: string;
  STATUS: string;
  AISTATUS: string;
  VALIDATIONRESULTS: string;
  AIVALIDATIONRESULTS: string;
  ID: number;
  POLICYEFFECTIVEDATE: number;
  POLICYEXPIRYDATE: number;
  ISNEWBORN: number;
  CHRONIC: string;
  PREEXISTING: boolean;
  APPROVALID: string;
  GROUPNO: number;
  CITY: string;
  ISPREAUTHORIZED: number;
  AUTHORIZATIONID: number;
  CLAIMTYPE: string;
  PROVIDERTYPE: string;
  RQUANTITY: number;
  SERVICELINENO: number;
}

export interface BatchUploadResult {
  success: boolean;
  batchId: string;
  totalRows: number;
  claimsInserted: number;
  claimsDetected: number;
  errors: Array<{ row: number; message: string }>;
  detectionSummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  processingTimeMs: number;
}

export interface BatchProgressUpdate {
  batchId: string;
  stage: string;
  progress: number;
  currentRow?: number;
  totalRows?: number;
  message: string;
}

const batchProgressMap = new Map<string, BatchProgressUpdate>();

export function getBatchProgress(batchId: string): BatchProgressUpdate | undefined {
  return batchProgressMap.get(batchId);
}

function excelDateToJSDate(serial: number): Date | null {
  if (!serial || serial <= 0) return null;
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  return new Date(utc_value * 1000);
}

const DEFAULT_WEIGHTS = {
  rule_engine: 0.35,
  statistical_learning: 0.25,
  unsupervised_learning: 0.20,
  rag_llm: 0.20
};

export async function processExcelBatch(
  filePath: string,
  batchName: string,
  options: {
    runDetection?: boolean;
    maxClaims?: number;
    skipDuplicates?: boolean;
  } = {}
): Promise<BatchUploadResult> {
  const startTime = Date.now();
  const batchId = nanoid();
  const errors: Array<{ row: number; message: string }> = [];
  
  const { runDetection = true, maxClaims = 10000, skipDuplicates = true } = options;
  
  batchProgressMap.set(batchId, {
    batchId,
    stage: 'parsing',
    progress: 0,
    message: 'Reading Excel file...'
  });

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<ExcelClaimRow>(sheet);
    
    const totalRows = Math.min(rawData.length, maxClaims);
    
    batchProgressMap.set(batchId, {
      batchId,
      stage: 'parsing',
      progress: 10,
      totalRows,
      message: `Parsed ${totalRows} rows from Excel file`
    });

    await db.insert(fwaBatches).values({
      batchName: batchName,
      fileName: filePath.split('/').pop() || 'upload.xlsx',
      fileSize: 0,
      status: 'processing',
      totalClaims: totalRows,
      processedClaims: 0,
      flaggedClaims: 0,
      uploadedBy: 'System',
      progress: '10'
    });

    let claimsInserted = 0;
    let claimsDetected = 0;
    const detectionSummary = { critical: 0, high: 0, medium: 0, low: 0 };
    const insertedClaimIds: string[] = [];

    batchProgressMap.set(batchId, {
      batchId,
      stage: 'inserting',
      progress: 15,
      currentRow: 0,
      totalRows,
      message: 'Inserting claims into database...'
    });

    for (let i = 0; i < totalRows; i++) {
      const row = rawData[i];
      
      try {
        const claimRef = String(row.CLAIMREFERENCE || `CLM-${batchId}-${i}`).trim();
        
        if (skipDuplicates) {
          const existing = await db.select({ id: claims.id })
            .from(claims)
            .where(eq(claims.claimNumber, claimRef))
            .limit(1);

          if (existing.length > 0) {
            continue;
          }
        }

        const unitPrice = Number(row.UNITPRICE) || 0;
        const quantity = Number(row.RQUANTITY) || 1;
        const totalAmount = unitPrice * quantity;
        
        const result = await db.insert(claims).values({
          claimNumber: claimRef,
          memberId: String(row.PATIENTID || 'UNKNOWN').trim(),
          isNewborn: row.ISNEWBORN === 1,
          isChronic: row.CHRONIC === 'Yes',
          isPreExisting: row.PREEXISTING === true,
          policyEffectiveDate: excelDateToJSDate(row.POLICYEFFECTIVEDATE)?.toISOString().split('T')[0] ?? null,
          policyExpiryDate: excelDateToJSDate(row.POLICYEXPIRYDATE)?.toISOString().split('T')[0] ?? null,
          groupNo: String(row.GROUPNO || ''),
          providerId: String(row.PROVIDERID || 'UNKNOWN').trim(),
          practitionerId: String(row.PRACTITIONERLICENSE || ''),
          specialty: String(row.SPECIALITYCODE || ''),
          city: row.CITY || null,
          providerType: row.PROVIDERTYPE || null,
          claimType: row.CLAIMTYPE || row.CLAIMBENEFITCODE || 'unknown',
          serviceDate: excelDateToJSDate(row.CLAIMOCCURRENCEDATE) ?? new Date(),
          registrationDate: excelDateToJSDate(row.STARTDATE) ?? new Date(),
          lengthOfStay: row.LENGTHOFSTAY || null,
          isPreAuthorized: row.ISPREAUTHORIZED === 1,
          cptCodes: row.SERVICECODE ? [row.SERVICECODE] : null,
          description: row.SERVICEDESCRIPTION || row.PROVIDERSERVICEDESCRIPTION || null,
          amount: String(totalAmount),
          primaryDiagnosis: row.PRINCIPALDIAGNOSISCODE || 'unknown',
          icdCodes: row.SECONDARYDIAGNOSISCODES ? [row.SECONDARYDIAGNOSISCODES] : null,
          status: row.STATUS || "pending",
        }).returning({ id: claims.id });
        
        if (result.length > 0) {
          insertedClaimIds.push(result[0].id);
        }
        claimsInserted++;
        
        if (claimsInserted % 100 === 0) {
          const progress = 15 + Math.floor((i / totalRows) * 35);
          batchProgressMap.set(batchId, {
            batchId,
            stage: 'inserting',
            progress,
            currentRow: i,
            totalRows,
            message: `Inserted ${claimsInserted} claims...`
          });
        }
        
      } catch (insertError: any) {
        errors.push({ row: i + 2, message: insertError.message || 'Insert failed' });
      }
    }

    batchProgressMap.set(batchId, {
      batchId,
      stage: 'inserting',
      progress: 50,
      message: `Inserted ${claimsInserted} claims. Starting FWA detection...`
    });

    if (runDetection && insertedClaimIds.length > 0) {
      const runResult = await db.insert(fwaDetectionRuns).values({
        runName: `Batch Upload ${batchName}`,
        runType: 'batch',
        status: 'running',
        batchId: batchId,
        totalClaims: insertedClaimIds.length,
        processedClaims: 0,
        flaggedClaims: 0,
        startedAt: new Date()
      }).returning({ id: fwaDetectionRuns.id });

      const runId = runResult.length > 0 ? runResult[0].id : nanoid();

      batchProgressMap.set(batchId, {
        batchId,
        stage: 'detecting',
        progress: 55,
        currentRow: 0,
        totalRows: insertedClaimIds.length,
        message: 'Running 4-method FWA detection...'
      });

      for (let i = 0; i < insertedClaimIds.length; i++) {
        const claimId = insertedClaimIds[i];
        
        try {
          const claimData = await db.select().from(claims)
            .where(eq(claims.id, claimId))
            .limit(1);

          if (claimData.length === 0) continue;

          const claim = claimData[0];
          const analyzedClaim: AnalyzedClaimData = {
            id: claim.id,
            claimNumber: claim.claimNumber || "",
            providerId: claim.providerId || "",
            memberId: claim.memberId || "",
            practitionerId: claim.practitionerId,
            specialty: claim.specialty,
            city: claim.city,
            providerType: claim.providerType,
            unitPrice: null,
            amount: claim.amount ? parseFloat(claim.amount) : 0,
            quantity: null,
            primaryDiagnosis: claim.primaryDiagnosis,
            cptCodes: claim.cptCodes,
            description: claim.description,
            claimType: claim.claimType,
            lengthOfStay: claim.lengthOfStay,
            status: claim.status,
            isPreAuthorized: claim.isPreAuthorized || false
          };

          const detection = await runProductionDetection(analyzedClaim, DEFAULT_WEIGHTS, true);
          
          await db.insert(fwaDetectionResults).values({
            claimId: claimId,
            providerId: claim.providerId,
            patientId: claim.memberId,
            compositeScore: String(detection.compositeScore),
            compositeRiskLevel: detection.compositeRiskLevel as any,
            ruleEngineScore: String(detection.ruleEngineScore),
            statisticalScore: String(detection.statisticalScore),
            unsupervisedScore: String(detection.unsupervisedScore),
            ragLlmScore: String(detection.ragLlmScore),
            ruleEngineFindings: detection.ruleEngineFindings,
            statisticalFindings: detection.statisticalFindings,
            unsupervisedFindings: detection.unsupervisedFindings,
            ragLlmFindings: detection.ragLlmFindings,
            primaryDetectionMethod: detection.primaryDetectionMethod as any,
            detectionSummary: detection.detectionSummary,
            recommendedAction: detection.recommendedAction,
            processingTimeMs: detection.processingTimeMs,
            analyzedAt: new Date()
          });
          
          claimsDetected++;
          
          switch (detection.compositeRiskLevel) {
            case 'critical': detectionSummary.critical++; break;
            case 'high': detectionSummary.high++; break;
            case 'medium': detectionSummary.medium++; break;
            default: detectionSummary.low++;
          }
          
          if (claimsDetected % 50 === 0) {
            const progress = 55 + Math.floor((i / insertedClaimIds.length) * 40);
            batchProgressMap.set(batchId, {
              batchId,
              stage: 'detecting',
              progress,
              currentRow: i,
              totalRows: insertedClaimIds.length,
              message: `Analyzed ${claimsDetected} claims. Found ${detectionSummary.critical + detectionSummary.high} high-risk...`
            });
          }
          
        } catch (detectionError: any) {
          console.error(`Detection error for claim ${claimId}:`, detectionError.message);
          errors.push({ row: i, message: `Detection failed: ${detectionError.message}` });
        }
      }

      await db.update(fwaDetectionRuns)
        .set({
          status: 'completed',
          processedClaims: claimsDetected,
          flaggedClaims: detectionSummary.critical + detectionSummary.high,
          completedAt: new Date()
        })
        .where(eq(fwaDetectionRuns.id, runId));
    }

    // Phase 3: Entity-Level Detection and 360 Refresh
    batchProgressMap.set(batchId, {
      batchId,
      stage: 'entity_detection',
      progress: 95,
      message: 'Running entity-level detection for providers, doctors, patients...'
    });
    
    try {
      console.log(`[Batch Upload] Running entity-level detection for batch ${batchId}...`);
      
      // Run entity-level 4-method detection for all entities in this batch
      const entityDetectionResult = await runEntityDetectionForBatch(batchId);
      console.log(`[Batch Upload] Entity detection complete:`, entityDetectionResult);
      
      // Refresh 360 perspectives for impacted entities
      batchProgressMap.set(batchId, {
        batchId,
        stage: 'refresh_360',
        progress: 98,
        message: 'Refreshing 360 perspectives for providers, doctors, patients...'
      });
      
      const refresh360Result = await refresh360ForBatch(batchId);
      console.log(`[Batch Upload] 360 refresh complete:`, refresh360Result);
      
    } catch (entityError: any) {
      console.error(`[Batch Upload] Entity detection/360 refresh error:`, entityError.message);
      // Don't fail the whole batch - entity detection is a secondary process
    }

    await db.execute(sql`
      UPDATE fwa_batches 
      SET status = 'completed', 
          processed_claims = ${claimsInserted},
          flagged_claims = ${detectionSummary.critical + detectionSummary.high},
          progress = '100',
          completed_at = NOW()
      WHERE batch_name = ${batchName}
    `);

    batchProgressMap.set(batchId, {
      batchId,
      stage: 'completed',
      progress: 100,
      message: `Complete! Inserted ${claimsInserted} claims, detected ${detectionSummary.critical + detectionSummary.high} high-risk.`
    });

    return {
      success: true,
      batchId,
      totalRows,
      claimsInserted,
      claimsDetected,
      errors,
      detectionSummary,
      processingTimeMs: Date.now() - startTime
    };
    
  } catch (error: any) {
    console.error('Batch processing failed:', error);

    batchProgressMap.set(batchId, {
      batchId,
      stage: 'failed',
      progress: 0,
      message: `Failed: ${error.message}`
    });

    return {
      success: false,
      batchId,
      totalRows: 0,
      claimsInserted: 0,
      claimsDetected: 0,
      errors: [{ row: 0, message: error.message }],
      detectionSummary: { critical: 0, high: 0, medium: 0, low: 0 },
      processingTimeMs: Date.now() - startTime
    };
  }
}

export async function processAttachedExcel(
  fileName: string,
  batchName?: string,
  options?: { runDetection?: boolean; maxClaims?: number }
): Promise<BatchUploadResult> {
  const filePath = `attached_assets/${fileName}`;
  const name = batchName || fileName.replace(/\.[^/.]+$/, '');
  return processExcelBatch(filePath, name, options);
}
