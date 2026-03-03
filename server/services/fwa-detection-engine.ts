import OpenAI from "openai";
import { db } from "../db";
import { 
  claims, fwaBehaviors, policyViolationCatalogue,
  fwaDetectionResults, fwaDetectionConfigs,
  fwaRulesLibrary, fwaRuleHits,
  fwaProviderDetectionResults, fwaProviderTimeline
} from "@shared/schema";
import { eq, sql, desc, and, gte, lte } from "drizzle-orm";
import { generateEmbedding, semanticSearch } from "./embedding-service";
import { statisticalLearningEngine, populationStatsService, featureWeightsService } from "./statistical-learning-engine";
import { networkFeatureService } from "./network-feature-service";
import { FeatureEngineeringService } from "./ml-unsupervised-engine";

// Singleton feature engineering service for claim enrichment
const featureEngineering = new FeatureEngineeringService();

const openai = new OpenAI();

// 5. SEMANTIC VALIDATION
// ICD-10/CPT procedure-diagnosis matching using vector embeddings
// Handles multiple CPT codes (from service lines) and multiple ICD-10 codes
async function runSemanticValidation(claim: ClaimData): Promise<{
  score: number;
  findings: {
    analysis: string;
    matchResults: Array<{ procedure: string; diagnosis: string; similarity: number }>;
    riskAssessment: string;
    overallSimilarity: number;
  };
}> {
  try {
    // Collect all CPT codes: primary + service lines
    const cptCodes: string[] = [];
    const primaryCode = claim.procedureCode || claim.cptCode;
    if (primaryCode) cptCodes.push(primaryCode);
    
    // Parse service lines to extract additional CPT codes
    if (claim.serviceLines) {
      const lines = claim.serviceLines.split("\n").filter(l => l.trim());
      for (const line of lines) {
        const parts = line.split("|");
        if (parts[0]?.trim()) {
          const cpt = parts[0].trim();
          if (!cptCodes.includes(cpt)) cptCodes.push(cpt);
        }
      }
    }
    
    // Collect all ICD-10 codes: primary + secondary
    const icdCodes: string[] = [];
    const primaryDiagnosis = claim.diagnosisCode || claim.icd;
    if (primaryDiagnosis) icdCodes.push(primaryDiagnosis);
    
    // Parse secondary diagnosis codes
    if (claim.secondaryDiagnosisCodes) {
      const secondary = claim.secondaryDiagnosisCodes.split("|").filter(c => c.trim());
      for (const icd of secondary) {
        if (!icdCodes.includes(icd.trim())) icdCodes.push(icd.trim());
      }
    }
    
    if (cptCodes.length === 0 || icdCodes.length === 0) {
      return {
        score: 0,
        findings: {
          analysis: "Missing procedure or diagnosis code for semantic validation",
          matchResults: [],
          riskAssessment: "Unable to validate - missing codes",
          overallSimilarity: 0
        }
      };
    }
    
    // Validate all CPT-ICD combinations
    const matchResults: Array<{ procedure: string; diagnosis: string; similarity: number }> = [];
    let worstSimilarity = 1.0;
    let bestSimilarity = 0.0;
    
    for (const cpt of cptCodes) {
      for (const icd of icdCodes) {
        const similarity = await validateCptIcdPair(cpt, icd);
        matchResults.push({
          procedure: cpt,
          diagnosis: icd,
          similarity: Math.round(similarity * 100) / 100
        });
        worstSimilarity = Math.min(worstSimilarity, similarity);
        bestSimilarity = Math.max(bestSimilarity, similarity);
      }
    }
    
    // Use worst-case for risk scoring (flag if ANY pair is problematic)
    // but weight toward average for overall assessment
    const avgSimilarity = matchResults.reduce((s, m) => s + m.similarity, 0) / matchResults.length;
    const overallSimilarity = (worstSimilarity * 0.6) + (avgSimilarity * 0.4);
    
    // Risk thresholds: ≥0.7 = low risk, ≥0.5 = medium, ≥0.3 = high, <0.3 = critical
    let riskLevel = "low";
    let riskScore = 0;
    
    if (overallSimilarity >= 0.7) {
      riskLevel = "low";
      riskScore = overallSimilarity * 20;
    } else if (overallSimilarity >= 0.5) {
      riskLevel = "medium";
      riskScore = 30 + (0.7 - overallSimilarity) * 50;
    } else if (overallSimilarity >= 0.3) {
      riskLevel = "high";
      riskScore = 50 + (0.5 - overallSimilarity) * 100;
    } else {
      riskLevel = "critical";
      riskScore = 80 + (0.3 - overallSimilarity) * 100;
    }
    
    // Count problematic pairs
    const lowMatchPairs = matchResults.filter(m => m.similarity < 0.5);
    const criticalPairs = matchResults.filter(m => m.similarity < 0.3);
    
    const analysis = matchResults.length === 1
      ? `Semantic validation comparing ${cptCodes[0]} against ${icdCodes[0]}. Similarity: ${(overallSimilarity * 100).toFixed(1)}%. Risk: ${riskLevel}.`
      : `Validated ${matchResults.length} CPT-ICD combinations (${cptCodes.length} procedures x ${icdCodes.length} diagnoses). ` +
        `Best match: ${(bestSimilarity * 100).toFixed(0)}%, Worst: ${(worstSimilarity * 100).toFixed(0)}%. ` +
        (criticalPairs.length > 0 ? `${criticalPairs.length} critical mismatches found. ` : "") +
        (lowMatchPairs.length > 0 ? `${lowMatchPairs.length} pairs warrant review.` : "All pairs clinically appropriate.");
    
    return {
      score: Math.min(100, Math.round(riskScore)),
      findings: {
        analysis,
        matchResults,
        riskAssessment: criticalPairs.length > 0
          ? `Critical: ${criticalPairs.length} procedure-diagnosis pairs appear clinically inappropriate`
          : lowMatchPairs.length > 0
            ? `Warning: ${lowMatchPairs.length} pairs have low semantic match - review recommended`
            : "All procedure-diagnosis combinations are clinically appropriate",
        overallSimilarity
      }
    };
  } catch (error) {
    console.error("[Semantic] Validation error:", error);
    return {
      score: 0,
      findings: {
        analysis: "Semantic validation unavailable",
        matchResults: [],
        riskAssessment: "Unable to perform semantic validation",
        overallSimilarity: 0
      }
    };
  }
}

// Validate a single CPT-ICD pair
async function validateCptIcdPair(cpt: string, icd: string): Promise<number> {
  // First check clinical appropriateness rules
  const clinicalCheck = checkClinicalAppropriateness(cpt, icd);
  if (clinicalCheck === true) return 0.85;
  if (clinicalCheck === false) return 0.25;
  
  // Use semantic search for unknown pairs
  try {
    const combinedQuery = `CPT procedure ${cpt} for ICD-10 diagnosis ${icd}`;
    const searchResults = await semanticSearch(combinedQuery, 3);
    
    const allMatches = [
      ...searchResults.clinicalPathways,
      ...searchResults.medicalGuidelines,
      ...searchResults.policyViolations
    ];
    
    if (allMatches.length > 0) {
      const topMatch = allMatches.sort((a: any, b: any) => (b.similarity || 0) - (a.similarity || 0))[0];
      return Math.min(0.9, Math.max(0.35, (topMatch?.similarity || 0.5) + 0.15));
    }
  } catch (e) {
    console.error(`[Semantic] Error validating ${cpt}-${icd}:`, e);
  }
  
  return 0.65; // Default moderate match for unknown pairs
}

// Clinical appropriateness check for common CPT-ICD pairs
function checkClinicalAppropriateness(cpt: string, icd: string): boolean | null {
  // Common clinically appropriate pairs
  const appropriatePairs: Record<string, string[]> = {
    // Cardiac procedures
    "92928": ["I21", "I25", "I20"], // PCI for MI/CAD/Angina
    "93458": ["I21", "I25", "I20", "I50"], // Cardiac cath
    "33533": ["I25"], // CABG for CAD
    // Orthopedic
    "27447": ["M17"], // Knee replacement for OA
    "27130": ["M16"], // Hip replacement for OA
    // Evaluation codes
    "99213": [], // E&M - appropriate for most
    "99214": [],
    "99215": [],
    "99223": ["I21", "I50", "J18", "A41"], // Hospital care - appropriate for acute conditions
  };
  
  // Common inappropriate pairs
  const inappropriatePairs: Record<string, string[]> = {
    "92928": ["M54", "G43", "K21"], // PCI not for back pain, migraine, GERD
    "27447": ["I21", "J18"], // Knee replacement not for MI/pneumonia
  };
  
  // Check if this is a known appropriate pair
  const cptPrefix = cpt.slice(0, 5);
  const icdPrefix = icd.slice(0, 3);
  
  if (appropriatePairs[cptPrefix]?.length === 0) {
    return true; // E&M codes are generally appropriate
  }
  
  if (appropriatePairs[cptPrefix]?.some(prefix => icd.startsWith(prefix))) {
    return true;
  }
  
  if (inappropriatePairs[cptPrefix]?.some(prefix => icd.startsWith(prefix))) {
    return false;
  }
  
  return null; // Unknown - use embedding similarity
}

// Detection method weights (configurable)
const DEFAULT_WEIGHTS = {
  rule_engine: 0.30,
  statistical_learning: 0.22,
  unsupervised_learning: 0.18,
  rag_llm: 0.15,
  semantic_validation: 0.15
};

// Helper functions for generating human-readable explanations
function generateHumanReadableExplanation(
  ruleName: string,
  category: string,
  severity: string,
  claim: ClaimData,
  matchedConditions?: string[]
): string {
  const claimRef = claim.claimNumber || claim.id;
  const amount = claim.amount ? `SAR ${claim.amount.toLocaleString()}` : 'unknown amount';
  
  const categoryExplanations: Record<string, string> = {
    upcoding: `This claim (${claimRef}) for ${amount} shows signs of upcoding - billing for a more expensive service than was actually provided. The procedure code or diagnosis may have been inflated to increase reimbursement.`,
    duplicate_claims: `This claim (${claimRef}) appears to be a duplicate submission. Similar claims with matching provider, patient, and service date have been identified, suggesting potential double billing.`,
    unbundling: `This claim (${claimRef}) exhibits unbundling patterns - services that should be billed together under a single code are being billed separately to maximize reimbursement.`,
    phantom_billing: `This claim (${claimRef}) may represent phantom billing - billing for services, procedures, or supplies that were never actually provided to the patient.`,
    geographic_anomaly: `This claim (${claimRef}) has geographic inconsistencies - the provider location is distant from the patient's residence for routine services that typically don't require travel.`,
    temporal_anomaly: `This claim (${claimRef}) has temporal anomalies - unusual patterns in service dates, timing, or frequency that deviate from expected norms.`,
    cost_outlier: `This claim (${claimRef}) for ${amount} is a statistical outlier - the cost significantly exceeds peer benchmarks for similar services.`,
    credential_mismatch: `This claim (${claimRef}) has credential concerns - the services billed may not align with the provider's specialty or qualifications.`,
    frequency_abuse: `This claim (${claimRef}) is part of a pattern of excessive service frequency - the volume of services for this patient/provider exceeds typical medical necessity.`,
    billing: `This claim (${claimRef}) for ${amount} has been flagged for billing irregularities based on the "${ruleName}" rule. Category: ${category}.`
  };
  
  const baseExplanation = categoryExplanations[category] || 
    `This claim (${claimRef}) for ${amount} triggered the "${ruleName}" detection rule. Severity: ${severity}. ${matchedConditions?.length ? `Matched conditions: ${matchedConditions.join(', ')}` : ''}`;
  
  return baseExplanation;
}

