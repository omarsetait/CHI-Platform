# High-Risk Entities Improvement Plan

## Context

The High-Risk Entities page is a key FWA investigation surface. Currently it's a single page with 3 tabs (Providers/Patients/Doctors), basic metric cards, client-side filtering limited to 20 entities, and a right-side drill-down sheet with minimal detection insight. The backend already has rich data from 5 detection engines, entity-level detection results, timeline tracking, 360-degree views, and audit report generation — but the UI barely surfaces any of it. This plan closes that gap.

## What We're Building

1. **Main list page enhancements** — server-side pagination, sorting, enhanced filters, FWA metrics, detection reasoning in the side panel, bulk export
2. **New unified entity profile page** — deep-dive page per entity with 5-engine radar, timeline, flagged claims, peer comparison, investigation workflow
3. **Export capabilities** — single-entity PDF audit reports + bulk filtered Excel/CSV export

---

## Phase 1: Main List Page — Pagination, Filters & FWA Metrics

### 1A. Backend: Add server-side pagination to list endpoints

**Files to modify:** [fwa-routes.ts](server/routes/fwa-routes.ts) (lines ~1376, ~2564, ~2788)

Currently all 3 endpoints (`GET /api/fwa/high-risk-providers`, `high-risk-patients`, `high-risk-doctors`) have hardcoded `LIMIT 20`. Change to:

- Accept query params: `page`, `pageSize`, `sortBy`, `sortOrder`, `search`, `riskTier`, `minScore`, `maxScore`, `dateFrom`, `dateTo`
- Replace `LIMIT 20` with `LIMIT $pageSize OFFSET $offset`
- Add `COUNT(*)` query for total
- Return `{ data: [...], total, page, pageSize }`
- Move filtering from client to server (search, region, specialty, risk tier)

### 1B. Frontend: Wire up pagination and enhanced filters

**File to modify:** [high-risk-entities.tsx](client/src/pages/fwa/high-risk-entities.tsx)

- Replace client-side `useMemo` filtering (lines 418-442) with server-side query params in `useQuery`
- Add `PaginationControls` below the table (page buttons + page-size selector) — use shadcn pagination pattern
- Add `SortableTableHeader` — clickable column headers with ascending/descending indicators
- Enhance `FilterBar` component: add date range picker, risk score range slider, detection method dropdown
- Add FWA-specific metric cards: **Total Claim Amount**, **Total Flagged (Exposure)**, **Cost Per Member** alongside existing metrics
- Add "Export" button in the header area that opens the bulk export dialog

### 1C. Build rich side panels for all 3 entity types

**File to modify:** [high-risk-entities.tsx](client/src/pages/fwa/high-risk-entities.tsx)

**Current state:** Only Providers have a drill-down panel (`ProviderDrillDown`, line 164). Patients and Doctors have NO side panel — they just link out to 360 views. All 3 need rich panels.

Each panel follows a shared 2-section layout inside a scrollable `Sheet`, with entity-type-specific KPIs. Data comes from the entity detection endpoint (`GET /api/fwa/entity-detection/{type}/{id}`) and the list data already loaded.

#### Provider Panel (enhance existing `ProviderDrillDown`)

**Section 1 — Risk & Detection:**
- Risk score gauge (keep existing)
- 5-engine score mini progress bars (colored by score: red/orange/yellow/green)
- Primary detection method highlighted badge
- Top 3 matched findings with severity badges (from `ruleEngineFindings.matchedRules`)
- Severity distribution mini `PieChart` (critical/high/medium/low flagged claims)

**Section 2 — Claims & Billing KPIs:**
- KPI metric row (3 compact cards):
  - **CPM vs Peer**: `claimsPerMonth` vs `cpmPeerAverage` with deviation indicator
  - **Denial Rate**: `denialRate` as percentage with color coding
  - **Flagged Ratio**: `flaggedClaims / totalClaims` as percentage
- Top 5 procedures by frequency — horizontal mini `BarChart` (from `aggregatedMetrics.topProcedureCodes`)
- Total exposure amount (bold, formatted)
- "View Full Profile" button → `/fwa/high-risk-entities/provider/{id}`

**Data sources (all existing):**
- List item data (already loaded in parent)
- `GET /api/fwa/entity-detection/provider/{id}` — engine scores + findings

