import { db } from "../db";
import { claims, fwaRulesLibrary } from "@shared/schema";
import { eq, sql, and, gte, lte, or } from "drizzle-orm";

export interface FWARuleResult {
  ruleId: string;
  ruleName: string;
  ruleCategory: string;
  triggered: boolean;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidence: number;
  evidence: string[];
  recommendation: string;
  exposureAmount?: number;
}

export interface EnhancedFWAAnalysis {
  claimId: string;
  preAuthViolations: FWARuleResult[];
  chronicAbusePatterns: FWARuleResult[];
  geographicAnomalies: FWARuleResult[];
  policyFlagViolations: FWARuleResult[];
  specialtyMismatchPatterns: FWARuleResult[];
  overallRiskScore: number;
  totalExposure: number;
}

// Pre-Authorization Violation Detection Rules
export async function detectPreAuthViolations(claim: any): Promise<FWARuleResult[]> {
  const results: FWARuleResult[] = [];

  // Rule 1: Pre-Auth Required but Not Obtained
  if (claim.isPreAuthorizationRequired === true && claim.isPreAuthorized !== true) {
    results.push({
      ruleId: "PREAUTH-001",
      ruleName: "Missing Required Pre-Authorization",
      ruleCategory: "Pre-Authorization",
      triggered: true,
      severity: "HIGH",
      confidence: 0.95,
      evidence: [
        `Pre-authorization was required but not obtained`,
        `Service code: ${claim.serviceCode || "Unknown"}`,
        `Claimed amount: SAR ${claim.serviceClaimedAmount || claim.amount}`
      ],
      recommendation: "Deny claim or request retrospective pre-authorization review",
      exposureAmount: parseFloat(claim.serviceClaimedAmount || claim.amount || 0)
    });
  }

  // Rule 2: Pre-Auth Status Mismatch
  if (claim.preAuthorizationStatus && 
      ["denied", "rejected", "cancelled", "expired"].includes(claim.preAuthorizationStatus.toLowerCase())) {
    results.push({
      ruleId: "PREAUTH-002",
      ruleName: "Denied/Expired Pre-Authorization Used",
      ruleCategory: "Pre-Authorization",
      triggered: true,
      severity: "CRITICAL",
      confidence: 0.98,
      evidence: [
        `Pre-authorization status: ${claim.preAuthorizationStatus}`,
        `Pre-authorization ID: ${claim.preAuthorizationId || "Unknown"}`,
        `Claim submitted with invalid pre-authorization`
      ],
      recommendation: "Reject claim - Pre-authorization was denied or has expired",
      exposureAmount: parseFloat(claim.serviceClaimedAmount || claim.amount || 0)
    });
  }

  // Rule 3: Pre-Auth ICD Mismatch
  if (claim.preAuthorizationIcd10s && claim.icd) {
    const preAuthIcds = Array.isArray(claim.preAuthorizationIcd10s) 
      ? claim.preAuthorizationIcd10s 
      : [claim.preAuthorizationIcd10s];
    const claimIcd = claim.icd.split(".")[0]; // Get primary code
    
    const matchFound = preAuthIcds.some((paIcd: string) => 
      paIcd && paIcd.startsWith(claimIcd.substring(0, 3))
    );
    
    if (!matchFound && preAuthIcds.length > 0) {
      results.push({
        ruleId: "PREAUTH-003",
        ruleName: "Diagnosis Mismatch with Pre-Authorization",
        ruleCategory: "Pre-Authorization",
        triggered: true,
        severity: "HIGH",
        confidence: 0.85,
        evidence: [
          `Pre-Auth diagnoses: ${preAuthIcds.join(", ")}`,
          `Claim diagnosis: ${claim.icd}`,
          `Significant variation from approved treatment plan`
        ],
        recommendation: "Review for upcoding or scope creep beyond pre-authorization",
        exposureAmount: parseFloat(claim.serviceClaimedAmount || claim.amount || 0) * 0.5
      });
    }
  }

  // Rule 4: Pre-Auth Amount Exceeded
  // This would require historical pre-auth data - simulate for now
  if (claim.preAuthorizationId && claim.serviceClaimedAmount) {
    const claimedAmount = parseFloat(claim.serviceClaimedAmount);
    // Check for unusually high amounts without proper authorization
    if (claimedAmount > 50000 && !claim.isPreAuthorized) {
      results.push({
        ruleId: "PREAUTH-004",
        ruleName: "High-Value Claim Without Pre-Authorization",
        ruleCategory: "Pre-Authorization",
        triggered: true,
        severity: "HIGH",
        confidence: 0.90,
        evidence: [
          `Claimed amount: SAR ${claimedAmount.toLocaleString()}`,
          `Pre-authorization status: ${claim.isPreAuthorized ? "Authorized" : "Not Authorized"}`,
          `High-value procedures typically require pre-authorization`
        ],
        recommendation: "Request pre-authorization documentation or reduce payment",
        exposureAmount: claimedAmount * 0.7
      });
    }
  }

  return results;
}

