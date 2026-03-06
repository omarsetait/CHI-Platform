import { db } from "../db";
import { claims, fwaFeatureStore } from "@shared/schema";
import { sql, eq, and, gte, lte } from "drizzle-orm";
import XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

interface RawClaimRow {
  BATCHNUMBER?: string;
  BATCHDATE?: string;
  CLAIMREFERENCE?: string;
  CLAIMOCCURRENCEDATE?: string;
  PATIENTID?: string;
  DATEOFBIRTH?: string;
  GENDER?: string;
  ISNEWBORN?: string | boolean;
  CHRONIC?: string | boolean;
  PREEXISTING?: string | boolean;
  POLICYNO?: string;
  POLICYEFFECTIVEDATE?: string;
  POLICYEXPIRYDATE?: string;
  GROUPNO?: string;
  PROVIDERID?: string;
  PRACTITIONERLICENSE?: string;
  SPECIALITYCODE?: string;
  CITY?: string;
  PROVIDERTYPE?: string;
  CLAIMTYPE?: string;
  CLAIMBENEFITCODE?: string;
  LENGTHOFSTAY?: number | string;
  ISPREAUTHORIZED?: string | boolean;
  AUTHORIZATIONID?: string;
  PRINCIPALDIAGNOSISCODE?: string;
  CLAIMDAIGNOSIS?: string;
  CLAIMSUPPORTINGINFO?: string;
  SERVICETYPE?: string;
  SERVICECODE?: string;
  SERVICEDESCRIPTION?: string;
  UNITPRICE?: number | string;
  RQUANTITY?: number | string;
  STATUS?: string;
  AISTATUS?: string;
  VALIDATIONRESULTS?: string;
}

function parseDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  
  const dateStr = String(value);
  
  if (typeof value === 'number') {
    const excelDate = new Date((value - 25569) * 86400 * 1000);
    if (!isNaN(excelDate.getTime())) return excelDate;
  }
  
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
  }
  
  const usMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (usMatch) {
    return new Date(parseInt(usMatch[3]), parseInt(usMatch[1]) - 1, parseInt(usMatch[2]));
  }
  
  return null;
}

function parseBoolean(value: any): boolean {
  if (value === true || value === "true" || value === "1" || value === 1 || value === "Yes" || value === "yes") {
    return true;
  }
  return false;
}

function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = parseFloat(String(value).replace(/[^0-9.-]/g, ""));
  return isNaN(num) ? null : num;
}

