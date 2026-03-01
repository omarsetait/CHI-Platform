/**
 * Daman Pillars Portal Seed Script
 *
 * Populates 14 portal tables with Saudi-realistic demo data for persona portals.
 *
 * Usage:
 *   npx tsx server/scripts/seed-pillar-portals.ts
 *   npx tsx server/scripts/seed-pillar-portals.ts --force
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
import { sql } from "drizzle-orm";
import {
  portalProviders, portalInsurers, portalRegions,
  providerScorecards, providerRejections, providerDrgAssessments,
  portalEmployers, employerPolicies, workforceHealthProfiles, employerViolations,
  portalMembers, memberCoverage, memberComplaints, coverageLookups,
} from "@shared/schema";
import {
  PORTAL_INSURERS, PORTAL_REGIONS, PROVIDER_TUPLES, ALL_INSURER_CODES,
  getTrajectory, DRG_CRITERIA, DENIAL_CATEGORIES, ICD_CODES, CPT_CODES,
  EMPLOYER_TUPLES, SECTOR_HEALTH, MEMBER_TUPLES, COVERAGE_LOOKUPS,
} from "../data/portal-seed-data";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FORCE = process.argv.includes("--force");
const BATCH_SIZE = 50;

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pick<T>(arr: readonly T[], seed: string, idx = 0): T {
  return arr[(hash(seed) + idx) % arr.length];
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function d(v: number): string { return v.toFixed(2); }

async function batchInsert<T extends Record<string, unknown>>(table: any, rows: T[]) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await db.insert(table).values(rows.slice(i, i + BATCH_SIZE) as any).onConflictDoNothing();
  }
}

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

function buildProviders() {
  return PROVIDER_TUPLES.map(([code, name, nameAr, licenseNo, region, city, type, bedCount, specialties, rating, reviewCount, avgWait, languages]) => ({
    code, name, nameAr, licenseNo, region, city,
    type: type as any,
    bedCount,
    specialties,
    accreditationStatus: (rating >= "4.0" ? "accredited" : rating >= "3.5" ? "conditional" : "pending") as any,
    phone: `+966-${1 + hash(code) % 9}${String(hash(code + "p")).slice(0, 8).padStart(8, "0")}`,
    email: `info@${name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 15)}.sa`,
    latitude: d(21.4 + (hash(code + "lat") % 800) / 100),
    longitude: d(39.8 + (hash(code + "lng") % 1200) / 100),
    acceptedInsurers: ALL_INSURER_CODES as unknown as string[],
    languages,
    rating,
    reviewCount,
    avgWaitMinutes: avgWait,
    workingHours: avgWait < 25 ? "Sun-Thu 7:00-22:00, Fri 14:00-22:00, Sat 8:00-20:00" : "Sun-Thu 8:00-20:00, Sat 9:00-14:00",
  }));
}

function buildInsurers() {
  return PORTAL_INSURERS.map(ins => ({ ...ins }));
}

function buildRegions() {
  return PORTAL_REGIONS.map(r => ({ ...r }));
}

function buildScorecards() {
  const months = ["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"];
  const rows: any[] = [];
  for (const [code] of PROVIDER_TUPLES) {
    const t = getTrajectory(code);
    for (let i = 0; i < months.length; i++) {
      rows.push({
        providerCode: code,
        month: months[i],
        overallScore: d(clamp(t.overallBase + t.overallDelta * i, 30, 98)),
        codingAccuracy: d(clamp(t.codingBase + t.codingDelta * i, 40, 98)),
        rejectionRate: d(clamp(t.rejectionBase - t.rejectionDelta * i, 2, 35)),
        sbsCompliance: d(clamp(t.sbsBase + t.sbsDelta * i, 25, 98)),
        drgReadiness: d(clamp(t.drgBase + t.drgDelta * i, 10, 95)),
        documentationQuality: d(clamp(t.docBase + t.docDelta * i, 35, 98)),
        fwaRisk: d(t.fwaRisk),
        peerRankPercentile: t.peerRank,
        trend: t.trend,
      });
    }
  }
  return rows;
}

function buildRejections() {
  const rows: any[] = [];
  let claimCounter = 10000;
  for (const [code] of PROVIDER_TUPLES) {
    const t = getTrajectory(code);
    // More rejections for higher-rejection providers
    const count = Math.round(5 + (t.rejectionBase / 3));
    for (let j = 0; j < count; j++) {
      const seed = `${code}-${j}`;
      const catIdx = weightedPick(DENIAL_CATEGORIES.map(c => c.weight), seed);
      const cat = DENIAL_CATEGORIES[catIdx];
      const icd = pick(ICD_CODES, seed, 0);
      const cpt = pick(CPT_CODES, seed, 1);
      const reason = pick(cat.reasons, seed, 2);
      const dayOffset = hash(seed + "d") % 150; // Oct 2025 - Feb 2026
      const claimDate = new Date(2025, 9, 1 + dayOffset); // Oct 1 2025 base
      const denialDate = new Date(claimDate.getTime() + (3 + hash(seed + "dd") % 10) * 86400000);
      rows.push({
        providerCode: code,
        claimRef: `CLM-2026-${++claimCounter}`,
        patientMrn: `MRN-${String(100000 + hash(seed + "m") % 900000)}`,
        icdCode: icd.code,
        icdDescription: icd.desc,
        cptCode: cpt.code,
        cptDescription: cpt.desc,
        denialReason: reason,
        denialCategory: cat.category,
        amountSar: d(200 + hash(seed + "a") % 14800),
        recommendation: cat.recommendation,
        claimDate,
        denialDate,
      });
    }
  }
  return rows;
}

function weightedPick(weights: number[], seed: string): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = hash(seed + "w") % total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}

function buildDrgAssessments() {
  const rows: any[] = [];
  for (const [code] of PROVIDER_TUPLES) {
    const t = getTrajectory(code);
    const drgPct = t.drgBase + t.drgDelta * 5; // latest month
    // How many criteria complete depends on readiness %
    const completeCount = Math.round((drgPct / 100) * 8);
    for (let i = 0; i < DRG_CRITERIA.length; i++) {
      const c = DRG_CRITERIA[i];
      let status: string;
      if (i < completeCount) status = "complete";
      else if (i === completeCount) status = "in_progress";
      else status = "not_started";
      rows.push({
        providerCode: code,
        criteriaName: c.name,
        criteriaDescription: c.description,
        status: status as any,
        gapDescription: status !== "complete" ? `${c.name} implementation not yet finalized` : null,
        recommendedAction: status !== "complete" ? `Complete ${c.name.toLowerCase()} implementation and schedule verification audit` : null,
        targetDate: status !== "complete" ? new Date(2026, 3 + i, 1) : null,
        peerCompletionRate: c.peerRate,
        sortOrder: i,
      });
    }
  }
  return rows;
}

function buildEmployers() {
  return EMPLOYER_TUPLES.map(([code, name, nameAr, crNumber, sector, employeeCount, insuredCount, pendingEnrollment, city, region, complianceStatus]) => ({
    code, name, nameAr, crNumber,
    sector: sector as any,
    sizeBand: employeeCount < 50 ? "small" : employeeCount < 250 ? "medium" : employeeCount < 1000 ? "large" : "enterprise",
    employeeCount, insuredCount, pendingEnrollment,
    city, region,
    complianceStatus: complianceStatus as any,
  }));
}

function buildPolicies() {
  const tiers = ["bronze", "silver", "gold", "platinum"];
  const premiums: Record<string, number> = { bronze: 2800, silver: 3600, gold: 4500, platinum: 6200 };
  return EMPLOYER_TUPLES.map(([code, , , , , empCount], idx) => {
    const tier = tiers[idx % 4];
    const insurerIdx = idx % PORTAL_INSURERS.length;
    const ins = PORTAL_INSURERS[insurerIdx];
    const premium = premiums[tier] + (hash(code) % 400 - 200);
    const renewalDays = 30 + hash(code + "r") % 300;
    return {
      employerCode: code,
      insurerCode: ins.code,
      insurerName: ins.name,
      planTier: tier,
      premiumPerEmployee: d(premium),
      totalAnnualPremium: d(premium * empCount),
      coverageStart: new Date(2025, 0, 1),
      coverageEnd: new Date(2026, 11, 31),
      dependentsCount: Math.round(empCount * 0.6),
      renewalDaysRemaining: renewalDays,
    };
  });
}

function buildHealthProfiles() {
  return EMPLOYER_TUPLES.map(([code, , , , sector, empCount]) => {
    const sh = SECTOR_HEALTH[sector] || SECTOR_HEALTH.retail;
    const jitter = (hash(code) % 20 - 10) / 10; // -1.0 to +1.0
    const wellness = Math.round(sh.wellnessBase + (hash(code + "w") % sh.wellnessRange));
    const costPerEmp = 2800 + hash(code + "c") % 3400;
    return {
      employerCode: code,
      avgAge: d(sh.avgAge + jitter),
      malePercent: d(sh.malePercent + jitter * 2),
      chronicConditions: sh.chronicConditions.map(c => ({
        name: c.name,
        prevalence: +(c.prevalence + jitter * 0.5).toFixed(1),
        benchmark: c.benchmark,
      })),
      topSpecialties: sh.topSpecialties,
      visitsPerEmployee: d(2.5 + hash(code + "v") % 20 / 10),
      erUtilizationPercent: d(sh.erUtilization + jitter * 0.5),
      erBenchmarkPercent: d(sh.erBenchmark),
      totalAnnualSpendSar: d(costPerEmp * empCount),
      costPerEmployee: d(costPerEmp),
      costTrendPercent: d(3 + hash(code + "t") % 10),
      absenteeismDays: d(sh.absenteeismDays + jitter * 0.3),
      absenteeismBenchmark: d(sh.absenteeismBenchmark),
      wellnessScore: wellness,
      wellnessBreakdown: {
        physicalActivity: wellness - 15 + hash(code + "pa") % 10,
        chronicMgmt: wellness - 5 + hash(code + "cm") % 10,
        preventiveScreening: wellness - 20 + hash(code + "ps") % 15,
      },
      insights: sh.insights,
    };
  });
}

function buildViolations() {
  const violationTypes = [
    { type: "Late employee enrollment", desc: "Failed to enroll new employees within 10-day mandatory window" },
    { type: "Coverage gap for dependents", desc: "Dependents of insured employees found without active coverage" },
    { type: "Expired policy renewal", desc: "Insurance policy expired without timely renewal" },
    { type: "Non-compliant plan tier", desc: "Insurance plan does not meet minimum CHI benefit requirements" },
  ];
  // Only action_required employers + random ~10%
  const targets = EMPLOYER_TUPLES.filter(([, , , , , , , , , , status]) => status === "action_required")
    .concat(EMPLOYER_TUPLES.filter(([code]) => hash(code + "viol") % 10 === 0).slice(0, 8));
  return targets.map(([code], idx) => {
    const vt = violationTypes[idx % violationTypes.length];
    const resolved = hash(code + "vr") % 3 !== 0;
    const issuedDate = new Date(2025, 3 + idx % 9, 1 + hash(code + "vid") % 28);
    return {
      employerCode: code,
      violationType: vt.type,
      description: vt.desc,
      fineAmountSar: d(5000 + hash(code + "vf") % 45000),
      status: resolved ? "resolved" : "pending",
      issuedDate,
      resolvedDate: resolved ? new Date(issuedDate.getTime() + (14 + hash(code + "vrd") % 30) * 86400000) : null,
    };
  });
}

function buildMembers() {
  return MEMBER_TUPLES.map(([code, name, nameAr, iqamaNo, policyNumber, employerCode, employerName, insurerCode, insurerName, planTier, nationality, age, gender, city, region, dependents]) => ({
    code, name, nameAr, iqamaNo, policyNumber,
    employerCode, employerName,
    insurerCode, insurerName,
    planTier: planTier as any,
    nationality, age, gender, city, region,
    dependentsCount: dependents,
    policyValidUntil: new Date(2026, 5 + hash(code) % 7, 30),
  }));
}

function buildCoverage() {
  // Coverage templates by tier
  const templates: Record<string, any[]> = {
    gold: [
      { cat: "Emergency Care", catAr: "رعاية الطوارئ", icon: "Siren", status: "covered", limitSar: null, copay: 0, note: "Walk into any ER. No pre-approval needed.", units: null },
      { cat: "Maternity", catAr: "الأمومة", icon: "Baby", status: "covered", limitSar: 45000, copay: 10, note: "Covers prenatal, delivery, and postnatal. Pre-approval required for C-section.", units: null },
      { cat: "Outpatient Visits", catAr: "العيادات الخارجية", icon: "Stethoscope", status: "covered", limitSar: null, copay: 20, note: "GP and specialist visits.", units: 150 },
      { cat: "Mental Health", catAr: "الصحة النفسية", icon: "Brain", status: "partial", limitSar: 5000, copay: 25, note: "Covers 10 therapy sessions/year. Psychiatry requires referral.", units: 10 },
      { cat: "Dental", catAr: "الأسنان", icon: "Smile", status: "covered", limitSar: 8000, copay: 20, note: "Cleanings, fillings, extractions. Orthodontics not covered.", units: null },
      { cat: "Optical", catAr: "البصريات", icon: "Eye", status: "covered", limitSar: 2000, copay: 15, note: "One eye exam + one pair of glasses per year.", units: null },
      { cat: "Chronic Conditions", catAr: "الأمراض المزمنة", icon: "HeartPulse", status: "covered", limitSar: 80000, copay: 10, note: "Diabetes, hypertension, asthma. Medications included.", units: null },
      { cat: "Prescription Drugs", catAr: "الأدوية", icon: "Pill", status: "covered", limitSar: 25000, copay: 15, note: "Generic preferred. Brand-name requires pre-approval.", units: null },
      { cat: "Physiotherapy", catAr: "العلاج الطبيعي", icon: "Activity", status: "partial", limitSar: null, copay: 20, note: "Requires referral from treating physician.", units: 12 },
      { cat: "Cosmetic", catAr: "التجميل", icon: "Sparkles", status: "not_covered", limitSar: null, copay: 0, note: "Elective cosmetic procedures excluded.", units: null },
    ],
    silver: [
      { cat: "Emergency Care", catAr: "رعاية الطوارئ", icon: "Siren", status: "covered", limitSar: null, copay: 10, note: "ER visits covered. 10% copay applies.", units: null },
      { cat: "Maternity", catAr: "الأمومة", icon: "Baby", status: "covered", limitSar: 30000, copay: 15, note: "Prenatal, delivery, postnatal. Pre-approval for C-section.", units: null },
      { cat: "Outpatient Visits", catAr: "العيادات الخارجية", icon: "Stethoscope", status: "covered", limitSar: null, copay: 25, note: "GP visits covered. Specialist requires referral.", units: 100 },
      { cat: "Mental Health", catAr: "الصحة النفسية", icon: "Brain", status: "partial", limitSar: 3000, copay: 30, note: "Up to 6 therapy sessions/year with referral.", units: 6 },
      { cat: "Dental", catAr: "الأسنان", icon: "Smile", status: "covered", limitSar: 5000, copay: 25, note: "Basic dental only. No orthodontics.", units: null },
      { cat: "Optical", catAr: "البصريات", icon: "Eye", status: "covered", limitSar: 1500, copay: 20, note: "One eye exam per year. Glasses covered up to limit.", units: null },
      { cat: "Chronic Conditions", catAr: "الأمراض المزمنة", icon: "HeartPulse", status: "covered", limitSar: 50000, copay: 15, note: "Diabetes, hypertension, asthma medications covered.", units: null },
      { cat: "Prescription Drugs", catAr: "الأدوية", icon: "Pill", status: "covered", limitSar: 15000, copay: 20, note: "Generic medications covered. Brand-name with pre-approval.", units: null },
      { cat: "Physiotherapy", catAr: "العلاج الطبيعي", icon: "Activity", status: "partial", limitSar: null, copay: 25, note: "Up to 8 sessions with referral.", units: 8 },
      { cat: "Cosmetic", catAr: "التجميل", icon: "Sparkles", status: "not_covered", limitSar: null, copay: 0, note: "Elective cosmetic procedures excluded.", units: null },
    ],
    bronze: [
      { cat: "Emergency Care", catAr: "رعاية الطوارئ", icon: "Siren", status: "covered", limitSar: null, copay: 15, note: "ER visits covered. 15% copay.", units: null },
      { cat: "Maternity", catAr: "الأمومة", icon: "Baby", status: "covered", limitSar: 20000, copay: 20, note: "Basic maternity coverage. Pre-approval required.", units: null },
      { cat: "Outpatient Visits", catAr: "العيادات الخارجية", icon: "Stethoscope", status: "covered", limitSar: null, copay: 30, note: "GP visits only. All specialists require referral.", units: 60 },
      { cat: "Mental Health", catAr: "الصحة النفسية", icon: "Brain", status: "not_covered", limitSar: null, copay: 0, note: "Mental health services not covered under this plan.", units: null },
      { cat: "Dental", catAr: "الأسنان", icon: "Smile", status: "covered", limitSar: 3000, copay: 30, note: "Emergency dental only. Limited to extractions and fillings.", units: null },
      { cat: "Optical", catAr: "البصريات", icon: "Eye", status: "covered", limitSar: 1000, copay: 25, note: "Basic eye exam covered. Glasses up to limit.", units: null },
      { cat: "Chronic Conditions", catAr: "الأمراض المزمنة", icon: "HeartPulse", status: "covered", limitSar: 30000, copay: 20, note: "Essential chronic condition medications covered.", units: null },
      { cat: "Prescription Drugs", catAr: "الأدوية", icon: "Pill", status: "covered", limitSar: 10000, copay: 25, note: "Generic medications only.", units: null },
      { cat: "Physiotherapy", catAr: "العلاج الطبيعي", icon: "Activity", status: "not_covered", limitSar: null, copay: 0, note: "Physiotherapy not covered under Bronze plan.", units: null },
      { cat: "Cosmetic", catAr: "التجميل", icon: "Sparkles", status: "not_covered", limitSar: null, copay: 0, note: "Elective cosmetic procedures excluded.", units: null },
    ],
    platinum: [
      { cat: "Emergency Care", catAr: "رعاية الطوارئ", icon: "Siren", status: "covered", limitSar: null, copay: 0, note: "Unlimited ER access. No copay. International coverage included.", units: null },
      { cat: "Maternity", catAr: "الأمومة", icon: "Baby", status: "covered", limitSar: 60000, copay: 5, note: "Full maternity including private room. C-section covered.", units: null },
      { cat: "Outpatient Visits", catAr: "العيادات الخارجية", icon: "Stethoscope", status: "covered", limitSar: null, copay: 10, note: "Unlimited visits. Direct specialist access.", units: null },
      { cat: "Mental Health", catAr: "الصحة النفسية", icon: "Brain", status: "covered", limitSar: 15000, copay: 15, note: "Up to 20 sessions/year. Psychiatry included.", units: 20 },
      { cat: "Dental", catAr: "الأسنان", icon: "Smile", status: "covered", limitSar: 15000, copay: 10, note: "Comprehensive dental including crowns. Orthodontics not covered.", units: null },
      { cat: "Optical", catAr: "البصريات", icon: "Eye", status: "covered", limitSar: 3000, copay: 10, note: "Annual exam + premium lenses covered.", units: null },
      { cat: "Chronic Conditions", catAr: "الأمراض المزمنة", icon: "HeartPulse", status: "covered", limitSar: 120000, copay: 5, note: "Full chronic condition management. All medications included.", units: null },
      { cat: "Prescription Drugs", catAr: "الأدوية", icon: "Pill", status: "covered", limitSar: 40000, copay: 10, note: "All medications covered including brand-name.", units: null },
      { cat: "Physiotherapy", catAr: "العلاج الطبيعي", icon: "Activity", status: "covered", limitSar: null, copay: 10, note: "Up to 24 sessions/year. No referral needed.", units: 24 },
      { cat: "Cosmetic", catAr: "التجميل", icon: "Sparkles", status: "not_covered", limitSar: null, copay: 0, note: "Elective cosmetic procedures excluded.", units: null },
    ],
  };

  // Per-member usage stories
  const usageOverrides: Record<string, Record<string, { usedSar?: number; usedUnits?: number }>> = {
    "MEM-001": { "Outpatient Visits": { usedUnits: 12 }, "Dental": { usedSar: 3400 }, "Chronic Conditions": { usedSar: 0 }, "Prescription Drugs": { usedSar: 1200 } },
    "MEM-002": { "Outpatient Visits": { usedUnits: 28 }, "Chronic Conditions": { usedSar: 14200 }, "Prescription Drugs": { usedSar: 6800 }, "Emergency Care": { usedSar: 2400 } },
    "MEM-003": { "Outpatient Visits": { usedUnits: 5 }, "Maternity": { usedSar: 4500 }, "Prescription Drugs": { usedSar: 800 } },
  };

  const rows: any[] = [];
  for (const [code, , , , , , , , , planTier] of MEMBER_TUPLES) {
    const tier = templates[planTier] || templates.silver;
    const overrides = usageOverrides[code] || {};
    for (let i = 0; i < tier.length; i++) {
      const t = tier[i];
      const ov = overrides[t.cat] || {};
      // Default usage: random small amount
      const defaultUsedSar = t.limitSar && t.status !== "not_covered" ? Math.round(hash(code + t.cat) % Math.round(t.limitSar * 0.3)) : 0;
      const defaultUsedUnits = t.units && t.status !== "not_covered" ? hash(code + t.cat + "u") % Math.round(t.units * 0.4) : 0;
      rows.push({
        memberCode: code,
        benefitCategory: t.cat,
        benefitCategoryAr: t.catAr,
        icon: t.icon,
        status: t.status as any,
        limitSar: t.limitSar ? d(t.limitSar) : null,
        usedSar: d(ov.usedSar ?? defaultUsedSar),
        limitUnits: t.units,
        usedUnits: ov.usedUnits ?? defaultUsedUnits,
        copayPercent: t.copay,
        note: t.note,
        noteAr: t.catAr,
        sortOrder: i,
      });
    }
  }
  return rows;
}

function buildComplaints() {
  return [
    // Fatimah's active complaint
    {
      ticketNumber: "CM-2026-04821", memberCode: "MEM-001", type: "claim_denial",
      description: "Dermatology consultation on Jan 15 denied as cosmetic — it was for eczema treatment",
      status: "investigation" as const, assignedTo: "Claims Review Team", estimatedResolution: "5-7 business days",
      timeline: [
        { status: "submitted", date: "2026-02-10T09:00:00Z", note: "Complaint submitted via Daman Members portal" },
        { status: "under_review", date: "2026-02-12T14:30:00Z", note: "Assigned to Claims Review Team" },
        { status: "investigation", date: "2026-02-18T11:00:00Z", note: "Medical records requested from provider" },
      ],
      messages: [
        { sender: "Fatimah Al-Dosari", text: "My dermatology visit was for eczema treatment, not cosmetic. I have a referral from my GP.", date: "2026-02-10T09:00:00Z" },
        { sender: "Claims Review Team", text: "Thank you for your complaint. We have requested your medical records from the provider to verify the clinical indication.", date: "2026-02-12T14:30:00Z" },
      ],
      outcome: null, submittedAt: new Date("2026-02-10"), resolvedAt: null,
    },
    // Fatimah's resolved complaint
    {
      ticketNumber: "CM-2025-11203", memberCode: "MEM-001", type: "claim_denial",
      description: "Pre-authorization delay for MRI scan — waited 3 weeks",
      status: "closed" as const, assignedTo: "Pre-Auth Team", estimatedResolution: null,
      timeline: [
        { status: "submitted", date: "2025-11-03T10:00:00Z", note: "Complaint submitted" },
        { status: "under_review", date: "2025-11-04T08:00:00Z", note: "Escalated to Pre-Auth Team" },
        { status: "investigation", date: "2025-11-06T09:00:00Z", note: "Reviewing pre-auth processing time" },
        { status: "resolution", date: "2025-11-09T14:00:00Z", note: "Pre-auth approved and backdated" },
        { status: "closed", date: "2025-11-11T10:00:00Z", note: "Member confirmed issue resolved" },
      ],
      messages: [
        { sender: "Fatimah Al-Dosari", text: "My MRI pre-authorization has been pending for 3 weeks. My doctor says it's urgent.", date: "2025-11-03T10:00:00Z" },
        { sender: "Pre-Auth Team", text: "We apologize for the delay. Your pre-authorization has been approved and backdated. Please proceed with the MRI.", date: "2025-11-09T14:00:00Z" },
      ],
      outcome: "Pre-authorization approved, provider notified",
      submittedAt: new Date("2025-11-03"), resolvedAt: new Date("2025-11-11"),
    },
    // Omar's complaint (chronic medication)
    {
      ticketNumber: "CM-2026-03156", memberCode: "MEM-002", type: "coverage_question",
      description: "Insulin brand changed by pharmacy without notice — new brand causes side effects",
      status: "under_review" as const, assignedTo: "Pharmacy Review Team", estimatedResolution: "3-5 business days",
      timeline: [
        { status: "submitted", date: "2026-02-20T11:00:00Z", note: "Complaint submitted" },
        { status: "under_review", date: "2026-02-21T09:00:00Z", note: "Assigned to Pharmacy Review Team" },
      ],
      messages: [
        { sender: "Omar Al-Zahrani", text: "The pharmacy switched my insulin to a different brand without asking me. The new brand is causing dizziness.", date: "2026-02-20T11:00:00Z" },
      ],
      outcome: null, submittedAt: new Date("2026-02-20"), resolvedAt: null,
    },
    // Priya's complaint (billing)
    {
      ticketNumber: "CM-2026-02789", memberCode: "MEM-003", type: "billing_dispute",
      description: "Charged 500 SAR for prenatal visit that should be covered at 15% copay",
      status: "resolution" as const, assignedTo: "Billing Resolution Team", estimatedResolution: "2-3 business days",
      timeline: [
        { status: "submitted", date: "2026-02-05T14:00:00Z", note: "Complaint submitted" },
        { status: "under_review", date: "2026-02-06T10:00:00Z", note: "Assigned to Billing Resolution Team" },
        { status: "investigation", date: "2026-02-08T09:00:00Z", note: "Provider billing records requested" },
        { status: "resolution", date: "2026-02-25T16:00:00Z", note: "Billing error confirmed. Refund of 350 SAR approved." },
      ],
      messages: [
        { sender: "Priya Sharma", text: "I was charged 500 SAR for my prenatal visit. My Silver plan says maternity copay is 15%. The visit should have cost 150 SAR.", date: "2026-02-05T14:00:00Z" },
        { sender: "Billing Resolution Team", text: "We have confirmed a billing error. A refund of 350 SAR will be processed to your account within 5 business days.", date: "2026-02-25T16:00:00Z" },
      ],
      outcome: "Billing error confirmed. 350 SAR refund processed.",
      submittedAt: new Date("2026-02-05"), resolvedAt: null,
    },
    // Additional complaints for other members
    {
      ticketNumber: "CM-2026-01234", memberCode: "MEM-006", type: "provider_quality",
      description: "Long wait time at Dammam Medical Complex — waited 3 hours for scheduled appointment",
      status: "closed" as const, assignedTo: "Provider Relations Team", estimatedResolution: null,
      timeline: [
        { status: "submitted", date: "2026-01-15T08:00:00Z", note: "Complaint submitted" },
        { status: "under_review", date: "2026-01-16T09:00:00Z", note: "Forwarded to Provider Relations" },
        { status: "resolution", date: "2026-01-22T14:00:00Z", note: "Provider notified. Scheduling improvements implemented." },
        { status: "closed", date: "2026-01-25T10:00:00Z", note: "Member acknowledged resolution" },
      ],
      messages: [],
      outcome: "Provider scheduling improvements implemented",
      submittedAt: new Date("2026-01-15"), resolvedAt: new Date("2026-01-25"),
    },
    {
      ticketNumber: "CM-2025-09876", memberCode: "MEM-010", type: "claim_denial",
      description: "Workplace injury claim denied — employer says it should be covered under insurance",
      status: "closed" as const, assignedTo: "Claims Review Team", estimatedResolution: null,
      timeline: [
        { status: "submitted", date: "2025-09-10T10:00:00Z", note: "Complaint submitted" },
        { status: "under_review", date: "2025-09-11T08:00:00Z", note: "Under review" },
        { status: "investigation", date: "2025-09-14T09:00:00Z", note: "Coordinating with employer HR" },
        { status: "resolution", date: "2025-09-20T14:00:00Z", note: "Claim approved under occupational coverage" },
        { status: "closed", date: "2025-09-22T10:00:00Z", note: "Resolved" },
      ],
      messages: [],
      outcome: "Claim approved under occupational injury coverage",
      submittedAt: new Date("2025-09-10"), resolvedAt: new Date("2025-09-22"),
    },
    {
      ticketNumber: "CM-2026-05432", memberCode: "MEM-005", type: "coverage_question",
      description: "Unclear if my Platinum plan covers my son's speech therapy sessions",
      status: "closed" as const, assignedTo: "Benefits Helpdesk", estimatedResolution: null,
      timeline: [
        { status: "submitted", date: "2026-02-22T09:00:00Z", note: "Inquiry submitted" },
        { status: "under_review", date: "2026-02-22T14:00:00Z", note: "Assigned to Benefits Helpdesk" },
        { status: "resolution", date: "2026-02-23T10:00:00Z", note: "Confirmed: Platinum covers up to 12 speech therapy sessions/year for dependents" },
        { status: "closed", date: "2026-02-23T16:00:00Z", note: "Member confirmed understanding" },
      ],
      messages: [],
      outcome: "Confirmed: Platinum plan covers dependent speech therapy, 12 sessions/year",
      submittedAt: new Date("2026-02-22"), resolvedAt: new Date("2026-02-23"),
    },
    {
      ticketNumber: "CM-2026-06100", memberCode: "MEM-012", type: "claim_denial",
      description: "Physical therapy sessions denied after knee surgery — doctor prescribed 16 sessions",
      status: "submitted" as const, assignedTo: null, estimatedResolution: "7-10 business days",
      timeline: [
        { status: "submitted", date: "2026-02-27T16:00:00Z", note: "Complaint submitted" },
      ],
      messages: [
        { sender: "Abdulrahman Al-Ghamdi", text: "My doctor prescribed 16 physiotherapy sessions after knee surgery but insurance only approved 8. Silver plan says up to 8 but my case is post-surgical.", date: "2026-02-27T16:00:00Z" },
      ],
      outcome: null, submittedAt: new Date("2026-02-27"), resolvedAt: null,
    },
    {
      ticketNumber: "CM-2026-04500", memberCode: "MEM-015", type: "billing_dispute",
      description: "Double charged for blood test — once at lab, once on insurance claim",
      status: "investigation" as const, assignedTo: "Billing Resolution Team", estimatedResolution: "5-7 business days",
      timeline: [
        { status: "submitted", date: "2026-02-15T11:00:00Z", note: "Complaint submitted" },
        { status: "under_review", date: "2026-02-16T09:00:00Z", note: "Assigned to Billing Resolution" },
        { status: "investigation", date: "2026-02-19T10:00:00Z", note: "Requesting transaction records from lab and insurer" },
      ],
      messages: [],
      outcome: null, submittedAt: new Date("2026-02-15"), resolvedAt: null,
    },
    {
      ticketNumber: "CM-2025-08765", memberCode: "MEM-008", type: "other",
      description: "Insurance card not working at pharmacy — system shows policy inactive",
      status: "closed" as const, assignedTo: "IT Support", estimatedResolution: null,
      timeline: [
        { status: "submitted", date: "2025-08-20T17:00:00Z", note: "Urgent complaint submitted" },
        { status: "under_review", date: "2025-08-20T18:00:00Z", note: "Escalated to IT Support" },
        { status: "resolution", date: "2025-08-21T09:00:00Z", note: "System sync error fixed. Card reactivated." },
        { status: "closed", date: "2025-08-21T12:00:00Z", note: "Member confirmed card working" },
      ],
      messages: [],
      outcome: "System sync error resolved. Insurance card reactivated.",
      submittedAt: new Date("2025-08-20"), resolvedAt: new Date("2025-08-21"),
    },
  ];
}

function buildLookups() {
  return COVERAGE_LOOKUPS.map((l, i) => ({
    question: l.question,
    questionAr: l.questionAr,
    answer: l.answer,
    answerAr: l.answerAr,
    planTiers: l.planTiers,
    category: l.category,
  }));
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function seed() {
  console.log("=== Daman Pillars Portal Seed Script ===\n");

  if (FORCE) {
    console.log("🗑️  Clearing existing portal data...");
    // Delete in reverse dependency order
    await db.execute(sql`DELETE FROM coverage_lookups`);
    await db.execute(sql`DELETE FROM member_complaints`);
    await db.execute(sql`DELETE FROM member_coverage`);
    await db.execute(sql`DELETE FROM portal_members`);
    await db.execute(sql`DELETE FROM employer_violations`);
    await db.execute(sql`DELETE FROM workforce_health_profiles`);
    await db.execute(sql`DELETE FROM employer_policies`);
    await db.execute(sql`DELETE FROM portal_employers`);
    await db.execute(sql`DELETE FROM provider_drg_assessments`);
    await db.execute(sql`DELETE FROM provider_rejections`);
    await db.execute(sql`DELETE FROM provider_scorecards`);
    await db.execute(sql`DELETE FROM portal_regions`);
    await db.execute(sql`DELETE FROM portal_insurers`);
    await db.execute(sql`DELETE FROM portal_providers`);
    console.log("  ✓ Cleared\n");
  } else {
    const existing = await db.execute(sql`SELECT COUNT(*) as count FROM portal_providers`);
    const count = Number((existing as any).rows?.[0]?.count ?? (existing as any)[0]?.count ?? 0);
    if (count > 0) {
      console.log(`Portal data already exists (${count} providers). Use --force to reseed.`);
      process.exit(0);
    }
  }

  // Build all data
  const providers = buildProviders();
  const insurers = buildInsurers();
  const regions = buildRegions();
  const scorecards = buildScorecards();
  const rejections = buildRejections();
  const drgAssessments = buildDrgAssessments();
  const employers = buildEmployers();
  const policies = buildPolicies();
  const healthProfiles = buildHealthProfiles();
  const violations = buildViolations();
  const members = buildMembers();
  const coverage = buildCoverage();
  const complaints = buildComplaints();
  const lookups = buildLookups();

  // Insert in dependency order
  console.log(`📍 Seeding ${providers.length} providers...`);
  await batchInsert(portalProviders, providers);

  console.log(`🏢 Seeding ${insurers.length} insurers...`);
  await db.insert(portalInsurers).values(insurers as any).onConflictDoNothing();

  console.log(`🗺️  Seeding ${regions.length} regions...`);
  await db.insert(portalRegions).values(regions as any).onConflictDoNothing();

  console.log(`📊 Seeding ${scorecards.length} scorecards...`);
  await batchInsert(providerScorecards, scorecards);

  console.log(`❌ Seeding ${rejections.length} rejections...`);
  await batchInsert(providerRejections, rejections);

  console.log(`🏥 Seeding ${drgAssessments.length} DRG assessments...`);
  await batchInsert(providerDrgAssessments, drgAssessments);

  console.log(`🏭 Seeding ${employers.length} employers...`);
  await batchInsert(portalEmployers, employers);

  console.log(`📋 Seeding ${policies.length} policies...`);
  await batchInsert(employerPolicies, policies);

  console.log(`💊 Seeding ${healthProfiles.length} health profiles...`);
  await batchInsert(workforceHealthProfiles, healthProfiles);

  console.log(`⚠️  Seeding ${violations.length} violations...`);
  await db.insert(employerViolations).values(violations as any).onConflictDoNothing();

  console.log(`👤 Seeding ${members.length} members...`);
  await db.insert(portalMembers).values(members as any).onConflictDoNothing();

  console.log(`🛡️  Seeding ${coverage.length} coverage items...`);
  await batchInsert(memberCoverage, coverage);

  console.log(`📝 Seeding ${complaints.length} complaints...`);
  await db.insert(memberComplaints).values(complaints as any).onConflictDoNothing();

  console.log(`🔍 Seeding ${lookups.length} coverage lookups...`);
  await db.insert(coverageLookups).values(lookups as any).onConflictDoNothing();

  console.log(`\n✅ Portal seed complete!`);
  console.log(`   Providers: ${providers.length}`);
  console.log(`   Insurers: ${insurers.length}`);
  console.log(`   Regions: ${regions.length}`);
  console.log(`   Scorecards: ${scorecards.length}`);
  console.log(`   Rejections: ${rejections.length}`);
  console.log(`   DRG Assessments: ${drgAssessments.length}`);
  console.log(`   Employers: ${employers.length}`);
  console.log(`   Policies: ${policies.length}`);
  console.log(`   Health Profiles: ${healthProfiles.length}`);
  console.log(`   Violations: ${violations.length}`);
  console.log(`   Members: ${members.length}`);
  console.log(`   Coverage Items: ${coverage.length}`);
  console.log(`   Complaints: ${complaints.length}`);
  console.log(`   Lookups: ${lookups.length}`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  });