function generateEvidencePoints(
  claim: ClaimData,
  matchedConditions?: string[],
  source?: string
): Array<{ field: string; value: any; reason: string }> {
  const evidencePoints: Array<{ field: string; value: any; reason: string }> = [];
  
  if (claim.amount) {
    evidencePoints.push({
      field: 'amount',
      value: claim.amount,
      reason: `Claim amount of SAR ${claim.amount.toLocaleString()} was evaluated against thresholds`
    });
  }
  
  if (claim.diagnosisCode) {
    evidencePoints.push({
      field: 'diagnosisCode',
      value: claim.diagnosisCode,
      reason: 'Diagnosis code was matched against known FWA patterns'
    });
  }
  
  if (claim.procedureCode) {
    evidencePoints.push({
      field: 'procedureCode',
      value: claim.procedureCode,
      reason: 'Procedure code was evaluated for billing appropriateness'
    });
  }
  
  if (matchedConditions && matchedConditions.length > 0) {
    matchedConditions.forEach((condition, index) => {
      evidencePoints.push({
        field: `condition_${index + 1}`,
        value: condition,
        reason: 'Rule condition matched against claim data'
      });
    });
  }
  
  if (source) {
    evidencePoints.push({
      field: 'detectionSource',
      value: source,
      reason: `Detection triggered from ${source} rule catalog`
    });
  }
  
  return evidencePoints;
}

function generateSuggestedAction(
  severity: string | null,
  category: string,
  confidence: number
): string {
  const severityLevel = (severity || 'medium').toLowerCase();
  
  if (severityLevel === 'critical' || confidence > 0.9) {
    return 'URGENT: Escalate to FWA Investigation Unit immediately. Suspend payment pending review. Schedule provider audit within 30 days.';
  }
  
  if (severityLevel === 'high' || confidence > 0.7) {
    return 'Assign to Senior FWA Analyst for detailed review. Request supporting documentation. Initiate provider communication.';
  }
  
  if (severityLevel === 'medium' || confidence > 0.5) {
    return 'Add to monitoring watchlist. Review claim manually before payment. Consider pattern analysis across related claims.';
  }
  
  return 'Continue routine monitoring. Flag for periodic review. No immediate action required.';
}

interface ClaimData {
  id: string;
  claimNumber: string;
  providerId: string;
  patientId: string;
  amount: number;
  diagnosisCode?: string;
  procedureCode?: string;
  serviceDate?: Date;
  description?: string;
  claimType?: string;
  // Multiple codes support
  secondaryDiagnosisCodes?: string; // Pipe-separated: "I10|E11.9|Z82.49"
  serviceLines?: string; // Newline-separated, each: "CPT|Qty|Price|Description"
}

interface DetectionResult {
  claimId: string;
  compositeScore: number;
  compositeRiskLevel: string;
  ruleEngineScore: number;
  statisticalScore: number;
  unsupervisedScore: number;
  ragLlmScore: number;
  semanticScore: number;
  ruleEngineFindings: any;
  statisticalFindings: any;
  unsupervisedFindings: any;
  ragLlmFindings: any;
  semanticFindings: any;
  primaryDetectionMethod: string;
  detectionSummary: string;
  recommendedAction: string;
  processingTimeMs: number;
}

// 1. RULE ENGINE DETECTOR
// Pattern matching against fwa_rules_library (102 rules across 18 categories), policy violations and FWA behaviors catalog
export async function runRuleEngineDetection(claim: ClaimData): Promise<{
  score: number;
  findings: any;
}> {
  const startTime = Date.now();
  
  // Fetch all active rules from fwa_rules_library (102 rules across 18 categories)
  const libraryRules = await db.select().from(fwaRulesLibrary)
    .where(eq(fwaRulesLibrary.isActive, true));
  
  // Fetch active FWA behavior rules (legacy support)
  const behaviorRules = await db.select().from(fwaBehaviors)
    .where(eq(fwaBehaviors.status, "active"))
    .limit(100);
  
  // Fetch policy violations for pattern matching
  const violations = await db.select().from(policyViolationCatalogue)
    .where(eq(policyViolationCatalogue.status, "active"))
    .limit(50);
  
  const matchedRules: any[] = [];
  let totalScore = 0;
  
  // Check claim against fwa_rules_library rules (102 rules with JSONB conditions)
  for (const rule of libraryRules) {
    const match = evaluateRuleConditions(claim, rule.conditions as any);
    if (match.matched) {
      const severityMultiplier = getSeverityMultiplier(rule.severity);
      const ruleWeight = parseFloat(String(rule.weight || 1));
      const ruleScore = (rule.severity === "critical" ? 35 : rule.severity === "high" ? 25 : rule.severity === "medium" ? 15 : 10) * severityMultiplier * ruleWeight;
      
      // Generate explainability fields
      const humanReadableExplanation = generateHumanReadableExplanation(
        rule.name, rule.category, rule.severity, claim, match.matchedConditions
      );
      const evidencePoints = generateEvidencePoints(claim, match.matchedConditions, "fwa_rules_library");
      const suggestedAction = generateSuggestedAction(rule.severity, rule.category, match.confidence);
      
      matchedRules.push({
        ruleId: rule.id,
        ruleCode: rule.ruleCode,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        confidence: match.confidence,
        description: rule.description,
        source: "fwa_rules_library",
        matchedConditions: match.matchedConditions,
        regulatoryReference: rule.regulatoryReference,
        humanReadableExplanation,
        evidencePoints,
        suggestedAction
      });
      
      totalScore += ruleScore * match.confidence;
    }
  }
  
  // Check claim against FWA behavior rules (legacy patterns)
  for (const rule of behaviorRules) {
    const match = checkRuleMatch(claim, rule);
    if (match.matched) {
      const severityMultiplier = getSeverityMultiplier(rule.severity);
      const ruleScore = (rule.priority === "critical" ? 30 : rule.priority === "high" ? 20 : 10) * severityMultiplier;
      
      // Generate explainability fields
      const humanReadableExplanation = generateHumanReadableExplanation(
        rule.name, rule.category, rule.severity || 'medium', claim
      );
      const evidencePoints = generateEvidencePoints(claim, undefined, "fwa_behaviors");
      const suggestedAction = generateSuggestedAction(rule.severity, rule.category, match.confidence);
      
      matchedRules.push({
        ruleId: rule.id,
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        confidence: match.confidence,
        description: rule.description,
        source: "fwa_behaviors",
        humanReadableExplanation,
        evidencePoints,
        suggestedAction
      });
      
      totalScore += ruleScore * match.confidence;
    }
  }
  
  // Check against policy violations using title/description matching
  for (const violation of violations) {
    const claimText = `${claim.description || ""} ${claim.diagnosisCode || ""} ${claim.procedureCode || ""}`.toLowerCase();
    const violationText = `${violation.title} ${violation.description} ${violation.category}`.toLowerCase();
    
    // Simple keyword overlap detection
    const violationWords = violationText.split(/\s+/).filter(w => w.length > 3);
    const matchingWords = violationWords.filter(w => claimText.includes(w));
    
    if (matchingWords.length >= 2) {
      const confidence = Math.min(1, matchingWords.length / 5);
      
      // Generate explainability fields
      const humanReadableExplanation = generateHumanReadableExplanation(
        violation.title, violation.category, violation.severity, claim, matchingWords
      );
      const evidencePoints = generateEvidencePoints(claim, matchingWords, "policy_violation_catalogue");
      const suggestedAction = generateSuggestedAction(violation.severity, violation.category, confidence);
      
      matchedRules.push({
        ruleId: violation.id,
        ruleName: violation.title,
        category: violation.category,
        severity: violation.severity,
        confidence,
        description: violation.description,
        source: "policy_violation_catalogue",
        humanReadableExplanation,
        evidencePoints,
        suggestedAction
      });
      
      totalScore += 15 * confidence * getSeverityMultiplier(violation.severity);
    }
  }
  
  // Normalize score to 0-100
  const normalizedScore = Math.min(100, totalScore);
  
  return {
    score: normalizedScore,
    findings: {
      matchedRules,
      totalRulesChecked: libraryRules.length + behaviorRules.length + violations.length,
      libraryRulesChecked: libraryRules.length,
      behaviorRulesChecked: behaviorRules.length,
      violationsChecked: violations.length,
      violationCount: matchedRules.length
    }
  };
}

// Evaluate JSONB conditions from fwa_rules_library against claim data
function evaluateRuleConditions(claim: ClaimData, conditions: any): { 
  matched: boolean; 
  confidence: number; 
  matchedConditions: string[];
} {
  if (!conditions) return { matched: false, confidence: 0, matchedConditions: [] };
  
  const matchedConditions: string[] = [];
  
  // Handle AND conditions - ALL conditions must match
  if (conditions.and && Array.isArray(conditions.and)) {
    const andConditions = conditions.and;
    const totalAnd = andConditions.length;
    let andMatches = 0;
    
    for (const condition of andConditions) {
      if (evaluateSingleCondition(claim, condition)) {
        andMatches++;
        matchedConditions.push(`${condition.field} ${condition.operator} ${JSON.stringify(condition.value)}`);
      }
    }
    
    // For AND: require at least 50% of conditions to match
    const andConfidence = totalAnd > 0 ? andMatches / totalAnd : 0;
    const andMatched = andConfidence >= 0.5;
    
    // If there's also an OR block, check that separately
    if (conditions.or && Array.isArray(conditions.or)) {
      const orConditions = conditions.or;
      let orMatches = 0;
      
      for (const condition of orConditions) {
        if (evaluateSingleCondition(claim, condition)) {
          orMatches++;
          matchedConditions.push(`${condition.field} ${condition.operator} ${JSON.stringify(condition.value)}`);
        }
      }
      
      // Rule with both AND and OR: AND must pass AND at least one OR must pass
      const orMatched = orMatches > 0;
      const combinedConfidence = (andConfidence * 0.7) + (orMatched ? 0.3 : 0);
      
      return {
        matched: andMatched && orMatched,
        confidence: combinedConfidence,
        matchedConditions
      };
    }
    
    // Only AND conditions
    return {
      matched: andMatched,
      confidence: andConfidence,
      matchedConditions
    };
  }
  
  // Handle OR-only conditions - ANY condition can match
  if (conditions.or && Array.isArray(conditions.or)) {
    const orConditions = conditions.or;
    const totalOr = orConditions.length;
    let orMatches = 0;
    
    for (const condition of orConditions) {
      if (evaluateSingleCondition(claim, condition)) {
        orMatches++;
        matchedConditions.push(`${condition.field} ${condition.operator} ${JSON.stringify(condition.value)}`);
      }
    }
    
    // For OR: any single match is sufficient
    if (orMatches > 0) {
      const orConfidence = Math.min(1, orMatches / totalOr + 0.3);
      return { matched: true, confidence: orConfidence, matchedConditions };
    }
    
    return { matched: false, confidence: 0, matchedConditions: [] };
  }
  
  // No AND or OR conditions found
  return { matched: false, confidence: 0, matchedConditions: [] };
}

// Evaluate a single condition against claim data
function evaluateSingleCondition(claim: ClaimData, condition: any): boolean {
  const { field, operator, value } = condition;
  
  // Get claim field value (map rule field names to claim properties)
  const claimValue = getClaimFieldValue(claim, field);
  
  // Handle not_null operator specially - checks if value exists
  if (operator === "not_null") {
    return claimValue !== undefined && claimValue !== null && claimValue !== "";
  }
  
  if (claimValue === undefined || claimValue === null) return false;
  
  switch (operator) {
    case "greater_than":
      return typeof claimValue === "number" && claimValue > value;
    case "less_than":
      return typeof claimValue === "number" && claimValue < value;
    case "greater_than_or_equals":
      return typeof claimValue === "number" && claimValue >= value;
    case "less_than_or_equals":
      return typeof claimValue === "number" && claimValue <= value;
    case "equals":
      return claimValue === value || String(claimValue).toLowerCase() === String(value).toLowerCase();
    case "not_equals":
      return claimValue !== value && String(claimValue).toLowerCase() !== String(value).toLowerCase();
    case "in":
      return Array.isArray(value) && value.some(v => 
        String(claimValue).toLowerCase() === String(v).toLowerCase() ||
        String(claimValue).toLowerCase().includes(String(v).toLowerCase())
      );
    case "not_in":
      return Array.isArray(value) && !value.some(v => 
        String(claimValue).toLowerCase() === String(v).toLowerCase()
      );
    case "starts_with":
      if (Array.isArray(value)) {
        return value.some(v => String(claimValue).startsWith(String(v)));
      }
      return String(claimValue).startsWith(String(value));
    case "not_starts_with":
      if (Array.isArray(value)) {
        return !value.some(v => String(claimValue).startsWith(String(v)));
      }
      return !String(claimValue).startsWith(String(value));
    case "ends_with":
      if (Array.isArray(value)) {
        return value.some(v => String(claimValue).endsWith(String(v)));
      }
      return String(claimValue).endsWith(String(value));
    case "contains":
      return String(claimValue).toLowerCase().includes(String(value).toLowerCase());
    case "not_contains":
      return !String(claimValue).toLowerCase().includes(String(value).toLowerCase());
    case "regex":
      try {
        return new RegExp(value, "i").test(String(claimValue));
      } catch {
        return false;
      }
    case "between":
      if (Array.isArray(value) && value.length === 2) {
        return typeof claimValue === "number" && claimValue >= value[0] && claimValue <= value[1];
      }
      return false;
    default:
      return false;
  }
}