// Chronic/Pre-Existing Condition Abuse Detection
export async function detectChronicAbusePatterns(claim: any): Promise<FWARuleResult[]> {
  const results: FWARuleResult[] = [];
  const patientId = claim.patientId || claim.insuredId;

  // Rule 1: Pre-Existing Condition within Waiting Period
  if (claim.preExistingFlag && claim.policyEffectiveDate) {
    const policyStart = new Date(claim.policyEffectiveDate);
    const claimDate = new Date(claim.serviceDate || claim.registrationDate);
    const daysSincePolicyStart = Math.floor((claimDate.getTime() - policyStart.getTime()) / (1000 * 60 * 60 * 24));
    
    // Standard waiting period for pre-existing conditions is 6-12 months
    if (daysSincePolicyStart < 180) {
      results.push({
        ruleId: "CHRONIC-001",
        ruleName: "Pre-Existing Condition Waiting Period Violation",
        ruleCategory: "Chronic Abuse",
        triggered: true,
        severity: "CRITICAL",
        confidence: 0.95,
        evidence: [
          `Pre-existing flag: Yes`,
          `Policy effective: ${policyStart.toISOString().split("T")[0]}`,
          `Days since policy start: ${daysSincePolicyStart}`,
          `Waiting period typically 180 days for pre-existing conditions`
        ],
        recommendation: "Verify waiting period compliance - may not be covered",
        exposureAmount: parseFloat(claim.serviceClaimedAmount || claim.amount || 0)
      });
    }
  }

  // Rule 2: Chronic Condition with Excessive Claims
  if (claim.chronicFlag && patientId) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentClaimsResult = await db.execute(sql`
      SELECT COUNT(*)::int as claim_count, 
             COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_amount
      FROM claims
      WHERE (patient_id = ${patientId} OR insured_id = ${patientId})
        AND chronic_flag = true
        AND registration_date >= ${thirtyDaysAgo}
    `);
    
    const recentClaims = recentClaimsResult.rows[0];
    const claimCount = Number(recentClaims?.claim_count || 0);
    const totalAmount = Number(recentClaims?.total_amount || 0);
    
    if (claimCount > 10) {
      results.push({
        ruleId: "CHRONIC-002",
        ruleName: "Excessive Chronic Condition Claims",
        ruleCategory: "Chronic Abuse",
        triggered: true,
        severity: "HIGH",
        confidence: 0.85,
        evidence: [
          `${claimCount} chronic condition claims in past 30 days`,
          `Total amount: SAR ${totalAmount.toLocaleString()}`,
          `Average healthcare utilization is 2-3 chronic visits per month`
        ],
        recommendation: "Review for overutilization or care coordination issues",
        exposureAmount: totalAmount * 0.3
      });
    }
  }

  // Rule 3: Maternity Flag Inconsistency
  if (claim.maternityFlag) {
    // Check gender consistency
    if (claim.gender && claim.gender.toLowerCase() === "male") {
      results.push({
        ruleId: "CHRONIC-003",
        ruleName: "Maternity Flag Gender Mismatch",
        ruleCategory: "Policy Flag Violation",
        triggered: true,
        severity: "CRITICAL",
        confidence: 0.99,
        evidence: [
          `Maternity flag: Yes`,
          `Patient gender: ${claim.gender}`,
          `Maternity claims require female patient`
        ],
        recommendation: "Reject claim - data integrity issue or potential fraud",
        exposureAmount: parseFloat(claim.serviceClaimedAmount || claim.amount || 0)
      });
    }
  }

  // Rule 4: Newborn Flag with Adult Patient
  if (claim.newbornFlag && claim.dateOfBirth) {
    const birthDate = new Date(claim.dateOfBirth);
    const claimDate = new Date(claim.serviceDate || claim.registrationDate);
    const ageAtClaim = Math.floor((claimDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
    
    if (ageAtClaim > 1) {
      results.push({
        ruleId: "CHRONIC-004",
        ruleName: "Newborn Flag Age Mismatch",
        ruleCategory: "Policy Flag Violation",
        triggered: true,
        severity: "HIGH",
        confidence: 0.95,
        evidence: [
          `Newborn flag: Yes`,
          `Patient age at claim: ${ageAtClaim} years`,
          `Newborn benefits typically apply to first year of life`
        ],
        recommendation: "Review benefit eligibility - newborn flag may be incorrect",
        exposureAmount: parseFloat(claim.serviceClaimedAmount || claim.amount || 0) * 0.5
      });
    }
  }

  return results;
}

// Geographic Anomaly Detection
export async function detectGeographicAnomalies(claim: any): Promise<FWARuleResult[]> {
  const results: FWARuleResult[] = [];
  const patientId = claim.patientId || claim.insuredId;

  // Rule 1: Multi-Region Claims Same Day
  if (patientId && claim.providerRegion) {
    const claimDate = claim.serviceDate || claim.registrationDate;
    const sameDayStart = new Date(claimDate);
    sameDayStart.setHours(0, 0, 0, 0);
    const sameDayEnd = new Date(claimDate);
    sameDayEnd.setHours(23, 59, 59, 999);
    
    const sameDayRegions = await db.execute(sql`
      SELECT DISTINCT provider_region, provider_city, COUNT(*)::int as claim_count
      FROM claims
      WHERE (patient_id = ${patientId} OR insured_id = ${patientId})
        AND service_date >= ${sameDayStart}
        AND service_date <= ${sameDayEnd}
        AND provider_region IS NOT NULL
      GROUP BY provider_region, provider_city
    `);
    
    const uniqueRegions = sameDayRegions.rows.length;
    
    if (uniqueRegions >= 2) {
      const regions = sameDayRegions.rows.map(r => `${r.provider_city} (${r.provider_region})`);
      results.push({
        ruleId: "GEO-001",
        ruleName: "Multi-Region Same-Day Claims",
        ruleCategory: "Geographic Anomaly",
        triggered: true,
        severity: uniqueRegions >= 3 ? "CRITICAL" : "HIGH",
        confidence: 0.90,
        evidence: [
          `Claims in ${uniqueRegions} different regions on same day`,
          `Regions: ${regions.join(", ")}`,
          `Physically impossible to receive care in multiple distant regions`
        ],
        recommendation: "Investigate for identity fraud or billing manipulation",
        exposureAmount: parseFloat(claim.serviceClaimedAmount || claim.amount || 0)
      });
    }
  }

  // Rule 2: Provider Region Concentration for Patient
  if (patientId) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const regionStats = await db.execute(sql`
      SELECT provider_region, COUNT(*)::int as claim_count,
             COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total_amount
      FROM claims
      WHERE (patient_id = ${patientId} OR insured_id = ${patientId})
        AND registration_date >= ${ninetyDaysAgo}
        AND provider_region IS NOT NULL
      GROUP BY provider_region
      ORDER BY claim_count DESC
    `);
    
    const regions = regionStats.rows;
    if (regions.length >= 4) {
      results.push({
        ruleId: "GEO-002",
        ruleName: "Healthcare Shopping Across Regions",
        ruleCategory: "Geographic Anomaly",
        triggered: true,
        severity: "MEDIUM",
        confidence: 0.75,
        evidence: [
          `Patient has claims in ${regions.length} different regions in 90 days`,
          `Regions: ${regions.map(r => r.provider_region).join(", ")}`,
          `May indicate doctor shopping or treatment seeking behavior`
        ],
        recommendation: "Review for care coordination or potential abuse pattern"
      });
    }
  }

  // Rule 3: Out-of-Network High Frequency
  if (claim.providerNetwork && claim.providerNetwork.toLowerCase().includes("out")) {
    if (patientId) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const outOfNetworkStats = await db.execute(sql`
        SELECT COUNT(*)::int as oon_count,
               COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as oon_amount
        FROM claims
        WHERE (patient_id = ${patientId} OR insured_id = ${patientId})
          AND registration_date >= ${thirtyDaysAgo}
          AND provider_network ILIKE '%out%'
      `);
      
      const oonCount = Number(outOfNetworkStats.rows[0]?.oon_count || 0);
      const oonAmount = Number(outOfNetworkStats.rows[0]?.oon_amount || 0);
      
      if (oonCount >= 5) {
        results.push({
          ruleId: "GEO-003",
          ruleName: "Excessive Out-of-Network Utilization",
          ruleCategory: "Geographic Anomaly",
          triggered: true,
          severity: "MEDIUM",
          confidence: 0.80,
          evidence: [
            `${oonCount} out-of-network claims in past 30 days`,
            `Total out-of-network spend: SAR ${oonAmount.toLocaleString()}`,
            `May indicate access issues or intentional network avoidance`
          ],
          recommendation: "Review patient access to in-network providers",
          exposureAmount: oonAmount * 0.2
        });
      }
    }
  }

  return results;
}