export async function importClaimsFromExcel(filePath: string, sourceFileName: string): Promise<{
  imported: number;
  errors: number;
  duplicates: number;
}> {
  console.log(`Starting claims import from: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawData: RawClaimRow[] = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`Found ${rawData.length} rows in Excel file`);
  
  let imported = 0;
  let errors = 0;
  let duplicates = 0;
  
  const batchSize = 100;
  
  for (let i = 0; i < rawData.length; i += batchSize) {
    const batch = rawData.slice(i, i + batchSize);
    
    for (const row of batch) {
      try {
        if (!row.CLAIMREFERENCE || !row.PATIENTID || !row.PROVIDERID) {
          errors++;
          continue;
        }
        
        const existing = await db.select({ id: claims.id })
          .from(claims)
          .where(eq(claims.claimNumber, String(row.CLAIMREFERENCE)))
          .limit(1);
        
        if (existing.length > 0) {
          duplicates++;
          continue;
        }
        
        const unitPrice = parseNumber(row.UNITPRICE);
        const quantity = parseNumber(row.RQUANTITY) || 1;
        const totalAmount = unitPrice ? unitPrice * quantity : null;
        
        await db.insert(claims).values({
          claimNumber: String(row.CLAIMREFERENCE),
          memberId: String(row.PATIENTID),
          isNewborn: parseBoolean(row.ISNEWBORN),
          isChronic: parseBoolean(row.CHRONIC),
          isPreExisting: parseBoolean(row.PREEXISTING),
          policyEffectiveDate: row.POLICYEFFECTIVEDATE ? String(row.POLICYEFFECTIVEDATE) : null,
          policyExpiryDate: row.POLICYEXPIRYDATE ? String(row.POLICYEXPIRYDATE) : null,
          groupNo: row.GROUPNO ? String(row.GROUPNO) : null,
          providerId: String(row.PROVIDERID),
          practitionerId: row.PRACTITIONERLICENSE ? String(row.PRACTITIONERLICENSE) : null,
          specialty: row.SPECIALITYCODE ? String(row.SPECIALITYCODE) : null,
          city: row.CITY ? String(row.CITY) : null,
          providerType: row.PROVIDERTYPE ? String(row.PROVIDERTYPE) : null,
          claimType: row.CLAIMTYPE ? String(row.CLAIMTYPE) : "unknown",
          serviceDate: parseDate(row.CLAIMOCCURRENCEDATE) ?? new Date(),
          registrationDate: parseDate(row.BATCHDATE) ?? new Date(),
          lengthOfStay: parseNumber(row.LENGTHOFSTAY) as number | null,
          isPreAuthorized: parseBoolean(row.ISPREAUTHORIZED),
          primaryDiagnosis: row.PRINCIPALDIAGNOSISCODE ? String(row.PRINCIPALDIAGNOSISCODE) : "unknown",
          cptCodes: row.SERVICECODE ? [String(row.SERVICECODE)] : null,
          description: row.SERVICEDESCRIPTION ? String(row.SERVICEDESCRIPTION) : null,
          amount: totalAmount ? String(totalAmount) : "0",
          status: row.STATUS ? String(row.STATUS) : "pending",
        });
        
        imported++;
      } catch (error) {
        console.error(`Error importing row:`, error);
        errors++;
      }
    }
    
    console.log(`Progress: ${Math.min(i + batchSize, rawData.length)}/${rawData.length} rows processed`);
  }
  
  console.log(`Import complete: ${imported} imported, ${duplicates} duplicates, ${errors} errors`);
  
  return { imported, errors, duplicates };
}

export async function computeFeatureStore(): Promise<{ providers: number; patients: number; doctors: number }> {
  console.log("Computing feature store from analyzed claims...");
  
  const now = new Date();
  const periodStart = new Date(now.getFullYear() - 1, now.getMonth(), 1);
  const periodEnd = now;
  
  const providerStats = await db.execute(sql`
    SELECT 
      provider_id as entity_id,
      COUNT(*) as claim_count,
      SUM(COALESCE(amount::numeric, 0)) as total_amount,
      AVG(COALESCE(amount::numeric, 0)) as avg_claim_amount,
      MAX(COALESCE(amount::numeric, 0)) as max_claim_amount,
      COUNT(DISTINCT member_id) as unique_patients,
      COUNT(DISTINCT primary_diagnosis) as unique_diagnoses,
      COUNT(DISTINCT unnest_code) as unique_services,
      AVG(COALESCE(length_of_stay, 0)) as avg_length_of_stay,
      specialty || '-' || COALESCE(city, 'Unknown') || '-' || COALESCE(provider_type, 'Unknown') as peer_group_id,
      SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0) as rejection_rate
    FROM claims_v2 LEFT JOIN LATERAL unnest(cpt_codes) as unnest_code ON true
    GROUP BY provider_id, specialty, city, provider_type
    HAVING COUNT(*) >= 1
  `);
  
  let providerCount = 0;
  for (const row of providerStats.rows as any[]) {
    try {
      await db.insert(fwaFeatureStore).values({
        entityType: "provider",
        entityId: row.entity_id,
        periodStart,
        periodEnd,
        claimCount: parseInt(row.claim_count) || 0,
        totalAmount: row.total_amount ? String(row.total_amount) : "0",
        avgClaimAmount: row.avg_claim_amount ? String(row.avg_claim_amount) : "0",
        maxClaimAmount: row.max_claim_amount ? String(row.max_claim_amount) : "0",
        uniquePatients: parseInt(row.unique_patients) || 0,
        uniqueDiagnoses: parseInt(row.unique_diagnoses) || 0,
        uniqueServices: parseInt(row.unique_services) || 0,
        avgLengthOfStay: row.avg_length_of_stay ? String(row.avg_length_of_stay) : "0",
        peerGroupId: row.peer_group_id,
        rejectionRate: row.rejection_rate ? String(row.rejection_rate) : "0"
      });
      providerCount++;
    } catch (e) {
      console.error("Error inserting provider feature:", e);
    }
  }
  
  const patientStats = await db.execute(sql`
    SELECT 
      member_id as entity_id,
      COUNT(*) as claim_count,
      SUM(COALESCE(amount::numeric, 0)) as total_amount,
      AVG(COALESCE(amount::numeric, 0)) as avg_claim_amount,
      MAX(COALESCE(amount::numeric, 0)) as max_claim_amount,
      COUNT(DISTINCT provider_id) as unique_providers,
      COUNT(DISTINCT primary_diagnosis) as unique_diagnoses,
      COUNT(DISTINCT unnest_code) as unique_services,
      AVG(COALESCE(length_of_stay, 0)) as avg_length_of_stay,
      SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0) as rejection_rate
    FROM claims_v2 LEFT JOIN LATERAL unnest(cpt_codes) as unnest_code ON true
    GROUP BY member_id
    HAVING COUNT(*) >= 1
  `);
  
  let patientCount = 0;
  for (const row of patientStats.rows as any[]) {
    try {
      await db.insert(fwaFeatureStore).values({
        entityType: "patient",
        entityId: row.entity_id,
        periodStart,
        periodEnd,
        claimCount: parseInt(row.claim_count) || 0,
        totalAmount: row.total_amount ? String(row.total_amount) : "0",
        avgClaimAmount: row.avg_claim_amount ? String(row.avg_claim_amount) : "0",
        maxClaimAmount: row.max_claim_amount ? String(row.max_claim_amount) : "0",
        uniqueProviders: parseInt(row.unique_providers) || 0,
        uniqueDiagnoses: parseInt(row.unique_diagnoses) || 0,
        uniqueServices: parseInt(row.unique_services) || 0,
        avgLengthOfStay: row.avg_length_of_stay ? String(row.avg_length_of_stay) : "0",
        rejectionRate: row.rejection_rate ? String(row.rejection_rate) : "0"
      });
      patientCount++;
    } catch (e) {
      console.error("Error inserting patient feature:", e);
    }
  }
  
  const doctorStats = await db.execute(sql`
    SELECT 
      practitioner_id as entity_id,
      COUNT(*) as claim_count,
      SUM(COALESCE(amount::numeric, 0)) as total_amount,
      AVG(COALESCE(amount::numeric, 0)) as avg_claim_amount,
      MAX(COALESCE(amount::numeric, 0)) as max_claim_amount,
      COUNT(DISTINCT member_id) as unique_patients,
      COUNT(DISTINCT provider_id) as unique_providers,
      COUNT(DISTINCT primary_diagnosis) as unique_diagnoses,
      specialty as peer_group_id,
      SUM(CASE WHEN status = 'Rejected' THEN 1 ELSE 0 END)::numeric / NULLIF(COUNT(*), 0) as rejection_rate
    FROM claims_v2
    WHERE practitioner_id IS NOT NULL
    GROUP BY practitioner_id, specialty
    HAVING COUNT(*) >= 1
  `);
  
  let doctorCount = 0;
  for (const row of doctorStats.rows as any[]) {
    try {
      await db.insert(fwaFeatureStore).values({
        entityType: "doctor",
        entityId: row.entity_id,
        periodStart,
        periodEnd,
        claimCount: parseInt(row.claim_count) || 0,
        totalAmount: row.total_amount ? String(row.total_amount) : "0",
        avgClaimAmount: row.avg_claim_amount ? String(row.avg_claim_amount) : "0",
        maxClaimAmount: row.max_claim_amount ? String(row.max_claim_amount) : "0",
        uniquePatients: parseInt(row.unique_patients) || 0,
        uniqueProviders: parseInt(row.unique_providers) || 0,
        uniqueDiagnoses: parseInt(row.unique_diagnoses) || 0,
        peerGroupId: row.peer_group_id,
        rejectionRate: row.rejection_rate ? String(row.rejection_rate) : "0"
      });
      doctorCount++;
    } catch (e) {
      console.error("Error inserting doctor feature:", e);
    }
  }
  
  console.log(`Feature store computed: ${providerCount} providers, ${patientCount} patients, ${doctorCount} doctors`);
  
  await computePeerComparisons();
  
  return { providers: providerCount, patients: patientCount, doctors: doctorCount };
}

async function computePeerComparisons(): Promise<void> {
  console.log("Computing peer comparisons and z-scores...");
  
  await db.execute(sql`
    WITH peer_stats AS (
      SELECT 
        peer_group_id,
        entity_type,
        AVG(avg_claim_amount::numeric) as peer_mean,
        STDDEV(avg_claim_amount::numeric) as peer_std_dev,
        COUNT(*) as peer_count
      FROM fwa_feature_store
      WHERE peer_group_id IS NOT NULL
      GROUP BY peer_group_id, entity_type
      HAVING COUNT(*) >= 2
    )
    UPDATE fwa_feature_store fs
    SET 
      peer_mean = ps.peer_mean,
      peer_std_dev = ps.peer_std_dev,
      z_score = CASE 
        WHEN ps.peer_std_dev > 0 THEN (fs.avg_claim_amount::numeric - ps.peer_mean) / ps.peer_std_dev
        ELSE 0
      END,
      percentile_rank = (
        SELECT PERCENT_RANK() OVER (PARTITION BY fs2.peer_group_id ORDER BY fs2.avg_claim_amount::numeric) * 100
        FROM fwa_feature_store fs2 
        WHERE fs2.id = fs.id
      )
    FROM peer_stats ps
    WHERE fs.peer_group_id = ps.peer_group_id AND fs.entity_type = ps.entity_type
  `);
  
  console.log("Peer comparisons computed");
}

export async function getClaimStats(): Promise<{
  totalClaims: number;
  uniqueProviders: number;
  uniquePatients: number;
  uniqueDoctors: number;
  totalAmount: number;
  avgAmount: number;
  dateRange: { start: Date | null; end: Date | null };
}> {
  const stats = await db.execute(sql`
    SELECT 
      COUNT(*) as total_claims,
      COUNT(DISTINCT provider_id) as unique_providers,
      COUNT(DISTINCT member_id) as unique_patients,
      COUNT(DISTINCT practitioner_id) as unique_doctors,
      SUM(COALESCE(amount::numeric, 0)) as total_amount,
      AVG(COALESCE(amount::numeric, 0)) as avg_amount,
      MIN(service_date) as min_date,
      MAX(service_date) as max_date
    FROM claims_v2
  `);
  
  const row = stats.rows[0] as any;
  
  return {
    totalClaims: parseInt(row.total_claims) || 0,
    uniqueProviders: parseInt(row.unique_providers) || 0,
    uniquePatients: parseInt(row.unique_patients) || 0,
    uniqueDoctors: parseInt(row.unique_doctors) || 0,
    totalAmount: parseFloat(row.total_amount) || 0,
    avgAmount: parseFloat(row.avg_amount) || 0,
    dateRange: {
      start: row.min_date ? new Date(row.min_date) : null,
      end: row.max_date ? new Date(row.max_date) : null
    }
  };
}
