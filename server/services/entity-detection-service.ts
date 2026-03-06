import { db } from "../db";
import {
  claims,
  fwaDetectionResults,
  provider360,
  patient360,
  doctor360,
  fwaProviderDetectionResults,
  fwaDoctorDetectionResults,
  fwaPatientDetectionResults,
  fwaProviderTimeline,
  fwaDoctorTimeline,
  fwaPatientTimeline,
  fwaRulesLibrary,
  fwaBehaviors,
  fwaFeatureStore,
  fwaAnomalyClusters
} from "@shared/schema";
import { eq, sql, and, desc, count, avg, sum, inArray, isNotNull } from "drizzle-orm";
import { getDetectionThresholds, AllThresholds } from "./detection-threshold-service";
import { getSemanticMatch } from "./semantic-embedding-service";

const ENTITY_DETECTION_WEIGHTS = {
  rule_engine: 0.30,
  statistical_learning: 0.22,
  unsupervised_learning: 0.18,
  rag_llm: 0.15,
  semantic_validation: 0.15
};

function getRiskLevel(score: number): "critical" | "high" | "medium" | "low" | "minimal" {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  if (score >= 20) return "low";
  return "minimal";
}

function getPrimaryMethod(scores: { rule: number; statistical: number; unsupervised: number; rag: number; semantic: number }): string {
  const methods = [
    { name: "rule_engine", score: scores.rule * ENTITY_DETECTION_WEIGHTS.rule_engine },
    { name: "statistical_learning", score: scores.statistical * ENTITY_DETECTION_WEIGHTS.statistical_learning },
    { name: "unsupervised_learning", score: scores.unsupervised * ENTITY_DETECTION_WEIGHTS.unsupervised_learning },
    { name: "rag_llm", score: scores.rag * ENTITY_DETECTION_WEIGHTS.rag_llm },
    { name: "semantic_validation", score: scores.semantic * ENTITY_DETECTION_WEIGHTS.semantic_validation }
  ];
  return methods.sort((a, b) => b.score - a.score)[0].name;
}

interface EntityMetrics {
  totalClaims: number;
  totalAmount: number;
  avgClaimAmount: number;
  flaggedClaimsCount: number;
  flaggedClaimsPercent: number;
  highRiskClaimsCount: number;
  topProcedureCodes: Array<{ code: string; count: number; amount: number }>;
  topDiagnosisCodes: Array<{ code: string; count: number }>;
}

async function getPopulationStats(entityType: "provider" | "doctor" | "patient"): Promise<{
  avgClaimAmount: number;
  stdDevClaimAmount: number;
  avgClaimsPerEntity: number;
  p90ClaimAmount: number;
  p95ClaimAmount: number;
  hasData: boolean;
}> {
  const groupColumn = entityType === "provider" ? "provider_id" :
                      entityType === "doctor" ? "practitioner_id" : "member_id";
  
  const stats = await db.execute(sql`
    SELECT 
      AVG(COALESCE(amount::numeric, 0)) as avg_amount,
      STDDEV(COALESCE(amount::numeric, 0)) as std_dev_amount,
      PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY COALESCE(amount::numeric, 0)) as p90,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY COALESCE(amount::numeric, 0)) as p95,
      COUNT(DISTINCT ${sql.raw(groupColumn)}) as entity_count,
      COUNT(*) as total_claims
    FROM claims_v2
    WHERE amount IS NOT NULL
  `);
  
  const row = stats.rows[0] as any;
  const entityCount = parseInt(row?.entity_count) || 0;
  const totalClaims = parseInt(row?.total_claims) || 0;
  const hasData = totalClaims >= 10;
  
  if (!hasData) {
    return {
      avgClaimAmount: 0,
      stdDevClaimAmount: 0,
      avgClaimsPerEntity: 0,
      p90ClaimAmount: 0,
      p95ClaimAmount: 0,
      hasData: false
    };
  }
  
  // Only return hasData=true if we have actual std dev data
  const stdDev = parseFloat(row?.std_dev_amount);
  const avgAmount = parseFloat(row?.avg_amount) || 0;
  
  return {
    avgClaimAmount: avgAmount,
    stdDevClaimAmount: !isNaN(stdDev) ? stdDev : 0, // No hardcoded fallback
    avgClaimsPerEntity: entityCount > 0 ? totalClaims / entityCount : 0,
    p90ClaimAmount: parseFloat(row?.p90) || 0,
    p95ClaimAmount: parseFloat(row?.p95) || 0,
    hasData: avgAmount > 0 && !isNaN(stdDev) && stdDev > 0
  };
}

async function getProviderPeerBaseline(providerId: string): Promise<{
  peerGroupId: string;
  peerCount: number;
  peerAvgClaimAmount: number;
  peerAvgClaimsPerMonth: number;
  peerDenialRate: number;
  peerApprovalRate: number;
  hasData: boolean;
}> {
  const providerContext = await db.select().from(provider360)
    .where(eq(provider360.providerId, providerId))
    .limit(1);
  
  if (providerContext[0]?.peerGroupId) {
    const peerGroupId = providerContext[0].peerGroupId;
    const benchmarks = providerContext[0].specialtyBenchmarks as any;
    
    if (benchmarks && benchmarks.peerAvgClaimAmount > 0) {
      return {
        peerGroupId,
        peerCount: (providerContext[0].peerRanking as any)?.totalPeers || 0,
        peerAvgClaimAmount: benchmarks.peerAvgClaimAmount || 0,
        peerAvgClaimsPerMonth: (benchmarks.peerAvgClaimsPerPatient || 0) * 30,
        peerDenialRate: 1 - (benchmarks.peerApprovalRate || 0),
        peerApprovalRate: benchmarks.peerApprovalRate || 0,
        hasData: true
      };
    }
  }
  
  const specialty = providerContext[0]?.specialty || "general";
  const region = providerContext[0]?.region || "default";
  const peerGroupId = `${specialty}-${region}`;
  
  const peerStats = await db.execute(sql`
    SELECT 
      COUNT(DISTINCT p.provider_id) as peer_count,
      AVG((p.claims_summary::jsonb->>'avgClaimAmount')::numeric) as avg_claim,
      AVG((p.claims_summary::jsonb->>'denialRate')::numeric) as denial_rate
    FROM provider_360 p
    WHERE p.specialty = ${specialty}
    AND (p.claims_summary::jsonb->>'avgClaimAmount')::numeric > 0
  `);
  
  const peerRow = peerStats.rows[0] as any;
  const peerCount = parseInt(peerRow?.peer_count) || 0;
  const hasData = peerCount >= 3;
  
  if (!hasData) {
    // Compute from global claims data - no hardcoded defaults
    const globalStats = await db.execute(sql`
      SELECT 
        AVG(COALESCE(amount::numeric, 0)) as avg_amount,
        COUNT(*) / NULLIF(COUNT(DISTINCT provider_id), 0) as claims_per_provider,
        AVG(CASE WHEN status = 'denied' THEN 1.0 ELSE 0.0 END) as denial_rate
      FROM claims_v2
      WHERE amount IS NOT NULL
    `);
    const globalRow = globalStats.rows[0] as any;
    const avgAmount = parseFloat(globalRow?.avg_amount) || 0;
    const denialRate = parseFloat(globalRow?.denial_rate) || 0;
    
    return {
      peerGroupId: "global",
      peerCount: 0,
      peerAvgClaimAmount: avgAmount,
      peerAvgClaimsPerMonth: parseFloat(globalRow?.claims_per_provider) || 0,
      peerDenialRate: denialRate,
      peerApprovalRate: 1 - denialRate,
      hasData: avgAmount > 0
    };
  }
  
  return {
    peerGroupId,
    peerCount,
    peerAvgClaimAmount: parseFloat(peerRow?.avg_claim) || 0,
    peerAvgClaimsPerMonth: 0,
    peerDenialRate: parseFloat(peerRow?.denial_rate) || 0,
    peerApprovalRate: 1 - (parseFloat(peerRow?.denial_rate) || 0),
    hasData: true
  };
}

async function getDoctorPeerBaseline(doctorId: string): Promise<{
  specialty: string;
  peerCount: number;
  peerAvgClaimAmount: number;
  peerAvgPatientsPerDay: number;
  peerAvgProceduresPerPatient: number;
  hasData: boolean;
}> {
  const doctorContext = await db.select().from(doctor360)
    .where(eq(doctor360.doctorId, doctorId))
    .limit(1);
  
  const specialty = doctorContext[0]?.specialty || "general";
  const peerComparison = doctorContext[0]?.peerComparison as any;
  
  if (peerComparison && peerComparison.specialtyAvgClaim > 0) {
    return {
      specialty,
      peerCount: peerComparison.peerGroupSize || 0,
      peerAvgClaimAmount: peerComparison.specialtyAvgClaim || 0,
      peerAvgPatientsPerDay: (doctorContext[0]?.practicePatterns as any)?.avgPatientsPerDay || 0,
      peerAvgProceduresPerPatient: 0,
      hasData: true
    };
  }
  
  // Compute from actual claims data instead of using hardcoded fallbacks
  const peerStats = await db.execute(sql`
    SELECT 
      COUNT(DISTINCT d.doctor_id) as peer_count,
      AVG((d.peer_comparison::jsonb->>'specialtyAvgClaim')::numeric) as avg_claim,
      AVG((d.practice_patterns::jsonb->>'avgPatientsPerDay')::numeric) as avg_patients
    FROM doctor_360 d
    WHERE d.specialty = ${specialty}
    AND (d.peer_comparison::jsonb->>'specialtyAvgClaim')::numeric > 0
  `);
  
  const peerRow = peerStats.rows[0] as any;
  const peerCount = parseInt(peerRow?.peer_count) || 0;
  const hasData = peerCount >= 3;
  
  if (!hasData) {
    // Compute baseline from global claims data
    const globalStats = await db.execute(sql`
      SELECT 
        AVG(COALESCE(amount::numeric, 0)) as avg_amount,
        COUNT(*) / NULLIF(COUNT(DISTINCT practitioner_id), 0) as claims_per_doctor
      FROM claims_v2
      WHERE practitioner_id IS NOT NULL AND amount IS NOT NULL
    `);
    const globalRow = globalStats.rows[0] as any;
    
    return {
      specialty,
      peerCount: 0,
      peerAvgClaimAmount: parseFloat(globalRow?.avg_amount) || 0,
      peerAvgPatientsPerDay: 0,
      peerAvgProceduresPerPatient: 0,
      hasData: parseFloat(globalRow?.avg_amount) > 0
    };
  }
  
  return {
    specialty,
    peerCount,
    peerAvgClaimAmount: parseFloat(peerRow?.avg_claim) || 0,
    peerAvgPatientsPerDay: parseFloat(peerRow?.avg_patients) || 0,
    peerAvgProceduresPerPatient: 0,
    hasData: true
  };
}

