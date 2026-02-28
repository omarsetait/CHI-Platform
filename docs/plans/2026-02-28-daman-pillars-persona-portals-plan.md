# Daman Pillars Persona Portals — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform three Daman pillars from static dashboards into personalized persona portals with database-backed seed data, enabling a compelling 15-minute executive demo.

**Architecture:** Each pillar gets 3 new portal pages (9 total) backed by new database tables with rich seed data. A persona switcher component enables live switching between pre-loaded demo personas. Existing regulator-view dashboards remain untouched.

**Tech Stack:** Drizzle ORM (PostgreSQL), React + TypeScript, TanStack Query, shadcn/ui, Recharts, Wouter routing, Zod validation.

**Design doc:** `docs/plans/2026-02-28-daman-pillars-persona-portals-design.md`

---

## Phase 1: Data Foundation — Schema

### Task 1: Shared Database Tables (providers, insurers, regions)

**Files:**
- Modify: `shared/schema.ts`

**Step 1: Add shared enums and tables to schema.ts**

Add after existing table definitions:

```typescript
// ── Pillar Portal: Shared Tables ──────────────────────────────

export const providerTypeEnum = pgEnum("provider_type", [
  "tertiary_hospital", "secondary_hospital", "primary_care_center",
  "specialist_clinic", "dental_clinic", "rehabilitation_center",
  "polyclinic", "medical_tower"
]);

export const accreditationStatusEnum = pgEnum("accreditation_status", [
  "accredited", "conditional", "pending", "expired", "revoked"
]);

export const portalProviders = pgTable("portal_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 20 }).notNull().unique(), // PRV-001
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  licenseNo: varchar("license_no", { length: 30 }).notNull(),
  region: text("region").notNull(),
  city: text("city").notNull(),
  type: providerTypeEnum("type").notNull(),
  bedCount: integer("bed_count"),
  specialties: text("specialties").array().default([]),
  accreditationStatus: accreditationStatusEnum("accreditation_status").default("accredited"),
  phone: varchar("phone", { length: 20 }),
  email: text("email"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  acceptedInsurers: text("accepted_insurers").array().default([]),
  languages: text("languages").array().default([]),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  reviewCount: integer("review_count").default(0),
  avgWaitMinutes: integer("avg_wait_minutes"),
  workingHours: text("working_hours"), // "Sun-Thu 8:00-20:00, Sat 9:00-14:00"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PortalProvider = typeof portalProviders.$inferSelect;
export type InsertPortalProvider = typeof portalProviders.$inferInsert;

export const portalInsurers = pgTable("portal_insurers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 20 }).notNull().unique(), // INS-001
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  licenseNo: varchar("license_no", { length: 30 }),
  marketShare: decimal("market_share", { precision: 5, scale: 2 }),
  lossRatio: decimal("loss_ratio", { precision: 5, scale: 2 }),
  capitalAdequacy: decimal("capital_adequacy", { precision: 5, scale: 2 }),
  healthStatus: text("health_status"), // healthy, watch, at_risk
  premiumVolumeSar: decimal("premium_volume_sar", { precision: 14, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PortalInsurer = typeof portalInsurers.$inferSelect;

export const portalRegions = pgTable("portal_regions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 10 }).notNull().unique(), // RIY, JED, DAM
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  population: integer("population"),
  insuredCount: integer("insured_count"),
  providerCount: integer("provider_count"),
  coverageRate: decimal("coverage_rate", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PortalRegion = typeof portalRegions.$inferSelect;
```

**Step 2: Run `npx drizzle-kit generate` to create migration**

**Step 3: Apply migration with `npx drizzle-kit push`**

**Step 4: Commit**
```bash
git add shared/schema.ts migrations/
git commit -m "feat(schema): add shared portal tables (providers, insurers, regions)"
```

---

### Task 2: Intelligence Portal Tables

**Files:**
- Modify: `shared/schema.ts`

**Step 1: Add Intelligence tables**

```typescript
// ── Pillar Portal: Intelligence Tables ────────────────────────

export const providerScorecards = pgTable("provider_scorecards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerCode: varchar("provider_code", { length: 20 }).notNull(),
  month: varchar("month", { length: 7 }).notNull(), // "2026-02"
  overallScore: decimal("overall_score", { precision: 5, scale: 2 }).notNull(),
  codingAccuracy: decimal("coding_accuracy", { precision: 5, scale: 2 }),
  rejectionRate: decimal("rejection_rate", { precision: 5, scale: 2 }),
  sbsCompliance: decimal("sbs_compliance", { precision: 5, scale: 2 }),
  drgReadiness: decimal("drg_readiness", { precision: 5, scale: 2 }),
  documentationQuality: decimal("documentation_quality", { precision: 5, scale: 2 }),
  fwaRisk: decimal("fwa_risk", { precision: 5, scale: 2 }),
  peerRankPercentile: integer("peer_rank_percentile"),
  trend: text("trend"), // "improving", "declining", "stable"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProviderScorecard = typeof providerScorecards.$inferSelect;

export const providerRejections = pgTable("provider_rejections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerCode: varchar("provider_code", { length: 20 }).notNull(),
  claimRef: varchar("claim_ref", { length: 30 }).notNull(),
  patientMrn: varchar("patient_mrn", { length: 20 }),
  icdCode: varchar("icd_code", { length: 15 }).notNull(),
  icdDescription: text("icd_description"),
  cptCode: varchar("cpt_code", { length: 15 }),
  cptDescription: text("cpt_description"),
  denialReason: text("denial_reason").notNull(),
  denialCategory: text("denial_category").notNull(), // "missing_documentation", "code_mismatch", "medical_necessity", "preauth_expired"
  amountSar: decimal("amount_sar", { precision: 12, scale: 2 }).notNull(),
  recommendation: text("recommendation"),
  claimDate: timestamp("claim_date").notNull(),
  denialDate: timestamp("denial_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProviderRejection = typeof providerRejections.$inferSelect;

export const drgReadinessStatusEnum = pgEnum("drg_readiness_status", [
  "complete", "in_progress", "not_started"
]);

export const providerDrgAssessments = pgTable("provider_drg_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  providerCode: varchar("provider_code", { length: 20 }).notNull(),
  criteriaName: text("criteria_name").notNull(),
  criteriaDescription: text("criteria_description"),
  status: drgReadinessStatusEnum("status").notNull(),
  gapDescription: text("gap_description"),
  recommendedAction: text("recommended_action"),
  targetDate: timestamp("target_date"),
  peerCompletionRate: decimal("peer_completion_rate", { precision: 5, scale: 2 }),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProviderDrgAssessment = typeof providerDrgAssessments.$inferSelect;
```

**Step 2: Generate and apply migration**

**Step 3: Commit**
```bash
git add shared/schema.ts migrations/
git commit -m "feat(schema): add intelligence portal tables (scorecards, rejections, DRG)"
```

---

### Task 3: Business Portal Tables

**Files:**
- Modify: `shared/schema.ts`

**Step 1: Add Business tables**

