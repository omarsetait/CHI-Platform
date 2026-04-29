/**
 * Seed entity-anchored flagged claims so /fwa/high-risk-entities can drill
 * down into /fwa/flagged-claims?provider=...&patient=...&doctor=...
 *
 * Goals:
 *  - Expand high-risk rosters to ~30 providers / ~120 patients / ~60 doctors
 *    while preserving every existing CS1/CS2/CS3/BG case-study ID.
 *  - Insert matching FK rows in providers/members/practitioners.
 *  - Seed ~300 flagged claims_v2 rows anchored to those entities, plus
 *    fwa_claim_services, fwa_work_queue_claims, ml_claim_inference rows.
 *  - Idempotent at every step: each insert uses ON CONFLICT DO NOTHING and
 *    each phase is gated by an entity-anchored existence check (the marker
 *    is the `CLM-FWA-` claim-number prefix), so partial prior runs recover.
 *
 * Note: `fwa_analyzed_claims` is a VIEW over `claims_v2` (created in
 * server/db-indexes.ts), so seeding `claims_v2` automatically populates
 * the analyzed-claims layer used by downstream FWA pages.
 */

import { db } from "../db";
import { count, sql, eq } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import {
  providers as providersTable,
  members as membersTable,
  practitioners as practitionersTable,
  claims as claimsTable,
  fwaClaimServices,
  fwaWorkQueueClaims,
  mlClaimInference,
  fwaHighRiskProviders,
  fwaHighRiskPatients,
  fwaHighRiskDoctors,
  type InsertProvider,
  type InsertMember,
  type InsertPractitioner,
  type InsertClaim,
  type InsertFwaClaimService,
  type InsertFwaWorkQueueClaim,
  type InsertMlClaimInference,
  type InsertFwaHighRiskProvider,
  type InsertFwaHighRiskPatient,
  type InsertFwaHighRiskDoctor,
} from "@shared/schema";

// ── helpers ──────────────────────────────────────────────────────────────────

function pad(n: number, len: number): string {
  return String(n).padStart(len, "0");
}

function d(n: number, dec = 2): string {
  return n.toFixed(dec);
}

function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

async function tableCount(table: PgTable): Promise<number> {
  const result = await db.select({ c: count() }).from(table);
  return Number(result[0]?.c ?? 0);
}

async function seededClaimsCount(): Promise<number> {
  const result = await db
    .select({ c: count() })
    .from(claimsTable)
    .where(sql`${claimsTable.claimNumber} LIKE 'CLM-FWA-%'`);
  return Number(result[0]?.c ?? 0);
}

async function batchInsert<TTable extends PgTable>(
  table: TTable,
  rows: TTable["$inferInsert"][],
  size = 100,
) {
  for (let i = 0; i < rows.length; i += size) {
    await db.insert(table).values(rows.slice(i, i + size)).onConflictDoNothing();
  }
}

type RiskLevel = "critical" | "high" | "medium" | "low";
type FwaPriority = "critical" | "high" | "medium" | "low";