async function getPatientPeerBaseline(patientId: string): Promise<{
  cohortId: string;
  cohortSize: number;
  cohortAvgClaimsPerYear: number;
  cohortAvgProviders: number;
  cohortAvgAmount: number;
  hasData: boolean;
}> {
  const patientContext = await db.select().from(patient360)
    .where(eq(patient360.patientId, patientId))
    .limit(1);
  
  const chronicConditions = (patientContext[0]?.chronicConditions as any[]) || [];
  const hasChronicCondition = chronicConditions.length > 0;
  const cohortId = hasChronicCondition ? "chronic" : "standard";
  
  // Query without COALESCE to hardcoded defaults - only use actual data
  const cohortStats = await db.execute(sql`
    SELECT 
      COUNT(DISTINCT p.patient_id) as cohort_size,
      AVG((p.claims_summary::jsonb->>'totalClaims')::numeric) as avg_claims,
      AVG((p.claims_summary::jsonb->>'uniqueProviders')::numeric) as avg_providers,
      AVG((p.claims_summary::jsonb->>'avgClaimAmount')::numeric) as avg_amount
    FROM patient_360 p
    WHERE (p.claims_summary::jsonb->>'totalClaims')::numeric > 0
    AND jsonb_array_length(COALESCE(p.chronic_conditions, '[]'::jsonb)) ${hasChronicCondition ? sql`> 0` : sql`= 0`}
  `);
  
  const cohortRow = cohortStats.rows[0] as any;
  const cohortSize = parseInt(cohortRow?.cohort_size) || 0;
  const hasData = cohortSize >= 10;
  
  if (!hasData) {
    // Compute baseline from global claims data
    const globalStats = await db.execute(sql`
      SELECT 
        AVG(COALESCE(amount::numeric, 0)) as avg_amount,
        COUNT(*) / NULLIF(COUNT(DISTINCT member_id), 0) as claims_per_patient,
        AVG(unique_providers) as avg_providers
      FROM (
        SELECT
          member_id,
          COUNT(DISTINCT provider_id) as unique_providers
        FROM claims_v2
        WHERE member_id IS NOT NULL
        GROUP BY member_id
      ) subq
      CROSS JOIN (
        SELECT AVG(COALESCE(amount::numeric, 0)) as avg_amount,
               COUNT(*) / NULLIF(COUNT(DISTINCT member_id), 0) as claims_per_patient
        FROM claims_v2
        WHERE amount IS NOT NULL
      ) amounts
    `);
    const globalRow = globalStats.rows[0] as any;
    
    return {
      cohortId: "global",
      cohortSize: 0,
      cohortAvgClaimsPerYear: parseFloat(globalRow?.claims_per_patient) || 0,
      cohortAvgProviders: parseFloat(globalRow?.avg_providers) || 0,
      cohortAvgAmount: parseFloat(globalRow?.avg_amount) || 0,
      hasData: parseFloat(globalRow?.avg_amount) > 0
    };
  }
  
  return {
    cohortId,
    cohortSize,
    cohortAvgClaimsPerYear: parseFloat(cohortRow?.avg_claims) || 0,
    cohortAvgProviders: parseFloat(cohortRow?.avg_providers) || 0,
    cohortAvgAmount: parseFloat(cohortRow?.avg_amount) || 0,
    hasData: true
  };
}

