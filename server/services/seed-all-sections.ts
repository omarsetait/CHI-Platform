/**
 * Platform-wide seed script for all major sections.
 * Idempotent — uses onConflictDoNothing everywhere.
 *
 * Covers:
 *  - High-Risk Entities (Providers, Patients, Doctors)
 *  - Entity detection results (5-engine scores + findings)
 *  - FWA enforcement cases (all workflow phases)
 *  - FWA cases + analysis findings + categories + actions
 *  - Pre-Authorization claims, signals, decisions, policy rules
 *  - Intelligence portal (scorecards, DRG, rejections)
 *  - Business portal (employers, violations)
 *  - Members portal (complaints)
 */

import { db } from "../db";
import { count, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import {
  fwaHighRiskProviders,
  fwaHighRiskPatients,
  fwaHighRiskDoctors,
  fwaProviderDetectionResults,
  fwaDoctorDetectionResults,
  fwaPatientDetectionResults,
  fwaDetectionResults,
  doctor360,
  fwaCases,
  fwaAnalysisFindings,
  fwaCategories as fwaCategoriesTable,
  fwaActions as fwaActionsTable,
  enforcementCases,
  preAuthClaims,
  preAuthSignals,
  preAuthDecisions,
  preAuthPolicyRules,
  portalProviders,
  portalEmployers,
  employerPolicies,
  employerViolations,
  portalMembers,
  memberComplaints,
  providerScorecards,
  providerRejections,
  providerDrgAssessments,
  portalInsurers,
  portalRegions,
  memberCoverage,
} from "@shared/schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function h(s: string): number {
  let v = 0;
  for (let i = 0; i < s.length; i++) v = ((v << 5) - v + s.charCodeAt(i)) | 0;
  return Math.abs(v);
}

function d(n: number, dec = 2): string {
  return n.toFixed(dec);
}

function pad(n: number, len: number): string {
  return String(n).padStart(len, "0");
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86400000);
}

async function isEmpty(table: PgTable): Promise<boolean> {
  const result = await db.select({ c: count() }).from(table);
  return Number(result[0]?.c ?? 0) === 0;
}

async function isBelow(table: PgTable, threshold: number): Promise<boolean> {
  const result = await db.select({ c: count() }).from(table);
  return Number(result[0]?.c ?? 0) < threshold;
}

