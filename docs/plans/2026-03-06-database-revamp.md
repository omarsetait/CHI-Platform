# Database Modernization & Production Readiness Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clean, normalize, and harden the database layer for production — remove legacy tables, add missing constraints/indexes, fix naming, and ensure migration safety.

**Architecture:** Incremental migrations using drizzle-kit generate+push. Each phase is independently deployable and rollback-safe. Legacy tables are deprecated with views first, then dropped after validation.

**Tech Stack:** Drizzle ORM, PostgreSQL 15, drizzle-kit, TypeScript

---

## Audit Summary

| Metric | Current State |
|--------|--------------|
| Tables | 126 (3 legacy/dead, 1 duplicate enum) |
| Enums | 71 (1 exact duplicate) |
| Runtime indexes | 66 (in db-indexes.ts) |
| Schema-level indexes | 6 (3 HNSW + 3 composite) |
| CHECK constraints | 24 (in db-constraints.ts) |
| FK constraints | ~44 explicit, ~30+ missing |
| Migration files | 10 drizzle-generated + 2 manual SQL |

### Critical Issues Found

1. **Legacy tables still queried** — `claims` (old) used in 5 files via raw SQL; `fwa_analyzed_claims` used in demo seeder
2. **`claims` vs `claims_v2` confusion** — Drizzle export `claims` maps to DB `claims_v2`, but old DB table `claims` still exists and is queried
3. **Duplicate enum** — `fwaCategoryTypeEnum` and `fwaCategoryEnum` are identical
4. **Missing indexes on `claims_v2`** — No indexes on `member_id`, `provider_id`, `service_date`, `status`, `primary_diagnosis` (the most-queried table)
5. **Missing indexes on detection results** — `fwa_detection_results.claim_id`, `provider_id`, `composite_score` unindexed
6. **No CASCADE deletes** — Only 2 of 44+ FK relationships have CASCADE
7. **PK type inconsistency** — 4 tables use `serial` while 122 use UUID text
8. **Raw SQL references hardcoded table name `claims`** — Will query the WRONG table (legacy `claims` instead of `claims_v2`)

### Code Paths Still Using Legacy Tables

| File | Table | Type | Lines |
|------|-------|------|-------|
| `chat-data-agent.ts` | `claims` (raw SQL) | Active query | 146-152 |
| `fwa-routes.ts` | `claims` (raw SQL) | Active query | 1461, 3359 |
| `etl-routes.ts` | `claims` (raw SQL) | Active query | 314 |
| `seed-chi-demo.ts` | `claims` (raw SQL) | Seed script | 1206, 1245 |
| `seed-existing-claims-services.ts` | `claims` (raw SQL) | Migration script | 175 |
| `demo-data-seeder.ts` | `fwaAnalyzedClaims` (Drizzle) | Seed script | 1287-3042 |
| `sql-guard.ts` | `claims`, `fwa_analyzed_claims` | Allowlist | 6, 9 |

---

## Phase 1: Fix Critical Raw SQL Breakage (no schema change)

These raw SQL queries hit the OLD `claims` table instead of `claims_v2`. This is a data correctness bug.

### Task 1: Fix raw SQL `FROM claims` → `FROM claims_v2`

**Files:**
- Modify: `server/services/chat-data-agent.ts:146-152`
- Modify: `server/routes/fwa-routes.ts:1461,3359`
- Modify: `server/routes/etl-routes.ts:314`
- Modify: `server/services/sql-guard.ts:6,9`

**Step 1: Fix chat-data-agent.ts**

Replace all 4 occurrences of `FROM claims` with `FROM claims_v2` at lines 146, 148, 150, 152.

**Step 2: Fix fwa-routes.ts**

Replace `FROM claims` with `FROM claims_v2` at lines 1461 and 3359. Also verify column names match (`patient_id` → `member_id` if needed).

**Step 3: Fix etl-routes.ts**