async function runProviderRuleEngine(providerId: string, metrics: EntityMetrics, peerBaseline: any): Promise<{
  score: number;
  findings: any;
}> {
  const thresholds = await getDetectionThresholds();
  const matchedRules: any[] = [];
  const patterns: any[] = [];
  let totalScore = 0;
  
  if (peerBaseline.peerAvgClaimAmount > 0) {
    const deviation = (metrics.avgClaimAmount - peerBaseline.peerAvgClaimAmount) / peerBaseline.peerAvgClaimAmount;
    if (deviation > thresholds.provider.deviationWarning) {
      matchedRules.push({
        ruleId: "PROV-BILLING-001",
        ruleName: "Excessive Billing vs Peers",
        category: "billing_anomaly",
        severity: deviation > thresholds.provider.deviationCritical ? "critical" : "high",
        confidence: Math.min(0.95, 0.6 + deviation * 0.2),
        description: `Provider billing ${(deviation * 100).toFixed(1)}% above peer average`
      });
      totalScore += deviation > thresholds.provider.deviationCritical ? 25 : 15;
    }
  }
  
  const weekendClaims = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM claims_v2
    WHERE provider_id = ${providerId}
    AND EXTRACT(DOW FROM service_date) IN (0, 6)
  `);
  const weekendCount = parseInt((weekendClaims.rows[0] as any)?.count) || 0;
  const weekendRatio = metrics.totalClaims > 0 ? weekendCount / metrics.totalClaims : 0;
  
  const populationStats = await getPopulationStats("provider");
  
  // Compute expected weekend ratio from actual claims data
  const globalWeekendStats = await db.execute(sql`
    SELECT 
      COUNT(CASE WHEN EXTRACT(DOW FROM service_date::date) IN (0, 6) THEN 1 END)::float / 
      NULLIF(COUNT(*), 0) as weekend_ratio
    FROM claims_v2
    WHERE service_date IS NOT NULL
  `);
  const expectedWeekendRatio = parseFloat((globalWeekendStats.rows[0] as any)?.weekend_ratio) || 0;
  
  // Only flag if we have valid baseline data
  if (expectedWeekendRatio > 0 && weekendRatio > expectedWeekendRatio * 3) {
    matchedRules.push({
      ruleId: "PROV-TIMING-001",
      ruleName: "Excessive Weekend Billing",
      category: "temporal_anomaly",
      severity: weekendRatio > 0.4 ? "high" : "medium",
      confidence: Math.min(0.9, weekendRatio * 2),
      description: `Weekend billing ratio (${(weekendRatio * 100).toFixed(1)}%) significantly exceeds expected ${(expectedWeekendRatio * 100).toFixed(1)}%`
    });
    patterns.push({
      patternType: "weekend_billing",
      description: `${weekendCount} weekend claims detected`,
      evidenceCount: weekendCount
    });
    totalScore += 12;
  }
  
  const serviceBundling = await db.execute(sql`
    SELECT member_id, service_date, COUNT(DISTINCT code) as service_count
    FROM claims_v2, unnest(cpt_codes) as code
    WHERE provider_id = ${providerId}
    AND service_date IS NOT NULL
    GROUP BY member_id, service_date
    HAVING COUNT(DISTINCT code) > 5
  `);
  
  if (serviceBundling.rows.length > 0) {
    const unbundlingCount = serviceBundling.rows.length;
    matchedRules.push({
      ruleId: "PROV-UNBUNDLE-001",
      ruleName: "Potential Service Unbundling",
      category: "unbundling",
      severity: unbundlingCount > 10 ? "high" : "medium",
      confidence: Math.min(0.85, 0.5 + unbundlingCount * 0.03),
      description: `${unbundlingCount} instances of multiple services on same day for same patient`
    });
    patterns.push({
      patternType: "unbundling",
      description: `Detected ${unbundlingCount} potential unbundling cases`,
      evidenceCount: unbundlingCount
    });
    totalScore += Math.min(20, unbundlingCount * 2);
  }
  
  if (metrics.flaggedClaimsPercent > thresholds.provider.flaggedClaimsWarning) {
    matchedRules.push({
      ruleId: "PROV-FLAG-001",
      ruleName: "High Flagged Claims Rate",
      category: "risk_pattern",
      severity: metrics.flaggedClaimsPercent > thresholds.provider.flaggedClaimsCritical ? "critical" : "high",
      confidence: Math.min(0.95, metrics.flaggedClaimsPercent + 0.3),
      description: `${(metrics.flaggedClaimsPercent * 100).toFixed(1)}% of claims flagged for review`
    });
    totalScore += metrics.flaggedClaimsPercent * 40;
  }
  
  return {
    score: Math.min(100, totalScore),
    findings: {
      matchedRules,
      patterns,
      violationCount: matchedRules.length
    }
  };
}

async function runDoctorRuleEngine(doctorId: string, metrics: EntityMetrics, peerBaseline: any): Promise<{
  score: number;
  findings: any;
}> {
  const thresholds = await getDetectionThresholds();
  const matchedRules: any[] = [];
  const prescribingPatterns: any[] = [];
  let totalScore = 0;
  
  const procedureFrequency = await db.execute(sql`
    SELECT code as service_code, COUNT(*) as count
    FROM claims_v2, unnest(cpt_codes) as code
    WHERE practitioner_id = ${doctorId}
    AND cpt_codes IS NOT NULL
    GROUP BY code
    ORDER BY count DESC
    LIMIT 5
  `);

  for (const row of procedureFrequency.rows as any[]) {
    const peerFrequency = await db.execute(sql`
      SELECT AVG(proc_count) as avg_count
      FROM (
        SELECT practitioner_id, COUNT(*) as proc_count
        FROM claims_v2, unnest(cpt_codes) as code
        WHERE code = ${row.service_code}
        AND practitioner_id IS NOT NULL
        GROUP BY practitioner_id
      ) sub
    `);

    const peerAvg = parseFloat((peerFrequency.rows[0] as any)?.avg_count) || 0;
    const deviation = peerAvg > 0 ? (parseInt(row.count) - peerAvg) / peerAvg : 0;

    // Only flag if we have valid peer data
    if (deviation > thresholds.doctor.procedureDeviationWarning && peerAvg > 0) {
      matchedRules.push({
        ruleId: "DOC-PROC-001",
        ruleName: "Procedure Frequency Anomaly",
        category: "procedure_pattern",
        severity: deviation > thresholds.doctor.procedureDeviationCritical ? "high" : "medium",
        confidence: Math.min(0.9, 0.5 + deviation * 0.1),
        description: `Service ${row.service_code} performed ${(deviation * 100).toFixed(0)}% more than peers`
      });
      prescribingPatterns.push({
        patternType: "high_frequency_procedure",
        description: `${row.service_code}: ${row.count} times vs peer avg ${peerAvg.toFixed(1)}`,
        evidenceCount: parseInt(row.count)
      });
      totalScore += Math.min(15, deviation * 3);
    }
  }
  
  const uniquePatients = await db.execute(sql`
    SELECT COUNT(DISTINCT member_id) as count
    FROM claims_v2
    WHERE practitioner_id = ${doctorId}
  `);
  const patientCount = parseInt((uniquePatients.rows[0] as any)?.count) || 0;
  
  if (peerBaseline.peerAvgPatientsPerDay > 0) {
    // Compute actual days from claims date range
    const dateRange = await db.execute(sql`
      SELECT 
        EXTRACT(epoch FROM (MAX(service_date::date) - MIN(service_date::date)))::int / 86400 + 1 as days
      FROM claims_v2
      WHERE practitioner_id = ${doctorId}
      AND service_date IS NOT NULL
    `);
    const estimatedDays = parseInt((dateRange.rows[0] as any)?.days) || 0;
    
    if (estimatedDays > 30) { // Only compare if we have reasonable date range
      const patientsPerDay = patientCount / estimatedDays;
      const deviation = (patientsPerDay - peerBaseline.peerAvgPatientsPerDay) / peerBaseline.peerAvgPatientsPerDay;
    
      if (deviation > thresholds.doctor.patientVolumeDeviationWarning) {
      matchedRules.push({
        ruleId: "DOC-VOL-001",
        ruleName: "Excessive Patient Volume",
        category: "volume_anomaly",
        severity: deviation > thresholds.doctor.patientVolumeDeviationCritical ? "high" : "medium",
        confidence: Math.min(0.85, 0.5 + deviation * 0.15),
        description: `Patient volume ${(deviation * 100).toFixed(0)}% above specialty peers`
      });
      totalScore += Math.min(20, deviation * 8);
    }
    }
  }
  
  if (metrics.flaggedClaimsPercent > thresholds.doctor.flaggedClaimsWarning) {
    matchedRules.push({
      ruleId: "DOC-FLAG-001",
      ruleName: "High Flagged Claims Rate",
      category: "risk_pattern",
      severity: metrics.flaggedClaimsPercent > thresholds.doctor.flaggedClaimsCritical ? "high" : "medium",
      confidence: Math.min(0.9, metrics.flaggedClaimsPercent + 0.4),
      description: `${(metrics.flaggedClaimsPercent * 100).toFixed(1)}% of claims flagged`
    });
    totalScore += metrics.flaggedClaimsPercent * 35;
  }
  
  return {
    score: Math.min(100, totalScore),
    findings: {
      matchedRules,
      prescribingPatterns,
      violationCount: matchedRules.length
    }
  };
}

async function runPatientRuleEngine(patientId: string, metrics: EntityMetrics, peerBaseline: any): Promise<{
  score: number;
  findings: any;
}> {
  const thresholds = await getDetectionThresholds();
  const matchedRules: any[] = [];
  const utilizationPatterns: any[] = [];
  let totalScore = 0;
  
  const diagnosisProviders = await db.execute(sql`
    SELECT primary_diagnosis, COUNT(DISTINCT provider_id) as provider_count
    FROM claims_v2
    WHERE member_id = ${patientId}
    AND primary_diagnosis IS NOT NULL
    GROUP BY primary_diagnosis
    HAVING COUNT(DISTINCT provider_id) > 3
  `);
  
  for (const row of diagnosisProviders.rows as any[]) {
    const providerCount = parseInt(row.provider_count);
    if (providerCount > 3) {
      matchedRules.push({
        ruleId: "PAT-SHOP-001",
        ruleName: "Doctor Shopping Pattern",
        category: "doctor_shopping",
        severity: providerCount > 6 ? "high" : "medium",
        confidence: Math.min(0.9, 0.4 + providerCount * 0.08),
        description: `${providerCount} different providers for diagnosis ${row.primary_diagnosis}`
      });
      utilizationPatterns.push({
        patternType: "doctor_shopping",
        description: `Diagnosis ${row.primary_diagnosis} treated by ${providerCount} providers`,
        evidenceCount: providerCount
      });
      totalScore += Math.min(25, providerCount * 3);
    }
  }
  
  if (peerBaseline.cohortAvgClaimsPerYear > 0) {
    const utilizationRatio = metrics.totalClaims / peerBaseline.cohortAvgClaimsPerYear;
    if (utilizationRatio > thresholds.patient.utilizationRatioWarning) {
      matchedRules.push({
        ruleId: "PAT-UTIL-001",
        ruleName: "Excessive Utilization",
        category: "over_utilization",
        severity: utilizationRatio > thresholds.patient.utilizationRatioCritical ? "high" : "medium",
        confidence: Math.min(0.85, 0.4 + utilizationRatio * 0.08),
        description: `${utilizationRatio.toFixed(1)}x utilization vs cohort average`
      });
      utilizationPatterns.push({
        patternType: "high_utilization",
        description: `${metrics.totalClaims} claims vs cohort avg ${peerBaseline.cohortAvgClaimsPerYear.toFixed(0)}`,
        evidenceCount: metrics.totalClaims
      });
      totalScore += Math.min(20, utilizationRatio * 3);
    }
  }
  
  const geographicSpread = await db.execute(sql`
    SELECT COUNT(DISTINCT city) as city_count, array_agg(DISTINCT city) as cities
    FROM claims_v2
    WHERE member_id = ${patientId}
    AND city IS NOT NULL
  `);
  
  const cityCount = parseInt((geographicSpread.rows[0] as any)?.city_count) || 0;
  if (cityCount > 4) {
    matchedRules.push({
      ruleId: "PAT-GEO-001",
      ruleName: "Geographic Spread Anomaly",
      category: "geographic_anomaly",
      severity: cityCount > 7 ? "high" : "medium",
      confidence: Math.min(0.8, 0.3 + cityCount * 0.07),
      description: `Claims from ${cityCount} different cities`
    });
    utilizationPatterns.push({
      patternType: "geographic_spread",
      description: `Claims across ${cityCount} cities`,
      evidenceCount: cityCount
    });
    totalScore += Math.min(15, cityCount * 2);
  }
  
  if (metrics.flaggedClaimsPercent > thresholds.patient.flaggedClaimsWarning) {
    matchedRules.push({
      ruleId: "PAT-FLAG-001",
      ruleName: "High Flagged Claims Rate",
      category: "risk_pattern",
      severity: metrics.flaggedClaimsPercent > thresholds.patient.flaggedClaimsCritical ? "high" : "medium",
      confidence: Math.min(0.9, metrics.flaggedClaimsPercent + 0.35),
      description: `${(metrics.flaggedClaimsPercent * 100).toFixed(1)}% of claims flagged`
    });
    totalScore += metrics.flaggedClaimsPercent * 30;
  }
  
  return {
    score: Math.min(100, totalScore),
    findings: {
      matchedRules,
      utilizationPatterns,
      violationCount: matchedRules.length
    }
  };
}

async function runEntityStatisticalAnalysis(
  entityType: "provider" | "doctor" | "patient",
  entityId: string,
  metrics: EntityMetrics,
  peerBaseline: any
): Promise<{ score: number; findings: any }> {
  const populationStats = await getPopulationStats(entityType);
  
  const amountZScore = populationStats.stdDevClaimAmount > 0 
    ? (metrics.avgClaimAmount - populationStats.avgClaimAmount) / populationStats.stdDevClaimAmount 
    : 0;
  
  let peerZScore = 0;
  let percentile = 50;
  
  // Use population standard deviation when available, skip z-score if no valid std dev
  if (entityType === "provider" && peerBaseline.peerAvgClaimAmount > 0 && populationStats.stdDevClaimAmount > 0) {
    peerZScore = (metrics.avgClaimAmount - peerBaseline.peerAvgClaimAmount) / populationStats.stdDevClaimAmount;
    percentile = Math.min(99, Math.max(1, 50 + peerZScore * 15));
  } else if (entityType === "doctor" && peerBaseline.peerAvgClaimAmount > 0 && populationStats.stdDevClaimAmount > 0) {
    peerZScore = (metrics.avgClaimAmount - peerBaseline.peerAvgClaimAmount) / populationStats.stdDevClaimAmount;
    percentile = Math.min(99, Math.max(1, 50 + peerZScore * 15));
  } else if (entityType === "patient" && peerBaseline.cohortAvgAmount > 0 && populationStats.stdDevClaimAmount > 0) {
    peerZScore = (metrics.avgClaimAmount - peerBaseline.cohortAvgAmount) / populationStats.stdDevClaimAmount;
    percentile = Math.min(99, Math.max(1, 50 + peerZScore * 15));
  }
  
  const anomalies: any[] = [];
  
  const thresholds = await getDetectionThresholds();
  
  if (Math.abs(amountZScore) > thresholds.statistical.zscoreWarning) {
    anomalies.push({
      metric: "avg_claim_amount",
      value: metrics.avgClaimAmount,
      peerAvg: populationStats.avgClaimAmount,
      deviation: amountZScore
    });
  }
  
  // Compute std dev for claims per entity from database
  const claimsStdDevQuery = await db.execute(sql`
    SELECT STDDEV(claim_count)::float as std_dev
    FROM (
      SELECT COUNT(*) as claim_count
      FROM claims_v2
      GROUP BY ${entityType === "provider" ? sql`provider_id` :
                entityType === "doctor" ? sql`practitioner_id` :
                sql`member_id`}
    ) sub
  `);
  const claimsStdDev = parseFloat((claimsStdDevQuery.rows[0] as any)?.std_dev) || 0;
  
  const claimsZScore = claimsStdDev > 0
    ? (metrics.totalClaims - populationStats.avgClaimsPerEntity) / claimsStdDev
    : 0;
  
  if (claimsZScore > thresholds.statistical.zscoreWarning && claimsStdDev > 0) {
    anomalies.push({
      metric: "total_claims",
      value: metrics.totalClaims,
      peerAvg: populationStats.avgClaimsPerEntity,
      deviation: claimsZScore
    });
  }
  
  let score = 0;
  score += Math.min(30, Math.max(0, Math.abs(peerZScore) * 10));
  score += Math.min(25, Math.max(0, claimsZScore * 5));
  score += metrics.flaggedClaimsPercent * 25;
  score += Math.min(20, anomalies.length * 8);
  
  const trendDirection = peerZScore > 0.5 ? "increasing_risk" : peerZScore < -0.5 ? "decreasing_risk" : "stable";
  
  return {
    score: Math.min(100, score),
    findings: {
      peerComparison: {
        peerGroupId: entityType === "provider" ? peerBaseline.peerGroupId : 
                     entityType === "doctor" ? peerBaseline.specialty : peerBaseline.cohortId,
        peerCount: peerBaseline.peerCount || peerBaseline.cohortSize || 0, // No hardcoded fallback
        avgClaimAmount: metrics.avgClaimAmount,
        peerAvgClaimAmount: entityType === "patient" ? peerBaseline.cohortAvgAmount : peerBaseline.peerAvgClaimAmount,
        zScore: peerZScore,
        percentile,
        hasData: peerBaseline.hasData
      },
      billingPatternAnomalies: anomalies,
      trendAnalysis: {
        direction: trendDirection,
        changePercent: peerZScore * 10,
        significance: Math.abs(peerZScore) > 1.5 ? 0.95 : Math.abs(peerZScore) > 1 ? 0.8 : 0.5
      }
    }
  };
}

async function runEntityUnsupervisedAnalysis(
  entityType: "provider" | "doctor" | "patient",
  entityId: string,
  metrics: EntityMetrics
): Promise<{ score: number; findings: any }> {
  const thresholds = await getDetectionThresholds();
  const features = await db.select().from(fwaFeatureStore)
    .where(and(
      eq(fwaFeatureStore.entityType, entityType),
      eq(fwaFeatureStore.entityId, entityId)
    ))
    .limit(1);
  
  const outlierReasons: string[] = [];
  let anomalyScore = 0;
  
  const populationStats = await getPopulationStats(entityType);
  
  if (metrics.avgClaimAmount > populationStats.p95ClaimAmount && populationStats.p95ClaimAmount > 0) {
    anomalyScore += 0.25;
    outlierReasons.push(`Average claim amount exceeds 95th percentile`);
  } else if (metrics.avgClaimAmount > populationStats.p90ClaimAmount && populationStats.p90ClaimAmount > 0) {
    anomalyScore += 0.15;
    outlierReasons.push(`Average claim amount exceeds 90th percentile`);
  }
  
  // Use database thresholds for flagged claims check
  const flaggedThreshold = entityType === "provider" ? thresholds.provider.flaggedClaimsCritical :
                           entityType === "doctor" ? thresholds.doctor.flaggedClaimsCritical :
                           thresholds.patient.flaggedClaimsCritical;
  
  if (metrics.flaggedClaimsPercent > flaggedThreshold) {
    anomalyScore += 0.25;
    outlierReasons.push(`High flagged claims rate (${(metrics.flaggedClaimsPercent * 100).toFixed(1)}%)`);
  }
  
  const procedureConcentration = metrics.topProcedureCodes.length > 0 
    ? metrics.topProcedureCodes[0].count / metrics.totalClaims 
    : 0;
  
  if (procedureConcentration > 0.6) {
    anomalyScore += 0.2;
    outlierReasons.push(`High procedure concentration (${(procedureConcentration * 100).toFixed(0)}% same procedure)`);
  }
  
  const existingCluster = await db.select().from(fwaAnomalyClusters)
    .where(eq(fwaAnomalyClusters.entityType, entityType))
    .orderBy(desc(fwaAnomalyClusters.createdAt))
    .limit(1);
  
  const clusterAssignment = existingCluster[0]?.clusterId || 0;
  const clusterLabel = anomalyScore > thresholds.unsupervised.anomalyScoreCritical ? "high_risk" : 
                       anomalyScore > thresholds.unsupervised.anomalyScoreWarning ? "moderate_risk" : "normal";
  
  if (features[0]) {
    const zScore = parseFloat(features[0].zScore || "0");
    if (Math.abs(zScore) > thresholds.statistical.zscoreWarning) {
      anomalyScore += Math.min(0.3, Math.abs(zScore) * 0.1);
      outlierReasons.push(`Statistical outlier (z-score: ${zScore.toFixed(2)})`);
    }
  }
  
  return {
    score: Math.min(100, anomalyScore * 100),
    findings: {
      anomalyScore,
      clusterAssignment,
      clusterLabel,
      outlierReasons,
      isolationForestScore: anomalyScore,
      distanceFromCentroid: anomalyScore * 2
    }
  };
}

async function runEntityRagLlmAnalysis(
  entityType: "provider" | "doctor" | "patient",
  entityId: string,
  metrics: EntityMetrics,
  ruleFindings: any,
  statisticalFindings: any
): Promise<{ score: number; findings: any }> {
  const thresholds = await getDetectionThresholds();
  const riskFactors: string[] = [];
  let confidence = 0.5;
  
  if (ruleFindings.matchedRules?.length > 0) {
    riskFactors.push(...ruleFindings.matchedRules.map((r: any) => r.description));
    confidence = Math.min(0.95, confidence + ruleFindings.matchedRules.length * 0.1);
  }
  
  // Use configurable z-score threshold for peer comparison significance
  if (statisticalFindings.peerComparison?.zScore > thresholds.statistical.zscoreWarning) {
    riskFactors.push(`Significant deviation from peer group (z-score: ${statisticalFindings.peerComparison.zScore.toFixed(2)})`);
    confidence = Math.min(0.95, confidence + 0.1);
  }
  
  // Use entity-specific flagged claims thresholds
  const flaggedWarning = entityType === "provider" ? thresholds.provider.flaggedClaimsWarning :
                         entityType === "doctor" ? thresholds.doctor.flaggedClaimsWarning :
                         thresholds.patient.flaggedClaimsWarning;
  
  if (metrics.flaggedClaimsPercent > flaggedWarning) {
    riskFactors.push(`${(metrics.flaggedClaimsPercent * 100).toFixed(1)}% of claims were flagged for review`);
  }
  
  let recommendation = "Continue standard monitoring.";
  let score = 0;
  
  if (riskFactors.length === 0) {
    recommendation = "No significant risk factors identified. Continue standard monitoring.";
    score = 10;
  } else if (riskFactors.length <= 2) {
    recommendation = "Minor risk factors detected. Recommend enhanced monitoring and periodic review.";
    score = 35;
  } else if (riskFactors.length <= 4) {
    recommendation = "Multiple risk factors identified. Recommend detailed audit and investigation.";
    score = 60;
  } else {
    recommendation = "Critical risk level. Immediate investigation required. Consider suspension pending review.";
    score = 85;
    confidence = 0.9;
  }
  
  const contextualAnalysis = `Analysis of ${entityType} ${entityId} identified ${riskFactors.length} risk factors. ` +
    `Total claims: ${metrics.totalClaims}, Total amount: ${metrics.totalAmount.toLocaleString()} SAR, ` +
    `Flagged claims: ${(metrics.flaggedClaimsPercent * 100).toFixed(1)}%. ${recommendation}`;
  
  return {
    score: Math.min(100, score),
    findings: {
      contextualAnalysis,
      similarEntities: [],
      knowledgeBaseMatches: [],
      recommendation,
      confidence,
      evidenceChain: riskFactors
    }
  };
}

interface SemanticValidationResult {
  score: number;
  findings: {
    procedureDiagnosisPairs: Array<{
      icdCode: string;
      cptCode: string;
      icdDescription: string;
      cptDescription: string;
      similarity: number;
      confidencePercent: number;
      riskLevel: "low" | "medium" | "high" | "critical";
      clinicalInterpretation: string;
    }>;
    avgSimilarity: number;
    mismatchCount: number;
    criticalMismatches: number;
    overallAssessment: string;
  };
}

async function runSemanticValidation(
  entityId: string,
  topProcedureCodes: Array<{ code: string; count: number; amount?: number }>,
  topDiagnosisCodes: Array<{ code: string; count: number }>
): Promise<SemanticValidationResult> {
  const pairs: SemanticValidationResult["findings"]["procedureDiagnosisPairs"] = [];
  let totalSimilarity = 0;
  let mismatchCount = 0;
  let criticalMismatches = 0;
  
  const maxPairs = Math.min(5, topProcedureCodes.length, topDiagnosisCodes.length);
  
  for (let i = 0; i < maxPairs; i++) {
    const cptCode = topProcedureCodes[i]?.code;
    const icdCode = topDiagnosisCodes[i]?.code;
    
    if (!cptCode || !icdCode) continue;
    
    try {
      const match = await getSemanticMatch(icdCode, cptCode);
      
      if (match) {
        const pairResult = {
          icdCode,
          cptCode,
          icdDescription: match.icdDescription,
          cptDescription: match.cptDescription,
          similarity: match.similarity,
          confidencePercent: match.confidencePercent,
          riskLevel: match.riskLevel,
          clinicalInterpretation: match.clinicalInterpretation
        };
        
        pairs.push(pairResult);
        totalSimilarity += match.similarity;
        
        if (match.riskLevel === "critical") {
          criticalMismatches++;
          mismatchCount++;
        } else if (match.riskLevel === "high") {
          mismatchCount++;
        }
      }
    } catch (error) {
      console.warn(`[Semantic] Failed to validate ${icdCode} <-> ${cptCode}:`, error);
    }
  }
  
  if (pairs.length === 0) {
    return {
      score: 0,
      findings: {
        procedureDiagnosisPairs: [],
        avgSimilarity: 0,
        mismatchCount: 0,
        criticalMismatches: 0,
        overallAssessment: "No embeddings available for semantic validation. Import ICD-10 and CPT codes with embeddings first."
      }
    };
  }
  
  const avgSimilarity = totalSimilarity / pairs.length;
  
  let score = 0;
  let overallAssessment = "";
  
  if (criticalMismatches > 0) {
    score = 70 + (criticalMismatches * 10);
    overallAssessment = `Critical procedure-diagnosis mismatches detected (${criticalMismatches} critical). Immediate investigation required.`;
  } else if (mismatchCount > 0) {
    score = 40 + (mismatchCount * 15);
    overallAssessment = `${mismatchCount} high-risk procedure-diagnosis pair(s) found. Review recommended.`;
  } else if (avgSimilarity < 0.5) {
    score = 30;
    overallAssessment = "Low average semantic similarity. Some pairs may require review.";
  } else if (avgSimilarity < 0.7) {
    score = 15;
    overallAssessment = "Moderate semantic similarity. Minor discrepancies noted.";
  } else {
    score = 5;
    overallAssessment = "High semantic similarity. Procedure-diagnosis pairs appear clinically appropriate.";
  }
  
  return {
    score: Math.min(100, score),
    findings: {
      procedureDiagnosisPairs: pairs,
      avgSimilarity,
      mismatchCount,
      criticalMismatches,
      overallAssessment
    }
  };
}

async function getEntityMetrics(
  entityType: "provider" | "doctor" | "patient",
  entityId: string,
  batchId?: string
): Promise<EntityMetrics> {
  const idColumn = entityType === "provider" ? "provider_id" :
                   entityType === "doctor" ? "practitioner_id" : "member_id";
  
  let claimsQuery = sql`
    SELECT 
      COUNT(*) as total_claims,
      COALESCE(SUM(amount::numeric), 0) as total_amount,
      COALESCE(AVG(amount::numeric), 0) as avg_amount
    FROM claims_v2
    WHERE ${sql.raw(idColumn)} = ${entityId}
  `;
  
  if (batchId) {
    claimsQuery = sql`
      SELECT 
        COUNT(*) as total_claims,
        COALESCE(SUM(amount::numeric), 0) as total_amount,
        COALESCE(AVG(amount::numeric), 0) as avg_amount
      FROM claims_v2
      WHERE ${sql.raw(idColumn)} = ${entityId}
      AND batch_number = ${batchId}
    `;
  }
  
  const claimStats = await db.execute(claimsQuery);
  const statsRow = claimStats.rows[0] as any;
  
  const totalClaims = parseInt(statsRow?.total_claims) || 0;
  const totalAmount = parseFloat(statsRow?.total_amount) || 0;
  const avgClaimAmount = parseFloat(statsRow?.avg_amount) || 0;
  
  let flaggedQuery = sql`
    SELECT COUNT(*) as flagged_count
    FROM fwa_detection_results dr
    JOIN claims_v2 ac ON dr.claim_id = ac.id
    WHERE ac.${sql.raw(idColumn)} = ${entityId}
    AND dr.composite_score::numeric >= 60
  `;
  
  if (batchId) {
    flaggedQuery = sql`
      SELECT COUNT(*) as flagged_count
      FROM fwa_detection_results dr
      JOIN claims_v2 ac ON dr.claim_id = ac.id
      WHERE ac.${sql.raw(idColumn)} = ${entityId}
      AND ac.batch_number = ${batchId}
      AND dr.composite_score::numeric >= 60
    `;
  }
  
  const flaggedStats = await db.execute(flaggedQuery);
  const flaggedCount = parseInt((flaggedStats.rows[0] as any)?.flagged_count) || 0;
  
  let highRiskQuery = sql`
    SELECT COUNT(*) as high_risk_count
    FROM fwa_detection_results dr
    JOIN claims_v2 ac ON dr.claim_id = ac.id
    WHERE ac.${sql.raw(idColumn)} = ${entityId}
    AND dr.composite_score::numeric >= 80
  `;
  
  const highRiskStats = await db.execute(highRiskQuery);
  const highRiskCount = parseInt((highRiskStats.rows[0] as any)?.high_risk_count) || 0;
  
  const topProceduresQuery = sql`
    SELECT
      code,
      COUNT(*) as count,
      COALESCE(SUM(amount::numeric), 0) as amount
    FROM claims_v2, unnest(cpt_codes) as code
    WHERE ${sql.raw(idColumn)} = ${entityId}
    AND cpt_codes IS NOT NULL
    GROUP BY code
    ORDER BY count DESC
    LIMIT 5
  `;
  const topProcedures = await db.execute(topProceduresQuery);
  
  const topDiagnosesQuery = sql`
    SELECT 
      primary_diagnosis as code,
      COUNT(*) as count
    FROM claims_v2
    WHERE ${sql.raw(idColumn)} = ${entityId}
    AND primary_diagnosis IS NOT NULL
    GROUP BY primary_diagnosis
    ORDER BY count DESC
    LIMIT 5
  `;
  const topDiagnoses = await db.execute(topDiagnosesQuery);
  
  return {
    totalClaims,
    totalAmount,
    avgClaimAmount,
    flaggedClaimsCount: flaggedCount,
    flaggedClaimsPercent: totalClaims > 0 ? flaggedCount / totalClaims : 0,
    highRiskClaimsCount: highRiskCount,
    topProcedureCodes: (topProcedures.rows as any[]).map(r => ({
      code: r.code,
      count: parseInt(r.count),
      amount: parseFloat(r.amount)
    })),
    topDiagnosisCodes: (topDiagnoses.rows as any[]).map(r => ({
      code: r.code,
      count: parseInt(r.count)
    }))
  };
}

export async function runProviderDetection(providerId: string, batchId?: string): Promise<{
  providerId: string;
  compositeScore: number;
  riskLevel: string;
  success: boolean;
}> {
  const startTime = Date.now();
  const runId = `prov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[Entity Detection] Starting provider detection for ${providerId}`);
    
    const metrics = await getEntityMetrics("provider", providerId, batchId);
    
    if (metrics.totalClaims === 0) {
      console.log(`[Entity Detection] No claims found for provider ${providerId}`);
      return { providerId, compositeScore: 0, riskLevel: "minimal", success: true };
    }
    
    const peerBaseline = await getProviderPeerBaseline(providerId);
    
    const [ruleResult, statResult, unsupervisedResult, semanticResult] = await Promise.all([
      runProviderRuleEngine(providerId, metrics, peerBaseline),
      runEntityStatisticalAnalysis("provider", providerId, metrics, peerBaseline),
      runEntityUnsupervisedAnalysis("provider", providerId, metrics),
      runSemanticValidation(providerId, metrics.topProcedureCodes, metrics.topDiagnosisCodes)
    ]);
    
    const ragResult = await runEntityRagLlmAnalysis(
      "provider", 
      providerId, 
      metrics, 
      ruleResult.findings, 
      statResult.findings
    );
    
    const compositeScore = 
      ruleResult.score * ENTITY_DETECTION_WEIGHTS.rule_engine +
      statResult.score * ENTITY_DETECTION_WEIGHTS.statistical_learning +
      unsupervisedResult.score * ENTITY_DETECTION_WEIGHTS.unsupervised_learning +
      ragResult.score * ENTITY_DETECTION_WEIGHTS.rag_llm +
      semanticResult.score * ENTITY_DETECTION_WEIGHTS.semantic_validation;
    
    const riskLevel = getRiskLevel(compositeScore);
    const primaryMethod = getPrimaryMethod({
      rule: ruleResult.score,
      statistical: statResult.score,
      unsupervised: unsupervisedResult.score,
      rag: ragResult.score,
      semantic: semanticResult.score
    });
    
    const processingTimeMs = Date.now() - startTime;
    
    await db.insert(fwaProviderDetectionResults).values({
      providerId,
      batchId,
      runId,
      compositeScore: compositeScore.toFixed(2),
      riskLevel,
      ruleEngineScore: ruleResult.score.toFixed(2),
      statisticalScore: statResult.score.toFixed(2),
      unsupervisedScore: unsupervisedResult.score.toFixed(2),
      ragLlmScore: ragResult.score.toFixed(2),
      semanticScore: semanticResult.score.toFixed(2),
      ruleEngineFindings: ruleResult.findings,
      statisticalFindings: statResult.findings,
      unsupervisedFindings: unsupervisedResult.findings,
      ragLlmFindings: ragResult.findings,
      semanticFindings: semanticResult.findings,
      aggregatedMetrics: {
        totalClaims: metrics.totalClaims,
        totalAmount: metrics.totalAmount,
        avgClaimAmount: metrics.avgClaimAmount,
        uniquePatients: 0,
        uniqueDoctors: 0,
        flaggedClaimsCount: metrics.flaggedClaimsCount,
        flaggedClaimsPercent: metrics.flaggedClaimsPercent,
        highRiskClaimsCount: metrics.highRiskClaimsCount,
        topProcedureCodes: metrics.topProcedureCodes,
        topDiagnosisCodes: metrics.topDiagnosisCodes
      },
      primaryDetectionMethod: primaryMethod as any,
      detectionSummary: ragResult.findings.contextualAnalysis,
      recommendedAction: ragResult.findings.recommendation,
      processingTimeMs
    });
    
    console.log(`[Entity Detection] Provider ${providerId} - Score: ${compositeScore.toFixed(2)}, Risk: ${riskLevel}, Time: ${processingTimeMs}ms`);
    
    return { providerId, compositeScore, riskLevel, success: true };
    
  } catch (error) {
    console.error(`[Entity Detection] Error processing provider ${providerId}:`, error);
    return { providerId, compositeScore: 0, riskLevel: "low", success: false };
  }
}

export async function runDoctorDetection(doctorId: string, batchId?: string): Promise<{
  doctorId: string;
  compositeScore: number;
  riskLevel: string;
  success: boolean;
}> {
  const startTime = Date.now();
  const runId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[Entity Detection] Starting doctor detection for ${doctorId}`);
    
    const metrics = await getEntityMetrics("doctor", doctorId, batchId);
    
    if (metrics.totalClaims === 0) {
      console.log(`[Entity Detection] No claims found for doctor ${doctorId}`);
      return { doctorId, compositeScore: 0, riskLevel: "minimal", success: true };
    }
    
    const peerBaseline = await getDoctorPeerBaseline(doctorId);
    
    const [ruleResult, statResult, unsupervisedResult, semanticResult] = await Promise.all([
      runDoctorRuleEngine(doctorId, metrics, peerBaseline),
      runEntityStatisticalAnalysis("doctor", doctorId, metrics, peerBaseline),
      runEntityUnsupervisedAnalysis("doctor", doctorId, metrics),
      runSemanticValidation(doctorId, metrics.topProcedureCodes, metrics.topDiagnosisCodes)
    ]);
    
    const ragResult = await runEntityRagLlmAnalysis(
      "doctor",
      doctorId,
      metrics,
      ruleResult.findings,
      statResult.findings
    );
    
    const compositeScore = 
      ruleResult.score * ENTITY_DETECTION_WEIGHTS.rule_engine +
      statResult.score * ENTITY_DETECTION_WEIGHTS.statistical_learning +
      unsupervisedResult.score * ENTITY_DETECTION_WEIGHTS.unsupervised_learning +
      ragResult.score * ENTITY_DETECTION_WEIGHTS.rag_llm +
      semanticResult.score * ENTITY_DETECTION_WEIGHTS.semantic_validation;
    
    const riskLevel = getRiskLevel(compositeScore);
    const primaryMethod = getPrimaryMethod({
      rule: ruleResult.score,
      statistical: statResult.score,
      unsupervised: unsupervisedResult.score,
      rag: ragResult.score,
      semantic: semanticResult.score
    });
    
    const processingTimeMs = Date.now() - startTime;
    
    await db.insert(fwaDoctorDetectionResults).values({
      doctorId,
      batchId,
      runId,
      compositeScore: compositeScore.toFixed(2),
      riskLevel,
      ruleEngineScore: ruleResult.score.toFixed(2),
      statisticalScore: statResult.score.toFixed(2),
      unsupervisedScore: unsupervisedResult.score.toFixed(2),
      ragLlmScore: ragResult.score.toFixed(2),
      semanticScore: semanticResult.score.toFixed(2),
      ruleEngineFindings: ruleResult.findings,
      statisticalFindings: statResult.findings,
      unsupervisedFindings: unsupervisedResult.findings,
      ragLlmFindings: ragResult.findings,
      semanticFindings: semanticResult.findings,
      aggregatedMetrics: {
        totalClaims: metrics.totalClaims,
        totalAmount: metrics.totalAmount,
        avgClaimAmount: metrics.avgClaimAmount,
        uniquePatients: 0,
        uniqueProviders: 0,
        flaggedClaimsCount: metrics.flaggedClaimsCount,
        flaggedClaimsPercent: metrics.flaggedClaimsPercent,
        topProcedureCodes: metrics.topProcedureCodes,
        topDiagnosisCodes: metrics.topDiagnosisCodes,
        specialtyCode: peerBaseline.specialty
      },
      primaryDetectionMethod: primaryMethod as any,
      detectionSummary: ragResult.findings.contextualAnalysis,
      recommendedAction: ragResult.findings.recommendation,
      processingTimeMs
    });
    
    console.log(`[Entity Detection] Doctor ${doctorId} - Score: ${compositeScore.toFixed(2)}, Risk: ${riskLevel}, Time: ${processingTimeMs}ms`);
    
    return { doctorId, compositeScore, riskLevel, success: true };
    
  } catch (error) {
    console.error(`[Entity Detection] Error processing doctor ${doctorId}:`, error);
    return { doctorId, compositeScore: 0, riskLevel: "low", success: false };
  }
}