// Specialty Mismatch Detection
export async function detectSpecialtyMismatch(claim: any): Promise<FWARuleResult[]> {
  const results: FWARuleResult[] = [];

  // Define specialty-procedure mappings
  const specialtyProcedureMap: Record<string, string[]> = {
    "cardiology": ["33", "92", "93"], // CPT prefixes for cardiac procedures
    "orthopedics": ["27", "28", "29", "23", "24", "25", "26"],
    "dermatology": ["10", "11", "17"],
    "ophthalmology": ["65", "66", "67", "68"],
    "gastroenterology": ["43", "44", "45", "46", "47"],
    "neurology": ["61", "62", "63", "64"],
    "psychiatry": ["90"],
    "radiology": ["70", "71", "72", "73", "74", "75", "76", "77"],
    "ob-gyn": ["57", "58", "59"]
  };

  // Rule 1: Specialty-Service Code Mismatch
  if (claim.specialty && claim.serviceCode) {
    const specialty = claim.specialty.toLowerCase();
    const servicePrefix = claim.serviceCode.substring(0, 2);
    
    let mismatch = false;
    let expectedSpecialty = "";
    
    for (const [spec, prefixes] of Object.entries(specialtyProcedureMap)) {
      if (prefixes.includes(servicePrefix) && !specialty.includes(spec.substring(0, 4))) {
        // Check if the procedure belongs to a different specialty
        for (const [expSpec, expPrefixes] of Object.entries(specialtyProcedureMap)) {
          if (expPrefixes.includes(servicePrefix)) {
            expectedSpecialty = expSpec;
            break;
          }
        }
        if (specialty.length > 0 && expectedSpecialty && !specialty.includes(expectedSpecialty.substring(0, 4))) {
          mismatch = true;
          break;
        }
      }
    }
    
    if (mismatch) {
      results.push({
        ruleId: "SPEC-001",
        ruleName: "Specialty-Procedure Mismatch",
        ruleCategory: "Specialty Mismatch",
        triggered: true,
        severity: "HIGH",
        confidence: 0.85,
        evidence: [
          `Provider specialty: ${claim.specialty}`,
          `Service code: ${claim.serviceCode}`,
          `Expected specialty for this procedure: ${expectedSpecialty}`,
          `Procedures should be performed by appropriately credentialed specialists`
        ],
        recommendation: "Verify provider credentials for this procedure",
        exposureAmount: parseFloat(claim.serviceClaimedAmount || claim.amount || 0)
      });
    }
  }

  // Rule 2: General Practice Performing Specialist Procedures
  if (claim.specialty) {
    const generalTerms = ["general", "gp", "family", "primary"];
    const isGeneralPractice = generalTerms.some(term => 
      claim.specialty.toLowerCase().includes(term)
    );
    
    if (isGeneralPractice && claim.serviceClaimedAmount) {
      const amount = parseFloat(claim.serviceClaimedAmount);
      
      // High-value procedures from GP should be flagged
      if (amount > 10000) {
        results.push({
          ruleId: "SPEC-002",
          ruleName: "High-Value Procedure by General Practitioner",
          ruleCategory: "Specialty Mismatch",
          triggered: true,
          severity: "HIGH",
          confidence: 0.80,
          evidence: [
            `Provider type: General Practice / ${claim.specialty}`,
            `Claimed amount: SAR ${amount.toLocaleString()}`,
            `High-value procedures typically require specialist care`
          ],
          recommendation: "Verify procedure complexity matches provider type",
          exposureAmount: amount * 0.5
        });
      }
    }
  }

  return results;
}

