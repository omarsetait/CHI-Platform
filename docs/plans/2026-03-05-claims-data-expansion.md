# Claims Data Expansion — BRD-Aligned Unified Schema

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the two disconnected claims tables (`claims` + `fwa_analyzed_claims`) with 6 normalized, BRD-aligned tables and seed 5,000 realistic claims.

**Architecture:** Define 6 new Drizzle tables (policies, members, providers, practitioners, claims, service_lines) in shared/schema.ts. Build a comprehensive seeder that generates 5,000 claims with proper FK relationships. Migrate all server queries and frontend references from old tables to new tables. Drop old tables.

**Tech Stack:** Drizzle ORM + PostgreSQL, TypeScript, React (Vite)

**Design Doc:** `docs/plans/2026-03-05-claims-data-expansion-design.md`

---

## Phase 1: New Table Schemas

### Task 1: Define `policies` and `members` tables in schema.ts

**Files:**
- Modify: `shared/schema.ts` — add after existing table definitions (before fwaAnalyzedClaims at line 3559)

**Step 1:** Add the `policies` table definition:

```typescript
// =============================================================================
// BRD-Aligned Master Data Tables (iHop Master Data Schema V2)
// =============================================================================

export const policies = pgTable("policies", {
  id: text("id").primaryKey(),
  planName: text("plan_name").notNull(),
  payerId: text("payer_id").notNull(),
  effectiveDate: date("effective_date").notNull(),
  expiryDate: date("expiry_date").notNull(),
  coverageLimits: jsonb("coverage_limits"),
  exclusions: text("exclusions").array(),
  copaySchedule: jsonb("copay_schedule"),
  waitingPeriods: jsonb("waiting_periods"),
  preAuthRequiredServices: text("pre_auth_required_services").array(),
  networkRequirements: text("network_requirements"),
  annualMaximum: decimal("annual_maximum", { precision: 12, scale: 2 }),
  lifetimeMaximum: decimal("lifetime_maximum", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPolicySchema = createInsertSchema(policies).omit({ createdAt: true });
export type InsertPolicy = z.infer<typeof insertPolicySchema>;
export type Policy = typeof policies.$inferSelect;
```

**Step 2:** Add the `members` table definition:

```typescript
export const members = pgTable("members", {
  id: text("id").primaryKey(),
  policyId: text("policy_id").references(() => policies.id),
  payerId: text("payer_id").notNull(),
  name: text("name"),
  dateOfBirth: date("date_of_birth").notNull(),
  gender: text("gender").notNull(),
  nationality: text("nationality"),
  region: text("region"),
  groupNumber: text("group_number"),
  coverageRelationship: text("coverage_relationship"),
  chronicConditions: text("chronic_conditions").array(),
  preExistingFlag: boolean("pre_existing_flag").default(false),
  maritalStatus: text("marital_status"),
  networkTier: text("network_tier"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMemberSchema = createInsertSchema(members).omit({ createdAt: true });
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof members.$inferSelect;
```

**Step 3:** Verify — run `npx tsc --noEmit 2>&1 | grep -c "error"` — should be same count as before (no new errors).

**Step 4:** Commit: `git add shared/schema.ts && git commit -m "feat: add policies and members table schemas (BRD Feed 2, 5)"`

---

### Task 2: Define `providers` and `practitioners` tables in schema.ts

**Files:**
- Modify: `shared/schema.ts` — add after members table

**Step 1:** Add the `providers` table definition:

```typescript
export const providers = pgTable("providers", {
  id: text("id").primaryKey(),
  npi: text("npi"),
  name: text("name").notNull(),
  providerType: text("provider_type").notNull(),
  specialty: text("specialty"),
  region: text("region"),
  city: text("city"),
  networkTier: text("network_tier"),
  address: text("address"),
  organization: text("organization"),
  email: text("email"),
  phone: text("phone"),
  licenseNumber: text("license_number"),
  licenseExpiry: date("license_expiry"),
  contractStatus: text("contract_status"),
  hcpCode: text("hcp_code"),
  memberCount: integer("member_count"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProviderSchema = createInsertSchema(providers).omit({ createdAt: true });
export type InsertProvider = z.infer<typeof insertProviderSchema>;
export type Provider = typeof providers.$inferSelect;
```

**Step 2:** Add the `practitioners` table definition:

```typescript
export const practitioners = pgTable("practitioners", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  specialty: text("specialty").notNull(),
  specialtyCode: text("specialty_code"),
  credentials: text("credentials"),
  licenseNumber: text("license_number"),
  primaryFacilityId: text("primary_facility_id").references(() => providers.id),
  primaryFacilityName: text("primary_facility_name"),
  affiliatedFacilities: text("affiliated_facilities").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPractitionerSchema = createInsertSchema(practitioners).omit({ createdAt: true });
export type InsertPractitioner = z.infer<typeof insertPractitionerSchema>;
export type Practitioner = typeof practitioners.$inferSelect;
```

**Step 3:** Verify — `npx tsc --noEmit 2>&1 | grep -c "error"` — same count as before.

**Step 4:** Commit: `git add shared/schema.ts && git commit -m "feat: add providers and practitioners table schemas (BRD Feed 3, 4)"`

---

### Task 3: Define new unified `claims` and `service_lines` tables in schema.ts

**Files:**
- Modify: `shared/schema.ts` — add after practitioners table

**Step 1:** Add the new `claims` table. IMPORTANT: The old `claims` table export name conflicts. Rename the OLD export to `legacyClaims` temporarily (find-replace `export const claims =` to `export const legacyClaims =` and all its type exports). Then add the new table:

Actually — to avoid breaking 30+ files at once, use a DIFFERENT Drizzle export name for the new table initially. Call it `claimsV2` and `serviceLines`. We will swap names in a later phase when updating routes.

```typescript
export const claimsV2 = pgTable("claims_v2", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  claimNumber: text("claim_number").notNull().unique(),
  policyId: text("policy_id").references(() => policies.id),
  memberId: text("member_id").references(() => members.id).notNull(),
  providerId: text("provider_id").references(() => providers.id).notNull(),
  practitionerId: text("practitioner_id").references(() => practitioners.id),
  claimType: text("claim_type").notNull(),
  registrationDate: timestamp("registration_date").notNull(),
  serviceDate: timestamp("service_date").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  approvedAmount: decimal("approved_amount", { precision: 12, scale: 2 }),
  denialReason: text("denial_reason"),
  status: text("status").notNull().default("pending"),
  primaryDiagnosis: text("primary_diagnosis").notNull(),
  icdCodes: text("icd_codes").array(),
  cptCodes: text("cpt_codes").array(),
  description: text("description"),
  specialty: text("specialty"),
  hospital: text("hospital"),
  hasSurgery: boolean("has_surgery"),
  surgeryFee: decimal("surgery_fee", { precision: 12, scale: 2 }),
  hasIcu: boolean("has_icu"),
  lengthOfStay: integer("length_of_stay"),
  preAuthRef: text("pre_auth_ref"),
  category: text("category"),
  insurerId: text("insurer_id"),
  facilityId: text("facility_id"),
  isNewborn: boolean("is_newborn").default(false),
  isChronic: boolean("is_chronic").default(false),
  isPreExisting: boolean("is_pre_existing").default(false),
  isPreAuthorized: boolean("is_pre_authorized").default(false),
  isMaternity: boolean("is_maternity").default(false),
  groupNo: text("group_no"),
  city: text("city"),
  providerType: text("provider_type"),
  coverageRelationship: text("coverage_relationship"),
  providerShare: decimal("provider_share", { precision: 12, scale: 2 }),
  onAdmissionDiagnosis: text("on_admission_diagnosis").array(),
  dischargeDiagnosis: text("discharge_diagnosis").array(),
  policyEffectiveDate: date("policy_effective_date"),
  policyExpiryDate: date("policy_expiry_date"),
  mdgfClaimNumber: text("mdgf_claim_number"),
  hcpCode: text("hcp_code"),
  occurrenceDate: timestamp("occurrence_date"),
  source: text("source"),
  resubmission: boolean("resubmission").default(false),
  dischargeDisposition: text("discharge_disposition"),
  admissionDate: timestamp("admission_date"),
  dischargeDate: timestamp("discharge_date"),
  preAuthStatus: text("pre_auth_status"),
  preAuthIcd10s: text("pre_auth_icd10s").array(),
  netPayableAmount: decimal("net_payable_amount", { precision: 12, scale: 2 }),
  patientShare: decimal("patient_share", { precision: 12, scale: 2 }),
  aiStatus: text("ai_status"),
  validationResults: jsonb("validation_results"),
  flagged: boolean("flagged").default(false),
  flagReason: text("flag_reason"),
  outlierScore: decimal("outlier_score", { precision: 5, scale: 4 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertClaimV2Schema = createInsertSchema(claimsV2).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertClaimV2 = z.infer<typeof insertClaimV2Schema>;
export type ClaimV2 = typeof claimsV2.$inferSelect;
```