async function batchInsert<TTable extends PgTable>(
  table: TTable,
  rows: TTable["$inferInsert"][],
  size = 50,
) {
  for (let i = 0; i < rows.length; i += size) {
    await db.insert(table).values(rows.slice(i, i + size)).onConflictDoNothing();
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INVESTIGATORS = [
  "Fahad Al-Rashidi", "Noura Al-Dosari", "Ahmed Al-Otaibi", "Maha Al-Harbi", "Sultan Al-Zahrani",
];

const SAUDI_MALE = ["Mohammed", "Ahmed", "Abdullah", "Khalid", "Omar", "Faisal", "Sultan", "Bandar", "Waleed", "Saud"];
const SAUDI_FEMALE = ["Fatima", "Noura", "Sara", "Haya", "Maha", "Lena", "Reem", "Dana", "Abeer", "Rima"];
const SAUDI_FAMILY = ["Al-Rashidi", "Al-Dosari", "Al-Otaibi", "Al-Harbi", "Al-Zahrani", "Al-Ghamdi", "Al-Shehri", "Al-Qahtani", "Al-Mutairi", "Al-Anazi"];

// ---------------------------------------------------------------------------
// 1. High-Risk Providers
// ---------------------------------------------------------------------------

async function seedHighRiskProviders() {
  console.log("[SeedAll] Seeding high-risk providers...");

  const providers = [
    {
      providerId: "PRV-CS1-001", providerName: "Al Noor Dental Center", providerType: "dental_clinic",
      specialty: "Dentistry", organization: "Al Noor Medical Group",
      riskScore: d(93), riskLevel: "critical" as const,
      totalClaims: 245, flaggedClaims: 62, denialRate: d(28.5), avgClaimAmount: d(3200), totalExposure: d(784000),
      claimsPerMonth: d(22.5), cpmTrend: d(14.2), cpmPeerAverage: d(8.5), fwaCaseCount: 2,
      reasons: ["Phantom billing — dental ring", "Root canal on extracted teeth", "Shared patient ring across 4 clinics"],
      lastFlaggedDate: new Date("2026-01-15"),
    },
    {
      providerId: "PRV-CS1-002", providerName: "Smile Plus Clinic", providerType: "dental_clinic",
      specialty: "Dentistry", organization: "Smile Plus Medical",
      riskScore: d(88), riskLevel: "critical" as const,
      totalClaims: 198, flaggedClaims: 51, denialRate: d(26.2), avgClaimAmount: d(2950), totalExposure: d(584100),
      claimsPerMonth: d(19.8), cpmTrend: d(11.5), cpmPeerAverage: d(8.5), fwaCaseCount: 1,
      reasons: ["Porcelain crown rebilled within 14-day window", "Phantom billing suspected"],
      lastFlaggedDate: new Date("2026-01-12"),
    },
    {
      providerId: "PRV-CS2-001", providerName: "Al Hayat Women's Hospital", providerType: "hospital",
      specialty: "OB/GYN", organization: "Al Hayat Medical Group",
      riskScore: d(82), riskLevel: "critical" as const,
      totalClaims: 145, flaggedClaims: 32, denialRate: d(22.3), avgClaimAmount: d(9500), totalExposure: d(1377500),
      claimsPerMonth: d(14.5), cpmTrend: d(8.7), cpmPeerAverage: d(5.2), fwaCaseCount: 1,
      reasons: ["Normal deliveries billed as C-sections", "Upcoding rate 3x peer average"],
      lastFlaggedDate: new Date("2026-01-10"),
    },
    {
      providerId: "PRV-CS3-001", providerName: "Eastern Province Medical Center", providerType: "hospital",
      specialty: "Internal Medicine", organization: "Eastern Health Group",
      riskScore: d(76), riskLevel: "high" as const,
      totalClaims: 312, flaggedClaims: 58, denialRate: d(19.8), avgClaimAmount: d(4800), totalExposure: d(1497600),
      claimsPerMonth: d(31.2), cpmTrend: d(9.1), cpmPeerAverage: d(15.0), fwaCaseCount: 1,
      reasons: ["Cross-insurer duplicate billing", "Same procedure billed to 3 insurers"],
      lastFlaggedDate: new Date("2026-01-18"),
    },
    {
      providerId: "PRV-BG-001", providerName: "Riyadh Specialist Clinic", providerType: "clinic",
      specialty: "Multi-Specialty", organization: "Riyadh Health Services",
      riskScore: d(68), riskLevel: "high" as const,
      totalClaims: 142, flaggedClaims: 21, denialRate: d(15.2), avgClaimAmount: d(2800), totalExposure: d(397600),
      claimsPerMonth: d(14.2), cpmTrend: d(5.8), cpmPeerAverage: d(10.0), fwaCaseCount: 0,
      reasons: ["High denial rate", "Unusual billing volume in Q4"],
      lastFlaggedDate: new Date("2026-01-05"),
    },
    {
      providerId: "PRV-BG-002", providerName: "Dammam Medical Plaza", providerType: "clinic",
      specialty: "General Practice", organization: "Gulf Medical Services",
      riskScore: d(62), riskLevel: "high" as const,
      totalClaims: 119, flaggedClaims: 14, denialRate: d(11.8), avgClaimAmount: d(1950), totalExposure: d(232050),
      claimsPerMonth: d(11.9), cpmTrend: d(3.4), cpmPeerAverage: d(9.0), fwaCaseCount: 0,
      reasons: ["Frequent unbundling patterns", "Modifier misuse"],
      lastFlaggedDate: new Date("2026-01-03"),
    },
    {
      providerId: "PRV-BG-003", providerName: "Jeddah Polyclinic Center", providerType: "polyclinic",
      specialty: "Multi-Specialty", organization: "Jeddah Health Group",
      riskScore: d(55), riskLevel: "high" as const,
      totalClaims: 98, flaggedClaims: 11, denialRate: d(11.2), avgClaimAmount: d(1750), totalExposure: d(171500),
      claimsPerMonth: d(9.8), cpmTrend: d(2.9), cpmPeerAverage: d(7.5), fwaCaseCount: 0,
      reasons: ["Elevated referral churn rate", "Suspicious consultation volume"],
      lastFlaggedDate: new Date("2025-12-28"),
    },
    {
      providerId: "PRV-BG-004", providerName: "Al Ahsa Specialist Hospital", providerType: "hospital",
      specialty: "Cardiology", organization: "Al Ahsa Medical Group",
      riskScore: d(49), riskLevel: "medium" as const,
      totalClaims: 87, flaggedClaims: 8, denialRate: d(9.2), avgClaimAmount: d(5200), totalExposure: d(452400),
      claimsPerMonth: d(8.7), cpmTrend: d(1.8), cpmPeerAverage: d(7.0), fwaCaseCount: 0,
      reasons: ["Moderate denial rate trend"],
      lastFlaggedDate: new Date("2025-12-20"),
    },
  ];

  await batchInsert(fwaHighRiskProviders, providers);
  console.log(`[SeedAll] Inserted ${providers.length} high-risk providers`);
}

// ---------------------------------------------------------------------------
// 2. High-Risk Patients
// ---------------------------------------------------------------------------

async function seedHighRiskPatients() {
  console.log("[SeedAll] Seeding high-risk patients...");

  const patients: (typeof fwaHighRiskPatients.$inferInsert)[] = [];

  // Dental ring patients (10)
  for (let i = 1; i <= 10; i++) {
    const name = `${SAUDI_MALE[(i - 1) % SAUDI_MALE.length]} ${SAUDI_FAMILY[(i - 1) % SAUDI_FAMILY.length]}`;
    patients.push({
      patientId: `PAT-CS1-${pad(i, 3)}`,
      patientName: name,
      memberId: `MBR-${pad(1000 + i, 6)}`,
      riskScore: d(78 + (i % 15)),
      riskLevel: i <= 4 ? "critical" as const : "high" as const,
      totalClaims: 12 + (i * 3),
      flaggedClaims: 6 + (i % 5),
      totalAmount: d(18000 + i * 2200),
      fwaCaseCount: 1,
      primaryDiagnosis: "K04.7 - Periapical abscess without sinus",
      reasons: ["Claims at 3+ dental clinics in same period", "Phantom procedure suspicion", "Doctor shopping pattern"],
      lastClaimDate: new Date("2026-01-20"),
    });
  }

  // OB/GYN upcoding patients (8)
  for (let i = 1; i <= 8; i++) {
    const name = `${SAUDI_FEMALE[(i - 1) % SAUDI_FEMALE.length]} ${SAUDI_FAMILY[(i + 3) % SAUDI_FAMILY.length]}`;
    patients.push({
      patientId: `PAT-CS2-${pad(i, 3)}`,
      patientName: name,
      memberId: `MBR-${pad(2000 + i, 6)}`,
      riskScore: d(65 + (i * 3)),
      riskLevel: "high" as const,
      totalClaims: 3 + (i % 4),
      flaggedClaims: 2 + (i % 3),
      totalAmount: d(12000 + i * 3000),
      fwaCaseCount: 1,
      primaryDiagnosis: "O80 - Single spontaneous delivery",
      reasons: ["Normal delivery billed as C-section", "Upcoding suspicion"],
      lastClaimDate: new Date("2026-01-10"),
    });
  }

  // Cross-insurer duplicate patients (7)
  for (let i = 1; i <= 7; i++) {
    const name = `${SAUDI_MALE[(i + 7) % SAUDI_MALE.length]} ${SAUDI_FAMILY[(i + 6) % SAUDI_FAMILY.length]}`;
    patients.push({
      patientId: `PAT-CS3-${pad(i, 3)}`,
      patientName: name,
      memberId: `MBR-${pad(3000 + i, 6)}`,
      riskScore: d(70 + (i * 2)),
      riskLevel: "high" as const,
      totalClaims: 6 + (i % 4),
      flaggedClaims: 4 + (i % 3),
      totalAmount: d(25000 + i * 5000),
      fwaCaseCount: 1,
      primaryDiagnosis: "M54.5 - Low back pain",
      reasons: ["Same procedure billed to multiple insurers", "Cross-insurer duplicate billing"],
      lastClaimDate: new Date("2026-01-18"),
    });
  }

  await batchInsert(fwaHighRiskPatients, patients);
  console.log(`[SeedAll] Inserted ${patients.length} high-risk patients`);
}

// ---------------------------------------------------------------------------
// 3. High-Risk Doctors
// ---------------------------------------------------------------------------

async function seedHighRiskDoctors() {
  console.log("[SeedAll] Seeding high-risk doctors...");

  const doctors = [
    {
      doctorId: "DOC-CS1-001", doctorName: "Dr. Khalid Al-Rashidi",
      specialty: "Dentistry", licenseNumber: "SCFHS-DEN-001",
      organization: "Al Noor Dental Center",
      riskScore: d(92), riskLevel: "critical" as const,
      totalClaims: 210 + h("DOC-CS1-001") % 50, flaggedClaims: 48 + h("DOC-CS1-001") % 12,
      avgClaimAmount: d(3100), totalExposure: d(651000), fwaCaseCount: 2,
      reasons: ["Phantom billing on extracted teeth", "Impossible procedure sequences", "Shared patient ring"],
      lastFlaggedDate: new Date("2026-01-15"),
    },
    {
      doctorId: "DOC-CS1-002", doctorName: "Dr. Faisal Al-Dosari",
      specialty: "Dentistry", licenseNumber: "SCFHS-DEN-002",
      organization: "Smile Plus Clinic",
      riskScore: d(88), riskLevel: "critical" as const,
      totalClaims: 185 + h("DOC-CS1-002") % 40, flaggedClaims: 42 + h("DOC-CS1-002") % 10,
      avgClaimAmount: d(2900), totalExposure: d(536500), fwaCaseCount: 1,
      reasons: ["Root canal on teeth with no radiograph support", "Shared patient billing ring"],
      lastFlaggedDate: new Date("2026-01-14"),
    },
    {
      doctorId: "DOC-CS1-003", doctorName: "Dr. Omar Al-Otaibi",
      specialty: "Dentistry", licenseNumber: "SCFHS-DEN-003",
      organization: "Riyadh Dental Care",
      riskScore: d(85), riskLevel: "critical" as const,
      totalClaims: 167 + h("DOC-CS1-003") % 30, flaggedClaims: 36 + h("DOC-CS1-003") % 8,
      avgClaimAmount: d(3050), totalExposure: d(509350), fwaCaseCount: 1,
      reasons: ["Crown prep billed without placement", "Phantom billings pattern detected"],
      lastFlaggedDate: new Date("2026-01-12"),
    },
    {
      doctorId: "DOC-CS2-001", doctorName: "Dr. Haya Al-Zahrani",
      specialty: "OB/GYN", licenseNumber: "SCFHS-OBG-001",
      organization: "Al Hayat Women's Hospital",
      riskScore: d(78), riskLevel: "high" as const,
      totalClaims: 140 + h("DOC-CS2-001") % 30, flaggedClaims: 28 + h("DOC-CS2-001") % 8,
      avgClaimAmount: d(9200), totalExposure: d(1288000), fwaCaseCount: 1,
      reasons: ["C-section rate 3x above specialty peer average", "Systematic upcoding of deliveries"],
      lastFlaggedDate: new Date("2026-01-10"),
    },
    {
      doctorId: "DOC-CS2-002", doctorName: "Dr. Sara Al-Ghamdi",
      specialty: "OB/GYN", licenseNumber: "SCFHS-OBG-002",
      organization: "Al Hayat Women's Hospital",
      riskScore: d(74), riskLevel: "high" as const,
      totalClaims: 118 + h("DOC-CS2-002") % 20, flaggedClaims: 21 + h("DOC-CS2-002") % 6,
      avgClaimAmount: d(8800), totalExposure: d(1038400), fwaCaseCount: 1,
      reasons: ["Upcoded prenatal visits", "Documentation gaps for high-complexity billing"],
      lastFlaggedDate: new Date("2026-01-08"),
    },
    {
      doctorId: "DOC-CS3-001", doctorName: "Dr. Abdullah Al-Shehri",
      specialty: "Internal Medicine", licenseNumber: "SCFHS-INT-001",
      organization: "Eastern Province Medical Center",
      riskScore: d(71), riskLevel: "high" as const,
      totalClaims: 95, flaggedClaims: 15,
      avgClaimAmount: d(4500), totalExposure: d(427500), fwaCaseCount: 1,
      reasons: ["Cross-insurer duplicate submissions", "Same-day multi-insurer billing"],
      lastFlaggedDate: new Date("2026-01-18"),
    },
    {
      doctorId: "DOC-BG-001", doctorName: "Dr. Ahmad Al-Farhan",
      specialty: "Pain Management", licenseNumber: "SCFHS-PM-001",
      organization: "King Faisal Specialist Hospital",
      riskScore: d(68), riskLevel: "high" as const,
      totalClaims: 284, flaggedClaims: 51,
      avgClaimAmount: d(1250), totalExposure: d(355000), fwaCaseCount: 1,
      reasons: ["Excessive opioid prescribing", "Self-referral pattern"],
      lastFlaggedDate: new Date("2026-01-05"),
    },
    {
      doctorId: "DOC-BG-002", doctorName: "Dr. Saleh Al-Mutairi",
      specialty: "Orthopedic Surgery", licenseNumber: "SCFHS-OS-001",
      organization: "Saudi German Hospital",
      riskScore: d(63), riskLevel: "high" as const,
      totalClaims: 156, flaggedClaims: 28,
      avgClaimAmount: d(4500), totalExposure: d(702000), fwaCaseCount: 1,
      reasons: ["Unnecessary procedures", "Upcoding in surgical billing"],
      lastFlaggedDate: new Date("2026-01-02"),
    },
    {
      doctorId: "DOC-BG-003", doctorName: "Dr. Layla Al-Shammari",
      specialty: "Dermatology", licenseNumber: "SCFHS-DM-001",
      organization: "Dallah Health Clinic",
      riskScore: d(54), riskLevel: "medium" as const,
      totalClaims: 123, flaggedClaims: 10,
      avgClaimAmount: d(850), totalExposure: d(104550), fwaCaseCount: 0,
      reasons: ["Bundling issues", "Coding inconsistencies"],
      lastFlaggedDate: new Date("2025-12-28"),
    },
    {
      doctorId: "DOC-BG-004", doctorName: "Dr. Omar Al-Dosari",
      specialty: "Cardiology", licenseNumber: "SCFHS-CD-001",
      organization: "Dr. Sulaiman Al Habib Medical Center",
      riskScore: d(48), riskLevel: "medium" as const,
      totalClaims: 215, flaggedClaims: 16,
      avgClaimAmount: d(2100), totalExposure: d(451500), fwaCaseCount: 0,
      reasons: ["Modifier misuse in cardiac billing"],
      lastFlaggedDate: new Date("2025-12-20"),
    },
  ];

  await batchInsert(fwaHighRiskDoctors, doctors);
  console.log(`[SeedAll] Inserted ${doctors.length} high-risk doctors`);
}

// ---------------------------------------------------------------------------
// 4. Provider Detection Results (5-engine)
// ---------------------------------------------------------------------------

async function seedProviderDetectionResults() {
  if (!(await isBelow(fwaProviderDetectionResults, 8))) {
    console.log("[SeedAll] Provider detection results already seeded");
    return;
  }
  console.log("[SeedAll] Seeding provider detection results...");

  const providerData = [
    { id: "PRV-CS1-001", composite: 93, re: 91, stat: 89, uns: 94, rag: 88, sem: 92, level: "critical" as const },
    { id: "PRV-CS1-002", composite: 88, re: 86, stat: 84, uns: 90, rag: 82, sem: 87, level: "critical" as const },
    { id: "PRV-CS2-001", composite: 82, re: 80, stat: 78, uns: 83, rag: 79, sem: 81, level: "critical" as const },
    { id: "PRV-CS3-001", composite: 76, re: 74, stat: 72, uns: 78, rag: 71, sem: 75, level: "high" as const },
    { id: "PRV-BG-001", composite: 68, re: 65, stat: 62, uns: 70, rag: 60, sem: 66, level: "high" as const },
    { id: "PRV-BG-002", composite: 62, re: 59, stat: 57, uns: 64, rag: 55, sem: 60, level: "high" as const },
    { id: "PRV-BG-003", composite: 55, re: 53, stat: 50, uns: 57, rag: 48, sem: 54, level: "high" as const },
    { id: "PRV-BG-004", composite: 49, re: 46, stat: 44, uns: 51, rag: 42, sem: 47, level: "medium" as const },
  ];

  const rows = providerData.map((p) => ({
    providerId: p.id,
    compositeScore: d(p.composite),
    riskLevel: p.level,
    ruleEngineScore: d(p.re),
    statisticalScore: d(p.stat),
    unsupervisedScore: d(p.uns),
    ragLlmScore: d(p.rag),
    semanticScore: d(p.sem),
    ruleEngineFindings: {
      matchedRules: [
        { ruleId: "FWA-BILL-001", ruleName: "Duplicate Billing Pattern", category: "Billing", severity: p.composite >= 85 ? "critical" : "high", confidence: p.composite / 100, description: "Multiple claims for same service period detected" },
        { ruleId: "FWA-UPCD-002", ruleName: "Upcoding Suspicion", category: "Coding", severity: "medium", confidence: (p.re / 100), description: "Higher-level codes used than documentation supports" },
      ],
      patterns: [
        { patternType: "billing_anomaly", description: "Claim volume spike in Q4 2025", evidenceCount: 12 },
      ],
      violationCount: p.composite >= 85 ? 3 : p.composite >= 70 ? 2 : 1,
    },
    statisticalFindings: {
      peerComparison: {
        peerGroupId: `PG-${p.id.split("-")[1]}`,
        peerCount: 24,
        avgClaimAmount: 3200,
        peerAvgClaimAmount: 1800,
        zScore: (p.composite - 50) / 15,
        percentile: p.composite,
      },
      billingPatternAnomalies: [
        { metric: "claims_per_month", value: 22.5, peerAvg: 9.0, deviation: 2.5 },
        { metric: "denial_rate", value: 28.5, peerAvg: 10.0, deviation: 1.85 },
      ],
      trendAnalysis: { direction: "increasing", changePercent: 14.2, significance: 0.95 },
    },
    aggregatedMetrics: {
      totalClaims: 150 + h(p.id) % 100,
      totalAmount: 500000 + h(p.id + "a") % 500000,
      avgClaimAmount: 3000 + h(p.id + "avg") % 2000,
      uniquePatients: 30 + h(p.id + "u") % 40,
      uniqueDoctors: 4 + h(p.id + "d") % 6,
      flaggedClaimsCount: 20 + h(p.id + "f") % 30,
      flaggedClaimsPercent: 18 + h(p.id + "fp") % 15,
      highRiskClaimsCount: 10 + h(p.id + "hr") % 15,
      topProcedureCodes: [
        { code: "D3310", count: 45, amount: 144000 },
        { code: "D2740", count: 38, amount: 114000 },
      ],
      topDiagnosisCodes: [
        { code: "K04.7", count: 62 },
        { code: "K02.1", count: 41 },
      ],
    },
    primaryDetectionMethod: "rule_engine" as const,
    detectionSummary: `Composite risk score ${p.composite}/100. ${p.composite >= 85 ? "Critical" : p.composite >= 70 ? "High" : "Medium"} risk entity with multi-engine corroboration.`,
    recommendedAction: p.composite >= 85 ? "Immediate investigation and claim hold" : p.composite >= 70 ? "Expedited case review" : "Routine monitoring",
    processingTimeMs: 1200 + h(p.id + "t") % 800,
  }));

  await batchInsert(fwaProviderDetectionResults, rows);
  console.log(`[SeedAll] Inserted ${rows.length} provider detection results`);
}

// ---------------------------------------------------------------------------
// 5. Doctor Detection Results (5-engine)
// ---------------------------------------------------------------------------

async function seedDoctorDetectionResults() {
  if (!(await isBelow(fwaDoctorDetectionResults, 10))) {
    console.log("[SeedAll] Doctor detection results already seeded");
    return;
  }
  console.log("[SeedAll] Seeding doctor detection results...");

  const doctorData = [
    { id: "DOC-CS1-001", composite: 92, re: 90, stat: 88, uns: 93, rag: 87, sem: 91, level: "critical" as const },
    { id: "DOC-CS1-002", composite: 88, re: 86, stat: 83, uns: 89, rag: 81, sem: 86, level: "critical" as const },
    { id: "DOC-CS1-003", composite: 85, re: 83, stat: 80, uns: 87, rag: 78, sem: 84, level: "critical" as const },
    { id: "DOC-CS2-001", composite: 78, re: 76, stat: 73, uns: 80, rag: 71, sem: 77, level: "high" as const },
    { id: "DOC-CS2-002", composite: 74, re: 72, stat: 69, uns: 76, rag: 67, sem: 73, level: "high" as const },
    { id: "DOC-CS3-001", composite: 71, re: 69, stat: 66, uns: 73, rag: 64, sem: 70, level: "high" as const },
    { id: "DOC-BG-001", composite: 68, re: 66, stat: 63, uns: 70, rag: 61, sem: 67, level: "high" as const },
    { id: "DOC-BG-002", composite: 63, re: 61, stat: 58, uns: 65, rag: 56, sem: 62, level: "high" as const },
    { id: "DOC-BG-003", composite: 54, re: 52, stat: 49, uns: 56, rag: 47, sem: 53, level: "medium" as const },
    { id: "DOC-BG-004", composite: 48, re: 46, stat: 43, uns: 50, rag: 41, sem: 47, level: "medium" as const },
  ];

  const rows = doctorData.map((doc) => ({
    doctorId: doc.id,
    compositeScore: d(doc.composite),
    riskLevel: doc.level,
    ruleEngineScore: d(doc.re),
    statisticalScore: d(doc.stat),
    unsupervisedScore: d(doc.uns),
    ragLlmScore: d(doc.rag),
    semanticScore: d(doc.sem),
    ruleEngineFindings: {
      matchedRules: [
        { ruleId: "FWA-DOC-001", ruleName: "Excessive Procedure Frequency", category: "Clinical", severity: doc.composite >= 85 ? "critical" : "high", confidence: doc.composite / 100, description: "Procedure frequency significantly exceeds specialty peers" },
      ],
      prescribingPatterns: [
        { patternType: "high_frequency", description: "Volume 2.5x above peer median", evidenceCount: 8 },
      ],
      violationCount: doc.composite >= 80 ? 2 : 1,
    },
    statisticalFindings: {
      specialtyComparison: {
        specialtyCode: doc.id.includes("CS1") ? "DENT" : doc.id.includes("CS2") ? "OBG" : "INT",
        peerCount: 18,
        avgClaimAmount: 4000,
        peerAvgClaimAmount: 2500,
        zScore: (doc.composite - 50) / 14,
        percentile: doc.composite,
      },
      procedureAnomalies: [
        { procedureCode: "D3310", frequency: 45, peerAvgFrequency: 12, deviation: 2.75 },
      ],
      patientVolumeAnalysis: { totalPatients: 95 + h(doc.id) % 60, peerAvgPatients: 45, deviation: 1.2 },
    },
    aggregatedMetrics: {
      totalClaims: 120 + h(doc.id) % 80,
      totalAmount: 300000 + h(doc.id + "a") % 400000,
      avgClaimAmount: 2500 + h(doc.id + "avg") % 3000,
      uniquePatients: 25 + h(doc.id + "u") % 35,
      uniqueProviders: 2 + h(doc.id + "p") % 4,
      flaggedClaimsCount: 15 + h(doc.id + "f") % 20,
      flaggedClaimsPercent: 15 + h(doc.id + "fp") % 12,
      topProcedureCodes: [{ code: "D3310", count: 45, amount: 139500 }],
      topDiagnosisCodes: [{ code: "K04.7", count: 52 }],
      specialtyCode: doc.id.includes("CS1") ? "DENT" : doc.id.includes("CS2") ? "OBG" : "INT",
    },
    primaryDetectionMethod: "rule_engine" as const,
    detectionSummary: `Composite risk ${doc.composite}/100. Pattern corroborated across ${doc.composite >= 80 ? "4" : "3"} detection engines.`,
    recommendedAction: doc.composite >= 80 ? "Open formal investigation" : "Enhanced monitoring",
    processingTimeMs: 900 + h(doc.id + "t") % 600,
  }));

  await batchInsert(fwaDoctorDetectionResults, rows);
  console.log(`[SeedAll] Inserted ${rows.length} doctor detection results`);
}

// ---------------------------------------------------------------------------
// 6. Patient Detection Results (5-engine)
// ---------------------------------------------------------------------------

async function seedPatientDetectionResults() {
  if (!(await isBelow(fwaPatientDetectionResults, 20))) {
    console.log("[SeedAll] Patient detection results already seeded");
    return;
  }
  console.log("[SeedAll] Seeding patient detection results...");

  const rows: (typeof fwaPatientDetectionResults.$inferInsert)[] = [];

  // CS1 dental ring patients
  for (let i = 1; i <= 10; i++) {
    const pid = `PAT-CS1-${pad(i, 3)}`;
    const composite = 78 + (i % 15);
    rows.push({
      patientId: pid,
      compositeScore: d(composite),
      riskLevel: composite >= 85 ? "critical" as const : "high" as const,
      ruleEngineScore: d(composite - 2 + (h(pid + "r") % 5)),
      statisticalScore: d(composite - 4 + (h(pid + "s") % 5)),
      unsupervisedScore: d(composite + 2 - (h(pid + "u") % 4)),
      ragLlmScore: d(composite - 6 + (h(pid + "l") % 5)),
      semanticScore: d(composite - 1 + (h(pid + "e") % 4)),
      ruleEngineFindings: {
        matchedRules: [
          { ruleId: "FWA-PAT-001", ruleName: "Doctor Shopping", category: "Utilization", severity: "high", confidence: composite / 100, description: "Claims at 3+ providers for same condition in same period" },
        ],
        utilizationPatterns: [{ patternType: "multi_provider", description: "Same diagnosis billed at 4 clinics", evidenceCount: 4 }],
        violationCount: 2,
      },
      statisticalFindings: {
        utilizationComparison: { cohortId: "DENTAL-H1", cohortSize: 340, avgClaimsPerYear: 8.5, peerAvgClaimsPerYear: 2.2, zScore: 3.1, percentile: composite },
        providerDiversityAnalysis: { uniqueProviders: 4, peerAvgProviders: 1.5, deviation: 1.67 },
        geographicAnalysis: { primaryCity: "Riyadh", claimCities: ["Riyadh", "Jeddah", "Dammam"], geographicSpread: 3 },
      },
      aggregatedMetrics: {
        totalClaims: 12 + (i * 3),
        totalAmount: 18000 + i * 2200,
        avgClaimAmount: 1500 + (h(pid) % 500),
        uniqueProviders: 3 + (i % 3),
        uniqueDoctors: 3 + (i % 2),
        flaggedClaimsCount: 6 + (i % 5),
        flaggedClaimsPercent: 45 + (i % 20),
        topDiagnosisCodes: [{ code: "K04.7", count: 8 }],
        claimsByCity: { Riyadh: 8, Jeddah: 3, Dammam: 1 },
      },
      primaryDetectionMethod: "rule_engine" as const,
      detectionSummary: `Doctor-shopping pattern detected across ${3 + (i % 2)} providers. Composite risk ${composite}/100.`,
      recommendedAction: composite >= 85 ? "Benefit lock and investigation" : "Case referral for review",
      processingTimeMs: 800 + h(pid + "t") % 400,
    });
  }

  // CS2 OB/GYN patients
  for (let i = 1; i <= 8; i++) {
    const pid = `PAT-CS2-${pad(i, 3)}`;
    const composite = 65 + (i * 3);
    rows.push({
      patientId: pid,
      compositeScore: d(composite),
      riskLevel: "high" as const,
      ruleEngineScore: d(composite - 3 + (h(pid + "r") % 4)),
      statisticalScore: d(composite - 5 + (h(pid + "s") % 4)),
      unsupervisedScore: d(composite + 1 - (h(pid + "u") % 3)),
      ragLlmScore: d(composite - 7 + (h(pid + "l") % 4)),
      semanticScore: d(composite - 2 + (h(pid + "e") % 3)),
      ruleEngineFindings: {
        matchedRules: [{ ruleId: "FWA-PAT-002", ruleName: "Upcoded Service Recipient", category: "Billing", severity: "high", confidence: composite / 100, description: "Patient billed for C-section without clinical evidence" }],
        utilizationPatterns: [{ patternType: "upcoded_service", description: "Normal delivery coded as complex C-section", evidenceCount: 2 }],
        violationCount: 1,
      },
      statisticalFindings: {
        utilizationComparison: { cohortId: "OBG-SAR-2025", cohortSize: 180, avgClaimsPerYear: 4, peerAvgClaimsPerYear: 2.5, zScore: 1.8, percentile: composite },
        providerDiversityAnalysis: { uniqueProviders: 2, peerAvgProviders: 1.3, deviation: 0.54 },
        geographicAnalysis: { primaryCity: "Jeddah", claimCities: ["Jeddah"], geographicSpread: 1 },
      },
      aggregatedMetrics: {
        totalClaims: 3 + (i % 4),
        totalAmount: 12000 + i * 3000,
        avgClaimAmount: 9000 + (h(pid) % 2000),
        uniqueProviders: 1 + (i % 2),
        uniqueDoctors: 1,
        flaggedClaimsCount: 2 + (i % 3),
        flaggedClaimsPercent: 50 + (i % 25),
        topDiagnosisCodes: [{ code: "O80", count: 3 }],
        claimsByCity: { Jeddah: 4 },
      },
      primaryDetectionMethod: "statistical_learning" as const,
      detectionSummary: `Upcoding detected in obstetric services. Composite risk ${composite}/100.`,
      recommendedAction: "Review medical records and provider billing",
      processingTimeMs: 750 + h(pid + "t") % 350,
    });
  }

  // CS3 cross-insurer patients
  for (let i = 1; i <= 7; i++) {
    const pid = `PAT-CS3-${pad(i, 3)}`;
    const composite = 70 + (i * 2);
    rows.push({
      patientId: pid,
      compositeScore: d(composite),
      riskLevel: "high" as const,
      ruleEngineScore: d(composite - 2 + (h(pid + "r") % 4)),
      statisticalScore: d(composite - 4 + (h(pid + "s") % 4)),
      unsupervisedScore: d(composite + 3 - (h(pid + "u") % 4)),
      ragLlmScore: d(composite - 5 + (h(pid + "l") % 4)),
      semanticScore: d(composite - 1 + (h(pid + "e") % 3)),
      ruleEngineFindings: {
        matchedRules: [{ ruleId: "FWA-PAT-003", ruleName: "Cross-Insurer Duplicate", category: "Fraud", severity: "critical", confidence: composite / 100, description: "Identical services billed to 2+ insurers simultaneously" }],
        utilizationPatterns: [{ patternType: "duplicate_billing", description: "Same claim submitted to Bupa + Tawuniya", evidenceCount: 5 }],
        violationCount: 2,
      },
      statisticalFindings: {
        utilizationComparison: { cohortId: "MULTI-INS", cohortSize: 50, avgClaimsPerYear: 12, peerAvgClaimsPerYear: 3, zScore: 3.8, percentile: composite },
        providerDiversityAnalysis: { uniqueProviders: 2, peerAvgProviders: 1.2, deviation: 0.67 },
        geographicAnalysis: { primaryCity: "Dammam", claimCities: ["Dammam", "Khobar"], geographicSpread: 2 },
      },
      aggregatedMetrics: {
        totalClaims: 6 + (i % 4),
        totalAmount: 25000 + i * 5000,
        avgClaimAmount: 4000 + (h(pid) % 2000),
        uniqueProviders: 2 + (i % 2),
        uniqueDoctors: 2,
        flaggedClaimsCount: 4 + (i % 3),
        flaggedClaimsPercent: 60 + (i % 20),
        topDiagnosisCodes: [{ code: "M54.5", count: 5 }],
        claimsByCity: { Dammam: 5, "Al Khobar": 2 },
      },
      primaryDetectionMethod: "rule_engine" as const,
      detectionSummary: `Cross-insurer duplicate billing detected. Composite risk ${composite}/100.`,
      recommendedAction: "Initiate cross-insurer investigation and benefit suspension",
      processingTimeMs: 1000 + h(pid + "t") % 500,
    });
  }

  await batchInsert(fwaPatientDetectionResults, rows);
  console.log(`[SeedAll] Inserted ${rows.length} patient detection results`);
}

// ---------------------------------------------------------------------------
// 7. Enforcement Cases
// ---------------------------------------------------------------------------

async function seedEnforcementCases() {
  console.log("[SeedAll] Seeding enforcement cases...");

  const cases = [
    {
      caseNumber: "ENF-2026-001",
      providerId: "PRV-CS1-001",
      providerName: "Al Noor Dental Center",
      status: "penalty_applied" as const,
      severity: "critical" as const,
      violationCode: "CHI-FWA-BILL-007",
      violationTitle: "Phantom Billing — Dental Ring",
      description: "Provider submitted claims for dental procedures on patients with documented tooth extractions. Cross-clinic coordination pattern involving 4 clinics detected.",
      evidenceSummary: "93 claims totaling SAR 297,600 submitted for procedures on teeth that were previously extracted, as confirmed by radiographic records.",
      findingDate: daysAgo(90),
      warningIssuedDate: daysAgo(75),
      warningDueDate: daysAgo(45),
      correctiveActionDescription: "Immediate suspension of billing privileges and repayment of fraudulent claims",
      correctiveActionDueDate: daysAgo(30),
      correctiveActionCompletedDate: null,
      penaltyType: "fine" as const,
      fineAmount: d(450000),
      penaltyAppliedDate: daysAgo(15),
      assignedInvestigator: "Fahad Al-Rashidi",
      linkedFwaCaseIds: ["FWA-2026-CS1-001"],
      auditTrail: [
        { action: "Case opened", performedBy: "System", timestamp: daysAgo(90).toISOString(), newStatus: "finding" },
        { action: "Warning issued", performedBy: "Fahad Al-Rashidi", timestamp: daysAgo(75).toISOString(), previousStatus: "finding", newStatus: "warning_issued" },
        { action: "Penalty applied", performedBy: "Maha Al-Harbi", timestamp: daysAgo(15).toISOString(), previousStatus: "corrective_action", newStatus: "penalty_applied" },
      ],
    },
    {
      caseNumber: "ENF-2026-002",
      providerId: "PRV-CS2-001",
      providerName: "Al Hayat Women's Hospital",
      status: "corrective_action" as const,
      severity: "critical" as const,
      violationCode: "CHI-FWA-UPCD-003",
      violationTitle: "Systematic Upcoding — Obstetric Services",
      description: "Systematic upcoding of normal vaginal deliveries as cesarean sections. 32 claims identified with SAR 256,000 in excess billing.",
      evidenceSummary: "Statistical analysis shows C-section rate of 68% vs regional average of 22%. Medical record audit confirms 32 cases of upcoded deliveries.",
      findingDate: daysAgo(60),
      warningIssuedDate: daysAgo(45),
      warningDueDate: daysAgo(15),
      correctiveActionDescription: "Corrective billing review and refund of excess payments within 30 days",
      correctiveActionDueDate: daysAgo(5),
      penaltyType: "fine" as const,
      fineAmount: d(280000),
      assignedInvestigator: "Noura Al-Dosari",
      linkedFwaCaseIds: ["FWA-2026-CS2-001"],
      auditTrail: [
        { action: "Case opened", performedBy: "System", timestamp: daysAgo(60).toISOString(), newStatus: "finding" },
        { action: "Warning issued", performedBy: "Noura Al-Dosari", timestamp: daysAgo(45).toISOString(), previousStatus: "finding", newStatus: "warning_issued" },
        { action: "Corrective action required", performedBy: "Noura Al-Dosari", timestamp: daysAgo(30).toISOString(), previousStatus: "warning_issued", newStatus: "corrective_action" },
      ],
    },
    {
      caseNumber: "ENF-2026-003",
      providerId: "PRV-CS3-001",
      providerName: "Eastern Province Medical Center",
      status: "warning_issued" as const,
      severity: "major" as const,
      violationCode: "CHI-FWA-DUP-005",
      violationTitle: "Cross-Insurer Duplicate Billing",
      description: "Provider submitted identical claims to Bupa Arabia and Tawuniya for the same episodes of care. 58 duplicate claims totaling SAR 278,400.",
      evidenceSummary: "Cross-insurer data matching identified 58 duplicate claim pairs across 7 patients. Three insurers affected.",
      findingDate: daysAgo(45),
      warningIssuedDate: daysAgo(30),
      warningDueDate: daysAgo(1),
      correctiveActionDescription: "Repayment of duplicate amounts and implementation of insurer-exclusive billing controls",
      correctiveActionDueDate: daysAgo(-30),
      penaltyType: "fine" as const,
      fineAmount: d(185000),
      assignedInvestigator: "Ahmed Al-Otaibi",
      linkedFwaCaseIds: ["FWA-2026-CS3-001"],
      auditTrail: [
        { action: "Case opened", performedBy: "System", timestamp: daysAgo(45).toISOString(), newStatus: "finding" },
        { action: "Warning issued", performedBy: "Ahmed Al-Otaibi", timestamp: daysAgo(30).toISOString(), previousStatus: "finding", newStatus: "warning_issued" },
      ],
    },
    {
      caseNumber: "ENF-2026-004",
      providerId: "PRV-BG-001",
      providerName: "Riyadh Specialist Clinic",
      status: "finding" as const,
      severity: "major" as const,
      violationCode: "CHI-FWA-BILL-012",
      violationTitle: "Billing Anomaly — Volume Spike",
      description: "Unusual 45% billing volume spike in Q4 2025 with disproportionate high-value procedure codes.",
      evidenceSummary: "Statistical analysis shows billing volume and CPM 2.8x above peer median. Pattern consistent with upcoding.",
      findingDate: daysAgo(20),
      assignedInvestigator: "Sultan Al-Zahrani",
      auditTrail: [
        { action: "Case opened", performedBy: "System", timestamp: daysAgo(20).toISOString(), newStatus: "finding" },
      ],
    },
    {
      caseNumber: "ENF-2026-005",
      providerId: "DOC-BG-001",
      providerName: "Dr. Ahmad Al-Farhan",
      status: "appeal_submitted" as const,
      severity: "major" as const,
      violationCode: "CHI-FWA-PHYS-008",
      violationTitle: "Excessive Opioid Prescribing",
      description: "Physician prescribing opioids at 4x specialty peer rate with documented self-referral kickback pattern.",
      evidenceSummary: "Prescribing data shows 380 opioid scripts vs peer average of 94. Financial relationship with pharmacy chain identified.",
      findingDate: daysAgo(120),
      warningIssuedDate: daysAgo(100),
      warningDueDate: daysAgo(70),
      correctiveActionDescription: "Prescribing restrictions and monitoring program",
      correctiveActionDueDate: daysAgo(55),
      penaltyType: "suspension" as const,
      fineAmount: d(95000),
      penaltyAppliedDate: daysAgo(50),
      appealSubmittedDate: daysAgo(40),
      appealReason: "Provider disputes financial relationship allegation and requests independent review of prescribing data",
      assignedInvestigator: "Maha Al-Harbi",
      linkedFwaCaseIds: ["FWA-2025-003"],
      auditTrail: [
        { action: "Case opened", performedBy: "System", timestamp: daysAgo(120).toISOString(), newStatus: "finding" },
        { action: "Warning issued", performedBy: "Maha Al-Harbi", timestamp: daysAgo(100).toISOString(), previousStatus: "finding", newStatus: "warning_issued" },
        { action: "Penalty applied", performedBy: "Maha Al-Harbi", timestamp: daysAgo(50).toISOString(), previousStatus: "corrective_action", newStatus: "penalty_applied" },
        { action: "Appeal submitted by provider", performedBy: "Provider Portal", timestamp: daysAgo(40).toISOString(), previousStatus: "penalty_applied", newStatus: "appeal_submitted" },
      ],
    },
    {
      caseNumber: "ENF-2025-006",
      providerId: "PRV-BG-002",
      providerName: "Dammam Medical Plaza",
      status: "resolved" as const,
      severity: "moderate" as const,
      violationCode: "CHI-FWA-CODE-009",
      violationTitle: "Systematic Unbundling",
      description: "Provider consistently unbundled procedures that should be billed as single combined codes, inflating claim values by an estimated 28%.",
      evidenceSummary: "Coding audit of 450 claims found systematic unbundling in 38% of surgical claims.",
      findingDate: daysAgo(180),
      warningIssuedDate: daysAgo(165),
      warningDueDate: daysAgo(135),
      correctiveActionDescription: "Rebilling of affected claims and mandatory coding training",
      correctiveActionDueDate: daysAgo(120),
      correctiveActionCompletedDate: daysAgo(95),
      penaltyType: "fine" as const,
      fineAmount: d(72000),
      penaltyAppliedDate: daysAgo(100),
      resolutionDate: daysAgo(30),
      resolutionNotes: "Provider paid fine, completed training, and submitted corrected claims. Case closed.",
      assignedInvestigator: "Fahad Al-Rashidi",
      auditTrail: [
        { action: "Case resolved", performedBy: "Fahad Al-Rashidi", timestamp: daysAgo(30).toISOString(), previousStatus: "penalty_applied", newStatus: "resolved" },
      ],
    },
    {
      caseNumber: "ENF-2025-007",
      providerId: "DOC-BG-002",
      providerName: "Dr. Saleh Al-Mutairi",
      status: "penalty_proposed" as const,
      severity: "major" as const,
      violationCode: "CHI-FWA-PHYS-011",
      violationTitle: "Unnecessary Procedures",
      description: "Orthopedic surgeon performing procedures at 3.2x peer rate without documentation of clinical necessity.",
      evidenceSummary: "Peer comparison shows procedure rate 218% above specialty median. Medical record review of 45 cases identified 18 with insufficient clinical justification.",
      findingDate: daysAgo(75),
      warningIssuedDate: daysAgo(60),
      warningDueDate: daysAgo(30),
      correctiveActionDescription: "Pre-authorization requirement for elective procedures and independent medical review",
      correctiveActionDueDate: daysAgo(15),
      penaltyType: "suspension" as const,
      fineAmount: d(140000),
      assignedInvestigator: "Ahmed Al-Otaibi",
      linkedFwaCaseIds: ["FWA-2025-005"],
      auditTrail: [
        { action: "Case opened", performedBy: "System", timestamp: daysAgo(75).toISOString(), newStatus: "finding" },
        { action: "Penalty proposed", performedBy: "Ahmed Al-Otaibi", timestamp: daysAgo(10).toISOString(), previousStatus: "corrective_action", newStatus: "penalty_proposed" },
      ],
    },
    {
      caseNumber: "ENF-2025-008",
      providerId: "PRV-BG-003",
      providerName: "Jeddah Polyclinic Center",
      status: "finding" as const,
      severity: "moderate" as const,
      violationCode: "CHI-FWA-DOC-002",
      violationTitle: "Documentation Deficiency",
      description: "Systemic documentation gaps for high-complexity billing codes. 42% of reviewed claims lack adequate clinical notes.",
      evidenceSummary: "Documentation audit of 200 outpatient claims found 84 with inadequate notes to support billed complexity.",
      findingDate: daysAgo(14),
      assignedInvestigator: "Sultan Al-Zahrani",
      auditTrail: [
        { action: "Case opened", performedBy: "System", timestamp: daysAgo(14).toISOString(), newStatus: "finding" },
      ],
    },
  ];

  await batchInsert(enforcementCases, cases);
  console.log(`[SeedAll] Inserted ${cases.length} enforcement cases`);
}

// ---------------------------------------------------------------------------
// 8. FWA Cases + Analysis Findings + Categories + Actions
// ---------------------------------------------------------------------------

async function seedFwaCasesAndFindings() {
  console.log("[SeedAll] Seeding FWA cases and findings...");

  const caseDefs = [
    { caseId: "FWA-2026-CS1-001", claimId: "CLM-CHI-00001", providerId: "PRV-CS1-001", patientId: "PAT-CS1-001", category: "management", status: "action_pending" as const, phase: "a3_action" as const, priority: "critical" as const, totalAmount: "784000.00", recoveryAmount: "0.00", assignedTo: "FWA Unit Team A" },
    { caseId: "FWA-2026-CS2-001", claimId: "CLM-CHI-00010", providerId: "PRV-CS2-001", patientId: "PAT-CS2-001", category: "coding", status: "action_pending" as const, phase: "a2_categorization" as const, priority: "critical" as const, totalAmount: "1377500.00", recoveryAmount: "0.00", assignedTo: "FWA Unit Team B" },
    { caseId: "FWA-2026-CS3-001", claimId: "CLM-CHI-00020", providerId: "PRV-CS3-001", patientId: "PAT-CS3-001", category: "management", status: "analyzing" as const, phase: "a1_analysis" as const, priority: "high" as const, totalAmount: "1497600.00", recoveryAmount: "0.00", assignedTo: "FWA Unit Team A" },
    { caseId: "FWA-2025-001", claimId: "CLM-CHI-00030", providerId: "PRV-BG-001", patientId: "PAT-CS1-005", category: "coding", status: "analyzing" as const, phase: "a2_categorization" as const, priority: "high" as const, totalAmount: "397600.00", recoveryAmount: "0.00", assignedTo: "FWA Unit Team C" },
    { caseId: "FWA-2025-002", claimId: "CLM-CHI-00031", providerId: "PRV-BG-002", patientId: "PAT-CS3-001", category: "coding", status: "escalated" as const, phase: "a3_action" as const, priority: "high" as const, totalAmount: "232050.00", recoveryAmount: "185000.00", assignedTo: "FWA Unit Team B" },
    { caseId: "FWA-2025-003", claimId: "CLM-CHI-00032", providerId: "DOC-BG-001", patientId: "PAT-CS1-002", category: "physician", status: "action_pending" as const, phase: "a3_action" as const, priority: "critical" as const, totalAmount: "355000.00", recoveryAmount: "0.00", assignedTo: "FWA Unit Team A" },
    { caseId: "FWA-2025-004", claimId: "CLM-CHI-00033", providerId: "DOC-CS1-001", patientId: "PAT-CS1-003", category: "physician", status: "resolved" as const, phase: "a3_action" as const, priority: "high" as const, totalAmount: "178000.00", recoveryAmount: "156000.00", assignedTo: "FWA Unit Team C" },
    { caseId: "FWA-2025-005", claimId: "CLM-CHI-00034", providerId: "DOC-BG-002", patientId: "PAT-CS2-001", category: "physician", status: "analyzing" as const, phase: "a1_analysis" as const, priority: "high" as const, totalAmount: "702000.00", recoveryAmount: "0.00", assignedTo: "FWA Unit Team B" },
  ];

  // Insert cases and retrieve UUID→caseId mapping
  await batchInsert(fwaCases, caseDefs);

  const inserted = await db.select({ id: fwaCases.id, caseId: fwaCases.caseId }).from(fwaCases);
  const idByCaseId = new Map(inserted.map((r) => [r.caseId, r.id]));
  console.log(`[SeedAll] Inserted/verified ${caseDefs.length} FWA cases`);

  // Seed analysis findings (reference fwaCases.id UUID)
  const findings: (typeof fwaAnalysisFindings.$inferInsert)[] = [];
  for (const c of caseDefs) {
    const fkId = idByCaseId.get(c.caseId);
    if (!fkId) continue;
    findings.push({
      caseId: fkId,
      findingType: "pattern" as const,
      source: "claims_data" as const,
      description: `Statistical anomaly detected: claim volume and value significantly exceed peer benchmarks for ${c.category} category.`,
      confidence: d(0.85 + (h(c.caseId) % 12) / 100),
      severity: c.priority,
      evidence: { claimCount: 30 + h(c.caseId) % 50, peerDeviation: 2.5, detectionMethod: "rule_engine" },
    });
    findings.push({
      caseId: fkId,
      findingType: "correlation" as const,
      source: "explainability_report" as const,
      description: `High correlation (${(0.85 + (h(c.caseId + "c") % 12) / 100).toFixed(2)}) between billing anomalies and provider peer group outlier status.`,
      confidence: d(0.78 + (h(c.caseId + "cf") % 15) / 100),
      severity: c.priority === "critical" ? "high" as const : "medium" as const,
      evidence: { correlationScore: 0.87, referenceCase: "ENF-2026-001", detectionEngine: "statistical" },
    });
    if (c.phase !== "a1_analysis") {
      findings.push({
        caseId: fkId,
        findingType: "anomaly" as const,
        source: "denial_data" as const,
        description: "Denial rate significantly below peer average despite high risk indicators — suggesting successful claim manipulation.",
        confidence: d(0.72 + (h(c.caseId + "a") % 18) / 100),
        severity: "medium" as const,
        evidence: { denialRate: 5.2, peerDenialRate: 18.4, anomalyType: "low_denial_high_risk" },
      });
    }
  }
  await batchInsert(fwaAnalysisFindings, findings);
  console.log(`[SeedAll] Inserted ${findings.length} FWA analysis findings`);

  // Seed categories for A2/A3 cases
  const categories: (typeof fwaCategoriesTable.$inferInsert)[] = [];
  const a2Cases = caseDefs.filter((c) => c.phase === "a2_categorization" || c.phase === "a3_action");
  for (const c of a2Cases) {
    const fkId = idByCaseId.get(c.caseId);
    if (!fkId) continue;
    categories.push({
      caseId: fkId,
      categoryType: c.category as "coding" | "management" | "physician" | "patient",
      subCategory: c.category === "coding" ? "Upcoding" : c.category === "management" ? "Phantom Billing" : "Self-Referral",
      evidenceChain: { ruleMatches: 3, statisticalOutlier: true, ragConfirmation: 0.88 },
      confidenceScore: d(0.85 + (h(c.caseId + "cat") % 12) / 100),
      severityScore: d(c.priority === "critical" ? 9.2 : 7.8),
      recommendedActions: [
        "Issue formal warning letter",
        "Request complete billing records",
        c.priority === "critical" ? "Refer to enforcement division" : "Schedule follow-up audit",
      ],
    });
  }
  await batchInsert(fwaCategoriesTable, categories);

  // Seed actions for A3 cases
  const actions: (typeof fwaActionsTable.$inferInsert)[] = [];
  const a3Cases = caseDefs.filter((c) => c.phase === "a3_action");
  for (const c of a3Cases) {
    const fkId = idByCaseId.get(c.caseId);
    if (!fkId) continue;
    actions.push({
      caseId: fkId,
      actionType: "recovery" as const,
      actionTrack: "historical_claims" as const,
      status: c.status === "resolved" ? "completed" as const : "in_progress" as const,
      amount: c.recoveryAmount !== "0.00" ? c.recoveryAmount : String(parseFloat(c.totalAmount) * 0.4),
      justification: `Recovery action initiated based on ${c.category} FWA finding with confidence score above 85%.`,
      auditTrail: { initiatedBy: "FWA System", initiatedAt: new Date().toISOString() },
      executedBy: INVESTIGATORS[h(c.caseId) % INVESTIGATORS.length],
      executedAt: c.status === "resolved" ? new Date() : null,
    });
    if (c.priority === "critical") {
      actions.push({
        caseId: fkId,
        actionType: "preventive" as const,
        actionTrack: "live_claims" as const,
        status: "in_progress" as const,
        justification: "Preventive claim hold on future submissions pending investigation resolution.",
        auditTrail: { initiatedBy: "FWA System", initiatedAt: new Date().toISOString() },
        executedBy: INVESTIGATORS[h(c.caseId + "p") % INVESTIGATORS.length],
      });
    }
  }
  await batchInsert(fwaActionsTable, actions);
  console.log(`[SeedAll] Inserted ${categories.length} categories and ${actions.length} actions`);
}

// ---------------------------------------------------------------------------
// 9. Pre-Auth Claims + Signals + Decisions + Policy Rules
// ---------------------------------------------------------------------------

async function seedPreAuthFull() {
  console.log("[SeedAll] Seeding pre-auth claims, signals, decisions...");

  const payerIds = ["BUPA-001", "TAWUNIYA-001", "MEDGULF-001", "ALRAJHI-001", "SAICO-001"];
  const providerIds = ["PRV-001", "PRV-004", "PRV-013", "PRV-021", "PRV-023", "PRV-026"];
  const serviceTypes = [
    { svc: "Cardiac Surgery", icd: "I25.10", cpt: "33533", baseAmt: 185000, specialty: "Cardiology" },
    { svc: "Spinal Fusion", icd: "M54.5", cpt: "22612", baseAmt: 125000, specialty: "Orthopedic Surgery" },
    { svc: "Cholecystectomy", icd: "K80.20", cpt: "47562", baseAmt: 28000, specialty: "General Surgery" },
    { svc: "Total Knee Replacement", icd: "M17.11", cpt: "27447", baseAmt: 95000, specialty: "Orthopedic Surgery" },
    { svc: "Coronary Stenting", icd: "I25.11", cpt: "92928", baseAmt: 145000, specialty: "Cardiology" },
    { svc: "MRI Brain", icd: "G43.9", cpt: "70553", baseAmt: 3800, specialty: "Radiology" },
    { svc: "Maternity — C-Section", icd: "O82", cpt: "59510", baseAmt: 18000, specialty: "OB/GYN" },
    { svc: "Pain Management Procedure", icd: "G89.29", cpt: "64483", baseAmt: 8500, specialty: "Pain Management" },
    { svc: "Mental Health Therapy", icd: "F41.1", cpt: "90837", baseAmt: 2400, specialty: "Psychiatry" },
    { svc: "Hip Replacement", icd: "M16.11", cpt: "27130", baseAmt: 88000, specialty: "Orthopedic Surgery" },
    { svc: "Chemotherapy", icd: "C50.911", cpt: "96413", baseAmt: 22000, specialty: "Oncology" },
    { svc: "Dialysis Session", icd: "N18.6", cpt: "90935", baseAmt: 4500, specialty: "Nephrology" },
    { svc: "Endoscopy with Biopsy", icd: "K21.0", cpt: "43239", baseAmt: 9500, specialty: "Gastroenterology" },
    { svc: "Physiotherapy Package", icd: "M54.5", cpt: "97110", baseAmt: 6200, specialty: "Physiotherapy" },
    { svc: "Cataract Surgery", icd: "H26.9", cpt: "66984", baseAmt: 12000, specialty: "Ophthalmology" },
  ];

  const statuses = [
    "approved", "approved", "approved", "approved",
    "pending_review", "pending_review", "pending_review",
    "rejected", "rejected",
    "analyzing", "analyzing",
    "aggregated", "aggregated",
    "ingested",
    "request_info",
  ] as const;

  // Build 25 claims (skip existing ones by using unique claimIds)
  const newClaims: (typeof preAuthClaims.$inferInsert)[] = [];
  for (let i = 6; i <= 30; i++) {
    const svcIdx = (i - 1) % serviceTypes.length;
    const svc = serviceTypes[svcIdx];
    const status = statuses[(i - 1) % statuses.length];
    const phase = status === "approved" ? 5 : status === "rejected" ? 5 : status === "aggregated" ? 4 : status === "pending_review" ? 3 : status === "analyzing" ? 2 : 1;

    newClaims.push({
      claimId: `PA-2026-${pad(i, 4)}`,
      payerId: payerIds[(i - 1) % payerIds.length],
      memberId: `MBR-PA-${pad(5000 + i, 6)}`,
      memberDob: `${1960 + (i % 35)}-${pad(1 + (i % 12), 2)}-${pad(1 + (i % 28), 2)}`,
      memberGender: i % 3 === 0 ? "Female" : "Male",
      policyPlanId: `${payerIds[(i - 1) % payerIds.length]}-GOLD-2026`,
      providerId: providerIds[(i - 1) % providerIds.length],
      specialty: svc.specialty,
      networkStatus: "in_network",
      encounterType: svc.baseAmt > 20000 ? "inpatient" : "outpatient",
      totalAmount: d(svc.baseAmt * (0.9 + (h(`PA-2026-${i}`) % 20) / 100), 2),
      diagnoses: [{ code_system: "ICD-10", code: svc.icd, desc: svc.svc, type: "principal" }],
      lineItems: [{ line_id: "L1", code_type: "CPT", code: svc.cpt, desc: svc.svc, units: 1, net_amount: svc.baseAmt }],
      status,
      priority: svc.baseAmt > 50000 ? "HIGH" as const : svc.baseAmt > 15000 ? "NORMAL" as const : "LOW" as const,
      processingPhase: phase,
    });
  }

  await batchInsert(preAuthClaims, newClaims);
  console.log(`[SeedAll] Inserted ${newClaims.length} pre-auth claims`);

  // Seed signals for processed claims (phases 2+)
  const processedClaims = newClaims.filter((c) => (c.processingPhase ?? 0) >= 2);
  const signals: (typeof preAuthSignals.$inferInsert)[] = [];
  const detectors = ["regulatory_compliance", "coverage_eligibility", "clinical_necessity", "past_patterns", "disclosure_check"] as const;
  const recommendations = ["APPROVE", "REJECT", "PEND_REVIEW"] as const;

  for (const claim of processedClaims) {
    const numSignals = 3 + (h(claim.claimId) % 3);
    for (let d2 = 0; d2 < numSignals; d2++) {
      const detector = detectors[d2 % detectors.length];
      const isHighRisk = claim.status === "rejected";
      const rec = isHighRisk ? "REJECT" : claim.status === "pending_review" && d2 === 0 ? "PEND_REVIEW" : "APPROVE";
      signals.push({
        claimId: claim.claimId,
        detector,
        signalId: `SIG-${claim.claimId}-${d2 + 1}`,
        riskFlag: isHighRisk || (claim.status === "pending_review" && d2 === 1),
        severity: isHighRisk ? "HIGH" as const : claim.status === "pending_review" ? "MEDIUM" as const : "LOW" as const,
        confidence: d(isHighRisk ? 0.88 + (h(claim.claimId + d2) % 10) / 100 : 0.75 + (h(claim.claimId + d2) % 20) / 100, 4),
        recommendation: rec,
        rationale: isHighRisk
          ? `${detector} check failed: claim does not meet policy requirements for ${claim.specialty}`
          : `${detector} check passed with confidence ${(0.85 + d2 * 0.02).toFixed(2)}`,
        evidence: [{ source: detector, quote: `Policy clause ${1000 + d2} — ${claim.specialty} authorization requirement`, clause_id: `CL-${1000 + d2}` }],
        isHardStop: isHighRisk && detector === "coverage_eligibility",
      });
    }
  }

  // We need the claim IDs from the DB after insert
  // Since we used onConflictDoNothing and claimId is unique, fetch and link
  try {
    const dbClaims = await db.select({ id: preAuthClaims.id, claimId: preAuthClaims.claimId }).from(preAuthClaims);
    const claimIdMap = new Map(dbClaims.map((c) => [c.claimId, c.id]));
    const linkedSignals = signals.map((s) => ({ ...s, claimId: claimIdMap.get(s.claimId) || s.claimId })).filter((s) => s.claimId);
    await batchInsert(preAuthSignals, linkedSignals);
    console.log(`[SeedAll] Inserted ${linkedSignals.length} pre-auth signals`);

    // Seed decisions for aggregated+ claims
    const decisions: (typeof preAuthDecisions.$inferInsert)[] = [];
    const processedDbClaims = dbClaims.filter((c) => {
      const claim = newClaims.find((nc) => nc.claimId === c.claimId);
      return claim && (claim.processingPhase ?? 0) >= 4;
    });
    for (const dc of processedDbClaims) {
      const claim = newClaims.find((nc) => nc.claimId === dc.claimId)!;
      const isApproved = claim.status === "approved";
      decisions.push({
        claimId: dc.id,
        aggregatedScore: d(isApproved ? 0.15 + (h(dc.claimId) % 20) / 100 : 0.75 + (h(dc.claimId) % 20) / 100, 4),
        riskLevel: isApproved ? "LOW" as const : "HIGH" as const,
        hasHardStop: !isApproved,
        candidates: [
          { rank: 1, recommendation: isApproved ? "APPROVE" : "REJECT", score: isApproved ? 0.88 : 0.91, rationale: isApproved ? "All signals pass. Clinical necessity confirmed." : "Coverage eligibility hard stop triggered." },
          { rank: 2, recommendation: "PEND_REVIEW", score: isApproved ? 0.12 : 0.09, rationale: "Secondary option — pending additional documentation." },
        ],
        topRecommendation: isApproved ? "APPROVE" as const : "REJECT" as const,
        safetyCheckPassed: true,
        isFinal: true,
      });
    }
    await batchInsert(preAuthDecisions, decisions);
    console.log(`[SeedAll] Inserted ${decisions.length} pre-auth decisions`);
  } catch (err) {
    console.error("[SeedAll] Error seeding pre-auth signals/decisions:", err);
  }

  // Seed policy rules (ruleId is unique — duplicates skipped)
  const rules = [
    { ruleId: "RULE-CHI-001", ruleName: "High-Cost Procedure Flag", ruleType: "cost_threshold", layer: 1, condition: { field: "total_amount", operator: "gt", value: 50000 }, action: "PEND_REVIEW", severity: "HIGH" as const },
    { ruleId: "RULE-CHI-002", ruleName: "Diagnosis-Procedure Mismatch", ruleType: "clinical_validation", layer: 2, condition: { field: "icd_cpt_pair", operator: "mismatch", value: "semantic_check" }, action: "PEND_REVIEW", severity: "MEDIUM" as const },
    { ruleId: "RULE-CHI-003", ruleName: "Peer Outlier Detection", ruleType: "statistical_outlier", layer: 2, condition: { field: "procedure_frequency", operator: "gt_percentile", value: 95 }, action: "PEND_REVIEW", severity: "HIGH" as const },
    { ruleId: "RULE-CHI-004", ruleName: "Guideline Deviation Alert", ruleType: "clinical_guideline", layer: 2, condition: { field: "treatment_protocol", operator: "deviates", value: "SCFHS_guidelines" }, action: "PEND_REVIEW", severity: "MEDIUM" as const },
    { ruleId: "RULE-CHI-005", ruleName: "Network Status Verification", ruleType: "eligibility", layer: 1, condition: { field: "network_status", operator: "eq", value: "out_of_network" }, action: "REJECT", severity: "HIGH" as const },
    { ruleId: "RULE-CHI-006", ruleName: "Prior Authorization Required", ruleType: "authorization", layer: 1, condition: { field: "requires_prior_auth", operator: "eq", value: true }, action: "PEND_REVIEW", severity: "HIGH" as const },
    { ruleId: "RULE-CHI-007", ruleName: "Duplicate Claim Check", ruleType: "duplicate_detection", layer: 1, condition: { field: "claim_within_30_days", operator: "eq", value: true }, action: "REJECT", severity: "HIGH" as const },
    { ruleId: "RULE-CHI-008", ruleName: "Policy Coverage Verification", ruleType: "coverage", layer: 1, condition: { field: "service_covered", operator: "eq", value: false }, action: "REJECT", severity: "HIGH" as const },
  ];
  await batchInsert(preAuthPolicyRules, rules);
  console.log(`[SeedAll] Upserted ${rules.length} pre-auth policy rules (duplicates skipped)`);
}

// ---------------------------------------------------------------------------
// 10. Intelligence Portal (provider scorecards, DRG assessments, rejections)
// ---------------------------------------------------------------------------

async function seedIntelligencePortal() {
  const providers = await db.select({ code: portalProviders.code }).from(portalProviders);
  if (providers.length === 0) {
    console.log("[SeedAll] Cannot seed intelligence portal: no providers");
    return;
  }

  // Seed scorecards for last 6 months — onConflictDoNothing skips existing (providerCode, month) pairs
  console.log("[SeedAll] Seeding provider scorecards...");
  const months = ["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"];
  const scorecards: (typeof providerScorecards.$inferInsert)[] = [];
  for (const { code } of providers.slice(0, 52)) {
    const hv = h(code);
    const baseOverall = 55 + hv % 40;
    for (let i = 0; i < months.length; i++) {
      scorecards.push({
        providerCode: code,
        month: months[i],
        overallScore: d(Math.min(98, baseOverall + i * 0.5)),
        codingAccuracy: d(Math.min(98, 58 + hv % 35 + i * 0.4)),
        rejectionRate: d(Math.max(2, 25 - hv % 18 - i * 0.3)),
        sbsCompliance: d(Math.min(98, 50 + hv % 40 + i * 0.8)),
        drgReadiness: d(Math.min(95, 30 + hv % 50 + i * 1.2)),
        documentationQuality: d(Math.min(98, 55 + hv % 38 + i * 0.6)),
        fwaRisk: d(5 + hv % 25),
        peerRankPercentile: 20 + hv % 70,
        trend: baseOverall > 75 ? "improving" : baseOverall > 60 ? "stable" : "declining",
      });
    }
  }
  await batchInsert(providerScorecards, scorecards);
  console.log(`[SeedAll] Upserted ${scorecards.length} provider scorecards (duplicates skipped)`);

  // Seed DRG assessments — onConflictDoNothing skips existing (providerCode, criteriaName) pairs
  console.log("[SeedAll] Seeding DRG assessments...");
  const DRG_CRITERIA = [
    { name: "Clinical Coder Certification", description: "All coders hold ACHI/ICD-10-AM certification", peerRate: "72" },
    { name: "ICD-10-AM V12 Adoption", description: "Facility uses ICD-10-AM V12 for all coding", peerRate: "85" },
    { name: "ACHI Procedure Coding", description: "Procedures coded using ACHI standards", peerRate: "78" },
    { name: "Grouper Software Installed", description: "AR-DRG grouper software installed and tested", peerRate: "67" },
    { name: "DRG-Based Costing Model", description: "Activity-based costing aligned with DRG weights", peerRate: "45" },
    { name: "Clinical Documentation Standards", description: "Standardized clinical documentation templates in use", peerRate: "82" },
    { name: "Unbundling Compliance", description: "Claims review for unbundled billing", peerRate: "38" },
    { name: "Staff Training Program", description: "Ongoing DRG training for clinical staff", peerRate: "71" },
  ];
  const drg: (typeof providerDrgAssessments.$inferInsert)[] = [];
  for (const { code } of providers.slice(0, 52)) {
    const readiness = 30 + h(code) % 60;
    const completeCount = Math.round((readiness / 100) * DRG_CRITERIA.length);
    DRG_CRITERIA.forEach((c, i) => {
      drg.push({
        providerCode: code,
        criteriaName: c.name,
        criteriaDescription: c.description,
        status: i < completeCount ? "complete" as const : i === completeCount ? "in_progress" as const : "not_started" as const,
        gapDescription: i >= completeCount ? `${c.name} not yet finalized` : null,
        recommendedAction: i >= completeCount ? `Complete ${c.name.toLowerCase()} and schedule verification audit` : null,
        targetDate: i >= completeCount ? new Date(2026, 3 + i, 1) : null,
        peerCompletionRate: c.peerRate,
        sortOrder: i,
      });
    });
  }
  await batchInsert(providerDrgAssessments, drg);
  console.log(`[SeedAll] Upserted ${drg.length} DRG assessment records (duplicates skipped)`);

  // Seed rejection records
  {
    console.log("[SeedAll] Seeding provider rejections...");
    const ICD = ["J18.9", "E11.9", "K80.2", "M54.5", "I10", "J06.9", "L30.9", "S82.0"];
    const CPT = ["71046", "99213", "47562", "73721", "80053", "99214", "43239", "27447"];
    const categories = ["missing_documentation", "code_mismatch", "medical_necessity", "preauth_expired"];
    const rejections: (typeof providerRejections.$inferInsert)[] = [];
    let seq = 10000;
    for (const { code } of providers.slice(0, 52)) {
      const n = 5 + h(code) % 12;
      for (let j = 0; j < n; j++) {
        const seed = `${code}-${j}`;
        const cat = categories[h(seed + "cat") % categories.length];
        const dayOffset = h(seed + "d") % 150;
        const claimDate = new Date(2025, 9, 1 + dayOffset);
        rejections.push({
          providerCode: code,
          claimRef: `CLM-2026-${++seq}`,
          patientMrn: `MRN-${String(100000 + h(seed + "m") % 900000)}`,
          icdCode: ICD[h(seed) % ICD.length],
          icdDescription: "Diagnosis code",
          cptCode: CPT[h(seed + "c") % CPT.length],
          cptDescription: "Procedure code",
          denialReason: "See denial category",
          denialCategory: cat,
          amountSar: d(200 + h(seed + "a") % 14800),
          recommendation: "Review and resubmit with correct documentation",
          claimDate,
          denialDate: new Date(claimDate.getTime() + (3 + h(seed + "dd") % 10) * 86400000),
        });
      }
    }
    await batchInsert(providerRejections, rejections);
    console.log(`[SeedAll] Inserted ${rejections.length} provider rejection records`);
  }
}

// ---------------------------------------------------------------------------
// 11. Portal Base Data (insurers, regions, providers, employers, members)
// ---------------------------------------------------------------------------

async function seedPortalBaseData() {
  const insurers = [
    { code: "INS-001", name: "Bupa Arabia", nameAr: "بوبا العربية", licenseNo: "CCHI-INS-001", marketShare: "22.4", lossRatio: "78.2", capitalAdequacy: "185.0", healthStatus: "healthy" as const, premiumVolumeSar: "8200000000.00" },
    { code: "INS-002", name: "Tawuniya", nameAr: "التعاونية", licenseNo: "CCHI-INS-002", marketShare: "19.4", lossRatio: "82.1", capitalAdequacy: "172.0", healthStatus: "healthy" as const, premiumVolumeSar: "7100000000.00" },
    { code: "INS-003", name: "MedGulf", nameAr: "ميدغلف", licenseNo: "CCHI-INS-003", marketShare: "12.8", lossRatio: "85.4", capitalAdequacy: "148.0", healthStatus: "watch" as const, premiumVolumeSar: "4700000000.00" },
    { code: "INS-004", name: "Al Rajhi Takaful", nameAr: "تكافل الراجحي", licenseNo: "CCHI-INS-004", marketShare: "8.6", lossRatio: "76.5", capitalAdequacy: "192.0", healthStatus: "healthy" as const, premiumVolumeSar: "3150000000.00" },
    { code: "INS-005", name: "SAICO", nameAr: "سايكو", licenseNo: "CCHI-INS-005", marketShare: "5.4", lossRatio: "89.2", capitalAdequacy: "128.0", healthStatus: "at_risk" as const, premiumVolumeSar: "1980000000.00" },
    { code: "INS-006", name: "Walaa Insurance", nameAr: "ولاء للتأمين", licenseNo: "CCHI-INS-006", marketShare: "4.2", lossRatio: "70.8", capitalAdequacy: "210.0", healthStatus: "healthy" as const, premiumVolumeSar: "1540000000.00" },
  ];
  await batchInsert(portalInsurers, insurers);
  console.log("[SeedAll] Upserted portal insurers (duplicates skipped)");

  const regions = [
    { code: "RIY", name: "Riyadh", nameAr: "الرياض", population: 8600000, insuredCount: 7740000, providerCount: 12, coverageRate: "90.0" },
    { code: "MAK", name: "Makkah", nameAr: "مكة المكرمة", population: 9000000, insuredCount: 7650000, providerCount: 8, coverageRate: "85.0" },
    { code: "EST", name: "Eastern Province", nameAr: "المنطقة الشرقية", population: 5100000, insuredCount: 4590000, providerCount: 6, coverageRate: "90.0" },
    { code: "MDN", name: "Madinah", nameAr: "المدينة المنورة", population: 2200000, insuredCount: 1848000, providerCount: 4, coverageRate: "84.0" },
    { code: "ASR", name: "Asir", nameAr: "عسير", population: 2300000, insuredCount: 1725000, providerCount: 3, coverageRate: "75.0" },
  ];
  await batchInsert(portalRegions, regions);
  console.log("[SeedAll] Upserted portal regions (duplicates skipped)");

  const providers = [
    { code: "PRV-001", name: "Riyadh Care Hospital", nameAr: "مستشفى رعاية الرياض", licenseNo: "MOH-RC-001", region: "RIY", city: "Riyadh", type: "tertiary_hospital" as const, bedCount: 450, specialties: ["Internal Medicine", "Cardiology", "Orthopedics"], accreditationStatus: "accredited" as const, phone: "+966-1-200-0001", email: "info@riyadhcare.sa", latitude: "24.68", longitude: "46.72", acceptedInsurers: ["INS-001", "INS-002", "INS-003"], languages: ["Arabic", "English"], rating: "4.6", reviewCount: 342, avgWaitMinutes: 18, workingHours: "Sun-Thu 7:00-22:00" },
    { code: "PRV-004", name: "Dr. Sulaiman Al Habib Hospital", nameAr: "مستشفى الدكتور سليمان الحبيب", licenseNo: "MOH-SH-004", region: "RIY", city: "Riyadh", type: "tertiary_hospital" as const, bedCount: 400, specialties: ["Cardiology", "Neurology", "Orthopedics"], accreditationStatus: "accredited" as const, phone: "+966-1-200-0004", email: "info@hmg.sa", latitude: "24.72", longitude: "46.68", acceptedInsurers: ["INS-001", "INS-002", "INS-003"], languages: ["Arabic", "English", "Urdu"], rating: "4.7", reviewCount: 678, avgWaitMinutes: 20, workingHours: "Sun-Thu 7:00-22:00" },
    { code: "PRV-013", name: "King Abdulaziz University Hospital", nameAr: "مستشفى جامعة الملك عبدالعزيز", licenseNo: "MOH-KA-013", region: "MAK", city: "Jeddah", type: "tertiary_hospital" as const, bedCount: 800, specialties: ["All Specialties"], accreditationStatus: "accredited" as const, phone: "+966-2-200-0013", email: "info@kauh.sa", latitude: "21.48", longitude: "39.19", acceptedInsurers: ["INS-001", "INS-002", "INS-003"], languages: ["Arabic", "English"], rating: "4.7", reviewCount: 945, avgWaitMinutes: 18, workingHours: "Sun-Thu 7:00-22:00" },
    { code: "PRV-021", name: "Dammam Medical Complex", nameAr: "مجمع الدمام الطبي", licenseNo: "MOH-DM-021", region: "EST", city: "Dammam", type: "tertiary_hospital" as const, bedCount: 600, specialties: ["All Specialties"], accreditationStatus: "accredited" as const, phone: "+966-3-200-0021", email: "info@dmc.sa", latitude: "26.43", longitude: "50.10", acceptedInsurers: ["INS-001", "INS-002", "INS-003"], languages: ["Arabic", "English", "Urdu"], rating: "4.3", reviewCount: 678, avgWaitMinutes: 20, workingHours: "Sun-Thu 8:00-20:00" },
    { code: "PRV-023", name: "Saad Specialist Hospital", nameAr: "مستشفى سعد التخصصي", licenseNo: "MOH-SS-023", region: "EST", city: "Al Khobar", type: "specialist_clinic" as const, bedCount: 200, specialties: ["Oncology", "Cardiology", "Neurology"], accreditationStatus: "accredited" as const, phone: "+966-3-200-0023", email: "info@saad.sa", latitude: "26.28", longitude: "50.20", acceptedInsurers: ["INS-001", "INS-002"], languages: ["Arabic", "English"], rating: "4.5", reviewCount: 534, avgWaitMinutes: 18, workingHours: "Sun-Thu 7:00-22:00" },
    { code: "PRV-026", name: "Johns Hopkins Aramco Healthcare", nameAr: "جونز هوبكنز أرامكو الصحية", licenseNo: "MOH-JH-026", region: "EST", city: "Dhahran", type: "tertiary_hospital" as const, bedCount: 350, specialties: ["All Specialties"], accreditationStatus: "accredited" as const, phone: "+966-3-200-0026", email: "info@jhah.sa", latitude: "26.27", longitude: "50.15", acceptedInsurers: ["INS-001", "INS-002", "INS-003"], languages: ["Arabic", "English"], rating: "4.6", reviewCount: 789, avgWaitMinutes: 15, workingHours: "Sun-Thu 7:00-22:00" },
  ];
  await batchInsert(portalProviders, providers);
  console.log("[SeedAll] Upserted portal providers (duplicates skipped)");

  const employers = [
    { code: "EMP-001", name: "Al Madinah Construction Group", nameAr: "مجموعة المدينة للمقاولات", crNumber: "CR-1010234567", sector: "construction" as const, sizeBand: "large" as const, employeeCount: 1200, insuredCount: 1164, pendingEnrollment: 36, city: "Riyadh", region: "RIY", complianceStatus: "compliant" as const },
    { code: "EMP-002", name: "Nujoom Tech Solutions", nameAr: "نجوم للحلول التقنية", crNumber: "CR-1010345678", sector: "technology" as const, sizeBand: "medium" as const, employeeCount: 280, insuredCount: 280, pendingEnrollment: 0, city: "Riyadh", region: "RIY", complianceStatus: "compliant" as const },
    { code: "EMP-003", name: "Gulf Hospitality Co", nameAr: "شركة الخليج للضيافة", crNumber: "CR-4030456789", sector: "hospitality" as const, sizeBand: "medium" as const, employeeCount: 600, insuredCount: 571, pendingEnrollment: 29, city: "Jeddah", region: "MAK", complianceStatus: "action_required" as const },
    { code: "EMP-004", name: "Saudi Build Corp", nameAr: "شركة البناء السعودية", crNumber: "CR-1010456002", sector: "construction" as const, sizeBand: "enterprise" as const, employeeCount: 2200, insuredCount: 2134, pendingEnrollment: 66, city: "Riyadh", region: "RIY", complianceStatus: "compliant" as const },
    { code: "EMP-005", name: "Eastern Builders LLC", nameAr: "البناؤون الشرقيون", crNumber: "CR-2050456004", sector: "construction" as const, sizeBand: "medium" as const, employeeCount: 680, insuredCount: 646, pendingEnrollment: 34, city: "Dammam", region: "EST", complianceStatus: "action_required" as const },
    { code: "EMP-006", name: "Al Rajhi Development", nameAr: "الراجحي للتطوير", crNumber: "CR-4030456003", sector: "construction" as const, sizeBand: "large" as const, employeeCount: 1500, insuredCount: 1455, pendingEnrollment: 45, city: "Jeddah", region: "MAK", complianceStatus: "compliant" as const },
  ];
  await batchInsert(portalEmployers, employers);
  console.log("[SeedAll] Upserted portal employers (duplicates skipped)");

  // Employer policies (unique per employerCode+insurerCode)
  const tiers = ["bronze", "silver", "gold", "platinum"];
  const policies = employers.map((emp, idx) => ({
    employerCode: emp.code,
    insurerCode: `INS-00${(idx % 6) + 1}`,
    insurerName: ["Bupa Arabia", "Tawuniya", "MedGulf", "Al Rajhi Takaful", "SAICO", "Walaa Insurance"][idx % 6],
    planTier: tiers[idx % 4],
    premiumPerEmployee: d(2800 + idx * 400),
    totalAnnualPremium: d((2800 + idx * 400) * emp.employeeCount),
    coverageStart: new Date(2025, 0, 1),
    coverageEnd: new Date(2026, 11, 31),
    dependentsCount: Math.round(emp.employeeCount * 0.6),
    renewalDaysRemaining: 30 + idx * 45,
  }));
  await batchInsert(employerPolicies, policies);
  console.log("[SeedAll] Upserted employer policies (duplicates skipped)");

  const members = [
    { code: "MEM-001", name: "Fatimah Al-Dosari", nameAr: "فاطمة الدوسري", iqamaNo: "1024567890", policyNumber: "POL-BUPA-001", employerCode: "EMP-002", employerName: "Nujoom Tech Solutions", insurerCode: "INS-001", insurerName: "Bupa Arabia", planTier: "gold" as const, nationality: "Saudi", age: 34, gender: "Female", city: "Riyadh", region: "RIY", dependentsCount: 2, policyValidUntil: new Date(2026, 11, 31) },
    { code: "MEM-002", name: "Mohammed Al-Harbi", nameAr: "محمد الحربي", iqamaNo: "1034567891", policyNumber: "POL-TAW-001", employerCode: "EMP-001", employerName: "Al Madinah Construction Group", insurerCode: "INS-002", insurerName: "Tawuniya", planTier: "silver" as const, nationality: "Saudi", age: 52, gender: "Male", city: "Riyadh", region: "RIY", dependentsCount: 4, policyValidUntil: new Date(2026, 11, 31) },
    { code: "MEM-003", name: "Sara Al-Otaibi", nameAr: "سارة العتيبي", iqamaNo: "1044567892", policyNumber: "POL-BUPA-002", employerCode: "EMP-003", employerName: "Gulf Hospitality Co", insurerCode: "INS-001", insurerName: "Bupa Arabia", planTier: "bronze" as const, nationality: "Saudi", age: 28, gender: "Female", city: "Jeddah", region: "MAK", dependentsCount: 1, policyValidUntil: new Date(2026, 6, 30) },
  ];
  await batchInsert(portalMembers, members);
  console.log("[SeedAll] Upserted portal members (duplicates skipped)");

  // Member coverage (unique per memberCode+benefitCategory)
  const coverageItems = [
    { memberCode: "MEM-001", benefitCategory: "Emergency Care", status: "covered" as const, limitSar: null, usedSar: "2400.00", copayPercent: 0, sortOrder: 0 },
    { memberCode: "MEM-001", benefitCategory: "Outpatient Visits", status: "covered" as const, limitSar: null, usedSar: "1800.00", limitUnits: 150, usedUnits: 12, copayPercent: 20, sortOrder: 1 },
    { memberCode: "MEM-001", benefitCategory: "Dental", status: "covered" as const, limitSar: "8000.00", usedSar: "3400.00", copayPercent: 20, sortOrder: 2 },
    { memberCode: "MEM-002", benefitCategory: "Emergency Care", status: "covered" as const, limitSar: null, usedSar: "0.00", copayPercent: 10, sortOrder: 0 },
    { memberCode: "MEM-002", benefitCategory: "Chronic Conditions", status: "covered" as const, limitSar: "50000.00", usedSar: "14200.00", copayPercent: 15, sortOrder: 1 },
    { memberCode: "MEM-003", benefitCategory: "Emergency Care", status: "covered" as const, limitSar: null, usedSar: "0.00", copayPercent: 15, sortOrder: 0 },
    { memberCode: "MEM-003", benefitCategory: "Maternity", status: "covered" as const, limitSar: "20000.00", usedSar: "4500.00", copayPercent: 20, sortOrder: 1 },
  ];
  await batchInsert(memberCoverage, coverageItems);
  console.log("[SeedAll] Upserted member coverage records (duplicates skipped)");
}

// ---------------------------------------------------------------------------
// 12. Employer Violations
// ---------------------------------------------------------------------------

async function seedEmployerViolations() {
  console.log("[SeedAll] Seeding employer violations...");

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);

  const violations = [
    {
      violationRef: "VIO-EMP003-LATE-001",
      employerCode: "EMP-003",
      violationType: "Late employee enrollment",
      description: "Failed to enroll 29 new employees within the mandatory 10-day registration window",
      fineAmountSar: "14500.00",
      status: "pending",
      issuedDate: daysAgo(45),
      resolvedDate: null,
    },
    {
      violationRef: "VIO-EMP005-GAP-001",
      employerCode: "EMP-005",
      violationType: "Coverage gap for dependents",
      description: "34 dependents of insured employees found without active coverage for more than 30 days",
      fineAmountSar: "34000.00",
      status: "pending",
      issuedDate: daysAgo(30),
      resolvedDate: null,
    },
    {
      violationRef: "VIO-EMP001-LATE-001",
      employerCode: "EMP-001",
      violationType: "Late employee enrollment",
      description: "36 employees enrolled 15 days after the mandatory deadline",
      fineAmountSar: "18000.00",
      status: "resolved",
      issuedDate: daysAgo(90),
      resolvedDate: daysAgo(60),
    },
    {
      violationRef: "VIO-EMP003-TIER-001",
      employerCode: "EMP-003",
      violationType: "Non-compliant plan tier",
      description: "Insurance plan for 45 employees does not meet minimum CHI benefit requirements",
      fineAmountSar: "22500.00",
      status: "pending",
      issuedDate: daysAgo(15),
      resolvedDate: null,
    },
    {
      violationRef: "VIO-EMP006-EXP-001",
      employerCode: "EMP-006",
      violationType: "Expired policy renewal",
      description: "Group health insurance policy lapsed for 8 days before renewal was processed",
      fineAmountSar: "8000.00",
      status: "resolved",
      issuedDate: daysAgo(120),
      resolvedDate: daysAgo(105),
    },
  ];

  await batchInsert(employerViolations, violations);
  console.log(`[SeedAll] Upserted ${violations.length} employer violations (duplicates skipped)`);
}

// ---------------------------------------------------------------------------
// 13. Member Complaints (15-20 records)
// ---------------------------------------------------------------------------

async function seedMemberComplaints() {
  console.log("[SeedAll] Seeding member complaints...");

  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);

  const complaints = [
    {
      ticketNumber: "CM-2026-04821",
      memberCode: "MEM-001",
      type: "claim_denial",
      description: "Dermatology consultation on Jan 15 denied as cosmetic — it was for eczema treatment with GP referral",
      status: "investigation" as const,
      assignedTo: "Claims Review Team",
      estimatedResolution: "5-7 business days",
      timeline: [
        { status: "submitted", date: "2026-02-10T09:00:00Z", note: "Complaint submitted via portal" },
        { status: "under_review", date: "2026-02-12T14:30:00Z", note: "Assigned to Claims Review Team" },
        { status: "investigation", date: "2026-02-18T11:00:00Z", note: "Medical records requested from provider" },
      ],
      messages: [
        { sender: "Fatimah Al-Dosari", text: "My dermatology visit was for eczema, not cosmetic. I have a GP referral.", date: "2026-02-10T09:00:00Z" },
        { sender: "Claims Review Team", text: "We have requested your medical records from the provider.", date: "2026-02-12T14:30:00Z" },
      ],
      outcome: null,
      submittedAt: daysAgo(14),
      resolvedAt: null,
    },
    {
      ticketNumber: "CM-2025-11203",
      memberCode: "MEM-001",
      type: "service_delay",
      description: "Pre-authorization delay for MRI scan — waited 3 weeks beyond the 5-day SLA",
      status: "closed" as const,
      assignedTo: "Pre-Auth Team",
      estimatedResolution: null,
      timeline: [
        { status: "submitted", date: "2025-11-03T10:00:00Z", note: "Complaint submitted" },
        { status: "under_review", date: "2025-11-04T08:00:00Z", note: "Escalated to Pre-Auth Team" },
        { status: "resolution", date: "2025-11-09T14:00:00Z", note: "Pre-auth approved and backdated" },
        { status: "closed", date: "2025-11-11T10:00:00Z", note: "Member confirmed resolution" },
      ],
      messages: [],
      outcome: "Pre-authorization approved retrospectively. SLA breach acknowledged.",
      submittedAt: daysAgo(90),
      resolvedAt: daysAgo(82),
    },
    {
      ticketNumber: "CM-2026-05102",
      memberCode: "MEM-002",
      type: "claim_denial",
      description: "Diabetes medication (Ozempic) denied as non-formulary. Doctor prescribed as medically necessary.",
      status: "under_review" as const,
      assignedTo: "Pharmacy Benefits Team",
      estimatedResolution: "3-5 business days",
      timeline: [
        { status: "submitted", date: "2026-02-15T11:00:00Z", note: "Complaint submitted" },
        { status: "under_review", date: "2026-02-17T09:00:00Z", note: "Sent to Pharmacy Benefits Team" },
      ],
      messages: [
        { sender: "Mohammed Al-Harbi", text: "My endocrinologist prescribed Ozempic after other medications failed. This is medically necessary.", date: "2026-02-15T11:00:00Z" },
      ],
      outcome: null,
      submittedAt: daysAgo(7),
      resolvedAt: null,
    },
    {
      ticketNumber: "CM-2026-04500",
      memberCode: "MEM-002",
      type: "provider_quality",
      description: "Emergency department at Al Iman Hospital refused to treat without upfront payment despite having active insurance card",
      status: "investigation" as const,
      assignedTo: "Provider Relations",
      estimatedResolution: "7-10 business days",
      timeline: [
        { status: "submitted", date: "2026-02-01T16:00:00Z", note: "Complaint submitted" },
        { status: "under_review", date: "2026-02-03T10:00:00Z", note: "Provider Relations notified" },
        { status: "investigation", date: "2026-02-08T09:00:00Z", note: "On-site investigation initiated" },
      ],
      messages: [],
      outcome: null,
      submittedAt: daysAgo(21),
      resolvedAt: null,
    },
    {
      ticketNumber: "CM-2026-03800",
      memberCode: "MEM-003",
      type: "billing_dispute",
      description: "Charged SAR 850 copay at delivery despite policy showing 20% of SAR 18,000 = SAR 3,600 max. Request itemized bill.",
      status: "resolution" as const,
      assignedTo: "Billing Disputes Team",
      estimatedResolution: "2 business days",
      timeline: [
        { status: "submitted", date: "2026-01-20T08:00:00Z", note: "Complaint submitted" },
        { status: "under_review", date: "2026-01-21T10:00:00Z", note: "Billing team review initiated" },
        { status: "resolution", date: "2026-02-02T15:00:00Z", note: "Billing error confirmed, refund processed" },
      ],
      messages: [],
      outcome: "Billing error confirmed. SAR 250 overcharge refunded within 5 business days.",
      submittedAt: daysAgo(32),
      resolvedAt: daysAgo(20),
    },
    // Additional complaints tied to MEM-001, MEM-002, MEM-003 for volume
    {
      ticketNumber: "CM-2025-09001",
      memberCode: "MEM-001",
      type: "claim_denial",
      description: "Physiotherapy sessions denied after 8 of 12 authorized — insurer claims exceeded annual limit",
      status: "closed" as const,
      assignedTo: "Claims Review Team",
      estimatedResolution: null,
      timeline: [{ status: "submitted", date: "2025-09-10T09:00:00Z", note: "Complaint submitted" }, { status: "closed", date: "2025-09-18T14:00:00Z", note: "Resolved in member's favor" }],
      messages: [],
      outcome: "Approved remaining 4 sessions. Miscommunication in limit tracking.",
      submittedAt: daysAgo(150),
      resolvedAt: daysAgo(142),
    },
    {
      ticketNumber: "CM-2025-07400",
      memberCode: "MEM-002",
      type: "service_delay",
      description: "Referral to specialist took 45 days. Standard SLA is 14 business days.",
      status: "closed" as const,
      assignedTo: "Network Management",
      estimatedResolution: null,
      timeline: [{ status: "submitted", date: "2025-07-22T09:00:00Z", note: "Complaint submitted" }, { status: "closed", date: "2025-08-05T14:00:00Z", note: "Referral expedited and complaint closed" }],
      messages: [],
      outcome: "Specialist appointment confirmed. Provider network gap identified for Endocrinology in Riyadh West.",
      submittedAt: daysAgo(210),
      resolvedAt: daysAgo(196),
    },
    {
      ticketNumber: "CM-2026-05400",
      memberCode: "MEM-003",
      type: "claim_denial",
      description: "Postnatal check-up at week 6 denied as 'not covered under maternity benefit'",
      status: "submitted" as const,
      assignedTo: null,
      estimatedResolution: "5-7 business days",
      timeline: [{ status: "submitted", date: "2026-02-20T10:00:00Z", note: "Complaint submitted via portal" }],
      messages: [{ sender: "Sara Al-Otaibi", text: "Postnatal visits are clearly listed under maternity benefits in my policy.", date: "2026-02-20T10:00:00Z" }],
      outcome: null,
      submittedAt: daysAgo(2),
      resolvedAt: null,
    },
    {
      ticketNumber: "CM-2026-03100",
      memberCode: "MEM-001",
      type: "claim_denial",
      description: "MRI scan for knee pain denied as 'not medically necessary' despite orthopedic surgeon referral and 6 weeks of failed physiotherapy",
      status: "under_review" as const,
      assignedTo: "Medical Review Team",
      estimatedResolution: "7-10 business days",
      timeline: [
        { status: "submitted", date: "2026-01-14T08:00:00Z", note: "Complaint submitted via mobile app" },
        { status: "under_review", date: "2026-01-15T10:00:00Z", note: "Referred to Medical Review Team" },
      ],
      messages: [{ sender: "Ahmad Al-Rashidi", text: "My orthopedic surgeon ordered this MRI after physiotherapy didn't help. How is this not necessary?", date: "2026-01-14T08:00:00Z" }],
      outcome: null,
      submittedAt: daysAgo(38),
      resolvedAt: null,
    },
    {
      ticketNumber: "CM-2025-12900",
      memberCode: "MEM-002",
      type: "network_issue",
      description: "The nearest in-network gastroenterologist is 90km away in another city. Requesting exception for local out-of-network provider.",
      status: "closed" as const,
      assignedTo: "Network Management",
      estimatedResolution: null,
      timeline: [
        { status: "submitted", date: "2025-12-10T11:00:00Z", note: "Complaint submitted" },
        { status: "under_review", date: "2025-12-12T09:00:00Z", note: "Network gap identified" },
        { status: "resolution", date: "2025-12-18T14:00:00Z", note: "Out-of-network exception granted" },
        { status: "closed", date: "2025-12-20T10:00:00Z", note: "Member confirmed resolution" },
      ],
      messages: [],
      outcome: "Out-of-network exception granted for 3 visits pending network expansion.",
      submittedAt: daysAgo(72),
      resolvedAt: daysAgo(62),
    },
    {
      ticketNumber: "CM-2025-11800",
      memberCode: "MEM-003",
      type: "billing_dispute",
      description: "Balance billing by private hospital — charged additional SAR 1,200 above the insurance-approved amount without prior disclosure",
      status: "closed" as const,
      assignedTo: "Billing Disputes Team",
      estimatedResolution: null,
      timeline: [
        { status: "submitted", date: "2025-11-25T13:00:00Z", note: "Complaint submitted" },
        { status: "investigation", date: "2025-11-28T09:00:00Z", note: "Provider contacted regarding billing" },
        { status: "resolution", date: "2025-12-05T15:00:00Z", note: "Balance billing confirmed as violation" },
        { status: "closed", date: "2025-12-08T11:00:00Z", note: "Full SAR 1,200 refunded" },
      ],
      messages: [],
      outcome: "Balance billing is prohibited under provider agreement. Full refund issued.",
      submittedAt: daysAgo(87),
      resolvedAt: daysAgo(74),
    },
    {
      ticketNumber: "CM-2026-02200",
      memberCode: "MEM-001",
      type: "claim_denial",
      description: "Annual dental cleaning denied as non-covered — policy schedule clearly shows 2 cleanings per year are covered",
      status: "resolution" as const,
      assignedTo: "Claims Review Team",
      estimatedResolution: "1-2 business days",
      timeline: [
        { status: "submitted", date: "2026-01-02T09:00:00Z", note: "Complaint submitted" },
        { status: "under_review", date: "2026-01-03T10:00:00Z", note: "Policy schedule reviewed" },
        { status: "resolution", date: "2026-01-06T14:00:00Z", note: "Claim approved on second review" },
      ],
      messages: [],
      outcome: "Claim approved. Coding error caused initial denial. Claim re-processed.",
      submittedAt: daysAgo(50),
      resolvedAt: daysAgo(46),
    },
    {
      ticketNumber: "CM-2025-10500",
      memberCode: "MEM-002",
      type: "service_delay",
      description: "Waiting 4 months for a rheumatology appointment. Condition worsening with no interim care plan provided.",
      status: "closed" as const,
      assignedTo: "Network Management",
      estimatedResolution: null,
      timeline: [
        { status: "submitted", date: "2025-10-15T10:00:00Z", note: "Complaint submitted" },
        { status: "under_review", date: "2025-10-17T09:00:00Z", note: "Escalated to Network Management" },
        { status: "resolution", date: "2025-10-28T15:00:00Z", note: "Appointment arranged at regional hospital" },
        { status: "closed", date: "2025-10-30T10:00:00Z", note: "Member confirmed appointment" },
      ],
      messages: [],
      outcome: "Appointment confirmed at King Khalid University Hospital Rheumatology. Interim GP care plan issued.",
      submittedAt: daysAgo(128),
      resolvedAt: daysAgo(114),
    },
    {
      ticketNumber: "CM-2026-01100",
      memberCode: "MEM-003",
      type: "claim_denial",
      description: "Newborn hearing screening test denied as 'investigational'. This is a standard mandatory test.",
      status: "closed" as const,
      assignedTo: "Medical Review Team",
      estimatedResolution: null,
      timeline: [
        { status: "submitted", date: "2025-12-28T11:00:00Z", note: "Complaint submitted" },
        { status: "under_review", date: "2025-12-29T09:00:00Z", note: "Medical review initiated" },
        { status: "resolution", date: "2026-01-03T14:00:00Z", note: "Claim approved — mandatory screening" },
        { status: "closed", date: "2026-01-04T10:00:00Z", note: "Payment processed" },
      ],
      messages: [],
      outcome: "Claim approved. Newborn hearing screening is mandated under CCHI regulations.",
      submittedAt: daysAgo(55),
      resolvedAt: daysAgo(49),
    },
    {
      ticketNumber: "CM-2026-00450",
      memberCode: "MEM-001",
      type: "network_issue",
      description: "In-network hospital listed in directory is no longer accepting my insurer. Directory not updated for 6 months.",
      status: "investigation" as const,
      assignedTo: "Network Management",
      estimatedResolution: "5-7 business days",
      timeline: [
        { status: "submitted", date: "2025-12-20T14:00:00Z", note: "Complaint submitted" },
        { status: "under_review", date: "2025-12-22T09:00:00Z", note: "Provider contract status verified" },
        { status: "investigation", date: "2026-01-05T11:00:00Z", note: "Contract terminated 5 months ago — directory update failure identified" },
      ],
      messages: [{ sender: "Ahmad Al-Rashidi", text: "I drove 45 minutes to find out the hospital isn't in-network anymore. The directory is wrong.", date: "2025-12-20T14:00:00Z" }],
      outcome: null,
      submittedAt: daysAgo(63),
      resolvedAt: null,
    },
  ];

  await batchInsert(memberComplaints, complaints);
  console.log(`[SeedAll] Inserted ${complaints.length} member complaints`);
}