#### Patient Panel (NEW — `PatientDrillDown` component)

**Section 1 — Behavioral Flags:**
- Risk score gauge
- KPI metric row (3 compact cards):
  - **Unique Providers**: count with doctor-shopping threshold indicator (red if >=3)
  - **Visit Frequency**: visits per month (from `totalClaims` / months since first claim)
  - **Geographic Spread**: number of cities (from detection findings `geographicAnalysis`)
- ER utilization rate mini gauge (from `patient360.behavioralPatterns.erUtilizationRate`)
- Provider switching rate badge (from `patient360.behavioralPatterns.providerSwitchingRate`)

**Section 2 — Claims Breakdown:**
- KPI metric row: Total Amount | Flagged Ratio | Avg Claim
- Diagnosis distribution mini `PieChart` (top 5 from `aggregatedMetrics.topDiagnosisCodes`)
- Top procedures by frequency (mini bar chart)
- Reasons list with badges
- "View Full Profile" button → `/fwa/high-risk-entities/patient/{id}`

**Data sources:**
- List item data
- `GET /api/fwa/entity-detection/patient/{id}` — engine scores + findings + utilization patterns

#### Doctor Panel (NEW — `DoctorDrillDown` component)

**Section 1 — Practice Patterns:**
- Risk score gauge
- KPI metric row (3 compact cards):
  - **Patients/Day**: from `doctor360.practicePatterns.avgPatientsPerDay`
  - **Claims/Patient**: from `doctor360.practicePatterns.avgClaimPerPatient`
  - **Prescribing Ratio**: controlled substance ratio (from `doctor360.practicePatterns.prescribingHabits`)
- Procedure frequency vs specialty peers — mini `BarChart` (top 5, entity vs peer side-by-side)

**Section 2 — Financial Signals:**
- KPI metric row: Avg Claim vs Peer (with deviation %) | Denial Rate | Flagged Ratio
- Total exposure amount
- Top 3 matched findings with severity badges
- Reasons list with badges
- "View Full Profile" button → `/fwa/high-risk-entities/doctor/{id}`

**Data sources:**
- List item data
- `GET /api/fwa/entity-detection/doctor/{id}` — engine scores + findings

#### Shared panel component pattern

Extract a reusable `EntityPanelSection` wrapper for consistent styling:
- Section divider with label
- Glass morphism mini card styling for KPI rows
- Mini chart containers at fixed heights (120px for pie, 100px for bar)
- All using Recharts `ResponsiveContainer` at compact sizes

---

## Phase 2: Unified Entity Profile Page

### 2A. Create the entity profile page

**New file:** `client/src/pages/fwa/entity-profile.tsx`

A single page component that receives `entityType` ("provider" | "doctor" | "patient") and `entityId` from the route. Uses conditional rendering for type-specific sections.

**Reference pattern:** [provider-profile.tsx](client/src/pages/fwa/provider-profile.tsx) — already has all the sections we need (5-engine detection, timeline, claims table, enforcement history, PDF export). We'll extract and generalize its patterns.

**Routes to register in [App.tsx](client/src/App.tsx) (line ~206):**
```
/fwa/high-risk-entities/provider/:entityId
/fwa/high-risk-entities/doctor/:entityId
/fwa/high-risk-entities/patient/:entityId
```

### 2B. Page layout and sections

All new components go in `client/src/components/fwa/entity-profile/`.

The profile page is an **expanded version of the side panel KPIs** with full-size charts plus additional deep-dive sections. The layout uses a responsive grid that adapts from 1-column (mobile) to 2-column (desktop).

#### Row 1: Entity Summary Header (`entity-summary-header.tsx`) — full width
- Back button to list page
- Entity name, type badge, ID, specialty/organization
- Risk score gauge (reuse `RiskScoreGauge` from high-risk-entities.tsx)
- Quick stats row: total claims, flagged claims, exposure, risk level badge
- Action buttons: Export PDF, Escalate, Assign Investigator