**Step 2:** Add `serviceLines` table:

```typescript
export const serviceLines = pgTable("service_lines", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  claimId: text("claim_id").references(() => claimsV2.id).notNull(),
  lineNumber: integer("line_number").notNull(),
  serviceCode: text("service_code").notNull(),
  serviceDescription: text("service_description").notNull(),
  serviceCodeSystem: text("service_code_system"),
  serviceType: text("service_type"),
  quantity: decimal("quantity", { precision: 8, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
  approvedAmount: decimal("approved_amount", { precision: 12, scale: 2 }),
  serviceDate: timestamp("service_date"),
  modifiers: text("modifiers").array(),
  diagnosisPointers: text("diagnosis_pointers").array(),
  ndc: text("ndc"),
  gtin: text("gtin"),
  sbsCode: text("sbs_code"),
  sfdaCode: text("sfda_code"),
  daysSupply: integer("days_supply"),
  prescriptionNumber: text("prescription_number"),
  prescriberId: text("prescriber_id"),
  patientShare: decimal("patient_share", { precision: 12, scale: 2 }),
  internalServiceCode: text("internal_service_code"),
  providerServiceDescription: text("provider_service_description"),
  toothNumber: text("tooth_number"),
  dosageInstruction: jsonb("dosage_instruction"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertServiceLineSchema = createInsertSchema(serviceLines).omit({ id: true, createdAt: true });
export type InsertServiceLine = z.infer<typeof insertServiceLineSchema>;
export type ServiceLine = typeof serviceLines.$inferSelect;
```

**Step 3:** Verify — `npx tsc --noEmit 2>&1 | grep -c "error"` — same count as before.

**Step 4:** Commit: `git add shared/schema.ts && git commit -m "feat: add claimsV2 and serviceLines table schemas (BRD Feed 1, 6, 12)"`

---

## Phase 2: Data Seeder

### Task 4: Create the new comprehensive seeder

**Files:**
- Create: `server/services/brd-data-seeder.ts`

