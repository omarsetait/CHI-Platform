import OpenAI from "openai";
import { db } from "../db";
import {
  fwaRulesLibrary, fwaRuleHits, claims, fwaFeatureStore,
  fwaDetectionResults, fwaDetectionRuns, fwaAnomalyClusters,
  policyViolationCatalogue, fwaBehaviors,
  provider360, patient360, doctor360
} from "@shared/schema";
import { eq, sql, desc, and, gte, lte, inArray, ne, isNotNull } from "drizzle-orm";
import { generateEmbedding, semanticSearch } from "./embedding-service";
import { networkFeatureService } from "./network-feature-service";
import { ruleFieldRegistry } from "./rule-field-registry";

const unknownFieldWarnings = new Set<string>();

function validateRuleField(field: string, ruleCode: string): string {
  const isValid = ruleFieldRegistry.isValidField(field);
  
  if (!isValid) {
    const warningKey = `${ruleCode}:${field}`;
    if (!unknownFieldWarnings.has(warningKey)) {
      unknownFieldWarnings.add(warningKey);
      console.warn(`[FWA-VALIDATION] Unknown field "${field}" in rule ${ruleCode}. Consider adding to field registry.`);
    }
  }
  
  return field;
}

const openai = new OpenAI();

const DEFAULT_WEIGHTS = {
  rule_engine: 0.35,
  statistical_learning: 0.25,
  unsupervised_learning: 0.20,
  rag_llm: 0.20
};

export interface AnalyzedClaimData {
  id: string;
  claimNumber: string;
  providerId: string;
  memberId: string;
  practitionerId?: string | null;
  specialty?: string | null;
  city?: string | null;
  providerType?: string | null;
  unitPrice?: number | null;
  amount?: number | null;
  quantity?: number | null;
  primaryDiagnosis?: string | null;
  cptCodes?: string[] | null;
  description?: string | null;
  claimType?: string | null;
  lengthOfStay?: number | null;
  status?: string | null;
  isPreAuthorized?: boolean;
}

interface DetectionResult {
  claimId: string;
  claimNumber: string;
  compositeScore: number;
  compositeRiskLevel: string;
  ruleEngineScore: number;
  statisticalScore: number;
  unsupervisedScore: number;
  ragLlmScore: number;
  ruleEngineFindings: RuleEngineFindings;
  statisticalFindings: StatisticalFindings;
  unsupervisedFindings: UnsupervisedFindings;
  ragLlmFindings: RagLlmFindings;
  primaryDetectionMethod: string;
  detectionSummary: string;
  recommendedAction: string;
  riskFactors: Array<{
    factor: string;
    severity: string;
    description: string;
    weight: number;
  }>;
  processingTimeMs: number;
}

interface RuleEngineFindings {
  matchedRules: Array<{
    ruleId: string;
    ruleCode: string;
    ruleName: string;
    category: string;
    severity: string;
    confidence: number;
    description: string;
    matchedFields: Record<string, any>;
    humanReadableExplanation: string;
    evidencePoints: Array<{
      field: string;
      value: any;
      reason: string;
    }>;
    suggestedAction: string;
  }>;
  totalRulesChecked: number;
  violationCount: number;
}

interface StatisticalFindings {
  modelPrediction: number;
  featureImportance: Array<{ feature: string; importance: number; value: number; peerMean?: number; zScore?: number }>;
  peerComparison: { 
    peerGroupId: string;
    mean: number; 
    stdDev: number; 
    zScore: number;
    percentileRank: number;
  };
  historicalTrend: string;
  providerStats: any;
  patientStats: any;
}

interface UnsupervisedFindings {
  anomalyScore: number;
  clusterAssignment: number;
  clusterSize: number;
  outlierReason: string[];
  isolationForestScore: number;
  nearestClusterDistance: number;
  dimensionAnalysis: {
    providerDimension: { score: number; reason: string };
    patientDimension: { score: number; reason: string };
    doctorDimension: { score: number; reason: string };
  };
}

interface RagLlmFindings {
  contextualAnalysis: string;
  similarCases: Array<{ caseId: string; similarity: number; outcome: string }>;
  knowledgeBaseMatches: Array<{ docId: string; title: string; relevance: number; source: string }>;
  recommendation: string;
  confidence: number;
  evidenceChain: string[];
}

// =============================================================================
// HELPER FUNCTIONS FOR EXPLAINABILITY
// =============================================================================

function generateExplanationForMatchedRule(
  rule: any, 
  claim: AnalyzedClaimData, 
  matchedFields: Record<string, any>,
  category: string
): { explanation: string; evidencePoints: Array<{ field: string; value: any; reason: string }> } {
  const evidencePoints: Array<{ field: string; value: any; reason: string }> = [];
  let explanation = "";

  // Upcoding detection
  if (category.toLowerCase().includes("upcoding") || rule.ruleCode?.includes("UPCODING")) {
    const claimAmount = claim.amount || claim.unitPrice || 0;
    const peerAverage = matchedFields.peerAverage || 2500;
    const variance = ((claimAmount - peerAverage) / peerAverage * 100).toFixed(1);
    
    explanation = `This claim was flagged for upcoding because the billed amount of ${claimAmount.toLocaleString()} SAR significantly exceeds the average of ${peerAverage.toLocaleString()} SAR for similar procedures (variance: +${variance}%). Service code: ${claim.cptCodes?.[0]}`;
    
    evidencePoints.push({
      field: "totalAmount",
      value: claimAmount,
      reason: `Billed amount (${claimAmount.toLocaleString()} SAR) exceeds peer average by ${variance}%`
    });
    
    if (claim.cptCodes?.[0]) {
      evidencePoints.push({
        field: "serviceCode",
        value: claim.cptCodes?.[0],
        reason: `Service code ${claim.cptCodes?.[0]} typically costs ${peerAverage.toLocaleString()} SAR`
      });
    }
  }

  // Duplicate billing detection
  else if (category.toLowerCase().includes("duplicate") || rule.ruleCode?.includes("DUPLICATE")) {
    explanation = `Duplicate billing detected: Same procedure code ${claim.cptCodes?.[0]} was billed for the same patient within a short timeframe. This may indicate improper claim submission or billing error.`;
    
    evidencePoints.push({
      field: "serviceCode",
      value: claim.cptCodes?.[0],
      reason: `Same service code submitted multiple times`
    });
    
    if (claim.memberId) {
      evidencePoints.push({
        field: "patientId",
        value: claim.memberId,
        reason: `Multiple claims for same patient ID within short period`
      });
    }
  }

  // Geographic anomaly
  else if (category.toLowerCase().includes("geographic") || rule.ruleCode?.includes("GEO")) {
    const providerCity = matchedFields.providerCity || claim.city || "unknown";
    const patientCity = matchedFields.patientCity || "unknown";
    
    explanation = `Geographic anomaly detected: Provider is located in ${providerCity} but patient claims originate from ${patientCity} on the same service date. This pattern may indicate provider fraud or patient identity issues.`;
    
    evidencePoints.push({
      field: "providerLocation",
      value: providerCity,
      reason: `Provider registered in ${providerCity}`
    });
    
    if (patientCity !== providerCity) {
      evidencePoints.push({
        field: "patientLocation",
        value: patientCity,
        reason: `Patient claims from ${patientCity}, inconsistent with provider location`
      });
    }
  }

  // Pre-authorization violations
  else if (category.toLowerCase().includes("pre-auth") || rule.ruleCode?.includes("PREAUTH")) {
    explanation = `Pre-authorization requirement violation: Claim for ${claim.claimType || "service"} requires pre-authorization but was submitted without approval code. Amount: ${claim.amount?.toLocaleString()} SAR.`;
    
    evidencePoints.push({
      field: "isPreAuthorized",
      value: claim.isPreAuthorized,
      reason: `Claim submitted without pre-authorization despite requirement`
    });
    
    if (claim.claimType) {
      evidencePoints.push({
        field: "claimType",
        value: claim.claimType,
        reason: `${claim.claimType} claims require pre-authorization per policy`
      });
    }
  }

  // High value claims
  else if (category.toLowerCase().includes("high") || category.toLowerCase().includes("amount")) {
    const claimAmount = claim.amount || claim.unitPrice || 0;
    explanation = `High-value claim detected: Amount of ${claimAmount.toLocaleString()} SAR exceeds standard thresholds for ${claim.claimType || "service"}. Requires enhanced review to verify medical necessity and appropriate billing.`;
    
    evidencePoints.push({
      field: "totalAmount",
      value: claimAmount,
      reason: `Claim amount (${claimAmount.toLocaleString()} SAR) exceeds high-value threshold`
    });
  }

  // Extended length of stay
  else if (category.toLowerCase().includes("length") || category.toLowerCase().includes("stay")) {
    const los = claim.lengthOfStay || 0;
    explanation = `Extended length of stay detected: Patient hospitalized for ${los} days, which exceeds typical range for ${claim.primaryDiagnosis || "this diagnosis"}. Requires clinical justification review.`;
    
    evidencePoints.push({
      field: "lengthOfStay",
      value: los,
      reason: `Length of stay (${los} days) exceeds expected range`
    });
    
    if (claim.primaryDiagnosis) {
      evidencePoints.push({
        field: "diagnosisCode",
        value: claim.primaryDiagnosis,
        reason: `Diagnosis ${claim.primaryDiagnosis} typically requires shorter stay`
      });
    }
  }

  // Unusual service/diagnosis combination
  else if (category.toLowerCase().includes("combination") || category.toLowerCase().includes("coding")) {
    explanation = `Unusual service-diagnosis combination detected: Service code ${claim.cptCodes?.[0]} is inconsistent with diagnosis code ${claim.primaryDiagnosis}. Review medical necessity and proper coding.`;
    
    evidencePoints.push({
      field: "serviceCode",
      value: claim.cptCodes?.[0],
      reason: `Service code inconsistent with diagnosis`
    });
    
    evidencePoints.push({
      field: "diagnosisCode",
      value: claim.primaryDiagnosis,
      reason: `Diagnosis code does not typically pair with this service`
    });
  }

  // Default explanation
  else {
    explanation = `Rule triggered: ${rule.name || rule.ruleName}. ${rule.description || "This claim matches pattern-based fraud detection criteria."}`;
    
    Object.entries(matchedFields).forEach(([field, value]) => {
      evidencePoints.push({
        field,
        value,
        reason: `Field ${field} matches rule criteria`
      });
    });
  }

  // Ensure we have at least one evidence point
  if (evidencePoints.length === 0) {
    evidencePoints.push({
      field: "generic",
      value: true,
      reason: `Rule ${rule.ruleCode} pattern matched`
    });
  }

  return { explanation, evidencePoints };
}