#### Row 2: Detection Overview — 2 columns
**Left column:** 5-Engine Detection Radar (`detection-radar-chart.tsx`)
- Full-size Recharts `RadarChart` with 5 axes: Rule Engine, Statistical, Unsupervised, RAG/LLM, Semantic
- Each axis 0-100, purple fill for entity scores
- Below the radar: expandable accordion per engine showing detailed findings
- **Data source:** `GET /api/fwa/entity-detection/{entityType}/{entityId}` (existing endpoint)
- **Findings per engine:**
  - Rule Engine: matched rules with severity, hit count, explanation
  - Statistical: anomaly patterns with z-scores, peer comparison
  - Unsupervised: cluster assignments with anomaly scores
  - RAG/LLM: insights with confidence and source
  - Semantic: ICD/CPT pair matches with similarity scores

**Right column:** Risk Severity Overview (`severity-overview-card.tsx`)
- Severity distribution `PieChart` — full-size version of panel's mini pie (critical/high/medium/low flagged claims, colored segments)
- Risk trend sparkline showing score direction over last 5 batches
- Key risk indicator badges: primary detection method, highest-scoring engine, trend direction

#### Row 3: KPI Cards — 4-column grid (`entity-kpi-cards.tsx`)

Entity-type-specific metrics, each as a compact card with value, label, trend indicator, and peer comparison subtitle.

**Provider KPIs:**
| CPM (Claims/Month) | Avg Claim Amount | Denial Rate | Flagged Ratio |
|---|---|---|---|
| `claimsPerMonth` vs `cpmPeerAverage` | `avgClaimAmount` vs peer avg | `denialRate` % | `flaggedClaims/totalClaims` % |
| Trend: `cpmTrend` | Deviation from peer | Color-coded gauge | Red if > threshold |

**Patient KPIs:**
| Unique Providers | Visit Frequency/Mo | ER Utilization Rate | Geographic Spread |
|---|---|---|---|
| Doctor shopping count | Claims per month | `erUtilizationRate` % | Number of cities |
| Red if >= 3 providers | vs cohort average | vs cohort average | Red if >= 4 cities |

**Doctor KPIs:**
| Patients/Day | Claims/Patient | Prescribing Ratio | Denial Rate |
|---|---|---|---|
| `avgPatientsPerDay` | `avgClaimPerPatient` | Controlled substance % | `denialRate` % |
| vs specialty peer avg | vs specialty peer avg | vs specialty peer avg | vs peer avg |

#### Row 4: Trend Charts — 2 columns

**Left column:** Monthly Trends (`monthly-trends-chart.tsx`)
- Full-size Recharts `LineChart` showing KPI values over time
- Multiple lines: risk score, claims amount, flagged ratio (each with own Y-axis scale)
- Entity-type-specific lines:
  - Provider: CPM trend, denial rate trend, exposure trend
  - Patient: visit frequency trend, unique providers trend, total amount trend
  - Doctor: patients/day trend, claims/patient trend, prescribing ratio trend
- **Data source:** `GET /api/fwa/timeline/{entityType}/{entityId}` (existing)

**Right column:** Peer Benchmarking (`peer-comparison-chart.tsx`)
- Full-size Recharts `BarChart` comparing entity (purple bars) vs peer group (gray bars)
- Entity-type-specific metrics:
  - Provider: Claims/Mo, Denial %, Avg Claim, Cost/Member, Flagged %
  - Patient: Claims/Mo, Providers Visited, Avg Claim, ER Rate
  - Doctor: Patients/Day, Claims/Patient, Avg Claim, Denial %, Prescribing Ratio
- **Data source:** 360-view tables (`provider360.specialtyBenchmarks`, `doctor360.peerComparison`)

#### Row 5: Deep-Dive Tables — 2 columns

**Left column:** Top Procedures & Diagnoses (`procedure-diagnosis-table.tsx`)
- Tabbed table: "Procedures" | "Diagnoses"
- Procedures tab columns: CPT Code, Description, Frequency, Amount, Peer Avg Amount, Deviation %
- Diagnoses tab columns: ICD Code, Description, Frequency, Claims Amount
- Sorted by deviation from peer (highest deviation first)
- Color-coded deviation column (red for high deviation)
- **Data source:** `aggregatedMetrics.topProcedureCodes`, `topDiagnosisCodes` from entity detection results; `billingPatterns.topCptCodes` from 360 view for peer comparison