export async function runPatientDetection(patientId: string, batchId?: string): Promise<{
  patientId: string;
  compositeScore: number;
  riskLevel: string;
  success: boolean;
}> {
  const startTime = Date.now();
  const runId = `pat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[Entity Detection] Starting patient detection for ${patientId}`);
    
    const metrics = await getEntityMetrics("patient", patientId, batchId);
    
    if (metrics.totalClaims === 0) {
      console.log(`[Entity Detection] No claims found for patient ${patientId}`);
      return { patientId, compositeScore: 0, riskLevel: "minimal", success: true };
    }
    
    const peerBaseline = await getPatientPeerBaseline(patientId);
    
    const [ruleResult, statResult, unsupervisedResult, semanticResult] = await Promise.all([
      runPatientRuleEngine(patientId, metrics, peerBaseline),
      runEntityStatisticalAnalysis("patient", patientId, metrics, peerBaseline),
      runEntityUnsupervisedAnalysis("patient", patientId, metrics),
      runSemanticValidation(patientId, metrics.topProcedureCodes, metrics.topDiagnosisCodes)
    ]);
    
    const ragResult = await runEntityRagLlmAnalysis(
      "patient",
      patientId,
      metrics,
      ruleResult.findings,
      statResult.findings
    );
    
    const compositeScore = 
      ruleResult.score * ENTITY_DETECTION_WEIGHTS.rule_engine +
      statResult.score * ENTITY_DETECTION_WEIGHTS.statistical_learning +
      unsupervisedResult.score * ENTITY_DETECTION_WEIGHTS.unsupervised_learning +
      ragResult.score * ENTITY_DETECTION_WEIGHTS.rag_llm +
      semanticResult.score * ENTITY_DETECTION_WEIGHTS.semantic_validation;
    
    const riskLevel = getRiskLevel(compositeScore);
    const primaryMethod = getPrimaryMethod({
      rule: ruleResult.score,
      statistical: statResult.score,
      unsupervised: unsupervisedResult.score,
      rag: ragResult.score,
      semantic: semanticResult.score
    });
    
    const processingTimeMs = Date.now() - startTime;
    
    const cityClaims = await db.execute(sql`
      SELECT city, COUNT(*) as count
      FROM claims_v2
      WHERE member_id = ${patientId}
      AND city IS NOT NULL
      GROUP BY city
    `);
    const claimsByCity: Record<string, number> = {};
    for (const row of cityClaims.rows as any[]) {
      claimsByCity[row.city] = parseInt(row.count);
    }
    
    await db.insert(fwaPatientDetectionResults).values({
      patientId,
      batchId,
      runId,
      compositeScore: compositeScore.toFixed(2),
      riskLevel,
      ruleEngineScore: ruleResult.score.toFixed(2),
      statisticalScore: statResult.score.toFixed(2),
      unsupervisedScore: unsupervisedResult.score.toFixed(2),
      ragLlmScore: ragResult.score.toFixed(2),
      semanticScore: semanticResult.score.toFixed(2),
      ruleEngineFindings: ruleResult.findings,
      statisticalFindings: statResult.findings,
      unsupervisedFindings: unsupervisedResult.findings,
      ragLlmFindings: ragResult.findings,
      semanticFindings: semanticResult.findings,
      aggregatedMetrics: {
        totalClaims: metrics.totalClaims,
        totalAmount: metrics.totalAmount,
        avgClaimAmount: metrics.avgClaimAmount,
        uniqueProviders: 0,
        uniqueDoctors: 0,
        flaggedClaimsCount: metrics.flaggedClaimsCount,
        flaggedClaimsPercent: metrics.flaggedClaimsPercent,
        topDiagnosisCodes: metrics.topDiagnosisCodes,
        claimsByCity
      },
      primaryDetectionMethod: primaryMethod as any,
      detectionSummary: ragResult.findings.contextualAnalysis,
      recommendedAction: ragResult.findings.recommendation,
      processingTimeMs
    });
    
    console.log(`[Entity Detection] Patient ${patientId} - Score: ${compositeScore.toFixed(2)}, Risk: ${riskLevel}, Time: ${processingTimeMs}ms`);
    
    return { patientId, compositeScore, riskLevel, success: true };
    
  } catch (error) {
    console.error(`[Entity Detection] Error processing patient ${patientId}:`, error);
    return { patientId, compositeScore: 0, riskLevel: "low", success: false };
  }
}