Replace `FROM claims` with `FROM claims_v2` at line 314. Verify column names.

**Step 4: Update sql-guard.ts allowlist**

Add `"claims_v2"` to ALLOWED_TABLES. Keep `"claims"` temporarily for backward compat.

**Step 5: Verify**

Run: `grep -rn "FROM claims[^_]" server/ --include="*.ts" | grep -v node_modules | grep -v ".d.ts"`
Expected: 0 matches (only `claims_v2` references remain)

**Step 6: TypeScript check**

Run: `npx tsc --noEmit 2>&1 | grep "error TS" | wc -l`
Expected: 0 errors

**Step 7: Commit**

```bash
git add server/services/chat-data-agent.ts server/routes/fwa-routes.ts server/routes/etl-routes.ts server/services/sql-guard.ts
git commit -m "fix: replace raw SQL 'FROM claims' with 'FROM claims_v2' to query correct table"
```

---

## Phase 2: Add Missing Performance Indexes

### Task 2: Add claims_v2 indexes to db-indexes.ts

**Files:**
- Modify: `server/db-indexes.ts`

**Step 1: Add claims_v2 indexes**

Add the following block to `createDatabaseIndexes()`:

```sql
-- Claims V2 indexes (most-queried table)
CREATE INDEX IF NOT EXISTS idx_claims_v2_member_id ON claims_v2(member_id);
CREATE INDEX IF NOT EXISTS idx_claims_v2_provider_id ON claims_v2(provider_id);
CREATE INDEX IF NOT EXISTS idx_claims_v2_practitioner_id ON claims_v2(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_claims_v2_service_date ON claims_v2(service_date);
CREATE INDEX IF NOT EXISTS idx_claims_v2_status ON claims_v2(status);
CREATE INDEX IF NOT EXISTS idx_claims_v2_primary_diagnosis ON claims_v2(primary_diagnosis);
CREATE INDEX IF NOT EXISTS idx_claims_v2_claim_type ON claims_v2(claim_type);
CREATE INDEX IF NOT EXISTS idx_claims_v2_created_at ON claims_v2(created_at);
CREATE INDEX IF NOT EXISTS idx_claims_v2_flagged ON claims_v2(flagged) WHERE flagged = true;

-- Service Lines indexes
CREATE INDEX IF NOT EXISTS idx_service_lines_claim_id ON service_lines(claim_id);
CREATE INDEX IF NOT EXISTS idx_service_lines_service_code ON service_lines(service_code);

-- Detection Results indexes
CREATE INDEX IF NOT EXISTS idx_fwa_detection_results_claim_id ON fwa_detection_results(claim_id);
CREATE INDEX IF NOT EXISTS idx_fwa_detection_results_provider_id ON fwa_detection_results(provider_id);
CREATE INDEX IF NOT EXISTS idx_fwa_detection_results_composite_score ON fwa_detection_results(composite_score);
CREATE INDEX IF NOT EXISTS idx_fwa_detection_results_composite_risk_level ON fwa_detection_results(composite_risk_level);
CREATE INDEX IF NOT EXISTS idx_fwa_detection_results_analyzed_at ON fwa_detection_results(analyzed_at);

-- Provider Detection Results indexes
CREATE INDEX IF NOT EXISTS idx_fwa_provider_detection_results_provider_id ON fwa_provider_detection_results(provider_id);
CREATE INDEX IF NOT EXISTS idx_fwa_provider_detection_results_risk_level ON fwa_provider_detection_results(risk_level);

-- Entity Timeline indexes (frequently queried for entity profiles)
CREATE INDEX IF NOT EXISTS idx_fwa_provider_timeline_provider_id ON fwa_provider_timeline(provider_id);
CREATE INDEX IF NOT EXISTS idx_fwa_provider_timeline_timestamp ON fwa_provider_timeline(timestamp);
CREATE INDEX IF NOT EXISTS idx_fwa_doctor_timeline_doctor_id ON fwa_doctor_timeline(doctor_id);
CREATE INDEX IF NOT EXISTS idx_fwa_patient_timeline_patient_id ON fwa_patient_timeline(patient_id);

-- Feature Store indexes
CREATE INDEX IF NOT EXISTS idx_fwa_feature_store_entity ON fwa_feature_store(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_provider_feature_store_provider_id ON provider_feature_store(provider_id);
CREATE INDEX IF NOT EXISTS idx_member_feature_store_member_id ON member_feature_store(member_id);

-- Enforcement indexes
CREATE INDEX IF NOT EXISTS idx_enforcement_cases_status ON enforcement_cases(status);
CREATE INDEX IF NOT EXISTS idx_enforcement_cases_provider_id ON enforcement_cases(provider_id);
CREATE INDEX IF NOT EXISTS idx_enforcement_dossiers_case_id ON enforcement_dossiers(case_id);

-- Chat indexes
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_session_id ON chat_conversations(session_id);

-- KPI indexes
CREATE INDEX IF NOT EXISTS idx_kpi_results_kpi_id ON kpi_results(kpi_id);
CREATE INDEX IF NOT EXISTS idx_kpi_results_period ON kpi_results(period);

-- High-risk entity indexes
CREATE INDEX IF NOT EXISTS idx_fwa_high_risk_providers_risk_level ON fwa_high_risk_providers(risk_level);
CREATE INDEX IF NOT EXISTS idx_fwa_high_risk_patients_risk_level ON fwa_high_risk_patients(risk_level);
CREATE INDEX IF NOT EXISTS idx_fwa_high_risk_doctors_risk_level ON fwa_high_risk_doctors(risk_level);

-- Knowledge documents indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_category ON knowledge_documents(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_status ON knowledge_documents(processing_status);
```

