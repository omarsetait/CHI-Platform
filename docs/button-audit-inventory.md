# Complete Button Audit Inventory

**Audit Date:** January 2026  
**Platform:** Fraud, Waste & Abuse Detection Platform

---

## Executive Summary

This audit identified **47 inactive or placeholder buttons** across the platform. Of these:
- **12 HIGH priority** - Critical user workflow blockers
- **18 MEDIUM priority** - Important but workarounds exist
- **17 LOW priority** - Nice-to-have or rarely used

---

## Phase 1: Complete Inventory

### Pre-Authorization Module (7 inactive buttons)

| # | Button Label | Location | Current Behavior | User Persona | Priority |
|---|--------------|----------|-----------------|--------------|----------|
| 1 | Import Batch | `/pre-auth/claims` | No onClick handler | Claims Reviewer | HIGH |
| 2 | Enable/Disable Rule Toggle | `/pre-auth/policy-rules` | Disabled attribute | Admin | MEDIUM |
| 3 | Preview Document | `/pre-auth/knowledge-base` | Opens empty modal | Reviewer | MEDIUM |
| 4 | Delete Document | `/pre-auth/knowledge-base` | Shows toast only | Admin | MEDIUM |
| 5 | Export Rules | `/pre-auth/policy-rules` | Missing | Admin | LOW |
| 6 | Bulk Actions Dropdown | `/pre-auth/claims` | No dropdown content | Reviewer | MEDIUM |
| 7 | Download Report | `/pre-auth/analytics` | Missing | Manager | MEDIUM |

### FWA Module (11 inactive buttons)

| # | Button Label | Location | Current Behavior | User Persona | Priority |
|---|--------------|----------|-----------------|--------------|----------|
| 8 | Save Changes (Agent Config) | `/fwa/agent-config` | Only sets state, no API call | Admin | HIGH |
| 9 | Export Report | `/fwa/case-detail` | Creates blob but no download | Investigator | MEDIUM |
| 10 | Assign to User | `/fwa/case-management` | Opens empty modal | Supervisor | HIGH |
| 11 | Bulk Assign | `/fwa/case-management` | No handler | Supervisor | MEDIUM |
| 12 | Export Cases | `/fwa/case-management` | No handler | Manager | MEDIUM |
| 13 | Create Alert Rule | `/fwa/settings` | No handler | Admin | MEDIUM |
| 14 | Run Batch Analysis | `/fwa/batch-upload` | Navigates but no processing | Analyst | MEDIUM |
| 15 | Generate Summary | `/fwa/kpi-dashboard` | Missing | Manager | LOW |
| 16 | Filter by Behavior Type | `/fwa/fwa-behaviors` | Shows options but no filter | Analyst | LOW |
| 17 | Add to Watch List | `/fwa/providers` | Toast only | Investigator | MEDIUM |
| 18 | Request Medical Records | `/fwa/patients` | Toast only | Investigator | MEDIUM |

### Provider Relations Module (16 inactive buttons)

| # | Button Label | Location | Current Behavior | User Persona | Priority |
|---|--------------|----------|-----------------|--------------|----------|
| 19 | New Communication | `/provider-relations/communications` | No onClick | Account Manager | HIGH |
| 20 | New Contract | `/provider-relations/contracts` | No onClick | Contract Manager | HIGH |
| 21 | Add Provider | `/provider-relations/providers` | No onClick | Admin | HIGH |
| 22 | Export Providers | `/provider-relations/providers` | No handler | Manager | MEDIUM |
| 23 | New Settlement | `/provider-relations/settlement` | No handler | Finance | HIGH |
| 24 | Export Settlement | `/provider-relations/settlement` | No handler | Finance | MEDIUM |
| 25 | Save Settings | `/provider-relations/settings` | No onClick | Admin | MEDIUM |
| 26 | Export PDF (Dream Report) | `/provider-relations/dream-report` | Uses window.print() | Analyst | MEDIUM |
| 27 | Schedule Session | `/provider-relations/sessions` | Simulated only | Account Manager | HIGH |
| 28 | Mark Session Complete | `/provider-relations/sessions` | Simulated only | Account Manager | MEDIUM |
| 29 | Update Session Notes | `/provider-relations/sessions` | Simulated only | Account Manager | MEDIUM |
| 30 | Lock Evidence Pack | `/provider-relations/evidence-packs` | Simulated only | Investigator | MEDIUM |
| 31 | Mark as Presented | `/provider-relations/evidence-packs` | Simulated only | Investigator | LOW |
| 32 | Advance Settlement Status | `/provider-relations/settlement` | Simulated only | Finance | HIGH |
| 33 | View Evidence Pack (from settlement) | `/provider-relations/settlement` | Navigates to 404 | Finance | MEDIUM |
| 34 | Create Evidence Pack (from settlement) | `/provider-relations/settlement` | Opens empty form | Finance | MEDIUM |

### Claims & Governance Module (8 inactive buttons)