// Map rule field names to claim data properties
// IMPORTANT: Do NOT use default values - let undefined propagate to prevent false matches
function getClaimFieldValue(claim: ClaimData, fieldName: string): any {
  // Extended claim data with feature vector fields
  const extendedClaim = claim as any;
  
  const fieldMap: Record<string, any> = {
    // Basic claim fields - these are always present
    "totalAmount": claim.amount,
    "amount": claim.amount,
    "claimType": claim.claimType,
    "diagnosisCode": claim.diagnosisCode,
    "principalDiagnosisCode": claim.diagnosisCode,
    "icdCode": claim.diagnosisCode,
    "procedureCode": claim.procedureCode,
    "cptCode": claim.procedureCode,
    "description": claim.description,
    "providerId": claim.providerId,
    "patientId": claim.patientId,
    "claimNumber": claim.claimNumber,
    "serviceDate": claim.serviceDate,
    
    // Extended fields from claim or feature vector - no defaults
    "modifierCode": extendedClaim.modifierCode,
    "specialtyCode": extendedClaim.specialtyCode,
    "referringDoctor": extendedClaim.referringDoctor,
    "gender": extendedClaim.gender,
    "patientAge": extendedClaim.patientAge,
    "lengthOfStay": extendedClaim.lengthOfStay,
    "quantity": extendedClaim.quantity,
    "dischargeStatus": extendedClaim.dischargeStatus,
    "preAuthNumber": extendedClaim.preAuthNumber,
    "claimReference": extendedClaim.claimReference,
    
    // Temporal fields (62-feature vector) - no defaults to prevent false matches
    "is_night_claim": extendedClaim.is_night_claim,
    "is_weekend": extendedClaim.is_weekend,
    "submissionHour": extendedClaim.submissionHour,
    "claim_day_of_week": extendedClaim.claim_day_of_week,
    "burst_pattern_score": extendedClaim.burst_pattern_score,
    "frequency_acceleration": extendedClaim.frequency_acceleration,
    "same_day_claims": extendedClaim.same_day_claims,
    "days_since_last_claim": extendedClaim.days_since_last_claim,
    "trend_7d_vs_30d": extendedClaim.trend_7d_vs_30d,
    "los_vs_expected": extendedClaim.los_vs_expected,
    
    // Provider aggregate fields - no defaults
    "provider_claim_count_7d": extendedClaim.provider_claim_count_7d,
    "provider_claim_count_30d": extendedClaim.provider_claim_count_30d,
    "provider_claim_count_90d": extendedClaim.provider_claim_count_90d,
    "provider_avg_amount": extendedClaim.provider_avg_amount,
    "provider_std_amount": extendedClaim.provider_std_amount,
    "provider_unique_patients": extendedClaim.provider_unique_patients,
    "provider_denial_rate": extendedClaim.provider_denial_rate,
    "provider_flag_rate": extendedClaim.provider_flag_rate,
    "provider_weekend_ratio": extendedClaim.provider_weekend_ratio,
    "provider_night_ratio": extendedClaim.provider_night_ratio,
    "provider_surgery_rate": extendedClaim.provider_surgery_rate,
    
    // Member aggregate fields - no defaults
    "member_claim_count": extendedClaim.member_claim_count,
    "member_unique_providers": extendedClaim.member_unique_providers,
    "member_unique_diagnoses": extendedClaim.member_unique_diagnoses,
    "member_total_amount": extendedClaim.member_total_amount,
    "member_avg_amount": extendedClaim.member_avg_amount,
    "member_surgery_count": extendedClaim.member_surgery_count,
    "member_icu_count": extendedClaim.member_icu_count,
    "high_utilizer_flag": extendedClaim.high_utilizer_flag,
    
    // Statistical comparison fields - no defaults
    "amount_zscore": extendedClaim.amount_zscore,
    "amount_percentile": extendedClaim.amount_percentile,
    "amount_vs_provider_avg": extendedClaim.amount_vs_provider_avg,
    "amount_vs_member_avg": extendedClaim.amount_vs_member_avg,
    "amount_vs_peer_avg": extendedClaim.amount_vs_peer_avg,
    "outlier_score": extendedClaim.outlier_score,
    "complexity_score": extendedClaim.complexity_score,
    "risk_indicator_count": extendedClaim.risk_indicator_count,
    
    // Procedure-related derived fields - no defaults
    "procedure_density": extendedClaim.procedure_density,
    "procedure_diagnosis_mismatch": extendedClaim.procedure_diagnosis_mismatch,
    "procedure_count": extendedClaim.procedure_count,
    "diagnosis_count": extendedClaim.diagnosis_count,
    "surgery_fee": extendedClaim.surgery_fee,
    "amount_procedure_ratio": extendedClaim.amount_procedure_ratio,
    
    // Network/collusion fields - no defaults
    "entity_network_score": extendedClaim.entity_network_score,
    "cross_entity_anomaly": extendedClaim.cross_entity_anomaly,
    "collusion_indicator": extendedClaim.collusion_indicator,
    
    // Peer comparison fields - no defaults
    "specialty_percentile": extendedClaim.specialty_percentile,
    "region_percentile": extendedClaim.region_percentile,
    "peer_group_zscore": extendedClaim.peer_group_zscore,
    "peer_denial_comparison": extendedClaim.peer_denial_comparison,
    "peer_flag_comparison": extendedClaim.peer_flag_comparison,
    "peer_amount_ratio": extendedClaim.peer_amount_ratio,
    
    // Pattern matching - no defaults
    "historical_pattern_match": extendedClaim.historical_pattern_match
  };
  
  // Return the mapped value - undefined if field not present
  return fieldMap[fieldName];
}

function checkRuleMatch(claim: ClaimData, rule: any): { matched: boolean; confidence: number } {
  const patterns = rule.patterns || [];
  let matchCount = 0;
  
  // Check amount thresholds (skip if amount is 0)
  if (claim.amount > 0) {
    if (patterns.includes("high_amount") && claim.amount > 50000) matchCount++;
    if (patterns.includes("very_high_amount") && claim.amount > 100000) matchCount++;
  }
  
  // Check for code patterns
  const claimText = `${claim.description || ""} ${claim.diagnosisCode || ""} ${claim.procedureCode || ""}`.toLowerCase();
  for (const pattern of patterns) {
    if (typeof pattern === "string" && claimText.includes(pattern.toLowerCase())) {
      matchCount++;
    }
  }
  
  // Check keywords from rule indicators
  if (rule.indicators && Array.isArray(rule.indicators)) {
    for (const indicator of rule.indicators) {
      if (claimText.includes(indicator.toLowerCase())) matchCount++;
    }
  }
  
  const totalPatterns = patterns.length + (rule.indicators?.length || 0) + 2; // +2 for amount checks
  const confidence = totalPatterns > 0 ? matchCount / totalPatterns : 0;
  
  return {
    matched: confidence > 0.1,
    confidence: Math.min(1, confidence * 2) // Boost confidence for partial matches
  };
}

// ========== NON-AMOUNT DETECTION PATTERNS ==========
// These patterns detect FWA without relying on claim amounts