// Main enhanced FWA analysis function
export async function runEnhancedFWAAnalysis(claimId: string): Promise<EnhancedFWAAnalysis> {
  const claimResult = await db.select().from(claims).where(eq(claims.id, claimId)).limit(1);
  
  if (claimResult.length === 0) {
    throw new Error(`Claim ${claimId} not found`);
  }
  
  const claim = claimResult[0];
  
  const [
    preAuthViolations,
    chronicAbusePatterns,
    geographicAnomalies,
    specialtyMismatchPatterns
  ] = await Promise.all([
    detectPreAuthViolations(claim),
    detectChronicAbusePatterns(claim),
    detectGeographicAnomalies(claim),
    detectSpecialtyMismatch(claim)
  ]);

  // Policy flag violations are part of chronic abuse for now
  const policyFlagViolations = chronicAbusePatterns.filter(r => 
    r.ruleCategory === "Policy Flag Violation"
  );
  
  const filteredChronicAbuse = chronicAbusePatterns.filter(r => 
    r.ruleCategory !== "Policy Flag Violation"
  );

  // Calculate overall risk
  const allResults = [
    ...preAuthViolations,
    ...filteredChronicAbuse,
    ...geographicAnomalies,
    ...policyFlagViolations,
    ...specialtyMismatchPatterns
  ];

  const triggeredRules = allResults.filter(r => r.triggered);
  const criticalCount = triggeredRules.filter(r => r.severity === "CRITICAL").length;
  const highCount = triggeredRules.filter(r => r.severity === "HIGH").length;
  const mediumCount = triggeredRules.filter(r => r.severity === "MEDIUM").length;

  const overallRiskScore = Math.min(100, 
    criticalCount * 30 + highCount * 20 + mediumCount * 10
  );

  const totalExposure = triggeredRules.reduce((sum, r) => 
    sum + (r.exposureAmount || 0), 0
  );

  return {
    claimId,
    preAuthViolations,
    chronicAbusePatterns: filteredChronicAbuse,
    geographicAnomalies,
    policyFlagViolations,
    specialtyMismatchPatterns,
    overallRiskScore,
    totalExposure
  };
}

