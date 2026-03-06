import OpenAI from "openai";
import { db } from "../db";
import { 
  claims, fwaHighRiskProviders, fwaHighRiskPatients, fwaHighRiskDoctors,
  fwaRulesLibrary, clinicalPathwayRules, fwaRegulatoryDocs, 
  fwaMedicalGuidelines, providerComplaints
} from "@shared/schema";
import { eq, sql, desc, and, gte, lte, or, inArray } from "drizzle-orm";
import { generateEmbedding } from "./embedding-service";
import { searchTwitterForHealthcareProviders, TwitterMention } from "./grok-twitter-service";
import { 
  detectPreAuthViolations, 
  detectChronicAbusePatterns, 
  detectGeographicAnomalies, 
  detectSpecialtyMismatch,
  FWARuleResult 
} from "./enhanced-fwa-rules";

const openai = new OpenAI();

export interface RegulatorySignal {
  phaseId: number;
  phaseName: string;
  riskFlag: boolean;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidence: number;
  findings: string[];
  evidence: RegulatoryEvidence[];
  recommendedAction: "INVESTIGATE" | "AUDIT" | "WARN" | "MONITOR" | "ESCALATE" | "NONE";
  rationale: string;
}

export interface RegulatoryEvidence {
  source: string;
  sourceType: "regulation" | "clinical_pathway" | "medical_guideline" | "complaint" | "claim_history" | "online_listening" | "high_risk_entity";
  documentId?: string;
  title: string;
  excerpt: string;
  similarity?: number;
  relevance: "HIGH" | "MEDIUM" | "LOW";
}

export interface ClaimHistoryPattern {
  lookbackDays: number;
  claimCount: number;
  totalAmount: number;
  uniqueProviders: number;
  uniqueDiagnoses: string[];
  uniqueProcedures: string[];
  flaggedClaimCount: number;
  avgClaimAmount: number;
  frequencyPerWeek: number;
}

export interface BehavioralAnalysis {
  patientPatterns: {
    isHighRisk: boolean;
    riskScore: number;
    patterns: ClaimHistoryPattern[];
    anomalies: string[];
    linkedHighRiskEntities: string[];
  };
  providerPatterns: {
    isHighRisk: boolean;
    riskScore: number;
    flaggedClaimsRatio: number;
    avgDeviation: number;
    linkedHighRiskEntities: string[];
  };
  doctorPatterns?: {
    isHighRisk: boolean;
    riskScore: number;
    linkedHighRiskEntities: string[];
  };
}

export interface OnlineListeningAnalysis {
  sentimentScore: number;
  totalMentions: number;
  negativeMentions: TwitterMention[];
  criticalAlerts: TwitterMention[];
  topics: string[];
  requiresAction: boolean;
}

export interface RegulatoryOversightResult {
  claimId: string;
  analysisTimestamp: Date;
  phases: RegulatorySignal[];
  aggregatedScore: number;
  overallRiskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  topRecommendation: "INVESTIGATE" | "AUDIT" | "WARN" | "MONITOR" | "ESCALATE" | "NONE";
  evidenceSummary: RegulatoryEvidence[];
  behavioralAnalysis: BehavioralAnalysis;
  onlineListeningAnalysis?: OnlineListeningAnalysis;
  regulatoryViolations: string[];
  clinicalConcerns: string[];
  enforcementRecommendation: string;
  processingTimeMs: number;
}

const PHASE_WEIGHTS = {
  1: 1.5,
  2: 1.3,
  3: 1.2,
  4: 1.1,
  5: 1.0
};

const LOOKBACK_WINDOWS = [7, 14, 30, 90, 180] as const;

export async function runRegulatoryOversight(claim: any): Promise<RegulatoryOversightResult> {
  const startTime = Date.now();
  const phases: RegulatorySignal[] = [];
  const allEvidence: RegulatoryEvidence[] = [];
  
  const phase1 = await runPhase1RegulatoryCompliance(claim);
  phases.push(phase1);
  allEvidence.push(...phase1.evidence);
  
  const phase2 = await runPhase2ClinicalAppropriateness(claim);
  phases.push(phase2);
  allEvidence.push(...phase2.evidence);
  
  const behavioralAnalysis = await runPhase3BehavioralPatterns(claim);
  const phase3Signal = createPhase3Signal(behavioralAnalysis);
  phases.push(phase3Signal);
  allEvidence.push(...phase3Signal.evidence);
  
  const onlineListeningAnalysis = await runPhase4OnlineListening(claim);
  const complaintsAnalysis = await queryComplaintsForEntity(claim);
  const phase4Signal = createPhase4Signal(onlineListeningAnalysis, complaintsAnalysis);
  phases.push(phase4Signal);
  allEvidence.push(...phase4Signal.evidence);
  
  const phase5 = await runPhase5EvidenceSynthesis(claim, phases, allEvidence, behavioralAnalysis, onlineListeningAnalysis);
  phases.push(phase5);
  
  const aggregatedResult = aggregateRegulatorySignals(phases, allEvidence, behavioralAnalysis, onlineListeningAnalysis);
  
  return {
    claimId: claim.id || claim.claimNumber,
    analysisTimestamp: new Date(),
    phases,
    ...aggregatedResult,
    behavioralAnalysis,
    onlineListeningAnalysis,
    processingTimeMs: Date.now() - startTime
  };
}