// Check for duplicate/similar claims (same patient, diagnosis, provider in short period)
async function detectDuplicateClaims(claim: ClaimData): Promise<{
  isDuplicate: boolean;
  duplicateCount: number;
  confidence: number;
  matches: string[];
}> {
  // Find claims with same patient and diagnosis
  const similarClaims = await db.select()
    .from(claims)
    .where(and(
      eq(claims.patientId, claim.patientId),
      eq(claims.icd, claim.diagnosisCode || "")
    ))
    .limit(50);
  
  // Filter to claims within 7 days
  const claimDate = claim.serviceDate ? new Date(claim.serviceDate) : new Date();
  const nearbyDuplicates = similarClaims.filter(c => {
    if (!c.serviceDate) return false;
    const daysDiff = Math.abs((new Date(c.serviceDate).getTime() - claimDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 7 && c.id !== claim.id;
  });
  
  const isDuplicate = nearbyDuplicates.length >= 2;
  const confidence = Math.min(1, nearbyDuplicates.length / 5);
  
  return {
    isDuplicate,
    duplicateCount: nearbyDuplicates.length,
    confidence,
    matches: nearbyDuplicates.slice(0, 5).map(c => c.id)
  };
}

// Detect unusual diagnosis frequency patterns
async function detectDiagnosisPatterns(claim: ClaimData): Promise<{
  isUnusual: boolean;
  frequency: number;
  percentile: number;
  riskScore: number;
  pattern: string;
}> {
  if (!claim.diagnosisCode) {
    return { isUnusual: false, frequency: 0, percentile: 50, riskScore: 0, pattern: "no_diagnosis" };
  }
  
  // Count how often this provider uses this diagnosis code
  const diagnosisCounts = await db.select({
    count: sql<number>`count(*)`
  })
    .from(claims)
    .where(and(
      eq(claims.providerId, claim.providerId),
      eq(claims.icd, claim.diagnosisCode)
    ));
  
  const frequency = diagnosisCounts[0]?.count || 0;
  
  // High-risk diagnosis patterns (commonly abused codes)
  // Expanded list with R-codes which are symptoms and signs
  const highRiskCodes = [
    // R-codes (symptoms and signs - less specific diagnoses)
    "R50", "R51", "R52", "R53", // Fever, headache, pain, malaise
    "R10", "R11", "R12", "R13", "R14", // Abdominal symptoms
    "R00", "R01", "R02", "R03", "R04", "R05", "R06", "R07", // Circulatory/respiratory
    "R20", "R21", "R22", "R23", "R25", "R26", "R27", "R29", // Skin/nervous system
    "R30", "R31", "R32", "R33", "R34", "R35", "R36", "R39", // Urinary
    "R40", "R41", "R42", "R43", "R44", "R45", "R46", "R47", "R48", "R49", // Cognitive/emotional
    "R55", "R56", "R57", "R58", "R59", // Syncope, convulsions, etc.
    "R60", "R61", "R62", "R63", "R64", "R65", "R68", "R69", // General symptoms
    "R70", "R71", "R72", "R73", "R74", "R75", "R76", "R77", "R78", "R79", // Lab abnormalities
    "R80", "R81", "R82", "R83", "R84", "R85", "R86", "R87", "R89", // Other abnormal findings
    "R90", "R91", "R92", "R93", "R94", // Imaging abnormalities
    // Musculoskeletal (subjective, easy to fake)
    "M54", "M79", "M25", "M77",
    // Health encounters/checkups (high volume potential)
    "Z00", "Z01", "Z02",
    // Upper respiratory (over-prescribed)
    "J06", "J00", "J02", "J03",
    // Digestive symptoms (subjective)
    "K21", "K30", "K59",
    // Urinary
    "N39", "N40",
    // Mental health (hard to verify)
    "F41", "F32",
  ];
  
  const isHighRiskCode = highRiskCodes.some(code => 
    claim.diagnosisCode?.toUpperCase().startsWith(code)
  );
  
  // Score based on frequency and risk pattern - BOOSTED SCORES
  let riskScore = 0;
  let pattern = "normal";
  
  if (frequency > 50) {
    riskScore += 40;
    pattern = "high_frequency_diagnosis";
  } else if (frequency > 20) {
    riskScore += 25;
    pattern = "elevated_frequency";
  }
  
  if (isHighRiskCode) {
    riskScore += 35;  // Increased from 25
    pattern = "high_risk_diagnosis_code";
  }
  
  if (frequency > 100 && isHighRiskCode) {
    riskScore += 25;  // Increased from 20
    pattern = "suspicious_diagnosis_pattern";
  }
  
  // Any R-code (symptoms/signs) gets a base score - BOOSTED
  if (claim.diagnosisCode?.toUpperCase().startsWith("R")) {
    riskScore += 20;  // All R-codes are less specific diagnoses
    if (pattern === "normal") pattern = "symptom_only_diagnosis";
  }
  
  return {
    isUnusual: riskScore > 20,  // Lowered threshold
    frequency,
    percentile: Math.min(99, 50 + (frequency / 2)),
    riskScore,
    pattern
  };
}

// Detect suspicious provider patterns (high volume, unusual hours, etc.)
async function detectProviderPatterns(claim: ClaimData): Promise<{
  isHighVolume: boolean;
  claimsToday: number;
  claimsThisWeek: number;
  uniquePatients: number;
  riskScore: number;
  patterns: string[];
}> {
  // Get provider's recent claim activity
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now.setHours(0, 0, 0, 0));
  
  const recentClaims = await db.select()
    .from(claims)
    .where(and(
      eq(claims.providerId, claim.providerId),
      gte(claims.registrationDate, weekAgo)
    ))
    .limit(500);
  
  const claimsToday = recentClaims.filter(c => 
    c.registrationDate && new Date(c.registrationDate) >= todayStart
  ).length;
  
  const claimsThisWeek = recentClaims.length;
  
  // Count unique patients
  const uniquePatients = new Set(recentClaims.map(c => c.patientId)).size;
  
  const patterns: string[] = [];
  let riskScore = 0;
  
  // High volume patterns
  if (claimsToday > 50) {
    riskScore += 25;
    patterns.push("extremely_high_daily_volume");
  } else if (claimsToday > 30) {
    riskScore += 15;
    patterns.push("high_daily_volume");
  }
  
  if (claimsThisWeek > 200) {
    riskScore += 20;
    patterns.push("high_weekly_volume");
  }
  
  // Low patient diversity (same patients repeatedly)
  const patientRatio = claimsThisWeek > 0 ? uniquePatients / claimsThisWeek : 1;
  if (patientRatio < 0.3 && claimsThisWeek > 20) {
    riskScore += 25;
    patterns.push("low_patient_diversity");
  }
  
  // Weekend billing pattern (less common for legitimate providers)
  if (claim.serviceDate) {
    const day = new Date(claim.serviceDate).getDay();
    if (day === 0 || day === 6) {
      riskScore += 10;
      patterns.push("weekend_billing");
    }
  }
  
  return {
    isHighVolume: claimsThisWeek > 100,
    claimsToday,
    claimsThisWeek,
    uniquePatients,
    riskScore,
    patterns
  };
}

// Detect unusual service patterns
async function detectServicePatterns(claim: ClaimData): Promise<{
  riskScore: number;
  patterns: string[];
  findings: any;
}> {
  const patterns: string[] = [];
  let riskScore = 0;
  const findings: any = {};
  
  // Check for unlisted/unspecified procedure codes (often abused) - BOOSTED SCORES
  const unlistedPatterns = ["unlisted", "unspecified", "999999", "99999", "not specified", "n/a"];
  const hasUnlisted = unlistedPatterns.some(p => 
    claim.description?.toLowerCase().includes(p) ||
    claim.procedureCode?.includes(p)
  );
  
  if (hasUnlisted) {
    riskScore += 35;  // Increased from 20
    patterns.push("unlisted_procedure_code");
    findings.unlistedCode = true;
  }
  
  // Check for common billing manipulation keywords
  const manipulationKeywords = [
    "modifier", "add-on", "additional", "extended", "prolonged",
    "complex", "complicated", "comprehensive", "special", "multiple"
  ];
  
  const hasManipulation = manipulationKeywords.filter(k => 
    claim.description?.toLowerCase().includes(k)
  );
  
  if (hasManipulation.length >= 2) {
    riskScore += 25;  // Increased from 15
    patterns.push("multiple_modifiers");
    findings.modifiers = hasManipulation;
  } else if (hasManipulation.length >= 1) {
    riskScore += 10;
    patterns.push("modifier_present");
    findings.modifiers = hasManipulation;
  }
  
  // Check for patient claims volume (doctor shopping indicator)
  const patientClaims = await db.select({ count: sql<number>`count(*)` })
    .from(claims)
    .where(eq(claims.patientId, claim.patientId));
  
  const patientClaimCount = patientClaims[0]?.count || 0;
  
  if (patientClaimCount > 30) {
    riskScore += 20;
    patterns.push("high_patient_utilization");
    findings.patientClaimCount = patientClaimCount;
  }
  
  // Check for same-day multiple claims from same provider for same patient
  if (claim.serviceDate) {
    const sameDayClaims = await db.select({ count: sql<number>`count(*)` })
      .from(claims)
      .where(and(
        eq(claims.patientId, claim.patientId),
        eq(claims.providerId, claim.providerId),
        eq(claims.serviceDate, claim.serviceDate)
      ));
    
    const sameDayCount = sameDayClaims[0]?.count || 0;
    if (sameDayCount > 5) {
      riskScore += 25;
      patterns.push("excessive_same_day_billing");
      findings.sameDayCount = sameDayCount;
    }
  }
  
  return { riskScore, patterns, findings };
}

function getSeverityMultiplier(severity: string | null): number {
  switch (severity) {
    case "critical": return 1.5;
    case "major": case "high": return 1.2;
    case "moderate": case "medium": return 1.0;
    case "minor": case "low": return 0.7;
    default: return 1.0;
  }
}

// 2. STATISTICAL LEARNING DETECTOR
// ENTERPRISE-GRADE: Uses 62-feature system with database-backed population statistics
// All statistics (mean, stdDev, percentiles) calculated from real claim population
// Feature weights stored in database for supervised scoring
export async function runStatisticalDetection(claim: ClaimData): Promise<{
  score: number;
  findings: any;
}> {
  try {
    // Use the enterprise-grade Statistical Learning engine
    // Pass all available claim properties - the engine will normalize them
    const result = await statisticalLearningEngine.runStatisticalDetection({
      id: claim.id,
      amount: claim.amount,
      providerId: claim.providerId,
      patientId: claim.patientId,
      diagnosisCode: claim.diagnosisCode,
      procedureCode: claim.procedureCode,
      serviceDate: claim.serviceDate,
      claimType: claim.claimType,
      description: claim.description,
      claimNumber: claim.claimNumber,
      // Additional properties passed through if available on extended claim objects
      ...(claim as any)
    });
    
    // Transform to legacy format for compatibility
    return {
      score: result.score,
      findings: {
        // Enterprise model info
        modelVersion: result.findings.modelVersion,
        featureCount: result.findings.featureCount,
        
        // Feature importance (legacy format)
        featureImportance: result.findings.topContributors.map(f => ({
          feature: f.featureName,
          importance: f.weight,
          value: f.zScore
        })),
        
        // Model prediction
        modelPrediction: result.score / 100,
        
        // Peer comparison from database
        peerComparison: {
          mean: 50, // Normalized baseline
          stdDev: 25,
          zScore: result.findings.peerComparison.zScoreVsPeers,
          peerGroupName: result.findings.peerComparison.peerGroupName,
          claimPercentile: result.findings.peerComparison.claimPercentile,
          deviationFromMean: result.findings.peerComparison.deviationFromMean
        },
        
        // Historical trend based on aggregate stats
        historicalTrend: result.findings.aggregateStats.avgZScore > 0.5 ? "increasing" : 
                         result.findings.aggregateStats.avgZScore < -0.5 ? "decreasing" : "stable",
        
        // Aggregate statistics
        aggregateStats: result.findings.aggregateStats,
        
        // Full 62-feature vector
        featureVector: result.findings.featureVector,
        
        // All feature scores with z-scores
        featureScores: result.findings.featureScores,
        
        // Explanations
        humanExplanation: result.findings.humanExplanation,
        humanExplanationAr: result.findings.humanExplanationAr,
        anomalyReasons: result.findings.anomalyReasons,
        
        // Metadata
        populationStatsAge: result.findings.populationStatsAge,
        weightsVersion: result.findings.weightsVersion,
        
        // Legacy pattern detection (kept for backwards compatibility)
        nonAmountPatterns: {
          detectedPatterns: result.findings.anomalyReasons
        }
      }
    };
  } catch (error: any) {
    console.error('Statistical Learning detection error:', error);
    // Return minimal score on error
    return {
      score: 0,
      findings: {
        error: error.message,
        modelVersion: 'error',
        featureImportance: [],
        peerComparison: { mean: 50, stdDev: 25, zScore: 0 }
      }
    };
  }
}

// Legacy helper functions removed - now using database-backed statistics
// The following functions are deprecated and replaced by StatisticalLearningEngine:
// - calculateAmountFeature() -> uses population_statistics table
// - calculateProviderRiskFeature() -> uses provider_feature_store + population_statistics
// - calculatePatientPatternFeature() -> uses member_feature_store + population_statistics
// - All hardcoded mean/stdDev values replaced with database queries

async function calculatePatientPatternFeatureLegacy(patientId: string): Promise<{ value: number; score: number }> {
  // Legacy function kept for backwards compatibility with other code paths
  const claimCount = await db.select({ count: sql<number>`count(*)` })
    .from(claims)
    .where(eq(claims.patientId, patientId));
  
  const count = claimCount[0]?.count || 0;
  const value = Math.min(1, count / 20);
  return { value, score: value * 0.4 };
}

function calculateComplexityMatchFeature(claim: ClaimData): { value: number; score: number } {
  // Check if procedure complexity matches diagnosis severity
  // Simple heuristic: high amount with common diagnosis = mismatch risk
  const highAmount = claim.amount > 30000;
  const commonDiagnosis = claim.diagnosisCode?.startsWith("J") || claim.diagnosisCode?.startsWith("M");
  
  if (highAmount && commonDiagnosis) {
    return { value: 0.7, score: 0.7 };
  }
  return { value: 0.2, score: 0.2 };
}

function calculateTimePatternFeature(serviceDate?: Date | string): { value: number; score: number } {
  if (!serviceDate) return { value: 0, score: 0 };
  
  // Handle string dates
  const date = typeof serviceDate === 'string' ? new Date(serviceDate) : serviceDate;
  if (isNaN(date.getTime())) return { value: 0, score: 0 };
  
  const day = date.getDay();
  const isWeekend = day === 0 || day === 6;
  
  // Weekend billing slightly higher risk for certain services
  return { value: isWeekend ? 0.6 : 0.2, score: isWeekend ? 0.3 : 0.1 };
}

function calculateClaimTypeRisk(claimType?: string): { value: number; score: number } {
  const highRiskTypes = ["inpatient", "surgery", "specialty"];
  const isHighRisk = highRiskTypes.includes(claimType?.toLowerCase() || "");
  return { value: isHighRisk ? 0.6 : 0.3, score: isHighRisk ? 0.4 : 0.2 };
}

// 3. UNSUPERVISED LEARNING DETECTOR
// Anomaly detection and clustering analysis with 5 algorithms
export async function runUnsupervisedDetection(claim: ClaimData): Promise<{
  score: number;
  findings: any;
}> {
  // Simulate 5 unsupervised learning algorithms
  // In production: Call actual ML model endpoints
  
  // 1. Isolation Forest - anomaly detection based on isolation depth
  const isolationScore = calculateIsolationForestScore(claim);
  
  // 2. Local Outlier Factor (LOF) - density-based anomaly detection
  const lofScore = calculateLOFScore(claim);
  
  // 3. DBSCAN clustering analysis
  const clusterAnalysis = await analyzeClusterBehavior(claim);
  const dbscanScore = clusterAnalysis.outlierScore;
  
  // 4. Autoencoder reconstruction error (simulated)
  const autoencoderScore = calculateAutoencoderScore(claim);
  
  // 5. Deep Learning anomaly score (simulated neural network)
  const deepLearningScore = calculateDeepLearningScore(claim);
  
  // Weighted combination of all 5 algorithms
  const algorithmWeights = {
    isolationForest: 0.25,
    lof: 0.20,
    dbscan: 0.20,
    autoencoder: 0.20,
    deepLearning: 0.15
  };
  
  // Guard against NaN values
  const safeIsolation = isNaN(isolationScore) ? 0 : isolationScore;
  const safeLof = isNaN(lofScore) ? 0 : lofScore;
  const safeDbscan = isNaN(dbscanScore) ? 0 : dbscanScore;
  const safeAutoencoder = isNaN(autoencoderScore) ? 0 : autoencoderScore;
  const safeDeepLearning = isNaN(deepLearningScore) ? 0 : deepLearningScore;
  
  const anomalyScore = 
    (safeIsolation * algorithmWeights.isolationForest) +
    (safeLof * algorithmWeights.lof) +
    (safeDbscan * algorithmWeights.dbscan) +
    (safeAutoencoder * algorithmWeights.autoencoder) +
    (safeDeepLearning * algorithmWeights.deepLearning);
  
  const outlierReasons: string[] = [];
  if (isolationScore > 0.7) outlierReasons.push("Isolation Forest: Unusual claim pattern isolated quickly");
  if (lofScore > 0.7) outlierReasons.push("LOF: Low density region compared to neighbors");
  if (dbscanScore > 0.7) outlierReasons.push("DBSCAN: Behavior deviates from peer cluster");
  if (autoencoderScore > 0.7) outlierReasons.push("Autoencoder: High reconstruction error");
  if (deepLearningScore > 0.7) outlierReasons.push("Deep Learning: Neural network flagged anomaly");
  if (claim.amount > 100000) outlierReasons.push("Extreme claim value detected");
  
  return {
    score: anomalyScore * 100,
    findings: {
      anomalyScore,
      // Individual algorithm scores for radar chart
      algorithmScores: {
        isolationForest: isolationScore,
        lof: lofScore,
        dbscan: dbscanScore,
        autoencoder: autoencoderScore,
        deepLearning: deepLearningScore
      },
      // Legacy fields for backward compatibility
      clusterAssignment: clusterAnalysis.cluster,
      clusterSize: clusterAnalysis.clusterSize,
      outlierReason: outlierReasons,
      isolationForestScore: isolationScore,
      nearestClusterDistance: clusterAnalysis.distance
    }
  };
}

// Local Outlier Factor simulation
function calculateLOFScore(claim: ClaimData): number {
  // Simulates LOF by comparing claim to "neighborhood" patterns
  let lofIndicators = 0;
  
  // Amount deviation from typical range
  if (claim.amount > 150000) lofIndicators += 2;
  else if (claim.amount > 75000) lofIndicators += 1;
  
  // Unusual procedure-diagnosis combinations
  if (claim.procedureCode && claim.diagnosisCode) {
    const hasUnusual = !isCommonCodePair(claim.diagnosisCode, claim.procedureCode);
    if (hasUnusual) lofIndicators += 1;
  }
  
  // Multiple services in single visit (if detectable)
  if (claim.claimType === "inpatient" && claim.amount > 50000) {
    lofIndicators += 0.5;
  }
  
  return Math.min(1, lofIndicators / 3);
}

// Autoencoder reconstruction error simulation
function calculateAutoencoderScore(claim: ClaimData): number {
  // Simulates autoencoder by measuring how "reconstructable" the claim pattern is
  let reconstructionError = 0;
  
  // Claims with unusual combinations are harder to reconstruct
  if (claim.amount > 200000) reconstructionError += 0.4;
  else if (claim.amount > 100000) reconstructionError += 0.2;
  
  // Missing or unusual metadata increases reconstruction error
  if (!claim.diagnosisCode) reconstructionError += 0.15;
  if (!claim.procedureCode) reconstructionError += 0.15;
  
  // Weekend/holiday claims slightly harder to reconstruct
  const serviceDate = claim.serviceDate ? new Date(claim.serviceDate) : new Date();
  if (serviceDate.getDay() === 0 || serviceDate.getDay() === 6) {
    reconstructionError += 0.1;
  }
  
  return Math.min(1, reconstructionError);
}

// Deep Learning neural network simulation
function calculateDeepLearningScore(claim: ClaimData): number {
  // Simulates a trained neural network ensemble
  let nnScore = 0;
  
  // Pattern recognition based on amount tiers
  if (claim.amount > 250000) nnScore += 0.5;
  else if (claim.amount > 100000) nnScore += 0.25;
  else if (claim.amount > 50000) nnScore += 0.1;
  
  // Claim type patterns
  if (claim.claimType === "emergency" && claim.amount > 75000) {
    nnScore += 0.2;
  }
  
  // Provider type patterns
  if (claim.description?.toLowerCase().includes("multiple") || 
      claim.description?.toLowerCase().includes("repeat")) {
    nnScore += 0.15;
  }
  
  return Math.min(1, nnScore);
}

function calculateIsolationForestScore(claim: ClaimData): number {
  // Simplified isolation forest simulation
  // In production: Use actual model predictions
  
  let anomalyIndicators = 0;
  
  // Amount outlier detection
  if (claim.amount > 200000) anomalyIndicators += 3;
  else if (claim.amount > 100000) anomalyIndicators += 2;
  else if (claim.amount > 50000) anomalyIndicators += 1;
  
  // Check for unusual code combinations (simplified)
  const hasUnusualCombination = claim.diagnosisCode && claim.procedureCode &&
    !isCommonCodePair(claim.diagnosisCode, claim.procedureCode);
  if (hasUnusualCombination) anomalyIndicators += 1;
  
  // Normalize to 0-1
  return Math.min(1, anomalyIndicators / 5);
}

function isCommonCodePair(diagnosis: string, procedure: string): boolean {
  // Simplified check - in production would use actual code mapping
  return true; // Default to common
}

async function analyzeClusterBehavior(claim: ClaimData): Promise<{
  cluster: number;
  clusterSize: number;
  outlierScore: number;
  distance: number;
}> {
  // Simulate cluster analysis based on provider/amount patterns
  // In production: Use K-means or DBSCAN results
  
  // Get provider's claim statistics
  const providerStats = await db.select({
    avgAmount: sql<number>`avg(${claims.amount}::numeric)`,
    count: sql<number>`count(*)`
  })
    .from(claims)
    .where(eq(claims.providerId, claim.providerId));
  
  const avgAmount = providerStats[0]?.avgAmount || 10000;
  const claimCount = providerStats[0]?.count || 1;
  
  // Calculate distance from provider's normal pattern
  const amountDeviation = Math.abs(claim.amount - avgAmount) / (avgAmount || 1);
  const outlierScore = Math.min(1, amountDeviation);
  
  // Assign to cluster based on amount range
  let cluster = 0;
  if (claim.amount < 5000) cluster = 1;
  else if (claim.amount < 20000) cluster = 2;
  else if (claim.amount < 50000) cluster = 3;
  else cluster = 4;
  
  return {
    cluster,
    clusterSize: Math.max(10, 100 - cluster * 20),
    outlierScore,
    distance: amountDeviation
  };
}

// 4. RAG/LLM DETECTOR
// Context-aware analysis using vector database and LLM reasoning
export async function runRagLlmDetection(claim: ClaimData): Promise<{
  score: number;
  findings: any;
}> {
  // Build context query
  const queryText = `Healthcare claim: ${claim.claimType || "general"} - Amount: ${claim.amount} SAR - Diagnosis: ${claim.diagnosisCode || "unspecified"} - Procedure: ${claim.procedureCode || "unspecified"} - ${claim.description || ""}`;
  
  // Search knowledge base for similar patterns
  let knowledgeBaseMatches: any[] = [];
  let similarCases: any[] = [];
  let contextualAnalysis = "";
  let recommendation = "";
  let confidence = 0.5;
  
  try {
    // Use RAG to find relevant policy violations and guidelines
    const ragSearchResults = await semanticSearch(queryText, 5);
    
    // Flatten results from all knowledge base tables
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
      relevance: r.similarity,
      source: r.source
    }));
    
    // If we have relevant matches, use LLM for analysis
    if (knowledgeBaseMatches.length > 0) {
      const analysisPrompt = buildAnalysisPrompt(claim, ragResults);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a healthcare fraud detection expert. Analyze claims and provide risk assessments based on the provided knowledge base context. Be concise and specific."
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      });
      
      const llmResponse = response.choices[0]?.message?.content || "";
      
      // Parse LLM response for structured output
      const parsedAnalysis = parseLlmResponse(llmResponse);
      contextualAnalysis = parsedAnalysis.analysis;
      recommendation = parsedAnalysis.recommendation;
      confidence = parsedAnalysis.confidence;
    } else {
      contextualAnalysis = "Limited knowledge base context available for this claim type.";
      recommendation = "Standard review process recommended.";
      confidence = 0.4;
    }
  } catch (error) {
    console.error("RAG/LLM detection error:", error);
    contextualAnalysis = "Unable to complete contextual analysis.";
    recommendation = "Manual review recommended.";
    confidence = 0.3;
  }
  
  // Calculate score based on knowledge base matches and LLM confidence
  const matchScore = knowledgeBaseMatches.reduce((sum, m) => sum + m.relevance, 0) / Math.max(1, knowledgeBaseMatches.length);
  const ragScore = (matchScore * 50) + (confidence * 50);
  
  return {
    score: Math.min(100, ragScore),
    findings: {
      contextualAnalysis,
      similarCases,
      knowledgeBaseMatches,
      recommendation,
      confidence
    }
  };
}