// Seed enhanced FWA rules to database
// Uses valid enum values: preauth_bypass, frequency_abuse, geographic_anomaly, credential_mismatch, clinical_plausibility, custom
export async function seedEnhancedFWARules(): Promise<number> {
  const enhancedRules = [
    // Pre-Authorization Rules (category: preauth_bypass)
    {
      ruleCode: "PREAUTH-001",
      name: "Missing Required Pre-Authorization",
      description: "Detects claims where pre-authorization was required but not obtained",
      category: "preauth_bypass" as const,
      severity: "high" as const,
      conditions: { requiresPreAuth: true, hasPreAuth: false },
      regulatoryReference: "CHI Circular 2024-03: Pre-Authorization Requirements",
      weight: "2.50"
    },
    {
      ruleCode: "PREAUTH-002",
      name: "Denied/Expired Pre-Authorization Used",
      description: "Detects claims using denied, expired, or cancelled pre-authorizations",
      category: "preauth_bypass" as const,
      severity: "critical" as const,
      conditions: { preAuthStatus: ["denied", "rejected", "cancelled", "expired"] },
      regulatoryReference: "CHI Regulation Article 12.3",
      weight: "3.50"
    },
    {
      ruleCode: "PREAUTH-003",
      name: "Diagnosis Mismatch with Pre-Authorization",
      description: "Detects when claim diagnosis differs significantly from pre-authorization",
      category: "preauth_bypass" as const,
      severity: "high" as const,
      conditions: { icdMismatchThreshold: 0.3 },
      regulatoryReference: "CHI Circular 2023-08: Claims Accuracy",
      weight: "2.00"
    },
    {
      ruleCode: "PREAUTH-004",
      name: "High-Value Claim Without Pre-Authorization",
      description: "Detects high-value claims (>50,000 SAR) without pre-authorization",
      category: "preauth_bypass" as const,
      severity: "high" as const,
      conditions: { amountThreshold: 50000 },
      regulatoryReference: "CHI Pre-Authorization Thresholds 2024",
      weight: "2.20"
    },
    // Chronic Abuse Rules (category: frequency_abuse)
    {
      ruleCode: "CHRONIC-001",
      name: "Pre-Existing Condition Waiting Period Violation",
      description: "Detects pre-existing condition claims within waiting period",
      category: "frequency_abuse" as const,
      severity: "critical" as const,
      conditions: { waitingPeriodDays: 180 },
      regulatoryReference: "CCHI Policy Terms Standard",
      weight: "3.00"
    },
    {
      ruleCode: "CHRONIC-002",
      name: "Excessive Chronic Condition Claims",
      description: "Detects unusually high frequency of chronic condition claims",
      category: "frequency_abuse" as const,
      severity: "high" as const,
      conditions: { maxClaimsPerMonth: 10 },
      regulatoryReference: "CHI Utilization Management Guidelines",
      weight: "2.00"
    },
    // Geographic Anomaly Rules (category: geographic_anomaly)
    {
      ruleCode: "GEO-001",
      name: "Multi-Region Same-Day Claims",
      description: "Detects impossible travel patterns - claims in multiple distant regions same day",
      category: "geographic_anomaly" as const,
      severity: "critical" as const,
      conditions: { minRegions: 2 },
      regulatoryReference: "CHI Anti-Fraud Guidelines",
      weight: "3.50"
    },
    {
      ruleCode: "GEO-002",
      name: "Healthcare Shopping Across Regions",
      description: "Detects patients receiving care in unusually many regions",
      category: "geographic_anomaly" as const,
      severity: "medium" as const,
      conditions: { regionThreshold: 4, periodDays: 90 },
      regulatoryReference: "CCHI Care Coordination Policy",
      weight: "1.50"
    },
    {
      ruleCode: "GEO-003",
      name: "Excessive Out-of-Network Utilization",
      description: "Detects high frequency of out-of-network provider usage",
      category: "network_violation" as const,
      severity: "medium" as const,
      conditions: { oonThreshold: 5, periodDays: 30 },
      regulatoryReference: "Network Adequacy Standards",
      weight: "1.20"
    },
    // Policy Flag Violation Rules (category: clinical_plausibility)
    {
      ruleCode: "POLICY-001",
      name: "Maternity Flag Gender Mismatch",
      description: "Detects maternity claims for male patients",
      category: "clinical_plausibility" as const,
      severity: "critical" as const,
      conditions: { maternityFlag: true, gender: "male" },
      regulatoryReference: "Basic Claims Validation Rules",
      weight: "4.00"
    },
    {
      ruleCode: "POLICY-002",
      name: "Newborn Flag Age Mismatch",
      description: "Detects newborn benefit claims for patients over 1 year old",
      category: "clinical_plausibility" as const,
      severity: "high" as const,
      conditions: { newbornFlag: true, maxAgeMonths: 12 },
      regulatoryReference: "Newborn Coverage Terms",
      weight: "2.50"
    },
    // Specialty Mismatch Rules (category: credential_mismatch)
    {
      ruleCode: "SPEC-001",
      name: "Specialty-Procedure Mismatch",
      description: "Detects when procedures don't match provider specialty",
      category: "credential_mismatch" as const,
      severity: "high" as const,
      conditions: {},
      regulatoryReference: "CHI Provider Credentialing Standards",
      weight: "2.20"
    },
    {
      ruleCode: "SPEC-002",
      name: "High-Value Procedure by General Practitioner",
      description: "Detects high-value specialized procedures billed by general practitioners",
      category: "credential_mismatch" as const,
      severity: "high" as const,
      conditions: { amountThreshold: 10000, providerTypes: ["GP", "General", "Family", "Primary"] },
      regulatoryReference: "Scope of Practice Guidelines",
      weight: "2.00"
    }
  ];

  let insertedCount = 0;
  
  for (const rule of enhancedRules) {
    try {
      await db.insert(fwaRulesLibrary).values({
        ruleCode: rule.ruleCode,
        name: rule.name,
        description: rule.description,
        category: rule.category,
        severity: rule.severity,
        conditions: rule.conditions,
        regulatoryReference: rule.regulatoryReference,
        weight: rule.weight,
        isActive: true,
        isSystemRule: true
      }).onConflictDoNothing();
      insertedCount++;
    } catch (error) {
      console.error(`Failed to insert rule ${rule.ruleCode}:`, error);
    }
  }

  return insertedCount;
}