async function runPhase1RegulatoryCompliance(claim: any): Promise<RegulatorySignal> {
  const evidence: RegulatoryEvidence[] = [];
  const findings: string[] = [];
  
  // Integrate enhanced pre-authorization violation detection
  const preAuthViolations = await detectPreAuthViolations(claim);
  
  // Convert FWA rule results to findings and evidence
  for (const violation of preAuthViolations) {
    if (violation.triggered) {
      findings.push(`Pre-auth violation: ${violation.ruleName}`);
      evidence.push({
        source: `FWA Rule ${violation.ruleId}`,
        sourceType: "regulation",
        title: violation.ruleName,
        excerpt: violation.evidence.join("; "),
        relevance: violation.severity === "CRITICAL" ? "HIGH" : 
                   violation.severity === "HIGH" ? "HIGH" : "MEDIUM"
      });
    }
  }
  
  // Additional pre-auth status checks
  if (claim.isPreAuthorizationRequired === true && claim.isPreAuthorized !== true) {
    findings.push(`Pre-auth bypass: Authorization required but not obtained for service ${claim.serviceCode || 'Unknown'}`);
  }
  
  // Pre-authorization ID validity check
  if (claim.preAuthorizationId) {
    // Check for suspicious pre-auth ID patterns (empty, invalid format)
    const preAuthId = String(claim.preAuthorizationId).trim();
    if (!preAuthId || preAuthId === 'null' || preAuthId === 'undefined' || preAuthId.length < 5) {
      findings.push(`Invalid pre-authorization ID: ${preAuthId || 'Empty'}`);
    }
    
    // Check if pre-auth status indicates denial or expiration
    if (claim.preAuthorizationStatus) {
      const invalidStatuses = ["denied", "rejected", "cancelled", "expired", "void"];
      if (invalidStatuses.some(s => claim.preAuthorizationStatus.toLowerCase().includes(s))) {
        findings.push(`Pre-auth status violation: Claim submitted with ${claim.preAuthorizationStatus} pre-authorization`);
        evidence.push({
          source: "Pre-Authorization Registry",
          sourceType: "regulation",
          title: "Invalid Pre-Authorization Status",
          excerpt: `Pre-authorization ID ${claim.preAuthorizationId} has status: ${claim.preAuthorizationStatus}`,
          relevance: "HIGH"
        });
      }
    }
  }
  
  // Check pre-auth ICD mismatch
  if (claim.preAuthorizationIcd10s && claim.icd) {
    const preAuthIcds = Array.isArray(claim.preAuthorizationIcd10s) 
      ? claim.preAuthorizationIcd10s 
      : [claim.preAuthorizationIcd10s];
    const claimIcd = claim.icd.split(".")[0];
    
    const matchFound = preAuthIcds.some((paIcd: string) => 
      paIcd && paIcd.startsWith(claimIcd.substring(0, 3))
    );
    
    if (!matchFound && preAuthIcds.length > 0) {
      findings.push(`Pre-auth diagnosis mismatch: Claim ICD ${claim.icd} differs from pre-auth ICDs ${preAuthIcds.join(", ")}`);
    }
  }
  
  const queryText = buildRegulatoryQuery(claim);
  const queryEmbedding = await generateEmbedding(queryText);
  const embeddingStr = JSON.stringify(queryEmbedding);
  
  const regulatoryDocs = await db.execute(sql`
    SELECT id, regulation_id, title, content, category, jurisdiction,
           1 - (embedding <=> ${embeddingStr}::vector) as similarity
    FROM fwa_regulatory_docs
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT 5
  `);
  
  for (const doc of regulatoryDocs.rows) {
    if ((doc.similarity as number) >= 0.3) {
      evidence.push({
        source: `CHI Regulation ${doc.regulation_id}`,
        sourceType: "regulation",
        documentId: doc.id as string,
        title: doc.title as string,
        excerpt: (doc.content as string)?.slice(0, 500) || "",
        similarity: doc.similarity as number,
        relevance: (doc.similarity as number) >= 0.7 ? "HIGH" : (doc.similarity as number) >= 0.5 ? "MEDIUM" : "LOW"
      });
    }
  }
  
  const complianceResult = await analyzeRegulatoryCompliance(claim, evidence);
  
  if (complianceResult.violations.length > 0) {
    findings.push(...complianceResult.violations.map(v => `Regulatory violation: ${v}`));
  }
  
  // Calculate severity based on combined findings including pre-auth violations
  const criticalPreAuthCount = preAuthViolations.filter(v => v.triggered && v.severity === "CRITICAL").length;
  const totalViolations = complianceResult.violations.length + preAuthViolations.filter(v => v.triggered).length;
  
  const hasViolations = totalViolations > 0;
  const severity = criticalPreAuthCount > 0 || totalViolations >= 3 ? "CRITICAL" : 
                   totalViolations >= 2 ? "HIGH" :
                   totalViolations >= 1 ? "MEDIUM" : "LOW";
  
  // Calculate confidence incorporating pre-auth detection confidence
  const avgPreAuthConfidence = preAuthViolations.length > 0 
    ? preAuthViolations.reduce((sum, v) => sum + v.confidence, 0) / preAuthViolations.length 
    : 0.5;
  const combinedConfidence = preAuthViolations.length > 0 
    ? (complianceResult.confidence + avgPreAuthConfidence) / 2 
    : complianceResult.confidence;
  
  return {
    phaseId: 1,
    phaseName: "Regulatory Compliance",
    riskFlag: hasViolations,
    severity,
    confidence: combinedConfidence,
    findings,
    evidence,
    recommendedAction: hasViolations ? (severity === "CRITICAL" ? "ESCALATE" : "INVESTIGATE") : "NONE",
    rationale: preAuthViolations.filter(v => v.triggered).length > 0 
      ? `Pre-authorization violations detected: ${preAuthViolations.filter(v => v.triggered).map(v => v.ruleName).join(", ")}. ${complianceResult.rationale}`
      : complianceResult.rationale
  };
}

async function runPhase2ClinicalAppropriateness(claim: any): Promise<RegulatorySignal> {
  const evidence: RegulatoryEvidence[] = [];
  const findings: string[] = [];
  
  // Integrate enhanced specialty mismatch detection
  const specialtyMismatches = await detectSpecialtyMismatch(claim);
  
  // Convert specialty mismatch results to findings and evidence
  for (const mismatch of specialtyMismatches) {
    if (mismatch.triggered) {
      findings.push(`Specialty concern: ${mismatch.ruleName}`);
      evidence.push({
        source: `FWA Rule ${mismatch.ruleId}`,
        sourceType: "clinical_pathway",
        title: mismatch.ruleName,
        excerpt: mismatch.evidence.join("; "),
        relevance: mismatch.severity === "CRITICAL" || mismatch.severity === "HIGH" ? "HIGH" : "MEDIUM"
      });
    }
  }
  
  // Specialty-procedure validation using specialtyCode
  if (claim.specialtyCode && claim.serviceCode) {
    const specialtyProcedureCompatibility = validateSpecialtyProcedure(claim.specialtyCode, claim.serviceCode);
    if (!specialtyProcedureCompatibility.isValid) {
      findings.push(`Specialty-procedure mismatch: ${specialtyProcedureCompatibility.reason}`);
      evidence.push({
        source: "Specialty Validation Engine",
        sourceType: "clinical_pathway",
        title: "Specialty-Procedure Incompatibility",
        excerpt: `Specialty code ${claim.specialtyCode} may not be appropriate for service ${claim.serviceCode}. ${specialtyProcedureCompatibility.reason}`,
        relevance: "HIGH"
      });
    }
  }
  
  // Comorbidity analysis using secondaryIcds field
  if (claim.secondaryIcds && Array.isArray(claim.secondaryIcds) && claim.secondaryIcds.length > 0) {
    const comorbidityAnalysis = analyzeComorbidities(claim.icd, claim.secondaryIcds, claim);
    
    if (comorbidityAnalysis.concerns.length > 0) {
      findings.push(...comorbidityAnalysis.concerns.map(c => `Comorbidity concern: ${c}`));
    }
    
    if (comorbidityAnalysis.hasHighComplexity) {
      evidence.push({
        source: "Comorbidity Analysis",
        sourceType: "clinical_pathway",
        title: "High Comorbidity Complexity",
        excerpt: `Patient has ${claim.secondaryIcds.length} secondary diagnoses: ${claim.secondaryIcds.slice(0, 5).join(", ")}${claim.secondaryIcds.length > 5 ? '...' : ''}`,
        relevance: "MEDIUM"
      });
    }
    
    // Check for unusual secondary diagnosis combinations
    if (comorbidityAnalysis.suspiciousPatterns.length > 0) {
      for (const pattern of comorbidityAnalysis.suspiciousPatterns) {
        findings.push(`Suspicious comorbidity pattern: ${pattern}`);
      }
    }
  }
  
  const queryText = buildClinicalQuery(claim);
  const queryEmbedding = await generateEmbedding(queryText);
  const embeddingStr = JSON.stringify(queryEmbedding);
  
  const [clinicalPathways, medicalGuidelines] = await Promise.all([
    db.execute(sql`
      SELECT id, rule_code, title, description, category, specialty, max_length_of_stay,
             1 - (embedding <=> ${embeddingStr}::vector) as similarity
      FROM clinical_pathway_rules
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT 5
    `),
    db.execute(sql`
      SELECT id, title, content, category, source_authority, specialty_area,
             1 - (embedding <=> ${embeddingStr}::vector) as similarity
      FROM fwa_medical_guidelines
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT 5
    `)
  ]);
  
  for (const pathway of clinicalPathways.rows) {
    if ((pathway.similarity as number) >= 0.3) {
      evidence.push({
        source: `Clinical Pathway ${pathway.rule_code}`,
        sourceType: "clinical_pathway",
        documentId: pathway.id as string,
        title: pathway.title as string,
        excerpt: (pathway.description as string)?.slice(0, 500) || "",
        similarity: pathway.similarity as number,
        relevance: (pathway.similarity as number) >= 0.7 ? "HIGH" : (pathway.similarity as number) >= 0.5 ? "MEDIUM" : "LOW"
      });
    }
  }
  
  for (const guideline of medicalGuidelines.rows) {
    if ((guideline.similarity as number) >= 0.3) {
      evidence.push({
        source: `Medical Guideline: ${guideline.source_authority}`,
        sourceType: "medical_guideline",
        documentId: guideline.id as string,
        title: guideline.title as string,
        excerpt: (guideline.content as string)?.slice(0, 500) || "",
        similarity: guideline.similarity as number,
        relevance: (guideline.similarity as number) >= 0.7 ? "HIGH" : (guideline.similarity as number) >= 0.5 ? "MEDIUM" : "LOW"
      });
    }
  }
  
  const clinicalResult = await analyzeClinicalAppropriateness(claim, evidence);
  
  if (clinicalResult.concerns.length > 0) {
    findings.push(...clinicalResult.concerns.map(c => `Clinical concern: ${c}`));
  }
  
  // Calculate severity incorporating specialty mismatch and comorbidity findings
  const specialtyMismatchCount = specialtyMismatches.filter(m => m.triggered).length;
  const totalConcerns = clinicalResult.concerns.length + specialtyMismatchCount + findings.filter(f => f.includes("Comorbidity")).length;
  
  const hasConcerns = totalConcerns > 0 || clinicalResult.inappropriatenessScore >= 0.4;
  
  // Adjust inappropriateness score based on specialty mismatches
  const adjustedScore = Math.min(1, clinicalResult.inappropriatenessScore + (specialtyMismatchCount * 0.15));
  
  const severity = adjustedScore >= 0.8 ? "CRITICAL" :
                   adjustedScore >= 0.6 ? "HIGH" :
                   adjustedScore >= 0.4 ? "MEDIUM" : "LOW";
  
  // Calculate combined confidence
  const avgSpecialtyConfidence = specialtyMismatches.length > 0 
    ? specialtyMismatches.reduce((sum, m) => sum + m.confidence, 0) / specialtyMismatches.length 
    : 0.5;
  const combinedConfidence = specialtyMismatches.length > 0 
    ? (clinicalResult.confidence + avgSpecialtyConfidence) / 2 
    : clinicalResult.confidence;
  
  return {
    phaseId: 2,
    phaseName: "Clinical Appropriateness",
    riskFlag: hasConcerns,
    severity,
    confidence: combinedConfidence,
    findings,
    evidence,
    recommendedAction: hasConcerns ? (severity === "CRITICAL" ? "ESCALATE" : "AUDIT") : "NONE",
    rationale: specialtyMismatchCount > 0 
      ? `Specialty validation detected ${specialtyMismatchCount} concerns. ${clinicalResult.rationale}`
      : clinicalResult.rationale
  };
}

