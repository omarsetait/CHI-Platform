/**
 * CHI Demo Seed Script
 *
 * Populates the database with Saudi-realistic data for the CHI demo.
 * Seeds in dependency order:
 *   1. Provider Directory (51 providers)
 *   2. High-Risk Providers (case study + background)
 *   3. High-Risk Patients
 *   4. High-Risk Doctors
 *   5. Claims (~180 claims including flagged)
 *   6. Enforcement Cases (3 case study + background)
 *   7. Online Listening Mentions
 *   8. FWA Cases
 *
 * Usage:
 *   npx tsx server/scripts/seed-chi-demo.ts
 *   npx tsx server/scripts/seed-chi-demo.ts --force
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env before any other imports that read process.env
const envPath = resolve(process.cwd(), ".env");
try {
  const envContent = readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) return;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (key && !process.env[key]) {
      process.env[key] = val;
    }
  });
} catch {
  console.warn("No .env file found, relying on existing environment variables");
}

import { db } from "../db";
import { eq, sql } from "drizzle-orm";
import {
  providerDirectory,
  fwaHighRiskProviders,
  fwaHighRiskPatients,
  fwaHighRiskDoctors,
  claims,
  enforcementCases,
  onlineListeningMentions,
  fwaCases,
} from "@shared/schema";
import {
  ALL_PROVIDERS,
  CASE_STUDY_1_PROVIDERS,
  CASE_STUDY_2_PROVIDERS,
  CASE_STUDY_3_PROVIDERS,
  SAUDI_INSURERS,
  SAUDI_MALE_FIRST_NAMES,
  SAUDI_FEMALE_FIRST_NAMES,
  SAUDI_FAMILY_NAMES,
  EXPAT_NAMES,
  FRAUD_PATTERN_TYPES,
  COMMON_ICD10AM_CODES,
} from "../data/saudi-constants";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FORCE = process.argv.includes("--force");

/** Deterministic pseudo-random based on a seed string (simple hash). */
function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  // Convert to 0..1
  return ((h >>> 0) % 10000) / 10000;
}

/** Pick from array deterministically using a seed string. */
function pick<T>(arr: readonly T[], seed: string): T {
  const idx = Math.floor(seededRandom(seed) * arr.length);
  return arr[idx];
}

/** Generate a deterministic date within a range. */
function dateInRange(start: Date, end: Date, seed: string): Date {
  const r = seededRandom(seed);
  return new Date(start.getTime() + r * (end.getTime() - start.getTime()));
}

/** Format number with leading zeros. */
function pad(n: number, len: number): string {
  return String(n).padStart(len, "0");
}

// Date ranges for claims
const DATE_START = new Date("2025-06-01");
const DATE_END = new Date("2026-02-15");

// Investigators
const INVESTIGATORS = [
  "Fahad Al-Rashidi",
  "Noura Al-Dosari",
  "Ahmed Al-Otaibi",
  "Maha Al-Harbi",
  "Sultan Al-Zahrani",
];

// ---------------------------------------------------------------------------
// 1. Provider Directory
// ---------------------------------------------------------------------------