```typescript
// ── Pillar Portal: Business Tables ────────────────────────────

export const employerSectorEnum = pgEnum("employer_sector", [
  "construction", "technology", "hospitality", "oil_gas",
  "retail", "healthcare", "manufacturing", "education",
  "financial_services", "transportation"
]);

export const complianceStatusEnum = pgEnum("compliance_status", [
  "compliant", "action_required", "suspended", "under_review"
]);

export const portalEmployers = pgTable("portal_employers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 20 }).notNull().unique(), // EMP-001
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  crNumber: varchar("cr_number", { length: 20 }).notNull(), // Commercial Registration
  sector: employerSectorEnum("sector").notNull(),
  sizeBand: text("size_band"), // "small", "medium", "large", "enterprise"
  employeeCount: integer("employee_count").notNull(),
  insuredCount: integer("insured_count").notNull(),
  pendingEnrollment: integer("pending_enrollment").default(0),
  city: text("city").notNull(),
  region: text("region").notNull(),
  complianceStatus: complianceStatusEnum("compliance_status").default("compliant"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PortalEmployer = typeof portalEmployers.$inferSelect;

export const employerPolicies = pgTable("employer_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employerCode: varchar("employer_code", { length: 20 }).notNull(),
  insurerCode: varchar("insurer_code", { length: 20 }).notNull(),
  insurerName: text("insurer_name").notNull(),
  planTier: text("plan_tier").notNull(), // "bronze", "silver", "gold", "platinum"
  premiumPerEmployee: decimal("premium_per_employee", { precision: 10, scale: 2 }).notNull(),
  totalAnnualPremium: decimal("total_annual_premium", { precision: 14, scale: 2 }),
  coverageStart: timestamp("coverage_start").notNull(),
  coverageEnd: timestamp("coverage_end").notNull(),
  dependentsCount: integer("dependents_count").default(0),
  renewalDaysRemaining: integer("renewal_days_remaining"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EmployerPolicy = typeof employerPolicies.$inferSelect;

export const workforceHealthProfiles = pgTable("workforce_health_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employerCode: varchar("employer_code", { length: 20 }).notNull().unique(),
  avgAge: decimal("avg_age", { precision: 4, scale: 1 }),
  malePercent: decimal("male_percent", { precision: 5, scale: 2 }),
  chronicConditions: jsonb("chronic_conditions"), // [{ name, prevalence, benchmark }]
  topSpecialties: jsonb("top_specialties"), // [{ name, utilizationPercent }]
  visitsPerEmployee: decimal("visits_per_employee", { precision: 5, scale: 2 }),
  erUtilizationPercent: decimal("er_utilization_percent", { precision: 5, scale: 2 }),
  erBenchmarkPercent: decimal("er_benchmark_percent", { precision: 5, scale: 2 }),
  totalAnnualSpendSar: decimal("total_annual_spend_sar", { precision: 14, scale: 2 }),
  costPerEmployee: decimal("cost_per_employee", { precision: 10, scale: 2 }),
  costTrendPercent: decimal("cost_trend_percent", { precision: 5, scale: 2 }), // YoY
  absenteeismDays: decimal("absenteeism_days", { precision: 5, scale: 2 }),
  absenteeismBenchmark: decimal("absenteeism_benchmark", { precision: 5, scale: 2 }),
  wellnessScore: integer("wellness_score"),
  wellnessBreakdown: jsonb("wellness_breakdown"), // { physicalActivity, chronicMgmt, preventiveScreening }
  insights: jsonb("insights"), // [{ icon, headline, body, tag }]
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type WorkforceHealthProfile = typeof workforceHealthProfiles.$inferSelect;

export const employerViolations = pgTable("employer_violations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employerCode: varchar("employer_code", { length: 20 }).notNull(),
  violationType: text("violation_type").notNull(),
  description: text("description"),
  fineAmountSar: decimal("fine_amount_sar", { precision: 10, scale: 2 }),
  status: text("status"), // "resolved", "pending", "appealed"
  issuedDate: timestamp("issued_date").notNull(),
  resolvedDate: timestamp("resolved_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EmployerViolation = typeof employerViolations.$inferSelect;
```

**Step 2: Generate and apply migration**

**Step 3: Commit**
```bash
git add shared/schema.ts migrations/
git commit -m "feat(schema): add business portal tables (employers, policies, health profiles, violations)"
```

---

### Task 4: Members Portal Tables

**Files:**
- Modify: `shared/schema.ts`

**Step 1: Add Members tables**

```typescript
// ── Pillar Portal: Members Tables ─────────────────────────────

export const planTierEnum = pgEnum("plan_tier", [
  "bronze", "silver", "gold", "platinum"
]);

export const portalMembers = pgTable("portal_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 20 }).notNull().unique(), // MEM-001
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  iqamaNo: varchar("iqama_no", { length: 15 }).notNull(),
  policyNumber: varchar("policy_number", { length: 25 }).notNull(),
  employerCode: varchar("employer_code", { length: 20 }),
  employerName: text("employer_name"),
  insurerCode: varchar("insurer_code", { length: 20 }),
  insurerName: text("insurer_name"),
  planTier: planTierEnum("plan_tier").notNull(),
  nationality: text("nationality"),
  age: integer("age"),
  gender: text("gender"),
  city: text("city").notNull(),
  region: text("region").notNull(),
  dependentsCount: integer("dependents_count").default(0),
  policyValidUntil: timestamp("policy_valid_until"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PortalMember = typeof portalMembers.$inferSelect;

export const coverageStatusEnum = pgEnum("coverage_status", [
  "covered", "partial", "not_covered"
]);

export const memberCoverage = pgTable("member_coverage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  memberCode: varchar("member_code", { length: 20 }).notNull(),
  benefitCategory: text("benefit_category").notNull(),
  benefitCategoryAr: text("benefit_category_ar"),
  icon: text("icon"), // lucide icon name
  status: coverageStatusEnum("status").notNull(),
  limitSar: decimal("limit_sar", { precision: 10, scale: 2 }),
  usedSar: decimal("used_sar", { precision: 10, scale: 2 }).default("0"),
  limitUnits: integer("limit_units"), // e.g., 150 visits
  usedUnits: integer("used_units").default(0),
  copayPercent: integer("copay_percent").default(0),
  note: text("note"), // Plain-language explanation
  noteAr: text("note_ar"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MemberCoverage = typeof memberCoverage.$inferSelect;

export const complaintStatusEnum = pgEnum("complaint_status", [
  "submitted", "under_review", "investigation", "resolution", "closed"
]);

export const memberComplaints = pgTable("member_complaints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketNumber: varchar("ticket_number", { length: 20 }).notNull().unique(),
  memberCode: varchar("member_code", { length: 20 }).notNull(),
  type: text("type").notNull(), // "claim_denial", "billing_dispute", "coverage_question", "provider_quality", "other"
  description: text("description").notNull(),
  status: complaintStatusEnum("status").default("submitted"),
  assignedTo: text("assigned_to"),
  estimatedResolution: text("estimated_resolution"),
  timeline: jsonb("timeline"), // [{ status, date, note }]
  messages: jsonb("messages"), // [{ sender, text, date }]
  outcome: text("outcome"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type MemberComplaint = typeof memberComplaints.$inferSelect;

export const coverageLookups = pgTable("coverage_lookups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  question: text("question").notNull(), // "Is IVF covered?"
  questionAr: text("question_ar"),
  answer: text("answer").notNull(),
  answerAr: text("answer_ar"),
  planTiers: text("plan_tiers").array().default([]), // which plan tiers this applies to, empty = all
  category: text("category"), // "maternity", "dental", "specialist", etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CoverageLookup = typeof coverageLookups.$inferSelect;
```

**Step 2: Generate and apply migration**

**Step 3: Commit**
```bash
git add shared/schema.ts migrations/
git commit -m "feat(schema): add members portal tables (members, coverage, complaints, lookups)"
```

---

## Phase 2: Seed Data

### Task 5: Seed Shared Data (Providers, Insurers, Regions)

**Files:**
- Create: `server/scripts/seed-pillar-portals.ts`

**Step 1: Create the seed script with shared data**

Create `server/scripts/seed-pillar-portals.ts` following the pattern from `seed-chi-demo.ts`:

- `.env` loading block (same pattern as existing seed script)
- Import `db` from `"../db"` and all new tables from `@shared/schema`
- `FORCE` flag check from `process.argv`

**Provider data (50+ entries):**
Build an array of 50+ providers covering all 13 Saudi regions. Key providers for demo personas:

```typescript
const providerData = [
  // ── Central Region ──
  { code: "PRV-001", name: "Riyadh Care Hospital", nameAr: "مستشفى رعاية الرياض", licenseNo: "MOH-2019-RC-001", region: "Riyadh", city: "Riyadh", type: "tertiary_hospital" as const, bedCount: 450, specialties: ["Internal Medicine", "Cardiology", "Oncology", "Orthopedics", "Pediatrics", "Obstetrics"], accreditationStatus: "accredited" as const, rating: "4.6", reviewCount: 342, avgWaitMinutes: 18, languages: ["Arabic", "English", "Urdu"], acceptedInsurers: ["INS-001", "INS-002", "INS-003", "INS-004", "INS-005", "INS-006"] },
  { code: "PRV-002", name: "King Fahd Medical City", nameAr: "مدينة الملك فهد الطبية", licenseNo: "MOH-2015-KF-002", region: "Riyadh", city: "Riyadh", type: "tertiary_hospital" as const, bedCount: 1200, specialties: ["All Specialties"], accreditationStatus: "accredited" as const, rating: "4.8", reviewCount: 1205, avgWaitMinutes: 15, languages: ["Arabic", "English"], acceptedInsurers: ["INS-001", "INS-002", "INS-003", "INS-004", "INS-005", "INS-006"] },
  // ... continue for all 50+ providers across regions
  // Riyadh (12), Jeddah (8), Dammam (6), Makkah (4), Madinah (4), Al Khobar (3), Taif (3), Tabuk (2), Abha (2), Hail (2), Jizan (2), Najran (1), Al Baha (1)
];
```

**Insurer data (6 major + secondary):**
```typescript
const insurerData = [
  { code: "INS-001", name: "Bupa Arabia", nameAr: "بوبا العربية", marketShare: "22.4", lossRatio: "78.2", capitalAdequacy: "185.0", healthStatus: "healthy", premiumVolumeSar: "8200000000" },
  { code: "INS-002", name: "Tawuniya", nameAr: "التعاونية", marketShare: "19.4", lossRatio: "82.1", capitalAdequacy: "172.0", healthStatus: "healthy", premiumVolumeSar: "7100000000" },
  { code: "INS-003", name: "MedGulf", nameAr: "ميدغلف", marketShare: "12.8", lossRatio: "85.4", capitalAdequacy: "148.0", healthStatus: "watch", premiumVolumeSar: "4700000000" },
  { code: "INS-004", name: "Al Rajhi Takaful", nameAr: "تكافل الراجحي", marketShare: "8.6", lossRatio: "76.5", capitalAdequacy: "192.0", healthStatus: "healthy", premiumVolumeSar: "3150000000" },
  { code: "INS-005", name: "SAICO", nameAr: "سايكو", marketShare: "5.4", lossRatio: "89.2", capitalAdequacy: "128.0", healthStatus: "at_risk", premiumVolumeSar: "1980000000" },
  { code: "INS-006", name: "Walaa Insurance", nameAr: "ولاء للتأمين", marketShare: "4.2", lossRatio: "70.8", capitalAdequacy: "210.0", healthStatus: "healthy", premiumVolumeSar: "1540000000" },
];
```

**Region data (13 regions):**
```typescript
const regionData = [
  { code: "RIY", name: "Riyadh", nameAr: "الرياض", population: 8600000, insuredCount: 7740000, providerCount: 12, coverageRate: "90.0" },
  { code: "JED", name: "Jeddah", nameAr: "جدة", population: 4700000, insuredCount: 4042000, providerCount: 8, coverageRate: "86.0" },
  { code: "DAM", name: "Dammam", nameAr: "الدمام", population: 1300000, insuredCount: 1170000, providerCount: 6, coverageRate: "90.0" },
  // ... all 13 regions
];
```

**Step 2: Write insertion logic with batch support and `onConflictDoNothing()`**

**Step 3: Test by running `npx tsx server/scripts/seed-pillar-portals.ts`**

**Step 4: Commit**
```bash
git add server/scripts/seed-pillar-portals.ts
git commit -m "feat(seed): add shared provider, insurer, and region seed data"
```

---

### Task 6: Seed Intelligence Data

**Files:**
- Modify: `server/scripts/seed-pillar-portals.ts`

**Step 1: Add scorecard seed data**

Generate 6 months of scorecards (Sep 2025 → Feb 2026) for all 50+ providers. Each provider has a "trajectory" — improving, declining, or stable — that drives their month-over-month score changes.

Key demo providers and their stories:
- **PRV-001 (Riyadh Care Hospital):** Top performer, 88→92, improving
- **PRV-050 (Tabuk Care Center):** Struggling, 62→55, declining
- **PRV-015 (Jeddah National Medical Center):** Mid-tier, 72→74, stable

```typescript
function buildScorecardRows() {
  const months = ["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"];
  const rows = [];
  for (const provider of providerData) {
    const trajectory = getProviderTrajectory(provider.code); // returns base scores + delta per month
    for (let i = 0; i < months.length; i++) {
      rows.push({
        providerCode: provider.code,
        month: months[i],
        overallScore: String(trajectory.baseScore + trajectory.delta * i),
        codingAccuracy: String(trajectory.codingBase + trajectory.codingDelta * i),
        rejectionRate: String(Math.max(2, trajectory.rejectionBase - trajectory.rejectionDelta * i)),
        sbsCompliance: String(trajectory.sbsBase + trajectory.sbsDelta * i),
        drgReadiness: String(trajectory.drgBase + trajectory.drgDelta * i),
        documentationQuality: String(trajectory.docBase + trajectory.docDelta * i),
        fwaRisk: String(trajectory.fwaBase),
        peerRankPercentile: trajectory.peerRank,
        trend: trajectory.trend,
      });
    }
  }
  return rows;
}
```

**Step 2: Add rejection seed data (~500 records)**

Generate rejections distributed across providers, weighted toward struggling ones. Use realistic ICD-10-AM codes and denial categories:

```typescript
const denialCategories = [
  { category: "missing_documentation", weight: 34, reasons: ["Clinical notes not attached", "Imaging report missing", "Lab results not provided", "Referral letter absent"] },
  { category: "code_mismatch", weight: 28, reasons: ["ICD code does not match procedure", "Unbundled procedure codes", "Incorrect modifier usage", "Gender-specific code mismatch"] },
  { category: "medical_necessity", weight: 21, reasons: ["Insufficient clinical justification", "Alternative treatment available", "Frequency exceeds guidelines", "Duplicate service within 30 days"] },
  { category: "preauth_expired", weight: 17, reasons: ["Pre-authorization expired before service", "Service date outside approved window", "Pre-auth number invalid", "Exceeded approved quantity"] },
];

const recommendations = {
  "missing_documentation": "Ensure chest X-ray/lab reports are attached before claim submission. Consider implementing a pre-submission checklist.",
  "code_mismatch": "Review ICD-10-AM coding guidelines for this procedure. The primary diagnosis must support the billed procedure.",
  "medical_necessity": "Include detailed clinical notes explaining why this specific treatment was chosen over alternatives.",
  "preauth_expired": "Set calendar reminders for pre-authorization expiry dates. Re-submit pre-auth if service is delayed beyond 30 days.",
};
```

**Step 3: Add DRG assessment seed data**

8 criteria per provider, status varies based on provider's DRG readiness score:

```typescript
const drgCriteria = [
  { name: "Clinical Coder Certification", description: "All clinical coders hold ACHI/ICD-10-AM certification", peerRate: "72" },
  { name: "ICD-10-AM V12 Adoption", description: "Facility uses ICD-10-AM Version 12 for all coding", peerRate: "85" },
  { name: "ACHI Procedure Coding", description: "All procedures coded using Australian Classification of Health Interventions", peerRate: "78" },
  { name: "Grouper Software Installed", description: "AR-DRG grouper software installed and tested", peerRate: "67" },
  { name: "DRG-Based Costing Model", description: "Activity-based costing aligned with DRG weights", peerRate: "45" },
  { name: "Clinical Documentation Standards", description: "Standardized clinical documentation templates in use", peerRate: "82" },
  { name: "Unbundling Compliance", description: "Claims review for unbundled or fragmented billing", peerRate: "38" },
  { name: "Staff Training Program", description: "Ongoing DRG training for clinical and coding staff", peerRate: "71" },
];
```

**Step 4: Insert all Intelligence data**

**Step 5: Commit**
```bash
git add server/scripts/seed-pillar-portals.ts
git commit -m "feat(seed): add intelligence portal data (scorecards, rejections, DRG assessments)"
```

---

### Task 7: Seed Business Data

**Files:**
- Modify: `server/scripts/seed-pillar-portals.ts`

**Step 1: Add employer seed data (100+ employers)**

Distribute across sectors with realistic names and sizes:

```typescript
const employerData = [
  // ── Demo Personas ──
  { code: "EMP-001", name: "Al Madinah Construction Group", sector: "construction", employeeCount: 1200, insuredCount: 1164, pendingEnrollment: 36, city: "Riyadh", region: "Riyadh", complianceStatus: "compliant" },
  { code: "EMP-002", name: "Nujoom Tech Solutions", sector: "technology", employeeCount: 280, insuredCount: 280, pendingEnrollment: 0, city: "Riyadh", region: "Riyadh", complianceStatus: "compliant" },
  { code: "EMP-003", name: "Gulf Hospitality Co", sector: "hospitality", employeeCount: 600, insuredCount: 571, pendingEnrollment: 29, city: "Jeddah", region: "Jeddah", complianceStatus: "action_required" },
  // ... 97+ more employers
];
```

**Step 2: Add policy data (one per employer)**

**Step 3: Add workforce health profiles with sector-specific patterns**

Each sector gets a distinct health fingerprint:

```typescript
const sectorHealthProfiles = {
  construction: {
    avgAge: 34.2, malePercent: 92,
    chronicConditions: [
      { name: "Diabetes", prevalence: 14.2, benchmark: 11.8 },
      { name: "Hypertension", prevalence: 11.8, benchmark: 10.2 },
      { name: "Musculoskeletal", prevalence: 9.4, benchmark: 4.1 },
      { name: "Respiratory", prevalence: 6.1, benchmark: 3.8 },
    ],
    topSpecialties: [
      { name: "Orthopedics", utilizationPercent: 22 },
      { name: "General Practice", utilizationPercent: 19 },
      { name: "Pulmonology", utilizationPercent: 14 },
    ],
    erUtilization: 12.0, erBenchmark: 8.0,
    absenteeismDays: 4.8, absenteeismBenchmark: 3.2,
    wellnessScore: 62,
    insights: [
      { icon: "alert-triangle", headline: "High ER utilization detected", body: "ER utilization at 12% vs 8% benchmark suggests employees lack access to primary care clinics near worksites. Consider on-site clinic or telemedicine benefit.", tag: "Cost Impact" },
      { icon: "activity", headline: "Musculoskeletal claims 2.3x national average", body: "Construction workforce shows significantly elevated musculoskeletal claims. Workplace ergonomics assessment recommended.", tag: "Quality" },
    ],
  },
  technology: {
    avgAge: 29.8, malePercent: 68,
    chronicConditions: [
      { name: "Mental Health", prevalence: 8.7, benchmark: 5.2 },
      { name: "Vision/Eye Strain", prevalence: 12.4, benchmark: 6.8 },
      { name: "Back/Posture", prevalence: 7.8, benchmark: 4.1 },
      { name: "Metabolic Syndrome", prevalence: 5.2, benchmark: 4.8 },
    ],
    topSpecialties: [
      { name: "Ophthalmology", utilizationPercent: 18 },
      { name: "Psychiatry/Psychology", utilizationPercent: 16 },
      { name: "General Practice", utilizationPercent: 22 },
    ],
    erUtilization: 5.2, erBenchmark: 8.0,
    absenteeismDays: 2.1, absenteeismBenchmark: 3.2,
    wellnessScore: 78,
    insights: [
      { icon: "brain", headline: "Mental health utilization above benchmark", body: "Psychiatry/psychology visits 3.1x higher than national average. Consider Employee Assistance Program (EAP) and mental health first-aid training.", tag: "Quality" },
      { icon: "eye", headline: "Vision-related claims trending up 15% YoY", body: "Consider blue-light screen filters, annual eye exams, and ergonomic monitor positioning guidelines.", tag: "Prevention" },
    ],
  },
  hospitality: {
    // ... similar pattern with infectious disease focus
  },
  oil_gas: {
    // ... respiratory, occupational hazards
  },
  retail: {
    // ... shift work, foot/back conditions
  },
  healthcare: {
    // ... burnout, needle-stick, high preventive uptake
  },
};
```

**Step 4: Add employer violations (sparse — ~15% of employers have violations)**

**Step 5: Insert all Business data**

**Step 6: Commit**
```bash
git add server/scripts/seed-pillar-portals.ts
git commit -m "feat(seed): add business portal data (employers, policies, health profiles, violations)"
```

---

### Task 8: Seed Members Data

**Files:**
- Modify: `server/scripts/seed-pillar-portals.ts`

**Step 1: Add member seed data (20-30 members)**

Three demo personas + supporting cast:

```typescript
const memberData = [
  // ── Demo Personas ──
  { code: "MEM-001", name: "Fatimah Al-Dosari", nameAr: "فاطمة الدوسري", iqamaNo: "1098765432", policyNumber: "SA-2024-00789", employerCode: "EMP-025", employerName: "Nujoom Retail Group", insurerCode: "INS-001", insurerName: "Bupa Arabia", planTier: "gold", nationality: "Saudi", age: 34, gender: "female", city: "Jeddah", region: "Jeddah", dependentsCount: 2, policyValidUntil: new Date("2026-12-31") },
  { code: "MEM-002", name: "Omar Al-Zahrani", nameAr: "عمر الزهراني", iqamaNo: "1087654321", policyNumber: "SA-2024-01204", employerCode: "EMP-010", employerName: "Saudi Data Systems", insurerCode: "INS-002", insurerName: "Tawuniya", planTier: "bronze", nationality: "Saudi", age: 52, gender: "male", city: "Riyadh", region: "Riyadh", dependentsCount: 0, policyValidUntil: new Date("2026-09-30") },
  { code: "MEM-003", name: "Priya Sharma", nameAr: "بريا شارما", iqamaNo: "2345678901", policyNumber: "SA-2025-00341", employerCode: "EMP-003", employerName: "Gulf Hospitality Co", insurerCode: "INS-003", insurerName: "MedGulf", planTier: "silver", nationality: "Indian", age: 28, gender: "female", city: "Dammam", region: "Dammam", dependentsCount: 1, policyValidUntil: new Date("2026-06-30") },
  // ... 17-27 more members with variety
];
```

**Step 2: Add coverage data per member**

10 benefit categories per member. Coverage limits vary by plan tier:

```typescript
const coverageByTier = {
  gold: [
    { category: "Emergency Care", categoryAr: "رعاية الطوارئ", icon: "Siren", status: "covered", limitSar: null, copay: 0, note: "Walk into any ER. No pre-approval needed." },
    { category: "Maternity", categoryAr: "الأمومة", icon: "Baby", status: "covered", limitSar: 45000, copay: 10, note: "Covers prenatal, delivery, and postnatal. Pre-approval required for C-section." },
    { category: "Outpatient Visits", categoryAr: "العيادات الخارجية", icon: "Stethoscope", status: "covered", limitUnits: 150, copay: 20, note: "GP and specialist visits." },
    { category: "Mental Health", categoryAr: "الصحة النفسية", icon: "Brain", status: "partial", limitSar: 5000, copay: 25, note: "Covers 10 therapy sessions/year. Psychiatry requires referral." },
    { category: "Dental", categoryAr: "الأسنان", icon: "Smile", status: "covered", limitSar: 8000, copay: 20, note: "Cleanings, fillings, extractions. Orthodontics not covered." },
    { category: "Optical", categoryAr: "البصريات", icon: "Eye", status: "covered", limitSar: 2000, copay: 15, note: "One eye exam + one pair of glasses per year." },
    { category: "Chronic Conditions", categoryAr: "الأمراض المزمنة", icon: "HeartPulse", status: "covered", limitSar: 80000, copay: 10, note: "Diabetes, hypertension, asthma. Medications included." },
    { category: "Prescription Drugs", categoryAr: "الأدوية", icon: "Pill", status: "covered", limitSar: 25000, copay: 15, note: "Generic preferred. Brand-name requires pre-approval." },
    { category: "Physiotherapy", categoryAr: "العلاج الطبيعي", icon: "Activity", status: "partial", limitUnits: 12, copay: 20, note: "Requires referral from treating physician." },
    { category: "Cosmetic", categoryAr: "التجميل", icon: "Sparkles", status: "not_covered", limitSar: null, copay: 0, note: "Elective cosmetic procedures excluded." },
  ],
  bronze: [
    // Lower limits, higher copays, some categories not covered
  ],
  silver: [
    // Mid-range
  ],
  platinum: [
    // Highest limits, lowest copays
  ],
};
```

Add usage data per member that tells their story (e.g., Fatimah has 12 outpatient visits used, Omar has 14,200 SAR of chronic condition spending).

**Step 3: Add complaint data**

Pre-load complaints for demo personas:

```typescript
const complaintData = [
  // Fatimah's active complaint
  {
    ticketNumber: "CM-2026-04821",
    memberCode: "MEM-001",
    type: "claim_denial",
    description: "Dermatology consultation on Jan 15 denied as cosmetic — it was for eczema treatment",
    status: "investigation",
    assignedTo: "Claims Review Team",
    estimatedResolution: "5-7 business days",
    timeline: [
      { status: "submitted", date: "2026-02-10T09:00:00Z", note: "Complaint submitted via Daman Members portal" },
      { status: "under_review", date: "2026-02-12T14:30:00Z", note: "Assigned to Claims Review Team" },
      { status: "investigation", date: "2026-02-18T11:00:00Z", note: "Medical records requested from provider" },
    ],
    messages: [
      { sender: "Fatimah Al-Dosari", text: "My dermatology visit was for eczema treatment, not cosmetic. I have a referral from my GP.", date: "2026-02-10T09:00:00Z" },
      { sender: "Claims Review Team", text: "Thank you for your complaint. We have requested your medical records from the provider to verify the clinical indication.", date: "2026-02-12T14:30:00Z" },
    ],
  },
  // Fatimah's resolved complaint
  {
    ticketNumber: "CM-2025-11203",
    memberCode: "MEM-001",
    type: "claim_denial",
    description: "Pre-authorization delay for MRI scan — waited 3 weeks",
    status: "closed",
    outcome: "Pre-authorization approved, provider notified",
    timeline: [
      { status: "submitted", date: "2025-11-03T10:00:00Z", note: "Complaint submitted" },
      { status: "under_review", date: "2025-11-04T08:00:00Z", note: "Escalated to Pre-Auth Team" },
      { status: "investigation", date: "2025-11-06T09:00:00Z", note: "Reviewing pre-auth processing time" },
      { status: "resolution", date: "2025-11-09T14:00:00Z", note: "Pre-auth approved and backdated" },
      { status: "closed", date: "2025-11-11T10:00:00Z", note: "Member confirmed issue resolved" },
    ],
  },
  // Omar's complaint (chronic medication)
  // Priya's complaint (billing dispute)
];
```

**Step 4: Add coverage lookup data (30 entries)**

```typescript
const lookupData = [
  { question: "Can I see a dermatologist?", answer: "Yes, covered under Outpatient Visits. 20% copay. No referral needed for Gold plan.", planTiers: ["gold", "platinum"], category: "specialist" },
  { question: "Is IVF covered?", answer: "Not covered under your current plan. Available as add-on rider — contact your employer's HR.", planTiers: [], category: "maternity" },
  { question: "Do I need pre-approval for an MRI?", answer: "Yes. Your provider submits the request. Typical approval: 2-3 business days.", planTiers: ["bronze", "silver", "gold", "platinum"], category: "diagnostic" },
  // ... 27 more lookups
];
```

**Step 5: Insert all Members data**

**Step 6: Commit**
```bash
git add server/scripts/seed-pillar-portals.ts
git commit -m "feat(seed): add members portal data (members, coverage, complaints, lookups)"
```

---

## Phase 3: API Routes

### Task 9: Intelligence Portal API Routes

**Files:**
- Modify: `server/routes/pillar-routes.ts`

**Step 1: Add Intelligence portal endpoints**

Add these routes inside `registerPillarRoutes()`:

```typescript
// ── Intelligence Portal Routes ────────────────────────────────

// GET /api/intelligence/portal/providers — list all providers for selector
app.get("/api/intelligence/portal/providers", async (req, res) => {
  try {
    const providers = await db.select({
      code: portalProviders.code,
      name: portalProviders.name,
      nameAr: portalProviders.nameAr,
      city: portalProviders.city,
      type: portalProviders.type,
      region: portalProviders.region,
    }).from(portalProviders).orderBy(portalProviders.name);
    res.json(providers);
  } catch (error) {
    handleRouteError(res, error, "/api/intelligence/portal/providers", "list providers");
  }
});

// GET /api/intelligence/portal/provider/:code — full provider profile + latest scorecard
app.get("/api/intelligence/portal/provider/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const provider = await db.select().from(portalProviders).where(eq(portalProviders.code, code)).limit(1);
    if (!provider.length) return res.status(404).json({ error: "Provider not found" });

    const scorecards = await db.select().from(providerScorecards)
      .where(eq(providerScorecards.providerCode, code))
      .orderBy(providerScorecards.month);

    const latestScorecard = scorecards[scorecards.length - 1];

    res.json({
      provider: provider[0],
      currentScorecard: latestScorecard,
      scorecardHistory: scorecards,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleRouteError(res, error, "/api/intelligence/portal/provider/:code", "fetch provider profile");
  }
});

// GET /api/intelligence/portal/provider/:code/rejections — rejection analysis
app.get("/api/intelligence/portal/provider/:code/rejections", async (req, res) => {
  try {
    const { code } = req.params;
    const rejections = await db.select().from(providerRejections)
      .where(eq(providerRejections.providerCode, code))
      .orderBy(providerRejections.denialDate);

    // Compute summary stats
    const total = rejections.length;
    const byCategory = rejections.reduce((acc, r) => {
      acc[r.denialCategory] = (acc[r.denialCategory] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const categoryBreakdown = Object.entries(byCategory).map(([category, count]) => ({
      category,
      count,
      percent: Math.round((count / total) * 100),
    })).sort((a, b) => b.count - a.count);

    res.json({
      totalRejections: total,
      categoryBreakdown,
      rejections,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleRouteError(res, error, "/api/intelligence/portal/provider/:code/rejections", "fetch rejections");
  }
});

// GET /api/intelligence/portal/provider/:code/drg — DRG readiness
app.get("/api/intelligence/portal/provider/:code/drg", async (req, res) => {
  try {
    const { code } = req.params;
    const assessments = await db.select().from(providerDrgAssessments)
      .where(eq(providerDrgAssessments.providerCode, code))
      .orderBy(providerDrgAssessments.sortOrder);

    const complete = assessments.filter(a => a.status === "complete").length;
    const total = assessments.length;

    res.json({
      completionRate: Math.round((complete / total) * 100),
      completeCount: complete,
      totalCriteria: total,
      assessments,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleRouteError(res, error, "/api/intelligence/portal/provider/:code/drg", "fetch DRG readiness");
  }
});
```