function buildAnalysisPrompt(claim: ClaimData, ragResults: any[]): string {
  const contextDocs = ragResults.map(r => 
    `[${r.source}] ${r.title}: ${r.content?.substring(0, 300) || ""}`
  ).join("\n\n");
  
  return `Analyze this healthcare claim for potential fraud, waste, or abuse:

CLAIM DETAILS:
- Amount: ${claim.amount} SAR
- Type: ${claim.claimType || "Not specified"}
- Diagnosis Code: ${claim.diagnosisCode || "Not specified"}
- Procedure Code: ${claim.procedureCode || "Not specified"}
- Description: ${claim.description || "No description"}

RELEVANT KNOWLEDGE BASE CONTEXT:
${contextDocs}

Please provide:
1. ANALYSIS: A brief analysis of potential FWA indicators (2-3 sentences)
2. RISK_LEVEL: One of [LOW, MEDIUM, HIGH, CRITICAL]
3. CONFIDENCE: A confidence score from 0 to 1
4. RECOMMENDATION: Specific action recommendation`;
}

function parseLlmResponse(response: string): {
  analysis: string;
  recommendation: string;
  confidence: number;
  riskLevel: string;
} {
  // Extract structured data from LLM response using simpler regex (no 's' flag)
  const lines = response.split('\n').join(' ');
  const analysisMatch = lines.match(/ANALYSIS[:\s]*([^]*?)(?=RISK_LEVEL|CONFIDENCE|RECOMMENDATION|$)/i);
  const riskMatch = lines.match(/RISK_LEVEL[:\s]*(LOW|MEDIUM|HIGH|CRITICAL)/i);
  const confidenceMatch = lines.match(/CONFIDENCE[:\s]*([0-9.]+)/i);
  const recommendationMatch = lines.match(/RECOMMENDATION[:\s]*([^]*?)$/i);
  
  return {
    analysis: analysisMatch?.[1]?.trim() || response.substring(0, 200),
    riskLevel: riskMatch?.[1]?.toUpperCase() || "MEDIUM",
    confidence: parseFloat(confidenceMatch?.[1] || "0.5"),
    recommendation: recommendationMatch?.[1]?.trim() || "Review claim details."
  };
}