function generateSuggestedAction(severity: string, category: string, confidence: number): string {
  const baseAction = confidence > 0.8 ? "URGENT: " : confidence > 0.6 ? "Priority: " : "";
  
  if (severity === "critical") {
    return `${baseAction}Immediately escalate to CHI FWA Investigation Unit. Suspend claim payment pending investigation. Potential regulatory enforcement action required. Review provider's recent submissions.`;
  } else if (severity === "high") {
    return `${baseAction}Priority review by Senior FWA Analyst. Request supporting documentation from provider. Prepare case summary for potential enforcement action if pattern continues. Monitor provider for recurring issues.`;
  } else if (severity === "medium") {
    return `Request additional documentation from provider to justify claim. Educate provider on correct coding and billing procedures. Monitor for recurring patterns. Consider inclusion in routine audit cycle.`;
  } else {
    return `Flag for routine review. Request clarification if needed. Standard monitoring applies. No immediate enforcement action required.`;
  }
}

function generateRiskFactorsFromMatches(matchedRules: RuleEngineFindings["matchedRules"]): Array<{
  factor: string;
  severity: string;
  description: string;
  weight: number;
}> {
  const riskFactors: Map<string, { severity: string; count: number; descriptions: string[] }> = new Map();
  
  // Aggregate risk factors by category
  for (const rule of matchedRules) {
    const category = rule.category || "other";
    const existing = riskFactors.get(category) || { severity: rule.severity, count: 0, descriptions: [] };
    
    existing.count += 1;
    existing.descriptions.push(rule.ruleName);
    
    // Use highest severity if multiple rules in same category
    if (["critical", "high", "medium", "low"].indexOf(rule.severity) < 
        ["critical", "high", "medium", "low"].indexOf(existing.severity)) {
      existing.severity = rule.severity;
    }
    
    riskFactors.set(category, existing);
  }
  
  // Convert to array and sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  return Array.from(riskFactors.entries())
    .map(([factor, data]) => ({
      factor: factor.charAt(0).toUpperCase() + factor.slice(1),
      severity: data.severity,
      description: `${data.count} rule violation(s): ${data.descriptions.join(", ")}`,
      weight: 1 - (severityOrder[data.severity as keyof typeof severityOrder] || 3) / 4
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5); // Top 5 risk factors
}

// =============================================================================
// 1. PRODUCTION RULE ENGINE
// =============================================================================
export async function runProductionRuleEngine(claim: AnalyzedClaimData): Promise<{
  score: number;
  findings: RuleEngineFindings;
}> {
  const rules = await db.select().from(fwaRulesLibrary)
    .where(eq(fwaRulesLibrary.isActive, true));
  
  const policyViolations = await db.select().from(policyViolationCatalogue)
    .where(eq(policyViolationCatalogue.status, "active"))
    .limit(100);
  
  const behaviors = await db.select().from(fwaBehaviors)
    .where(eq(fwaBehaviors.status, "active"))
    .limit(100);
  
  const matchedRules: RuleEngineFindings["matchedRules"] = [];
  let totalScore = 0;
  
  for (const rule of rules) {
    const match = evaluateRuleConditions(claim, rule);
    if (match.matched) {
      const severityMultiplier = getSeverityMultiplier(rule.severity);
      const baseScore = rule.severity === "critical" ? 30 : rule.severity === "high" ? 20 : rule.severity === "medium" ? 12 : 6;
      const ruleScore = baseScore * severityMultiplier * match.confidence * parseFloat(rule.weight || "1");
      
      // Generate explanation and evidence points
      const { explanation, evidencePoints } = generateExplanationForMatchedRule(
        rule, 
        claim, 
        match.matchedFields, 
        rule.category
      );
      const suggestedAction = generateSuggestedAction(rule.severity, rule.category, match.confidence);
      
      matchedRules.push({
        ruleId: rule.id,
        ruleCode: rule.ruleCode,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        confidence: match.confidence,
        description: rule.description,
        matchedFields: match.matchedFields,
        humanReadableExplanation: explanation,
        evidencePoints: evidencePoints,
        suggestedAction: suggestedAction
      });
      
      totalScore += ruleScore;
      
      try {
        await db.execute(sql`
          INSERT INTO fwa_rule_hits (rule_id, claim_id, confidence, matched_fields, explanation, evidence_data)
          VALUES (
            ${rule.id}, 
            ${claim.id}, 
            ${match.confidence}, 
            ${JSON.stringify(match.matchedFields)}::jsonb, 
            ${explanation},
            ${JSON.stringify({ 
              evidencePoints: evidencePoints,
              suggestedAction: suggestedAction,
              claimValue: match.matchedFields, 
              matchedPattern: rule.conditions 
            })}::jsonb
          )
        `);
      } catch (e) {
        console.error("Error recording rule hit:", e);
      }
    }
  }
  
  for (const violation of policyViolations) {
    const claimText = buildClaimText(claim);
    const violationText = `${violation.title} ${violation.description} ${violation.category}`.toLowerCase();
    const violationWords = violationText.split(/\s+/).filter(w => w.length > 3);
    const matchingWords = violationWords.filter(w => claimText.includes(w));
    
    if (matchingWords.length >= 2) {
      const confidence = Math.min(1, matchingWords.length / 5);
      
      // Generate explanation for policy violations
      const { explanation, evidencePoints } = generateExplanationForMatchedRule(
        violation,
        claim,
        { matchedKeywords: matchingWords },
        violation.category
      );
      const suggestedAction = generateSuggestedAction(violation.severity, violation.category, confidence);
      
      matchedRules.push({
        ruleId: violation.id,
        ruleCode: `PV-${violation.violationCode}`,
        ruleName: violation.title,
        category: violation.category,
        severity: violation.severity,
        confidence,
        description: violation.description || "",
        matchedFields: { matchedKeywords: matchingWords },
        humanReadableExplanation: explanation,
        evidencePoints: evidencePoints,
        suggestedAction: suggestedAction
      });
      totalScore += 15 * confidence * getSeverityMultiplier(violation.severity);
    }
  }
  
  for (const behavior of behaviors) {
    const match = checkBehaviorMatch(claim, behavior);
    if (match.matched) {
      // Generate explanation for behavior patterns
      const { explanation, evidencePoints } = generateExplanationForMatchedRule(
        behavior,
        claim,
        match.matchedFields,
        behavior.category
      );
      const suggestedAction = generateSuggestedAction(behavior.severity, behavior.category, match.confidence);
      
      matchedRules.push({
        ruleId: behavior.id,
        ruleCode: behavior.behaviorCode,
        ruleName: behavior.name,
        category: behavior.category,
        severity: behavior.severity || "medium",
        confidence: match.confidence,
        description: behavior.description || "",
        matchedFields: match.matchedFields,
        humanReadableExplanation: explanation,
        evidencePoints: evidencePoints,
        suggestedAction: suggestedAction
      });
      totalScore += 12 * match.confidence * getSeverityMultiplier(behavior.severity);
    }
  }
  
  const normalizedScore = Math.min(100, totalScore);
  
  return {
    score: normalizedScore,
    findings: {
      matchedRules,
      totalRulesChecked: rules.length + policyViolations.length + behaviors.length,
      violationCount: matchedRules.length
    }
  };
}

function evaluateRuleConditions(claim: AnalyzedClaimData, rule: any): {
  matched: boolean;
  confidence: number;
  matchedFields: Record<string, any>;
} {
  const conditions = rule.conditions as any;
  const ruleCode = rule.ruleCode || rule.id || 'unknown';
  const matchedFields: Record<string, any> = {};
  let matchCount = 0;
  let totalConditions = 0;
  
  if (conditions.field && conditions.operator && conditions.value !== undefined) {
    totalConditions = 1;
    const normalizedField = validateRuleField(conditions.field, ruleCode);
    const fieldValue = getClaimFieldValue(claim, normalizedField);
    if (evaluateCondition(fieldValue, conditions.operator, conditions.value)) {
      matchCount = 1;
      matchedFields[normalizedField] = fieldValue;
    }
  }
  
  if (conditions.and && Array.isArray(conditions.and)) {
    for (const subCondition of conditions.and) {
      totalConditions++;
      const normalizedField = validateRuleField(subCondition.field, ruleCode);
      const fieldValue = getClaimFieldValue(claim, normalizedField);
      if (evaluateCondition(fieldValue, subCondition.operator, subCondition.value)) {
        matchCount++;
        matchedFields[normalizedField] = fieldValue;
      }
    }
    const confidence = totalConditions > 0 ? matchCount / totalConditions : 0;
    return { matched: matchCount === totalConditions && matchCount > 0, confidence, matchedFields };
  }
  
  if (conditions.or && Array.isArray(conditions.or)) {
    for (const subCondition of conditions.or) {
      totalConditions++;
      const normalizedField = validateRuleField(subCondition.field, ruleCode);
      const fieldValue = getClaimFieldValue(claim, normalizedField);
      if (evaluateCondition(fieldValue, subCondition.operator, subCondition.value)) {
        matchCount++;
        matchedFields[normalizedField] = fieldValue;
      }
    }
    const confidence = totalConditions > 0 ? matchCount / totalConditions : 0;
    return { matched: matchCount > 0, confidence: Math.min(1, confidence * 1.5), matchedFields };
  }
  
  const confidence = totalConditions > 0 ? matchCount / totalConditions : 0;
  return { matched: matchCount > 0, confidence, matchedFields };
}

function getClaimFieldValue(claim: AnalyzedClaimData, field: string): any {
  // Extended claim data for feature vector fields
  const extendedClaim = claim as any;
  
  const fieldMap: Record<string, any> = {
    // Basic claim fields - canonical names from registry
    totalAmount: claim.amount,
    amount: claim.amount,
    unitPrice: claim.unitPrice,
    quantity: claim.quantity,
    lengthOfStay: claim.lengthOfStay,
    los: claim.lengthOfStay,
    
    // Diagnosis codes - canonical: icd
    icd: claim.primaryDiagnosis,
    diagnosisCode: claim.primaryDiagnosis,
    principalDiagnosisCode: claim.primaryDiagnosis,
    icdCode: claim.primaryDiagnosis,
    
    // Procedure codes - canonical: cpt
    cpt: claim.cptCodes?.[0],
    procedureCode: claim.cptCodes?.[0],
    cptCode: claim.cptCodes?.[0],
    serviceCode: claim.cptCodes?.[0],
    
    claimType: claim.claimType,
    providerType: claim.providerType,
    specialtyCode: claim.specialty,
    city: claim.city,
    region: claim.city,
    isPreAuthorized: claim.isPreAuthorized,
    providerId: claim.providerId,
    patientId: claim.memberId,
    memberId: claim.memberId,
    
    // Enhanced FWA detection fields
    isPreAuthorizationRequired: extendedClaim.isPreAuthorizationRequired,
    preAuthorizationStatus: extendedClaim.preAuthorizationStatus,
    preAuthorizationId: extendedClaim.preAuthorizationId,
    chronicFlag: extendedClaim.chronicFlag,
    preExistingFlag: extendedClaim.preExistingFlag,
    maternityFlag: extendedClaim.maternityFlag,
    newbornFlag: extendedClaim.newbornFlag,
    policyEffectiveDate: extendedClaim.policyEffectiveDate,
    providerRegion: extendedClaim.providerRegion,
    serviceDate: extendedClaim.serviceDate,
    
    // Extended fields
    modifierCode: extendedClaim.modifierCode,
    referringDoctor: extendedClaim.referringDoctor,
    gender: extendedClaim.gender,
    patientAge: extendedClaim.patientAge,
    dischargeStatus: extendedClaim.dischargeStatus,
    preAuthNumber: extendedClaim.preAuthorizationNumber,
    claimReference: extendedClaim.claimNumber,
    claimNumber: extendedClaim.claimNumber,
    
    // Temporal fields (from feature vector or computed)
    is_night_claim: extendedClaim.is_night_claim,
    is_weekend: extendedClaim.is_weekend,
    submissionHour: extendedClaim.submissionHour,
    claim_day_of_week: extendedClaim.claim_day_of_week,
    burst_pattern_score: extendedClaim.burst_pattern_score,
    frequency_acceleration: extendedClaim.frequency_acceleration,
    member_frequency_acceleration: extendedClaim.frequency_acceleration,
    same_day_claims: extendedClaim.same_day_claims,
    days_since_last_claim: extendedClaim.days_since_last_claim,
    trend_7d_vs_30d: extendedClaim.trend_7d_vs_30d,
    provider_trend_7d_vs_30d: extendedClaim.trend_7d_vs_30d,
    los_vs_expected: extendedClaim.los_vs_expected,
    los_vs_diagnosis_expected: extendedClaim.los_vs_expected,
    
    // Provider aggregate fields with time-windowed canonical names
    provider_claim_count_7d: extendedClaim.provider_claim_count_7d,
    provider_claim_count_30d: extendedClaim.provider_claim_count_30d,
    provider_claim_count_90d: extendedClaim.provider_claim_count_90d,
    provider_avg_amount: extendedClaim.provider_avg_amount,
    provider_avg_amount_30d: extendedClaim.provider_avg_amount,
    provider_std_amount: extendedClaim.provider_std_amount,
    provider_std_amount_30d: extendedClaim.provider_std_amount,
    provider_unique_patients: extendedClaim.provider_unique_patients,
    provider_unique_patients_30d: extendedClaim.provider_unique_patients,
    provider_denial_rate: extendedClaim.provider_denial_rate,
    provider_denial_rate_90d: extendedClaim.provider_denial_rate,
    provider_flag_rate: extendedClaim.provider_flag_rate,
    provider_flag_rate_90d: extendedClaim.provider_flag_rate,
    provider_weekend_ratio: extendedClaim.provider_weekend_ratio,
    provider_night_ratio: extendedClaim.provider_night_ratio,
    provider_surgery_rate: extendedClaim.provider_surgery_rate,
    
    // Member aggregate fields with time-windowed canonical names
    member_claim_count_30d: extendedClaim.member_claim_count || extendedClaim.member_claim_count_30d,
    member_claim_count: extendedClaim.member_claim_count || extendedClaim.member_claim_count_30d,
    member_claim_count_90d: extendedClaim.member_claim_count_90d || extendedClaim.member_claim_count,
    member_unique_providers: extendedClaim.member_unique_providers,
    member_unique_providers_30d: extendedClaim.member_unique_providers,
    member_unique_diagnoses: extendedClaim.member_unique_diagnoses,
    member_unique_diagnoses_30d: extendedClaim.member_unique_diagnoses,
    member_total_amount: extendedClaim.member_total_amount,
    member_total_amount_30d: extendedClaim.member_total_amount,
    member_avg_amount: extendedClaim.member_avg_amount,
    member_avg_amount_30d: extendedClaim.member_avg_amount,
    member_surgery_count: extendedClaim.member_surgery_count,
    member_surgery_count_90d: extendedClaim.member_surgery_count,
    member_icu_count: extendedClaim.member_icu_count,
    member_icu_count_90d: extendedClaim.member_icu_count,
    high_utilizer_flag: extendedClaim.high_utilizer_flag,
    
    // Statistical comparison fields with canonical aliases
    amount_zscore: extendedClaim.amount_zscore,
    amount_percentile: extendedClaim.amount_percentile,
    amount_vs_provider_avg: extendedClaim.amount_vs_provider_avg,
    amount_vs_member_avg: extendedClaim.amount_vs_member_avg,
    amount_vs_peer_avg: extendedClaim.amount_vs_peer_avg,
    amount_vs_peer_group: extendedClaim.amount_vs_peer_avg,
    outlier_score: extendedClaim.outlier_score,
    complexity_score: extendedClaim.complexity_score,
    risk_indicator_count: extendedClaim.risk_indicator_count,
    
    // Procedure-related derived fields
    procedure_density: extendedClaim.procedure_density,
    procedure_diagnosis_mismatch: extendedClaim.procedure_diagnosis_mismatch,
    procedure_count: extendedClaim.procedure_count,
    diagnosis_count: extendedClaim.diagnosis_count,
    surgery_fee: extendedClaim.surgery_fee,
    amount_procedure_ratio: extendedClaim.amount_procedure_ratio,
    
    // Network/collusion fields
    entity_network_score: extendedClaim.entity_network_score,
    cross_entity_anomaly: extendedClaim.cross_entity_anomaly,
    collusion_indicator: extendedClaim.collusion_indicator,
    
    // Peer comparison fields
    specialty_percentile: extendedClaim.specialty_percentile,
    region_percentile: extendedClaim.region_percentile,
    peer_group_zscore: extendedClaim.peer_group_zscore,
    peer_denial_comparison: extendedClaim.peer_denial_comparison,
    peer_flag_comparison: extendedClaim.peer_flag_comparison,
    peer_amount_ratio: extendedClaim.peer_amount_ratio,
    
    // Pattern matching
    historical_pattern_match: extendedClaim.historical_pattern_match,
    
    // Risk score fields
    provider_risk_score: extendedClaim.provider_risk_score,
    member_risk_score: extendedClaim.member_risk_score,
    doctor_risk_score: extendedClaim.doctor_risk_score,
    
    // Surgery fee canonical name
    surgeryFee: extendedClaim.surgery_fee
  };
  
  // Return the mapped value or fall back to dynamic property lookup
  // Do NOT provide default values - let undefined propagate so rules can handle missing data
  return fieldMap[field] ?? extendedClaim[field];
}

function evaluateCondition(value: any, operator: string, expected: any): boolean {
  // Handle not_null operator specially
  if (operator === "not_null") {
    return value !== null && value !== undefined && value !== "";
  }
  
  if (value === null || value === undefined) return false;
  
  switch (operator) {
    case "equals": return value === expected || String(value).toLowerCase() === String(expected).toLowerCase();
    case "not_equals": return value !== expected && String(value).toLowerCase() !== String(expected).toLowerCase();
    case "greater_than": return Number(value) > Number(expected);
    case "less_than": return Number(value) < Number(expected);
    case "greater_equal": 
    case "greater_than_or_equals": return Number(value) >= Number(expected);
    case "less_equal": 
    case "less_than_or_equals": return Number(value) <= Number(expected);
    case "contains": return String(value).toLowerCase().includes(String(expected).toLowerCase());
    case "not_contains": return !String(value).toLowerCase().includes(String(expected).toLowerCase());
    case "starts_with": 
      if (Array.isArray(expected)) {
        return expected.some(v => String(value).toLowerCase().startsWith(String(v).toLowerCase()));
      }
      return String(value).toLowerCase().startsWith(String(expected).toLowerCase());
    case "not_starts_with":
      if (Array.isArray(expected)) {
        return !expected.some(v => String(value).toLowerCase().startsWith(String(v).toLowerCase()));
      }
      return !String(value).toLowerCase().startsWith(String(expected).toLowerCase());
    case "ends_with":
      if (Array.isArray(expected)) {
        return expected.some(v => String(value).toLowerCase().endsWith(String(v).toLowerCase()));
      }
      return String(value).toLowerCase().endsWith(String(expected).toLowerCase());
    case "in": 
      return Array.isArray(expected) && expected.some(v => 
        String(value).toLowerCase() === String(v).toLowerCase()
      );
    case "not_in": 
      return Array.isArray(expected) && !expected.some(v => 
        String(value).toLowerCase() === String(v).toLowerCase()
      );
    case "regex": 
      try {
        return new RegExp(expected, "i").test(String(value));
      } catch {
        return false;
      }
    case "between": return Array.isArray(expected) && expected.length === 2 && 
      Number(value) >= expected[0] && Number(value) <= expected[1];
    default: return false;
  }
}

function checkBehaviorMatch(claim: AnalyzedClaimData, behavior: any): { matched: boolean; confidence: number; matchedFields: Record<string, any> } {
  const matchedFields: Record<string, any> = {};
  let score = 0;
  
  const indicators = behavior.indicators || [];
  const patterns = behavior.patterns || [];
  const claimText = buildClaimText(claim);
  
  for (const indicator of indicators) {
    if (claimText.includes(String(indicator).toLowerCase())) {
      score += 0.2;
      matchedFields[`indicator_${indicator}`] = true;
    }
  }
  
  for (const pattern of patterns) {
    if (claimText.includes(String(pattern).toLowerCase())) {
      score += 0.15;
      matchedFields[`pattern_${pattern}`] = true;
    }
  }
  
  if (behavior.category === "duplicate_claims" && claim.claimNumber) {
    score += 0.1;
  }
  
  if (behavior.category === "upcoding" && claim.amount && claim.amount > 50000) {
    score += 0.2;
    matchedFields.highAmount = claim.amount;
  }
  
  return { matched: score > 0.1, confidence: Math.min(1, score), matchedFields };
}

function buildClaimText(claim: AnalyzedClaimData): string {
  return `${claim.description || ""} ${claim.primaryDiagnosis || ""} ${claim.cptCodes?.[0] || ""} ${claim.claimType || ""}`.toLowerCase();
}

function getSeverityMultiplier(severity: string | null): number {
  switch (severity) {
    case "critical": return 1.5;
    case "high": case "major": return 1.2;
    case "medium": case "moderate": return 1.0;
    case "low": case "minor": return 0.7;
    default: return 1.0;
  }
}

// =============================================================================
// 2. PRODUCTION STATISTICAL LEARNING
// =============================================================================
export async function runProductionStatisticalLearning(claim: AnalyzedClaimData): Promise<{
  score: number;
  findings: StatisticalFindings;
}> {
  const providerFeatures = await db.select().from(fwaFeatureStore)
    .where(and(
      eq(fwaFeatureStore.entityType, "provider"),
      eq(fwaFeatureStore.entityId, claim.providerId)
    ))
    .limit(1);
  
  const patientFeatures = await db.select().from(fwaFeatureStore)
    .where(and(
      eq(fwaFeatureStore.entityType, "patient"),
      eq(fwaFeatureStore.entityId, claim.memberId)
    ))
    .limit(1);
  
  const doctorFeatures = claim.practitionerId ? await db.select().from(fwaFeatureStore)
    .where(and(
      eq(fwaFeatureStore.entityType, "doctor"),
      eq(fwaFeatureStore.entityId, claim.practitionerId)
    ))
    .limit(1) : [];
  
  const globalStats = await db.execute(sql`
    SELECT 
      AVG(COALESCE(amount::numeric, 0)) as global_avg,
      STDDEV(COALESCE(amount::numeric, 0)) as global_stddev,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY COALESCE(amount::numeric, 0)) as median,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY COALESCE(amount::numeric, 0)) as p95
    FROM claims_v2
    WHERE amount IS NOT NULL
  `);
  
  const globalRow = globalStats.rows[0] as any;
  const globalAvg = parseFloat(globalRow?.global_avg) || 10000;
  const globalStdDev = parseFloat(globalRow?.global_stddev) || 20000;
  const p95 = parseFloat(globalRow?.p95) || 100000;
  
  const features: StatisticalFindings["featureImportance"] = [];
  let totalScore = 0;
  
  const claimAmount = claim.amount || claim.unitPrice || 0;
  const amountZScore = globalStdDev > 0 ? (claimAmount - globalAvg) / globalStdDev : 0;
  const amountScore = Math.min(1, Math.max(0, (amountZScore + 2) / 4));
  features.push({
    feature: "claim_amount_zscore",
    importance: 0.25,
    value: claimAmount,
    peerMean: globalAvg,
    zScore: amountZScore
  });
  totalScore += amountScore * 0.25;
  
  const providerStats = providerFeatures[0];
  if (providerStats) {
    const providerZScore = parseFloat(providerStats.zScore || "0");
    const providerRejectionRate = parseFloat(providerStats.rejectionRate || "0");
    const providerClaimCount = providerStats.claimCount || 0;
    
    const providerRiskScore = Math.min(1, 
      (Math.abs(providerZScore) / 3) * 0.4 + 
      providerRejectionRate * 0.3 + 
      (providerClaimCount > 100 ? 0.3 : providerClaimCount / 333)
    );
    
    features.push({
      feature: "provider_risk_score",
      importance: 0.20,
      value: providerRiskScore,
      peerMean: parseFloat(providerStats.peerMean || "0"),
      zScore: providerZScore
    });
    totalScore += providerRiskScore * 0.20;
    
    features.push({
      feature: "provider_rejection_rate",
      importance: 0.10,
      value: providerRejectionRate,
      peerMean: 0.05
    });
    totalScore += Math.min(1, providerRejectionRate * 5) * 0.10;
  } else {
    features.push({ feature: "provider_risk_score", importance: 0.20, value: 0.3 });
    totalScore += 0.3 * 0.20;
  }
  
  const patientStats = patientFeatures[0];
  if (patientStats) {
    const patientClaimCount = patientStats.claimCount || 0;
    const patientAvgAmount = parseFloat(patientStats.avgClaimAmount || "0");
    const patientUniqueProviders = patientStats.uniqueProviders || 0;
    
    const patientRiskScore = Math.min(1,
      (patientClaimCount > 20 ? 0.4 : patientClaimCount / 50) +
      (patientUniqueProviders > 10 ? 0.3 : patientUniqueProviders / 33) +
      (patientAvgAmount > globalAvg * 2 ? 0.3 : patientAvgAmount / (globalAvg * 6.67))
    );
    
    features.push({
      feature: "patient_utilization_score",
      importance: 0.15,
      value: patientRiskScore,
      peerMean: patientAvgAmount
    });
    totalScore += patientRiskScore * 0.15;
  } else {
    features.push({ feature: "patient_utilization_score", importance: 0.15, value: 0.2 });
    totalScore += 0.2 * 0.15;
  }
  
  const isHighComplexity = claim.claimType === "inpatient" || (claim.lengthOfStay && claim.lengthOfStay > 3);
  const complexityScore = claimAmount > p95 ? 0.8 : claimAmount > globalAvg * 3 ? 0.5 : 0.2;
  features.push({
    feature: "amount_complexity_match",
    importance: 0.15,
    value: complexityScore
  });
  totalScore += complexityScore * 0.15;
  
  const isWeekend = claim.claimType?.toLowerCase().includes("emergency") ? 0.3 : 0.1;
  features.push({ feature: "temporal_pattern", importance: 0.08, value: isWeekend });
  totalScore += isWeekend * 0.08;
  
  const claimTypeRisk = ["inpatient", "surgery"].includes(claim.claimType?.toLowerCase() || "") ? 0.5 : 0.2;
  features.push({ feature: "claim_type_risk", importance: 0.07, value: claimTypeRisk });
  totalScore += claimTypeRisk * 0.07;
  
  const normalizedScore = Math.min(100, totalScore * 100);
  
  const peerGroupId = providerStats?.peerGroupId || `${claim.specialty}-${claim.city}-${claim.providerType}`;
  
  return {
    score: normalizedScore,
    findings: {
      modelPrediction: normalizedScore / 100,
      featureImportance: features.sort((a, b) => b.importance - a.importance),
      peerComparison: {
        peerGroupId,
        mean: providerStats ? parseFloat(providerStats.peerMean || "0") : globalAvg,
        stdDev: providerStats ? parseFloat(providerStats.peerStdDev || "0") : globalStdDev,
        zScore: providerStats ? parseFloat(providerStats.zScore || "0") : amountZScore,
        percentileRank: providerStats?.percentileRank || 50
      },
      historicalTrend: normalizedScore > 60 ? "increasing_risk" : normalizedScore > 40 ? "stable" : "low_risk",
      providerStats: providerStats || null,
      patientStats: patientStats || null
    }
  };
}

// =============================================================================
// 3. PRODUCTION UNSUPERVISED LEARNING
// =============================================================================
export async function runProductionUnsupervisedLearning(claim: AnalyzedClaimData): Promise<{
  score: number;
  findings: UnsupervisedFindings;
}> {
  const isolationScore = await calculateIsolationForestScore(claim);
  
  const clusterAnalysis = await analyzeMultiDimensionalClusters(claim);
  
  const anomalyScore = (
    isolationScore.score * 0.4 +
    clusterAnalysis.providerScore * 0.25 +
    clusterAnalysis.patientScore * 0.20 +
    clusterAnalysis.doctorScore * 0.15
  );
  
  const outlierReasons: string[] = [];
  
  if (isolationScore.score > 0.7) {
    outlierReasons.push(...isolationScore.reasons);
  }
  if (clusterAnalysis.providerScore > 0.7) {
    outlierReasons.push(`Provider behavior deviation: ${clusterAnalysis.providerReason}`);
  }
  if (clusterAnalysis.patientScore > 0.7) {
    outlierReasons.push(`Patient pattern anomaly: ${clusterAnalysis.patientReason}`);
  }
  if (clusterAnalysis.doctorScore > 0.7) {
    outlierReasons.push(`Doctor practice outlier: ${clusterAnalysis.doctorReason}`);
  }
  
  return {
    score: anomalyScore * 100,
    findings: {
      anomalyScore,
      clusterAssignment: clusterAnalysis.cluster,
      clusterSize: clusterAnalysis.clusterSize,
      outlierReason: outlierReasons,
      isolationForestScore: isolationScore.score,
      nearestClusterDistance: clusterAnalysis.distance,
      dimensionAnalysis: {
        providerDimension: { score: clusterAnalysis.providerScore, reason: clusterAnalysis.providerReason },
        patientDimension: { score: clusterAnalysis.patientScore, reason: clusterAnalysis.patientReason },
        doctorDimension: { score: clusterAnalysis.doctorScore, reason: clusterAnalysis.doctorReason }
      }
    }
  };
}

async function calculateIsolationForestScore(claim: AnalyzedClaimData): Promise<{
  score: number;
  reasons: string[];
}> {
  const reasons: string[] = [];
  let anomalyIndicators = 0;
  
  const claimAmount = claim.amount || claim.unitPrice || 0;
  
  const amountStats = await db.execute(sql`
    SELECT 
      PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY COALESCE(amount::numeric, 0)) as p90,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY COALESCE(amount::numeric, 0)) as p95,
      PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY COALESCE(amount::numeric, 0)) as p99,
      MAX(COALESCE(amount::numeric, 0)) as max_amount
    FROM claims_v2
    WHERE amount IS NOT NULL
  `);
  
  const stats = amountStats.rows[0] as any;
  const p90 = parseFloat(stats?.p90) || 50000;
  const p95 = parseFloat(stats?.p95) || 100000;
  const p99 = parseFloat(stats?.p99) || 500000;
  
  if (claimAmount > p99) {
    anomalyIndicators += 3;
    reasons.push(`Extreme amount (>${p99.toLocaleString()} SAR, top 1%)`);
  } else if (claimAmount > p95) {
    anomalyIndicators += 2;
    reasons.push(`Very high amount (>${p95.toLocaleString()} SAR, top 5%)`);
  } else if (claimAmount > p90) {
    anomalyIndicators += 1;
    reasons.push(`High amount (>${p90.toLocaleString()} SAR, top 10%)`);
  }
  
  if (claim.providerId && claim.memberId) {
    const providerPatientPairs = await db.execute(sql`
      SELECT COUNT(*) as pair_count
      FROM claims_v2
      WHERE provider_id = ${claim.providerId} AND member_id = ${claim.memberId}
    `);
    
    const pairCount = parseInt((providerPatientPairs.rows[0] as any)?.pair_count) || 0;
    if (pairCount > 20) {
      anomalyIndicators += 1;
      reasons.push(`High provider-patient frequency (${pairCount} claims)`);
    }
  }
  
  if (claim.cptCodes?.[0]) {
    const serviceStats = await db.execute(sql`
      SELECT 
        AVG(COALESCE(amount::numeric, 0)) as avg_amount,
        STDDEV(COALESCE(amount::numeric, 0)) as stddev_amount,
        COUNT(*) as service_count
      FROM claims_v2
      WHERE cpt_codes @> ARRAY[${claim.cptCodes?.[0]}]
    `);
    
    const svcStats = serviceStats.rows[0] as any;
    const svcAvg = parseFloat(svcStats?.avg_amount) || 0;
    const svcStdDev = parseFloat(svcStats?.stddev_amount) || 1;
    
    if (svcStdDev > 0 && Math.abs(claimAmount - svcAvg) > svcStdDev * 2.5) {
      anomalyIndicators += 1.5;
      reasons.push(`Service code amount deviation (z-score > 2.5)`);
    }
  }
  
  if (claim.lengthOfStay && claim.lengthOfStay > 14) {
    anomalyIndicators += 1;
    reasons.push(`Extended length of stay (${claim.lengthOfStay} days)`);
  }
  
  const score = Math.min(1, anomalyIndicators / 5);
  return { score, reasons };
}

async function analyzeMultiDimensionalClusters(claim: AnalyzedClaimData): Promise<{
  cluster: number;
  clusterSize: number;
  distance: number;
  providerScore: number;
  providerReason: string;
  patientScore: number;
  patientReason: string;
  doctorScore: number;
  doctorReason: string;
}> {
  let providerScore = 0;
  let providerReason = "Normal range";
  let patientScore = 0;
  let patientReason = "Normal range";
  let doctorScore = 0;
  let doctorReason = "Normal range";
  
  const providerPeerStats = await db.execute(sql`
    SELECT 
      AVG(avg_claim_amount::numeric) as peer_avg,
      STDDEV(avg_claim_amount::numeric) as peer_stddev,
      COUNT(*) as peer_count
    FROM fwa_feature_store
    WHERE entity_type = 'provider' AND peer_group_id = (
      SELECT peer_group_id FROM fwa_feature_store 
      WHERE entity_type = 'provider' AND entity_id = ${claim.providerId}
      LIMIT 1
    )
  `);
  
  const peerStats = providerPeerStats.rows[0] as any;
  const claimAmount = claim.amount || claim.unitPrice || 0;
  
  if (peerStats && parseFloat(peerStats.peer_stddev) > 0) {
    const zScore = (claimAmount - parseFloat(peerStats.peer_avg)) / parseFloat(peerStats.peer_stddev);
    if (Math.abs(zScore) > 3) {
      providerScore = 0.9;
      providerReason = `Extreme deviation from peers (z=${zScore.toFixed(2)})`;
    } else if (Math.abs(zScore) > 2) {
      providerScore = 0.6;
      providerReason = `Significant deviation (z=${zScore.toFixed(2)})`;
    } else if (Math.abs(zScore) > 1.5) {
      providerScore = 0.3;
      providerReason = `Moderate deviation (z=${zScore.toFixed(2)})`;
    }
  }
  
  const patientClaims = await db.execute(sql`
    SELECT 
      COUNT(*) as claim_count,
      COUNT(DISTINCT provider_id) as provider_count,
      SUM(COALESCE(amount::numeric, 0)) as total_spent
    FROM claims_v2
    WHERE member_id = ${claim.memberId}
  `);
  
  const patStats = patientClaims.rows[0] as any;
  const patClaimCount = parseInt(patStats?.claim_count) || 0;
  const patProviderCount = parseInt(patStats?.provider_count) || 0;
  
  if (patClaimCount > 50) {
    patientScore = 0.8;
    patientReason = `Very high claim volume (${patClaimCount} claims)`;
  } else if (patProviderCount > 10) {
    patientScore = 0.6;
    patientReason = `High provider diversity (${patProviderCount} providers)`;
  } else if (patClaimCount > 20) {
    patientScore = 0.4;
    patientReason = `Above average claims (${patClaimCount})`;
  }
  
  if (claim.practitionerId) {
    const doctorStats = await db.execute(sql`
      SELECT 
        COUNT(*) as claim_count,
        AVG(COALESCE(amount::numeric, 0)) as avg_amount,
        COUNT(DISTINCT member_id) as patient_count
      FROM claims_v2
      WHERE practitioner_id = ${claim.practitionerId}
    `);
    
    const docStats = doctorStats.rows[0] as any;
    const docClaimCount = parseInt(docStats?.claim_count) || 0;
    const docAvg = parseFloat(docStats?.avg_amount) || 0;
    
    if (claimAmount > docAvg * 3 && docClaimCount > 5) {
      doctorScore = 0.7;
      doctorReason = `Amount 3x above doctor's average`;
    } else if (claimAmount > docAvg * 2 && docClaimCount > 5) {
      doctorScore = 0.4;
      doctorReason = `Amount 2x above doctor's average`;
    }
  }
  
  const cluster = claimAmount < 5000 ? 1 : claimAmount < 20000 ? 2 : claimAmount < 50000 ? 3 : claimAmount < 100000 ? 4 : 5;
  const clusterSize = cluster <= 2 ? 500 : cluster === 3 ? 200 : cluster === 4 ? 50 : 20;
  const distance = (providerScore + patientScore + doctorScore) / 3;
  
  return {
    cluster,
    clusterSize,
    distance,
    providerScore,
    providerReason,
    patientScore,
    patientReason,
    doctorScore,
    doctorReason
  };
}

// =============================================================================
// 4. PRODUCTION RAG/LLM ANALYSIS
// =============================================================================
export async function runProductionRagLlm(claim: AnalyzedClaimData): Promise<{
  score: number;
  findings: RagLlmFindings;
}> {
  const queryText = `Healthcare claim analysis: ${claim.claimType || "general"} - Amount: ${claim.amount || claim.unitPrice} SAR - Diagnosis: ${claim.primaryDiagnosis || "unspecified"} - Service: ${claim.cptCodes?.[0] || "unspecified"} - ${claim.description || ""} - Provider type: ${claim.providerType || "unknown"}`;
  
  let knowledgeBaseMatches: RagLlmFindings["knowledgeBaseMatches"] = [];
  let contextualAnalysis = "";
  let recommendation = "";
  let confidence = 0.5;
  let evidenceChain: string[] = [];
  
  try {
    const ragSearchResults = await semanticSearch(queryText, 5);
    
    const ragResults: any[] = [
      ...ragSearchResults.policyViolations.map((r: any) => ({ ...r, source: 'policy_violation', title: r.title, content: r.description })),
      ...ragSearchResults.clinicalPathways.map((r: any) => ({ ...r, source: 'clinical_pathway', title: r.title, content: r.description })),
      ...ragSearchResults.regulatoryDocs.map((r: any) => ({ ...r, source: 'regulatory_doc' })),
      ...ragSearchResults.medicalGuidelines.map((r: any) => ({ ...r, source: 'medical_guideline' })),
      ...ragSearchResults.providerComplaints.map((r: any) => ({ ...r, source: 'provider_complaint', title: `Complaint: ${r.provider_name}`, content: r.description }))
    ].sort((a, b) => (b.similarity || 0) - (a.similarity || 0)).slice(0, 5);
    
    knowledgeBaseMatches = ragResults.map(r => ({
      docId: r.id,
      title: r.title,
      relevance: r.similarity || 0,
      source: r.source
    }));
    
    if (knowledgeBaseMatches.length > 0) {
      const contextDocs = ragResults.map(r => 
        `[${r.source}] ${r.title}: ${r.content?.substring(0, 300) || ""}`
      ).join("\n\n");
      
      const analysisPrompt = `Analyze this Saudi healthcare claim for potential fraud, waste, or abuse:

CLAIM DETAILS:
- Amount: ${claim.amount || claim.unitPrice || 0} SAR
- Type: ${claim.claimType || "Not specified"}
- Provider Type: ${claim.providerType || "Not specified"}
- Specialty: ${claim.specialty || "Not specified"}
- Diagnosis Code: ${claim.primaryDiagnosis || "Not specified"}
- Service Code: ${claim.cptCodes?.[0] || "Not specified"}
- Description: ${claim.description || "No description"}
- Pre-authorized: ${claim.isPreAuthorized ? "Yes" : "No"}
- Length of Stay: ${claim.lengthOfStay || "N/A"} days

RELEVANT KNOWLEDGE BASE CONTEXT:
${contextDocs}

Provide a structured assessment:
1. ANALYSIS: Brief analysis of FWA indicators (2-3 sentences max)
2. RISK_LEVEL: One of [LOW, MEDIUM, HIGH, CRITICAL]
3. CONFIDENCE: Score from 0.0 to 1.0
4. RECOMMENDATION: Specific action for CHI regulatory review
5. EVIDENCE: List 2-3 specific evidence points from the knowledge base`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a Saudi Council for Health Insurance (CHI) fraud detection expert. Analyze healthcare claims using regulatory knowledge base and provide structured risk assessments. Be concise and evidence-based."
          },
          { role: "user", content: analysisPrompt }
        ],
        max_tokens: 600,
        temperature: 0.2
      });
      
      const llmResponse = response.choices[0]?.message?.content || "";
      
      const parsed = parseLlmResponse(llmResponse);
      contextualAnalysis = parsed.analysis;
      recommendation = parsed.recommendation;
      confidence = parsed.confidence;
      evidenceChain = parsed.evidence;
      
    } else {
      contextualAnalysis = "Limited knowledge base context available for this claim type.";
      recommendation = "Standard review recommended per CHI guidelines.";
      confidence = 0.4;
    }
  } catch (error) {
    console.error("RAG/LLM detection error:", error);
    contextualAnalysis = "Unable to complete AI-powered contextual analysis.";
    recommendation = "Manual review by FWA analyst recommended.";
    confidence = 0.3;
  }
  
  const matchScore = knowledgeBaseMatches.length > 0 
    ? knowledgeBaseMatches.reduce((sum, m) => sum + m.relevance, 0) / knowledgeBaseMatches.length 
    : 0;
  const ragScore = (matchScore * 50) + (confidence * 50);
  
  return {
    score: Math.min(100, ragScore),
    findings: {
      contextualAnalysis,
      similarCases: [],
      knowledgeBaseMatches,
      recommendation,
      confidence,
      evidenceChain
    }
  };
}