**Step 2: Add claims_v2 CHECK constraints to db-constraints.ts**

Add to `createDatabaseConstraints()`:

```sql
-- Claims V2 amount constraints
DO $$ BEGIN
  ALTER TABLE claims_v2
    ADD CONSTRAINT chk_claims_v2_amount CHECK (amount::numeric >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE claims_v2
    ADD CONSTRAINT chk_claims_v2_approved_amount CHECK (approved_amount IS NULL OR approved_amount::numeric >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Detection score constraints (0-1 range)
DO $$ BEGIN
  ALTER TABLE fwa_detection_results
    ADD CONSTRAINT chk_detection_results_composite CHECK (composite_score::numeric >= 0 AND composite_score::numeric <= 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE fwa_provider_detection_results
    ADD CONSTRAINT chk_provider_detection_composite CHECK (composite_score::numeric >= 0 AND composite_score::numeric <= 1);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

**Step 3: Restart server and verify indexes are created**

Run: `npx tsx server/index.ts` (check logs for "[DB] Database indexes created successfully")

**Step 4: Commit**

```bash
git add server/db-indexes.ts server/db-constraints.ts
git commit -m "perf: add missing indexes on claims_v2, detection results, timelines, and feature stores"
```

---

## Phase 3: Remove Duplicate Enum and Fix Legacy Seeder

### Task 3: Remove duplicate fwaCategoryEnum

**Files:**
- Modify: `shared/schema.ts`

**Step 1: Find all usages of both enums**

Run: `grep -rn "fwaCategoryEnum\|fwaCategoryTypeEnum" shared/ server/ client/ --include="*.ts" --include="*.tsx"`

**Step 2: Replace fwaCategoryEnum with fwaCategoryTypeEnum everywhere**

The `fwaCategoryTypeEnum` (line 568) is the original. Replace all uses of `fwaCategoryEnum` (line 1245) with `fwaCategoryTypeEnum`.

**Step 3: Delete the duplicate enum definition**

Remove the `fwaCategoryEnum` export from `shared/schema.ts` (around line 1245).

**Step 4: TypeScript check**

Run: `npx tsc --noEmit 2>&1 | grep "error TS" | wc -l`
Expected: 0 errors

**Step 5: Commit**

```bash
git add shared/schema.ts
git commit -m "fix: remove duplicate fwaCategoryEnum in favor of fwaCategoryTypeEnum"
```

### Task 4: Decouple demo seeder from fwaAnalyzedClaims

**Files:**
- Modify: `server/services/demo-data-seeder.ts`

**Step 1: Update fwaAnalyzedClaims seeder to use claims table**

In `demo-data-seeder.ts`, the seeder at lines 1287-1289 checks if `fwaAnalyzedClaims` has data, and lines 3034-3042 insert into it. Since `claims_v2` now has 5,000 claims from the BRD seeder, this old seeder is redundant.

Change the seeder to:
1. Check `claims_v2` count instead of `fwa_analyzed_claims` count
2. Skip the insert if `claims_v2` already has data
3. Remove all `fwaAnalyzedClaims` imports and inserts

**Step 2: TypeScript check**

Run: `npx tsc --noEmit 2>&1 | grep "error TS" | wc -l`
Expected: 0 errors

**Step 3: Verify server starts and seeds correctly**

Run server, check logs for `[BRD Seeder] claims_v2 already has 5000 records, skipping`

**Step 4: Commit**

```bash
git add server/services/demo-data-seeder.ts
git commit -m "refactor: decouple demo seeder from legacy fwaAnalyzedClaims table"
```

---

## Phase 4: Drop Legacy Tables (requires approval)

> **DESTRUCTIVE** — These steps drop tables. Requires explicit user approval.

### Task 5: Create backward-compatibility views, then drop legacy tables

**Files:**
- Modify: `shared/schema.ts`
- Modify: `server/db-indexes.ts` (add view creation)

**Step 1: Create a view `fwa_analyzed_claims` pointing to `claims_v2`**

Add to `createDatabaseIndexes()` (or a new `createDatabaseViews()` function):

```sql
CREATE OR REPLACE VIEW fwa_analyzed_claims AS
SELECT
  id,
  claim_number as claim_reference,
  member_id as patient_id,
  provider_id,
  primary_diagnosis as icd,
  cpt_codes[1] as cpt,
  amount as total_amount,
  status,
  service_date,
  created_at