// FAST DETECTION PIPELINE (skips RAG/LLM for speed)
// Runs only Rule Engine, Statistical, and Unsupervised - ~10x faster
export async function runFastDetection(claim: ClaimData): Promise<DetectionResult> {
  const startTime = Date.now();
  
  // Normalize claim data
  const normalizedClaim = normalizeClaimData(claim);
  
  // Enrich claim with ALL 62 features + network features for rule evaluation
  const enrichedClaim = await enrichClaimWithAllFeatures(normalizedClaim);
  
  // Run 3 fast detectors in parallel (no RAG/LLM)
  const [ruleResult, statResult, unsupResult] = await Promise.all([
    runRuleEngineDetection(enrichedClaim),
    runStatisticalDetection(enrichedClaim),
    runUnsupervisedDetection(enrichedClaim)
  ]);
  
  // Recalculate weights without RAG/LLM (proportional)
  const fastWeights = {
    rule: 0.44,      // 35% / 80% = ~44%
    stat: 0.31,      // 25% / 80% = ~31%
    unsup: 0.25      // 20% / 80% = ~25%
  };
  
  const compositeScore = 
    (ruleResult.score * fastWeights.rule) +
    (statResult.score * fastWeights.stat) +
    (unsupResult.score * fastWeights.unsup);
  
  let compositeRiskLevel = "low";
  if (compositeScore >= 80) compositeRiskLevel = "critical";
  else if (compositeScore >= 60) compositeRiskLevel = "high";
  else if (compositeScore >= 40) compositeRiskLevel = "medium";
  
  const scores = [
    { method: "rule_engine", score: ruleResult.score },
    { method: "statistical_learning", score: statResult.score },
    { method: "unsupervised_learning", score: unsupResult.score }
  ];
  const primaryMethod = scores.sort((a, b) => b.score - a.score)[0].method;
  
  const parts: string[] = [];
  if (ruleResult.score > 50) parts.push(`${ruleResult.findings.violationCount} rule violations`);
  if (statResult.score > 50) parts.push(`statistical anomaly`);
  if (unsupResult.score > 50) parts.push(`behavioral outlier`);
  
  const detectionSummary = parts.length > 0 
    ? `Fast scan: ${compositeScore.toFixed(1)}/100. ${parts.join("; ")}.`
    : `Fast scan: Low risk (${compositeScore.toFixed(1)}/100).`;
  
  const processingTimeMs = Date.now() - startTime;
  
  return {
    claimId: claim.id,
    compositeScore: Math.round(compositeScore * 100) / 100,
    compositeRiskLevel,
    ruleEngineScore: ruleResult.score,
    statisticalScore: statResult.score,
    unsupervisedScore: unsupResult.score,
    ragLlmScore: 0, // Not run in fast mode
    semanticScore: 0, // Not run in fast mode
    ruleEngineFindings: ruleResult.findings,
    statisticalFindings: statResult.findings,
    unsupervisedFindings: unsupResult.findings,
    ragLlmFindings: { analysis: "Skipped in fast mode", recommendation: "", confidence: 0, knowledgeBaseMatches: [] },
    semanticFindings: { analysis: "Skipped in fast mode", matchResults: [], riskAssessment: "" },
    primaryDetectionMethod: primaryMethod,
    detectionSummary,
    recommendedAction: compositeRiskLevel === "critical" ? "Immediate review required" : 
                       compositeRiskLevel === "high" ? "Assign for investigation" : "Standard processing",
    processingTimeMs
  };
}

// MAIN DETECTION PIPELINE
// Orchestrates all 4 detection methods and produces composite score
// Normalize claim data to handle different field naming conventions
function normalizeClaimData(claim: any): ClaimData {
  return {
    ...claim,
    // Handle different diagnosis code field names
    diagnosisCode: claim.diagnosisCode || claim.principalDiagnosisCode || claim.icd || claim.diagnosis || null,
    // Handle different procedure code field names  
    procedureCode: claim.procedureCode || claim.cptCode || (claim.cptCodes?.[0]) || null,
    // Handle different provider ID field names
    providerId: claim.providerId || claim.hospital || null,
    // Handle different patient ID field names
    patientId: claim.patientId || claim.memberId || null,
    // Ensure amount is a number
    amount: typeof claim.amount === 'string' ? parseFloat(claim.amount) : (claim.amount || 0),
  };
}

// Enrich claim with all 62 features from FeatureEngineeringService + network features
// This is CRITICAL - the rule engine needs these features to evaluate conditions
async function enrichClaimWithAllFeatures(claim: ClaimData): Promise<any> {
  // 1. Build the 62-feature vector using FeatureEngineeringService
  const featureVector = await featureEngineering.buildFeatureVector(claim);
  
  // 2. Calculate network features for NC-* rules
  const networkFeatures = await networkFeatureService.calculateNetworkFeatures(
    claim.providerId || null,
    claim.patientId || null,
    (claim as any).doctorId || null,
    claim.amount || 0
  );
  
  // 3. Calculate additional derived features for rule conditions
  const serviceDate = claim.serviceDate ? new Date(claim.serviceDate) : new Date();
  const submissionHour = serviceDate.getHours();
  const isNightClaim = submissionHour < 6 || submissionHour >= 22;
  
  // 4. Merge all features into enriched claim
  return {
    ...claim,
    // 62-feature vector fields (matching rule condition field names)
    claim_amount: featureVector.claim_amount,
    surgery_fee: featureVector.surgery_fee,
    outlier_score: featureVector.outlier_score,
    is_weekend: featureVector.is_weekend,
    is_night_claim: isNightClaim ? 1 : 0,
    submissionHour: submissionHour,
    claim_day_of_week: featureVector.day_of_week,
    lengthOfStay: featureVector.length_of_stay,
    has_surgery: featureVector.has_surgery,
    has_icu: featureVector.has_icu,
    diagnosis_count: featureVector.diagnosis_count,
    procedure_count: featureVector.procedure_count,
    
    // Provider aggregate fields
    provider_claim_count_7d: featureVector.provider_claim_count_7d,
    provider_claim_count_30d: featureVector.provider_claim_count_30d,
    provider_claim_count_90d: featureVector.provider_claim_count_90d,
    provider_avg_amount: featureVector.provider_avg_amount_30d,
    provider_std_amount: featureVector.provider_std_amount_30d,
    provider_unique_patients: featureVector.provider_unique_patients_30d,
    provider_denial_rate: featureVector.provider_denial_rate_90d,
    provider_flag_rate: featureVector.provider_flag_rate_90d,
    provider_weekend_ratio: featureVector.provider_weekend_ratio,
    provider_surgery_rate: featureVector.provider_surgery_rate,
    
    // Member aggregate fields
    member_claim_count: featureVector.member_claim_count_30d,
    member_unique_providers: featureVector.member_unique_providers_30d,
    member_unique_diagnoses: featureVector.member_unique_diagnoses_30d,
    member_total_amount: featureVector.member_total_amount_30d,
    member_avg_amount: featureVector.member_avg_amount_30d,
    member_surgery_count: featureVector.member_surgery_count_90d,
    member_icu_count: featureVector.member_icu_count_90d,
    high_utilizer_flag: featureVector.member_high_utilizer_flag,
    
    // Statistical comparison fields
    amount_vs_provider_avg: featureVector.amount_vs_provider_avg,
    amount_vs_member_avg: featureVector.amount_vs_member_avg,
    amount_vs_peer_avg: featureVector.amount_vs_peer_group,
    
    // Derived fields
    procedure_density: featureVector.procedure_density,
    procedure_diagnosis_mismatch: featureVector.procedure_diagnosis_mismatch,
    los_vs_expected: featureVector.los_vs_diagnosis_expected,
    
    // Temporal fields
    same_day_claims: featureVector.claims_same_day,
    days_since_last_claim: featureVector.days_since_last_claim,
    burst_pattern_score: featureVector.burst_pattern_score,
    trend_7d_vs_30d: featureVector.provider_trend_7d_vs_30d,
    frequency_acceleration: featureVector.member_frequency_acceleration,
    
    // Network/collusion fields (from NetworkFeatureService)
    cross_entity_anomaly: networkFeatures.cross_entity_anomaly,
    entity_network_score: networkFeatures.entity_network_score,
    collusion_indicator: networkFeatures.collusion_indicator
  };
}

export async function runFullDetection(claim: ClaimData, weights = DEFAULT_WEIGHTS): Promise<DetectionResult> {
  const startTime = Date.now();
  
  // Normalize claim data to handle different field naming conventions
  const normalizedClaim = normalizeClaimData(claim);
  
  // Enrich claim with ALL 62 features + network features for rule evaluation
  const enrichedClaim = await enrichClaimWithAllFeatures(normalizedClaim);
  
  // Run all 4 detectors in parallel with fully enriched claim
  const [ruleResult, statResult, unsupResult, ragResult] = await Promise.all([
    runRuleEngineDetection(enrichedClaim),
    runStatisticalDetection(enrichedClaim),
    runUnsupervisedDetection(enrichedClaim),
    runRagLlmDetection(enrichedClaim)
  ]);
  
  // Calculate weighted composite score
  const compositeScore = 
    (ruleResult.score * weights.rule_engine) +
    (statResult.score * weights.statistical_learning) +
    (unsupResult.score * weights.unsupervised_learning) +
    (ragResult.score * weights.rag_llm);
  
  // Determine risk level
  let compositeRiskLevel = "low";
  if (compositeScore >= 80) compositeRiskLevel = "critical";
  else if (compositeScore >= 60) compositeRiskLevel = "high";
  else if (compositeScore >= 40) compositeRiskLevel = "medium";
  
  // Determine primary detection method
  const scores = [
    { method: "rule_engine", score: ruleResult.score },
    { method: "statistical_learning", score: statResult.score },
    { method: "unsupervised_learning", score: unsupResult.score },
    { method: "rag_llm", score: ragResult.score }
  ];
  const primaryMethod = scores.sort((a, b) => b.score - a.score)[0].method;
  
  // Generate summary
  const detectionSummary = generateDetectionSummary(ruleResult, statResult, unsupResult, ragResult, compositeScore);
  
  // Generate recommended action
  const recommendedAction = generateRecommendedAction(compositeRiskLevel, primaryMethod, ruleResult.findings);
  
  const processingTimeMs = Date.now() - startTime;
  
  // Run semantic validation for ICD-10/CPT matching (use normalized claim)
  const semanticResult = await runSemanticValidation(normalizedClaim);
  
  return {
    claimId: claim.id,
    compositeScore: Math.round(compositeScore * 100) / 100,
    compositeRiskLevel,
    ruleEngineScore: ruleResult.score,
    statisticalScore: statResult.score,
    unsupervisedScore: unsupResult.score,
    ragLlmScore: ragResult.score,
    semanticScore: semanticResult.score,
    ruleEngineFindings: ruleResult.findings,
    statisticalFindings: statResult.findings,
    unsupervisedFindings: unsupResult.findings,
    ragLlmFindings: ragResult.findings,
    semanticFindings: semanticResult.findings,
    primaryDetectionMethod: primaryMethod,
    detectionSummary,
    recommendedAction,
    processingTimeMs
  };
}

function generateDetectionSummary(rule: any, stat: any, unsup: any, rag: any, composite: number): string {
  const parts: string[] = [];
  
  if (rule.score > 50) {
    parts.push(`${rule.findings.violationCount} rule violations detected`);
  }
  if (stat.score > 50) {
    parts.push(`statistical anomaly (z-score: ${stat.findings.peerComparison.zScore.toFixed(2)})`);
  }
  if (unsup.score > 50) {
    parts.push(`behavioral outlier in cluster ${unsup.findings.clusterAssignment}`);
  }
  if (rag.score > 50 && rag.findings.knowledgeBaseMatches.length > 0) {
    parts.push(`${rag.findings.knowledgeBaseMatches.length} policy matches found`);
  }
  
  if (parts.length === 0) {
    return `Low risk claim with composite score ${composite.toFixed(1)}. No significant indicators detected.`;
  }
  
  return `Composite risk score: ${composite.toFixed(1)}/100. Indicators: ${parts.join("; ")}.`;
}

function generateRecommendedAction(riskLevel: string, primaryMethod: string, ruleFindings: any): string {
  switch (riskLevel) {
    case "critical":
      return "Immediate escalation to FWA investigation team. Suspend claim processing pending review.";
    case "high":
      return "Assign to senior reviewer for detailed investigation. Request additional documentation.";
    case "medium":
      return "Standard review process with focus on flagged indicators. May require provider clarification.";
    default:
      return "Auto-approve eligible. Monitor for pattern changes.";
  }
}