async function updateProviderTimeline(providerId: string, batchId: string): Promise<void> {
  const metrics = await getEntityMetrics("provider", providerId, batchId);
  
  const avgRiskScore = await db.execute(sql`
    SELECT AVG(composite_score::numeric) as avg_score
    FROM fwa_detection_results dr
    JOIN claims_v2 ac ON dr.claim_id = ac.id
    WHERE ac.provider_id = ${providerId}
    AND ac.batch_number = ${batchId}
  `);
  
  const prevTimeline = await db.select().from(fwaProviderTimeline)
    .where(eq(fwaProviderTimeline.providerId, providerId))
    .orderBy(desc(fwaProviderTimeline.createdAt))
    .limit(1);
  
  let claimCountChange = null;
  let amountChange = null;
  let riskScoreChange = null;
  let trendDirection = "stable";
  
  if (prevTimeline[0]) {
    const prevClaimCount = prevTimeline[0].claimCount || 0;
    const prevAmount = parseFloat(String(prevTimeline[0].totalAmount)) || 0;
    const prevRisk = parseFloat(String(prevTimeline[0].avgRiskScore)) || 0;
    const currentRisk = parseFloat((avgRiskScore.rows[0] as any)?.avg_score) || 0;
    
    if (prevClaimCount > 0) {
      claimCountChange = ((metrics.totalClaims - prevClaimCount) / prevClaimCount) * 100;
    }
    if (prevAmount > 0) {
      amountChange = ((metrics.totalAmount - prevAmount) / prevAmount) * 100;
    }
    if (prevRisk > 0) {
      riskScoreChange = currentRisk - prevRisk;
    }
    
    if ((claimCountChange && claimCountChange > 20) || (amountChange && amountChange > 20) || (riskScoreChange && riskScoreChange > 5)) {
      trendDirection = "increasing";
    } else if ((claimCountChange && claimCountChange < -20) || (amountChange && amountChange < -20) || (riskScoreChange && riskScoreChange < -5)) {
      trendDirection = "decreasing";
    }
  }
  
  const uniquePatients = await db.execute(sql`
    SELECT COUNT(DISTINCT member_id) as count
    FROM claims_v2
    WHERE provider_id = ${providerId} AND batch_number = ${batchId}
  `);
  
  const uniqueDoctors = await db.execute(sql`
    SELECT COUNT(DISTINCT practitioner_id) as count
    FROM claims_v2
    WHERE provider_id = ${providerId} AND batch_number = ${batchId}
    AND practitioner_id IS NOT NULL
  `);
  
  await db.insert(fwaProviderTimeline).values({
    providerId,
    batchId,
    batchDate: new Date(),
    claimCount: metrics.totalClaims,
    totalAmount: metrics.totalAmount.toFixed(2),
    avgClaimAmount: metrics.avgClaimAmount.toFixed(2),
    uniquePatients: parseInt((uniquePatients.rows[0] as any)?.count) || 0,
    uniqueDoctors: parseInt((uniqueDoctors.rows[0] as any)?.count) || 0,
    flaggedClaimsCount: metrics.flaggedClaimsCount,
    highRiskClaimsCount: metrics.highRiskClaimsCount,
    avgRiskScore: ((avgRiskScore.rows[0] as any)?.avg_score || 0).toFixed(2),
    claimCountChange: claimCountChange?.toFixed(2),
    amountChange: amountChange?.toFixed(2),
    riskScoreChange: riskScoreChange?.toFixed(2),
    trendDirection,
    topProcedures: metrics.topProcedureCodes,
    topDiagnoses: metrics.topDiagnosisCodes
  });
}