// Helper function to validate specialty-procedure compatibility
function validateSpecialtyProcedure(specialtyCode: string, serviceCode: string): { isValid: boolean; reason: string } {
  // Specialty code to allowed procedure prefix mappings
  const specialtyProcedureMap: Record<string, string[]> = {
    "01": ["99", "00"], // General Practice - Evaluation codes
    "02": ["33", "92", "93"], // Cardiology
    "03": ["27", "28", "29", "23", "24", "25", "26"], // Orthopedics
    "04": ["10", "11", "17"], // Dermatology
    "05": ["65", "66", "67", "68"], // Ophthalmology
    "06": ["43", "44", "45", "46", "47"], // Gastroenterology
    "07": ["61", "62", "63", "64"], // Neurology
    "08": ["90", "96"], // Psychiatry
    "09": ["70", "71", "72", "73", "74", "75", "76", "77"], // Radiology
    "10": ["57", "58", "59"], // OB-GYN
    "11": ["50", "51", "52", "53", "54"], // Urology
    "12": ["69"], // ENT
    "13": ["19", "20", "21", "22"], // General Surgery
  };
  
  const servicePrefix = serviceCode.substring(0, 2);
  const allowedPrefixes = specialtyProcedureMap[specialtyCode];
  
  if (!allowedPrefixes) {
    return { isValid: true, reason: "Specialty code not in validation registry" };
  }
  
  // General evaluation codes (99xxx) are allowed for all specialties
  if (servicePrefix === "99") {
    return { isValid: true, reason: "Evaluation and management code valid for all specialties" };
  }
  
  if (!allowedPrefixes.includes(servicePrefix)) {
    return { 
      isValid: false, 
      reason: `Service code ${serviceCode} (prefix ${servicePrefix}) is not typical for specialty ${specialtyCode}` 
    };
  }
  
  return { isValid: true, reason: "Specialty-procedure combination is valid" };
}