// ---------------------------------------------------------------------------
// 14. doctor_360 — backing table for GET /api/fwa/high-risk-doctors
// ---------------------------------------------------------------------------

async function seedDoctor360() {
  console.log("[SeedAll] Seeding doctor_360...");

  const doctors: (typeof doctor360.$inferInsert)[] = [
    {
      doctorId: "DOC-CS1-001",
      doctorName: "Dr. Khalid Al-Rashidi",
      specialty: "Dentistry",
      credentials: "BDS, SCFHS",
      licenseNumber: "SCFHS-DEN-001",
      primaryFacilityId: "PRV-CS1-001",
      primaryFacilityName: "Al Noor Dental Center",
      affiliatedFacilities: ["Al Noor Dental Center", "Smile Plus Clinic"],
      riskLevel: "critical",
      riskScore: "92.00",
      claimsSummary: { totalClaims: 258, totalAmount: 651000, uniquePatients: 82, claimsByYear: { "2024": 120, "2025": 138 }, denialRate: 0.18 },
      practicePatterns: { avgPatientsPerDay: 14, avgClaimPerPatient: 7940, topProcedures: [{ code: "D3310", description: "Root canal — anterior", frequency: 48 }, { code: "D2750", description: "Crown — porcelain fused to metal", frequency: 34 }], prescribingHabits: { avgPrescriptionsPerVisit: 1.2, controlledSubstanceRatio: 0.05, topMedications: ["Amoxicillin 500mg", "Ibuprofen 400mg"] }, referralPatterns: { referralRate: 0.08, topReferralDestinations: ["Orthodontics", "Oral Surgery"] } },
      peerComparison: { specialtyAvgClaim: 2400, doctorAvgClaim: 3100, deviation: 0.29, percentile: 97, peerGroupSize: 42 },
      flags: [{ flagId: "FL-001", flagType: "phantom_billing", severity: "critical", description: "Claims on extracted teeth", raisedDate: "2026-01-15", status: "open" }],
      lastAnalyzedAt: daysAgo(7),
    },
    {
      doctorId: "DOC-CS1-002",
      doctorName: "Dr. Faisal Al-Dosari",
      specialty: "Dentistry",
      credentials: "BDS, SCFHS",
      licenseNumber: "SCFHS-DEN-002",
      primaryFacilityId: "PRV-CS1-002",
      primaryFacilityName: "Smile Plus Clinic",
      affiliatedFacilities: ["Smile Plus Clinic"],
      riskLevel: "critical",
      riskScore: "88.00",
      claimsSummary: { totalClaims: 221, totalAmount: 536500, uniquePatients: 68, claimsByYear: { "2024": 98, "2025": 123 }, denialRate: 0.15 },
      practicePatterns: { avgPatientsPerDay: 12, avgClaimPerPatient: 7890, topProcedures: [{ code: "D3310", description: "Root canal — anterior", frequency: 38 }], prescribingHabits: { avgPrescriptionsPerVisit: 1.1, controlledSubstanceRatio: 0.04, topMedications: ["Amoxicillin 500mg"] }, referralPatterns: { referralRate: 0.07, topReferralDestinations: ["Oral Surgery"] } },
      peerComparison: { specialtyAvgClaim: 2400, doctorAvgClaim: 2900, deviation: 0.21, percentile: 94, peerGroupSize: 42 },
      flags: [{ flagId: "FL-002", flagType: "phantom_billing", severity: "critical", description: "Root canal on teeth with no radiograph support", raisedDate: "2026-01-14", status: "open" }],
      lastAnalyzedAt: daysAgo(8),
    },
    {
      doctorId: "DOC-CS1-003",
      doctorName: "Dr. Omar Al-Otaibi",
      specialty: "Dentistry",
      credentials: "BDS, SCFHS",
      licenseNumber: "SCFHS-DEN-003",
      primaryFacilityId: "PRV-CS1-002",
      primaryFacilityName: "Riyadh Dental Care",
      affiliatedFacilities: ["Riyadh Dental Care"],
      riskLevel: "critical",
      riskScore: "85.00",
      claimsSummary: { totalClaims: 197, totalAmount: 509350, uniquePatients: 58, claimsByYear: { "2024": 86, "2025": 111 }, denialRate: 0.14 },
      practicePatterns: { avgPatientsPerDay: 11, avgClaimPerPatient: 8782, topProcedures: [{ code: "D2750", description: "Crown — porcelain fused to metal", frequency: 41 }], prescribingHabits: { avgPrescriptionsPerVisit: 1.0, controlledSubstanceRatio: 0.03, topMedications: ["Metronidazole 400mg"] }, referralPatterns: { referralRate: 0.06, topReferralDestinations: ["Periodontology"] } },
      peerComparison: { specialtyAvgClaim: 2400, doctorAvgClaim: 3050, deviation: 0.27, percentile: 92, peerGroupSize: 42 },
      flags: [{ flagId: "FL-003", flagType: "upcoding", severity: "critical", description: "Crown prep billed without placement", raisedDate: "2026-01-12", status: "open" }],
      lastAnalyzedAt: daysAgo(10),
    },
    {
      doctorId: "DOC-CS2-001",
      doctorName: "Dr. Haya Al-Zahrani",
      specialty: "OB/GYN",
      credentials: "MBBS, FRCOG, SCFHS",
      licenseNumber: "SCFHS-OBG-001",
      primaryFacilityId: "PRV-CS2-001",
      primaryFacilityName: "Al Hayat Women's Hospital",
      affiliatedFacilities: ["Al Hayat Women's Hospital"],
      riskLevel: "high",
      riskScore: "78.00",
      claimsSummary: { totalClaims: 168, totalAmount: 1288000, uniquePatients: 140, claimsByYear: { "2024": 75, "2025": 93 }, denialRate: 0.11 },
      practicePatterns: { avgPatientsPerDay: 8, avgClaimPerPatient: 9200, topProcedures: [{ code: "59510", description: "C-section delivery", frequency: 96 }, { code: "59400", description: "Vaginal delivery", frequency: 12 }], prescribingHabits: { avgPrescriptionsPerVisit: 2.1, controlledSubstanceRatio: 0.12, topMedications: ["Oxytocin", "Folic Acid"] }, referralPatterns: { referralRate: 0.15, topReferralDestinations: ["Pediatrics", "Anesthesia"] } },
      peerComparison: { specialtyAvgClaim: 5500, doctorAvgClaim: 9200, deviation: 0.67, percentile: 96, peerGroupSize: 38 },
      flags: [{ flagId: "FL-004", flagType: "upcoding", severity: "high", description: "C-section rate 3x above specialty peer average", raisedDate: "2026-01-10", status: "open" }],
      lastAnalyzedAt: daysAgo(12),
    },
    {
      doctorId: "DOC-CS2-002",
      doctorName: "Dr. Sara Al-Ghamdi",
      specialty: "OB/GYN",
      credentials: "MBBS, Arab Board, SCFHS",
      licenseNumber: "SCFHS-OBG-002",
      primaryFacilityId: "PRV-CS2-001",
      primaryFacilityName: "Al Hayat Women's Hospital",
      affiliatedFacilities: ["Al Hayat Women's Hospital"],
      riskLevel: "high",
      riskScore: "74.00",
      claimsSummary: { totalClaims: 138, totalAmount: 1038400, uniquePatients: 118, claimsByYear: { "2024": 60, "2025": 78 }, denialRate: 0.09 },
      practicePatterns: { avgPatientsPerDay: 7, avgClaimPerPatient: 8800, topProcedures: [{ code: "59510", description: "C-section delivery", frequency: 71 }], prescribingHabits: { avgPrescriptionsPerVisit: 1.9, controlledSubstanceRatio: 0.10, topMedications: ["Oxytocin", "Iron Supplements"] }, referralPatterns: { referralRate: 0.12, topReferralDestinations: ["Pediatrics"] } },
      peerComparison: { specialtyAvgClaim: 5500, doctorAvgClaim: 8800, deviation: 0.60, percentile: 93, peerGroupSize: 38 },
      flags: [{ flagId: "FL-005", flagType: "upcoding", severity: "high", description: "Upcoded prenatal visits", raisedDate: "2026-01-08", status: "open" }],
      lastAnalyzedAt: daysAgo(14),
    },
    {
      doctorId: "DOC-CS3-001",
      doctorName: "Dr. Abdullah Al-Shehri",
      specialty: "Internal Medicine",
      credentials: "MBBS, Arab Board IM, SCFHS",
      licenseNumber: "SCFHS-INT-001",
      primaryFacilityId: "PRV-CS3-001",
      primaryFacilityName: "Eastern Province Medical Center",
      affiliatedFacilities: ["Eastern Province Medical Center"],
      riskLevel: "high",
      riskScore: "71.00",
      claimsSummary: { totalClaims: 95, totalAmount: 427500, uniquePatients: 72, claimsByYear: { "2024": 40, "2025": 55 }, denialRate: 0.08 },
      practicePatterns: { avgPatientsPerDay: 16, avgClaimPerPatient: 4500, topProcedures: [{ code: "99213", description: "Office visit E&M level 3", frequency: 48 }], prescribingHabits: { avgPrescriptionsPerVisit: 2.3, controlledSubstanceRatio: 0.08, topMedications: ["Metformin 500mg", "Lisinopril 10mg"] }, referralPatterns: { referralRate: 0.20, topReferralDestinations: ["Cardiology", "Endocrinology"] } },
      peerComparison: { specialtyAvgClaim: 3200, doctorAvgClaim: 4500, deviation: 0.41, percentile: 88, peerGroupSize: 55 },
      flags: [{ flagId: "FL-006", flagType: "duplicate_billing", severity: "high", description: "Cross-insurer duplicate submissions", raisedDate: "2026-01-18", status: "open" }],
      lastAnalyzedAt: daysAgo(4),
    },
    {
      doctorId: "DOC-BG-001",
      doctorName: "Dr. Ahmad Al-Farhan",
      specialty: "Pain Management",
      credentials: "MBBS, FFPMRCA, SCFHS",
      licenseNumber: "SCFHS-PM-001",
      primaryFacilityId: "PRV-BG-001",
      primaryFacilityName: "King Faisal Specialist Hospital",
      affiliatedFacilities: ["King Faisal Specialist Hospital"],
      riskLevel: "high",
      riskScore: "68.00",
      claimsSummary: { totalClaims: 284, totalAmount: 355000, uniquePatients: 198, claimsByYear: { "2024": 130, "2025": 154 }, denialRate: 0.07 },
      practicePatterns: { avgPatientsPerDay: 18, avgClaimPerPatient: 1250, topProcedures: [{ code: "99214", description: "Office visit E&M level 4", frequency: 120 }], prescribingHabits: { avgPrescriptionsPerVisit: 3.8, controlledSubstanceRatio: 0.38, topMedications: ["Tramadol 100mg", "Pregabalin 75mg", "Codeine 30mg"] }, referralPatterns: { referralRate: 0.05, topReferralDestinations: ["Rehabilitation"] } },
      peerComparison: { specialtyAvgClaim: 2200, doctorAvgClaim: 1250, deviation: -0.43, percentile: 82, peerGroupSize: 22 },
      flags: [{ flagId: "FL-007", flagType: "prescribing_pattern", severity: "high", description: "Excessive opioid prescribing — 4x specialty peer rate", raisedDate: "2026-01-05", status: "open" }],
      lastAnalyzedAt: daysAgo(17),
    },
    {
      doctorId: "DOC-BG-002",
      doctorName: "Dr. Saleh Al-Mutairi",
      specialty: "Orthopedic Surgery",
      credentials: "MBBS, FRCS(Orth), SCFHS",
      licenseNumber: "SCFHS-OS-001",
      primaryFacilityId: "PRV-BG-002",
      primaryFacilityName: "Saudi German Hospital",
      affiliatedFacilities: ["Saudi German Hospital"],
      riskLevel: "high",
      riskScore: "63.00",
      claimsSummary: { totalClaims: 156, totalAmount: 702000, uniquePatients: 98, claimsByYear: { "2024": 68, "2025": 88 }, denialRate: 0.10 },
      practicePatterns: { avgPatientsPerDay: 10, avgClaimPerPatient: 4500, topProcedures: [{ code: "27447", description: "Total knee replacement", frequency: 28 }, { code: "27130", description: "Total hip arthroplasty", frequency: 18 }], prescribingHabits: { avgPrescriptionsPerVisit: 2.4, controlledSubstanceRatio: 0.18, topMedications: ["Naproxen 500mg", "Tramadol 50mg"] }, referralPatterns: { referralRate: 0.18, topReferralDestinations: ["Physiotherapy", "Anesthesia"] } },
      peerComparison: { specialtyAvgClaim: 6800, doctorAvgClaim: 4500, deviation: -0.34, percentile: 78, peerGroupSize: 30 },
      flags: [{ flagId: "FL-008", flagType: "unnecessary_procedures", severity: "high", description: "Procedure rate 3.2x above specialty peer median", raisedDate: "2026-01-02", status: "open" }],
      lastAnalyzedAt: daysAgo(20),
    },
    {
      doctorId: "DOC-BG-003",
      doctorName: "Dr. Layla Al-Shammari",
      specialty: "Dermatology",
      credentials: "MBBS, Arab Board Derm, SCFHS",
      licenseNumber: "SCFHS-DM-001",
      primaryFacilityId: "PRV-BG-003",
      primaryFacilityName: "Dallah Health Clinic",
      affiliatedFacilities: ["Dallah Health Clinic"],
      riskLevel: "medium",
      riskScore: "54.00",
      claimsSummary: { totalClaims: 123, totalAmount: 104550, uniquePatients: 89, claimsByYear: { "2024": 55, "2025": 68 }, denialRate: 0.06 },
      practicePatterns: { avgPatientsPerDay: 12, avgClaimPerPatient: 850, topProcedures: [{ code: "11300", description: "Shave removal benign lesion", frequency: 38 }], prescribingHabits: { avgPrescriptionsPerVisit: 1.8, controlledSubstanceRatio: 0.02, topMedications: ["Topical corticosteroids", "Antihistamines"] }, referralPatterns: { referralRate: 0.10, topReferralDestinations: ["Dermatology Surgery"] } },
      peerComparison: { specialtyAvgClaim: 1100, doctorAvgClaim: 850, deviation: -0.23, percentile: 62, peerGroupSize: 45 },
      flags: [{ flagId: "FL-009", flagType: "coding_error", severity: "medium", description: "Bundling issues and coding inconsistencies", raisedDate: "2025-12-28", status: "review" }],
      lastAnalyzedAt: daysAgo(25),
    },
    {
      doctorId: "DOC-BG-004",
      doctorName: "Dr. Omar Al-Dosari",
      specialty: "Cardiology",
      credentials: "MBBS, Arab Board Card, SCFHS",
      licenseNumber: "SCFHS-CD-001",
      primaryFacilityId: "PRV-BG-004",
      primaryFacilityName: "Dr. Sulaiman Al Habib Medical Center",
      affiliatedFacilities: ["Dr. Sulaiman Al Habib Medical Center"],
      riskLevel: "medium",
      riskScore: "48.00",
      claimsSummary: { totalClaims: 215, totalAmount: 451500, uniquePatients: 162, claimsByYear: { "2024": 98, "2025": 117 }, denialRate: 0.05 },
      practicePatterns: { avgPatientsPerDay: 14, avgClaimPerPatient: 2100, topProcedures: [{ code: "93000", description: "ECG with interpretation", frequency: 88 }, { code: "93306", description: "Echocardiography", frequency: 42 }], prescribingHabits: { avgPrescriptionsPerVisit: 2.8, controlledSubstanceRatio: 0.05, topMedications: ["Atorvastatin 40mg", "Metoprolol 50mg", "Aspirin 75mg"] }, referralPatterns: { referralRate: 0.12, topReferralDestinations: ["Interventional Cardiology", "Cardiac Surgery"] } },
      peerComparison: { specialtyAvgClaim: 2800, doctorAvgClaim: 2100, deviation: -0.25, percentile: 55, peerGroupSize: 38 },
      flags: [{ flagId: "FL-010", flagType: "modifier_misuse", severity: "medium", description: "Modifier misuse in cardiac procedure billing", raisedDate: "2025-12-20", status: "review" }],
      lastAnalyzedAt: daysAgo(33),
    },
  ];

  await batchInsert(doctor360, doctors);
  console.log(`[SeedAll] Inserted ${doctors.length} doctor_360 records`);
}