async function updateDoctorTimeline(doctorId: string, batchId: string): Promise<void> {
  const metrics = await getEntityMetrics("doctor", doctorId, batchId);
  
  const avgRiskScore = await db.execute(sql`
    SELECT AVG(composite_score::numeric) as avg_score
    FROM fwa_detection_results dr
    JOIN claims_v2 ac ON dr.claim_id = ac.id
    WHERE ac.practitioner_id = ${doctorId}
    AND ac.batch_number = ${batchId}
  `);
  
  const prevTimeline = await db.select().from(fwaDoctorTimeline)
    .where(eq(fwaDoctorTimeline.doctorId, doctorId))
    .orderBy(desc(fwaDoctorTimeline.createdAt))
    .limit(1);
  
  let claimCountChange = null;
  let amountChange = null;
  let riskScoreChange = null;
  let trendDirection = "stable";
  
  if (prevTimeline[0]) {
    const prevClaimCount = prevTimeline[0].claimCount || 0;
    const prevAmount = parseFloat(String(prevTimeline[0].totalAmount)) || 0;
    const prevRisk = parseFloat(String(prevTimeline[0].avgRiskScore)) || 0;
    const currentRisk = parseFloat((avgRiskScore.rows[0] as any)?.avg_score) || 0;
    
    if (prevClaimCount > 0) claimCountChange = ((metrics.totalClaims - prevClaimCount) / prevClaimCount) * 100;
    if (prevAmount > 0) amountChange = ((metrics.totalAmount - prevAmount) / prevAmount) * 100;
    if (prevRisk > 0) riskScoreChange = currentRisk - prevRisk;
    
    if ((claimCountChange && claimCountChange > 20) || (riskScoreChange && riskScoreChange > 5)) {
      trendDirection = "increasing";
    } else if ((claimCountChange && claimCountChange < -20) || (riskScoreChange && riskScoreChange < -5)) {
      trendDirection = "decreasing";
    }
  }
  
  const uniquePatients = await db.execute(sql`
    SELECT COUNT(DISTINCT member_id) as count
    FROM claims_v2
    WHERE practitioner_id = ${doctorId} AND batch_number = ${batchId}
  `);
  
  const uniqueProviders = await db.execute(sql`
    SELECT COUNT(DISTINCT provider_id) as count
    FROM claims_v2
    WHERE practitioner_id = ${doctorId} AND batch_number = ${batchId}
  `);
  
  await db.insert(fwaDoctorTimeline).values({
    doctorId,
    batchId,
    batchDate: new Date(),
    claimCount: metrics.totalClaims,
    totalAmount: metrics.totalAmount.toFixed(2),
    avgClaimAmount: metrics.avgClaimAmount.toFixed(2),
    uniquePatients: parseInt((uniquePatients.rows[0] as any)?.count) || 0,
    uniqueProviders: parseInt((uniqueProviders.rows[0] as any)?.count) || 0,
    flaggedClaimsCount: metrics.flaggedClaimsCount,
    highRiskClaimsCount: metrics.highRiskClaimsCount,
    avgRiskScore: ((avgRiskScore.rows[0] as any)?.avg_score || 0).toFixed(2),
    claimCountChange: claimCountChange?.toFixed(2),
    amountChange: amountChange?.toFixed(2),
    riskScoreChange: riskScoreChange?.toFixed(2),
    trendDirection,
    topProcedures: metrics.topProcedureCodes,
    topDiagnoses: metrics.topDiagnosisCodes
  });
}