function parseLlmResponse(response: string): {
  analysis: string;
  recommendation: string;
  confidence: number;
  riskLevel: string;
  evidence: string[];
} {
  const lines = response.split('\n').join(' ');
  const analysisMatch = lines.match(/ANALYSIS[:\s]*([^]*?)(?=RISK_LEVEL|CONFIDENCE|RECOMMENDATION|EVIDENCE|$)/i);
  const riskMatch = lines.match(/RISK_LEVEL[:\s]*(LOW|MEDIUM|HIGH|CRITICAL)/i);
  const confidenceMatch = lines.match(/CONFIDENCE[:\s]*([0-9.]+)/i);
  const recommendationMatch = lines.match(/RECOMMENDATION[:\s]*([^]*?)(?=EVIDENCE|$)/i);
  const evidenceMatch = lines.match(/EVIDENCE[:\s]*([^]*?)$/i);
  
  const evidence: string[] = [];
  if (evidenceMatch) {
    const evidenceText = evidenceMatch[1];
    const bulletPoints = evidenceText.split(/[-•]\s*/);
    for (const point of bulletPoints) {
      if (point.trim().length > 10) {
        evidence.push(point.trim().substring(0, 200));
      }
    }
  }
  
  return {
    analysis: analysisMatch?.[1]?.trim() || response.substring(0, 200),
    riskLevel: riskMatch?.[1]?.toUpperCase() || "MEDIUM",
    confidence: parseFloat(confidenceMatch?.[1] || "0.5"),
    recommendation: recommendationMatch?.[1]?.trim() || "Review claim per CHI guidelines.",
    evidence
  };
}