**Step 2: Import new schema tables at top of file**

**Step 3: Commit**
```bash
git add server/routes/pillar-routes.ts
git commit -m "feat(api): add intelligence portal routes (provider profile, rejections, DRG)"
```

---

### Task 10: Business Portal API Routes

**Files:**
- Modify: `server/routes/pillar-routes.ts`

**Step 1: Add Business portal endpoints**

```typescript
// ── Business Portal Routes ────────────────────────────────────

// GET /api/business/portal/employers — list for selector
// GET /api/business/portal/employer/:code — employer profile + policy + compliance
// GET /api/business/portal/employer/:code/health — workforce health profile
// GET /api/business/portal/employer/:code/costs — cost intelligence with plan comparison
```

Each route queries the relevant tables and computes summary stats. The employer profile joins `portalEmployers`, `employerPolicies`, and `employerViolations`. The health route returns `workforceHealthProfiles`. The costs route enriches policy data with computed benchmarks and mock plan alternatives.

**Step 2: Commit**
```bash
git add server/routes/pillar-routes.ts
git commit -m "feat(api): add business portal routes (employer profile, health, costs)"
```

---

### Task 11: Members Portal API Routes

**Files:**
- Modify: `server/routes/pillar-routes.ts`

**Step 1: Add Members portal endpoints**

```typescript
// ── Members Portal Routes ─────────────────────────────────────

// GET /api/members/portal/members — list for selector
// GET /api/members/portal/member/:code — member profile
// GET /api/members/portal/member/:code/coverage — coverage details
// GET /api/members/portal/member/:code/complaints — complaint history
// GET /api/members/portal/coverage-lookup?q=...&planTier=... — "Is X covered?" search
// GET /api/members/portal/providers?specialty=...&city=...&insurer=... — provider directory search
```

The provider search endpoint queries `portalProviders` with optional filters for specialty (array contains), city, accepted insurers, and supports sorting by rating or wait time.

The coverage lookup does a text search on `coverageLookups.question` and filters by plan tier.

**Step 2: Commit**
```bash
git add server/routes/pillar-routes.ts
git commit -m "feat(api): add members portal routes (coverage, complaints, provider search, lookups)"
```

---

## Phase 4: Shared Components

### Task 12: Build Shared Portal Components

**Files:**
- Create: `client/src/components/portal/persona-switcher.tsx`
- Create: `client/src/components/portal/entity-header.tsx`
- Create: `client/src/components/portal/insight-card.tsx`
- Create: `client/src/components/portal/status-timeline.tsx`
- Create: `client/src/components/portal/data-table.tsx`
- Create: `client/src/components/portal/kpi-card.tsx`

**Step 1: PersonaSwitcher component**

A dropdown in the sidebar that lists pre-loaded personas for the active pillar. On selection, navigates to the persona's profile page.

```typescript
// persona-switcher.tsx
interface Persona {
  code: string;
  name: string;
  subtitle: string; // "Coding Director" or "HR Director" or "Gold Plan, Jeddah"
}

interface PersonaSwitcherProps {
  personas: Persona[];
  activeCode: string;
  onSelect: (code: string) => void;
  pillarTheme: string; // border/text color class
}
```

Uses shadcn `Select` component with pillar-themed styling.

**Step 2: EntityHeader component**

Reusable profile banner at top of portal pages.

```typescript
// entity-header.tsx
interface EntityHeaderProps {
  icon: LucideIcon;
  name: string;
  nameAr?: string;
  identifiers: Array<{ label: string; value: string }>; // [{label: "License", value: "MOH-2019-RC-001"}]
  status?: { label: string; variant: "success" | "warning" | "danger" };
  pillarTheme: string;
}
```

**Step 3: InsightCard component**

```typescript
// insight-card.tsx
interface InsightCardProps {
  icon: "lightbulb" | "alert-triangle" | "check-circle" | "brain" | "eye" | "activity";
  headline: string;
  body: string;
  tag: string; // "Cost Impact", "Quality", "Compliance", "Prevention"
}
```

**Step 4: StatusTimeline component**

Vertical stepper with status markers (complete ✅, active 🔄, pending ⬜).

```typescript
// status-timeline.tsx
interface TimelineStep {
  status: string;
  date: string;
  note: string;
  isComplete: boolean;
  isActive: boolean;
}

interface StatusTimelineProps {
  steps: TimelineStep[];
}
```

**Step 5: DataTable component**

Sortable, filterable table with search input.

```typescript
// data-table.tsx
interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchable?: boolean;
  searchPlaceholder?: string;
  onRowClick?: (row: T) => void;
  pageSize?: number;
}
```

**Step 6: KpiCard component**

Clickable KPI card with trend indicator and benchmark.

```typescript
// kpi-card.tsx
interface KpiCardProps {
  title: string;
  value: string | number;
  format?: "number" | "percent" | "currency";
  trend?: { direction: "up" | "down" | "flat"; value: string };
  benchmark?: { label: string; value: string };
  icon: LucideIcon;
  iconColor: string;
  borderColor: string;
  onClick?: () => void;
}
```

**Step 7: Commit**
```bash
git add client/src/components/portal/
git commit -m "feat(ui): add shared portal components (persona switcher, entity header, insight cards, timeline, data table, KPI cards)"
```

---

## Phase 5: Intelligence Portal Pages

### Task 13: Provider Profile Page

**Files:**
- Create: `client/src/pages/intelligence/provider-profile.tsx`

**Step 1: Build the Provider Profile page**

Layout:
1. EntityHeader (provider name, license, accreditation status)
2. Radar chart (6 dimensions from latest scorecard) — use Recharts `RadarChart`
3. Peer benchmark bar: "Top X% of [type] hospitals in [region]"
4. 6-month trend line chart (overall score over time)
5. KPI cards row (clickable): Overall Score, Rejection Rate, SBS Compliance, DRG Readiness, Doc Quality, FWA Risk
6. "Items needing attention" section (cards linking to specific issues)

Data fetching:
```typescript
const { code } = useParams(); // from wouter
const { data } = useQuery({
  queryKey: ["/api/intelligence/portal/provider", code],
  enabled: !!code,
});
```

The radar chart uses:
```typescript
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from "recharts";

const radarData = [
  { dimension: "Coding Accuracy", value: scorecard.codingAccuracy, fullMark: 100 },
  { dimension: "SBS Compliance", value: scorecard.sbsCompliance, fullMark: 100 },
  { dimension: "DRG Readiness", value: scorecard.drgReadiness, fullMark: 100 },
  { dimension: "Documentation", value: scorecard.documentationQuality, fullMark: 100 },
  { dimension: "Low Rejection", value: 100 - scorecard.rejectionRate, fullMark: 100 },
  { dimension: "Low FWA Risk", value: 100 - scorecard.fwaRisk, fullMark: 100 },
];
```

**Step 2: Commit**
```bash
git add client/src/pages/intelligence/provider-profile.tsx
git commit -m "feat(intelligence): add provider profile page with radar chart and scorecard"
```

---

### Task 14: Rejection Deep-Dive Page

**Files:**
- Create: `client/src/pages/intelligence/provider-rejections.tsx`

**Step 1: Build the Rejection Analysis page**