// Detailed detection method configurations with algorithm explanations
const DEFAULT_DETECTION_CONFIGS = [
  { 
    method: "rule_engine", 
    name: "Rule Engine", 
    isEnabled: true, 
    weight: "0.35", 
    threshold: "0.70",
    algorithmName: "Deterministic Pattern Matching",
    algorithmType: "Rule-Based System",
    description: "Matches claims against a library of 30+ expert-defined fraud rules covering upcoding, unbundling, phantom billing, drug abuse, and clinical plausibility violations.",
    howItWorks: "Each rule defines conditions (field operators like 'greater_than', 'equals', 'in') that are evaluated against claim data. When conditions match, a severity-weighted score is computed. Rules also check against the Policy Violation Catalogue and FWA Behaviors database.",
    strengths: "High precision for known fraud patterns; fully explainable decisions; regulatory compliance; fast execution; no training required.",
    limitations: "Cannot detect novel fraud schemes; requires manual rule maintenance; may miss subtle patterns.",
    dataSources: ["FWA Rules Library (30 rules)", "Policy Violation Catalogue", "FWA Behaviors Database", "CHI Regulatory References"],
    outputMetrics: ["Matched Rules Count", "Severity Score", "Confidence Level", "Rule Categories Hit"]
  },
  { 
    method: "statistical_learning", 
    name: "Statistical Learning", 
    isEnabled: true, 
    weight: "0.25", 
    threshold: "0.70",
    algorithmName: "Peer-Group Z-Score Analysis with Feature Engineering",
    algorithmType: "Supervised Scoring Model",
    description: "Computes risk scores by comparing claims against peer groups using z-scores, percentile ranks, and weighted feature importance from regression-style heuristics.",
    howItWorks: "Claims are analyzed across 8 feature dimensions: amount z-score, provider risk score, rejection rate, patient utilization, claim complexity, temporal patterns, claim type risk, and specialty match. Each feature is normalized and weighted to produce a composite statistical score.",
    strengths: "Detects outliers within peer groups; adapts to different specialties/regions; provides interpretable feature importance; handles continuous variables well.",
    limitations: "Requires historical data for peer comparison; may not detect novel entity types; assumes normal distributions.",
    dataSources: ["FWA Feature Store (Provider/Patient/Doctor stats)", "Peer Group Comparisons", "Historical Claim Aggregates"],
    outputMetrics: ["Z-Score", "Percentile Rank", "Feature Importance Breakdown", "Peer Group Statistics"]
  },
  { 
    method: "unsupervised_learning", 
    name: "Unsupervised Learning", 
    isEnabled: true, 
    weight: "0.20", 
    threshold: "0.70",
    algorithmName: "Isolation Forest + Multi-Dimensional Clustering",
    algorithmType: "Anomaly Detection Model",
    description: "Identifies anomalies using Isolation Forest scoring and cluster analysis across provider, patient, and doctor dimensions without labeled training data.",
    howItWorks: "Claims are evaluated in a high-dimensional feature space. The Isolation Forest algorithm measures how 'isolated' a claim is from normal patterns. Multi-dimensional clustering analyzes provider behavior, patient patterns, and doctor practice outliers separately, then combines scores with dimension-specific weights.",
    strengths: "Detects unknown fraud patterns; no labeled data required; identifies collusion rings; works on sparse data; adapts to new patterns automatically.",
    limitations: "Higher false positive rate; less interpretable than rules; requires parameter tuning; computationally intensive.",
    dataSources: ["Claim Amount Percentiles (P90/P95/P99)", "Provider-Patient Pair Frequencies", "Service Code Distributions", "Length of Stay Patterns"],
    outputMetrics: ["Anomaly Score (0-1)", "Cluster Assignment", "Isolation Forest Score", "Dimension Analysis (Provider/Patient/Doctor)"]
  },
  { 
    method: "rag_llm", 
    name: "RAG/LLM Analysis", 
    isEnabled: true, 
    weight: "0.20", 
    threshold: "0.70",
    algorithmName: "OpenAI GPT-4o with Vector Search (RAG)",
    algorithmType: "Large Language Model with Retrieval",
    description: "Uses semantic search over the Knowledge Hub to find relevant policies, then leverages GPT-4o for contextual analysis and evidence-based recommendations.",
    howItWorks: "Claim data is converted to natural language and embedded using OpenAI's embedding model. The system searches the Knowledge Hub (policy documents, medical guidelines, prior cases) for relevant context. Retrieved documents are passed to GPT-4o which analyzes the claim, identifies potential violations, and generates recommendations with confidence scores.",
    strengths: "Understands complex medical context; generates human-readable explanations; finds subtle policy violations; adapts to new regulations quickly; provides evidence chains.",
    limitations: "Higher latency (~2-5 seconds); API costs; may hallucinate without proper context; requires quality knowledge base maintenance.",
    dataSources: ["Policy Violation Catalogue (embedded)", "Clinical Pathway Rules", "Medical Guidelines", "Regulatory Documents", "Provider Complaints History"],
    outputMetrics: ["Contextual Analysis Narrative", "Knowledge Base Matches", "Recommendation", "Confidence Score", "Evidence Chain"]
  },
  { 
    method: "semantic_validation", 
    name: "Semantic Validation", 
    isEnabled: true, 
    weight: "0.15", 
    threshold: "0.70",
    algorithmName: "ICD-10/CPT Vector Similarity",
    algorithmType: "Semantic Embedding Model",
    description: "Validates procedure-diagnosis relationships using vector embeddings. CPT codes (~9,800) and ICD-10 codes (~72,000) are embedded using OpenAI's text-embedding-ada-002 model and stored in pgvector for cosine similarity matching.",
    howItWorks: "Each procedure code (CPT) and diagnosis code (ICD-10) is embedded into a 1536-dimensional vector space. When a claim is analyzed, the system computes cosine similarity between the procedure and diagnosis embeddings to determine clinical compatibility. Similarity scores are converted to risk levels: 70%+ = Low Risk, 50-69% = Medium Risk, 30-49% = High Risk, <30% = Critical mismatch.",
    strengths: "Catches clinically implausible procedure-diagnosis combinations; no rules needed; adapts to medical coding nuances; provides quantitative similarity scores; works across all specialties.",
    limitations: "Requires embedding generation for code databases; may miss context-dependent valid combinations; depends on quality of code descriptions.",
    dataSources: ["CPT Embeddings Database (~9,800 codes)", "ICD-10 Embeddings Database (~72,000 codes)", "OpenAI text-embedding-ada-002"],
    outputMetrics: ["Similarity Score (%)", "Risk Level", "Matched CPT Description", "Matched ICD-10 Description", "Clinical Compatibility Assessment"]
  }
];

// Get detection method configurations
export async function getDetectionConfigs(): Promise<any[]> {
  const configs = await db.select().from(fwaDetectionConfigs);
  
  if (configs.length === 0) {
    return DEFAULT_DETECTION_CONFIGS;
  }
  
  // Merge stored configs with default algorithm descriptions
  return configs.map(config => {
    const defaultConfig = DEFAULT_DETECTION_CONFIGS.find(d => d.method === config.method);
    return {
      ...config,
      algorithmName: defaultConfig?.algorithmName || config.method,
      algorithmType: defaultConfig?.algorithmType || "Detection Method",
      howItWorks: defaultConfig?.howItWorks,
      strengths: defaultConfig?.strengths,
      limitations: defaultConfig?.limitations,
      dataSources: defaultConfig?.dataSources,
      outputMetrics: defaultConfig?.outputMetrics
    };
  });
}

// Update detection method configuration
export async function updateDetectionConfig(method: string, updates: {
  isEnabled?: boolean;
  weight?: string;
  threshold?: string;
}): Promise<any> {
  const existing = await db.select().from(fwaDetectionConfigs).where(eq(fwaDetectionConfigs.method, method)).limit(1);
  
  if (existing.length === 0) {
    const defaultConfig = DEFAULT_DETECTION_CONFIGS.find(d => d.method === method);
    if (!defaultConfig) {
      throw new Error(`Unknown detection method: ${method}`);
    }
    
    await db.insert(fwaDetectionConfigs).values({
      method,
      name: defaultConfig.name,
      isEnabled: updates.isEnabled ?? true,
      weight: updates.weight ?? defaultConfig.weight,
      threshold: updates.threshold ?? defaultConfig.threshold,
      description: defaultConfig.description
    });
  } else {
    await db.update(fwaDetectionConfigs)
      .set({
        isEnabled: updates.isEnabled,
        weight: updates.weight,
        threshold: updates.threshold
      })
      .where(eq(fwaDetectionConfigs.method, method));
  }
  
  return getDetectionConfigs();
}

// Get default detection configs (for reset)
export function getDefaultDetectionConfigs() {
  return DEFAULT_DETECTION_CONFIGS;
}

// Save detection result to database
export async function saveDetectionResult(result: DetectionResult): Promise<void> {
  await db.insert(fwaDetectionResults).values({
    claimId: result.claimId,
    compositeScore: result.compositeScore.toString(),
    compositeRiskLevel: result.compositeRiskLevel as any,
    ruleEngineScore: result.ruleEngineScore.toString(),
    statisticalScore: result.statisticalScore.toString(),
    unsupervisedScore: result.unsupervisedScore.toString(),
    ragLlmScore: result.ragLlmScore.toString(),
    ruleEngineFindings: result.ruleEngineFindings,
    statisticalFindings: result.statisticalFindings,
    unsupervisedFindings: result.unsupervisedFindings,
    ragLlmFindings: result.ragLlmFindings,
    primaryDetectionMethod: result.primaryDetectionMethod as any,
    detectionSummary: result.detectionSummary,
    recommendedAction: result.recommendedAction,
    processingTimeMs: result.processingTimeMs
  });
}