// =============================================================================
// CONTEXT ENRICHMENT - 360 PERSPECTIVE SYSTEM
// =============================================================================

interface Context360Data {
  providerRiskScore: number;
  providerRiskLevel: string;
  providerFlags: any[];
  patientRiskScore: number;
  patientRiskLevel: string;
  patientBehavioralPatterns: Record<string, any>;
  doctorRiskScore: number;
  doctorRiskLevel: string;
  doctorFlags: any[];
  contextModifier: number;
  contextSummary: string;
}

async function getContext360Enrichment(
  providerId: string,
  patientId: string,
  practitionerLicense: string | null | undefined
): Promise<Context360Data> {
  const defaultResult: Context360Data = {
    providerRiskScore: 0,
    providerRiskLevel: 'unknown',
    providerFlags: [],
    patientRiskScore: 0,
    patientRiskLevel: 'unknown',
    patientBehavioralPatterns: {},
    doctorRiskScore: 0,
    doctorRiskLevel: 'unknown',
    doctorFlags: [],
    contextModifier: 0,
    contextSummary: 'No 360 perspective data available'
  };

  try {
    const [providerData, patientData, doctorData] = await Promise.all([
      providerId ? db.select().from(provider360).where(eq(provider360.providerId, providerId)).limit(1) : Promise.resolve([]),
      patientId ? db.select().from(patient360).where(eq(patient360.patientId, patientId)).limit(1) : Promise.resolve([]),
      practitionerLicense ? db.select().from(doctor360).where(eq(doctor360.doctorId, practitionerLicense)).limit(1) : Promise.resolve([])
    ]);

    const provider = providerData[0];
    const patient = patientData[0];
    const doctor = doctorData[0];

    const result: Context360Data = {
      providerRiskScore: provider?.riskScore ? parseFloat(String(provider.riskScore)) : 0,
      providerRiskLevel: provider?.riskLevel || 'unknown',
      providerFlags: Array.isArray(provider?.flags) ? provider.flags : [],
      patientRiskScore: patient?.riskScore ? parseFloat(String(patient.riskScore)) : 0,
      patientRiskLevel: patient?.riskLevel || 'unknown',
      patientBehavioralPatterns: patient?.behavioralPatterns || {},
      doctorRiskScore: doctor?.riskScore ? parseFloat(String(doctor.riskScore)) : 0,
      doctorRiskLevel: doctor?.riskLevel || 'unknown',
      doctorFlags: Array.isArray(doctor?.flags) ? doctor.flags : [],
      contextModifier: 0,
      contextSummary: ''
    };

    // Calculate context modifier based on 360 perspective risk scores
    // Provider: 40% weight, Patient: 30% weight, Doctor: 30% weight
    const weightedRiskScore = 
      (result.providerRiskScore * 0.40) +
      (result.patientRiskScore * 0.30) +
      (result.doctorRiskScore * 0.30);

    // Context modifier ranges from -5 to +15 based on weighted risk
    // Low risk entities reduce score, high risk entities increase score
    if (weightedRiskScore >= 70) {
      result.contextModifier = 15; // High-risk entities - significant uplift
    } else if (weightedRiskScore >= 50) {
      result.contextModifier = 10; // Medium-high risk entities
    } else if (weightedRiskScore >= 30) {
      result.contextModifier = 5; // Medium risk entities
    } else if (weightedRiskScore >= 10) {
      result.contextModifier = 0; // Baseline - no adjustment
    } else {
      result.contextModifier = -5; // Low-risk entities - slight reduction
    }

    // Generate context summary
    const summaryParts: string[] = [];
    if (provider) {
      summaryParts.push(`Provider ${result.providerRiskLevel} risk (score: ${result.providerRiskScore})`);
    }
    if (patient) {
      summaryParts.push(`Patient ${result.patientRiskLevel} risk (score: ${result.patientRiskScore})`);
    }
    if (doctor) {
      summaryParts.push(`Doctor ${result.doctorRiskLevel} risk (score: ${result.doctorRiskScore})`);
    }
    
    result.contextSummary = summaryParts.length > 0 
      ? `360 Perspective: ${summaryParts.join('; ')}. Context modifier: ${result.contextModifier >= 0 ? '+' : ''}${result.contextModifier}`
      : 'No 360 perspective data available';

    return result;
  } catch (error) {
    console.error('[Context360] Error fetching 360 data:', error);
    return defaultResult;
  }
}