function buildProviderDirectoryRows() {
  return ALL_PROVIDERS.map((p) => ({
    npi: p.providerCode,
    name: p.nameEn,
    specialty: p.specialty,
    organization: p.nameEn,
    email: `info@${p.nameEn.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20)}.sa`,
    phone: `+9661${pad(Math.abs(hashCode(p.providerCode)) % 100000000, 8)}`,
    address: `${p.city} Medical District`,
    city: p.city,
    region: p.region,
    contractStatus: "Active",
    networkTier: `Tier ${p.tier}`,
    licenseNumber: `LIC-${p.providerCode}`,
    licenseExpiry: new Date("2027-12-31"),
    memberCount: p.tier === 1 ? 5000 + hashAbs(p.providerCode) % 15000 : p.tier === 2 ? 1000 + hashAbs(p.providerCode) % 4000 : 200 + hashAbs(p.providerCode) % 800,
    riskScore: p.riskScore ? String(p.riskScore) : String(10 + hashAbs(p.providerCode) % 40),
  }));
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

function hashAbs(s: string): number {
  return Math.abs(hashCode(s));
}

// ---------------------------------------------------------------------------
// 2. High-Risk Providers
// ---------------------------------------------------------------------------

function buildHighRiskProviderRows() {
  const caseStudyProviders = [
    ...CASE_STUDY_1_PROVIDERS,
    ...CASE_STUDY_2_PROVIDERS,
    ...CASE_STUDY_3_PROVIDERS,
  ];

  const rows = caseStudyProviders.map((p) => ({
    providerId: p.providerCode,
    providerName: p.nameEn,
    providerType: p.type,
    specialty: p.specialty,
    organization: p.nameEn,
    riskScore: String(p.riskScore ?? 75),
    riskLevel: (p.riskScore ?? 75) >= 85 ? "critical" as const : "high" as const,
    totalClaims: p.providerCode.startsWith("PRV-CS1") ? 180 + hashAbs(p.providerCode) % 60 :
                 p.providerCode === "PRV-CS2-001" ? 145 :
                 120,
    flaggedClaims: p.providerCode.startsWith("PRV-CS1") ? 30 + hashAbs(p.providerCode) % 15 :
                   p.providerCode === "PRV-CS2-001" ? 22 :
                   18,
    denialRate: p.providerCode.startsWith("PRV-CS1") ? "28.50" :
                p.providerCode === "PRV-CS2-001" ? "22.30" :
                "19.80",
    avgClaimAmount: p.providerCode.startsWith("PRV-CS1") ? "3200.00" :
                    p.providerCode === "PRV-CS2-001" ? "9500.00" :
                    "4800.00",
    totalExposure: p.providerCode.startsWith("PRV-CS1") ? "580000.00" :
                   p.providerCode === "PRV-CS2-001" ? "890000.00" :
                   "1100000.00",
    claimsPerMonth: "22.50",
    fwaCaseCount: 1,
    reasons: p.providerCode.startsWith("PRV-CS1")
      ? ["Phantom billing pattern", "Root canal on extracted teeth", "Shared patient ring"]
      : p.providerCode === "PRV-CS2-001"
      ? ["Systematic upcoding", "Normal deliveries billed as C-sections"]
      : ["Cross-insurer duplicate billing", "Same procedure billed to multiple insurers"],
    lastFlaggedDate: new Date("2026-01-15"),
  }));

  // Background high-risk providers (not case study)
  const backgroundHR = [
    { code: "PRV-T2-001", score: 68, reasons: ["High denial rate", "Unusual billing volume"] },
    { code: "PRV-T2-004", score: 62, reasons: ["Frequent unbundling patterns"] },
    { code: "PRV-T1-003", score: 58, reasons: ["Elevated referral churn rate"] },
  ];

  for (const bg of backgroundHR) {
    const p = ALL_PROVIDERS.find((pr) => pr.providerCode === bg.code)!;
    rows.push({
      providerId: p.providerCode,
      providerName: p.nameEn,
      providerType: p.type,
      specialty: p.specialty,
      organization: p.nameEn,
      riskScore: String(bg.score),
      riskLevel: "high" as const,
      totalClaims: 90 + hashAbs(p.providerCode) % 60,
      flaggedClaims: 8 + hashAbs(p.providerCode) % 7,
      denialRate: "15.20",
      avgClaimAmount: "2800.00",
      totalExposure: "220000.00",
      claimsPerMonth: "15.00",
      fwaCaseCount: 0,
      reasons: bg.reasons,
      lastFlaggedDate: new Date("2026-01-05"),
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// 3. High-Risk Patients (shared patients across case study providers)
// ---------------------------------------------------------------------------

function buildHighRiskPatientRows() {
  const rows: Array<{
    patientId: string;
    patientName: string;
    memberId: string;
    riskScore: string;
    riskLevel: "critical" | "high" | "medium" | "low";
    totalClaims: number;
    flaggedClaims: number;
    totalAmount: string;
    fwaCaseCount: number;
    primaryDiagnosis: string;
    reasons: string[];
    lastClaimDate: Date;
  }> = [];

  // Case Study 1 patients — 10 shared patients across the dental ring
  for (let i = 1; i <= 10; i++) {
    const patId = `PAT-CS1-${pad(i, 3)}`;
    const nameIdx = (i - 1) % SAUDI_MALE_FIRST_NAMES.length;
    const famIdx = (i - 1) % SAUDI_FAMILY_NAMES.length;
    const name = `${SAUDI_MALE_FIRST_NAMES[nameIdx]} ${SAUDI_FAMILY_NAMES[famIdx]}`;
    rows.push({
      patientId: patId,
      patientName: name,
      memberId: `MBR-${pad(1000 + i, 6)}`,
      riskScore: String(78 + (i % 15)),
      riskLevel: i <= 4 ? "critical" : "high",
      totalClaims: 12 + (i * 3),
      flaggedClaims: 6 + (i % 5),
      totalAmount: String(18000 + i * 2200),
      fwaCaseCount: 1,
      primaryDiagnosis: "K04.7 - Periapical abscess",
      reasons: ["Claims at 3+ dental clinics in same period", "Phantom procedure suspicion"],
      lastClaimDate: new Date("2026-01-20"),
    });
  }

  // Case Study 2 patients — 8 OB/GYN patients
  for (let i = 1; i <= 8; i++) {
    const patId = `PAT-CS2-${pad(i, 3)}`;
    const nameIdx = (i - 1) % SAUDI_FEMALE_FIRST_NAMES.length;
    const famIdx = (i + 5) % SAUDI_FAMILY_NAMES.length;
    const name = `${SAUDI_FEMALE_FIRST_NAMES[nameIdx]} ${SAUDI_FAMILY_NAMES[famIdx]}`;
    rows.push({
      patientId: patId,
      patientName: name,
      memberId: `MBR-${pad(2000 + i, 6)}`,
      riskScore: String(65 + (i * 3)),
      riskLevel: "high",
      totalClaims: 3 + (i % 4),
      flaggedClaims: 2 + (i % 3),
      totalAmount: String(12000 + i * 3000),
      fwaCaseCount: 1,
      primaryDiagnosis: "O80 - Single spontaneous delivery",
      reasons: ["Normal delivery billed as C-section", "Upcoding suspicion"],
      lastClaimDate: new Date("2026-01-10"),
    });
  }

  // Case Study 3 patients — 6 patients with duplicate billing
  for (let i = 1; i <= 6; i++) {
    const patId = `PAT-CS3-${pad(i, 3)}`;
    const isExpat = i <= 3;
    let name: string;
    if (isExpat) {
      const expat = EXPAT_NAMES[(i - 1) % EXPAT_NAMES.length];
      name = `${expat.firstName} ${expat.lastName}`;
    } else {
      const nameIdx = (i + 10) % SAUDI_MALE_FIRST_NAMES.length;
      const famIdx = (i + 10) % SAUDI_FAMILY_NAMES.length;
      name = `${SAUDI_MALE_FIRST_NAMES[nameIdx]} ${SAUDI_FAMILY_NAMES[famIdx]}`;
    }
    rows.push({
      patientId: patId,
      patientName: name,
      memberId: `MBR-${pad(3000 + i, 6)}`,
      riskScore: String(70 + (i * 2)),
      riskLevel: "high",
      totalClaims: 6 + (i % 4),
      flaggedClaims: 4 + (i % 3),
      totalAmount: String(25000 + i * 5000),
      fwaCaseCount: 1,
      primaryDiagnosis: "M54.5 - Low back pain",
      reasons: ["Same procedure billed to multiple insurers", "Cross-insurer duplicate"],
      lastClaimDate: new Date("2026-01-18"),
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// 4. High-Risk Doctors
// ---------------------------------------------------------------------------

function buildHighRiskDoctorRows() {
  const rows: Array<{
    doctorId: string;
    doctorName: string;
    specialty: string;
    licenseNumber: string;
    organization: string;
    riskScore: string;
    riskLevel: "critical" | "high" | "medium" | "low";
    totalClaims: number;
    flaggedClaims: number;
    avgClaimAmount: string;
    totalExposure: string;
    fwaCaseCount: number;
    reasons: string[];
    lastFlaggedDate: Date;
  }> = [];

  // Case Study 1 — dentists at the ring clinics
  const cs1Dentists = [
    { id: "DOC-CS1-001", name: "Dr. Khalid Al-Rashidi", org: "Al Noor Dental Center", score: 92 },
    { id: "DOC-CS1-002", name: "Dr. Faisal Al-Dosari", org: "Smile Plus Clinic", score: 88 },
    { id: "DOC-CS1-003", name: "Dr. Omar Al-Otaibi", org: "Riyadh Dental Care", score: 85 },
    { id: "DOC-CS1-004", name: "Dr. Bandar Al-Harbi", org: "Pearl Dental Center", score: 83 },
  ];
  for (const doc of cs1Dentists) {
    rows.push({
      doctorId: doc.id,
      doctorName: doc.name,
      specialty: "Dentistry",
      licenseNumber: `SCFHS-DEN-${doc.id.slice(-3)}`,
      organization: doc.org,
      riskScore: String(doc.score),
      riskLevel: doc.score >= 85 ? "critical" : "high",
      totalClaims: 160 + hashAbs(doc.id) % 50,
      flaggedClaims: 28 + hashAbs(doc.id) % 12,
      avgClaimAmount: "3100.00",
      totalExposure: "520000.00",
      fwaCaseCount: 1,
      reasons: ["Phantom billing on extracted teeth", "Impossible procedure sequences"],
      lastFlaggedDate: new Date("2026-01-15"),
    });
  }

  // Case Study 2 — OB/GYN doctors
  const cs2Docs = [
    { id: "DOC-CS2-001", name: "Dr. Haya Al-Zahrani", org: "Al Hayat Women's Hospital", score: 78 },
    { id: "DOC-CS2-002", name: "Dr. Sara Al-Ghamdi", org: "Al Hayat Women's Hospital", score: 74 },
  ];
  for (const doc of cs2Docs) {
    rows.push({
      doctorId: doc.id,
      doctorName: doc.name,
      specialty: "OB/GYN",
      licenseNumber: `SCFHS-OBG-${doc.id.slice(-3)}`,
      organization: doc.org,
      riskScore: String(doc.score),
      riskLevel: "high",
      totalClaims: 120 + hashAbs(doc.id) % 30,
      flaggedClaims: 18 + hashAbs(doc.id) % 8,
      avgClaimAmount: "9200.00",
      totalExposure: "750000.00",
      fwaCaseCount: 1,
      reasons: ["Systematic upcoding of deliveries", "C-section rate 3x above peer average"],
      lastFlaggedDate: new Date("2026-01-10"),
    });
  }

  // Case Study 3 — multi-specialty doctors
  rows.push({
    doctorId: "DOC-CS3-001",
    doctorName: "Dr. Abdullah Al-Shehri",
    specialty: "Internal Medicine",
    licenseNumber: "SCFHS-INT-001",
    organization: "Eastern Province Medical Center",
    riskScore: "71",
    riskLevel: "high",
    totalClaims: 95,
    flaggedClaims: 15,
    avgClaimAmount: "4500.00",
    totalExposure: "980000.00",
    fwaCaseCount: 1,
    reasons: ["Cross-insurer duplicate submissions", "Same-day multi-insurer billing"],
    lastFlaggedDate: new Date("2026-01-18"),
  });

  return rows;
}

// ---------------------------------------------------------------------------
// 5. Claims
// ---------------------------------------------------------------------------

function buildClaimRows() {
  const allClaims: Array<Record<string, any>> = [];
  let claimSeq = 0;

  function makeClaimId(seq: number): string {
    return `CLM-CHI-${pad(seq, 5)}`;
  }

  // ----- Case Study 1: Riyadh Dental Ring — 35 flagged claims -----
  const dentalIcds = ["K04.7", "K02.1", "K08.1"];
  const dentalCpts = ["D3310", "D2740", "D7140", "D2750", "D3320"];
  const cs1Insurers = [SAUDI_INSURERS[0], SAUDI_INSURERS[1], SAUDI_INSURERS[2]]; // Bupa, Tawuniya, Medgulf
  const cs1Patients = Array.from({ length: 10 }, (_, i) => `PAT-CS1-${pad(i + 1, 3)}`);
  const cs1Descriptions = [
    "Root canal therapy on tooth #14 — previously extracted per records",
    "Porcelain crown #18 — second crown billed within 14-day window",
    "Comprehensive dental restoration — phantom billing suspected",
    "Multiple root canals same patient same week across clinics",
    "Crown preparation and seating — duplicate submission",
    "Periapical surgery — no supporting radiograph on file",
    "Full mouth rehabilitation — excessive charges for reported services",
  ];

  for (let i = 0; i < 35; i++) {
    claimSeq++;
    const providerIdx = i % CASE_STUDY_1_PROVIDERS.length;
    const provider = CASE_STUDY_1_PROVIDERS[providerIdx];
    const patientId = cs1Patients[i % cs1Patients.length];
    const insurer = cs1Insurers[i % cs1Insurers.length];
    const icd = dentalIcds[i % dentalIcds.length];
    const cpt = dentalCpts[i % dentalCpts.length];
    const amount = 1500 + (i * 137) % 3500; // SAR 1,500 - 5,000

    allClaims.push({
      id: makeClaimId(claimSeq),
      claimNumber: `CLM-2026-CS1-${pad(i + 1, 3)}`,
      policyNumber: `POL-${insurer.id}-${pad(100 + i, 4)}`,
      registrationDate: dateInRange(new Date("2025-08-01"), new Date("2026-01-30"), `cs1-reg-${i}`),
      claimType: "Outpatient",
      hospital: provider.nameEn,
      amount: String(amount),
      outlierScore: String((0.75 + (i % 20) * 0.012).toFixed(2)),
      description: cs1Descriptions[i % cs1Descriptions.length],
      icd,
      cptCodes: [cpt, dentalCpts[(i + 1) % dentalCpts.length]],
      diagnosisCodes: [icd, dentalIcds[(i + 1) % dentalIcds.length]],
      providerId: provider.providerCode,
      providerName: provider.nameEn,
      patientId,
      patientName: `Dental Patient ${i + 1}`,
      serviceDate: dateInRange(new Date("2025-07-15"), new Date("2026-01-25"), `cs1-svc-${i}`),
      status: "flagged",
      category: "Dental",
      flagged: true,
      flagReason: "Phantom billing pattern — dental ring",
      providerCity: provider.city,
      providerRegion: provider.region,
      insuredId: `NID-${pad(1000000 + i * 111, 10)}`,
      gender: i % 3 === 0 ? "Female" : "Male",
      nationality: "Saudi",
      specialty: "Dentistry",
      providerType: "dental_clinic",
    });
  }

  // ----- Case Study 2: Jeddah OB/GYN Upcoding — 23 flagged claims -----
  const obgynIcds = ["O80", "O82", "Z34.0", "O47.0"];
  const obgynCpts = ["59400", "59510", "59410", "59610", "59025"];
  const cs2Provider = CASE_STUDY_2_PROVIDERS[0];
  const cs2Patients = Array.from({ length: 8 }, (_, i) => `PAT-CS2-${pad(i + 1, 3)}`);
  const cs2Descriptions = [
    "Normal delivery billed as cesarean section — SAR 12,000 vs expected SAR 4,500",
    "Routine prenatal visit upcoded to high-complexity evaluation",
    "Vaginal delivery coded as emergency C-section without clinical justification",
    "Prenatal monitoring billed as inpatient observation — 3x normal rate",
    "Standard delivery with epidural upcoded to complicated cesarean",
    "Routine ultrasound billed as high-risk fetal assessment",
  ];

  for (let i = 0; i < 23; i++) {
    claimSeq++;
    const patientId = cs2Patients[i % cs2Patients.length];
    const icd = obgynIcds[i % obgynIcds.length];
    const cpt = obgynCpts[i % obgynCpts.length];
    // Upcoded amounts: normal delivery ~4500 but billed as c-section ~12000
    const amount = i % 3 === 0 ? 12000 + (i * 200) : 8500 + (i * 150);
    const insurer = i % 2 === 0 ? SAUDI_INSURERS[0] : SAUDI_INSURERS[1];

    allClaims.push({
      id: makeClaimId(claimSeq),
      claimNumber: `CLM-2026-CS2-${pad(i + 1, 3)}`,
      policyNumber: `POL-${insurer.id}-${pad(200 + i, 4)}`,
      registrationDate: dateInRange(new Date("2025-09-01"), new Date("2026-01-20"), `cs2-reg-${i}`),
      claimType: "Inpatient",
      hospital: cs2Provider.nameEn,
      amount: String(amount),
      outlierScore: String((0.72 + (i % 15) * 0.015).toFixed(2)),
      description: cs2Descriptions[i % cs2Descriptions.length],
      icd,
      cptCodes: [cpt],
      diagnosisCodes: [icd, obgynIcds[(i + 1) % obgynIcds.length]],
      providerId: cs2Provider.providerCode,
      providerName: cs2Provider.nameEn,
      patientId,
      patientName: `OB/GYN Patient ${i + 1}`,
      serviceDate: dateInRange(new Date("2025-08-15"), new Date("2026-01-15"), `cs2-svc-${i}`),
      status: "flagged",
      category: "OB/GYN",
      flagged: true,
      flagReason: "Upcoding — normal delivery billed as C-section",
      providerCity: cs2Provider.city,
      providerRegion: cs2Provider.region,
      insuredId: `NID-${pad(2000000 + i * 222, 10)}`,
      gender: "Female",
      nationality: "Saudi",
      specialty: "OB/GYN",
      providerType: "specialist_hospital",
    });
  }

  // ----- Case Study 3: Cross-Insurer Duplicates — 18 flagged claims (9 pairs) -----
  const cs3Provider = CASE_STUDY_3_PROVIDERS[0];
  const cs3Patients = Array.from({ length: 6 }, (_, i) => `PAT-CS3-${pad(i + 1, 3)}`);
  const cs3Icds = ["M54.5", "J06.9", "E11.9", "I10"];
  const cs3Cpts = ["99214", "99215", "71046", "93000", "80053"];
  const cs3Descriptions = [
    "Office visit — same service submitted to Bupa Arabia and Gulf Union",
    "Diagnostic imaging — duplicate submission across insurers",
    "Lab panel — identical order billed to two insurance carriers",
    "Consultation — cross-insurer duplicate detected",
    "Therapeutic procedure — same-day claim to multiple payers",
  ];

  for (let pair = 0; pair < 9; pair++) {
    const patientId = cs3Patients[pair % cs3Patients.length];
    const icd = cs3Icds[pair % cs3Icds.length];
    const cpt = cs3Cpts[pair % cs3Cpts.length];
    const amount = 2000 + (pair * 350);
    const svcDate = dateInRange(new Date("2025-10-01"), new Date("2026-01-20"), `cs3-svc-${pair}`);

    // Claim A — Bupa Arabia (INS-001)
    claimSeq++;
    allClaims.push({
      id: makeClaimId(claimSeq),
      claimNumber: `CLM-2026-CS3-${pad(pair * 2 + 1, 3)}`,
      policyNumber: `POL-INS-001-${pad(300 + pair, 4)}`,
      registrationDate: dateInRange(new Date("2025-10-05"), new Date("2026-01-25"), `cs3a-reg-${pair}`),
      claimType: "Outpatient",
      hospital: cs3Provider.nameEn,
      amount: String(amount),
      outlierScore: String((0.78 + (pair % 10) * 0.02).toFixed(2)),
      description: cs3Descriptions[pair % cs3Descriptions.length],
      icd,
      cptCodes: [cpt],
      diagnosisCodes: [icd],
      providerId: cs3Provider.providerCode,
      providerName: cs3Provider.nameEn,
      patientId,
      patientName: `Duplicate Patient ${pair + 1}`,
      serviceDate: svcDate,
      status: "flagged",
      category: "Multi-Specialty",
      flagged: true,
      flagReason: "Cross-insurer duplicate — Claim A (Bupa Arabia)",
      providerCity: cs3Provider.city,
      providerRegion: cs3Provider.region,
      insuredId: `NID-${pad(3000000 + pair * 333, 10)}`,
      gender: pair % 2 === 0 ? "Male" : "Female",
      nationality: pair < 3 ? "Indian" : "Saudi",
      specialty: "Multi-Specialty",
      providerType: "multi_specialty",
    });

    // Claim B — Gulf Union (INS-005) — same service, different insurer
    claimSeq++;
    allClaims.push({
      id: makeClaimId(claimSeq),
      claimNumber: `CLM-2026-CS3-${pad(pair * 2 + 2, 3)}`,
      policyNumber: `POL-INS-005-${pad(300 + pair, 4)}`,
      registrationDate: dateInRange(new Date("2025-10-05"), new Date("2026-01-25"), `cs3b-reg-${pair}`),
      claimType: "Outpatient",
      hospital: cs3Provider.nameEn,
      amount: String(amount),
      outlierScore: String((0.80 + (pair % 10) * 0.018).toFixed(2)),
      description: cs3Descriptions[pair % cs3Descriptions.length] + " [DUPLICATE PAIR]",
      icd,
      cptCodes: [cpt],
      diagnosisCodes: [icd],
      providerId: cs3Provider.providerCode,
      providerName: cs3Provider.nameEn,
      patientId,
      patientName: `Duplicate Patient ${pair + 1}`,
      serviceDate: svcDate, // Same service date as pair
      status: "flagged",
      category: "Multi-Specialty",
      flagged: true,
      flagReason: "Cross-insurer duplicate — Claim B (Gulf Union)",
      providerCity: cs3Provider.city,
      providerRegion: cs3Provider.region,
      insuredId: `NID-${pad(3000000 + pair * 333, 10)}`,
      gender: pair % 2 === 0 ? "Male" : "Female",
      nationality: pair < 3 ? "Indian" : "Saudi",
      specialty: "Multi-Specialty",
      providerType: "multi_specialty",
    });
  }

  // ----- Normal (unflagged) background claims — ~105 claims -----
  const normalCategories = ["General Medicine", "Orthopedics", "Cardiology", "Pediatrics", "Emergency", "Pharmacy", "Radiology"];
  const normalClaimTypes = ["Inpatient", "Outpatient", "Emergency", "Pharmacy"];
  const normalStatuses = ["approved", "pending", "denied", "under_review"];

  // Use a spread of providers for background claims
  const bgProviders = ALL_PROVIDERS.filter(
    (p) => !p.providerCode.startsWith("PRV-CS")
  );

  for (let i = 0; i < 105; i++) {
    claimSeq++;
    const provider = bgProviders[i % bgProviders.length];
    const insurer = SAUDI_INSURERS[i % SAUDI_INSURERS.length];
    const category = normalCategories[i % normalCategories.length];
    const claimType = normalClaimTypes[i % normalClaimTypes.length];
    const status = normalStatuses[i % normalStatuses.length];
    const icdCode = COMMON_ICD10AM_CODES[i % COMMON_ICD10AM_CODES.length];
    const amount = claimType === "Inpatient" ? 5000 + (i * 431) % 45000 :
                   claimType === "Emergency" ? 2000 + (i * 287) % 15000 :
                   claimType === "Pharmacy" ? 200 + (i * 53) % 3000 :
                   500 + (i * 173) % 8000;

    const isMale = i % 3 !== 0;
    const namePool = isMale ? SAUDI_MALE_FIRST_NAMES : SAUDI_FEMALE_FIRST_NAMES;
    const firstName = namePool[i % namePool.length];
    const lastName = SAUDI_FAMILY_NAMES[i % SAUDI_FAMILY_NAMES.length];

    const isExpat = i % 7 === 0;
    let patientName: string;
    let nationality: string;
    if (isExpat) {
      const expat = EXPAT_NAMES[i % EXPAT_NAMES.length];
      patientName = `${expat.firstName} ${expat.lastName}`;
      nationality = expat.nationality;
    } else {
      patientName = `${firstName} ${lastName}`;
      nationality = "Saudi";
    }

    allClaims.push({
      id: makeClaimId(claimSeq),
      claimNumber: `CLM-2026-BG-${pad(i + 1, 4)}`,
      policyNumber: `POL-${insurer.id}-${pad(500 + i, 4)}`,
      registrationDate: dateInRange(DATE_START, DATE_END, `bg-reg-${i}`),
      claimType,
      hospital: provider.nameEn,
      amount: String(amount),
      outlierScore: String((0.05 + (i % 50) * 0.01).toFixed(2)),
      description: `${category} ${claimType.toLowerCase()} services`,
      icd: icdCode.code,
      cptCodes: ["99213", "99214"].slice(0, 1 + (i % 2)),
      diagnosisCodes: [icdCode.code],
      providerId: provider.providerCode,
      providerName: provider.nameEn,
      patientId: `PAT-BG-${pad(i + 1, 4)}`,
      patientName,
      serviceDate: dateInRange(DATE_START, DATE_END, `bg-svc-${i}`),
      status,
      category,
      flagged: false,
      flagReason: null,
      providerCity: provider.city,
      providerRegion: provider.region,
      insuredId: `NID-${pad(5000000 + i * 777, 10)}`,
      gender: isMale ? "Male" : "Female",
      nationality,
      specialty: provider.specialty,
      providerType: provider.type,
    });
  }

  return allClaims;
}

// ---------------------------------------------------------------------------
// 6. Enforcement Cases
// ---------------------------------------------------------------------------

function buildEnforcementCaseRows() {
  const rows: Array<Record<string, any>> = [];

  // Case Study 1: Riyadh Dental Ring
  rows.push({
    caseNumber: "ENF-2026-CS1-001",
    providerId: "PRV-CS1-001",
    providerName: "Al Noor Dental Center (Ring Leader)",
    status: "penalty_proposed",
    violationCode: "VIO-PHANTOM-001",
    violationTitle: "Phantom Billing — Coordinated Dental Ring",
    severity: "critical",
    description: "Coordinated phantom billing ring involving 4 dental clinics in Riyadh. Investigation revealed systematic billing for root canals on previously extracted teeth, multiple crowns within 2-week windows, and shared patient pools across all 4 facilities. Total estimated exposure: SAR 2,300,000.",
    evidenceSummary: "35 flagged claims across 4 providers. 10 shared patients identified. Cross-referencing dental records shows impossible procedure sequences. Peer comparison shows 3.2x billing volume vs comparable clinics.",
    findingDate: new Date("2025-09-15"),
    fineAmount: "2300000.00",
    penaltyType: "fine",
    assignedInvestigator: "Fahad Al-Rashidi",
    linkedFwaCaseIds: ["FWA-CS1-001"],
  });

  // Case Study 2: Jeddah OB/GYN Upcoding
  rows.push({
    caseNumber: "ENF-2026-CS2-001",
    providerId: "PRV-CS2-001",
    providerName: "Al Hayat Women's Hospital",
    status: "corrective_action",
    violationCode: "VIO-UPCODE-001",
    violationTitle: "Systematic Upcoding — OB/GYN Services",
    severity: "major",
    description: "Systematic upcoding of normal vaginal deliveries as cesarean sections at Al Hayat Women's Hospital. C-section billing rate of 68% vs national average of 23%. Normal deliveries billed at SAR 12,000 (C-section rate) instead of SAR 4,500. Estimated overcharges: SAR 890,000.",
    evidenceSummary: "23 flagged claims reviewed. Medical record audit confirms normal deliveries recoded as C-sections. Two attending physicians identified. Hospital's C-section rate is 3x the national benchmark.",
    findingDate: new Date("2025-10-20"),
    correctiveActionDescription: "Hospital required to implement coding compliance program, retrain billing staff, and submit to quarterly audits for 12 months.",
    correctiveActionDueDate: new Date("2026-04-20"),
    fineAmount: "890000.00",
    penaltyType: "fine",
    assignedInvestigator: "Noura Al-Dosari",
    linkedFwaCaseIds: ["FWA-CS2-001"],
  });

  // Case Study 3: Cross-Insurer Duplicates
  rows.push({
    caseNumber: "ENF-2026-CS3-001",
    providerId: "PRV-CS3-001",
    providerName: "Eastern Province Medical Center",
    status: "finding",
    violationCode: "VIO-DUPBILL-001",
    violationTitle: "Cross-Insurer Duplicate Billing",
    severity: "major",
    description: "Eastern Province Medical Center identified billing identical services to both Bupa Arabia and Gulf Union for the same patients on the same service dates. 9 duplicate pairs identified involving 6 patients. Total duplicate billing: SAR 1,100,000.",
    evidenceSummary: "18 flagged claims (9 duplicate pairs). Cross-referencing Bupa Arabia and Gulf Union claim databases confirms identical service codes, dates, and patient identifiers. Investigation in early stages.",
    findingDate: new Date("2026-01-05"),
    fineAmount: "1100000.00",
    penaltyType: "fine",
    assignedInvestigator: "Ahmed Al-Otaibi",
    linkedFwaCaseIds: ["FWA-CS3-001"],
  });

  // ----- Background enforcement cases -----
  const bgCases = [
    {
      caseNumber: "ENF-2025-BG-001",
      providerId: "PRV-T2-001",
      providerName: "Al Farabi Dental Center",
      status: "warning_issued" as const,
      violationCode: "VIO-DOC-001",
      violationTitle: "Incomplete Documentation",
      severity: "moderate" as const,
      description: "Multiple claims submitted without required supporting documentation. 12 claims found with missing radiographs and clinical notes.",
      findingDate: new Date("2025-07-10"),
      fineAmount: "150000.00",
      penaltyType: "warning" as const,
      assignedInvestigator: "Maha Al-Harbi",
    },
    {
      caseNumber: "ENF-2025-BG-002",
      providerId: "PRV-T1-003",
      providerName: "Al Habib Medical Group",
      status: "resolved" as const,
      violationCode: "VIO-UNBUNDLE-001",
      violationTitle: "Service Unbundling",
      severity: "moderate" as const,
      description: "Laboratory services unbundled to inflate billing. Comprehensive metabolic panel components billed separately instead of as panel.",
      findingDate: new Date("2025-05-22"),
      fineAmount: "280000.00",
      penaltyType: "fine" as const,
      assignedInvestigator: "Sultan Al-Zahrani",
      resolutionDate: new Date("2025-11-15"),
      resolutionNotes: "Fine paid in full. Corrective billing procedures implemented.",
    },
    {
      caseNumber: "ENF-2025-BG-003",
      providerId: "PRV-T2-004",
      providerName: "Al Sharq Orthopedic Center",
      status: "penalty_applied" as const,
      violationCode: "VIO-UPCODE-002",
      violationTitle: "Procedure Upcoding — Orthopedics",
      severity: "major" as const,
      description: "Simple fracture treatments consistently upcoded as complex surgical procedures. 18 claims identified over 6-month period.",
      findingDate: new Date("2025-06-14"),
      fineAmount: "420000.00",
      penaltyType: "fine" as const,
      penaltyAppliedDate: new Date("2025-12-01"),
      assignedInvestigator: "Fahad Al-Rashidi",
    },
    {
      caseNumber: "ENF-2025-BG-004",
      providerId: "PRV-T3-001",
      providerName: "Dr. Al-Otaibi Solo Clinic",
      status: "appeal_submitted" as const,
      violationCode: "VIO-FREQ-001",
      violationTitle: "Excessive Visit Frequency",
      severity: "minor" as const,
      description: "Patient visit frequency significantly above peer average. Some patients scheduled for weekly follow-ups without clinical justification.",
      findingDate: new Date("2025-08-20"),
      fineAmount: "75000.00",
      penaltyType: "warning" as const,
      appealSubmittedDate: new Date("2025-12-10"),
      appealReason: "Provider argues patient population has higher acuity requiring more frequent visits.",
      assignedInvestigator: "Noura Al-Dosari",
    },
    {
      caseNumber: "ENF-2025-BG-005",
      providerId: "PRV-T2-006",
      providerName: "Al Amal Pharmacy Chain",
      status: "corrective_action" as const,
      violationCode: "VIO-DISP-001",
      violationTitle: "Medication Dispensing Irregularities",
      severity: "moderate" as const,
      description: "Controlled substance dispensing records show discrepancies between recorded prescriptions and actual dispensing. 23 instances identified.",
      findingDate: new Date("2025-09-05"),
      fineAmount: "340000.00",
      penaltyType: "fine" as const,
      correctiveActionDescription: "Full inventory audit required. Electronic dispensing tracking system to be implemented.",
      correctiveActionDueDate: new Date("2026-03-05"),
      assignedInvestigator: "Ahmed Al-Otaibi",
    },
    {
      caseNumber: "ENF-2026-BG-006",
      providerId: "PRV-T1-006",
      providerName: "Mouwasat Medical Services",
      status: "finding" as const,
      violationCode: "VIO-REF-001",
      violationTitle: "Referral Pattern Anomaly",
      severity: "minor" as const,
      description: "Unusual referral patterns detected between Mouwasat and affiliated specialist clinics. Investigation initiated to assess potential referral churning.",
      findingDate: new Date("2026-01-20"),
      fineAmount: null,
      penaltyType: null,
      assignedInvestigator: "Sultan Al-Zahrani",
    },
  ];

  for (const bg of bgCases) {
    rows.push({
      ...bg,
      evidenceSummary: bg.description,
      linkedFwaCaseIds: [],
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// 7. Online Listening Mentions
// ---------------------------------------------------------------------------

function buildOnlineListeningRows() {
  const mentions: Array<Record<string, any>> = [];

  // Case study-related mentions
  const csRelated = [
    {
      providerId: "PRV-CS1-001",
      providerName: "Al Noor Dental Center",
      source: "twitter" as const,
      authorHandle: "@SaudiHealthWatch",
      content: "Thread: Multiple patients reporting being billed for dental procedures they never received at clinics in Riyadh's Al Olaya district. Anyone else experienced this? #CHI #DentalFraud #SaudiHealthcare",
      sentiment: "very_negative" as const,
      sentimentScore: "-0.9200",
      topics: ["phantom_billing", "dental_fraud", "patient_complaints"],
      engagementCount: 2340,
      reachEstimate: 45000,
      requiresAction: true,
      publishedAt: new Date("2025-12-15"),
    },
    {
      providerId: "PRV-CS1-002",
      providerName: "Smile Plus Clinic",
      source: "sabq" as const,
      authorHandle: "صحيفة سبق",
      content: "مصادر مطلعة تكشف عن شبكة عيادات أسنان في الرياض تتلاعب بفواتير التأمين الصحي بمبالغ تتجاوز المليوني ريال. مجلس الضمان الصحي يحقق في القضية.",
      sentiment: "very_negative" as const,
      sentimentScore: "-0.8800",
      topics: ["insurance_fraud", "dental_ring", "chi_investigation"],
      engagementCount: 5670,
      reachEstimate: 120000,
      requiresAction: true,
      publishedAt: new Date("2026-01-02"),
    },
    {
      providerId: "PRV-CS2-001",
      providerName: "Al Hayat Women's Hospital",
      source: "twitter" as const,
      authorHandle: "@JeddahMoms",
      content: "Warning to expecting mothers in Jeddah: I had a normal delivery at Al Hayat but my insurance was billed for a C-section! Check your claim statements carefully. #Jeddah #Maternity #HealthInsurance",
      sentiment: "negative" as const,
      sentimentScore: "-0.7500",
      topics: ["upcoding", "maternity_billing", "patient_awareness"],
      engagementCount: 1890,
      reachEstimate: 35000,
      requiresAction: true,
      publishedAt: new Date("2025-11-20"),
    },
    {
      providerId: "PRV-CS2-001",
      providerName: "Al Hayat Women's Hospital",
      source: "alriyadh" as const,
      authorHandle: "جريدة الرياض",
      content: "مجلس الضمان الصحي يتخذ إجراءات تصحيحية ضد مستشفى خاص في جدة بعد اكتشاف ترميز مبالغ فيه لخدمات النساء والتوليد. المستشفى يلتزم بتصحيح إجراءات الفوترة.",
      sentiment: "negative" as const,
      sentimentScore: "-0.6200",
      topics: ["chi_enforcement", "upcoding", "obgyn_billing"],
      engagementCount: 3420,
      reachEstimate: 85000,
      requiresAction: false,
      publishedAt: new Date("2026-01-18"),
    },
    {
      providerId: "PRV-CS3-001",
      providerName: "Eastern Province Medical Center",
      source: "twitter" as const,
      authorHandle: "@InsuranceWatch_SA",
      content: "Hearing reports of a major medical center in Dammam billing both Bupa Arabia and Gulf Union for the same procedures. Cross-insurer fraud detection finally working! #HealthInsurance #FraudDetection",
      sentiment: "negative" as const,
      sentimentScore: "-0.7000",
      topics: ["duplicate_billing", "cross_insurer_fraud", "eastern_province"],
      engagementCount: 890,
      reachEstimate: 18000,
      requiresAction: true,
      publishedAt: new Date("2026-01-22"),
    },
  ];

  // General healthcare sentiment mentions
  const general = [
    {
      providerId: "PRV-T1-002",
      providerName: "King Faisal Specialist Hospital",
      source: "twitter" as const,
      authorHandle: "@RiyadhResident",
      content: "Exceptional care at King Faisal Specialist Hospital. The oncology team is world-class. Grateful for the quality healthcare in the Kingdom. #SaudiHealthcare #Vision2030",
      sentiment: "very_positive" as const,
      sentimentScore: "0.9100",
      topics: ["quality_care", "oncology", "positive_experience"],
      engagementCount: 450,
      reachEstimate: 8000,
      requiresAction: false,
      publishedAt: new Date("2026-01-05"),
    },
    {
      providerId: null,
      providerName: null,
      source: "alsharq_alawsat" as const,
      authorHandle: "الشرق الأوسط",
      content: "مجلس الضمان الصحي يعلن عن تحديثات جديدة لنظام نفيس تشمل تحسين آليات كشف الاحتيال وتعزيز الرقابة على مقدمي الخدمات الصحية. التحديثات تدخل حيز التنفيذ في الربع الثاني من 2026.",
      sentiment: "positive" as const,
      sentimentScore: "0.6500",
      topics: ["nphies_update", "fraud_detection", "regulatory_improvement"],
      engagementCount: 2100,
      reachEstimate: 65000,
      requiresAction: false,
      publishedAt: new Date("2026-02-01"),
    },
    {
      providerId: null,
      providerName: null,
      source: "okaz" as const,
      authorHandle: "عكاظ",
      content: "تقرير: ارتفاع نسبة رضا المستفيدين عن خدمات التأمين الصحي في المملكة إلى 78% خلال الربع الرابع من 2025، بحسب استطلاع مجلس الضمان الصحي.",
      sentiment: "positive" as const,
      sentimentScore: "0.7200",
      topics: ["beneficiary_satisfaction", "chi_survey", "improvement"],
      engagementCount: 1560,
      reachEstimate: 42000,
      requiresAction: false,
      publishedAt: new Date("2026-01-12"),
    },
    {
      providerId: "PRV-T1-005",
      providerName: "Dallah Hospital",
      source: "twitter" as const,
      authorHandle: "@HealthcareQuality_SA",
      content: "Long wait times at Dallah Hospital ER again. 3 hour wait for a child with fever. Private hospitals need better resource management. #DallahHospital #WaitTimes",
      sentiment: "negative" as const,
      sentimentScore: "-0.5500",
      topics: ["wait_times", "emergency_department", "service_quality"],
      engagementCount: 320,
      reachEstimate: 6500,
      requiresAction: false,
      publishedAt: new Date("2026-01-08"),
    },
    {
      providerId: null,
      providerName: null,
      source: "almadina" as const,
      authorHandle: "المدينة",
      content: "خبراء يشيدون بدور الذكاء الاصطناعي في كشف حالات الاحتيال في التأمين الصحي بالمملكة. النظام الجديد ساهم في اكتشاف أكثر من 200 حالة خلال العام الماضي.",
      sentiment: "positive" as const,
      sentimentScore: "0.7800",
      topics: ["ai_fraud_detection", "chi_technology", "healthcare_innovation"],
      engagementCount: 1800,
      reachEstimate: 55000,
      requiresAction: false,
      publishedAt: new Date("2026-02-10"),
    },
    {
      providerId: "PRV-T1-004",
      providerName: "Saudi German Hospital",
      source: "forum" as const,
      authorHandle: "MedicalForumSA_User42",
      content: "Saudi German Hospital Jeddah has really improved their cardiac care unit. New equipment and well-trained staff. Recommend for anyone needing cardiac consultation in Jeddah.",
      sentiment: "positive" as const,
      sentimentScore: "0.6800",
      topics: ["cardiac_care", "facility_improvement", "recommendation"],
      engagementCount: 95,
      reachEstimate: 2500,
      requiresAction: false,
      publishedAt: new Date("2025-12-28"),
    },
    {
      providerId: null,
      providerName: null,
      source: "twitter" as const,
      authorHandle: "@CHI_Saudi",
      content: "مجلس الضمان الصحي يحذر من مقدمي خدمات صحية غير مرخصين يروجون لخدماتهم عبر وسائل التواصل الاجتماعي. يرجى التأكد من ترخيص المنشأة قبل العلاج.",
      sentiment: "neutral" as const,
      sentimentScore: "0.0500",
      topics: ["unlicensed_providers", "consumer_protection", "chi_warning"],
      engagementCount: 4200,
      reachEstimate: 95000,
      requiresAction: false,
      publishedAt: new Date("2026-02-05"),
    },
  ];

  for (const m of [...csRelated, ...general]) {
    mentions.push({
      providerId: m.providerId,
      providerName: m.providerName,
      source: m.source,
      sourceUrl: m.source === "twitter"
        ? `https://twitter.com/${(m.authorHandle ?? "").replace("@", "")}/status/${hashAbs(m.content.slice(0, 30))}`
        : `https://${m.source}.com/article/${hashAbs(m.content.slice(0, 30))}`,
      authorHandle: m.authorHandle,
      content: m.content,
      sentiment: m.sentiment,
      sentimentScore: m.sentimentScore,
      topics: m.topics,
      engagementCount: m.engagementCount,
      reachEstimate: m.reachEstimate,
      isVerified: m.source !== "twitter" && m.source !== "forum",
      requiresAction: m.requiresAction,
      publishedAt: m.publishedAt,
    });
  }

  return mentions;
}

// ---------------------------------------------------------------------------
// 8. FWA Cases
// ---------------------------------------------------------------------------

function buildFwaCaseRows() {
  const rows: Array<Record<string, any>> = [];

  // Case Study 1 — dental ring
  rows.push({
    caseId: "FWA-CS1-001",
    claimId: "CLM-CHI-00001", // first CS1 claim
    providerId: "PRV-CS1-001",
    patientId: "PAT-CS1-001",
    category: "coding",
    status: "escalated",
    phase: "a3_action",
    priority: "critical",
    totalAmount: "2300000.00",
    recoveryAmount: "1840000.00",
    assignedTo: "Fahad Al-Rashidi",
  });

  // Case Study 2 — OB/GYN upcoding
  rows.push({
    caseId: "FWA-CS2-001",
    claimId: "CLM-CHI-00036", // first CS2 claim (after 35 CS1 claims)
    providerId: "PRV-CS2-001",
    patientId: "PAT-CS2-001",
    category: "coding",
    status: "action_pending",
    phase: "a3_action",
    priority: "high",
    totalAmount: "890000.00",
    recoveryAmount: "667500.00",
    assignedTo: "Noura Al-Dosari",
  });

  // Case Study 3 — cross-insurer duplicates
  rows.push({
    caseId: "FWA-CS3-001",
    claimId: "CLM-CHI-00059", // first CS3 claim (after 35+23=58 claims)
    providerId: "PRV-CS3-001",
    patientId: "PAT-CS3-001",
    category: "coding",
    status: "analyzing",
    phase: "a1_analysis",
    priority: "high",
    totalAmount: "1100000.00",
    recoveryAmount: null,
    assignedTo: "Ahmed Al-Otaibi",
  });

  // Background FWA cases
  const bgFwa = [
    {
      caseId: "FWA-BG-001",
      claimId: "CLM-CHI-00077", // a background claim
      providerId: "PRV-T2-001",
      patientId: "PAT-BG-0001",
      category: "coding",
      status: "categorized" as const,
      phase: "a2_categorization" as const,
      priority: "medium" as const,
      totalAmount: "45000.00",
      recoveryAmount: "22500.00",
      assignedTo: "Maha Al-Harbi",
    },
    {
      caseId: "FWA-BG-002",
      claimId: "CLM-CHI-00085",
      providerId: "PRV-T2-004",
      patientId: "PAT-BG-0009",
      category: "management",
      status: "draft" as const,
      phase: "a1_analysis" as const,
      priority: "low" as const,
      totalAmount: "18000.00",
      recoveryAmount: null,
      assignedTo: "Sultan Al-Zahrani",
    },
    {
      caseId: "FWA-BG-003",
      claimId: "CLM-CHI-00100",
      providerId: "PRV-T1-003",
      patientId: "PAT-BG-0024",
      category: "physician",
      status: "resolved" as const,
      phase: "a3_action" as const,
      priority: "medium" as const,
      totalAmount: "72000.00",
      recoveryAmount: "54000.00",
      assignedTo: "Fahad Al-Rashidi",
    },
  ];

  for (const bg of bgFwa) {
    rows.push(bg);
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function seed() {
  console.log("=== CHI Demo Seed Script ===\n");

  // Check if data already exists
  if (!FORCE) {
    const existing = await db
      .select()
      .from(providerDirectory)
      .where(eq(providerDirectory.npi, "PRV-CS1-001"))
      .limit(1);

    if (existing.length > 0) {
      console.log("Data already seeded (found PRV-CS1-001 in provider_directory).");
      console.log("Use --force to clear and re-seed.");
      process.exit(0);
    }
  }

  // If --force, clear existing data in reverse dependency order
  if (FORCE) {
    console.log("--force flag detected. Clearing existing CHI demo data...");
    // Delete in reverse order of dependencies
    await db.execute(sql`DELETE FROM fwa_cases`);
    await db.execute(sql`DELETE FROM online_listening_mentions`);
    await db.execute(sql`DELETE FROM enforcement_cases`);
    await db.execute(sql`DELETE FROM claims_v2`);
    await db.execute(sql`DELETE FROM fwa_high_risk_doctors`);
    await db.execute(sql`DELETE FROM fwa_high_risk_patients`);
    await db.execute(sql`DELETE FROM fwa_high_risk_providers`);
    await db.execute(sql`DELETE FROM provider_directory`);
    console.log("Cleared existing data.\n");
  }

  // 1. Provider Directory
  console.log("Seeding provider directory...");
  const providerRows = buildProviderDirectoryRows();
  await db.insert(providerDirectory).values(providerRows).onConflictDoNothing();
  console.log(`  done (${providerRows.length} providers)\n`);

  // 2. High-Risk Providers
  console.log("Seeding high-risk providers...");
  const hrProviderRows = buildHighRiskProviderRows();
  await db.insert(fwaHighRiskProviders).values(hrProviderRows).onConflictDoNothing();
  console.log(`  done (${hrProviderRows.length} high-risk providers)\n`);

  // 3. High-Risk Patients
  console.log("Seeding high-risk patients...");
  const hrPatientRows = buildHighRiskPatientRows();
  await db.insert(fwaHighRiskPatients).values(hrPatientRows).onConflictDoNothing();
  console.log(`  done (${hrPatientRows.length} high-risk patients)\n`);

  // 4. High-Risk Doctors
  console.log("Seeding high-risk doctors...");
  const hrDoctorRows = buildHighRiskDoctorRows();
  await db.insert(fwaHighRiskDoctors).values(hrDoctorRows).onConflictDoNothing();
  console.log(`  done (${hrDoctorRows.length} high-risk doctors)\n`);

  // 5. Claims
  console.log("Seeding claims...");
  const claimRows = buildClaimRows();
  // Insert in batches to avoid parameter limits
  const BATCH_SIZE = 50;
  for (let i = 0; i < claimRows.length; i += BATCH_SIZE) {
    const batch = claimRows.slice(i, i + BATCH_SIZE);
    await db.insert(claims).values(batch as any).onConflictDoNothing();
  }
  console.log(`  done (${claimRows.length} claims — ${claimRows.filter((c) => c.flagged).length} flagged)\n`);

  // 6. Enforcement Cases
  console.log("Seeding enforcement cases...");
  const enforcementRows = buildEnforcementCaseRows();
  await db.insert(enforcementCases).values(enforcementRows as any).onConflictDoNothing();
  console.log(`  done (${enforcementRows.length} enforcement cases)\n`);

  // 7. Online Listening Mentions
  console.log("Seeding online listening mentions...");
  const mentionRows = buildOnlineListeningRows();
  await db.insert(onlineListeningMentions).values(mentionRows as any).onConflictDoNothing();
  console.log(`  done (${mentionRows.length} mentions)\n`);

  // 8. FWA Cases
  console.log("Seeding FWA cases...");
  const fwaRows = buildFwaCaseRows();
  await db.insert(fwaCases).values(fwaRows as any).onConflictDoNothing();
  console.log(`  done (${fwaRows.length} FWA cases)\n`);

  // Summary
  console.log("=== Seed Complete ===");
  console.log(`  Providers:           ${providerRows.length}`);
  console.log(`  High-Risk Providers: ${hrProviderRows.length}`);
  console.log(`  High-Risk Patients:  ${hrPatientRows.length}`);
  console.log(`  High-Risk Doctors:   ${hrDoctorRows.length}`);
  console.log(`  Claims:              ${claimRows.length} (${claimRows.filter((c) => c.flagged).length} flagged)`);
  console.log(`  Enforcement Cases:   ${enforcementRows.length}`);
  console.log(`  Online Mentions:     ${mentionRows.length}`);
  console.log(`  FWA Cases:           ${fwaRows.length}`);
}

seed()
  .then(() => {
    console.log("\nSeed completed successfully.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("\nSeed failed:", err);
    process.exit(1);
  });
