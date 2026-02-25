import { db } from "../db";
import { fwaRulesLibrary } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

interface FwaRule {
  ruleCode: string;
  name: string;
  description: string;
  category: "upcoding" | "unbundling" | "phantom_billing" | "duplicate_claims" | "impossible_combinations" | 
            "credential_mismatch" | "temporal_anomaly" | "geographic_anomaly" | "frequency_abuse" | 
            "cost_outlier" | "service_mismatch" | "documentation_gap" | "network_violation" | 
            "preauth_bypass" | "drug_abuse" | "lab_abuse" | "clinical_plausibility" | "provider_pattern" | "kickback" | "custom";
  severity: "low" | "medium" | "high" | "critical";
  ruleType: string;
  conditions: any;
  weight: string;
  regulatoryReference?: string;
  applicableClaimTypes?: string[];
  evidenceRequirements?: string[];
}

export async function seedFwaRulesLibrary(): Promise<number> {
  const existing = await db.select({ count: sql<number>`count(*)` }).from(fwaRulesLibrary);
  if (parseInt(String(existing[0]?.count)) > 0) {
    console.log("FWA rules library already seeded");
    return 0;
  }
  
  const rules: FwaRule[] = [
    // =============================================================================
    // BILLING FRAUD RULES (UC = Upcoding, UB = Unbundling, PB = Phantom Billing, DB = Duplicate Billing)
    // =============================================================================
    {
      ruleCode: "UC-101",
      name: "High-Cost DRG Upcoding",
      description: "Claim amount exceeds 120% of peer mean for DRG category with severity indicator mismatch. Detects systematic billing of higher-severity codes.",
      category: "upcoding",
      severity: "critical",
      ruleType: "threshold",
      conditions: { 
        and: [
          { field: "amount_vs_peer_group", operator: "greater_than", value: 1.2 },
          { field: "amount_percentile", operator: "greater_than", value: 90 },
          { field: "claimType", operator: "in", value: ["inpatient", "emergency"] },
          { field: "totalAmount", operator: "greater_than", value: 50000 }
        ]
      },
      weight: "2.0",
      regulatoryReference: "CHI Circular 2024-FWA-003",
      applicableClaimTypes: ["inpatient", "emergency"],
      evidenceRequirements: ["DRG assignment documentation", "Severity indicator rationale"]
    },
    {
      ruleCode: "UC-102",
      name: "Specialty-Capability Mismatch",
      description: "Provider specialty does not match typical specialty for high-cost procedures billed. Primary care billing complex surgical procedures.",
      category: "upcoding",
      severity: "critical",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "totalAmount", operator: "greater_than", value: 50000 },
          { field: "specialtyCode", operator: "not_in", value: ["SUR", "CARD", "ORTH", "NEUR", "URO", "ONC"] },
          { field: "cpt", operator: "starts_with", value: ["27", "33", "35", "43", "47", "50"] }
        ]
      },
      weight: "1.8",
      regulatoryReference: "CHI Provider Standards 4.2.1",
      evidenceRequirements: ["Provider credentialing", "Surgical privileges documentation"]
    },
    {
      ruleCode: "UC-103",
      name: "ICU Stay Without ICU Charges",
      description: "Inpatient claim indicates ICU/CCU admission but lacks corresponding intensive care charges or monitoring codes.",
      category: "upcoding",
      severity: "high",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "member_icu_count_90d", operator: "greater_than", value: 0 },
          { field: "cpt", operator: "not_starts_with", value: "994" },
          { field: "lengthOfStay", operator: "greater_than", value: 3 },
          { field: "claimType", operator: "equals", value: "inpatient" },
          { field: "totalAmount", operator: "greater_than", value: 40000 }
        ]
      },
      weight: "1.5",
      regulatoryReference: "NPHIES ICU Billing Guidelines"
    },
    {
      ruleCode: "UB-201",
      name: "Orthopedic Bundle Splitting",
      description: "Joint replacement components billed separately that should be bundled. CPT 27130/27447 with assistive codes on same DOS.",
      category: "unbundling",
      severity: "critical",
      ruleType: "pattern",
      conditions: { 
        and: [
          { field: "cpt", operator: "in", value: ["27130", "27447", "27446", "27486"] },
          { field: "same_day_claims", operator: "greater_than", value: 3 },
          { field: "procedure_density", operator: "greater_than", value: 4 },
          { field: "totalAmount", operator: "greater_than", value: 60000 }
        ]
      },
      weight: "1.8",
      regulatoryReference: "CCI Edits - Orthopedic Bundling",
      evidenceRequirements: ["Itemized surgical supply list", "Operative report"]
    },
    {
      ruleCode: "UB-202",
      name: "Endoscopy Unbundling Pattern",
      description: "Multiple endoscopy codes billed same encounter (43235 + 43239) that represent unbundled comprehensive procedure.",
      category: "unbundling",
      severity: "high",
      ruleType: "pattern",
      conditions: { 
        and: [
          { field: "cpt", operator: "in", value: ["43235", "43239", "43248", "43249", "43250"] },
          { field: "same_day_claims", operator: "greater_than", value: 2 },
          { field: "procedure_density", operator: "greater_than", value: 2 }
        ]
      },
      weight: "1.5",
      regulatoryReference: "NCCI Bundling Guidelines"
    },
    {
      ruleCode: "UB-203",
      name: "Laboratory Panel Unbundling",
      description: "Individual lab tests billed separately when comprehensive panel (80050, 80053) should apply.",
      category: "unbundling",
      severity: "medium",
      ruleType: "pattern",
      conditions: { 
        and: [
          { field: "cpt", operator: "starts_with", value: "8" },
          { field: "same_day_claims", operator: "greater_than", value: 8 },
          { field: "procedure_density", operator: "greater_than", value: 5 },
          { field: "cpt", operator: "not_in", value: ["80050", "80053", "80076"] }
        ]
      },
      weight: "1.2",
      regulatoryReference: "CPT Lab Panel Bundling Rules"
    },
    {
      ruleCode: "PB-301",
      name: "Phantom Visit Detection",
      description: "Outpatient visit with no vitals recorded, zero length of stay, but high charges indicating potentially fictitious encounter.",
      category: "phantom_billing",
      severity: "critical",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "claimType", operator: "equals", value: "outpatient" },
          { field: "totalAmount", operator: "greater_than", value: 5000 },
          { field: "lengthOfStay", operator: "equals", value: 0 }
        ]
      },
      weight: "2.0",
      regulatoryReference: "CHI Anti-Fraud Directive 2023-001",
      evidenceRequirements: ["Patient sign-in log", "Vital signs documentation", "Provider attestation"]
    },
    {
      ruleCode: "PB-302",
      name: "Telehealth After-Hours Billing Fraud",
      description: "Telehealth visits billed as in-person with after-hours modifier but no facility evidence.",
      category: "phantom_billing",
      severity: "high",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "modifierCode", operator: "in", value: ["GT", "95", "GQ"] },
          { field: "is_night_claim", operator: "equals", value: true },
          { field: "claimType", operator: "equals", value: "outpatient" },
          { field: "totalAmount", operator: "greater_than", value: 3000 }
        ]
      },
      weight: "1.6",
      regulatoryReference: "CHI Telehealth Billing Standards"
    },
    {
      ruleCode: "DB-401",
      name: "Duplicate Claim Submission",
      description: "Same member, provider, DOS with amount variance <5% submitted within 7 days indicating duplicate billing.",
      category: "duplicate_claims",
      severity: "high",
      ruleType: "pattern",
      conditions: { 
        and: [
          { field: "same_day_claims", operator: "greater_than", value: 1 },
          { field: "days_since_last_claim", operator: "less_than", value: 7 },
          { field: "totalAmount", operator: "greater_than", value: 1000 }
        ]
      },
      weight: "1.5",
      regulatoryReference: "NPHIES Duplicate Detection Protocol"
    },
    {
      ruleCode: "DB-402",
      name: "Resubmission Pattern Abuse",
      description: "Three or more claim submissions within 30 days for same service, exploiting resubmission windows.",
      category: "duplicate_claims",
      severity: "medium",
      ruleType: "threshold",
      conditions: { 
        and: [
          { field: "member_claim_count_30d", operator: "greater_than", value: 3 },
          { field: "days_since_last_claim", operator: "less_than", value: 30 },
          { field: "burst_pattern_score", operator: "greater_than", value: 0.5 }
        ]
      },
      weight: "1.3"
    },

    // =============================================================================
    // DRUG & LAB ABUSE RULES (RX = Prescription, LAB = Laboratory)
    // =============================================================================
    {
      ruleCode: "RX-501",
      name: "Broad-Spectrum Antibiotic Overuse",
      description: "Adult outpatient receiving >3 broad-spectrum antibiotic fills in 30 days without severe infection diagnosis.",
      category: "drug_abuse",
      severity: "high",
      ruleType: "pattern",
      conditions: { 
        and: [
          { field: "cpt", operator: "starts_with", value: "J" },
          { field: "member_claim_count_30d", operator: "greater_than", value: 3 },
          { field: "patientAge", operator: "greater_than", value: 18 },
          { field: "claimType", operator: "equals", value: "outpatient" },
          { field: "icd", operator: "not_starts_with", value: "A4" }
        ]
      },
      weight: "1.6",
      regulatoryReference: "SFDA Antibiotic Stewardship Guidelines",
      evidenceRequirements: ["Culture and sensitivity results", "Infection diagnosis documentation"]
    },
    {
      ruleCode: "RX-502",
      name: "Pediatric Fluoroquinolone Flag",
      description: "Fluoroquinolone antibiotics (ATC J01MA) prescribed to patient under 18 without documented contraindication to alternatives.",
      category: "drug_abuse",
      severity: "critical",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "cpt", operator: "in", value: ["J0744", "J0745", "J1956"] },
          { field: "patientAge", operator: "less_than", value: 18 },
          { field: "claimType", operator: "equals", value: "outpatient" }
        ]
      },
      weight: "1.8",
      regulatoryReference: "SFDA Pediatric Drug Safety Alert"
    },
    {
      ruleCode: "RX-503",
      name: "Vitamin D Megadose Abuse",
      description: "Excessive Vitamin D testing (≥6 tests in 6 months) or supplementation (>500,000 IU/quarter) without deficiency diagnosis.",
      category: "drug_abuse",
      severity: "high",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "cpt", operator: "in", value: ["82306", "82652", "J3430"] },
          { field: "member_claim_count_30d", operator: "greater_than", value: 6 },
          { field: "member_unique_diagnoses_30d", operator: "less_than", value: 3 },
          { field: "icd", operator: "not_starts_with", value: "E55" }
        ]
      },
      weight: "1.5",
      regulatoryReference: "CHI Utilization Management Protocol",
      evidenceRequirements: ["Lab results showing deficiency", "Treatment plan documentation"]
    },
    {
      ruleCode: "RX-504",
      name: "Vitamin B12 Injection Abuse",
      description: "More than 12 B12 injections per year without documented pernicious anemia (ICD D51) or malabsorption syndrome.",
      category: "drug_abuse",
      severity: "medium",
      ruleType: "pattern",
      conditions: { 
        and: [
          { field: "cpt", operator: "in", value: ["J3420", "J3430"] },
          { field: "member_claim_count_30d", operator: "greater_than", value: 12 },
          { field: "icd", operator: "not_starts_with", value: "D51" },
          { field: "icd", operator: "not_starts_with", value: "K90" }
        ]
      },
      weight: "1.3",
      regulatoryReference: "NUPCO Formulary Guidelines"
    },
    {
      ruleCode: "LAB-601",
      name: "Excessive Panel Ordering",
      description: "Three or more comprehensive metabolic panels ordered same DOS without clinical justification.",
      category: "lab_abuse",
      severity: "high",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "cpt", operator: "in", value: ["80050", "80053", "80076"] },
          { field: "same_day_claims", operator: "greater_than", value: 2 },
          { field: "procedure_density", operator: "greater_than", value: 3 }
        ]
      },
      weight: "1.4",
      regulatoryReference: "Choosing Wisely - Laboratory Guidelines"
    },
    {
      ruleCode: "LAB-602",
      name: "Tumor Marker Screening Without Diagnosis",
      description: "Cancer tumor markers (CEA, PSA, CA-125) ordered for screening without malignancy diagnosis or high-risk indication.",
      category: "lab_abuse",
      severity: "medium",
      ruleType: "pattern",
      conditions: { 
        and: [
          { field: "cpt", operator: "in", value: ["86300", "84153", "86304", "84155"] },
          { field: "icd", operator: "not_starts_with", value: "C" }
        ]
      },
      weight: "1.2",
      regulatoryReference: "ASCO Tumor Marker Guidelines"
    },

    // =============================================================================
    // FREQUENCY CONTROL RULES (FR = Frequency)
    // =============================================================================
    {
      ruleCode: "FR-701",
      name: "Once-in-Lifetime Procedure Repeat",
      description: "Procedure that should only occur once in patient lifetime (CABG, organ transplant) billed again.",
      category: "frequency_abuse",
      severity: "critical",
      ruleType: "pattern",
      conditions: { 
        and: [
          { field: "cpt", operator: "in", value: ["33533", "33534", "33535", "00580", "47135"] },
          { field: "member_surgery_count_90d", operator: "greater_than", value: 1 },
          { field: "totalAmount", operator: "greater_than", value: 100000 }
        ]
      },
      weight: "2.5",
      regulatoryReference: "CHI High-Cost Procedure Registry",
      evidenceRequirements: ["Prior surgical history", "Medical necessity documentation"]
    },
    {
      ruleCode: "FR-702",
      name: "Annual Preventive Visit Duplication",
      description: "Preventive visit (99396) billed twice within 365 days for same patient.",
      category: "frequency_abuse",
      severity: "medium",
      ruleType: "pattern",
      conditions: { 
        and: [
          { field: "cpt", operator: "in", value: ["99381", "99382", "99391", "99392", "99393", "99394", "99395", "99396"] },
          { field: "member_claim_count_30d", operator: "greater_than", value: 1 },
          { field: "days_since_last_claim", operator: "less_than", value: 365 }
        ]
      },
      weight: "1.2",
      regulatoryReference: "CHI Preventive Services Frequency Limits"
    },
    {
      ruleCode: "FR-703",
      name: "Imaging Repeat <30 Days",
      description: "Same imaging modality and body part repeated within 30 days without clinical change documentation.",
      category: "frequency_abuse",
      severity: "high",
      ruleType: "pattern",
      conditions: { 
        and: [
          { field: "cpt", operator: "starts_with", value: "7" },
          { field: "days_since_last_claim", operator: "less_than", value: 30 },
          { field: "member_claim_count_30d", operator: "greater_than", value: 2 },
          { field: "totalAmount", operator: "greater_than", value: 3000 }
        ]
      },
      weight: "1.4",
      regulatoryReference: "ACR Appropriate Use Criteria"
    },
    {
      ruleCode: "FR-704",
      name: "Dialysis Max Daily Sessions Exceeded",
      description: "More than one dialysis session billed per day without documented medical emergency.",
      category: "frequency_abuse",
      severity: "high",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "cpt", operator: "in", value: ["90935", "90937", "90945", "90947"] },
          { field: "same_day_claims", operator: "greater_than", value: 1 },
          { field: "claimType", operator: "not_equals", value: "emergency" }
        ]
      },
      weight: "1.5",
      regulatoryReference: "CMS Dialysis Billing Guidelines"
    },
    {
      ruleCode: "FR-705",
      name: "Physical Therapy Overutilization",
      description: "More than 30 physical therapy visits per quarter without surgery or acute injury within 90 days.",
      category: "frequency_abuse",
      severity: "medium",
      ruleType: "threshold",
      conditions: { 
        and: [
          { field: "cpt", operator: "starts_with", value: "97" },
          { field: "member_claim_count_30d", operator: "greater_than", value: 30 },
          { field: "member_surgery_count_90d", operator: "equals", value: 0 },
          { field: "icd", operator: "not_starts_with", value: "S" }
        ]
      },
      weight: "1.3",
      regulatoryReference: "CHI Rehabilitation Therapy Limits"
    },

    // =============================================================================
    // CLINICAL PLAUSIBILITY RULES (CP = Clinical Plausibility)
    // =============================================================================
    {
      ruleCode: "CP-801",
      name: "Male Pregnancy Codes",
      description: "Pregnancy-related ICD codes (O00-O9A) billed for male patient - clinically impossible.",
      category: "clinical_plausibility",
      severity: "critical",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "icd", operator: "starts_with", value: "O" },
          { field: "gender", operator: "equals", value: "M" }
        ]
      },
      weight: "2.5",
      regulatoryReference: "ICD-10 Clinical Coding Standards"
    },
    {
      ruleCode: "CP-802",
      name: "Cesarean Section for Male Patient",
      description: "C-section procedure code billed for male patient - clinically impossible.",
      category: "clinical_plausibility",
      severity: "critical",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "cpt", operator: "in", value: ["59510", "59514", "59515", "59618", "59620", "59622"] },
          { field: "gender", operator: "equals", value: "M" }
        ]
      },
      weight: "2.5",
      regulatoryReference: "CPT Gender-Specific Code Edit"
    },
    {
      ruleCode: "CP-803",
      name: "Prostate Procedure for Female",
      description: "Prostate-specific procedure or diagnosis billed for female patient.",
      category: "clinical_plausibility",
      severity: "critical",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "cpt", operator: "in", value: ["55700", "55705", "55801", "55810", "55840", "55842"] },
          { field: "gender", operator: "equals", value: "F" }
        ]
      },
      weight: "2.5",
      regulatoryReference: "CPT Gender-Specific Code Edit"
    },
    {
      ruleCode: "CP-804",
      name: "Neonatal Services for Age >1 Year",
      description: "Neonatal-specific services billed for patient older than 12 months.",
      category: "clinical_plausibility",
      severity: "high",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "cpt", operator: "in", value: ["99460", "99461", "99462", "99463", "99464", "99465"] },
          { field: "patientAge", operator: "greater_than", value: 1 }
        ]
      },
      weight: "1.8",
      regulatoryReference: "AAP Neonatal Coding Guidelines"
    },
    {
      ruleCode: "CP-805",
      name: "Mortality Discharge to Home Same Day",
      description: "Discharge status indicates death but claim shows same-day discharge to home - data integrity issue.",
      category: "clinical_plausibility",
      severity: "critical",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "dischargeStatus", operator: "equals", value: "expired" },
          { field: "lengthOfStay", operator: "equals", value: 0 }
        ]
      },
      weight: "2.0",
      regulatoryReference: "CHI Claims Data Integrity Standards"
    },

    // =============================================================================
    // PROVIDER PATTERN RULES (PP = Provider Pattern)
    // =============================================================================
    {
      ruleCode: "PP-901",
      name: "Night-Time Billing Spike",
      description: "≥40% of encounters billed during 22:00-06:00 without appropriate after-hours modifiers.",
      category: "provider_pattern",
      severity: "high",
      ruleType: "pattern",
      conditions: { 
        and: [
          { field: "is_night_claim", operator: "equals", value: true },
          { field: "provider_night_ratio", operator: "greater_than", value: 0.4 },
          { field: "totalAmount", operator: "greater_than", value: 10000 }
        ]
      },
      weight: "1.5",
      regulatoryReference: "CHI After-Hours Billing Standards"
    },
    {
      ruleCode: "PP-902",
      name: "High Volume Provider Outlier",
      description: "Provider claims per day exceeds 99th percentile with monthly exposure ≥SAR 150,000.",
      category: "provider_pattern",
      severity: "critical",
      ruleType: "threshold",
      conditions: { 
        and: [
          { field: "provider_claim_count_30d", operator: "greater_than", value: 150 },
          { field: "provider_avg_amount_30d", operator: "greater_than", value: 5000 },
          { field: "totalAmount", operator: "greater_than", value: 50000 }
        ]
      },
      weight: "1.8",
      regulatoryReference: "CHI Provider Utilization Monitoring",
      evidenceRequirements: ["Patient scheduling logs", "Provider time attestation"]
    },
    {
      ruleCode: "PP-903",
      name: "Kickback Referral Pattern",
      description: ">60% of patient referrals coming from single source with unusually high procedure volumes.",
      category: "kickback",
      severity: "critical",
      ruleType: "pattern",
      conditions: { 
        and: [
          { field: "referringDoctor", operator: "not_null", value: true },
          { field: "provider_unique_patients_30d", operator: "less_than", value: 20 },
          { field: "provider_claim_count_30d", operator: "greater_than", value: 50 },
          { field: "totalAmount", operator: "greater_than", value: 50000 }
        ]
      },
      weight: "2.0",
      regulatoryReference: "CHI Anti-Kickback Regulations",
      evidenceRequirements: ["Referral source documentation", "Financial arrangement disclosure"]
    },
    {
      ruleCode: "PP-904",
      name: "Rapid Growth Anomaly",
      description: "Provider volume increased >150% from prior quarter combined with denial rate >30%.",
      category: "provider_pattern",
      severity: "high",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "provider_trend_7d_vs_30d", operator: "greater_than", value: 1.5 },
          { field: "provider_denial_rate_90d", operator: "greater_than", value: 0.3 },
          { field: "totalAmount", operator: "greater_than", value: 30000 }
        ]
      },
      weight: "1.6",
      regulatoryReference: "CHI Provider Behavior Analytics"
    },

    // =============================================================================
    // STATISTICAL ANOMALY RULES (SA = Statistical Anomaly) - Z-Score/Percentile Based
    // Leverages population_statistics table for database-backed thresholds
    // =============================================================================
    {
      ruleCode: "SA-001",
      name: "Extreme Amount Z-Score",
      description: "Claim amount_zscore exceeds 3.0 standard deviations from population mean, indicating extreme statistical outlier requiring immediate review.",
      category: "cost_outlier",
      severity: "critical",
      ruleType: "ml_assisted",
      conditions: { 
        and: [
          { field: "amount_zscore", operator: "greater_than", value: 3.0 },
          { field: "totalAmount", operator: "greater_than", value: 10000 }
        ]
      },
      weight: "2.2",
      regulatoryReference: "CMS FPS Anomaly Detection Protocol",
      applicableClaimTypes: ["inpatient", "outpatient", "emergency"],
      evidenceRequirements: ["Population statistics comparison", "Peer group analysis"]
    },
    {
      ruleCode: "SA-002",
      name: "99th Percentile Amount",
      description: "Claim amount_percentile >= 99th percentile of all claims, flagging top 1% high-value claims for enhanced scrutiny.",
      category: "cost_outlier",
      severity: "high",
      ruleType: "threshold",
      conditions: { 
        and: [
          { field: "amount_percentile", operator: "greater_than", value: 99 },
          { field: "totalAmount", operator: "greater_than", value: 50000 }
        ]
      },
      weight: "1.8",
      regulatoryReference: "OIG Statistical Sampling Guidelines"
    },
    {
      ruleCode: "SA-003",
      name: "Provider Amount Deviation",
      description: "Claim amount exceeds provider's historical average by 200% (amount_vs_provider_avg > 3.0), indicating unusual billing for this provider.",
      category: "provider_pattern",
      severity: "high",
      ruleType: "ml_assisted",
      conditions: { 
        and: [
          { field: "amount_vs_provider_avg", operator: "greater_than", value: 3.0 },
          { field: "totalAmount", operator: "greater_than", value: 15000 }
        ]
      },
      weight: "1.6",
      regulatoryReference: "NHCAA Provider Profiling Standards"
    },
    {
      ruleCode: "SA-004",
      name: "Member Spending Anomaly",
      description: "Claim amount exceeds member's historical average by 250% (amount_vs_member_avg > 3.5), unusual spending pattern for this patient.",
      category: "frequency_abuse",
      severity: "high",
      ruleType: "ml_assisted",
      conditions: { 
        and: [
          { field: "amount_vs_member_avg", operator: "greater_than", value: 3.5 },
          { field: "totalAmount", operator: "greater_than", value: 10000 }
        ]
      },
      weight: "1.5",
      regulatoryReference: "CHI Member Utilization Management"
    },
    {
      ruleCode: "SA-005",
      name: "Peer Group Outlier",
      description: "Claim amount exceeds specialty peer group average by 150% (amount_vs_peer_avg > 2.5), significantly above benchmark.",
      category: "cost_outlier",
      severity: "medium",
      ruleType: "ml_assisted",
      conditions: { 
        and: [
          { field: "amount_vs_peer_group", operator: "greater_than", value: 2.5 },
          { field: "totalAmount", operator: "greater_than", value: 20000 }
        ]
      },
      weight: "1.4",
      regulatoryReference: "HFPP Peer Comparison Framework"
    },
    {
      ruleCode: "SA-006",
      name: "Composite Outlier Score Trigger",
      description: "Combined outlier_score from multiple statistical methods exceeds 0.85, indicating consistent anomaly across detection algorithms.",
      category: "cost_outlier",
      severity: "critical",
      ruleType: "ml_assisted",
      conditions: { 
        and: [
          { field: "outlier_score", operator: "greater_than", value: 0.85 },
          { field: "totalAmount", operator: "greater_than", value: 25000 }
        ]
      },
      weight: "2.0",
      regulatoryReference: "CMS Multi-Algorithm Detection Standard"
    },
    {
      ruleCode: "SA-007",
      name: "High Complexity Score Alert",
      description: "Claim complexity_score exceeds 0.8 threshold, indicating unusually complex procedure mix requiring clinical review.",
      category: "service_mismatch",
      severity: "high",
      ruleType: "ml_assisted",
      conditions: { 
        and: [
          { field: "complexity_score", operator: "greater_than", value: 0.8 },
          { field: "totalAmount", operator: "greater_than", value: 30000 }
        ]
      },
      weight: "1.5",
      regulatoryReference: "ACR Complexity Assessment Guidelines"
    },
    {
      ruleCode: "SA-008",
      name: "Multiple Risk Indicators",
      description: "Claim has 3+ risk_indicator_count flags triggered simultaneously, suggesting multi-dimensional fraud pattern.",
      category: "provider_pattern",
      severity: "critical",
      ruleType: "ml_assisted",
      conditions: { 
        and: [
          { field: "risk_indicator_count", operator: "greater_than", value: 3 },
          { field: "totalAmount", operator: "greater_than", value: 15000 }
        ]
      },
      weight: "2.0",
      regulatoryReference: "OIG Multi-Flag Protocol"
    },

    // =============================================================================
    // TEMPORAL PATTERN RULES (TP = Temporal Pattern) - Time-Based Behavior Detection
    // =============================================================================
    {
      ruleCode: "TP-001",
      name: "Claim Burst Pattern",
      description: "burst_pattern_score > 0.7 indicates clustering of multiple claims in short time window, potential claim splitting.",
      category: "temporal_anomaly",
      severity: "high",
      ruleType: "temporal",
      conditions: { 
        and: [
          { field: "burst_pattern_score", operator: "greater_than", value: 0.7 },
          { field: "same_day_claims", operator: "greater_than", value: 3 }
        ]
      },
      weight: "1.7",
      regulatoryReference: "CMS Claim Bundling Detection",
      applicableClaimTypes: ["outpatient", "professional"],
      evidenceRequirements: ["Claim timing analysis", "Service date logs"]
    },
    {
      ruleCode: "TP-002",
      name: "Frequency Acceleration",
      description: "frequency_acceleration > 2.0 indicates claim submission rate doubling, potential gaming behavior.",
      category: "temporal_anomaly",
      severity: "high",
      ruleType: "temporal",
      conditions: { 
        and: [
          { field: "member_frequency_acceleration", operator: "greater_than", value: 2.0 },
          { field: "totalAmount", operator: "greater_than", value: 20000 }
        ]
      },
      weight: "1.6",
      regulatoryReference: "FBI Fraud Acceleration Indicators"
    },
    {
      ruleCode: "TP-003",
      name: "Same-Day Multiple Claims",
      description: "same_day_claims >= 5 from same provider/patient combination, potential service duplication or splitting.",
      category: "duplicate_claims",
      severity: "high",
      ruleType: "temporal",
      conditions: { 
        and: [
          { field: "same_day_claims", operator: "greater_than", value: 4 },
          { field: "totalAmount", operator: "greater_than", value: 5000 }
        ]
      },
      weight: "1.5",
      regulatoryReference: "NPHIES Same-Day Edit Rules"
    },
    {
      ruleCode: "TP-004",
      name: "Rapid Sequential Claims",
      description: "days_since_last_claim < 3 with high amount suggests rapid sequential billing pattern for same condition.",
      category: "frequency_abuse",
      severity: "medium",
      ruleType: "temporal",
      conditions: { 
        and: [
          { field: "days_since_last_claim", operator: "less_than", value: 3 },
          { field: "totalAmount", operator: "greater_than", value: 8000 }
        ]
      },
      weight: "1.3",
      regulatoryReference: "CHI Claim Frequency Standards"
    },
    {
      ruleCode: "TP-005",
      name: "7-Day vs 30-Day Trend Spike",
      description: "trend_7d_vs_30d > 2.5 indicates recent activity spike compared to monthly baseline, potential end-of-period gaming.",
      category: "temporal_anomaly",
      severity: "high",
      ruleType: "temporal",
      conditions: { 
        and: [
          { field: "provider_trend_7d_vs_30d", operator: "greater_than", value: 2.5 },
          { field: "totalAmount", operator: "greater_than", value: 30000 }
        ]
      },
      weight: "1.6",
      regulatoryReference: "CMS End-of-Period Monitoring"
    },
    {
      ruleCode: "TP-006",
      name: "Weekend Surgery Pattern",
      description: "Elective surgery billed on weekend (is_weekend=true) without emergency indication, atypical scheduling.",
      category: "temporal_anomaly",
      severity: "medium",
      ruleType: "temporal",
      conditions: { 
        and: [
          { field: "is_weekend", operator: "equals", value: true },
          { field: "claimType", operator: "equals", value: "inpatient" },
          { field: "totalAmount", operator: "greater_than", value: 40000 }
        ]
      },
      weight: "1.3",
      regulatoryReference: "CHI Weekend Surgery Review Protocol"
    },
    {
      ruleCode: "TP-007",
      name: "After-Hours High-Value Claim",
      description: "is_night_claim=true with high amount suggests after-hours billing for services typically performed during regular hours.",
      category: "temporal_anomaly",
      severity: "high",
      ruleType: "temporal",
      conditions: { 
        and: [
          { field: "is_night_claim", operator: "equals", value: true },
          { field: "totalAmount", operator: "greater_than", value: 25000 }
        ]
      },
      weight: "1.5",
      regulatoryReference: "CHI After-Hours Billing Review"
    },
    {
      ruleCode: "TP-008",
      name: "Monday Morning Surge",
      description: "claim_day_of_week = 1 (Monday) with unusually high volume suggests weekend service date manipulation.",
      category: "temporal_anomaly",
      severity: "medium",
      ruleType: "temporal",
      conditions: { 
        and: [
          { field: "claim_day_of_week", operator: "equals", value: 1 },
          { field: "same_day_claims", operator: "greater_than", value: 5 }
        ]
      },
      weight: "1.2",
      regulatoryReference: "SIU Weekend Backdating Detection"
    },
    {
      ruleCode: "TP-009",
      name: "End-of-Month Billing Spike",
      description: "Claims submitted in last 3 days of month with burst_pattern_score > 0.5, potential quota-driven billing.",
      category: "temporal_anomaly",
      severity: "medium",
      ruleType: "temporal",
      conditions: { 
        and: [
          { field: "burst_pattern_score", operator: "greater_than", value: 0.5 },
          { field: "totalAmount", operator: "greater_than", value: 50000 }
        ]
      },
      weight: "1.4",
      regulatoryReference: "OIG End-Period Gaming Detection"
    },
    {
      ruleCode: "TP-010",
      name: "LOS vs Expected Deviation",
      description: "los_vs_expected > 2.0 indicates actual length of stay exceeds diagnosis-expected stay by 100%+.",
      category: "frequency_abuse",
      severity: "high",
      ruleType: "temporal",
      conditions: { 
        and: [
          { field: "los_vs_diagnosis_expected", operator: "greater_than", value: 2.0 },
          { field: "lengthOfStay", operator: "greater_than", value: 5 }
        ]
      },
      weight: "1.6",
      regulatoryReference: "CMS LOS Benchmarking Standards"
    },

    // =============================================================================
    // NETWORK/COLLUSION RULES (NC = Network/Collusion) - Multi-Entity Patterns
    // =============================================================================
    {
      ruleCode: "NC-001",
      name: "High Entity Network Score",
      description: "entity_network_score > 0.8 indicates unusual provider-patient-doctor network connections suggesting coordinated behavior.",
      category: "network_violation",
      severity: "critical",
      ruleType: "ml_assisted",
      conditions: { 
        and: [
          { field: "entity_network_score", operator: "greater_than", value: 0.8 },
          { field: "totalAmount", operator: "greater_than", value: 20000 }
        ]
      },
      weight: "2.0",
      regulatoryReference: "FBI Organized Healthcare Fraud Detection",
      evidenceRequirements: ["Network analysis visualization", "Entity relationship mapping"]
    },
    {
      ruleCode: "NC-002",
      name: "Cross-Entity Anomaly Pattern",
      description: "cross_entity_anomaly > 0.7 indicates unusual combination of entities (provider-patient-doctor) rarely seen together.",
      category: "network_violation",
      severity: "high",
      ruleType: "ml_assisted",
      conditions: { 
        and: [
          { field: "cross_entity_anomaly", operator: "greater_than", value: 0.7 },
          { field: "totalAmount", operator: "greater_than", value: 15000 }
        ]
      },
      weight: "1.8",
      regulatoryReference: "HFPP Cross-Payer Entity Analysis"
    },
    {
      ruleCode: "NC-003",
      name: "Collusion Indicator Match",
      description: "collusion_indicator > 0.6 matches known collusion patterns in historical fraud database.",
      category: "network_violation",
      severity: "critical",
      ruleType: "ml_assisted",
      conditions: { 
        and: [
          { field: "collusion_indicator", operator: "greater_than", value: 0.6 },
          { field: "totalAmount", operator: "greater_than", value: 25000 }
        ]
      },
      weight: "2.2",
      regulatoryReference: "DOJ Healthcare Fraud Strike Force Patterns"
    },
    {
      ruleCode: "NC-004",
      name: "Provider-Patient Exclusive Relationship",
      description: "Member has >80% of claims from single provider suggesting artificial patient channeling.",
      category: "network_violation",
      severity: "high",
      ruleType: "pattern",
      conditions: { 
        and: [
          { field: "member_unique_providers_30d", operator: "less_than", value: 2 },
          { field: "member_claim_count_30d", operator: "greater_than", value: 10 },
          { field: "totalAmount", operator: "greater_than", value: 30000 }
        ]
      },
      weight: "1.7",
      regulatoryReference: "OIG Patient Channeling Investigation"
    },
    {
      ruleCode: "NC-005",
      name: "Doctor-Provider Concentration",
      description: "Single referring doctor responsible for >40% of provider's high-value claims, potential kickback arrangement.",
      category: "kickback",
      severity: "critical",
      ruleType: "pattern",
      conditions: { 
        and: [
          { field: "referringDoctor", operator: "not_null", value: true },
          { field: "totalAmount", operator: "greater_than", value: 50000 },
          { field: "claimType", operator: "equals", value: "inpatient" }
        ]
      },
      weight: "2.0",
      regulatoryReference: "CHI Anti-Kickback Statute"
    },

    // =============================================================================
    // PEER COMPARISON RULES (PC = Peer Comparison) - Benchmark Deviations
    // =============================================================================
    {
      ruleCode: "PC-001",
      name: "Specialty Percentile Outlier",
      description: "specialty_percentile > 95 indicates provider/claim in top 5% of specialty, requiring peer review.",
      category: "cost_outlier",
      severity: "high",
      ruleType: "ml_assisted",
      conditions: { 
        and: [
          { field: "specialty_percentile", operator: "greater_than", value: 95 },
          { field: "totalAmount", operator: "greater_than", value: 30000 }
        ]
      },
      weight: "1.6",
      regulatoryReference: "CMS Specialty Benchmarking"
    },
    {
      ruleCode: "PC-002",
      name: "Regional Billing Outlier",
      description: "region_percentile > 97 indicates billing significantly above regional peers.",
      category: "geographic_anomaly",
      severity: "high",
      ruleType: "ml_assisted",
      conditions: { 
        and: [
          { field: "region_percentile", operator: "greater_than", value: 97 },
          { field: "totalAmount", operator: "greater_than", value: 25000 }
        ]
      },
      weight: "1.5",
      regulatoryReference: "CHI Regional Analysis Framework"
    },
    {
      ruleCode: "PC-003",
      name: "Peer Group Z-Score Alert",
      description: "peer_group_zscore > 2.5 indicates billing 2.5+ standard deviations above peer group mean.",
      category: "cost_outlier",
      severity: "high",
      ruleType: "ml_assisted",
      conditions: { 
        and: [
          { field: "peer_group_zscore", operator: "greater_than", value: 2.5 },
          { field: "totalAmount", operator: "greater_than", value: 20000 }
        ]
      },
      weight: "1.7",
      regulatoryReference: "HFPP Peer Comparison Standards"
    },
    {
      ruleCode: "PC-004",
      name: "Peer Denial Rate Deviation",
      description: "peer_denial_comparison > 2.0 indicates denial rate 2x higher than peer average.",
      category: "provider_pattern",
      severity: "medium",
      ruleType: "ml_assisted",
      conditions: { 
        and: [
          { field: "peer_denial_comparison", operator: "greater_than", value: 2.0 },
          { field: "totalAmount", operator: "greater_than", value: 15000 }
        ]
      },
      weight: "1.4",
      regulatoryReference: "CHI Provider Quality Metrics"
    },
    {
      ruleCode: "PC-005",
      name: "Peer Flag Rate Alert",
      description: "peer_flag_comparison > 2.5 indicates flag rate 2.5x higher than peer average, potential systemic issue.",
      category: "provider_pattern",
      severity: "high",
      ruleType: "ml_assisted",
      conditions: { 
        and: [
          { field: "peer_flag_comparison", operator: "greater_than", value: 2.5 },
          { field: "totalAmount", operator: "greater_than", value: 20000 }
        ]
      },
      weight: "1.6",
      regulatoryReference: "OIG Provider Monitoring Standards"
    },
    {
      ruleCode: "PC-006",
      name: "Peer Amount Ratio Extreme",
      description: "peer_amount_ratio > 3.0 indicates claim 3x the peer median for this specialty/service.",
      category: "cost_outlier",
      severity: "critical",
      ruleType: "ml_assisted",
      conditions: { 
        and: [
          { field: "peer_amount_ratio", operator: "greater_than", value: 3.0 },
          { field: "totalAmount", operator: "greater_than", value: 40000 }
        ]
      },
      weight: "1.9",
      regulatoryReference: "CMS Comparative Billing Analysis"
    },

    // =============================================================================
    // ENTITY AGGREGATION RULES (EA = Entity Aggregation) - Cumulative Patterns
    // =============================================================================
    {
      ruleCode: "EA-001",
      name: "Provider 7-Day Volume Spike",
      description: "provider_claim_count_7d > 50 indicates unusually high recent claim volume from single provider.",
      category: "provider_pattern",
      severity: "high",
      ruleType: "threshold",
      conditions: { 
        and: [
          { field: "provider_claim_count_7d", operator: "greater_than", value: 50 },
          { field: "totalAmount", operator: "greater_than", value: 100000 }
        ]
      },
      weight: "1.7",
      regulatoryReference: "CMS High-Volume Provider Monitoring"
    },
    {
      ruleCode: "EA-002",
      name: "Provider 30-Day Extreme Volume",
      description: "provider_claim_count_30d > 200 with high average amount suggests billing mill behavior.",
      category: "provider_pattern",
      severity: "critical",
      ruleType: "threshold",
      conditions: { 
        and: [
          { field: "provider_claim_count_30d", operator: "greater_than", value: 200 },
          { field: "provider_avg_amount_30d", operator: "greater_than", value: 5000 }
        ]
      },
      weight: "2.0",
      regulatoryReference: "FBI Healthcare Fraud Strike Force"
    },
    {
      ruleCode: "EA-003",
      name: "Provider Amount Volatility",
      description: "provider_std_amount > 2x provider_avg_amount indicates high billing variability, potential code gaming.",
      category: "provider_pattern",
      severity: "high",
      ruleType: "ml_assisted",
      conditions: { 
        and: [
          { field: "provider_std_amount_30d", operator: "greater_than", value: 15000 },
          { field: "totalAmount", operator: "greater_than", value: 30000 }
        ]
      },
      weight: "1.5",
      regulatoryReference: "NHCAA Billing Variability Analysis"
    },
    {
      ruleCode: "EA-004",
      name: "Provider High Denial Rate",
      description: "provider_denial_rate > 0.25 (25%) indicates systematic billing issues requiring investigation.",
      category: "provider_pattern",
      severity: "high",
      ruleType: "threshold",
      conditions: { 
        and: [
          { field: "provider_denial_rate_90d", operator: "greater_than", value: 0.25 },
          { field: "provider_claim_count_30d", operator: "greater_than", value: 20 }
        ]
      },
      weight: "1.6",
      regulatoryReference: "CHI Provider Performance Standards"
    },
    {
      ruleCode: "EA-005",
      name: "Provider High Flag Rate",
      description: "provider_flag_rate > 0.15 (15%) indicates frequent fraud flags on provider's claims.",
      category: "provider_pattern",
      severity: "critical",
      ruleType: "threshold",
      conditions: { 
        and: [
          { field: "provider_flag_rate_90d", operator: "greater_than", value: 0.15 },
          { field: "provider_claim_count_30d", operator: "greater_than", value: 30 }
        ]
      },
      weight: "1.9",
      regulatoryReference: "OIG Provider Flag Threshold"
    },
    {
      ruleCode: "EA-006",
      name: "Provider Weekend Ratio Alert",
      description: "provider_weekend_ratio > 0.35 indicates 35%+ of claims on weekends, atypical pattern.",
      category: "temporal_anomaly",
      severity: "medium",
      ruleType: "threshold",
      conditions: { 
        and: [
          { field: "provider_weekend_ratio", operator: "greater_than", value: 0.35 },
          { field: "provider_claim_count_30d", operator: "greater_than", value: 20 }
        ]
      },
      weight: "1.4",
      regulatoryReference: "CHI Weekend Billing Standards"
    },
    {
      ruleCode: "EA-007",
      name: "Provider High Surgery Rate",
      description: "provider_surgery_rate > 0.6 (60% surgical) for non-surgical specialty indicates specialty mismatch.",
      category: "credential_mismatch",
      severity: "high",
      ruleType: "threshold",
      conditions: { 
        and: [
          { field: "provider_surgery_rate", operator: "greater_than", value: 0.6 },
          { field: "totalAmount", operator: "greater_than", value: 40000 }
        ]
      },
      weight: "1.6",
      regulatoryReference: "CHI Specialty Scope Standards"
    },
    {
      ruleCode: "EA-008",
      name: "Provider Unique Patient Low",
      description: "provider_unique_patients < 10 with high volume suggests fake patient pool.",
      category: "phantom_billing",
      severity: "critical",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "provider_unique_patients_30d", operator: "less_than", value: 10 },
          { field: "provider_claim_count_30d", operator: "greater_than", value: 50 }
        ]
      },
      weight: "2.0",
      regulatoryReference: "FBI Ghost Patient Detection"
    },

    // =============================================================================
    // MEMBER BEHAVIOR RULES (MB = Member Behavior) - Patient-Level Patterns
    // =============================================================================
    {
      ruleCode: "MB-001",
      name: "Doctor Shopping Pattern",
      description: "member_unique_providers > 10 in 90 days suggests potential doctor shopping behavior.",
      category: "frequency_abuse",
      severity: "high",
      ruleType: "pattern",
      conditions: { 
        and: [
          { field: "member_unique_providers_30d", operator: "greater_than", value: 10 },
          { field: "member_claim_count_30d", operator: "greater_than", value: 15 }
        ]
      },
      weight: "1.7",
      regulatoryReference: "DEA Doctor Shopping Detection",
      evidenceRequirements: ["PDMP check", "Provider visit log"]
    },
    {
      ruleCode: "MB-002",
      name: "High Utilizer Alert",
      description: "high_utilizer_flag indicates patient in top utilization tier, requiring enhanced review.",
      category: "frequency_abuse",
      severity: "medium",
      ruleType: "pattern",
      conditions: { 
        and: [
          { field: "high_utilizer_flag", operator: "equals", value: true },
          { field: "totalAmount", operator: "greater_than", value: 10000 }
        ]
      },
      weight: "1.3",
      regulatoryReference: "CHI Utilization Management Protocol"
    },
    {
      ruleCode: "MB-003",
      name: "Member Diagnosis Diversity",
      description: "member_unique_diagnoses > 15 in short period suggests potential diagnosis code manipulation.",
      category: "clinical_plausibility",
      severity: "high",
      ruleType: "pattern",
      conditions: { 
        and: [
          { field: "member_unique_diagnoses_30d", operator: "greater_than", value: 15 },
          { field: "member_claim_count_30d", operator: "greater_than", value: 10 }
        ]
      },
      weight: "1.5",
      regulatoryReference: "CMS Diagnosis Coding Integrity"
    },
    {
      ruleCode: "MB-004",
      name: "Member Lifetime Spend Alert",
      description: "member_total_amount > 500,000 SAR indicates extremely high lifetime healthcare spending.",
      category: "cost_outlier",
      severity: "high",
      ruleType: "threshold",
      conditions: { 
        and: [
          { field: "member_total_amount_30d", operator: "greater_than", value: 500000 },
          { field: "totalAmount", operator: "greater_than", value: 20000 }
        ]
      },
      weight: "1.6",
      regulatoryReference: "CHI High-Cost Member Management"
    },
    {
      ruleCode: "MB-005",
      name: "Member Surgery Frequency",
      description: "member_surgery_count > 4 in 12 months indicates unusual surgical frequency for single patient.",
      category: "frequency_abuse",
      severity: "high",
      ruleType: "pattern",
      conditions: { 
        and: [
          { field: "member_surgery_count_90d", operator: "greater_than", value: 4 },
          { field: "claimType", operator: "equals", value: "inpatient" }
        ]
      },
      weight: "1.6",
      regulatoryReference: "OIG Surgical Overutilization Detection"
    },
    {
      ruleCode: "MB-006",
      name: "Member ICU Frequency",
      description: "member_icu_count > 3 in 12 months suggests potential ICU abuse or complex patient requiring case management.",
      category: "frequency_abuse",
      severity: "high",
      ruleType: "pattern",
      conditions: { 
        and: [
          { field: "member_icu_count_90d", operator: "greater_than", value: 3 },
          { field: "lengthOfStay", operator: "greater_than", value: 3 }
        ]
      },
      weight: "1.5",
      regulatoryReference: "AHRQ ICU Utilization Standards"
    },
    {
      ruleCode: "MB-007",
      name: "Member Average Amount Alert",
      description: "member_avg_amount > 25,000 SAR indicates consistently high-cost claims from this patient.",
      category: "cost_outlier",
      severity: "medium",
      ruleType: "threshold",
      conditions: { 
        and: [
          { field: "member_avg_amount_30d", operator: "greater_than", value: 25000 },
          { field: "member_claim_count_30d", operator: "greater_than", value: 5 }
        ]
      },
      weight: "1.4",
      regulatoryReference: "CHI Member Cost Analysis"
    },

    // =============================================================================
    // COST OUTLIER RULES (CO = Cost Outlier) - Amount-Based Detection
    // =============================================================================
    {
      ruleCode: "CO-001",
      name: "Extreme High-Value Claim",
      description: "totalAmount > 500,000 SAR requires executive review due to exceptional value.",
      category: "cost_outlier",
      severity: "critical",
      ruleType: "threshold",
      conditions: { field: "totalAmount", operator: "greater_than", value: 500000 },
      weight: "2.5",
      regulatoryReference: "CHI High-Value Claim Review Protocol",
      evidenceRequirements: ["Full medical records", "Itemized charges", "Prior authorization"]
    },
    {
      ruleCode: "CO-002",
      name: "Amount-Procedure Ratio Anomaly",
      description: "amount_procedure_ratio > 15,000 SAR per procedure indicates potential overcharging.",
      category: "cost_outlier",
      severity: "high",
      ruleType: "ml_assisted",
      conditions: { 
        and: [
          { field: "amount_procedure_ratio", operator: "greater_than", value: 15000 },
          { field: "procedure_count", operator: "greater_than", value: 1 }
        ]
      },
      weight: "1.6",
      regulatoryReference: "CMS Fee Schedule Compliance"
    },
    {
      ruleCode: "CO-003",
      name: "Surgery Fee Outlier",
      description: "surgery_fee > 200,000 SAR indicates extremely high surgical charges.",
      category: "cost_outlier",
      severity: "critical",
      ruleType: "threshold",
      conditions: { 
        and: [
          { field: "surgery_fee", operator: "greater_than", value: 200000 },
          { field: "claimType", operator: "equals", value: "inpatient" }
        ]
      },
      weight: "2.0",
      regulatoryReference: "CHI Surgical Fee Schedule"
    },
    {
      ruleCode: "CO-004",
      name: "Outpatient High-Cost Anomaly",
      description: "Outpatient claim > 50,000 SAR without surgical procedure requires clinical review.",
      category: "cost_outlier",
      severity: "high",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "claimType", operator: "equals", value: "outpatient" },
          { field: "totalAmount", operator: "greater_than", value: 50000 },
          { field: "cpt", operator: "not_starts_with", value: "2" }
        ]
      },
      weight: "1.7",
      regulatoryReference: "CHI Outpatient Cost Thresholds"
    },

    // =============================================================================
    // DOCUMENTATION GAP RULES (DG = Documentation Gap) - Missing Data Patterns
    // =============================================================================
    {
      ruleCode: "DG-001",
      name: "Missing Diagnosis Code",
      description: "High-value claim without principal diagnosis code indicates documentation gap.",
      category: "documentation_gap",
      severity: "high",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "icd", operator: "equals", value: null },
          { field: "totalAmount", operator: "greater_than", value: 10000 }
        ]
      },
      weight: "1.5",
      regulatoryReference: "CMS Coding Completeness Standards"
    },
    {
      ruleCode: "DG-002",
      name: "Missing CPT Code",
      description: "Claim with significant charges but no procedure codes indicates potential phantom billing.",
      category: "documentation_gap",
      severity: "high",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "cpt", operator: "equals", value: null },
          { field: "totalAmount", operator: "greater_than", value: 5000 }
        ]
      },
      weight: "1.6",
      regulatoryReference: "NPHIES Claim Completeness Requirements"
    },
    {
      ruleCode: "DG-003",
      name: "Procedure-Diagnosis Mismatch",
      description: "procedure_diagnosis_mismatch > 0.5 indicates significant inconsistency between procedures and diagnoses.",
      category: "documentation_gap",
      severity: "high",
      ruleType: "ml_assisted",
      conditions: { 
        and: [
          { field: "procedure_diagnosis_mismatch", operator: "greater_than", value: 0.5 },
          { field: "totalAmount", operator: "greater_than", value: 15000 }
        ]
      },
      weight: "1.7",
      regulatoryReference: "CMS Coding Accuracy Standards"
    },
    {
      ruleCode: "DG-004",
      name: "High Procedure Density",
      description: "procedure_density > 5 procedures per diagnosis indicates potential unbundling or over-coding.",
      category: "unbundling",
      severity: "high",
      ruleType: "ml_assisted",
      conditions: { 
        and: [
          { field: "procedure_density", operator: "greater_than", value: 5 },
          { field: "totalAmount", operator: "greater_than", value: 20000 }
        ]
      },
      weight: "1.6",
      regulatoryReference: "NCCI Bundling Guidelines"
    },

    // =============================================================================
    // CREDENTIAL MISMATCH RULES (CM = Credential Mismatch) - Specialty vs Service
    // =============================================================================
    {
      ruleCode: "CM-001",
      name: "Primary Care Complex Surgery",
      description: "Primary care provider billing complex surgical codes (CPT 27xxx-47xxx) beyond scope.",
      category: "credential_mismatch",
      severity: "critical",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "specialtyCode", operator: "in", value: ["FP", "IM", "GP", "PED"] },
          { field: "cpt", operator: "starts_with", value: ["27", "33", "35", "43", "47"] },
          { field: "totalAmount", operator: "greater_than", value: 30000 }
        ]
      },
      weight: "2.0",
      regulatoryReference: "CHI Provider Credentialing Standards"
    },
    {
      ruleCode: "CM-002",
      name: "Pediatrician Adult Patient",
      description: "Pediatric specialist billing for adult patient (age > 18) indicates specialty mismatch.",
      category: "credential_mismatch",
      severity: "high",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "specialtyCode", operator: "equals", value: "PED" },
          { field: "patientAge", operator: "greater_than", value: 18 }
        ]
      },
      weight: "1.5",
      regulatoryReference: "CHI Age-Appropriate Care Standards"
    },
    {
      ruleCode: "CM-003",
      name: "OB-GYN Male Patient",
      description: "OB-GYN specialty billing for male patient indicates gender-specialty mismatch.",
      category: "credential_mismatch",
      severity: "critical",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "specialtyCode", operator: "in", value: ["OB", "GYN", "OBGYN"] },
          { field: "gender", operator: "equals", value: "M" }
        ]
      },
      weight: "2.0",
      regulatoryReference: "CPT Gender-Specific Specialty Rules"
    },
    {
      ruleCode: "CM-004",
      name: "Non-Surgeon Surgical Billing",
      description: "Non-surgical specialty billing major surgical procedures (99xxx OR CPT) with high charges.",
      category: "credential_mismatch",
      severity: "critical",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "specialtyCode", operator: "not_in", value: ["SUR", "ORTH", "CARD", "NEUR", "URO", "ONC", "ENT", "PLST"] },
          { field: "cpt", operator: "starts_with", value: ["0", "1", "2", "3", "4", "5", "6"] },
          { field: "totalAmount", operator: "greater_than", value: 50000 }
        ]
      },
      weight: "2.0",
      regulatoryReference: "CHI Surgical Privileges Requirements"
    },

    // =============================================================================
    // PREAUTHORIZATION RULES (PA = Preauth) - Authorization Compliance
    // =============================================================================
    {
      ruleCode: "PA-001",
      name: "High-Cost Without Preauth",
      description: "Claim > 100,000 SAR without preauthorization reference indicates bypass attempt.",
      category: "preauth_bypass",
      severity: "critical",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "preAuthNumber", operator: "equals", value: null },
          { field: "totalAmount", operator: "greater_than", value: 100000 }
        ]
      },
      weight: "2.0",
      regulatoryReference: "CHI Prior Authorization Requirements",
      evidenceRequirements: ["Emergency documentation if applicable", "Preauth submission proof"]
    },
    {
      ruleCode: "PA-002",
      name: "Elective Surgery No Preauth",
      description: "Elective surgical procedure without prior authorization violates protocol.",
      category: "preauth_bypass",
      severity: "high",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "claimType", operator: "equals", value: "inpatient" },
          { field: "preAuthNumber", operator: "equals", value: null },
          { field: "totalAmount", operator: "greater_than", value: 40000 }
        ]
      },
      weight: "1.8",
      regulatoryReference: "CHI Elective Procedure Authorization"
    },

    // =============================================================================
    // SERVICE MISMATCH RULES (SM = Service Mismatch) - Service Inconsistencies
    // =============================================================================
    {
      ruleCode: "SM-001",
      name: "Historical Pattern Match",
      description: "historical_pattern_match > 0.7 indicates similarity to known fraud patterns in database.",
      category: "service_mismatch",
      severity: "critical",
      ruleType: "ml_assisted",
      conditions: { 
        and: [
          { field: "historical_pattern_match", operator: "greater_than", value: 0.7 },
          { field: "totalAmount", operator: "greater_than", value: 20000 }
        ]
      },
      weight: "2.0",
      regulatoryReference: "FBI Historical Fraud Pattern Database"
    },
    {
      ruleCode: "SM-002",
      name: "Service Type Inconsistency",
      description: "Inpatient claim with outpatient-typical CPT codes suggests service type mismatch.",
      category: "service_mismatch",
      severity: "high",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "claimType", operator: "equals", value: "inpatient" },
          { field: "cpt", operator: "starts_with", value: "99" },
          { field: "lengthOfStay", operator: "greater_than", value: 3 }
        ]
      },
      weight: "1.5",
      regulatoryReference: "CMS Place of Service Edits"
    },

    // =============================================================================
    // GEOGRAPHIC ANOMALY RULES (GE = Geographic) - Location-Based Detection
    // =============================================================================
    {
      ruleCode: "GE-001",
      name: "Cross-Region Service",
      description: "Patient receiving services in distant region from residence without referral suggests provider shopping.",
      category: "geographic_anomaly",
      severity: "medium",
      ruleType: "pattern",
      conditions: { 
        and: [
          { field: "region_percentile", operator: "greater_than", value: 90 },
          { field: "totalAmount", operator: "greater_than", value: 30000 }
        ]
      },
      weight: "1.3",
      regulatoryReference: "CHI Regional Network Guidelines"
    },
    {
      ruleCode: "GE-002",
      name: "Rural High-Complexity",
      description: "Complex procedure in rural facility lacking specialty capabilities suggests location mismatch.",
      category: "geographic_anomaly",
      severity: "high",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "complexity_score", operator: "greater_than", value: 0.7 },
          { field: "totalAmount", operator: "greater_than", value: 50000 }
        ]
      },
      weight: "1.5",
      regulatoryReference: "CHI Facility Capability Standards"
    },

    // =============================================================================
    // ENTITY RISK RULES (ER = Entity Risk) - Entity-Level Risk Scores
    // =============================================================================
    {
      ruleCode: "ER-001",
      name: "High Provider Risk Score",
      description: "provider_risk_score > 0.8 indicates provider has accumulated high cumulative risk.",
      category: "provider_pattern",
      severity: "critical",
      ruleType: "ml_assisted",
      conditions: { 
        and: [
          { field: "provider_risk_score", operator: "greater_than", value: 0.8 },
          { field: "totalAmount", operator: "greater_than", value: 15000 }
        ]
      },
      weight: "2.0",
      regulatoryReference: "OIG Provider Risk Stratification"
    },
    {
      ruleCode: "ER-002",
      name: "High Member Risk Score",
      description: "member_risk_score > 0.7 indicates patient has accumulated significant risk flags.",
      category: "frequency_abuse",
      severity: "high",
      ruleType: "ml_assisted",
      conditions: { 
        and: [
          { field: "member_risk_score", operator: "greater_than", value: 0.7 },
          { field: "totalAmount", operator: "greater_than", value: 10000 }
        ]
      },
      weight: "1.6",
      regulatoryReference: "CHI Member Risk Management"
    },
    {
      ruleCode: "ER-003",
      name: "High Doctor Risk Score",
      description: "doctor_risk_score > 0.75 indicates referring doctor has pattern of high-risk referrals.",
      category: "kickback",
      severity: "high",
      ruleType: "ml_assisted",
      conditions: { 
        and: [
          { field: "doctor_risk_score", operator: "greater_than", value: 0.75 },
          { field: "totalAmount", operator: "greater_than", value: 20000 }
        ]
      },
      weight: "1.7",
      regulatoryReference: "CHI Referral Integrity Standards"
    },

    // =============================================================================
    // ADDITIONAL CLINICAL PLAUSIBILITY RULES
    // =============================================================================
    {
      ruleCode: "CP-806",
      name: "Pediatric Geriatric Procedure",
      description: "Geriatric-specific procedure codes (hip fracture, dementia care) for pediatric patient under 18.",
      category: "clinical_plausibility",
      severity: "critical",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "cpt", operator: "in", value: ["27235", "27236", "27244", "27245", "99483"] },
          { field: "patientAge", operator: "less_than", value: 18 }
        ]
      },
      weight: "2.0",
      regulatoryReference: "CPT Age-Specific Code Edits"
    },
    {
      ruleCode: "CP-807",
      name: "Bilateral Organ Duplication",
      description: "Bilateral modifier with procedure on unpaired organ (liver, pancreas, brain).",
      category: "clinical_plausibility",
      severity: "critical",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "modifierCode", operator: "in", value: ["50", "RT", "LT"] },
          { field: "cpt", operator: "in", value: ["47600", "47605", "47610", "48150", "61105"] }
        ]
      },
      weight: "2.2",
      regulatoryReference: "CMS Anatomical Modifier Edits"
    },
    {
      ruleCode: "CP-808",
      name: "Impossible Encounter Duration",
      description: "Time-based CPT billing > 24 hours in single encounter is physically impossible.",
      category: "clinical_plausibility",
      severity: "critical",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "cpt", operator: "starts_with", value: "99" },
          { field: "quantity", operator: "greater_than", value: 24 },
          { field: "lengthOfStay", operator: "equals", value: 0 }
        ]
      },
      weight: "2.5",
      regulatoryReference: "CMS Time Bandit Detection Protocol"
    },

    // =============================================================================
    // ADDITIONAL DRUG ABUSE RULES
    // =============================================================================
    {
      ruleCode: "RX-505",
      name: "Opioid Prescription Pattern",
      description: "Multiple opioid prescriptions from different providers within 30 days indicates doctor shopping.",
      category: "drug_abuse",
      severity: "critical",
      ruleType: "pattern",
      conditions: { 
        and: [
          { field: "cpt", operator: "in", value: ["J2310", "J2315", "J1170", "J2175", "J3490"] },
          { field: "member_unique_providers_30d", operator: "greater_than", value: 3 }
        ]
      },
      weight: "2.2",
      regulatoryReference: "SFDA Controlled Substance Monitoring"
    },
    {
      ruleCode: "RX-506",
      name: "Biologic Drug Abuse",
      description: "High-cost biologic medications (>50,000 SAR) without specialty prescriber or diagnosis.",
      category: "drug_abuse",
      severity: "critical",
      ruleType: "combination",
      conditions: { 
        and: [
          { field: "cpt", operator: "in", value: ["J0129", "J0178", "J1300", "J1745", "J2357"] },
          { field: "totalAmount", operator: "greater_than", value: 50000 }
        ]
      },
      weight: "2.0",
      regulatoryReference: "SFDA Biologic Drug Management"
    },

    // =============================================================================
    // ADDITIONAL LAB ABUSE RULES
    // =============================================================================
    {
      ruleCode: "LAB-603",
      name: "Genetic Testing Without Indication",
      description: "Expensive genetic tests ordered without documented family history or clinical indication.",
      category: "lab_abuse",
      severity: "high",
      ruleType: "pattern",
      conditions: { 
        and: [
          { field: "cpt", operator: "in", value: ["81162", "81163", "81164", "81211", "81212", "81213"] },
          { field: "totalAmount", operator: "greater_than", value: 15000 }
        ]
      },
      weight: "1.7",
      regulatoryReference: "ACMG Genetic Testing Guidelines"
    },
    {
      ruleCode: "LAB-604",
      name: "Repeat Lab Same Day",
      description: "Same laboratory test performed multiple times on same day without clinical justification.",
      category: "lab_abuse",
      severity: "high",
      ruleType: "pattern",
      conditions: { 
        and: [
          { field: "cpt", operator: "starts_with", value: "8" },
          { field: "same_day_claims", operator: "greater_than", value: 2 },
          { field: "quantity", operator: "greater_than", value: 1 }
        ]
      },
      weight: "1.5",
      regulatoryReference: "CMS Laboratory NCD Edits"
    }
  ];
  
  let inserted = 0;
  for (const rule of rules) {
    try {
      await db.insert(fwaRulesLibrary).values({
        ruleCode: rule.ruleCode,
        name: rule.name,
        description: rule.description,
        category: rule.category,
        severity: rule.severity,
        ruleType: rule.ruleType,
        conditions: rule.conditions,
        weight: rule.weight,
        regulatoryReference: rule.regulatoryReference || null,
        applicableClaimTypes: rule.applicableClaimTypes || null,
        evidenceRequirements: rule.evidenceRequirements || null,
        isSystemRule: true,
        isActive: true
      });
      inserted++;
    } catch (e) {
      console.error(`Error inserting rule ${rule.ruleCode}:`, e);
    }
  }
  
  console.log(`Seeded ${inserted} FWA detection rules`);
  return inserted;
}

// Force reseed function for updating rules - handles foreign key constraints
export async function reseedFwaRulesLibrary(): Promise<number> {
  // First delete rule hits that reference rules
  const { fwaRuleHits } = await import("@shared/schema");
  await db.delete(fwaRuleHits);
  console.log("Cleared FWA rule hits");
  
  // Now we can safely delete rules
  await db.delete(fwaRulesLibrary);
  console.log("Cleared existing FWA rules library");
  
  // Re-run the seed function - it will insert all 104 rules
  return seedFwaRulesLibrary();
}