// =============================================================================
// MAIN DETECTION PIPELINE
// =============================================================================
export async function runProductionDetection(
  claim: AnalyzedClaimData, 
  weights = DEFAULT_WEIGHTS,
  skipRagLlm = false
): Promise<DetectionResult> {
  const startTime = Date.now();
  
  // Enrich claim with network features for NC-* rules
  const networkFeatures = await networkFeatureService.calculateNetworkFeatures(
    claim.providerId,
    claim.memberId,
    claim.practitionerId || null,
    claim.amount || 0
  );
  
  // Create enriched claim with network features attached
  const enrichedClaim = {
    ...claim,
    cross_entity_anomaly: networkFeatures.cross_entity_anomaly,
    entity_network_score: networkFeatures.entity_network_score,
    collusion_indicator: networkFeatures.collusion_indicator
  } as AnalyzedClaimData;
  
  // Fetch 360 perspective context for all three entities
  const context360 = await getContext360Enrichment(
    claim.providerId,
    claim.memberId,
    claim.practitionerId
  );
  
  const [ruleResult, statResult, unsupResult] = await Promise.all([
    runProductionRuleEngine(enrichedClaim),
    runProductionStatisticalLearning(enrichedClaim),
    runProductionUnsupervisedLearning(enrichedClaim)
  ]);
  
  let ragResult: { score: number; findings: RagLlmFindings } = { 
    score: 0, 
    findings: { 
      contextualAnalysis: "Skipped", 
      similarCases: [] as { caseId: string; similarity: number; outcome: string }[], 
      knowledgeBaseMatches: [] as { docId: string; title: string; relevance: number; source: string }[], 
      recommendation: "", 
      confidence: 0, 
      evidenceChain: [] as string[] 
    } 
  };
  if (!skipRagLlm) {
    ragResult = await runProductionRagLlm(enrichedClaim);
  }
  
  const adjustedWeights = skipRagLlm ? {
    rule_engine: weights.rule_engine / (1 - weights.rag_llm),
    statistical_learning: weights.statistical_learning / (1 - weights.rag_llm),
    unsupervised_learning: weights.unsupervised_learning / (1 - weights.rag_llm),
    rag_llm: 0
  } : weights;
  
  // Sanitize scores to prevent NaN - ensure all scores are finite numbers
  const safeScore = (score: number): number => {
    if (!Number.isFinite(score)) return 0;
    return Math.max(0, Math.min(100, score));
  };
  
  const safeRuleScore = safeScore(ruleResult.score);
  const safeStatScore = safeScore(statResult.score);
  const safeUnsupScore = safeScore(unsupResult.score);
  const safeRagScore = safeScore(ragResult.score);
  
  // Calculate base composite score from 4 methods
  const baseCompositeScore = 
    (safeRuleScore * adjustedWeights.rule_engine) +
    (safeStatScore * adjustedWeights.statistical_learning) +
    (safeUnsupScore * adjustedWeights.unsupervised_learning) +
    (safeRagScore * adjustedWeights.rag_llm);
  
  // Apply 360 perspective context modifier (clamped to 0-100)
  const compositeScore = Math.max(0, Math.min(100, baseCompositeScore + context360.contextModifier));
  
  // Determine risk level - adjusted thresholds for regulatory oversight sensitivity
  // Also boost risk level if critical rule violations are detected
  let compositeRiskLevel = "low";
  const hasCriticalRuleViolation = ruleResult.findings.matchedRules.some(r => r.severity === "critical");
  const hasHighRuleViolation = ruleResult.findings.matchedRules.some(r => r.severity === "high");
  
  if (compositeScore >= 70 || (hasCriticalRuleViolation && compositeScore >= 40)) compositeRiskLevel = "critical";
  else if (compositeScore >= 50 || (hasHighRuleViolation && compositeScore >= 25)) compositeRiskLevel = "high";
  else if (compositeScore >= 25 || ruleResult.findings.matchedRules.length > 0) compositeRiskLevel = "medium";
  
  const scores = [
    { method: "rule_engine", score: safeRuleScore },
    { method: "statistical_learning", score: safeStatScore },
    { method: "unsupervised_learning", score: safeUnsupScore },
    { method: "rag_llm", score: safeRagScore }
  ];
  const primaryMethod = scores.sort((a, b) => b.score - a.score)[0].method;
  
  let detectionSummary = generateSummary(
    { ...ruleResult, score: safeRuleScore }, 
    { ...statResult, score: safeStatScore }, 
    { ...unsupResult, score: safeUnsupScore }, 
    { ...ragResult, score: safeRagScore }, 
    compositeScore
  );
  
  // Append 360 context information to detection summary
  if (context360.contextModifier !== 0) {
    detectionSummary += ` ${context360.contextSummary}`;
  }
  const recommendedAction = generateAction(compositeRiskLevel, primaryMethod, ruleResult.findings);
  
  // Generate risk factors summary from matched rules
  const riskFactors = generateRiskFactorsFromMatches(ruleResult.findings.matchedRules);
  
  const processingTimeMs = Date.now() - startTime;
  
  return {
    claimId: claim.id,
    claimNumber: claim.claimNumber,
    compositeScore: Math.round(compositeScore * 100) / 100,
    compositeRiskLevel,
    ruleEngineScore: safeRuleScore,
    statisticalScore: safeStatScore,
    unsupervisedScore: safeUnsupScore,
    ragLlmScore: safeRagScore,
    ruleEngineFindings: ruleResult.findings,
    statisticalFindings: statResult.findings,
    unsupervisedFindings: unsupResult.findings,
    ragLlmFindings: ragResult.findings,
    primaryDetectionMethod: primaryMethod,
    detectionSummary,
    recommendedAction,
    riskFactors,
    processingTimeMs
  };
}