function riskLevelFor(score: number): RiskLevel {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

const SAUDI_MALE = ["Mohammed", "Ahmed", "Abdullah", "Khalid", "Omar", "Faisal", "Sultan", "Bandar", "Waleed", "Saud", "Yousef", "Ibrahim", "Nasser", "Talal", "Hamad"];
const SAUDI_FEMALE = ["Fatima", "Noura", "Sara", "Haya", "Maha", "Lena", "Reem", "Dana", "Abeer", "Rima", "Hessa", "Aisha", "Lamia", "Mona", "Hala"];
const SAUDI_FAMILY = ["Al-Rashidi", "Al-Dosari", "Al-Otaibi", "Al-Harbi", "Al-Zahrani", "Al-Ghamdi", "Al-Shehri", "Al-Qahtani", "Al-Mutairi", "Al-Anazi", "Al-Subaie", "Al-Shammari", "Al-Juhani", "Al-Maliki", "Al-Hashimi"];
const REGIONS = ["Riyadh", "Jeddah", "Dammam", "Mecca", "Medina", "Tabuk", "Al Khobar"];
const PAYER_IDS = ["TAWUNIYA", "BUPA-ARABIA", "MEDGULF", "WALAA"];

// Per-CS group archetypes
type Group = "CS1" | "CS2" | "CS3" | "BG";

const GROUP_SPEC: Record<Group, {
  providerSpecialty: string;
  providerType: string;
  doctorSpecialty: string;
  primaryDx: string;
  icd: string[];
  cpt: string[];
  category: string;
  amountRange: [number, number];
}> = {
  CS1: {
    providerSpecialty: "Dentistry",
    providerType: "dental_clinic",
    doctorSpecialty: "Dentistry",
    primaryDx: "K04.7 - Periapical abscess without sinus",
    icd: ["K04.7", "K02.9", "K05.1"],
    cpt: ["D3310", "D2740", "D2950", "D7140"],
    category: "phantom_billing",
    amountRange: [1800, 4200],
  },
  CS2: {
    providerSpecialty: "OB/GYN",
    providerType: "hospital",
    doctorSpecialty: "OB/GYN",
    primaryDx: "O80 - Single spontaneous delivery",
    icd: ["O80", "O82", "Z34.0"],
    cpt: ["59409", "59514", "59025"],
    category: "upcoding",
    amountRange: [6500, 12500],
  },
  CS3: {
    providerSpecialty: "Internal Medicine",
    providerType: "hospital",
    doctorSpecialty: "Internal Medicine",
    primaryDx: "M54.5 - Low back pain",
    icd: ["M54.5", "M51.36", "G89.29"],
    cpt: ["99213", "99214", "72148", "20610"],
    category: "cross_insurer_duplicate",
    amountRange: [2500, 7500],
  },
  BG: {
    providerSpecialty: "Multi-Specialty",
    providerType: "clinic",
    doctorSpecialty: "General Practice",
    primaryDx: "R51 - Headache",
    icd: ["R51", "J06.9", "I10"],
    cpt: ["99212", "99213", "85025"],
    category: "billing_anomaly",
    amountRange: [600, 2400],
  },
};

// ── Roster expansion specs ───────────────────────────────────────────────────

interface ProviderSpec { id: string; name: string; group: Group; }
interface PatientSpec { id: string; memberId: string; group: Group; index: number; }
interface DoctorSpec { id: string; name: string; group: Group; primaryFacilityId: string; }

function buildProviderRoster(): ProviderSpec[] {
  const list: ProviderSpec[] = [];
  // Existing 8 (preserved by ID — must match seed-all-sections.ts)
  list.push({ id: "PRV-CS1-001", name: "Al Noor Dental Center", group: "CS1" });
  list.push({ id: "PRV-CS1-002", name: "Smile Plus Clinic", group: "CS1" });
  list.push({ id: "PRV-CS2-001", name: "Al Hayat Women's Hospital", group: "CS2" });
  list.push({ id: "PRV-CS3-001", name: "Eastern Province Medical Center", group: "CS3" });
  list.push({ id: "PRV-BG-001", name: "Riyadh Specialist Clinic", group: "BG" });
  list.push({ id: "PRV-BG-002", name: "Dammam Medical Plaza", group: "BG" });
  list.push({ id: "PRV-BG-003", name: "Jeddah Polyclinic Center", group: "BG" });
  list.push({ id: "PRV-BG-004", name: "Al Ahsa Specialist Hospital", group: "BG" });

  const expansionDental = [
    "Riyadh Dental Care", "Crystal Dental Clinic", "Pearl White Dental",
    "Al Salama Dental", "Bright Smile Clinic", "Royal Dental Group",
    "Najd Dental Care", "Al Faisaliah Dental",
  ];
  expansionDental.forEach((name, i) => {
    list.push({ id: `PRV-CS1-${pad(i + 3, 3)}`, name, group: "CS1" });
  });

  const expansionObgyn = [
    "Tahaluf Maternity Hospital", "Riyadh Women's Center",
    "Al Salam Maternity Hospital", "Al Rajaa Women's Hospital",
  ];
  expansionObgyn.forEach((name, i) => {
    list.push({ id: `PRV-CS2-${pad(i + 2, 3)}`, name, group: "CS2" });
  });

  const expansionXIns = [
    "Gulf General Hospital", "Al Manarah Medical Center", "King Abdullah Hospital",
  ];
  expansionXIns.forEach((name, i) => {
    list.push({ id: `PRV-CS3-${pad(i + 2, 3)}`, name, group: "CS3" });
  });

  const expansionBg = [
    "Tabuk Family Clinic", "Mecca Health Center", "Madinah Specialist Polyclinic",
    "Khobar Medical Center", "Northern Region Clinic", "Western Plaza Clinic",
    "Central Valley Clinic",
  ];
  expansionBg.forEach((name, i) => {
    list.push({ id: `PRV-BG-${pad(i + 5, 3)}`, name, group: "BG" });
  });

  return list; // 8 + 8 + 4 + 3 + 7 = 30
}

function buildPatientRoster(): PatientSpec[] {
  const list: PatientSpec[] = [];

  // Existing 25 (preserve IDs and member IDs from seed-all-sections.ts)
  for (let i = 1; i <= 10; i++) {
    list.push({ id: `PAT-CS1-${pad(i, 3)}`, memberId: `MBR-${pad(1000 + i, 6)}`, group: "CS1", index: i });
  }
  for (let i = 1; i <= 8; i++) {
    list.push({ id: `PAT-CS2-${pad(i, 3)}`, memberId: `MBR-${pad(2000 + i, 6)}`, group: "CS2", index: i });
  }
  for (let i = 1; i <= 7; i++) {
    list.push({ id: `PAT-CS3-${pad(i, 3)}`, memberId: `MBR-${pad(3000 + i, 6)}`, group: "CS3", index: i });
  }

  // Expansion → 120 total: +40 CS1, +30 CS2, +25 CS3
  for (let i = 11; i <= 50; i++) {
    list.push({ id: `PAT-CS1-${pad(i, 3)}`, memberId: `MBR-${pad(1000 + i, 6)}`, group: "CS1", index: i });
  }
  for (let i = 9; i <= 38; i++) {
    list.push({ id: `PAT-CS2-${pad(i, 3)}`, memberId: `MBR-${pad(2000 + i, 6)}`, group: "CS2", index: i });
  }
  for (let i = 8; i <= 32; i++) {
    list.push({ id: `PAT-CS3-${pad(i, 3)}`, memberId: `MBR-${pad(3000 + i, 6)}`, group: "CS3", index: i });
  }

  return list; // 25 + 95 = 120
}

function buildDoctorRoster(providersList: ProviderSpec[]): DoctorSpec[] {
  const list: DoctorSpec[] = [];

  // Existing 10 (preserve IDs from seed-all-sections.ts)
  list.push({ id: "DOC-CS1-001", name: "Dr. Khalid Al-Rashidi", group: "CS1", primaryFacilityId: "PRV-CS1-001" });
  list.push({ id: "DOC-CS1-002", name: "Dr. Faisal Al-Dosari", group: "CS1", primaryFacilityId: "PRV-CS1-002" });
  list.push({ id: "DOC-CS1-003", name: "Dr. Omar Al-Otaibi", group: "CS1", primaryFacilityId: "PRV-CS1-003" });
  list.push({ id: "DOC-CS2-001", name: "Dr. Haya Al-Zahrani", group: "CS2", primaryFacilityId: "PRV-CS2-001" });
  list.push({ id: "DOC-CS2-002", name: "Dr. Sara Al-Ghamdi", group: "CS2", primaryFacilityId: "PRV-CS2-001" });
  list.push({ id: "DOC-CS3-001", name: "Dr. Abdullah Al-Shehri", group: "CS3", primaryFacilityId: "PRV-CS3-001" });
  list.push({ id: "DOC-BG-001", name: "Dr. Ahmad Al-Farhan", group: "BG", primaryFacilityId: "PRV-BG-001" });
  list.push({ id: "DOC-BG-002", name: "Dr. Saleh Al-Mutairi", group: "BG", primaryFacilityId: "PRV-BG-002" });
  list.push({ id: "DOC-BG-003", name: "Dr. Layla Al-Shammari", group: "BG", primaryFacilityId: "PRV-BG-003" });
  list.push({ id: "DOC-BG-004", name: "Dr. Omar Al-Dosari", group: "BG", primaryFacilityId: "PRV-BG-004" });

  // Expansion → 60 total: +17 CS1, +15 CS2, +12 CS3, +6 BG
  const cs1Providers = providersList.filter((p) => p.group === "CS1");
  const cs2Providers = providersList.filter((p) => p.group === "CS2");
  const cs3Providers = providersList.filter((p) => p.group === "CS3");
  const bgProviders = providersList.filter((p) => p.group === "BG");

  for (let i = 4; i <= 20; i++) {
    const provider = cs1Providers[i % cs1Providers.length];
    const first = SAUDI_MALE[i % SAUDI_MALE.length];
    const last = SAUDI_FAMILY[(i + 2) % SAUDI_FAMILY.length];
    list.push({ id: `DOC-CS1-${pad(i, 3)}`, name: `Dr. ${first} ${last}`, group: "CS1", primaryFacilityId: provider.id });
  }
  for (let i = 3; i <= 17; i++) {
    const provider = cs2Providers[i % cs2Providers.length];
    const first = SAUDI_FEMALE[i % SAUDI_FEMALE.length];
    const last = SAUDI_FAMILY[(i + 4) % SAUDI_FAMILY.length];
    list.push({ id: `DOC-CS2-${pad(i, 3)}`, name: `Dr. ${first} ${last}`, group: "CS2", primaryFacilityId: provider.id });
  }
  for (let i = 2; i <= 13; i++) {
    const provider = cs3Providers[i % cs3Providers.length];
    const first = SAUDI_MALE[(i + 5) % SAUDI_MALE.length];
    const last = SAUDI_FAMILY[(i + 7) % SAUDI_FAMILY.length];
    list.push({ id: `DOC-CS3-${pad(i, 3)}`, name: `Dr. ${first} ${last}`, group: "CS3", primaryFacilityId: provider.id });
  }
  for (let i = 5; i <= 10; i++) {
    const provider = bgProviders[i % bgProviders.length];
    const first = SAUDI_MALE[(i + 3) % SAUDI_MALE.length];
    const last = SAUDI_FAMILY[(i + 9) % SAUDI_FAMILY.length];
    list.push({ id: `DOC-BG-${pad(i, 3)}`, name: `Dr. ${first} ${last}`, group: "BG", primaryFacilityId: provider.id });
  }

  return list; // 10 + 17 + 15 + 12 + 6 = 60
}

function patientFullName(p: PatientSpec): string {
  const isFemale = p.group === "CS2";
  const first = (isFemale ? SAUDI_FEMALE : SAUDI_MALE)[p.index % 10];
  const last = SAUDI_FAMILY[(p.index + 2) % SAUDI_FAMILY.length];
  return `${first} ${last}`;
}

// ── Step 1: Insert FK base rows (providers/members/practitioners) ────────────

async function seedProviderBaseRows(roster: ProviderSpec[]): Promise<void> {
  const rng = prng(0xa1b2c3);
  const rows: InsertProvider[] = roster.map((p) => {
    const spec = GROUP_SPEC[p.group];
    const region = REGIONS[Math.floor(rng() * REGIONS.length)];
    return {
      id: p.id,
      npi: `NPI-${p.id.replace(/-/g, "")}`,
      name: p.name,
      providerType: spec.providerType,
      specialty: spec.providerSpecialty,
      region,
      city: region,
      networkTier: p.group === "BG" ? "tier_2" : "tier_1",
      organization: p.name,
      contractStatus: "active",
      hcpCode: `HCP-${p.id.slice(-3)}`,
    };
  });
  await batchInsert(providersTable, rows);
}

async function seedMemberBaseRows(roster: PatientSpec[]): Promise<void> {
  const rng = prng(0xb2c3d4);
  const rows: InsertMember[] = roster.map((p) => {
    const isFemale = p.group === "CS2" || (p.group !== "CS1" && p.index % 3 === 0);
    const first = (isFemale ? SAUDI_FEMALE : SAUDI_MALE)[p.index % 10];
    const last = SAUDI_FAMILY[(p.index + (p.group === "CS3" ? 6 : p.group === "CS2" ? 3 : 0)) % SAUDI_FAMILY.length];
    const region = REGIONS[Math.floor(rng() * REGIONS.length)];
    const yob = 1965 + Math.floor(rng() * 45);
    const mob = 1 + Math.floor(rng() * 12);
    const dob = 1 + Math.floor(rng() * 27);
    return {
      id: p.memberId,
      payerId: PAYER_IDS[p.index % PAYER_IDS.length],
      name: `${first} ${last}`,
      dateOfBirth: `${yob}-${pad(mob, 2)}-${pad(dob, 2)}`,
      gender: isFemale ? "F" : "M",
      nationality: "Saudi",
      region,
      groupNumber: `GRP-${p.group}-${pad(Math.floor(p.index / 10) + 1, 3)}`,
      coverageRelationship: "self",
      networkTier: p.group === "BG" ? "tier_2" : "tier_1",
      preExistingFlag: p.group === "CS3",
    };
  });
  await batchInsert(membersTable, rows);
}

async function seedPractitionerBaseRows(roster: DoctorSpec[]): Promise<void> {
  const rows: InsertPractitioner[] = roster.map((doc) => {
    const spec = GROUP_SPEC[doc.group];
    const credCode = doc.group === "CS1" ? "DEN" : doc.group === "CS2" ? "OBG" : doc.group === "CS3" ? "INT" : "GP";
    return {
      id: doc.id,
      name: doc.name,
      specialty: spec.doctorSpecialty,
      specialtyCode: credCode,
      credentials: doc.group === "CS2" ? "MD, FACOG" : "MD",
      licenseNumber: `SCFHS-${credCode}-${doc.id.slice(-3)}`,
      primaryFacilityId: doc.primaryFacilityId,
    };
  });
  await batchInsert(practitionersTable, rows);
}

// ── Step 2: Expand high-risk roster tables ───────────────────────────────────

const EXISTING_PROVIDER_IDS = new Set([
  "PRV-CS1-001", "PRV-CS1-002", "PRV-CS2-001", "PRV-CS3-001",
  "PRV-BG-001", "PRV-BG-002", "PRV-BG-003", "PRV-BG-004",
]);

const EXISTING_PATIENT_IDS = new Set<string>(
  ((): string[] => {
    const arr: string[] = [];
    for (let i = 1; i <= 10; i++) arr.push(`PAT-CS1-${pad(i, 3)}`);
    for (let i = 1; i <= 8; i++) arr.push(`PAT-CS2-${pad(i, 3)}`);
    for (let i = 1; i <= 7; i++) arr.push(`PAT-CS3-${pad(i, 3)}`);
    return arr;
  })(),
);

const EXISTING_DOCTOR_IDS = new Set([
  "DOC-CS1-001", "DOC-CS1-002", "DOC-CS1-003", "DOC-CS2-001", "DOC-CS2-002",
  "DOC-CS3-001", "DOC-BG-001", "DOC-BG-002", "DOC-BG-003", "DOC-BG-004",
]);

async function expandHighRiskProviders(roster: ProviderSpec[]): Promise<void> {
  const rng = prng(0xc3d4e5);
  const rows: InsertFwaHighRiskProvider[] = roster
    .filter((p) => !EXISTING_PROVIDER_IDS.has(p.id))
    .map((p) => {
      const spec = GROUP_SPEC[p.group];
      const isCriticalGroup = p.group === "CS1" || p.group === "CS2";
      const baseRisk = p.group === "CS1" ? 78 : p.group === "CS2" ? 72 : p.group === "CS3" ? 68 : 52;
      const risk = baseRisk + Math.floor(rng() * 12);
      const totalClaims = 80 + Math.floor(rng() * 200);
      const flagged = Math.floor(totalClaims * (0.15 + rng() * 0.20));
      const avgAmt = (spec.amountRange[0] + spec.amountRange[1]) / 2;
      return {
        providerId: p.id,
        providerName: p.name,
        providerType: spec.providerType,
        specialty: spec.providerSpecialty,
        organization: p.name,
        riskScore: d(risk),
        riskLevel: riskLevelFor(risk),
        totalClaims,
        flaggedClaims: flagged,
        denialRate: d(8 + rng() * 18),
        avgClaimAmount: d(avgAmt),
        totalExposure: d(avgAmt * flagged),
        claimsPerMonth: d(totalClaims / 12),
        cpmTrend: d(2 + rng() * 10),
        cpmPeerAverage: d(5 + rng() * 8),
        fwaCaseCount: isCriticalGroup ? 1 : 0,
        reasons: [`${spec.category} pattern detected`, "Elevated peer-relative billing"],
        lastFlaggedDate: new Date(2026, 0, 1 + Math.floor(rng() * 27)),
      };
    });
  await batchInsert(fwaHighRiskProviders, rows);
}

async function expandHighRiskPatients(roster: PatientSpec[]): Promise<void> {
  const rng = prng(0xd4e5f6);
  const rows: InsertFwaHighRiskPatient[] = roster
    .filter((p) => !EXISTING_PATIENT_IDS.has(p.id))
    .map((p) => {
      const spec = GROUP_SPEC[p.group];
      const baseRisk = p.group === "CS1" ? 72 : p.group === "CS2" ? 66 : 70;
      const risk = baseRisk + Math.floor(rng() * 14);
      const totalClaims = 4 + Math.floor(rng() * 18);
      const flagged = Math.max(2, Math.floor(totalClaims * (0.4 + rng() * 0.3)));
      const avgAmt = (spec.amountRange[0] + spec.amountRange[1]) / 2;
      return {
        patientId: p.id,
        patientName: patientFullName(p),
        memberId: p.memberId,
        riskScore: d(risk),
        riskLevel: risk >= 80 ? "critical" : "high",
        totalClaims,
        flaggedClaims: flagged,
        totalAmount: d(flagged * avgAmt),
        fwaCaseCount: 1,
        primaryDiagnosis: spec.primaryDx,
        reasons: [`${spec.category} suspicion`, "Elevated claim density"],
        lastClaimDate: new Date(2026, 0, 1 + Math.floor(rng() * 27)),
      };
    });
  await batchInsert(fwaHighRiskPatients, rows);
}

async function expandHighRiskDoctors(roster: DoctorSpec[]): Promise<void> {
  const rng = prng(0xe5f607);
  const rows: InsertFwaHighRiskDoctor[] = roster
    .filter((doc) => !EXISTING_DOCTOR_IDS.has(doc.id))
    .map((doc) => {
      const spec = GROUP_SPEC[doc.group];
      const baseRisk = doc.group === "CS1" ? 76 : doc.group === "CS2" ? 70 : doc.group === "CS3" ? 66 : 50;
      const risk = baseRisk + Math.floor(rng() * 12);
      const totalClaims = 60 + Math.floor(rng() * 180);
      const flagged = Math.floor(totalClaims * (0.18 + rng() * 0.20));
      const avgAmt = (spec.amountRange[0] + spec.amountRange[1]) / 2;
      return {
        doctorId: doc.id,
        doctorName: doc.name,
        specialty: spec.doctorSpecialty,
        licenseNumber: `SCFHS-${doc.id.slice(-3)}`,
        organization: doc.primaryFacilityId,
        riskScore: d(risk),
        riskLevel: riskLevelFor(risk),
        totalClaims,
        flaggedClaims: flagged,
        avgClaimAmount: d(avgAmt),
        totalExposure: d(flagged * avgAmt),
        fwaCaseCount: doc.group === "BG" ? 0 : 1,
        reasons: [`${spec.category} pattern detected`, "Peer-relative billing outlier"],
        lastFlaggedDate: new Date(2026, 0, 1 + Math.floor(rng() * 27)),
      };
    });
  await batchInsert(fwaHighRiskDoctors, rows);
}

// ── Step 3: Seed flagged claims_v2 + dependent rows ─────────────────────────

interface ClaimAllocation {
  claimNumber: string;
  group: Group;
  providerId: string;
  memberId: string;
  practitionerId: string;
}

function buildClaimAllocations(
  providersList: ProviderSpec[],
  patientsList: PatientSpec[],
  doctorsList: DoctorSpec[],
): ClaimAllocation[] {
  const rng = prng(0xfeed42);
  const allocations: ClaimAllocation[] = [];

  const byGroup = (g: Group) => ({
    providers: providersList.filter((p) => p.group === g),
    patients: patientsList.filter((p) => p.group === g),
    doctors: doctorsList.filter((d) => d.group === g),
  });

  // Each provider gets 8-12 claims drawn from same-group patients/doctors
  let counter = 1;
  for (const provider of providersList) {
    const { patients, doctors } = byGroup(provider.group);
    if (patients.length === 0 || doctors.length === 0) continue;
    const claimsForProvider = 8 + Math.floor(rng() * 5);
    for (let k = 0; k < claimsForProvider; k++) {
      const patient = patients[Math.floor(rng() * patients.length)];
      const doctor = doctors[Math.floor(rng() * doctors.length)];
      allocations.push({
        claimNumber: `CLM-FWA-${provider.group}-${pad(counter++, 5)}`,
        group: provider.group,
        providerId: provider.id,
        memberId: patient.memberId,
        practitionerId: doctor.id,
      });
    }
  }

  // Top up: each patient gets at least 2 claims
  const patientClaimCounts = new Map<string, number>();
  for (const a of allocations) {
    patientClaimCounts.set(a.memberId, (patientClaimCounts.get(a.memberId) ?? 0) + 1);
  }
  for (const patient of patientsList) {
    const have = patientClaimCounts.get(patient.memberId) ?? 0;
    const need = Math.max(0, 2 - have);
    if (need === 0) continue;
    const { providers, doctors } = byGroup(patient.group);
    if (providers.length === 0 || doctors.length === 0) continue;
    for (let k = 0; k < need; k++) {
      const provider = providers[Math.floor(rng() * providers.length)];
      const doctor = doctors[Math.floor(rng() * doctors.length)];
      allocations.push({
        claimNumber: `CLM-FWA-${patient.group}-${pad(counter++, 5)}`,
        group: patient.group,
        providerId: provider.id,
        memberId: patient.memberId,
        practitionerId: doctor.id,
      });
    }
  }

  // Top up: each doctor gets at least 3 claims
  const doctorClaimCounts = new Map<string, number>();
  for (const a of allocations) {
    doctorClaimCounts.set(a.practitionerId, (doctorClaimCounts.get(a.practitionerId) ?? 0) + 1);
  }
  for (const doctor of doctorsList) {
    const have = doctorClaimCounts.get(doctor.id) ?? 0;
    const need = Math.max(0, 3 - have);
    if (need === 0) continue;
    const { providers, patients } = byGroup(doctor.group);
    if (providers.length === 0 || patients.length === 0) continue;
    for (let k = 0; k < need; k++) {
      const provider = providers[Math.floor(rng() * providers.length)];
      const patient = patients[Math.floor(rng() * patients.length)];
      allocations.push({
        claimNumber: `CLM-FWA-${doctor.group}-${pad(counter++, 5)}`,
        group: doctor.group,
        providerId: provider.id,
        memberId: patient.memberId,
        practitionerId: doctor.id,
      });
    }
  }

  return allocations;
}

interface ClaimMeta {
  claimId: string;
  claimNumber: string;
  alloc: ClaimAllocation;
  amount: number;
  serviceDate: Date;
}

function buildClaimMeta(allocations: ClaimAllocation[]): ClaimMeta[] {
  const rng = prng(0x9abcde);
  const meta: ClaimMeta[] = [];
  for (const alloc of allocations) {
    const spec = GROUP_SPEC[alloc.group];
    const amount = Math.round(spec.amountRange[0] + rng() * (spec.amountRange[1] - spec.amountRange[0]));
    const dayOffset = Math.floor(rng() * 180);
    const serviceDate = new Date(2026, 0, 1);
    serviceDate.setDate(serviceDate.getDate() - dayOffset);
    const tail = alloc.claimNumber.split("-").pop() ?? "00000";
    const claimId = `CLM-${alloc.group}-${tail}`;
    meta.push({ claimId, claimNumber: alloc.claimNumber, alloc, amount, serviceDate });
  }
  return meta;
}

// Insurance-group names per CHI sample
const INSURANCE_GROUPS = [
  "Al-Bishri Medical Group", "Eastern Cluster", "Al-Mousa Group", "HMG",
  "Dallah Group", "Rashed Medical Group", "Fakeeh Group",
];

const PROVIDER_TYPES_CHI = [
  "Medical Complex",
  "Hospital",
  "Specialized Medical Complex (One Day Surgery Center)",
  "General Medical Complex (One Day Surgery Center)",
];

const DISPOSITIONS = ["Approved", "Partial Approved", "Rejected"];

const ENGINES = ["CHI", "Tachy-AI", "AI-Reviewer"] as const;

function buildClaimValidationEngines(spec: typeof GROUP_SPEC[Group], rng: () => number) {
  return ENGINES.map((engine, idx) => {
    // CHI tends to accept; Tachy-AI flags fraud; second AI reviewer is a tie-breaker
    const baseStatus =
      idx === 0 ? (rng() < 0.55 ? "Accepted" : "Rejected") :
      idx === 1 ? (rng() < 0.85 ? "Rejected" : "Accepted") :
      (rng() < 0.65 ? "Rejected" : "Partial Approved");
    const aiStatus = idx === 0 ? "Accepted" : baseStatus;
    return {
      engine,
      status: baseStatus,
      validationResults: baseStatus === "Rejected"
        ? `${spec.category} pattern matched against ${engine} ruleset`
        : "",
      aiStatus,
      aiValidationResults: idx >= 1 && baseStatus === "Rejected"
        ? `Anomaly detected by ${engine}: ${spec.category}`
        : "",
      llmDiagnosisDesc: idx === 1 ? spec.primaryDx : "",
      icd10Descriptions: spec.icd
        .map((code) => `${code}:(${spec.primaryDx.split(" - ")[1] ?? "diagnosis"})`)
        .join("; "),
    };
  });
}

async function seedFlaggedClaims(meta: ClaimMeta[]): Promise<void> {
  const rng = prng(0x76dabc);
  const claimRows: InsertClaim[] = meta.map((m, idx) => {
    const spec = GROUP_SPEC[m.alloc.group];
    const regDate = new Date(m.serviceDate);
    regDate.setDate(regDate.getDate() + 1 + Math.floor(rng() * 5));
    const cptPicked = spec.cpt[Math.floor(rng() * spec.cpt.length)];

    // Encounter window: inpatient gets 1-7 day stay, others same-day visit
    const isInpatient = m.alloc.group === "CS2";
    const lengthOfStay = isInpatient ? 1 + Math.floor(rng() * 7) : 0;
    const encounterStart = new Date(m.serviceDate);
    encounterStart.setHours(8 + Math.floor(rng() * 6));
    const encounterEnd = new Date(encounterStart);
    if (isInpatient) {
      encounterEnd.setDate(encounterEnd.getDate() + lengthOfStay);
    } else {
      encounterEnd.setHours(encounterEnd.getHours() + 1 + Math.floor(rng() * 3));
    }
    const serviceDuration = isInpatient
      ? lengthOfStay * 24 * 60
      : 30 + Math.floor(rng() * 90);

    // Policy window: 1-year coverage that includes the service date
    const policyEffective = new Date(m.serviceDate);
    policyEffective.setMonth(policyEffective.getMonth() - 6);
    const policyExpiry = new Date(policyEffective);
    policyExpiry.setFullYear(policyExpiry.getFullYear() + 1);

    return {
      id: m.claimId,
      claimNumber: m.alloc.claimNumber,
      memberId: m.alloc.memberId,
      providerId: m.alloc.providerId,
      practitionerId: m.alloc.practitionerId,
      claimType: isInpatient ? "inpatient" : "outpatient",
      registrationDate: regDate,
      serviceDate: m.serviceDate,
      amount: d(m.amount),
      approvedAmount: d(Math.round(m.amount * 0.5)),
      status: rng() < 0.3 ? "confirmed_fraud" : "under_review",
      primaryDiagnosis: spec.primaryDx,
      icdCodes: spec.icd,
      cptCodes: [cptPicked],
      description: `Flagged ${spec.category} — ${m.alloc.group}`,
      specialty: spec.providerSpecialty,
      hospital: m.alloc.providerId,
      category: spec.category,
      flagged: true,
      flagReason: spec.category,
      providerType: PROVIDER_TYPES_CHI[idx % PROVIDER_TYPES_CHI.length],
      outlierScore: d(0.60 + rng() * 0.35, 4),
      // CHI-aligned new fields
      providerLicense: `LIC-${m.alloc.providerId.replace(/-/g, "")}`,
      groupNo: INSURANCE_GROUPS[idx % INSURANCE_GROUPS.length],
      city: REGIONS[idx % REGIONS.length],
      coverageRelationship: idx % 3 === 0 ? "self" : idx % 3 === 1 ? "spouse" : "child",
      isChronic: m.alloc.group === "CS3",
      isNewborn: false,
      lengthOfStay,
      serviceDuration,
      encounterStart,
      encounterEnd,
      admissionDate: isInpatient ? encounterStart : undefined,
      dischargeDate: isInpatient ? encounterEnd : undefined,
      dischargeDisposition: isInpatient
        ? DISPOSITIONS[idx % DISPOSITIONS.length]
        : undefined,
      secondaryDiagnosis: spec.icd[1] ?? null,
      otherDiagnosis: spec.icd[2] ?? null,
      dischargeDiagnosis: isInpatient ? [spec.icd[0]] : [],
      policyEffectiveDate: policyEffective.toISOString().slice(0, 10),
      policyExpiryDate: policyExpiry.toISOString().slice(0, 10),
      validationEngines: buildClaimValidationEngines(spec, rng),
    };
  });
  await batchInsert(claimsTable, claimRows, 100);
}

async function seedClaimServices(meta: ClaimMeta[]): Promise<void> {
  // Skip if already populated for our seeded claims
  const sampleClaimId = meta[0]?.claimId;
  if (sampleClaimId) {
    const existing = await db
      .select({ c: count() })
      .from(fwaClaimServices)
      .where(eq(fwaClaimServices.claimId, sampleClaimId));
    if (Number(existing[0]?.c ?? 0) > 0) return;
  }

  const rng = prng(0x70cabc);
  const rows: InsertFwaClaimService[] = [];
  for (const m of meta) {
    const spec = GROUP_SPEC[m.alloc.group];
    // CHI sample shows 1-12 services per claim; weighted toward 2-4
    const lineCount = 2 + Math.floor(rng() * 4);
    const perLine = Math.max(1, Math.floor(m.amount / lineCount));
    for (let i = 1; i <= lineCount; i++) {
      const code = spec.cpt[(i - 1) % spec.cpt.length];
      const qty = i === 1 ? 1 : 1 + Math.floor(rng() * 2);
      const totalPrice = perLine * qty;
      const patientShare = Math.round(totalPrice * 0.10);
      const payerShare = totalPrice - patientShare;
      const approved = Math.round(totalPrice * (0.4 + rng() * 0.3));
      const isAccepted = rng() < 0.4;
      const activityType =
        spec.category === "phantom_billing" ? "Procedure" :
        spec.category === "upcoding" ? "Surgery" :
        spec.category === "cross_insurer_duplicate" ? "Imaging" :
        "Consultation";
      const specialtyCode =
        m.alloc.group === "CS1" ? "08.26" :
        m.alloc.group === "CS2" ? "14.18" :
        m.alloc.group === "CS3" ? "01.02" : "05.01";
      const engines = ENGINES.map((engine, idx) => {
        const status =
          idx === 0 ? (isAccepted ? "Accepted" : "Rejected") :
          idx === 1 ? (isAccepted && rng() < 0.4 ? "Accepted" : "Rejected") :
          (isAccepted && rng() < 0.6 ? "Accepted" : "Partial Approved");
        return {
          engine,
          status,
          qaListedServiceCode: code.replace(/[-.]/g, ""),
          qaThServiceDesc: `${spec.providerSpecialty} ${activityType.toLowerCase()} - line ${i}`,
          qaTachyActivityType: activityType,
          aiStatus: idx === 0 ? "Accepted" : status,
          notes: status === "Rejected"
            ? `${spec.category} pattern matched on this service line`
            : "",
        };
      });
      rows.push({
        claimId: m.claimId,
        lineNumber: i,
        serviceCode: code,
        serviceCodeSystem: "CPT",
        serviceDescription: `${spec.providerSpecialty} service ${code}`,
        serviceDate: m.serviceDate,
        quantity: d(qty, 2),
        unitPrice: d(perLine, 2),
        totalPrice: d(totalPrice, 2),
        approvedAmount: d(approved, 2),
        adjudicationStatus: isAccepted ? "approved" : "denied",
        approvalStatus: isAccepted ? "approved" : "rejected",
        violations: isAccepted ? [] : [spec.category],
        denialReason: isAccepted ? null : `Flagged for ${spec.category}`,
        // CHI-aligned new fields
        activityType,
        internalServiceCode: `INT-${100 + i}`,
        providerServiceDescription: `${activityType.toUpperCase()} (${spec.providerSpecialty.toUpperCase()})`,
        specialtyCode,
        practitionerId: m.alloc.practitionerId,
        patientShareAmount: d(patientShare, 2),
        payerShareAmount: d(payerShare, 2),
        netAmount: d(totalPrice, 2),
        validationEngines: engines,
      });
    }
  }
  await batchInsert(fwaClaimServices, rows, 100);
}

async function seedWorkQueueClaims(
  meta: ClaimMeta[],
  patientNameById: Map<string, string>,
  providerNameById: Map<string, string>,
): Promise<void> {
  const sampleClaimId = meta[0]?.claimId;
  if (sampleClaimId) {
    const existing = await db
      .select({ c: count() })
      .from(fwaWorkQueueClaims)
      .where(eq(fwaWorkQueueClaims.claimId, sampleClaimId));
    if (Number(existing[0]?.c ?? 0) > 0) return;
  }

  const rng = prng(0x77ee11);
  const rows: InsertFwaWorkQueueClaim[] = meta.map((m) => {
    const risk = 60 + Math.floor(rng() * 35);
    const riskLevel: RiskLevel = risk >= 80 ? "critical" : risk >= 65 ? "high" : "medium";
    const priority: FwaPriority = risk >= 80 ? "high" : "medium";
    return {
      claimId: m.claimId,
      claimNumber: m.claimNumber,
      providerId: m.alloc.providerId,
      providerName: providerNameById.get(m.alloc.providerId) ?? m.alloc.providerId,
      patientId: m.alloc.memberId,
      patientName: patientNameById.get(m.alloc.memberId) ?? m.alloc.memberId,
      claimAmount: d(m.amount, 2),
      riskScore: d(risk),
      riskLevel,
      queueStatus: "pending",
      priority,
      flagReason: GROUP_SPEC[m.alloc.group].category,
      claimType: m.alloc.group === "CS2" ? "inpatient" : "outpatient",
      serviceDate: m.serviceDate,
    };
  });
  await batchInsert(fwaWorkQueueClaims, rows, 100);
}

async function backfillOutlierScores(meta: ClaimMeta[]): Promise<void> {
  // Update any CLM-FWA-* claim still missing an outlier score (seeded by an
  // older version of this script that did not populate the field).
  const rng = prng(0x33d4ee);
  const missing = await db
    .select({ id: claimsTable.id })
    .from(claimsTable)
    .where(sql`${claimsTable.claimNumber} LIKE 'CLM-FWA-%' AND ${claimsTable.outlierScore} IS NULL`);
  if (missing.length === 0) return;
  console.log(`[SeedEntityClaims] Backfilling outlier_score on ${missing.length} legacy CLM-FWA-* claims`);
  const knownIds = new Set(meta.map((m) => m.claimId));
  for (const row of missing) {
    if (!knownIds.has(row.id)) continue;
    const score = d(0.60 + rng() * 0.35, 4);
    await db
      .update(claimsTable)
      .set({ outlierScore: score })
      .where(eq(claimsTable.id, row.id));
  }
}

/**
 * Schema-version migration: when the seed data predates the CHI-style fields
 * (validation_engines, encounter_*, length_of_stay, etc.) we wipe the seeded
 * CLM-FWA-* claims and their dependents so the seeder can rebuild them with
 * the richer fields. Detection: validation_engines IS NULL on any CLM-FWA-*.
 */
async function maybeRebuildLegacySeedData(): Promise<boolean> {
  // A row needs rebuilding if it lacks the new CHI-style fields. We use
  // encounter_start as the marker (always populated by the new seeder, never
  // by the legacy one) and also catch validation_engines that's missing or empty.
  const legacy = await db
    .select({ c: count() })
    .from(claimsTable)
    .where(sql`
      ${claimsTable.claimNumber} LIKE 'CLM-FWA-%' AND (
        ${claimsTable.encounterStart} IS NULL
        OR ${claimsTable.validationEngines} IS NULL
        OR jsonb_array_length(${claimsTable.validationEngines}::jsonb) = 0
      )
    `);
  const legacyCount = Number(legacy[0]?.c ?? 0);
  if (legacyCount === 0) return false;

  console.log(
    `[SeedEntityClaims] Detected ${legacyCount} legacy CLM-FWA-* claims missing CHI fields — ` +
    `wiping CLM-FWA-* seed data so it can be rebuilt with the new schema.`,
  );

  // Find IDs to delete
  const ids = await db
    .select({ id: claimsTable.id })
    .from(claimsTable)
    .where(sql`${claimsTable.claimNumber} LIKE 'CLM-FWA-%'`);
  const idList = ids.map((r) => r.id);
  if (idList.length === 0) return true;

  // Delete dependents in batches via raw IN list (drizzle's array binding for
  // Postgres `ANY(?)` requires explicit array casting). Chunk to avoid query
  // size limits.
  const chunkSize = 500;
  for (let i = 0; i < idList.length; i += chunkSize) {
    const batch = idList.slice(i, i + chunkSize);
    const literal = sql.join(batch.map((id) => sql`${id}`), sql`, `);
    await db.execute(sql`DELETE FROM ml_claim_inference WHERE claim_id IN (${literal})`);
    await db.execute(sql`DELETE FROM fwa_work_queue_claims WHERE claim_id IN (${literal})`);
    await db.execute(sql`DELETE FROM fwa_claim_services WHERE claim_id IN (${literal})`);
    await db.execute(sql`DELETE FROM claims_v2 WHERE id IN (${literal})`);
  }
  console.log(`[SeedEntityClaims] Wiped ${idList.length} legacy claims and their dependents`);
  return true;
}

async function seedMlInference(meta: ClaimMeta[]): Promise<void> {
  const sampleClaimId = meta[0]?.claimId;
  if (sampleClaimId) {
    const existing = await db
      .select({ c: count() })
      .from(mlClaimInference)
      .where(eq(mlClaimInference.claimId, sampleClaimId));
    if (Number(existing[0]?.c ?? 0) > 0) return;
  }

  const rng = prng(0x55aabb);
  const rows: InsertMlClaimInference[] = meta.map((m) => {
    const composite = 60 + Math.floor(rng() * 35);
    return {
      claimId: m.claimId,
      claimNumber: m.claimNumber,
      featureVector: { amount_zscore: rng() * 3, peer_deviation: rng() * 2 },
      isolationForestScore: d(0.6 + rng() * 0.35, 4),
      isolationForestDepth: d(4 + rng() * 6, 2),
      lofScore: d(1.2 + rng() * 1.8, 4),
      lofNeighborhood: 5 + Math.floor(rng() * 20),
      dbscanCluster: rng() < 0.5 ? -1 : Math.floor(rng() * 5),
      dbscanIsNoise: rng() < 0.5,
      autoencoderError: d(rng() * 0.05, 6),
      deepLearningScore: d(0.6 + rng() * 0.35, 4),
      compositeAnomalyScore: d(composite),
      riskLevel: riskLevelFor(composite),
      topContributingFeatures: [
        { feature: "amount_zscore", value: rng() * 3, contribution: 0.4, zScore: rng() * 3 },
        { feature: "peer_deviation", value: rng() * 2, contribution: 0.3, zScore: rng() * 2 },
      ],
      providerRiskScore: d(60 + Math.floor(rng() * 35)),
      memberRiskScore: d(50 + Math.floor(rng() * 40)),
      anomalyReasons: [GROUP_SPEC[m.alloc.group].category, "peer_outlier"],
      humanExplanation: `Anomalous billing pattern matched ${GROUP_SPEC[m.alloc.group].category}`,
    };
  });
  await batchInsert(mlClaimInference, rows, 100);
}

// ── Public entry point ───────────────────────────────────────────────────────

const TARGET_SEEDED_CLAIMS = 280;

export async function seedEntityClaims(): Promise<void> {
  // Detect & rebuild legacy seed data (predates CHI-style fields).
  const wiped = await maybeRebuildLegacySeedData();

  const seededBefore = await seededClaimsCount();
  const claimsAlreadyPopulated = !wiped && seededBefore >= TARGET_SEEDED_CLAIMS;

  if (claimsAlreadyPopulated) {
    console.log(
      `[SeedEntityClaims] ${seededBefore} CLM-FWA-* claims already present — ` +
      `still verifying roster/dependent-table backfills...`,
    );
  } else {
    console.log(
      `[SeedEntityClaims] Seeding entity-anchored flagged claims ` +
      `(${seededBefore} present, target ${TARGET_SEEDED_CLAIMS})...`,
    );
  }

  // Build deterministic rosters in-memory (cheap; needed for any backfill step).
  const providersList = buildProviderRoster();
  const patientsList = buildPatientRoster();
  const doctorsList = buildDoctorRoster(providersList);

  console.log(
    `[SeedEntityClaims] Rosters: ${providersList.length} providers, ` +
    `${patientsList.length} patients, ${doctorsList.length} doctors`,
  );

  // Step 1: FK base rows (ON CONFLICT DO NOTHING — safe to re-run).
  await seedProviderBaseRows(providersList);
  await seedMemberBaseRows(patientsList);
  await seedPractitionerBaseRows(doctorsList);
  console.log("[SeedEntityClaims] FK base rows verified (providers/members/practitioners)");

  // Step 2: high-risk rosters (filtered against EXISTING_* sets, ON CONFLICT DO NOTHING).
  await expandHighRiskProviders(providersList);
  await expandHighRiskPatients(patientsList);
  await expandHighRiskDoctors(doctorsList);
  console.log("[SeedEntityClaims] High-risk roster tables verified");

  // Build deterministic allocations regardless — the same PRNG seed reproduces
  // identical claimNumbers/claimIds, so dependent-table existence checks below
  // line up with prior runs even after a partial failure.
  const allocations = buildClaimAllocations(providersList, patientsList, doctorsList);
  const meta = buildClaimMeta(allocations);
  console.log(`[SeedEntityClaims] Built ${meta.length} deterministic claim allocations`);

  // Step 3: flagged claims (ON CONFLICT DO NOTHING by id+claimNumber).
  if (!claimsAlreadyPopulated) {
    await seedFlaggedClaims(meta);
  }

  // Build name lookups for work queue
  const patientNameById = new Map<string, string>();
  for (const p of patientsList) patientNameById.set(p.memberId, patientFullName(p));
  const providerNameById = new Map<string, string>();
  for (const p of providersList) providerNameById.set(p.id, p.name);

  // Step 4: dependent claim-level tables — each call has its own
  // sample-claimId existence check, so they are no-ops when already filled
  // and recover dropped tables after a partial prior run.
  await backfillOutlierScores(meta);
  await seedClaimServices(meta);
  await seedWorkQueueClaims(meta, patientNameById, providerNameById);
  await seedMlInference(meta);

  const seededAfter = await seededClaimsCount();
  const totalClaims = await tableCount(claimsTable);
  console.log(
    `[SeedEntityClaims] Done — CLM-FWA-* claims: ${seededBefore} → ${seededAfter} ` +
    `(claims_v2 total: ${totalClaims}). fwa_analyzed_claims is a VIEW so it is auto-populated.`,
  );
}