Layout:
1. EntityHeader (same provider)
2. Summary stats row: total rejections, total claims (computed), rejection rate, total SAR at risk
3. Denial category breakdown — horizontal bar chart
4. DataTable of individual rejections (sortable, searchable, filterable by category)
5. Click row → slide-over panel (`Sheet` from shadcn/ui) with:
   - Claim details (ref, MRN, dates)
   - ICD/CPT codes with descriptions
   - Denial reason
   - Recommendation (highlighted in blue box)
6. 6-month rejection rate trend (line chart)

**Step 2: Commit**
```bash
git add client/src/pages/intelligence/provider-rejections.tsx
git commit -m "feat(intelligence): add rejection deep-dive page with claim detail panel"
```

---

### Task 15: DRG Assessment Page

**Files:**
- Create: `client/src/pages/intelligence/provider-drg.tsx`

**Step 1: Build the DRG Readiness page**

Layout:
1. EntityHeader
2. Overall readiness: large circular progress (X/8 complete) with percentage
3. Criteria checklist — 8 items, each showing:
   - Status icon (✅ / 🔄 / ❌)
   - Criteria name + description
   - Gap description (if not complete)
   - Recommended action (if not complete)
   - Peer completion rate (progress bar: "67% of similar hospitals")
4. Projected readiness date (computed from remaining items)
5. Peer comparison section

**Step 2: Commit**
```bash
git add client/src/pages/intelligence/provider-drg.tsx
git commit -m "feat(intelligence): add DRG readiness assessment page"
```

---

## Phase 6: Business Portal Pages

### Task 16: Employer Profile Page

**Files:**
- Create: `client/src/pages/business/employer-profile.tsx`

**Step 1: Build the Employer Profile page**

Layout:
1. EntityHeader (company name, CR number, compliance status badge)
2. Large compliance status banner (green "Compliant" or red "Action Required")
3. Employee coverage summary: total, insured, pending (with progress bar)
4. Current policy card: insurer, plan tier, premium, renewal countdown
5. Alert section: "36 employees missing coverage — enroll by March 15"
6. Violation history table (with status badges: resolved/pending/appealed)

**Step 2: Commit**
```bash
git add client/src/pages/business/employer-profile.tsx
git commit -m "feat(business): add employer profile page with compliance status"
```

---

### Task 17: Workforce Health Profile Page

**Files:**
- Create: `client/src/pages/business/employer-health.tsx`

**Step 1: Build the Workforce Health page**

Layout:
1. EntityHeader
2. Demographics section: donut chart (age distribution), male/female split
3. Chronic condition prevalence: horizontal bars with benchmark overlay line
4. Utilization metrics: visits/employee, ER utilization (with benchmark comparison)
5. Cost section: total spend, cost/employee, YoY trend
6. Absenteeism: days/employee vs benchmark
7. Wellness score: circular gauge (0-100) with breakdown bars
8. Insight cards section (2-3 actionable recommendations)

Uses Recharts `BarChart` with custom bars for condition prevalence + benchmark overlay.

**Step 2: Commit**
```bash
git add client/src/pages/business/employer-health.tsx
git commit -m "feat(business): add workforce health profile page with sector-specific insights"
```

---

### Task 18: Cost Intelligence Page

**Files:**
- Create: `client/src/pages/business/employer-costs.tsx`

**Step 1: Build the Cost Intelligence page**

Layout:
1. EntityHeader
2. Current cost summary: cost/employee, total spend, vs sector benchmark
3. Plan comparison table: current plan vs 2 alternatives (columns: insurer, tier, premium, network size, coverage highlights, estimated savings)
4. What-if simulator: "Add wellness program → save X SAR/year" card
5. Benchmark comparison: bar chart showing this employer vs sector average vs national average
6. Renewal forecast: projected premium change with scenarios