function generateSummary(rule: any, stat: any, unsup: any, rag: any, composite: number): string {
  const parts: string[] = [];
  
  // Use lower thresholds and also check if any rules matched
  if (rule.findings.violationCount > 0) {
    parts.push(`${rule.findings.violationCount} rule violation(s) detected`);
  }
  if (stat.score > 30) {
    const zScore = stat.findings.peerComparison?.zScore?.toFixed(2) || "N/A";
    parts.push(`statistical anomaly (z-score: ${zScore})`);
  }
  if (unsup.score > 30 && unsup.findings.outlierReason.length > 0) {
    parts.push(`${unsup.findings.outlierReason.length} behavioral anomalies`);
  }
  if (rag.score > 30 && rag.findings.knowledgeBaseMatches.length > 0) {
    parts.push(`${rag.findings.knowledgeBaseMatches.length} knowledge base matches`);
  }
  
  if (parts.length === 0) {
    return `Low risk claim with composite score ${composite.toFixed(1)}/100. No significant FWA indicators detected.`;
  }
  
  return `Composite risk score: ${composite.toFixed(1)}/100. Indicators: ${parts.join("; ")}.`;
}

function generateAction(riskLevel: string, primaryMethod: string, ruleFindings: RuleEngineFindings): string {
  switch (riskLevel) {
    case "critical":
      return "URGENT: Escalate to CHI FWA Investigation Unit. Suspend claim processing pending review. Potential regulatory action required.";
    case "high":
      return "Priority review by Senior FWA Analyst. Document findings and prepare enforcement case if patterns persist.";
    case "medium":
      return "Standard FWA review required. Request additional documentation from provider. Monitor entity for recurring patterns.";
    default:
      return "Routine processing. Flag for periodic monitoring. No immediate action required.";
  }
}