| # | Button Label | Location | Current Behavior | User Persona | Priority |
|---|--------------|----------|-----------------|--------------|----------|
| 35 | New Claim Rule | `/claims-governance/rule-studio` | Opens form, no save | Admin | HIGH |
| 36 | Test Rule | `/claims-governance/rule-studio` | Simulated output | Admin | MEDIUM |
| 37 | Bulk Approve | `/claims-governance/adjudication/claims` | No handler | Supervisor | MEDIUM |
| 38 | Export QA Report | `/claims-governance/qa-validation` | No handler | QA Manager | MEDIUM |
| 39 | Add Exception | `/claims-governance/policy-rules` | Opens empty modal | Admin | LOW |
| 40 | Sync Rules | `/claims-governance/settings` | Toast only | Admin | LOW |
| 41 | Run Validation Batch | `/claims-governance/qa-validation` | Simulated | QA Manager | MEDIUM |
| 42 | Export Claims | `/claims-governance/adjudication/claims` | No handler | Manager | LOW |

### Shared Components (5 inactive buttons)

| # | Button Label | Location | Current Behavior | User Persona | Priority |
|---|--------------|----------|-----------------|--------------|----------|
| 43 | View Full Report | `AgenticWorkflowModal` | Opens empty tab | Analyst | LOW |
| 44 | Download as CSV | `DetailPanel` | No handler | All Users | MEDIUM |
| 45 | Share Report | `DetailPanel` | No handler | All Users | LOW |
| 46 | Schedule Refresh | `FilterBar` | No handler | Power User | LOW |
| 47 | Save Filter Preset | `FilterBar` | No handler | Power User | LOW |

---

## Phase 2: User Journey Analysis

### HIGH Priority Items (12 buttons)

#### 1. Import Batch (Pre-Auth Claims)
- **User Journey:** Reviewer receives batch of claims from external system, needs to import for processing
- **Expected Behavior:** Open file picker → validate format → preview claims → import to queue
- **Problem Solved:** Manual data entry for bulk claims
- **Workflow Fit:** Entry point for batch processing workflow

#### 2. Assign to User (FWA Case Management)
- **User Journey:** Supervisor reviews new cases, assigns to investigators
- **Expected Behavior:** Select user from dropdown → set priority → add notes → assign
- **Problem Solved:** Case distribution and workload management
- **Workflow Fit:** Critical for team coordination

#### 3. New Communication (Provider Relations)
- **User Journey:** Account manager needs to log call/email with provider
- **Expected Behavior:** Select provider → choose type → enter details → save
- **Problem Solved:** Track all provider interactions
- **Workflow Fit:** Core provider relationship management

#### 4. New Contract (Provider Relations)
- **User Journey:** Contract manager creates new provider agreement
- **Expected Behavior:** Select provider → enter terms → set dates → upload docs → save
- **Problem Solved:** Contract lifecycle management
- **Workflow Fit:** Foundation for provider network

#### 5. Add Provider (Provider Relations)
- **User Journey:** Admin adds new provider to network
- **Expected Behavior:** Enter NPI → validate → add details → set network tier → save
- **Problem Solved:** Provider onboarding
- **Workflow Fit:** Entry point for provider management

#### 6. New Settlement (Provider Relations)
- **User Journey:** Finance creates settlement proposal after FWA findings
- **Expected Behavior:** Select provider → link evidence packs → set amount → create
- **Problem Solved:** Recovery tracking
- **Workflow Fit:** End-to-end FWA recovery

#### 7. Schedule Session (Provider Relations)
- **User Journey:** Account manager schedules negotiation meeting
- **Expected Behavior:** Select provider → pick date/time → add agenda → invite → save
- **Problem Solved:** Meeting coordination
- **Workflow Fit:** Settlement negotiation process

#### 8. Advance Settlement Status (Provider Relations)
- **User Journey:** Finance moves settlement through workflow stages
- **Expected Behavior:** Validate requirements → update status → log change → notify
- **Problem Solved:** Settlement lifecycle tracking
- **Workflow Fit:** Core settlement workflow

#### 9. Save Changes (FWA Agent Config)
- **User Journey:** Admin configures AI agent parameters
- **Expected Behavior:** Validate config → save to DB → reload agent
- **Problem Solved:** AI behavior customization
- **Workflow Fit:** System administration

#### 10. New Claim Rule (Claims Governance)
- **User Journey:** Admin creates new adjudication rule
- **Expected Behavior:** Define conditions → set actions → test → deploy
- **Problem Solved:** Automated claims processing
- **Workflow Fit:** Rule-based automation

#### 11. Enable/Disable Rule Toggle (Pre-Auth Policy Rules)
- **User Journey:** Admin activates/deactivates policy rules
- **Expected Behavior:** Toggle state → confirm → apply to engine
- **Problem Solved:** Policy management
- **Workflow Fit:** Pre-auth configuration

#### 12. Bulk Actions Dropdown (Pre-Auth Claims)
- **User Journey:** Reviewer selects multiple claims for batch action
- **Expected Behavior:** Select claims → choose action → confirm → execute
- **Problem Solved:** Efficiency for high-volume processing
- **Workflow Fit:** Claims queue management

---

## Phase 3: Feature Specifications (Top 10)

### Feature 1: New Communication Dialog
**Priority Score:** 95/100