async function updatePatientTimeline(patientId: string, batchId: string): Promise<void> {
  const metrics = await getEntityMetrics("patient", patientId, batchId);
  
  const avgRiskScore = await db.execute(sql`
    SELECT AVG(composite_score::numeric) as avg_score
    FROM fwa_detection_results dr
    JOIN claims_v2 ac ON dr.claim_id = ac.id
    WHERE ac.member_id = ${patientId}
    AND ac.batch_number = ${batchId}
  `);
  
  const prevTimeline = await db.select().from(fwaPatientTimeline)
    .where(eq(fwaPatientTimeline.patientId, patientId))
    .orderBy(desc(fwaPatientTimeline.createdAt))
    .limit(1);
  
  let claimCountChange = null;
  let amountChange = null;
  let riskScoreChange = null;
  let trendDirection = "stable";
  
  if (prevTimeline[0]) {
    const prevClaimCount = prevTimeline[0].claimCount || 0;
    const prevAmount = parseFloat(String(prevTimeline[0].totalAmount)) || 0;
    const prevRisk = parseFloat(String(prevTimeline[0].avgRiskScore)) || 0;
    const currentRisk = parseFloat((avgRiskScore.rows[0] as any)?.avg_score) || 0;
    
    if (prevClaimCount > 0) claimCountChange = ((metrics.totalClaims - prevClaimCount) / prevClaimCount) * 100;
    if (prevAmount > 0) amountChange = ((metrics.totalAmount - prevAmount) / prevAmount) * 100;
    if (prevRisk > 0) riskScoreChange = currentRisk - prevRisk;
    
    if ((claimCountChange && claimCountChange > 20) || (riskScoreChange && riskScoreChange > 5)) {
      trendDirection = "increasing";
    } else if ((claimCountChange && claimCountChange < -20) || (riskScoreChange && riskScoreChange < -5)) {
      trendDirection = "decreasing";
    }
  }
  
  const uniqueProviders = await db.execute(sql`
    SELECT COUNT(DISTINCT provider_id) as count
    FROM claims_v2
    WHERE member_id = ${patientId} AND batch_number = ${batchId}
  `);

  const uniqueDoctors = await db.execute(sql`
    SELECT COUNT(DISTINCT practitioner_id) as count
    FROM claims_v2
    WHERE member_id = ${patientId} AND batch_number = ${batchId}
    AND practitioner_id IS NOT NULL
  `);

  const providerList = await db.execute(sql`
    SELECT provider_id, COUNT(*) as claim_count
    FROM claims_v2
    WHERE member_id = ${patientId} AND batch_number = ${batchId}
    GROUP BY provider_id
    ORDER BY claim_count DESC
    LIMIT 10
  `);
  
  await db.insert(fwaPatientTimeline).values({
    patientId,
    batchId,
    batchDate: new Date(),
    claimCount: metrics.totalClaims,
    totalAmount: metrics.totalAmount.toFixed(2),
    avgClaimAmount: metrics.avgClaimAmount.toFixed(2),
    uniqueProviders: parseInt((uniqueProviders.rows[0] as any)?.count) || 0,
    uniqueDoctors: parseInt((uniqueDoctors.rows[0] as any)?.count) || 0,
    flaggedClaimsCount: metrics.flaggedClaimsCount,
    highRiskClaimsCount: metrics.highRiskClaimsCount,
    avgRiskScore: ((avgRiskScore.rows[0] as any)?.avg_score || 0).toFixed(2),
    claimCountChange: claimCountChange?.toFixed(2),
    amountChange: amountChange?.toFixed(2),
    riskScoreChange: riskScoreChange?.toFixed(2),
    trendDirection,
    topDiagnoses: metrics.topDiagnosisCodes,
    providerList: (providerList.rows as any[]).map(r => ({
      providerId: r.provider_id,
      claimCount: parseInt(r.claim_count)
    }))
  });
}

export async function runEntityDetectionForBatch(batchId: string): Promise<{
  batchId: string;
  providersProcessed: number;
  doctorsProcessed: number;
  patientsProcessed: number;
  errors: number;
  processingTimeMs: number;
}> {
  const startTime = Date.now();
  console.log(`[Entity Detection] Starting batch entity detection for batch ${batchId}`);
  
  let providersProcessed = 0;
  let doctorsProcessed = 0;
  let patientsProcessed = 0;
  let errors = 0;
  
  try {
    const uniqueProviders = await db.execute(sql`
      SELECT DISTINCT provider_id
      FROM claims_v2
      WHERE batch_number = ${batchId}
      AND provider_id IS NOT NULL
    `);
    
    console.log(`[Entity Detection] Found ${uniqueProviders.rows.length} unique providers in batch`);
    
    for (const row of uniqueProviders.rows as any[]) {
      try {
        const result = await runProviderDetection(row.provider_id, batchId);
        if (result.success) {
          await updateProviderTimeline(row.provider_id, batchId);
          providersProcessed++;
        } else {
          errors++;
        }
      } catch (err) {
        console.error(`[Entity Detection] Error processing provider ${row.provider_id}:`, err);
        errors++;
      }
    }
    
    const uniqueDoctors = await db.execute(sql`
      SELECT DISTINCT practitioner_id
      FROM claims_v2
      WHERE batch_number = ${batchId}
      AND practitioner_id IS NOT NULL
    `);
    
    console.log(`[Entity Detection] Found ${uniqueDoctors.rows.length} unique doctors in batch`);
    
    for (const row of uniqueDoctors.rows as any[]) {
      try {
        const result = await runDoctorDetection(row.practitioner_id, batchId);
        if (result.success) {
          await updateDoctorTimeline(row.practitioner_id, batchId);
          doctorsProcessed++;
        } else {
          errors++;
        }
      } catch (err) {
        console.error(`[Entity Detection] Error processing doctor ${row.practitioner_id}:`, err);
        errors++;
      }
    }
    
    const uniquePatients = await db.execute(sql`
      SELECT DISTINCT member_id
      FROM claims_v2
      WHERE batch_number = ${batchId}
      AND member_id IS NOT NULL
    `);

    console.log(`[Entity Detection] Found ${uniquePatients.rows.length} unique patients in batch`);

    for (const row of uniquePatients.rows as any[]) {
      try {
        const result = await runPatientDetection(row.member_id, batchId);
        if (result.success) {
          await updatePatientTimeline(row.member_id, batchId);
          patientsProcessed++;
        } else {
          errors++;
        }
      } catch (err) {
        console.error(`[Entity Detection] Error processing patient ${row.member_id}:`, err);
        errors++;
      }
    }
    
    const processingTimeMs = Date.now() - startTime;
    
    console.log(`[Entity Detection] Batch ${batchId} complete:
      - Providers: ${providersProcessed}
      - Doctors: ${doctorsProcessed}  
      - Patients: ${patientsProcessed}
      - Errors: ${errors}
      - Time: ${processingTimeMs}ms`);
    
    return {
      batchId,
      providersProcessed,
      doctorsProcessed,
      patientsProcessed,
      errors,
      processingTimeMs
    };
    
  } catch (error) {
    console.error(`[Entity Detection] Critical error processing batch ${batchId}:`, error);
    throw error;
  }
}

export async function refresh360ForBatch(batchId: string): Promise<{
  providersRefreshed: number;
  doctorsRefreshed: number;
  patientsRefreshed: number;
  errors: number;
}> {
  console.log(`[360 Refresh] Starting 360 perspective refresh for batch ${batchId}...`);
  
  let providersRefreshed = 0;
  let doctorsRefreshed = 0;
  let patientsRefreshed = 0;
  let errors = 0;
  
  try {
    // Get unique entities from claims in this batch
    const batchClaims = await db.execute(sql`
      SELECT 
        ARRAY_AGG(DISTINCT provider_id) as provider_ids,
        ARRAY_AGG(DISTINCT member_id) as patient_ids,
        ARRAY_AGG(DISTINCT practitioner_id) FILTER (WHERE practitioner_id IS NOT NULL) as doctor_ids
      FROM claims_v2
      WHERE batch_id = ${batchId}
    `);
    
    const row = batchClaims.rows[0] as any;
    const providerIds = row?.provider_ids || [];
    const patientIds = row?.patient_ids || [];
    const doctorIds = row?.doctor_ids || [];
    
    // Refresh provider 360 perspectives
    for (const providerId of providerIds) {
      if (!providerId) continue;
      try {
        await refreshProvider360(providerId, batchId);
        providersRefreshed++;
      } catch (err) {
        console.error(`[360 Refresh] Error refreshing provider ${providerId}:`, err);
        errors++;
      }
    }
    
    // Refresh doctor 360 perspectives
    for (const doctorId of doctorIds) {
      if (!doctorId) continue;
      try {
        await refreshDoctor360(doctorId, batchId);
        doctorsRefreshed++;
      } catch (err) {
        console.error(`[360 Refresh] Error refreshing doctor ${doctorId}:`, err);
        errors++;
      }
    }
    
    // Refresh patient 360 perspectives
    for (const patientId of patientIds) {
      if (!patientId) continue;
      try {
        await refreshPatient360(patientId, batchId);
        patientsRefreshed++;
      } catch (err) {
        console.error(`[360 Refresh] Error refreshing patient ${patientId}:`, err);
        errors++;
      }
    }
    
    console.log(`[360 Refresh] Batch ${batchId} complete:
      - Providers refreshed: ${providersRefreshed}
      - Doctors refreshed: ${doctorsRefreshed}
      - Patients refreshed: ${patientsRefreshed}
      - Errors: ${errors}`);
    
    return { providersRefreshed, doctorsRefreshed, patientsRefreshed, errors };
    
  } catch (error) {
    console.error(`[360 Refresh] Critical error refreshing batch ${batchId}:`, error);
    throw error;
  }
}