export async function getClaimForAnalysis(claimId: string): Promise<AnalyzedClaimData | null> {
  const result = await db.select().from(claims)
    .where(eq(claims.id, claimId))
    .limit(1);

  if (result.length === 0) return null;

  const claim = result[0];
  return {
    id: claim.id,
    claimNumber: claim.claimNumber || "",
    providerId: claim.providerId || "",
    memberId: claim.memberId || "",
    practitionerId: claim.practitionerId,
    specialty: claim.specialty,
    city: claim.city,
    providerType: claim.providerType,
    unitPrice: null,
    amount: claim.amount ? parseFloat(claim.amount) : null,
    quantity: null,
    primaryDiagnosis: claim.primaryDiagnosis,
    cptCodes: claim.cptCodes,
    description: claim.description,
    claimType: claim.claimType,
    lengthOfStay: claim.lengthOfStay,
    status: claim.status,
    isPreAuthorized: claim.isPreAuthorized || false
  };
}

export async function searchClaimsForAnalysis(query: string, limit = 20): Promise<AnalyzedClaimData[]> {
  const results = await db.execute(sql`
    SELECT * FROM claims_v2
    WHERE claim_number ILIKE ${'%' + query + '%'}
      OR provider_id ILIKE ${'%' + query + '%'}
      OR member_id ILIKE ${'%' + query + '%'}
      OR description ILIKE ${'%' + query + '%'}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `);

  return (results.rows as any[]).map(claim => ({
    id: claim.id,
    claimNumber: claim.claim_number || "",
    providerId: claim.provider_id || "",
    memberId: claim.member_id || "",
    practitionerId: claim.practitioner_id,
    specialty: claim.specialty,
    city: claim.city,
    providerType: claim.provider_type,
    unitPrice: null,
    amount: claim.amount ? parseFloat(claim.amount) : null,
    quantity: null,
    primaryDiagnosis: claim.primary_diagnosis,
    cptCodes: claim.cpt_codes,
    description: claim.description,
    claimType: claim.claim_type,
    lengthOfStay: claim.length_of_stay,
    status: claim.status,
    isPreAuthorized: claim.is_pre_authorized || false
  }));
}