// ---------------------------------------------------------------------------
// 15. fwa_detection_results — backing table for GET /api/fwa/high-risk-patients
// ---------------------------------------------------------------------------

async function seedFwaDetectionResultsForPatients() {
  console.log("[SeedAll] Seeding fwa_detection_results for patients...");

  // Patient IDs and their associated providers and risk profile
  const patientGroups = [
    // CS1 dental ring — 10 patients, 3 detection results each
    ...Array.from({ length: 10 }, (_, i) => ({
      patientId: `PAT-CS1-${pad(i + 1, 3)}`,
      providerId: "PRV-CS1-001",
      composite: 78 + (i % 15),
      level: (78 + i % 15) >= 85 ? "critical" : "high",
      claimPrefix: `DET-CS1-${pad(i + 1, 3)}`,
      detections: 3,
    })),
    // CS2 OB/GYN upcoding — 8 patients, 2 detection results each
    ...Array.from({ length: 8 }, (_, i) => ({
      patientId: `PAT-CS2-${pad(i + 1, 3)}`,
      providerId: "PRV-CS2-001",
      composite: 65 + (i * 3),
      level: "high",
      claimPrefix: `DET-CS2-${pad(i + 1, 3)}`,
      detections: 2,
    })),
    // CS3 cross-insurer — 7 patients, 3 detection results each
    ...Array.from({ length: 7 }, (_, i) => ({
      patientId: `PAT-CS3-${pad(i + 1, 3)}`,
      providerId: "PRV-CS3-001",
      composite: 70 + (i * 2),
      level: "high",
      claimPrefix: `DET-CS3-${pad(i + 1, 3)}`,
      detections: 3,
    })),
  ];

  const rows: (typeof fwaDetectionResults.$inferInsert)[] = [];

  for (const pg of patientGroups) {
    for (let j = 0; j < pg.detections; j++) {
      const claimId = `${pg.claimPrefix}-CLM${pad(j + 1, 2)}`;
      const cv = pg.composite - j * 3;
      rows.push({
        claimId,
        patientId: pg.patientId,
        providerId: pg.providerId,
        compositeScore: d(cv),
        compositeRiskLevel: pg.level as "critical" | "high" | "medium" | "low",
        ruleEngineScore: d(cv - 2),
        statisticalScore: d(cv - 4),
        unsupervisedScore: d(cv + 1),
        ragLlmScore: d(cv - 5),
        ruleEngineFindings: {
          matchedRules: [
            { ruleId: "FWA-PAT-001", ruleName: "Multi-provider same-period billing", category: "Billing", severity: pg.level, confidence: cv / 100, description: "Patient billed by multiple providers for overlapping periods" },
          ],
          totalRulesChecked: 12,
          violationCount: 1,
        },
        statisticalFindings: {
          modelPrediction: cv / 100,
          featureImportance: [{ feature: "claim_frequency", importance: 0.42, value: cv / 100 }],
          peerComparison: { mean: 25, stdDev: 8, zScore: (cv - 25) / 8 },
          historicalTrend: cv >= 80 ? "escalating" : "stable",
        },
        unsupervisedFindings: {
          anomalyScore: cv / 100,
          clusterAssignment: pg.patientId.includes("CS1") ? 1 : pg.patientId.includes("CS2") ? 2 : 3,
          clusterSize: 8,
          outlierReason: ["High claim frequency", "Multi-provider pattern"],
          isolationForestScore: cv / 100 - 0.05,
          nearestClusterDistance: (100 - cv) / 100,
        },
        ragLlmFindings: {
          contextualAnalysis: `Patient ${pg.patientId} matches historical fraud pattern with confidence ${cv}%.`,
          similarCases: [{ caseId: "FWA-REF-001", similarity: 0.88, outcome: "confirmed_fraud" }],
          knowledgeBaseMatches: [{ docId: "KB-FWA-001", title: "Multi-provider billing fraud patterns", relevance: 0.91 }],
          recommendation: cv >= 80 ? "Immediate investigation" : "Enhanced monitoring",
          confidence: cv / 100,
        },
        primaryDetectionMethod: "rule_engine" as const,
        detectionSummary: `Patient risk score ${cv}/100. ${pg.level === "critical" ? "Critical" : "High"} risk — multi-engine corroboration.`,
        recommendedAction: cv >= 80 ? "Benefit lock and investigation" : "Case referral for review",
        analyzedBy: "system",
        processingTimeMs: 420 + h(claimId) % 280,
      });
    }
  }

  await batchInsert(fwaDetectionResults, rows);
  console.log(`[SeedAll] Inserted ${rows.length} fwa_detection_results records`);
}

// ---------------------------------------------------------------------------
// Master entry point
// ---------------------------------------------------------------------------

export async function seedAllSections(): Promise<void> {
  console.log("[SeedAll] Starting platform-wide seed...");

  try {
    // Portal base data must come first (dependencies)
    await seedPortalBaseData();

    // Run entity seeds in parallel where possible
    await Promise.all([
      seedHighRiskProviders(),
      seedHighRiskPatients(),
      seedHighRiskDoctors(),
    ]);

    await Promise.all([
      seedProviderDetectionResults(),
      seedDoctorDetectionResults(),
      seedPatientDetectionResults(),
      seedDoctor360(),
      seedFwaDetectionResultsForPatients(),
    ]);

    await seedEnforcementCases();
    await seedFwaCasesAndFindings();
    await seedPreAuthFull();
    await seedIntelligencePortal();

    await Promise.all([
      seedEmployerViolations(),
      seedMemberComplaints(),
    ]);

    console.log("[SeedAll] Platform-wide seed complete.");
  } catch (err) {
    console.error("[SeedAll] Error during seed:", err);
    throw err;
  }
}