async function refreshProvider360(providerId: string, batchId: string): Promise<void> {
  // Get existing provider info first (preserve existing name if available)
  const existingProvider = await db.execute(sql`
    SELECT provider_name, provider_type, specialty, region, city
    FROM provider_360
    WHERE provider_id = ${providerId}
  `);
  const existingData = existingProvider.rows[0] as any;
  
  // Aggregate data from all claims for this provider
  const aggregateData = await db.execute(sql`
    SELECT 
      COUNT(*) as total_claims,
      SUM(CAST(amount AS DECIMAL)) as total_amount,
      AVG(CAST(amount AS DECIMAL)) as avg_claim_amount,
      COUNT(DISTINCT member_id) as unique_patients,
      COUNT(DISTINCT practitioner_id) as unique_doctors,
      MAX(provider_type) as provider_type,
      MAX(city) as city
    FROM claims_v2
    WHERE provider_id = ${providerId}
  `);
  
  // Get latest entity detection result
  const latestDetection = await db.execute(sql`
    SELECT composite_score, risk_level
    FROM fwa_provider_detection_results
    WHERE provider_id = ${providerId}
    ORDER BY analyzed_at DESC
    LIMIT 1
  `);
  
  // Get flagged claims count
  const flaggedClaims = await db.execute(sql`
    SELECT COUNT(*) as flagged_count
    FROM fwa_detection_results dr
    JOIN claims_v2 ac ON dr.claim_id = ac.id
    WHERE ac.provider_id = ${providerId}
    AND dr.composite_risk_level IN ('critical', 'high')
  `);
  
  const data = aggregateData.rows[0] as any;
  const detection = latestDetection.rows[0] as any;
  const flagged = flaggedClaims.rows[0] as any;
  
  // Use existing name if available, otherwise use provider_id as fallback
  const providerName = existingData?.provider_name || providerId;
  const providerType = data?.provider_type || existingData?.provider_type || null;
  const city = data?.city || existingData?.city || null;
  
  // Update or insert provider 360
  await db.execute(sql`
    INSERT INTO provider_360 (
      id, provider_id, provider_name, provider_type, city, risk_score, risk_level,
      claims_summary, last_analyzed_at, updated_at
    ) VALUES (
      gen_random_uuid()::text,
      ${providerId},
      ${providerName},
      ${providerType},
      ${city},
      ${detection?.composite_score || 0},
      COALESCE(${detection?.risk_level}, 'low'),
      ${JSON.stringify({
        totalClaims: parseInt(data?.total_claims || '0'),
        totalAmount: parseFloat(data?.total_amount || '0'),
        avgClaimAmount: parseFloat(data?.avg_claim_amount || '0'),
        uniquePatients: parseInt(data?.unique_patients || '0'),
        flaggedClaimsCount: parseInt(flagged?.flagged_count || '0'),
        denialRate: 0
      })}::jsonb,
      NOW(),
      NOW()
    )
    ON CONFLICT (provider_id) DO UPDATE SET
      provider_type = COALESCE(${providerType}, provider_360.provider_type),
      city = COALESCE(${city}, provider_360.city),
      risk_score = ${detection?.composite_score || 0},
      risk_level = COALESCE(${detection?.risk_level}, 'low'),
      claims_summary = ${JSON.stringify({
        totalClaims: parseInt(data?.total_claims || '0'),
        totalAmount: parseFloat(data?.total_amount || '0'),
        avgClaimAmount: parseFloat(data?.avg_claim_amount || '0'),
        uniquePatients: parseInt(data?.unique_patients || '0'),
        flaggedClaimsCount: parseInt(flagged?.flagged_count || '0'),
        denialRate: 0
      })}::jsonb,
      last_analyzed_at = NOW(),
      updated_at = NOW()
  `);
}

async function refreshDoctor360(doctorId: string, batchId: string): Promise<void> {
  // Get existing doctor info first (preserve existing name if available)
  const existingDoctor = await db.execute(sql`
    SELECT doctor_name, specialty_code
    FROM doctor_360
    WHERE doctor_id = ${doctorId}
  `);
  const existingData = existingDoctor.rows[0] as any;
  
  // Aggregate data from all claims for this doctor
  const aggregateData = await db.execute(sql`
    SELECT 
      COUNT(*) as total_claims,
      SUM(CAST(amount AS DECIMAL)) as total_amount,
      AVG(CAST(amount AS DECIMAL)) as avg_claim_amount,
      COUNT(DISTINCT member_id) as unique_patients,
      COUNT(DISTINCT provider_id) as unique_providers,
      MAX(specialty) as specialty_code
    FROM claims_v2
    WHERE practitioner_id = ${doctorId}
  `);
  
  // Get latest entity detection result
  const latestDetection = await db.execute(sql`
    SELECT composite_score, risk_level
    FROM fwa_doctor_detection_results
    WHERE doctor_id = ${doctorId}
    ORDER BY analyzed_at DESC
    LIMIT 1
  `);
  
  // Get flagged claims count
  const flaggedClaims = await db.execute(sql`
    SELECT COUNT(*) as flagged_count
    FROM fwa_detection_results dr
    JOIN claims_v2 ac ON dr.claim_id = ac.id
    WHERE ac.practitioner_id = ${doctorId}
    AND dr.composite_risk_level IN ('critical', 'high')
  `);
  
  const data = aggregateData.rows[0] as any;
  const detection = latestDetection.rows[0] as any;
  const flagged = flaggedClaims.rows[0] as any;
  
  // Use existing name if available, otherwise use license ID
  const doctorName = existingData?.doctor_name || doctorId;
  const specialtyCode = data?.specialty_code || existingData?.specialty_code || null;
  
  // Update or insert doctor 360
  await db.execute(sql`
    INSERT INTO doctor_360 (
      id, doctor_id, doctor_name, specialty_code, risk_score, risk_level,
      claims_summary, last_analyzed_at, updated_at
    ) VALUES (
      gen_random_uuid()::text,
      ${doctorId},
      ${doctorName},
      ${specialtyCode},
      ${detection?.composite_score || 0},
      COALESCE(${detection?.risk_level}, 'low'),
      ${JSON.stringify({
        totalClaims: parseInt(data?.total_claims || '0'),
        totalAmount: parseFloat(data?.total_amount || '0'),
        avgClaimAmount: parseFloat(data?.avg_claim_amount || '0'),
        uniquePatients: parseInt(data?.unique_patients || '0'),
        uniqueProviders: parseInt(data?.unique_providers || '0'),
        flaggedClaimsCount: parseInt(flagged?.flagged_count || '0')
      })}::jsonb,
      NOW(),
      NOW()
    )
    ON CONFLICT (doctor_id) DO UPDATE SET
      specialty_code = COALESCE(${specialtyCode}, doctor_360.specialty_code),
      risk_score = ${detection?.composite_score || 0},
      risk_level = COALESCE(${detection?.risk_level}, 'low'),
      claims_summary = ${JSON.stringify({
        totalClaims: parseInt(data?.total_claims || '0'),
        totalAmount: parseFloat(data?.total_amount || '0'),
        avgClaimAmount: parseFloat(data?.avg_claim_amount || '0'),
        uniquePatients: parseInt(data?.unique_patients || '0'),
        uniqueProviders: parseInt(data?.unique_providers || '0'),
        flaggedClaimsCount: parseInt(flagged?.flagged_count || '0')
      })}::jsonb,
      last_analyzed_at = NOW(),
      updated_at = NOW()
  `);
}

async function refreshPatient360(patientId: string, batchId: string): Promise<void> {
  // Get existing patient info first (preserve existing member_id and name if available)
  const existingPatient = await db.execute(sql`
    SELECT member_id, patient_name
    FROM patient_360
    WHERE patient_id = ${patientId}
  `);
  const existingData = existingPatient.rows[0] as any;
  
  // Aggregate data from all claims for this patient
  const aggregateData = await db.execute(sql`
    SELECT 
      COUNT(*) as total_claims,
      SUM(CAST(amount AS DECIMAL)) as total_amount,
      AVG(CAST(amount AS DECIMAL)) as avg_claim_amount,
      COUNT(DISTINCT provider_id) as unique_providers,
      COUNT(DISTINCT practitioner_id) as unique_doctors,
      MAX(city) as primary_city
    FROM claims_v2
    WHERE member_id = ${patientId}
  `);

  // Get latest entity detection result
  const latestDetection = await db.execute(sql`
    SELECT composite_score, risk_level
    FROM fwa_patient_detection_results
    WHERE patient_id = ${patientId}
    ORDER BY analyzed_at DESC
    LIMIT 1
  `);

  // Get flagged claims count
  const flaggedClaims = await db.execute(sql`
    SELECT COUNT(*) as flagged_count
    FROM fwa_detection_results dr
    JOIN claims_v2 ac ON dr.claim_id = ac.id
    WHERE ac.member_id = ${patientId}
    AND dr.composite_risk_level IN ('critical', 'high')
  `);
  
  const data = aggregateData.rows[0] as any;
  const detection = latestDetection.rows[0] as any;
  const flagged = flaggedClaims.rows[0] as any;
  
  // Use existing member_id if available
  const memberId = existingData?.member_id || patientId;
  const primaryCity = data?.primary_city || null;
  
  // Update or insert patient 360
  await db.execute(sql`
    INSERT INTO patient_360 (
      id, patient_id, member_id, risk_score, risk_level,
      claims_summary, last_analyzed_at, updated_at
    ) VALUES (
      gen_random_uuid()::text,
      ${patientId},
      ${memberId},
      ${detection?.composite_score || 0},
      COALESCE(${detection?.risk_level}, 'low'),
      ${JSON.stringify({
        totalClaims: parseInt(data?.total_claims || '0'),
        totalAmount: parseFloat(data?.total_amount || '0'),
        avgClaimAmount: parseFloat(data?.avg_claim_amount || '0'),
        uniqueProviders: parseInt(data?.unique_providers || '0'),
        uniqueDoctors: parseInt(data?.unique_doctors || '0'),
        flaggedClaimsCount: parseInt(flagged?.flagged_count || '0'),
        primaryCity: primaryCity
      })}::jsonb,
      NOW(),
      NOW()
    )
    ON CONFLICT (patient_id) DO UPDATE SET
      risk_score = ${detection?.composite_score || 0},
      risk_level = COALESCE(${detection?.risk_level}, 'low'),
      claims_summary = ${JSON.stringify({
        totalClaims: parseInt(data?.total_claims || '0'),
        totalAmount: parseFloat(data?.total_amount || '0'),
        avgClaimAmount: parseFloat(data?.avg_claim_amount || '0'),
        uniqueProviders: parseInt(data?.unique_providers || '0'),
        uniqueDoctors: parseInt(data?.unique_doctors || '0'),
        flaggedClaimsCount: parseInt(flagged?.flagged_count || '0'),
        primaryCity: primaryCity
      })}::jsonb,
      last_analyzed_at = NOW(),
      updated_at = NOW()
  `);
}