**Right column:** Flagged Claims Table (`flagged-claims-table.tsx`)
- Sortable table: Claim ID, Service Date, Amount, Composite Score, Risk Level, Primary Method, Action
- Click to expand row → method-level score breakdown (5 engine scores as mini bars)
- Pagination for large claim lists
- **Data source for providers:** `GET /api/fwa/providers/{id}/profile` → `.claims` (existing)
- **New endpoints for doctors/patients** (see Phase 2C)

#### Row 6: Investigation Panel — full width (`investigation-panel.tsx`)
- Status badge with dropdown (open, under_review, escalated, cleared, closed)
- Assigned investigator field
- Notes timeline (chronological list with author, timestamp, type badges)
- Add note form (textarea + submit)
- "Escalate to Enforcement" button → creates enforcement case via existing `POST /api/fwa/enforcement-workflow`
- **New DB table + endpoints needed** (see Phase 3)

### 2C. New backend endpoints needed

**File to modify:** [fwa-routes.ts](server/routes/fwa-routes.ts)

1. `GET /api/fwa/doctors/:doctorId/profile` — Mirrors existing `/api/fwa/providers/:providerId/profile`. Returns doctor360 data, flagged claims for this doctor, rule hit summary.
2. `GET /api/fwa/patients/:patientId/profile` — Returns patient360 data, claims summary, provider/doctor associations.
3. `POST /api/fwa/doctors/:doctorId/audit-report` — Mirrors existing provider audit report (line ~1987)
4. `POST /api/fwa/patients/:patientId/audit-report` — Same for patients

---

## Phase 3: Investigation Workflow

### 3A. Database schema

**File to modify:** [schema.ts](shared/schema.ts)

New table `fwa_entity_investigation_notes`:
```
id (text PK, gen_random_uuid)
entityType (text, "provider" | "doctor" | "patient")
entityId (text)
investigationStatus (text, "open" | "under_review" | "escalated" | "cleared" | "closed")
assignedInvestigator (text, nullable)
noteType (text, "general" | "status_change" | "assignment" | "escalation")
content (text)
author (text)
linkedEnforcementCaseId (text, nullable)
metadata (jsonb)
createdAt (timestamp)
updatedAt (timestamp)
```

This is intentionally lightweight. Full enforcement actions use existing `enforcementCases` table. Investigation notes track the pre-enforcement review process.

### 3B. Investigation CRUD endpoints

**File to modify:** [fwa-routes.ts](server/routes/fwa-routes.ts)

- `GET /api/fwa/investigation-notes/:entityType/:entityId` — Get all notes + current status
- `POST /api/fwa/investigation-notes` — Create note (body: entityType, entityId, content, author, noteType, statusChange?)
- `PATCH /api/fwa/investigation-notes/:noteId` — Update note

---

## Phase 4: Export & Reports

### 4A. Single entity PDF export

**In entity profile page:** Add "Download Report" button that:
1. Calls `POST /api/fwa/{entityType}s/{entityId}/audit-report` to get structured report data
2. Uses `html2pdf.js` to convert the report section to PDF (same pattern as [provider-profile.tsx](client/src/pages/fwa/provider-profile.tsx) lines ~1623-1657)

For doctors and patients, create the two new audit report endpoints (Phase 2C).

### 4B. Bulk list export

**New component:** `client/src/components/fwa/entity-list/bulk-export-dialog.tsx`

- Dialog showing current filters and entity count
- Format selection: CSV or Excel
- Triggers download via new endpoint

**New endpoint:** `GET /api/fwa/high-risk-entities/export`
- Accepts same filter params as list endpoints + `format` ("csv" | "xlsx") + `entityType`
- Uses `xlsx` library (already in project) for Excel generation
- Returns downloadable file

---

## Implementation Order