// Helper function to analyze comorbidities for suspicious patterns
function analyzeComorbidities(
  primaryIcd: string | null | undefined, 
  secondaryIcds: string[], 
  claim: any
): { concerns: string[]; hasHighComplexity: boolean; suspiciousPatterns: string[] } {
  const concerns: string[] = [];
  const suspiciousPatterns: string[] = [];
  
  // Check for unusually high number of secondary diagnoses
  const hasHighComplexity = secondaryIcds.length >= 10;
  if (hasHighComplexity) {
    concerns.push(`Unusually high secondary diagnosis count: ${secondaryIcds.length} diagnoses`);
  }
  
  // Check for duplicate ICD codes
  const uniqueIcds = new Set(secondaryIcds.map(icd => icd.split(".")[0]));
  if (uniqueIcds.size < secondaryIcds.length * 0.8) {
    suspiciousPatterns.push("Multiple similar secondary diagnoses - potential upcoding");
  }
  
  // Check for incompatible diagnosis combinations
  const maleOnlyIcds = ["N40", "N41", "N42", "N43", "N44", "N45", "N46", "N47", "N48", "N49", "N50", "N51"];
  const femaleOnlyIcds = ["N70", "N71", "N72", "N73", "N74", "N75", "N76", "N77", "N80", "N81", "N82", "N83", "N84", "N85", "N86", "N87", "N88", "N89", "N90", "N91", "N92", "N93", "N94", "N95", "N96", "N97", "O"];
  
  const allIcds = [primaryIcd, ...secondaryIcds].filter(Boolean) as string[];
  const icdPrefixes = allIcds.map(icd => icd.split(".")[0]);
  
  const hasMaleCode = icdPrefixes.some(p => maleOnlyIcds.some(m => p.startsWith(m)));
  const hasFemaleCode = icdPrefixes.some(p => femaleOnlyIcds.some(f => p.startsWith(f)));
  
  if (hasMaleCode && hasFemaleCode) {
    suspiciousPatterns.push("Incompatible gender-specific diagnosis codes detected");
  }
  
  // Check for pregnancy codes with non-pregnancy age
  const hasPregnancyCode = icdPrefixes.some(p => p.startsWith("O") || p.startsWith("Z33") || p.startsWith("Z34"));
  if (hasPregnancyCode && claim.dateOfBirth) {
    const birthDate = new Date(claim.dateOfBirth);
    const claimDate = new Date(claim.serviceDate || claim.registrationDate);
    const age = Math.floor((claimDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
    
    if (age < 12 || age > 55) {
      suspiciousPatterns.push(`Pregnancy diagnosis with atypical age: ${age} years`);
    }
  }
  
  // Check for chronic condition code counts
  const chronicPrefixes = ["E10", "E11", "I10", "J44", "J45", "M05", "M06", "M15", "M16", "M17"];
  const chronicCount = icdPrefixes.filter(p => chronicPrefixes.some(c => p.startsWith(c))).length;
  
  if (chronicCount >= 5) {
    concerns.push(`High chronic condition load: ${chronicCount} chronic diagnosis codes`);
  }
  
  return { concerns, hasHighComplexity, suspiciousPatterns };
}

// Extended interface for enhanced behavioral analysis
export interface EnhancedBehavioralAnalysis extends BehavioralAnalysis {
  chronicAbusePatterns: FWARuleResult[];
  geographicAnomalies: FWARuleResult[];
  policyFlagFindings: string[];
  waitingPeriodViolations: string[];
}

async function runPhase3BehavioralPatterns(claim: any): Promise<EnhancedBehavioralAnalysis> {
  const patientId = claim.patientId || claim.insuredId;
  const providerId = claim.providerId;
  const doctorId = claim.doctorId || claim.attendingPhysicianId;
  
  // Run base behavioral analysis along with enhanced FWA detection
  const [patientPatterns, providerPatterns, chronicAbusePatterns, geographicAnomalies] = await Promise.all([
    analyzePatientBehavior(patientId, claim),
    analyzeProviderBehavior(providerId, claim),
    detectChronicAbusePatterns(claim),
    detectGeographicAnomalies(claim)
  ]);
  
  const doctorPatterns = doctorId ? await analyzeDoctorBehavior(doctorId) : undefined;
  
  // Analyze policy flags (chronicFlag, preExistingFlag, maternityFlag, newbornFlag)
  const policyFlagFindings = analyzePolicyFlags(claim);
  
  // Check for waiting period violations
  const waitingPeriodViolations = analyzeWaitingPeriodViolations(claim);
  
  // Add chronic abuse and geographic findings to patient anomalies
  for (const pattern of chronicAbusePatterns) {
    if (pattern.triggered) {
      patientPatterns.anomalies.push(`${pattern.ruleCategory}: ${pattern.ruleName}`);
    }
  }
  
  for (const anomaly of geographicAnomalies) {
    if (anomaly.triggered) {
      patientPatterns.anomalies.push(`Geographic: ${anomaly.ruleName}`);
    }
  }
  
  // Add policy flag violations to anomalies
  patientPatterns.anomalies.push(...policyFlagFindings);
  patientPatterns.anomalies.push(...waitingPeriodViolations);
  
  // Recalculate risk based on enhanced findings
  const enhancedRiskScore = calculateEnhancedRisk(
    patientPatterns.riskScore,
    chronicAbusePatterns,
    geographicAnomalies,
    policyFlagFindings,
    waitingPeriodViolations
  );
  
  patientPatterns.riskScore = enhancedRiskScore;
  patientPatterns.isHighRisk = enhancedRiskScore >= 50 || patientPatterns.isHighRisk;
  
  return {
    patientPatterns,
    providerPatterns,
    doctorPatterns,
    chronicAbusePatterns,
    geographicAnomalies,
    policyFlagFindings,
    waitingPeriodViolations
  };
}

// Analyze policy flags for violations
function analyzePolicyFlags(claim: any): string[] {
  const findings: string[] = [];
  
  // Check chronicFlag patterns
  if (claim.chronicFlag === true) {
    // Chronic claims should have certain characteristics
    if (!claim.icd) {
      findings.push("Chronic flag set but no diagnosis code provided");
    }
  }
  
  // Check preExistingFlag
  if (claim.preExistingFlag === true) {
    findings.push("Pre-existing condition flagged - verify waiting period compliance");
  }
  
  // Check maternityFlag for gender consistency
  if (claim.maternityFlag === true) {
    if (claim.gender && claim.gender.toLowerCase() === "male") {
      findings.push("CRITICAL: Maternity flag set for male patient - data integrity issue");
    }
  }
  
  // Check newbornFlag for age consistency
  if (claim.newbornFlag === true && claim.dateOfBirth) {
    const birthDate = new Date(claim.dateOfBirth);
    const claimDate = new Date(claim.serviceDate || claim.registrationDate);
    const ageInDays = Math.floor((claimDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (ageInDays > 365) {
      findings.push(`Newborn flag set but patient age is ${Math.floor(ageInDays / 365)} years`);
    }
  }
  
  // Check for multiple conflicting flags
  const flagsSet = [claim.chronicFlag, claim.preExistingFlag, claim.maternityFlag, claim.newbornFlag].filter(Boolean).length;
  if (flagsSet >= 3) {
    findings.push(`Multiple policy flags set (${flagsSet}) - verify data accuracy`);
  }
  
  return findings;
}

// Analyze waiting period violations
function analyzeWaitingPeriodViolations(claim: any): string[] {
  const violations: string[] = [];
  
  if (!claim.policyEffectiveDate) {
    return violations;
  }
  
  const policyStart = new Date(claim.policyEffectiveDate);
  const claimDate = new Date(claim.serviceDate || claim.registrationDate);
  const daysSincePolicyStart = Math.floor((claimDate.getTime() - policyStart.getTime()) / (1000 * 60 * 60 * 24));
  
  // Standard waiting period is 30 days for regular claims
  if (daysSincePolicyStart < 0) {
    violations.push(`CRITICAL: Service date ${claimDate.toISOString().split("T")[0]} before policy effective date ${policyStart.toISOString().split("T")[0]}`);
  } else if (daysSincePolicyStart < 30) {
    violations.push(`Claim within initial waiting period: ${daysSincePolicyStart} days since policy start`);
  }
  
  // Pre-existing conditions have longer waiting periods (typically 180 days)
  if (claim.preExistingFlag === true && daysSincePolicyStart < 180) {
    violations.push(`Pre-existing condition claim within 180-day waiting period: ${daysSincePolicyStart} days since policy start`);
  }
  
  // Maternity typically has 9-12 month waiting period
  if (claim.maternityFlag === true && daysSincePolicyStart < 270) {
    violations.push(`Maternity claim within 270-day waiting period: ${daysSincePolicyStart} days since policy start`);
  }
  
  // Check policy expiry
  if (claim.policyExpiryDate) {
    const policyEnd = new Date(claim.policyExpiryDate);
    if (claimDate > policyEnd) {
      violations.push(`CRITICAL: Service date after policy expiry date ${policyEnd.toISOString().split("T")[0]}`);
    }
  }
  
  return violations;
}

// Calculate enhanced risk score incorporating all new detection results
function calculateEnhancedRisk(
  baseRiskScore: number,
  chronicAbusePatterns: FWARuleResult[],
  geographicAnomalies: FWARuleResult[],
  policyFlagFindings: string[],
  waitingPeriodViolations: string[]
): number {
  let score = baseRiskScore;
  
  // Add points for chronic abuse patterns
  for (const pattern of chronicAbusePatterns.filter(p => p.triggered)) {
    score += pattern.severity === "CRITICAL" ? 25 : pattern.severity === "HIGH" ? 15 : 10;
  }
  
  // Add points for geographic anomalies
  for (const anomaly of geographicAnomalies.filter(a => a.triggered)) {
    score += anomaly.severity === "CRITICAL" ? 25 : anomaly.severity === "HIGH" ? 15 : 10;
  }
  
  // Add points for policy flag issues
  score += policyFlagFindings.filter(f => f.includes("CRITICAL")).length * 20;
  score += policyFlagFindings.filter(f => !f.includes("CRITICAL")).length * 5;
  
  // Add points for waiting period violations
  score += waitingPeriodViolations.filter(v => v.includes("CRITICAL")).length * 25;
  score += waitingPeriodViolations.filter(v => !v.includes("CRITICAL")).length * 10;
  
  return Math.min(100, score);
}

async function analyzePatientBehavior(patientId: string, currentClaim: any): Promise<BehavioralAnalysis["patientPatterns"]> {
  if (!patientId) {
    return {
      isHighRisk: false,
      riskScore: 0,
      patterns: [],
      anomalies: [],
      linkedHighRiskEntities: []
    };
  }
  
  const highRiskPatient = await db.select().from(fwaHighRiskPatients)
    .where(eq(fwaHighRiskPatients.patientId, patientId))
    .limit(1);
  
  const patterns: ClaimHistoryPattern[] = [];
  const anomalies: string[] = [];
  
  for (const days of LOOKBACK_WINDOWS) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const historyResult = await db.execute(sql`
      SELECT 
        COUNT(*)::int as claim_count,
        COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_amount,
        COUNT(DISTINCT provider_id) as unique_providers,
        ARRAY_AGG(DISTINCT primary_diagnosis) FILTER (WHERE primary_diagnosis IS NOT NULL) as diagnoses,
        ARRAY_AGG(DISTINCT cpt_codes[1]) FILTER (WHERE cpt_codes IS NOT NULL AND array_length(cpt_codes, 1) > 0) as procedures,
        COUNT(*) FILTER (WHERE flagged = true)::int as flagged_count,
        COALESCE(AVG(CAST(amount AS DECIMAL)), 0) as avg_amount
      FROM claims_v2
      WHERE member_id = ${patientId}
        AND registration_date >= ${cutoffDate}
    `);

    const row = historyResult.rows[0];
    if (row) {
      const pattern: ClaimHistoryPattern = {
        lookbackDays: days,
        claimCount: Number(row.claim_count) || 0,
        totalAmount: Number(row.total_amount) || 0,
        uniqueProviders: Number(row.unique_providers) || 0,
        uniqueDiagnoses: (row.diagnoses as string[]) || [],
        uniqueProcedures: (row.procedures as string[]) || [],
        flaggedClaimCount: Number(row.flagged_count) || 0,
        avgClaimAmount: Number(row.avg_amount) || 0,
        frequencyPerWeek: (Number(row.claim_count) || 0) / (days / 7)
      };
      patterns.push(pattern);
      
      if (days <= 30 && pattern.uniqueProviders >= 5) {
        anomalies.push(`Provider shopping: ${pattern.uniqueProviders} different providers in ${days} days`);
      }
      if (days <= 14 && pattern.claimCount >= 10) {
        anomalies.push(`High frequency: ${pattern.claimCount} claims in ${days} days`);
      }
      if (pattern.flaggedClaimCount > 0 && pattern.flaggedClaimCount / pattern.claimCount >= 0.3) {
        anomalies.push(`High flagged ratio: ${Math.round((pattern.flaggedClaimCount / pattern.claimCount) * 100)}% of claims flagged`);
      }
    }
  }
  
  const linkedProviders = await db.execute(sql`
    SELECT DISTINCT c.provider_id, hrp.provider_name, hrp.risk_score
    FROM claims_v2 c
    JOIN fwa_high_risk_providers hrp ON c.provider_id = hrp.provider_id
    WHERE c.member_id = ${patientId}
      AND hrp.risk_level IN ('high', 'critical')
  `);
  
  const linkedHighRiskEntities = linkedProviders.rows.map(r => 
    `Provider: ${r.provider_name} (Risk: ${r.risk_score})`
  );
  
  const isHighRisk = highRiskPatient.length > 0 || anomalies.length >= 2;
  const riskScore = highRiskPatient[0]?.riskScore 
    ? Number(highRiskPatient[0].riskScore)
    : Math.min(100, anomalies.length * 25);
  
  return {
    isHighRisk,
    riskScore,
    patterns,
    anomalies,
    linkedHighRiskEntities
  };
}

async function analyzeProviderBehavior(providerId: string, currentClaim: any): Promise<BehavioralAnalysis["providerPatterns"]> {
  if (!providerId) {
    return {
      isHighRisk: false,
      riskScore: 0,
      flaggedClaimsRatio: 0,
      avgDeviation: 0,
      linkedHighRiskEntities: []
    };
  }
  
  const highRiskProvider = await db.select().from(fwaHighRiskProviders)
    .where(eq(fwaHighRiskProviders.providerId, providerId))
    .limit(1);
  
  const providerStats = await db.execute(sql`
    SELECT 
      COUNT(*)::int as total_claims,
      COUNT(*) FILTER (WHERE flagged = true)::int as flagged_claims,
      COALESCE(AVG(CAST(amount AS DECIMAL)), 0) as avg_amount,
      COALESCE(STDDEV(CAST(amount AS DECIMAL)), 0) as stddev_amount
    FROM claims_v2
    WHERE provider_id = ${providerId}
  `);

  const stats = providerStats.rows[0];
  const totalClaims = Number(stats?.total_claims) || 0;
  const flaggedClaims = Number(stats?.flagged_claims) || 0;
  const avgAmount = Number(stats?.avg_amount) || 0;
  const stddevAmount = Number(stats?.stddev_amount) || 1;
  
  const flaggedClaimsRatio = totalClaims > 0 ? flaggedClaims / totalClaims : 0;
  const claimAmount = Number(currentClaim.amount) || 0;
  const avgDeviation = stddevAmount > 0 ? (claimAmount - avgAmount) / stddevAmount : 0;
  
  const linkedPatients = await db.execute(sql`
    SELECT DISTINCT c.member_id, hrp.patient_name, hrp.risk_score
    FROM claims_v2 c
    JOIN fwa_high_risk_patients hrp ON c.member_id = hrp.patient_id
    WHERE c.provider_id = ${providerId}
      AND hrp.risk_level IN ('high', 'critical')
    LIMIT 10
  `);
  
  const linkedHighRiskEntities = linkedPatients.rows.map(r => 
    `Patient: ${r.patient_name} (Risk: ${r.risk_score})`
  );
  
  const isHighRisk = highRiskProvider.length > 0 || flaggedClaimsRatio >= 0.2;
  const riskScore = highRiskProvider[0]?.riskScore 
    ? Number(highRiskProvider[0].riskScore)
    : Math.min(100, flaggedClaimsRatio * 200);
  
  return {
    isHighRisk,
    riskScore,
    flaggedClaimsRatio,
    avgDeviation,
    linkedHighRiskEntities
  };
}

async function analyzeDoctorBehavior(doctorId: string): Promise<BehavioralAnalysis["doctorPatterns"]> {
  const highRiskDoctor = await db.select().from(fwaHighRiskDoctors)
    .where(eq(fwaHighRiskDoctors.doctorId, doctorId))
    .limit(1);
  
  const linkedProviders = await db.execute(sql`
    SELECT DISTINCT hrp.provider_id, hrp.provider_name, hrp.risk_score
    FROM fwa_high_risk_providers hrp
    WHERE hrp.provider_id IN (
      SELECT DISTINCT provider_id FROM claims_v2
      WHERE id IN (SELECT claim_id FROM fwa_detection_results WHERE provider_id = ${doctorId})
    )
    AND hrp.risk_level IN ('high', 'critical')
    LIMIT 5
  `);
  
  return {
    isHighRisk: highRiskDoctor.length > 0,
    riskScore: highRiskDoctor[0]?.riskScore ? Number(highRiskDoctor[0].riskScore) : 0,
    linkedHighRiskEntities: linkedProviders.rows.map(r => `Provider: ${r.provider_name}`)
  };
}

async function runPhase4OnlineListening(claim: any): Promise<OnlineListeningAnalysis | undefined> {
  try {
    const providerName = claim.providerName || claim.hospital;
    if (!providerName) {
      return undefined;
    }
    
    const keywords = [providerName];
    if (claim.patientId) {
      keywords.push("complaint", "شكوى");
    }
    
    const twitterResult = await searchTwitterForHealthcareProviders(keywords, [providerName]);
    
    const negativeMentions = twitterResult.mentions.filter(m => 
      m.sentiment === "negative" || m.sentiment === "very_negative"
    );
    const criticalAlerts = twitterResult.mentions.filter(m => 
      m.alertLevel === "critical" || m.requiresAction
    );
    
    const sentimentSum = twitterResult.mentions.reduce((sum, m) => sum + m.sentimentScore, 0);
    const avgSentiment = twitterResult.mentions.length > 0 
      ? sentimentSum / twitterResult.mentions.length 
      : 0;
    
    const allTopics = twitterResult.mentions.flatMap(m => m.topics);
    const uniqueTopics = Array.from(new Set(allTopics));
    
    return {
      sentimentScore: avgSentiment,
      totalMentions: twitterResult.totalFound,
      negativeMentions,
      criticalAlerts,
      topics: uniqueTopics,
      requiresAction: criticalAlerts.length > 0
    };
  } catch (error) {
    console.error("Online listening failed:", error);
    return undefined;
  }
}

async function queryComplaintsForEntity(claim: any): Promise<RegulatoryEvidence[]> {
  const evidence: RegulatoryEvidence[] = [];
  const providerName = claim.providerName || claim.hospital;
  
  if (!providerName) return evidence;
  
  const complaints = await db.execute(sql`
    SELECT id, complaint_number, provider_name, description, category, severity, source, status
    FROM provider_complaints
    WHERE LOWER(provider_name) LIKE ${`%${providerName.toLowerCase()}%`}
       OR provider_id = ${claim.providerId || ''}
    ORDER BY created_at DESC
    LIMIT 10
  `);
  
  for (const complaint of complaints.rows) {
    evidence.push({
      source: `Complaint ${complaint.complaint_number}`,
      sourceType: "complaint",
      documentId: complaint.id as string,
      title: `${complaint.category} - ${complaint.severity}`,
      excerpt: (complaint.description as string)?.slice(0, 500) || "",
      relevance: complaint.severity === "critical" ? "HIGH" : 
                 complaint.severity === "high" ? "MEDIUM" : "LOW"
    });
  }
  
  return evidence;
}

function createPhase3Signal(analysis: EnhancedBehavioralAnalysis): RegulatorySignal {
  const evidence: RegulatoryEvidence[] = [];
  const findings: string[] = [];
  
  if (analysis.patientPatterns.anomalies.length > 0) {
    findings.push(...analysis.patientPatterns.anomalies);
  }
  
  if (analysis.patientPatterns.linkedHighRiskEntities.length > 0) {
    findings.push(`Patient linked to ${analysis.patientPatterns.linkedHighRiskEntities.length} high-risk entities`);
    evidence.push({
      source: "High-Risk Entity Registry",
      sourceType: "high_risk_entity",
      title: "Linked High-Risk Providers",
      excerpt: analysis.patientPatterns.linkedHighRiskEntities.join("; "),
      relevance: "HIGH"
    });
  }
  
  if (analysis.providerPatterns.isHighRisk) {
    findings.push(`Provider flagged as high-risk (score: ${analysis.providerPatterns.riskScore})`);
  }
  
  if (analysis.providerPatterns.flaggedClaimsRatio >= 0.2) {
    findings.push(`Provider has ${Math.round(analysis.providerPatterns.flaggedClaimsRatio * 100)}% flagged claims ratio`);
  }
  
  if (Math.abs(analysis.providerPatterns.avgDeviation) >= 2) {
    findings.push(`Claim amount ${analysis.providerPatterns.avgDeviation > 0 ? 'above' : 'below'} provider average by ${Math.abs(analysis.providerPatterns.avgDeviation).toFixed(1)} std deviations`);
  }
  
  // Add evidence for chronic abuse patterns
  for (const pattern of analysis.chronicAbusePatterns) {
    if (pattern.triggered) {
      evidence.push({
        source: `FWA Rule ${pattern.ruleId}`,
        sourceType: "high_risk_entity",
        title: pattern.ruleName,
        excerpt: pattern.evidence.join("; "),
        relevance: pattern.severity === "CRITICAL" ? "HIGH" : pattern.severity === "HIGH" ? "HIGH" : "MEDIUM"
      });
    }
  }
  
  // Add evidence for geographic anomalies
  for (const anomaly of analysis.geographicAnomalies) {
    if (anomaly.triggered) {
      evidence.push({
        source: `FWA Rule ${anomaly.ruleId}`,
        sourceType: "claim_history",
        title: anomaly.ruleName,
        excerpt: anomaly.evidence.join("; "),
        relevance: anomaly.severity === "CRITICAL" ? "HIGH" : anomaly.severity === "HIGH" ? "HIGH" : "MEDIUM"
      });
    }
  }
  
  // Add evidence for policy flag violations
  if (analysis.policyFlagFindings.length > 0) {
    evidence.push({
      source: "Policy Flag Analysis",
      sourceType: "regulation",
      title: "Policy Flag Violations",
      excerpt: analysis.policyFlagFindings.join("; "),
      relevance: analysis.policyFlagFindings.some(f => f.includes("CRITICAL")) ? "HIGH" : "MEDIUM"
    });
  }
  
  // Add evidence for waiting period violations
  if (analysis.waitingPeriodViolations.length > 0) {
    evidence.push({
      source: "Waiting Period Analysis",
      sourceType: "regulation",
      title: "Waiting Period Violations",
      excerpt: analysis.waitingPeriodViolations.join("; "),
      relevance: analysis.waitingPeriodViolations.some(v => v.includes("CRITICAL")) ? "HIGH" : "MEDIUM"
    });
  }
  
  for (const pattern of analysis.patientPatterns.patterns) {
    if (pattern.lookbackDays === 30) {
      evidence.push({
        source: `${pattern.lookbackDays}-Day Claim History`,
        sourceType: "claim_history",
        title: `Patient Claim Pattern (${pattern.lookbackDays} days)`,
        excerpt: `${pattern.claimCount} claims, ${pattern.uniqueProviders} providers, SAR ${pattern.totalAmount.toLocaleString()} total, ${pattern.flaggedClaimCount} flagged`,
        relevance: analysis.patientPatterns.anomalies.length > 0 ? "HIGH" : "MEDIUM"
      });
    }
  }
  
  // Calculate risk based on all enhanced findings
  const chronicViolationCount = analysis.chronicAbusePatterns.filter(p => p.triggered).length;
  const geoViolationCount = analysis.geographicAnomalies.filter(a => a.triggered).length;
  const hasCriticalFindings = analysis.policyFlagFindings.some(f => f.includes("CRITICAL")) ||
                               analysis.waitingPeriodViolations.some(v => v.includes("CRITICAL")) ||
                               analysis.chronicAbusePatterns.some(p => p.triggered && p.severity === "CRITICAL") ||
                               analysis.geographicAnomalies.some(a => a.triggered && a.severity === "CRITICAL");
  
  const hasRisk = analysis.patientPatterns.isHighRisk || 
                  analysis.providerPatterns.isHighRisk ||
                  analysis.patientPatterns.anomalies.length >= 2 ||
                  chronicViolationCount > 0 ||
                  geoViolationCount > 0 ||
                  analysis.waitingPeriodViolations.length > 0;
  
  const combinedRiskScore = Math.max(
    analysis.patientPatterns.riskScore,
    analysis.providerPatterns.riskScore,
    analysis.doctorPatterns?.riskScore || 0
  );
  
  const severity = hasCriticalFindings || combinedRiskScore >= 80 ? "CRITICAL" :
                   combinedRiskScore >= 60 ? "HIGH" :
                   combinedRiskScore >= 40 ? "MEDIUM" : "LOW";
  
  // Calculate confidence based on number of detection methods that triggered
  const detectionMethodCount = [
    analysis.patientPatterns.isHighRisk,
    analysis.providerPatterns.isHighRisk,
    chronicViolationCount > 0,
    geoViolationCount > 0,
    analysis.policyFlagFindings.length > 0,
    analysis.waitingPeriodViolations.length > 0
  ].filter(Boolean).length;
  
  const baseConfidence = 0.75;
  const adjustedConfidence = Math.min(0.98, baseConfidence + (detectionMethodCount * 0.05));
  
  return {
    phaseId: 3,
    phaseName: "Behavioral Pattern Analysis",
    riskFlag: hasRisk,
    severity,
    confidence: adjustedConfidence,
    findings,
    evidence,
    recommendedAction: hasRisk ? (severity === "CRITICAL" ? "INVESTIGATE" : "MONITOR") : "NONE",
    rationale: hasRisk 
      ? `Behavioral analysis detected ${findings.length} risk indicators: ${chronicViolationCount} chronic abuse patterns, ${geoViolationCount} geographic anomalies, ${analysis.policyFlagFindings.length} policy flag issues, ${analysis.waitingPeriodViolations.length} waiting period violations`
      : "No significant behavioral anomalies detected"
  };
}

function createPhase4Signal(
  onlineListening: OnlineListeningAnalysis | undefined,
  complaints: RegulatoryEvidence[]
): RegulatorySignal {
  const evidence: RegulatoryEvidence[] = [...complaints];
  const findings: string[] = [];
  
  if (onlineListening) {
    if (onlineListening.negativeMentions.length > 0) {
      findings.push(`${onlineListening.negativeMentions.length} negative social media mentions detected`);
    }
    if (onlineListening.criticalAlerts.length > 0) {
      findings.push(`${onlineListening.criticalAlerts.length} critical alerts requiring action`);
    }
    if (onlineListening.sentimentScore < -0.3) {
      findings.push(`Negative public sentiment (score: ${onlineListening.sentimentScore.toFixed(2)})`);
    }
    
    for (const mention of onlineListening.criticalAlerts.slice(0, 3)) {
      evidence.push({
        source: "Twitter/X Social Media",
        sourceType: "online_listening",
        title: `Alert: ${mention.providerName || 'Healthcare Provider'}`,
        excerpt: mention.content.slice(0, 300),
        relevance: "HIGH"
      });
    }
  }
  
  if (complaints.length > 0) {
    const criticalComplaints = complaints.filter(c => c.relevance === "HIGH");
    if (criticalComplaints.length > 0) {
      findings.push(`${criticalComplaints.length} critical complaints on record`);
    }
  }
  
  const hasRisk = (onlineListening?.requiresAction || false) || 
                  (onlineListening?.criticalAlerts.length || 0) > 0 ||
                  complaints.filter(c => c.relevance === "HIGH").length > 0;
  
  const severity = (onlineListening?.criticalAlerts.length || 0) >= 3 ? "CRITICAL" :
                   hasRisk ? "HIGH" : 
                   (onlineListening?.negativeMentions.length || 0) >= 3 ? "MEDIUM" : "LOW";
  
  return {
    phaseId: 4,
    phaseName: "Public Sentiment & Complaints",
    riskFlag: hasRisk,
    severity,
    confidence: onlineListening ? 0.75 : 0.6,
    findings,
    evidence,
    recommendedAction: hasRisk ? "INVESTIGATE" : "NONE",
    rationale: hasRisk
      ? `Public sentiment analysis and complaint review identified ${findings.length} areas of concern`
      : "No significant public sentiment issues or complaints identified"
  };
}

async function runPhase5EvidenceSynthesis(
  claim: any,
  phases: RegulatorySignal[],
  allEvidence: RegulatoryEvidence[],
  behavioralAnalysis: BehavioralAnalysis,
  onlineListening: OnlineListeningAnalysis | undefined
): Promise<RegulatorySignal> {
  const highRelevanceEvidence = allEvidence.filter(e => e.relevance === "HIGH");
  const regulatoryViolations = phases[0]?.findings.filter(f => f.includes("violation")) || [];
  const clinicalConcerns = phases[1]?.findings.filter(f => f.includes("concern")) || [];
  
  const evidenceContext = highRelevanceEvidence.map(e => 
    `[${e.sourceType}] ${e.title}: ${e.excerpt}`
  ).join("\n\n");
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a CHI (Council of Health Insurance) regulatory analyst synthesizing evidence for enforcement decisions.
        
Your role is to:
1. Synthesize all evidence from previous analysis phases
2. Identify the most critical regulatory violations
3. Recommend specific enforcement actions
4. Provide a clear rationale for regulatory intervention

Focus on REGULATORY OVERSIGHT (detecting inappropriate care), not insurance claim adjudication.
Use regulator-focused terminology: Prospective/Retrospective Actions, Exposure Amount, Enforcement Actions.`
      },
      {
        role: "user",
        content: `Synthesize the following regulatory analysis for claim ${claim.claimNumber || claim.id}:

CLAIM DETAILS:
- Provider: ${claim.providerName || claim.hospital || 'Unknown'}
- Amount: SAR ${claim.amount || 0}
- Diagnosis: ${claim.icd || claim.diagnosisCode || 'Unknown'}
- Procedure: ${claim.cptCodes?.[0] || claim.procedureCode || 'Unknown'}

PHASE RESULTS:
${phases.map(p => `${p.phaseName}: ${p.severity} risk, ${p.findings.length} findings`).join("\n")}

BEHAVIORAL ANALYSIS:
- Patient High-Risk: ${behavioralAnalysis.patientPatterns.isHighRisk}
- Provider High-Risk: ${behavioralAnalysis.providerPatterns.isHighRisk}
- Anomalies: ${behavioralAnalysis.patientPatterns.anomalies.join("; ") || "None"}

HIGH-RELEVANCE EVIDENCE:
${evidenceContext || "No high-relevance evidence found"}

Provide your synthesis in JSON format:
{
  "enforcementRecommendation": "INVESTIGATE|AUDIT|WARN|MONITOR|ESCALATE|NONE",
  "rationale": "Clear explanation for the recommendation",
  "regulatoryViolations": ["List of specific violations"],
  "clinicalConcerns": ["List of clinical appropriateness concerns"],
  "priorityActions": ["Ordered list of recommended actions"],
  "exposureAssessment": "Estimated regulatory exposure/impact"
}`
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 1500
  });
  
  let synthesis = {
    enforcementRecommendation: "MONITOR",
    rationale: "Automated evidence synthesis completed",
    regulatoryViolations: [] as string[],
    clinicalConcerns: [] as string[],
    priorityActions: [] as string[],
    exposureAssessment: "Low"
  };
  
  try {
    const content = response.choices[0]?.message?.content;
    if (content) {
      synthesis = { ...synthesis, ...JSON.parse(content) };
    }
  } catch (e) {
    console.error("Failed to parse synthesis response:", e);
  }
  
  const hasSignificantRisk = phases.some(p => p.severity === "CRITICAL" || p.severity === "HIGH");
  
  return {
    phaseId: 5,
    phaseName: "Evidence Synthesis",
    riskFlag: hasSignificantRisk,
    severity: hasSignificantRisk ? "HIGH" : "LOW",
    confidence: 0.9,
    findings: [
      `Enforcement recommendation: ${synthesis.enforcementRecommendation}`,
      ...synthesis.priorityActions.slice(0, 3)
    ],
    evidence: highRelevanceEvidence.slice(0, 5),
    recommendedAction: synthesis.enforcementRecommendation as any || "MONITOR",
    rationale: synthesis.rationale
  };
}

function aggregateRegulatorySignals(
  phases: RegulatorySignal[],
  allEvidence: RegulatoryEvidence[],
  behavioralAnalysis: BehavioralAnalysis,
  onlineListening: OnlineListeningAnalysis | undefined
): Omit<RegulatoryOversightResult, "claimId" | "analysisTimestamp" | "phases" | "behavioralAnalysis" | "onlineListeningAnalysis" | "processingTimeMs"> {
  
  const severityScores = { CRITICAL: 1.0, HIGH: 0.75, MEDIUM: 0.5, LOW: 0.25 };
  
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const phase of phases) {
    const weight = PHASE_WEIGHTS[phase.phaseId as keyof typeof PHASE_WEIGHTS] || 1.0;
    const severityScore = severityScores[phase.severity];
    const riskMultiplier = phase.riskFlag ? 1.0 : 0.3;
    
    weightedSum += severityScore * weight * phase.confidence * riskMultiplier;
    totalWeight += weight;
  }
  
  const aggregatedScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  
  const overallRiskLevel = aggregatedScore >= 0.7 ? "CRITICAL" :
                           aggregatedScore >= 0.5 ? "HIGH" :
                           aggregatedScore >= 0.3 ? "MEDIUM" : "LOW";
  
  const actionPriority = ["ESCALATE", "INVESTIGATE", "AUDIT", "WARN", "MONITOR", "NONE"];
  const phaseActions = phases.map(p => p.recommendedAction);
  const topRecommendation = actionPriority.find(a => phaseActions.includes(a as any)) as any || "NONE";
  
  const regulatoryViolations = phases
    .flatMap(p => p.findings.filter(f => f.toLowerCase().includes("violation")));
  const clinicalConcerns = phases
    .flatMap(p => p.findings.filter(f => f.toLowerCase().includes("concern") || f.toLowerCase().includes("clinical")));
  
  const phase5 = phases.find(p => p.phaseId === 5);
  const enforcementRecommendation = phase5?.rationale || 
    `${topRecommendation}: ${regulatoryViolations.length} violations, ${clinicalConcerns.length} clinical concerns identified`;
  
  return {
    aggregatedScore: Math.round(aggregatedScore * 100) / 100,
    overallRiskLevel,
    topRecommendation,
    evidenceSummary: allEvidence.filter(e => e.relevance === "HIGH").slice(0, 10),
    regulatoryViolations,
    clinicalConcerns,
    enforcementRecommendation
  };
}

function buildRegulatoryQuery(claim: any): string {
  const parts = [
    "CHI regulatory compliance",
    claim.icd && `diagnosis ${claim.icd}`,
    claim.cptCodes?.[0] && `procedure ${claim.cptCodes[0]}`,
    claim.hospital && `provider ${claim.hospital}`,
    claim.claimType && `claim type ${claim.claimType}`,
    "NPHIES requirements Saudi Arabia healthcare"
  ];
  return parts.filter(Boolean).join(" ");
}

function buildClinicalQuery(claim: any): string {
  const parts = [
    "clinical appropriateness",
    claim.icd && `ICD-10 ${claim.icd}`,
    claim.cptCodes?.[0] && `CPT ${claim.cptCodes[0]}`,
    claim.hasSurgery === "Yes" && "surgical procedure",
    claim.lengthOfStay && `length of stay ${claim.lengthOfStay} days`,
    "medical necessity guidelines"
  ];
  return parts.filter(Boolean).join(" ");
}

async function analyzeRegulatoryCompliance(claim: any, evidence: RegulatoryEvidence[]): Promise<{
  violations: string[];
  confidence: number;
  rationale: string;
}> {
  if (evidence.length === 0) {
    return {
      violations: [],
      confidence: 0.5,
      rationale: "No relevant regulatory documents found in knowledge base"
    };
  }
  
  const evidenceContext = evidence.map(e => 
    `[${e.source}] ${e.title}: ${e.excerpt}`
  ).join("\n\n");
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a CHI regulatory compliance analyst. Analyze claims against CHI regulations and NPHIES requirements.
Identify specific regulatory violations. Be precise and cite specific regulations when possible.
Return JSON: {"violations": ["list of violations"], "confidence": 0.0-1.0, "rationale": "explanation"}`
      },
      {
        role: "user",
        content: `Analyze this claim for regulatory compliance:

CLAIM:
- Provider: ${claim.providerName || claim.hospital}
- Amount: SAR ${claim.amount}
- Diagnosis: ${claim.icd}
- Procedure: ${claim.cptCodes?.[0] || claim.procedureCode || 'Unknown'}
- Type: ${claim.claimType}

REGULATORY CONTEXT:
${evidenceContext}`
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 800
  });
  
  try {
    const content = response.choices[0]?.message?.content;
    if (content) {
      return JSON.parse(content);
    }
  } catch (e) {
    console.error("Failed to parse compliance response:", e);
  }
  
  return {
    violations: [],
    confidence: 0.5,
    rationale: "Automated compliance check completed"
  };
}

async function analyzeClinicalAppropriateness(claim: any, evidence: RegulatoryEvidence[]): Promise<{
  concerns: string[];
  inappropriatenessScore: number;
  confidence: number;
  rationale: string;
}> {
  if (evidence.length === 0) {
    return {
      concerns: [],
      inappropriatenessScore: 0,
      confidence: 0.5,
      rationale: "No relevant clinical guidelines found in knowledge base"
    };
  }
  
  const evidenceContext = evidence.map(e => 
    `[${e.source}] ${e.title}: ${e.excerpt}`
  ).join("\n\n");
  
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a clinical appropriateness reviewer for CHI regulatory oversight.
Analyze claims against clinical pathways and medical guidelines to detect potentially inappropriate care.
Focus on: unnecessary procedures, diagnosis-procedure mismatch, excessive length of stay, outlier costs.
Return JSON: {"concerns": ["list"], "inappropriatenessScore": 0.0-1.0, "confidence": 0.0-1.0, "rationale": "explanation"}`
      },
      {
        role: "user",
        content: `Analyze this claim for clinical appropriateness:

CLAIM:
- Provider: ${claim.providerName || claim.hospital}
- Amount: SAR ${claim.amount}
- Diagnosis: ${claim.icd}
- Procedure: ${claim.cptCodes?.[0] || claim.procedureCode || 'Unknown'}
- Has Surgery: ${claim.hasSurgery}
- Length of Stay: ${claim.lengthOfStay || 'N/A'} days
- Outlier Score: ${claim.outlierScore || 'N/A'}

CLINICAL GUIDELINES:
${evidenceContext}`
      }
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
    max_tokens: 800
  });
  
  try {
    const content = response.choices[0]?.message?.content;
    if (content) {
      return JSON.parse(content);
    }
  } catch (e) {
    console.error("Failed to parse clinical response:", e);
  }
  
  return {
    concerns: [],
    inappropriatenessScore: 0,
    confidence: 0.5,
    rationale: "Automated clinical review completed"
  };
}

export async function runRegulatoryOversightBatch(claimIds: string[]): Promise<RegulatoryOversightResult[]> {
  const results: RegulatoryOversightResult[] = [];
  
  for (const claimId of claimIds) {
    const claimResult = await db.select().from(claims)
      .where(eq(claims.id, claimId))
      .limit(1);
    
    if (claimResult.length > 0) {
      const result = await runRegulatoryOversight(claimResult[0]);
      results.push(result);
    }
  }
  
  return results;
}

export async function getClaimHistoryPatterns(
  patientId: string,
  lookbackDays: number = 90
): Promise<ClaimHistoryPattern> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);
  
  const result = await db.execute(sql`
    SELECT 
      COUNT(*)::int as claim_count,
      COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_amount,
      COUNT(DISTINCT provider_id) as unique_providers,
      ARRAY_AGG(DISTINCT primary_diagnosis) FILTER (WHERE primary_diagnosis IS NOT NULL) as diagnoses,
      ARRAY_AGG(DISTINCT cpt_codes[1]) FILTER (WHERE cpt_codes IS NOT NULL AND array_length(cpt_codes, 1) > 0) as procedures,
      COUNT(*) FILTER (WHERE flagged = true)::int as flagged_count,
      COALESCE(AVG(CAST(amount AS DECIMAL)), 0) as avg_amount
    FROM claims_v2
    WHERE member_id = ${patientId}
      AND registration_date >= ${cutoffDate}
  `);

  const row = result.rows[0];
  return {
    lookbackDays,
    claimCount: Number(row?.claim_count) || 0,
    totalAmount: Number(row?.total_amount) || 0,
    uniqueProviders: Number(row?.unique_providers) || 0,
    uniqueDiagnoses: (row?.diagnoses as string[]) || [],
    uniqueProcedures: (row?.procedures as string[]) || [],
    flaggedClaimCount: Number(row?.flagged_count) || 0,
    avgClaimAmount: Number(row?.avg_amount) || 0,
    frequencyPerWeek: (Number(row?.claim_count) || 0) / (lookbackDays / 7)
  };
}