FROM claims_v2;
```

This ensures any straggling query against `fwa_analyzed_claims` still works.

**Step 2: Create a view `claims` pointing to `claims_v2`**

```sql
CREATE OR REPLACE VIEW claims AS
SELECT * FROM claims_v2;
```

**Step 3: Remove `legacyClaims` and `fwaAnalyzedClaims` exports from schema.ts**

Delete:
- `legacyClaims` definition (line 62-100)
- `fwaAnalyzedClaims` definition (line 3749-3822)
- Associated type exports (`LegacyClaim`, `InsertLegacyClaim`, `FwaAnalyzedClaim`, `InsertFwaAnalyzedClaim`)

**Step 4: Fix any remaining imports**

Run: `grep -rn "legacyClaims\|fwaAnalyzedClaims\|LegacyClaim\|FwaAnalyzedClaim" server/ client/ shared/ --include="*.ts" --include="*.tsx"`

Fix each import.

**Step 5: TypeScript check**

Run: `npx tsc --noEmit 2>&1 | grep "error TS" | wc -l`
Expected: 0 errors

**Step 6: Commit**

```bash
git add shared/schema.ts server/db-indexes.ts server/services/demo-data-seeder.ts
git commit -m "refactor: replace legacy claims/fwa_analyzed_claims tables with views over claims_v2"
```

**Rollback:** `DROP VIEW IF EXISTS fwa_analyzed_claims; DROP VIEW IF EXISTS claims;` — the original tables are still in the DB until explicitly dropped.

### Task 6: Drop legacy tables from DB (after validation)

> **Only after confirming everything works with views in place.**

**Step 1: Rename old tables (safety net)**

```sql
ALTER TABLE claims RENAME TO _legacy_claims_backup;
ALTER TABLE fwa_analyzed_claims RENAME TO _legacy_fwa_analyzed_claims_backup;
```

**Step 2: Re-create the views (they were on the old tables)**

```sql
CREATE OR REPLACE VIEW claims AS SELECT * FROM claims_v2;
-- fwa_analyzed_claims view already points to claims_v2
```

**Step 3: Verify server still works**

Test all endpoints from Phase 1 verification.

**Step 4: Commit**

```bash
git commit -m "chore: rename legacy claims tables to _backup (safe for later drop)"
```

**Rollback:**
```sql
ALTER TABLE _legacy_claims_backup RENAME TO claims;
ALTER TABLE _legacy_fwa_analyzed_claims_backup RENAME TO fwa_analyzed_claims;
```

---

## Phase 5: Standardize PK Types

### Task 7: Migrate serial PKs to UUID text

**Tables affected:** `enforcementDossiers`, `cptEmbeddings`, `icd10Embeddings`, `embeddingImportJobs`

**Step 1: For `enforcementDossiers` only** (the embedding tables use serial for performance and that's acceptable)

In `shared/schema.ts`, change:
```typescript
// FROM:
id: serial("id").primaryKey(),
// TO:
id: text("id").primaryKey().default(sql`gen_random_uuid()`),
```

**Step 2: Migrate existing data**

```sql
ALTER TABLE enforcement_dossiers ADD COLUMN new_id TEXT DEFAULT gen_random_uuid();
UPDATE enforcement_dossiers SET new_id = gen_random_uuid() WHERE new_id IS NULL;
ALTER TABLE enforcement_dossiers DROP CONSTRAINT enforcement_dossiers_pkey;
ALTER TABLE enforcement_dossiers DROP COLUMN id;
ALTER TABLE enforcement_dossiers RENAME COLUMN new_id TO id;
ALTER TABLE enforcement_dossiers ADD PRIMARY KEY (id);
```

**Step 3: Update storage.ts**

Change `getEnforcementDossier(id: number)` → `getEnforcementDossier(id: string)` in IStorage and both implementations.

**Step 4: TypeScript check + restart server**

**Step 5: Commit**

```bash
git add shared/schema.ts server/storage.ts
git commit -m "refactor: standardize enforcementDossiers PK from serial to UUID text"
```

---

## Phase 6: Clean Up storage.ts

### Task 8: Remove duplicate getFwaFindingsByCaseId method

**Files:**
- Modify: `server/storage.ts`

**Step 1: Identify the duplicate**

Two methods exist:
- `getFwaFindingsByCaseId(caseId)`
- `getFwaAnalysisFindingsByCaseId(caseId)`

Both return `FwaAnalysisFinding[]` and query the same table.

**Step 2: Keep `getFwaAnalysisFindingsByCaseId`, deprecate `getFwaFindingsByCaseId`**

Make `getFwaFindingsByCaseId` call `getFwaAnalysisFindingsByCaseId` internally:

```typescript
async getFwaFindingsByCaseId(caseId: string): Promise<FwaAnalysisFinding[]> {
  return this.getFwaAnalysisFindingsByCaseId(caseId);
}
```

**Step 3: Find all callers and migrate them**

Run: `grep -rn "getFwaFindingsByCaseId" server/ --include="*.ts"`

Update each caller to use `getFwaAnalysisFindingsByCaseId`.

**Step 4: TypeScript check**

**Step 5: Commit**

```bash
git add server/storage.ts
git commit -m "refactor: deduplicate getFwaFindingsByCaseId in storage interface"
```

---

## Phase 7: Add Missing FK Constraints in Schema

### Task 9: Add FK constraints for entity references

**Files:**
- Modify: `server/db-constraints.ts`

These are added at runtime (not in schema.ts) to avoid circular dependency issues and to be idempotent.

**Step 1: Add FK constraints**

Add to `createDatabaseConstraints()`:

```sql
-- Timeline FK constraints
DO $$ BEGIN
  ALTER TABLE fwa_provider_timeline
    ADD CONSTRAINT fk_provider_timeline_provider FOREIGN KEY (provider_id) REFERENCES providers(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE fwa_doctor_timeline
    ADD CONSTRAINT fk_doctor_timeline_doctor FOREIGN KEY (doctor_id) REFERENCES practitioners(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE fwa_patient_timeline
    ADD CONSTRAINT fk_patient_timeline_patient FOREIGN KEY (patient_id) REFERENCES members(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Detection results FK constraints
DO $$ BEGIN
  ALTER TABLE fwa_detection_results
    ADD CONSTRAINT fk_detection_results_claim FOREIGN KEY (claim_id) REFERENCES claims_v2(id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Chat FK constraints (add CASCADE)
DO $$ BEGIN
  ALTER TABLE chat_messages
    ADD CONSTRAINT fk_chat_messages_conversation FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

> **Note:** Only add FKs where the referenced table is guaranteed to have the data. Skip FKs for `providerId` in tables like `fwaCases` where the ID might reference external systems.

**Step 2: Restart server, verify constraints are created**

**Step 3: Commit**

```bash
git add server/db-constraints.ts
git commit -m "feat: add FK constraints for timelines, detection results, and chat messages"
```

---

## Verification Checklist (Post All Phases)

| Check | Command | Expected |
|-------|---------|----------|
| TypeScript | `npx tsc --noEmit 2>&1 \| grep "error TS" \| wc -l` | 0 |
| Server starts | `npx tsx server/index.ts` | No errors, indexes/constraints created |
| Claims API | `curl -s localhost:5001/api/claims?limit=1 \| python3 -m json.tool` | JSON with claims data |
| Entity detection | `curl -s localhost:5001/api/fwa/entity-detection/provider/PRV-0001` | JSON with detection data |
| Flagged claims | `curl -s localhost:5001/api/fwa/flagged-claims` | JSON with claims array |
| No legacy raw SQL | `grep -rn "FROM claims[^_]" server/ --include="*.ts"` | 0 matches |
| No legacy imports | `grep -rn "legacyClaims\|fwaAnalyzedClaims" server/ --include="*.ts"` | 0 matches |
| Indexes exist | `psql -c "SELECT count(*) FROM pg_indexes WHERE tablename='claims_v2'"` | 9+ |

---

## Files Changed Summary

| File | Phase | Changes |
|------|-------|---------|
| `server/services/chat-data-agent.ts` | 1 | `FROM claims` → `FROM claims_v2` |
| `server/routes/fwa-routes.ts` | 1 | `FROM claims` → `FROM claims_v2` |
| `server/routes/etl-routes.ts` | 1 | `FROM claims` → `FROM claims_v2` |
| `server/services/sql-guard.ts` | 1 | Add `claims_v2` to allowlist |
| `server/db-indexes.ts` | 2, 5 | Add 35+ indexes, add views |
| `server/db-constraints.ts` | 2, 7 | Add CHECK + FK constraints |
| `shared/schema.ts` | 3, 5, 7 | Remove duplicate enum, remove legacy tables, fix PK |
| `server/services/demo-data-seeder.ts` | 4 | Remove fwaAnalyzedClaims dependency |
| `server/storage.ts` | 6, 7 | Deduplicate methods, fix PK types |

## Rollback Strategy

Each phase is independently rollback-safe:
- **Phase 1-3**: Pure code changes, revert with `git revert`
- **Phase 4**: Legacy tables renamed to `_backup`, restore with `ALTER TABLE RENAME`
- **Phase 5**: PK migration has explicit rollback SQL
- **Phase 6-7**: Pure code changes + runtime constraints (idempotent)