This is a large file. Create it as a new file alongside the existing seeder (we'll swap later). The seeder generates data in FK order: policies → members → providers → practitioners → claims → service_lines.

**Step 1:** Create the seeder file with all reference data arrays (Saudi hospitals, cities, ICD-10 codes, CPT codes, specialties, realistic names).

**Data constants to include:**
- 13 Saudi cities with regions: Riyadh/RIY, Jeddah/MAK, Dammam/EST, Makkah/MAK, Madinah/MAD, Al Khobar/EST, Tabuk/TAB, Abha/ASR, Khamis Mushait/ASR, Buraidah/QAS, Hail/HAL, Najran/NAJ, Jazan/JAZ
- 100 provider names (real Saudi hospitals + clinics)
- 50 practitioner names (Arabic names)
- 500 member names (Arabic male + female)
- 30 ICD-10 codes with descriptions (Saudi-relevant: diabetes, hypertension, back pain, respiratory, cardiac, etc.)
- 25 CPT/SBS codes with base prices
- Specialty list: Cardiology, Orthopedics, General Medicine, Emergency Medicine, Pediatrics, OB-GYN, Oncology, Neurology, Dermatology, Psychiatry, Ophthalmology, ENT, Urology, Radiology, General Surgery

**Step 2:** Implement `seedPolicies()` — generates 30 policies:
- IDs: `POL-0001` to `POL-0030`
- Payers: 5 Saudi insurers (Tawuniya, Bupa Arabia, Medgulf, CCHI, Gulf Union)
- Plans: Bronze/Silver/Gold/Platinum tiers
- Effective dates spanning 2024-2026
- Annual max: SAR 100K-2M based on tier

**Step 3:** Implement `seedProviders()` — generates 100 providers:
- IDs: `PRV-0001` to `PRV-0100`
- Types: hospital (40%), clinic (30%), pharmacy (15%), lab (10%), specialist_center (5%)
- Distributed across 13 Saudi cities
- Network tiers: Tier 1 (30%), Tier 2 (40%), Tier 3 (30%)
- Realistic NPI/CCHI license numbers

**Step 4:** Implement `seedPractitioners()` — generates 50 practitioners:
- IDs: `DOC-0001` to `DOC-0050`
- Each affiliated to 1-3 providers
- 15 specialties distributed realistically
- Saudi Commission license numbers

**Step 5:** Implement `seedMembers()` — generates 500 members:
- IDs: `MEM-0001` to `MEM-0500`
- Each linked to a policy
- Age distribution: 0-80 (bell curve centered at 35)
- Gender: 50/50
- Nationality: 70% Saudi, 15% Egyptian, 5% Indian, 5% Pakistani, 5% other
- 15% have chronic conditions
- 8% have pre-existing flags

**Step 6:** Implement `seedClaims()` — generates 5,000 claims:
- IDs (internal): UUID
- Claim numbers: `CLM-2026-00001` to `CLM-2026-05000`
- Each claim references a member, provider, practitioner
- Claim type distribution: 60% Outpatient, 20% Inpatient, 10% Emergency, 10% Pharmacy
- Status distribution: 50% approved, 20% pending, 15% under_review, 10% denied, 5% flagged
- Amount ranges by type:
  - Outpatient: SAR 100-5,000
  - Inpatient: SAR 5,000-200,000
  - Emergency: SAR 500-50,000
  - Pharmacy: SAR 50-3,000
- Dates: spread across last 12 months
- ~10% flagged with realistic FWA reasons: upcoding (3%), unbundling (2%), duplicate (2%), phantom billing (1%), credential mismatch (1%), frequency abuse (1%)
- Primary diagnosis selected based on specialty
- Service date slightly before registration date
- Inpatient claims get admission_date, discharge_date, length_of_stay

**Step 7:** Implement `seedServiceLines()` — generates ~12,500 service lines:
- Each claim gets 1-8 service lines (avg 2.5)
- Outpatient: 1-3 lines
- Inpatient: 3-8 lines
- Emergency: 2-5 lines
- Pharmacy: 1-2 lines
- Service codes match claim type and diagnosis
- unit_price × quantity = total_price
- Sum of service line total_prices = claim amount

**Step 8:** Implement `seedBrdDemoData()` — orchestrator:
```typescript
export async function seedBrdDemoData(): Promise<void> {
  await seedPolicies();
  await seedProviders();
  await seedPractitioners();
  await seedMembers();
  await seedClaims();
  await seedServiceLines();
  // Re-seed detection results using new claim IDs
  await seedDetectionResultsV2();
}
```

Also implement `seedDetectionResultsV2()` that creates `fwa_detection_results` and `fwa_provider_detection_results` using the NEW claim IDs (CLM-2026-XXXXX) and provider IDs (PRV-XXXX) so all JOINs work correctly.

**Step 9:** Verify — run `npx tsc --noEmit` on the new file, ensure no type errors.

**Step 10:** Commit: `git add server/services/brd-data-seeder.ts && git commit -m "feat: add BRD-aligned data seeder (5K claims, 6 entity tables)"`

---

## Phase 3: Wire Seeder & Push Tables to DB

### Task 5: Register new tables and call seeder on startup

**Files:**
- Modify: `server/db.ts` or `server/index.ts` — wherever DB push/migration runs
- Modify: `server/services/demo-data-seeder.ts` — call new seeder from orchestrator

**Step 1:** Find where `drizzle-kit push` or schema sync runs. Add the new table imports so Drizzle creates them on startup.

**Step 2:** In `demo-data-seeder.ts`, add a call to `seedBrdDemoData()` inside `seedDatabaseWithDemoData()` (at the end, after existing seeds).

**Step 3:** Verify — restart server (`npm run dev`), check logs for table creation and seeding.

**Step 4:** Verify data — `curl localhost:5001/api/claims?limit=1` should still return old data (old routes still work).

**Step 5:** Commit: `git commit -m "feat: wire BRD seeder into startup, push new tables to DB"`

---

## Phase 4: Migrate Server Routes

### Task 6: Update `fwa-routes.ts` — claims queries (Part 1: Read operations)

**Files:**
- Modify: `server/routes/fwa-routes.ts`

This is the largest file (~9500 lines). Migrate in stages:

**Step 1:** At the top of the file, add imports for new tables:
```typescript
import { claimsV2, serviceLines, members, providers, practitioners, policies } from "@shared/schema";
```

**Step 2:** Find all `FROM claims` and `FROM fwa_analyzed_claims` SELECT queries. For each one:
- Replace table name: `claims` → `claims_v2`, `fwa_analyzed_claims` → `claims_v2`
- Update column names where they differ:
  - `ac.claim_reference` → `c.claim_number`
  - `ac.total_amount` → `c.amount`
  - `ac.patient_id` → `c.member_id`
  - `ac.principal_diagnosis_code` → `c.primary_diagnosis`
  - `ac.service_code` → (now in service_lines table — JOIN or use cpt_codes array)
  - `ac.claim_occurrence_date` → `c.service_date`
  - `ac.original_status` → `c.status`

**Step 3:** For queries that JOIN `fwa_detection_results dr` with claims:
- Change `dr.claim_id = ac.claim_reference` → `dr.claim_id = c.claim_number`
- Change `ac.total_amount::numeric` → `c.amount::numeric`

**Step 4:** Verify — `npx tsc --noEmit` — no new errors.

**Step 5:** Commit: `git commit -m "refactor: migrate fwa-routes read queries to claims_v2 table"`

---

### Task 7: Update `fwa-routes.ts` — remaining queries (Part 2: Aggregations, dashboards)

**Files:**
- Modify: `server/routes/fwa-routes.ts`

**Step 1:** Update all dashboard aggregation queries (lines ~130, 170, 7727, 7967-7970, 9071-9072) to use `claims_v2`.

**Step 2:** Update the `aggregated_metrics` JSONB reads — change `aggregated_metrics->>'totalExposure'` → `aggregated_metrics->>'totalAmount'` (already done but verify).

**Step 3:** Update provider profile endpoint to JOIN with new `providers` table for name/specialty.

**Step 4:** Verify — restart server, check dashboard API returns data.

**Step 5:** Commit: `git commit -m "refactor: migrate fwa-routes aggregation queries to claims_v2"`

---

### Task 8: Update `fwa-detection-engine.ts`

**Files:**
- Modify: `server/services/fwa-detection-engine.ts`

**Step 1:** Update import: add `claimsV2, members, providers, practitioners` imports.

**Step 2:** In `aggregateProviderDetection()`:
- Remove the dual-JOIN approach (no longer needed — one table)
- Change `LEFT JOIN fwa_analyzed_claims ac` and `LEFT JOIN claims lc` → single `LEFT JOIN claims_v2 c ON dr.claim_id = c.claim_number`
- Update column refs: `c.total_amount` → `c.amount`, `c.claim_occurrence_date` → `c.service_date`

**Step 3:** In the fallback (no detection results), change query to:
```sql
SELECT id, claim_number, provider_id, member_id, amount, description,
       primary_diagnosis, icd_codes, cpt_codes, claim_type
FROM claims_v2
WHERE provider_id = ${providerId}
LIMIT 50
```

**Step 4:** Update all other `db.select().from(claims)` calls in rule engine, statistical, unsupervised detectors to use `claimsV2`.

**Step 5:** Verify — `npx tsc --noEmit` — no new errors.

**Step 6:** Commit: `git commit -m "refactor: migrate detection engine to claims_v2 table"`

---

### Task 9: Update remaining server services

**Files:**
- Modify: `server/services/ml-unsupervised-engine.ts`
- Modify: `server/services/statistical-learning-engine.ts`
- Modify: `server/services/network-feature-service.ts`
- Modify: `server/services/kpi-calculator.ts`
- Modify: `server/services/fwa-pipeline-service.ts`
- Modify: `server/services/claim-import-service.ts`
- Modify: `server/services/claims-import-service.ts`
- Modify: `server/services/excel-batch-service.ts`
- Modify: `server/services/etl-ingestion-service.ts`
- Modify: `server/storage.ts`
- Modify: `server/routes/claims-routes.ts`
- Modify: `server/routes/context-routes.ts`
- Modify: `server/routes/pipeline-routes.ts`

**Step 1:** For each file, update imports from `claims` / `fwaAnalyzedClaims` → `claimsV2`.

**Step 2:** Update column references:
- `claims.amount` → `claimsV2.amount` (same)
- `claims.providerId` → `claimsV2.providerId` (same)
- `claims.patientId` → `claimsV2.memberId`
- `claims.registrationDate` → `claimsV2.registrationDate` (same)
- `claims.serviceDate` → `claimsV2.serviceDate` (same)
- `fwaAnalyzedClaims.claimReference` → `claimsV2.claimNumber`
- `fwaAnalyzedClaims.totalAmount` → `claimsV2.amount`
- `fwaAnalyzedClaims.principalDiagnosisCode` → `claimsV2.primaryDiagnosis`

**Step 3:** For import services (claim-import-service, claims-import-service, excel-batch-service, etl-ingestion-service), update INSERT operations to write to `claimsV2` with the new field mapping.

**Step 4:** Verify — `npx tsc --noEmit` — no new errors.

**Step 5:** Commit: `git commit -m "refactor: migrate all remaining services to claims_v2 table"`

---

## Phase 5: Frontend Updates

### Task 10: Update frontend type references and field names

**Files:**
- Modify: `client/src/pages/fwa/entity-profile.tsx`
- Modify: `client/src/components/claims/claims-modal.tsx`
- Modify: `client/src/components/data-import-dialog.tsx`
- Modify: `client/src/components/filter-bar.tsx`
- Modify: `client/src/pages/provider-detail.tsx`

**Step 1:** Check all API response field names. Most field names stay the same (the API routes transform DB columns to camelCase already). Key changes:
- `patientId` → `memberId` in API responses (or keep as `patientId` alias in route)
- `claimReference` → `claimNumber`
- `totalAmount` → `amount` (for fwa_analyzed_claims consumers)

**Step 2:** Update any `Claim` type imports to use `ClaimV2` if needed, or keep backward-compatible API response shapes.

**Step 3:** Verify — open browser, navigate to FWA pages, check no console errors.

**Step 4:** Commit: `git commit -m "refactor: update frontend for new claims schema"`

---

## Phase 6: Rename & Cleanup

### Task 11: Rename `claims_v2` → `claims` and remove old tables

**Files:**
- Modify: `shared/schema.ts` — rename exports and table names
- Modify: All files that import `claimsV2` → rename to `claims`

**Step 1:** In `shared/schema.ts`:
- Remove old `claims` table definition (lines 62-195)
- Remove old `fwaAnalyzedClaims` table definition (lines 3559-3631)
- Rename `claimsV2` → `claims` and `"claims_v2"` → `"claims"`
- Rename `InsertClaimV2` → `InsertClaim`, `ClaimV2` → `Claim`

**Step 2:** Find-replace across all server files: `claimsV2` → `claims`, `ClaimV2` → `Claim`, `InsertClaimV2` → `InsertClaim`.

**Step 3:** Verify — `npx tsc --noEmit` — no new errors.

**Step 4:** Verify — restart server, test key endpoints:
- `curl localhost:5001/api/claims?limit=3` — returns data
- `curl localhost:5001/api/fwa/entity-detection/provider/PRV-0001` — returns data with amounts
- Open browser, navigate entity profile — amounts display correctly

**Step 5:** Commit: `git commit -m "refactor: rename claims_v2 to claims, remove legacy tables"`

---

### Task 12: Final verification and cleanup

**Files:**
- Remove dead code in `demo-data-seeder.ts` that seeds old tables
- Remove `server/scripts/seed-chi-demo.ts` if it only seeds old format
- Remove `server/services/generate-test-claims.ts` if superseded
- Clean up any migration files referencing old table

**Step 1:** Run full TypeScript check: `npx tsc --noEmit` — no new errors.

**Step 2:** Restart server, verify:
- Dashboard loads with claim counts
- Entity profiles show non-zero amounts
- Flagged claims list populates
- Detection engine "Run Analysis" works
- High-risk entities list populates

**Step 3:** Verify data integrity:
```bash
curl -s localhost:5001/api/claims?limit=1 | python3 -m json.tool | head -30
curl -s localhost:5001/api/fwa/entity-detection/provider/PRV-0001 | python3 -c "import sys,json; d=json.load(sys.stdin); m=d.get('aggregated_metrics',{}); print('totalAmount:', m.get('totalAmount'))"
```

**Step 4:** Commit: `git commit -m "chore: remove legacy claims tables and dead seeder code"`

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| Phase 1 | Tasks 1-3 | Define 6 new Drizzle table schemas |
| Phase 2 | Task 4 | Build comprehensive seeder (5K claims) |
| Phase 3 | Task 5 | Wire seeder, push tables to DB |
| Phase 4 | Tasks 6-9 | Migrate all server routes and services |
| Phase 5 | Task 10 | Update frontend references |
| Phase 6 | Tasks 11-12 | Rename tables, remove old code, verify |