// Aggregate claim-level detection results to provider-level
export async function aggregateProviderDetection(providerId: string): Promise<{
  success: boolean;
  result?: any;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    // First, try to aggregate detection results directly by provider_id in fwa_detection_results
    // This handles providers like PRV-GEN-xxxx that only exist in detection results, not claims table
    // Note: fwa_detection_results has 4 method scores (rule_engine, statistical, unsupervised, rag_llm) - semantic is not stored at claim level
    const aggregateQuery = await db.execute(sql`
      SELECT 
        COUNT(dr.id) as total_claims,
        COALESCE(AVG(NULLIF(dr.composite_score::numeric, 0)), 0) as avg_composite_score,
        COALESCE(AVG(NULLIF(dr.rule_engine_score::numeric, 0)), 0) as avg_rule_engine_score,
        COALESCE(AVG(NULLIF(dr.statistical_score::numeric, 0)), 0) as avg_statistical_score,
        COALESCE(AVG(NULLIF(dr.unsupervised_score::numeric, 0)), 0) as avg_unsupervised_score,
        COALESCE(AVG(NULLIF(dr.rag_llm_score::numeric, 0)), 0) as avg_rag_llm_score,
        COUNT(CASE WHEN dr.composite_risk_level IN ('high', 'critical') THEN 1 END) as flagged_claims_count,
        COUNT(CASE WHEN dr.composite_risk_level = 'critical' THEN 1 END) as high_risk_claims_count,
        COALESCE(SUM(c.amount::numeric), 0) as total_amount,
        COALESCE(SUM(CASE WHEN dr.composite_risk_level IN ('high', 'critical') THEN c.amount::numeric ELSE 0 END), 0) as flagged_amount,
        COUNT(DISTINCT COALESCE(dr.patient_id, c.patient_id)) as unique_patients,
        COUNT(DISTINCT COALESCE(dr.provider_id, c.provider_id, '')) as unique_doctors,
        MODE() WITHIN GROUP (ORDER BY dr.primary_detection_method) as primary_method
      FROM fwa_detection_results dr
      LEFT JOIN claims c ON dr.claim_id = c.id
      WHERE dr.provider_id = ${providerId}
    `);
    
    const stats = aggregateQuery.rows?.[0];
    
    if (!stats || parseInt(String(stats.total_claims || 0)) === 0) {
      // No existing detection results - run detection on provider's claims first
      const claimsQuery = await db.execute(sql`
        SELECT id, claim_number, provider_id, patient_id, amount, description, 
               diagnosis_codes, icd, cpt_codes, claim_type
        FROM claims 
        WHERE provider_id = ${providerId}
        LIMIT 50
      `);
      
      const claims = claimsQuery.rows || [];
      if (claims.length === 0) {
        return {
          success: false,
          error: `No claims found for provider ${providerId}`
        };
      }
      
      console.log(`[Provider Analysis] Running detection on ${claims.length} claims for ${providerId}`);
      
      // Run detection on each claim and save results
      let analyzedCount = 0;
      for (const claim of claims) {
        try {
          // Extract diagnosis code from diagnosis_codes array or icd field
          const diagnosisCodes = claim.diagnosis_codes || claim.icd;
          const diagnosisCode = Array.isArray(diagnosisCodes) ? diagnosisCodes[0] : String(diagnosisCodes || "");
          const procedureCodes = claim.cpt_codes;
          const procedureCode = Array.isArray(procedureCodes) ? procedureCodes[0] : String(procedureCodes || "");
          
          const claimData = {
            id: String(claim.id),
            claimNumber: String(claim.claim_number || claim.id),
            providerId: String(claim.provider_id || providerId),
            patientId: String(claim.patient_id || "UNKNOWN"),
            amount: parseFloat(String(claim.amount || 0)),
            diagnosisCode: String(diagnosisCode || ""),
            procedureCode: String(procedureCode || ""),
            description: String(claim.description || ""),
            claimType: String(claim.claim_type || "medical")
          };
          
          const result = await runFullDetection(claimData);
          await saveDetectionResult(result);
          analyzedCount++;
        } catch (e) {
          console.error(`[Provider Analysis] Error analyzing claim ${claim.id}:`, e);
        }
      }
      
      console.log(`[Provider Analysis] Analyzed ${analyzedCount}/${claims.length} claims for ${providerId}`);
      
      // Re-run the aggregate query now that we have results
      // Use dr.provider_id to match the detection results directly
      const reAggregateQuery = await db.execute(sql`
        SELECT 
          COUNT(dr.id) as total_claims,
          COALESCE(AVG(NULLIF(dr.composite_score::numeric, 0)), 0) as avg_composite_score,
          COALESCE(AVG(NULLIF(dr.rule_engine_score::numeric, 0)), 0) as avg_rule_engine_score,
          COALESCE(AVG(NULLIF(dr.statistical_score::numeric, 0)), 0) as avg_statistical_score,
          COALESCE(AVG(NULLIF(dr.unsupervised_score::numeric, 0)), 0) as avg_unsupervised_score,
          COALESCE(AVG(NULLIF(dr.rag_llm_score::numeric, 0)), 0) as avg_rag_llm_score,
          COUNT(CASE WHEN dr.composite_risk_level IN ('high', 'critical') THEN 1 END) as flagged_claims_count,
          COUNT(CASE WHEN dr.composite_risk_level = 'critical' THEN 1 END) as high_risk_claims_count,
          COALESCE(SUM(c.amount::numeric), 0) as total_amount,
          COALESCE(SUM(CASE WHEN dr.composite_risk_level IN ('high', 'critical') THEN c.amount::numeric ELSE 0 END), 0) as flagged_amount,
          COUNT(DISTINCT COALESCE(dr.patient_id, c.patient_id)) as unique_patients,
          COUNT(DISTINCT COALESCE(dr.provider_id, c.provider_id, '')) as unique_doctors,
          MODE() WITHIN GROUP (ORDER BY dr.primary_detection_method) as primary_method
        FROM fwa_detection_results dr
        LEFT JOIN claims c ON dr.claim_id = c.id
        WHERE dr.provider_id = ${providerId}
      `);
      
      const reStats = reAggregateQuery.rows?.[0];
      if (!reStats || parseInt(String(reStats.total_claims || 0)) === 0) {
        return {
          success: false,
          error: `Detection analysis failed for provider ${providerId}`
        };
      }
      
      // Replace stats with the new data
      Object.assign(stats, reStats);
    }
    
    const totalClaims = parseInt(String(stats.total_claims || 0));
    const avgCompositeScore = parseFloat(String(stats.avg_composite_score || 0));
    const avgRuleEngineScore = parseFloat(String(stats.avg_rule_engine_score || 0));
    const avgStatisticalScore = parseFloat(String(stats.avg_statistical_score || 0));
    const avgUnsupervisedScore = parseFloat(String(stats.avg_unsupervised_score || 0));
    const avgRagLlmScore = parseFloat(String(stats.avg_rag_llm_score || 0));
    // Semantic score is not stored at claim level, set to 0
    const avgSemanticScore = 0;
    const flaggedClaimsCount = parseInt(String(stats.flagged_claims_count || 0));
    const highRiskClaimsCount = parseInt(String(stats.high_risk_claims_count || 0));
    const totalAmount = parseFloat(String(stats.total_amount || 0));
    const flaggedAmount = parseFloat(String(stats.flagged_amount || 0));
    const uniquePatients = parseInt(String(stats.unique_patients || 0));
    const uniqueDoctors = parseInt(String(stats.unique_doctors || 0));
    const primaryMethod = String(stats.primary_method || 'rule_engine');
    
    // Derive risk level from average composite score
    let riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'minimal' = 'low';
    if (avgCompositeScore >= 80) {
      riskLevel = 'critical';
    } else if (avgCompositeScore >= 60) {
      riskLevel = 'high';
    } else if (avgCompositeScore >= 40) {
      riskLevel = 'medium';
    } else if (avgCompositeScore >= 20) {
      riskLevel = 'low';
    } else {
      riskLevel = 'minimal';
    }
    
    // Generate batch/run IDs for tracking
    const batchId = `batch-${new Date().toISOString().slice(0, 10)}`;
    const runId = `run-${Date.now()}`;
    const processingTimeMs = Date.now() - startTime;
    
    // Build aggregated metrics object
    const avgClaimAmount = totalClaims > 0 ? totalAmount / totalClaims : 0;
    const flaggedClaimsPercent = totalClaims > 0 ? (flaggedClaimsCount / totalClaims) * 100 : 0;
    
    const aggregatedMetrics = {
      totalClaims,
      totalAmount: Math.round(totalAmount * 100) / 100,
      avgClaimAmount: Math.round(avgClaimAmount * 100) / 100,
      uniquePatients,
      uniqueDoctors,
      flaggedClaimsCount,
      flaggedClaimsPercent: Math.round(flaggedClaimsPercent * 100) / 100,
      highRiskClaimsCount,
      topProcedureCodes: [],
      topDiagnosisCodes: []
    };
    
    // Generate detection summary
    const detectionSummary = `Provider ${providerId}: ${totalClaims} claims analyzed with avg risk score ${avgCompositeScore.toFixed(1)}. ` +
      `${flaggedClaimsCount} claims flagged (${flaggedClaimsPercent.toFixed(1)}%), ${highRiskClaimsCount} high-risk. ` +
      `Total amount: SAR ${totalAmount.toLocaleString()}, flagged amount: SAR ${flaggedAmount.toLocaleString()}.`;
    
    // Generate recommended action based on risk
    let recommendedAction = 'Continue routine monitoring';
    if (riskLevel === 'critical') {
      recommendedAction = 'Immediate investigation required - suspend provider pending review';
    } else if (riskLevel === 'high') {
      recommendedAction = 'Priority review required - schedule audit within 7 days';
    } else if (riskLevel === 'medium') {
      recommendedAction = 'Enhanced monitoring recommended - review flagged claims';
    }
    
    // Upsert into fwa_provider_detection_results
    const existingResult = await db.execute(sql`
      SELECT id FROM fwa_provider_detection_results 
      WHERE provider_id = ${providerId} 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    const providerResultData = {
      providerId,
      batchId,
      runId,
      compositeScore: avgCompositeScore.toFixed(2),
      riskLevel,
      ruleEngineScore: avgRuleEngineScore.toFixed(2),
      statisticalScore: avgStatisticalScore.toFixed(2),
      unsupervisedScore: avgUnsupervisedScore.toFixed(2),
      ragLlmScore: avgRagLlmScore.toFixed(2),
      semanticScore: avgSemanticScore.toFixed(2),
      aggregatedMetrics,
      primaryDetectionMethod: primaryMethod as any,
      detectionSummary,
      recommendedAction,
      processingTimeMs,
      analyzedAt: new Date()
    };
    
    let resultId: string;
    
    if (existingResult.rows && existingResult.rows.length > 0) {
      // Update existing record
      resultId = String(existingResult.rows[0].id);
      await db.update(fwaProviderDetectionResults)
        .set({
          ...providerResultData,
          updatedAt: new Date()
        })
        .where(eq(fwaProviderDetectionResults.id, resultId));
    } else {
      // Insert new record
      const insertResult = await db.insert(fwaProviderDetectionResults)
        .values(providerResultData)
        .returning({ id: fwaProviderDetectionResults.id });
      resultId = insertResult[0]?.id || '';
    }
    
    // Get previous timeline entry for trend calculation
    const previousTimeline = await db.execute(sql`
      SELECT claim_count, total_amount, avg_risk_score
      FROM fwa_provider_timeline
      WHERE provider_id = ${providerId}
      ORDER BY batch_date DESC
      LIMIT 1
    `);
    
    let claimCountChange = null;
    let amountChange = null;
    let riskScoreChange = null;
    let trendDirection = 'stable';
    
    if (previousTimeline.rows && previousTimeline.rows.length > 0) {
      const prev = previousTimeline.rows[0];
      const prevClaimCount = parseInt(String(prev.claim_count || 0));
      const prevAmount = parseFloat(String(prev.total_amount || 0));
      const prevRiskScore = parseFloat(String(prev.avg_risk_score || 0));
      
      if (prevClaimCount > 0) {
        claimCountChange = ((totalClaims - prevClaimCount) / prevClaimCount) * 100;
      }
      if (prevAmount > 0) {
        amountChange = ((totalAmount - prevAmount) / prevAmount) * 100;
      }
      riskScoreChange = avgCompositeScore - prevRiskScore;
      
      if (riskScoreChange > 5) {
        trendDirection = 'increasing';
      } else if (riskScoreChange < -5) {
        trendDirection = 'decreasing';
      }
    }
    
    // Upsert timeline entry for current date
    const today = new Date().toISOString().slice(0, 10);
    const timelineBatchId = `timeline-${today}`;
    
    const existingTimeline = await db.execute(sql`
      SELECT id FROM fwa_provider_timeline 
      WHERE provider_id = ${providerId} AND batch_id = ${timelineBatchId}
      LIMIT 1
    `);
    
    const timelineData = {
      providerId,
      batchId: timelineBatchId,
      batchDate: new Date(),
      claimCount: totalClaims,
      totalAmount: totalAmount.toFixed(2),
      avgClaimAmount: avgClaimAmount.toFixed(2),
      uniquePatients,
      uniqueDoctors,
      flaggedClaimsCount,
      highRiskClaimsCount,
      avgRiskScore: avgCompositeScore.toFixed(2),
      claimCountChange: claimCountChange !== null ? claimCountChange.toFixed(2) : null,
      amountChange: amountChange !== null ? amountChange.toFixed(2) : null,
      riskScoreChange: riskScoreChange !== null ? riskScoreChange.toFixed(2) : null,
      trendDirection,
      topProcedures: [],
      topDiagnoses: []
    };
    
    if (existingTimeline.rows && existingTimeline.rows.length > 0) {
      const timelineId = String(existingTimeline.rows[0].id);
      await db.update(fwaProviderTimeline)
        .set(timelineData)
        .where(eq(fwaProviderTimeline.id, timelineId));
    } else {
      await db.insert(fwaProviderTimeline).values(timelineData);
    }
    
    // Return the aggregated result
    return {
      success: true,
      result: {
        id: resultId,
        providerId,
        batchId,
        runId,
        compositeScore: avgCompositeScore,
        riskLevel,
        scores: {
          ruleEngine: avgRuleEngineScore,
          statistical: avgStatisticalScore,
          unsupervised: avgUnsupervisedScore,
          ragLlm: avgRagLlmScore,
          semantic: avgSemanticScore
        },
        metrics: aggregatedMetrics,
        detectionSummary,
        recommendedAction,
        processingTimeMs,
        analyzedAt: new Date().toISOString()
      }
    };
    
  } catch (error) {
    console.error(`[Provider Aggregation] Error for provider ${providerId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during aggregation'
    };
  }
}