The plan alternatives are computed from seed data (other insurers' plan tiers with adjusted premiums).

**Step 2: Commit**
```bash
git add client/src/pages/business/employer-costs.tsx
git commit -m "feat(business): add cost intelligence page with plan comparison and benchmarks"
```

---

## Phase 7: Members Portal Pages

### Task 19: My Coverage Page

**Files:**
- Create: `client/src/pages/members/my-coverage.tsx`

**Step 1: Build the My Coverage page**

Layout:
1. Member profile header (name, policy number, insurer, plan tier, employer, valid until)
2. Coverage grid: 10 cards in a 2-column or 3-column layout, each showing:
   - Icon + category name (English, Arabic below)
   - Status badge: Covered ✅ / Partial ⚠️ / Not Covered ❌
   - Progress bar: used/limit (SAR or units)
   - Copay percentage
   - Plain-language note
3. "Is this covered?" search section:
   - Input with search icon
   - Fetches from `/api/members/portal/coverage-lookup?q=...&planTier=...`
   - Shows answer in a highlighted card below

Coverage cards use a color scheme: green for covered, amber for partial, red/gray for not covered.

**Step 2: Commit**
```bash
git add client/src/pages/members/my-coverage.tsx
git commit -m "feat(members): add my coverage page with plain-language benefits and search"
```

---

### Task 20: Find a Provider Page

**Files:**
- Create: `client/src/pages/members/find-provider.tsx`

**Step 1: Build the Provider Search page**

Layout:
1. Member profile header (condensed — name + "Bupa Arabia Gold" badge)
2. Filter bar:
   - Specialty dropdown (populated from distinct specialties in provider data)
   - City selector (default to member's city)
   - "Accepts my insurance" toggle (default on)
   - Sort by: Rating / Wait Time
3. Results grid (cards):
   - Provider name + type badge
   - Rating: stars + review count
   - Wait time with icon
   - Accepted insurers (badges, member's insurer highlighted)
   - Specialties (truncated to 3)
   - Languages
   - "Open now" / "Closed" based on working hours
4. Click card → `Sheet` slide-over panel:
   - Full address
   - Phone number, working hours
   - All specialties
   - Patient satisfaction breakdown (4 bars: Cleanliness, Staff, Wait Time, Medical Quality)
   - "Covered under your plan" badge

**Step 2: Commit**
```bash
git add client/src/pages/members/find-provider.tsx
git commit -m "feat(members): add provider search page with filters and detail panel"
```

---

### Task 21: My Complaints Page

**Files:**
- Create: `client/src/pages/members/my-complaints.tsx`

**Step 1: Build the Complaint Tracker page**

Layout:
1. Member profile header
2. Active complaints section:
   - For each open complaint:
     - Ticket number, type badge, date
     - Description
     - StatusTimeline component (visual stepper)
     - Estimated resolution
     - Messages thread (chat-like layout)
3. "File New Complaint" button → opens a dialog with:
   - Type selector (Claim Denial, Billing Dispute, Coverage Question, Provider Quality, Other)
   - Description textarea
   - Submit button (demo mode: shows success toast with fake ticket number)
4. Historical complaints section:
   - Collapsed by default, expandable
   - Each shows ticket number, type, outcome, resolution time

**Step 2: Commit**
```bash
git add client/src/pages/members/my-complaints.tsx
git commit -m "feat(members): add complaint tracker page with status timeline and filing form"
```

---

## Phase 8: Navigation & Integration

### Task 22: Update Pillar Configs

**Files:**
- Modify: `client/src/pillars/config/intelligence.ts`
- Modify: `client/src/pillars/config/business.ts`
- Modify: `client/src/pillars/config/members.ts`

**Step 1: Add "My Hospital" nav section to Intelligence config**

Add new import icons (User, AlertCircle, Activity) and insert a new nav section after "Overview":

```typescript
{
  title: "My Hospital",
  items: [
    { label: "Provider Profile", href: "/intelligence/my-hospital", icon: User },
    { label: "Rejection Analysis", href: "/intelligence/my-hospital/rejections", icon: AlertCircle },
    { label: "DRG Readiness", href: "/intelligence/my-hospital/drg", icon: Activity },
  ],
},
```

**Step 2: Add "My Company" nav section to Business config**

```typescript
{
  title: "My Company",
  items: [
    { label: "Company Profile", href: "/business/my-company", icon: Building },
    { label: "Workforce Health", href: "/business/my-company/health", icon: HeartPulse },
    { label: "Cost Intelligence", href: "/business/my-company/costs", icon: TrendingDown },
  ],
},
```

**Step 3: Add "My Health" nav section to Members config**

```typescript
{
  title: "My Health",
  items: [
    { label: "My Coverage", href: "/members/my-health", icon: Shield },
    { label: "Find a Provider", href: "/members/my-health/providers", icon: Search },
    { label: "My Complaints", href: "/members/my-health/complaints", icon: MessageCircle },
  ],
},
```

**Step 4: Commit**
```bash
git add client/src/pillars/config/intelligence.ts client/src/pillars/config/business.ts client/src/pillars/config/members.ts
git commit -m "feat(nav): add My Hospital, My Company, My Health nav sections to pillar configs"
```

---

### Task 23: Update App.tsx Routes

**Files:**
- Modify: `client/src/App.tsx`

**Step 1: Import new page components**

```typescript
// Intelligence portal pages
import ProviderProfilePage from "@/pages/intelligence/provider-profile";
import ProviderRejectionsPage from "@/pages/intelligence/provider-rejections";
import ProviderDrgPage from "@/pages/intelligence/provider-drg";

// Business portal pages
import EmployerProfilePage from "@/pages/business/employer-profile";
import EmployerHealthPage from "@/pages/business/employer-health";
import EmployerCostsPage from "@/pages/business/employer-costs";

// Members portal pages
import MyCoveragePage from "@/pages/members/my-coverage";
import FindProviderPage from "@/pages/members/find-provider";
import MyComplaintsPage from "@/pages/members/my-complaints";
```

**Step 2: Add routes to IntelligenceRouter**

```typescript
<Route path="/intelligence/my-hospital" component={ProviderProfilePage} />
<Route path="/intelligence/my-hospital/rejections" component={ProviderRejectionsPage} />
<Route path="/intelligence/my-hospital/drg" component={ProviderDrgPage} />
```

**Step 3: Add routes to BusinessRouter**

```typescript
<Route path="/business/my-company" component={EmployerProfilePage} />
<Route path="/business/my-company/health" component={EmployerHealthPage} />
<Route path="/business/my-company/costs" component={EmployerCostsPage} />
```

**Step 4: Add routes to MembersRouter**

```typescript
<Route path="/members/my-health" component={MyCoveragePage} />
<Route path="/members/my-health/providers" component={FindProviderPage} />
<Route path="/members/my-health/complaints" component={MyComplaintsPage} />
```

**Step 5: Commit**
```bash
git add client/src/App.tsx
git commit -m "feat(router): register portal page routes for all three pillars"
```

---

### Task 24: Persona State Management

**Files:**
- Create: `client/src/hooks/use-persona.ts`

**Step 1: Create a simple persona state hook**

Uses URL search params or localStorage to persist the selected persona code per pillar:

```typescript
// use-persona.ts
import { useState, useEffect } from "react";

const PERSONA_STORAGE_KEY = "chi-portal-persona";

interface PersonaState {
  intelligence: string; // provider code
  business: string;     // employer code
  members: string;      // member code
}

const defaults: PersonaState = {
  intelligence: "PRV-001", // Riyadh Care Hospital
  business: "EMP-001",     // Al Madinah Construction
  members: "MEM-001",      // Fatimah Al-Dosari
};

export function usePersona(pillar: "intelligence" | "business" | "members") {
  const [code, setCode] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(PERSONA_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed[pillar] || defaults[pillar];
      }
    } catch {}
    return defaults[pillar];
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PERSONA_STORAGE_KEY);
      const current = stored ? JSON.parse(stored) : { ...defaults };
      current[pillar] = code;
      localStorage.setItem(PERSONA_STORAGE_KEY, JSON.stringify(current));
    } catch {}
  }, [code, pillar]);

  return [code, setCode] as const;
}
```

Each portal page uses this hook to get/set the active persona, and the PersonaSwitcher component calls `setCode()` on selection.

**Step 2: Commit**
```bash
git add client/src/hooks/use-persona.ts
git commit -m "feat(state): add persona state hook with localStorage persistence"
```

---

## Phase 9: Final Integration & Polish

### Task 25: Wire PersonaSwitcher into Pillar Layouts

**Files:**
- Modify: `client/src/pillars/pillar-shell.tsx`

**Step 1: Add PersonaSwitcher to the sidebar**

In `PillarLayout`, add the `PersonaSwitcher` component below the pillar header in the sidebar, visible only on pillar portal pages. The switcher fetches the persona list from the relevant API endpoint and renders the dropdown.

**Step 2: Commit**
```bash
git add client/src/pillars/pillar-shell.tsx
git commit -m "feat(layout): integrate persona switcher into pillar sidebar"
```

---

### Task 26: Run Seed Script and Verify

**Step 1: Run the full seed script**
```bash
npx tsx server/scripts/seed-pillar-portals.ts --force
```
Expected: All tables populated, no errors.

**Step 2: Verify data in database**
```bash
# Check counts
npx tsx -e "
import { db } from './server/db';
import { portalProviders, portalEmployers, portalMembers, providerScorecards, providerRejections } from './shared/schema';
const counts = await Promise.all([
  db.select().from(portalProviders).then(r => r.length),
  db.select().from(portalEmployers).then(r => r.length),
  db.select().from(portalMembers).then(r => r.length),
  db.select().from(providerScorecards).then(r => r.length),
  db.select().from(providerRejections).then(r => r.length),
]);
console.log({ providers: counts[0], employers: counts[1], members: counts[2], scorecards: counts[3], rejections: counts[4] });
process.exit(0);
"
```
Expected: `{ providers: 50+, employers: 100+, members: 20+, scorecards: 300+, rejections: 500+ }`

**Step 3: Start dev server and test each portal page**
```bash
npm run dev
```
Navigate to each new route and verify data loads.

**Step 4: Commit any fixes**

---

### Task 27: End-to-End Demo Walkthrough Test

**Step 1: Walk through the full 15-minute demo script from the design doc**

Verify each act:
- Intelligence: Riyadh Care → scorecard → rejections (click a claim) → DRG → switch to Tabuk
- Business: Al Madinah Construction → profile → workforce health → costs → switch to Nujoom Tech
- Members: Fatimah → coverage → search "Is IVF covered?" → find provider → complaints → see timeline

**Step 2: Fix any UI issues, data gaps, or navigation dead ends**

**Step 3: Final commit**
```bash
git add -A
git commit -m "feat: complete Daman pillars persona portals — all 3 pillars with 9 portal pages"
```

---

## Summary

| Phase | Tasks | What Gets Built |
|-------|-------|----------------|
| 1: Schema | 1-4 | 15 new database tables |
| 2: Seed | 5-8 | Rich demo data (50+ providers, 100+ employers, 30 members, 500+ rejections) |
| 3: API | 9-11 | ~15 new API endpoints |
| 4: Components | 12 | 6 shared portal components |
| 5: Intelligence | 13-15 | 3 new pages (profile, rejections, DRG) |
| 6: Business | 16-18 | 3 new pages (profile, health, costs) |
| 7: Members | 19-21 | 3 new pages (coverage, providers, complaints) |
| 8: Integration | 22-24 | Nav configs, routes, persona state |
| 9: Polish | 25-27 | Wiring, verification, demo walkthrough |