| Step | Description | Depends On |
|------|-------------|------------|
| 1 | Backend pagination for 3 list endpoints | — |
| 2 | Frontend pagination, sorting, enhanced filters | Step 1 |
| 3 | FWA metric cards enhancement on list page | Step 1 |
| 4 | Provider side panel enrichment (detection scores, KPIs, charts) | Step 1 |
| 5 | Patient side panel (NEW — behavioral flags, claims breakdown) | Step 1 |
| 6 | Doctor side panel (NEW — practice patterns, financial signals) | Step 1 |
| 7 | Entity profile page template + routing | — |
| 8 | Entity KPI cards component (type-specific metrics) | Step 7 |
| 9 | Detection radar chart + engine breakdown accordion | Step 7 |
| 10 | Severity overview card (pie chart + risk trend) | Step 7 |
| 11 | Monthly trends chart component | Step 7 |
| 12 | Peer comparison chart component | Step 7 |
| 13 | Procedure/diagnosis deep-dive table | Step 7 |
| 14 | Flagged claims table component | Step 7, needs doctor/patient profile endpoints |
| 15 | Doctor/patient profile + audit report backend endpoints | — |
| 16 | Investigation notes schema + CRUD endpoints | — |
| 17 | Investigation panel component | Step 7, Step 16 |
| 18 | Single entity PDF export | Step 7, Step 15 |
| 19 | Bulk export dialog + backend endpoint | Step 1 |

**Parallelization:**
- Steps 1, 7, 15, 16 can start in parallel (no dependencies)
- Steps 4, 5, 6 can be parallelized after Step 1
- Steps 8-13 can be parallelized after Step 7
- Steps 18, 19 are last (depend on profile page + backend)

---

## Key Files Reference

| File | Role |
|------|------|
| [high-risk-entities.tsx](client/src/pages/fwa/high-risk-entities.tsx) | Main list page — modify: pagination, 3 side panels, filters |
| [provider-profile.tsx](client/src/pages/fwa/provider-profile.tsx) | Reference pattern for entity profile + chart components |
| [fwa-routes.ts](server/routes/fwa-routes.ts) | All FWA API endpoints (modify) |
| [schema.ts](shared/schema.ts) | DB schema (add investigation notes table) |
| [App.tsx](client/src/App.tsx) | Router (add 3 new routes at line ~206) |
| [risk-utils.ts](client/src/lib/risk-utils.ts) | Risk badge/color utilities (reuse) |
| [grid.ts](client/src/lib/grid.ts) | Layout grid constants (reuse) |
| [format.ts](client/src/lib/format.ts) | Currency formatting (reuse) |
| [kpi-dashboard.tsx](client/src/pages/fwa/kpi-dashboard.tsx) | Reference for PieChart + BarChart patterns |

## New Files to Create

```
client/src/pages/fwa/
  entity-profile.tsx                        # Unified profile page

client/src/components/fwa/entity-profile/
  entity-summary-header.tsx                 # Header with risk gauge + actions
  entity-kpi-cards.tsx                      # 4-column KPI grid (type-specific)
  detection-radar-chart.tsx                 # 5-engine RadarChart + accordion
  severity-overview-card.tsx                # PieChart + risk trend sparkline
  monthly-trends-chart.tsx                  # Multi-line trend LineChart
  peer-comparison-chart.tsx                 # Entity vs peer BarChart
  procedure-diagnosis-table.tsx             # Tabbed CPT/ICD deep-dive table
  flagged-claims-table.tsx                  # Expandable flagged claims table
  investigation-panel.tsx                   # Status, notes, escalation

client/src/components/fwa/entity-list/
  pagination-controls.tsx                   # Page nav + page size
  enhanced-filter-bar.tsx                   # Date range, score range, method
  bulk-export-dialog.tsx                    # CSV/Excel export dialog
```

## Styling Conventions to Follow

- Glass morphism: `bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl border-white/20`
- Purple FWA accent: `text-purple-600 dark:text-purple-400`, `bg-purple-600 hover:bg-purple-700`
- Risk colors: Critical=red, High=orange, Medium=amber, Low=green
- Animations: `motion.div` with `initial={{ opacity: 0, y: 20 }}`
- Charts: Recharts with `ResponsiveContainer`
- Data fetching: `useQuery` with `queryKey: ["/api/path", ...params]`

## Verification

1. List page: Verify pagination works with >20 entities, filters narrow results, sorting changes order
2. Side panel: Verify detection reasoning loads and displays per-engine scores
3. Entity profile: Navigate from list → panel → full profile for each entity type
4. Radar chart: Verify all 5 engine scores render, accordion expands per engine
5. Timeline: Verify chart renders with real timeline data
6. Claims table: Verify sortable, expandable rows show method scores
7. Investigation: Create note, change status, assign investigator, escalate to enforcement
8. PDF export: Download report for each entity type, verify content
9. Bulk export: Export filtered list as CSV and Excel, verify data matches filters