**UI Design:**
- Dialog with provider search/select
- Communication type dropdown (Call, Email, In-Person, Letter)
- Direction toggle (Inbound/Outbound)
- Subject line and rich text body
- Outcome dropdown (Resolved, Follow-up Needed, Escalate)
- Next action date picker

**API Endpoint:**
```
POST /api/provider-relations/communications
{
  providerId: string,
  type: "call" | "email" | "in_person" | "letter",
  direction: "inbound" | "outbound",
  subject: string,
  body: string,
  outcome: string,
  nextActionDate?: string
}
```

**Database:** Uses existing `provider_communications` table

**Effort:** 4 hours

---

### Feature 2: New Contract Dialog
**Priority Score:** 92/100

**UI Design:**
- Multi-step wizard: Provider → Terms → Documents → Review
- Contract type selection (Standard, Custom, Amendment)
- Effective date range
- Fee schedule inputs
- Document upload area
- Electronic signature checkbox

**API Endpoint:**
```
POST /api/provider-relations/contracts
{
  providerId: string,
  contractType: string,
  effectiveDate: string,
  terminationDate: string,
  terms: object,
  documents: string[]
}
```

**Database:** Uses existing `provider_contracts` table

**Effort:** 8 hours

---

### Feature 3: Add Provider Dialog
**Priority Score:** 90/100

**UI Design:**
- NPI lookup with auto-fill from NPPES
- Manual entry fallback
- Fields: Name, NPI, Address, Specialty, Network Tier
- Contact information section
- Tax ID for settlements

**API Endpoint:**
```
POST /api/provider-relations/providers
{
  npi: string,
  name: string,
  specialty: string,
  networkTier: string,
  address: object,
  contacts: object[]
}
```

**Database:** Uses existing `providers` table

**Effort:** 6 hours

---

### Feature 4: Import Batch (Pre-Auth)
**Priority Score:** 88/100

**UI Design:**
- File drop zone (CSV, JSON, X12 837)
- Column mapping interface
- Preview with validation errors
- Import progress bar
- Summary report

**API Endpoint:**
```
POST /api/pre-auth/claims/batch
Content-Type: multipart/form-data
{
  file: File,
  mappings: object
}
```

**Database:** Bulk insert to `pre_auth_claims`

**Effort:** 10 hours

---

### Feature 5: Assign to User (FWA)
**Priority Score:** 85/100

**UI Design:**
- User search dropdown
- Priority selector
- Assignment notes textarea
- Due date picker
- Notify checkbox

**API Endpoint:**
```
PATCH /api/fwa/cases/:id/assign
{
  assigneeId: number,
  priority: string,
  notes: string,
  dueDate: string
}
```

**Database:** Update `fwa_cases` table

**Effort:** 4 hours

---

## Phase 4: Prioritization Matrix

| Button | User Impact | Complexity | Dependencies | Frequency | Score |
|--------|-------------|------------|--------------|-----------|-------|
| New Communication | HIGH | Simple | None | Daily | 95 |
| New Contract | HIGH | Medium | None | Weekly | 92 |
| Add Provider | HIGH | Medium | NPI lookup | Weekly | 90 |
| Import Batch | HIGH | Complex | Parser | Daily | 88 |
| Assign to User | HIGH | Simple | None | Daily | 85 |
| Schedule Session | HIGH | Medium | Calendar | Weekly | 82 |
| New Settlement | HIGH | Medium | Evidence | Weekly | 80 |
| Save Agent Config | MEDIUM | Simple | None | Monthly | 75 |
| New Claim Rule | MEDIUM | Complex | Rule engine | Monthly | 70 |
| Advance Settlement | MEDIUM | Simple | Workflow | Weekly | 68 |

---

## Phase 5: Quick Wins (< 2 hours each)

1. **Enable Policy Rule Toggle** - Wire up existing API (1 hour)
2. **Save Agent Config** - Add API call to handler (1 hour)
3. **Export PDF** - Use proper PDF library (1.5 hours)
4. **Download CSV** - Add download logic (1 hour)
5. **Assign to User** - Simple PATCH endpoint (2 hours)

---

## Phase 6: Implementation Roadmap

### Sprint 1 (Quick Wins)
- Enable Policy Rule Toggle
- Save Agent Config
- Assign to User

### Sprint 2 (Provider Relations Core)
- New Communication Dialog
- Add Provider Dialog
- New Contract Dialog

### Sprint 3 (Workflow Completion)
- Schedule Session (full implementation)
- Advance Settlement Status
- New Settlement

### Sprint 4 (Batch Processing)
- Import Batch (Pre-Auth)
- Bulk Actions
- Export features

---

## Appendix: Files to Modify

| Feature | Files |
|---------|-------|
| New Communication | `communications.tsx`, `server/routes.ts` |
| New Contract | `contracts.tsx`, `server/routes.ts` |
| Add Provider | `providers.tsx`, `server/routes.ts` |
| Import Batch | `claims.tsx`, `batch-upload.tsx`, `server/routes.ts` |
| Assign to User | `case-management.tsx`, `server/routes.ts` |
