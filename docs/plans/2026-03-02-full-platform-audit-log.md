# CHI-Platform Full Audit Log

> **Date:** 2026-03-02 | **Branch:** `chi-platform-refactor` | **Server:** `http://localhost:5001`
> **Scope:** All 87 client routes, 121 page files, 55 API endpoints tested
> **Method:** Automated Playwright browser snapshots + curl API testing

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Infrastructure Issues](#infrastructure-issues)
3. [FWA Pillar Audit](#fwa-pillar-audit)
4. [Intelligence Pillar Audit](#intelligence-pillar-audit)
5. [Business Pillar Audit](#business-pillar-audit)
6. [Members Pillar Audit](#members-pillar-audit)
7. [Pre-Auth Module Audit](#pre-auth-module-audit)
8. [API Endpoint Audit](#api-endpoint-audit)
9. [Prioritized Fix List](#prioritized-fix-list)

---

## Executive Summary

| Category | Total | Pass | Fail | Partial |
|----------|-------|------|------|---------|
| FWA Pages | 32 | 6 | 8 | 18 |
| Intelligence Pages | 9 | 9 | 0 | 0 |
| Business Pages | 9 | 9 | 0 | 0 |
| Members Pages | 9 | 7 | 2 | 0 |
| Pre-Auth Pages | 11 | 0 | 11 | 0 |
| Home Page | 1 | 1 | 0 | 0 |
| **TOTAL PAGES** | **71** | **32** | **21** | **18** |
| API Endpoints | 55 | 45 | 0 | 10 |

**Overall Platform Health: 45% of pages fully functional, 30% broken, 25% partially broken.**

---

## Infrastructure Issues

### INFRA-001: Rate Limiter Too Aggressive (CRITICAL)
- **File:** `server/index.ts:42-50`
- **Problem:** API rate limit set to 100 requests per 15 minutes. Normal page navigation triggers 3-6 API calls per page. Browsing 15-20 pages exhausts the budget, causing cascading 429 errors across 20+ endpoints.
- **Impact:** 12+ FWA pages become non-functional after normal browsing
- **Fix:** Increase `max` to 500+ for development, or exempt pillar/stats endpoints

### INFRA-002: CSP Blocks Google Fonts (LOW)
- **File:** `server/index.ts:21` (Helmet CSP config)
- **Problem:** `style-src` directive is `['self', 'unsafe-inline']` but does not include `https://fonts.googleapis.com`
- **Impact:** 2 console errors on every page, fallback fonts used
- **Fix:** Add `https://fonts.googleapis.com` to `styleSrc` array

### INFRA-003: Vite HMR Causes Random Route Redirects (MEDIUM)
- **Problem:** With 21+ unstaged modified files, Vite HMR triggers continuous full-reload events that reset the SPA router to unpredictable routes
- **Impact:** Application virtually unusable during active development
- **Fix:** Commit or stash changes, or configure Vite to debounce HMR reloads

---

## FWA Pillar Audit

### COMPLETELY BLANK PAGES (5)

| # | Route | Issue | Severity |
|---|-------|-------|----------|
| FWA-001 | `/fwa/flagged-claims` | `<main>` is completely empty - no content renders | CRITICAL |
| FWA-002 | `/fwa/engine-config` | `<main>` is completely empty - no content renders | CRITICAL |
| FWA-003 | `/fwa/rule-studio` | `<main>` is completely empty - no content renders | CRITICAL |
| FWA-004 | `/fwa/history-agents` | Only renders a single `<img>` - stub/placeholder page | CRITICAL |
| FWA-005 | `/fwa/behaviors` | Only renders a single `<img>` - stub/placeholder page | CRITICAL |

### ERROR STATE PAGES (3)

| # | Route | Issue | Severity |
|---|-------|-------|----------|
| FWA-006 | `/fwa/phase-a2` | Error: "Failed to load category data" - `/api/fwa/phase-a2/categories` returns 404 | HIGH |
| FWA-007 | `/fwa/regulatory-oversight` | Blank due to multiple API 429 failures | HIGH |
| FWA-008 | `/fwa/kpi-dashboard` | Stuck on "Loading real-time analytics..." permanently | HIGH |

### ALL-ZERO DATA PAGES (9)

| # | Route | Zero Metrics | Severity |
|---|-------|-------------|----------|
| FWA-009 | `/fwa/enforcement` | Total Cases: 0, Active: 0, Pending: 0, Appeal: 0, Fines: SAR 0K, all 8 workflow stages: 0 | MEDIUM |
| FWA-010 | `/fwa/online-listening` | Total Mentions: 0, Negative: 0, Action Required: 0, Sentiment: 0% | MEDIUM |
| FWA-011 | `/fwa/knowledge-hub` | Total Documents: 0, Chunks: 0, Indexed: 0, Processing: 0 | MEDIUM |
| FWA-012 | `/fwa/audit-sessions` | Total Sessions: 0, Scheduled: 0, In Progress: 0, Completed: 0 | MEDIUM |
| FWA-013 | `/fwa/regulatory-circulars` | Total Circulars: 0, Drafts: 0, Review: 0, Published: 0, Notices: 0 | MEDIUM |
| FWA-014 | `/fwa/reconciliation-findings` | Total Findings: 0, Critical: 0, High: 0, Medium: 0, Exposure: $0 | MEDIUM |
| FWA-015 | `/fwa/medical-kb` | Documents Indexed: 0, "No guidelines match your filters" | MEDIUM |
| FWA-016 | `/fwa/ml-analysis` | Entity aggregations: 0 (plus 6 API 429 errors) | MEDIUM |
| FWA-017 | `/fwa/dashboard` | "SAR 0" risk score, Overdue Enforcement: 0, Pending Pre-Auth: 0 | LOW |

### PARTIAL LOADING / STUCK PAGES (6)

| # | Route | Issue | Severity |
|---|-------|-------|----------|
| FWA-018 | `/fwa/case-management` | Table rows render with completely empty cells; metric cards stuck loading | MEDIUM |
| FWA-019 | `/fwa/coding-intelligence` | 4 metric cards stuck on loading spinners; "Top Rejection Reason: 0%" | MEDIUM |
| FWA-020 | `/fwa/phase-a3` | "Loading action data..." stuck permanently at bottom | LOW |
| FWA-021 | `/fwa/agent-config` | Agent Config tab panel is empty | LOW |
| FWA-022 | `/fwa/graph-analysis` | Collusion Rings table: 3 rows with ALL cells empty | MEDIUM |
| FWA-023 | `/fwa/simulation-lab` | Digital Twins tab panel is empty | LOW |
| FWA-024 | `/fwa/rlhf-dashboard` | All 4 metric cards stuck on loading spinners | MEDIUM |
| FWA-025 | `/fwa/settings` | Semantic Embeddings "Loading stats..." never resolves | LOW |
| FWA-026 | `/fwa/high-risk-entities` | Providers tab panel appears empty on initial load | LOW |

### FWA PAGES WORKING WELL (6)

| Route | Status |
|-------|--------|
| `/fwa/dashboard` | Functional (minor zero values) |
| `/fwa/detection-engine` | Fully functional |
| `/fwa/agent-workflow` | Fully functional |
| `/fwa/regulatory-kb` | Mostly functional (4 docs indexed) |
| `/fwa/phase-a1` | Mostly functional |
| `/fwa/claims-import` | Form renders (but `/api/claims/import/stats` returns 404) |

### MISSING API ENDPOINTS (FWA)

| # | Endpoint | Called By | Error |
|---|----------|-----------|-------|
| FWA-027 | `GET /api/fwa/phase-a2/categories` | `/fwa/phase-a2` | 404 Not Found |
| FWA-028 | `GET /api/claims/import/stats` | `/fwa/claims-import` | 404 Not Found |

---

## Intelligence Pillar Audit

### ALL 9 PAGES PASS (when not rate-limited)

| # | Route | Status | Notes |
|---|-------|--------|-------|
| INT-001 | `/intelligence/dashboard` | PASS | All 5 metric cards populated, provider list loads |
| INT-002 | `/intelligence/accreditation-scorecards` | PASS | 52 providers, avg score 77.5 |
| INT-003 | `/intelligence/sbs-compliance` | PASS | 66.7% overall compliance, 13 regions |
| INT-004 | `/intelligence/drg-readiness` | PASS | 52% ready, donut chart + criteria bars |
| INT-005 | `/intelligence/rejection-patterns` | PASS | 15% overall rate, by specialty/insurer/region |
| INT-006 | `/intelligence/documentation-quality` | PASS | Quality index 69, SAR 3.7M at risk |
| INT-007 | `/intelligence/my-hospital` | PASS | Provider profile renders |
| INT-008 | `/intelligence/my-hospital/rejections` | PASS | Rejection analysis renders |
| INT-009 | `/intelligence/my-hospital/drg` | PASS | DRG assessment renders |

### Intelligence Issue (1)

| # | Issue | Severity |
|---|-------|----------|
| INT-010 | All pages show "..." placeholder loading states for several seconds before data appears. No skeleton screens, no timeout handling, no error fallback when API fails. | LOW |

---

## Business Pillar Audit

### ALL 9 PAGES PASS

| # | Route | Status | Notes |
|---|-------|--------|-------|
| BIZ-001 | `/business/dashboard` | PASS | All 5 metrics populated immediately |
| BIZ-002 | `/business/employer-compliance` | PASS | 110 employers, 98% compliance |
| BIZ-003 | `/business/insurer-health` | PASS | 6 insurers with financial metrics |
| BIZ-004 | `/business/market-concentration` | PASS* | HHI 1163, charts render |
| BIZ-005 | `/business/coverage-expansion` | PASS | 28.6M/25M coverage |
| BIZ-006 | `/business/cost-containment` | PASS | 18% admin cost ratio |
| BIZ-007 | `/business/my-company` | PASS | Company profile fully populated |
| BIZ-008 | `/business/my-company/health` | PASS | Workforce health metrics, AI insights |
| BIZ-009 | `/business/my-company/costs` | PASS | Cost analysis, plan comparison, renewal forecast |

### Business Issue (1)

| # | Issue | File | Severity |
|---|-------|------|----------|
| BIZ-010 | **Data Quality Bug:** Market Concentration page shows impossible HHI values for merger scenarios: Bupa+Tawuniya=88,075, Bupa+MedGulf=58,507, Tawuniya+MedGulf=50,827. HHI max is 10,000 by definition. Likely calculating `(share1+share2)^2` instead of correct post-merger HHI. | `server/routes/pillar-routes.ts` (buildMarketConcentrationResponse) | HIGH |

---

## Members Pillar Audit

### 7 OF 9 PAGES PASS

| # | Route | Status | Notes |
|---|-------|--------|-------|
| MEM-001 | `/members/dashboard` | PASS | 11.5M beneficiaries, all metrics populated |
| MEM-002 | `/members/complaints` | PASS | 10 complaints, charts render |
| MEM-003 | `/members/coverage-gaps` | PASS | 5.49M uninsured, 13 segments |
| MEM-004 | `/members/provider-quality` | PASS | 52 providers rated, avg 4.0 |
| MEM-005 | `/members/report-fraud` | PASS | Form renders correctly |
| MEM-006 | `/members/benefits-awareness` | PASS | 10 categories, 28 services each |
| MEM-007 | `/members/my-health/complaints` | PASS | 2 complaints, status timeline |

### Members Failures (2)

| # | Route | Issue | File | Severity |
|---|-------|-------|------|----------|
| MEM-008 | `/members/my-health` | **16 instances of `0 / 0 SAR` and `0%`** for coverage categories. `limitSar: null` renders as `0` instead of "Unlimited" or "N/A". | `client/src/pages/members/my-coverage.tsx` + `server/routes/pillar-routes.ts` | MEDIUM |
| MEM-009 | `/members/my-health/providers` | **"No providers found"** despite 7 providers in Jeddah. Insurer filter compares name (`"Bupa Arabia"`) against code array (`["INS-001"]`) - never matches. | `server/routes/pillar-routes.ts:1548` | HIGH |

---

## Pre-Auth Module Audit

### ALL 11 PAGES RETURN 404 (CRITICAL)

| # | Route | Status |
|---|-------|--------|
| PA-001 | `/pre-auth/dashboard` | 404 |
| PA-002 | `/pre-auth/claims` | 404 |
| PA-003 | `/pre-auth/pending` | 404 |
| PA-004 | `/pre-auth/new-claim` | 404 |
| PA-005 | `/pre-auth/analytics` | 404 |
| PA-006 | `/pre-auth/knowledge-base` | 404 |
| PA-007 | `/pre-auth/policy-rules` | 404 |
| PA-008 | `/pre-auth/agent-config` | 404 |
| PA-009 | `/pre-auth/batch-upload` | 404 |
| PA-010 | `/pre-auth/rlhf` | 404 |
| PA-011 | `/pre-auth/settings` | 404 |

**Root Cause:** No client-side routes defined for `/pre-auth/*` in `App.tsx`. The `AppRouter` only handles `/`, `/fwa`, `/intelligence`, `/business`, `/members`. No `PreAuthRouter` exists.

**Note:** All 11 page components exist in `client/src/pages/pre-auth/`, a layout exists at `client/src/components/pre-auth/pre-auth-layout.tsx`, and server API routes are registered. Only the client router is missing.

### Pre-Auth API Data Status (even once routed, data is empty)

| Endpoint | Data |
|----------|------|
| `/api/pre-auth/stats` | totalClaims: 0, pendingReview: 0, approved: 0, rejected: 0 |
| `/api/pre-auth/claims` | `[]` empty |
| `/api/pre-auth/claims/recent` | `[]` empty |
| `/api/pre-auth/agent-configs` | `[]` empty |
| `/api/pre-auth/analytics/overview` | all zeros |

---

## API Endpoint Audit

### Endpoints Returning Empty/Zero Data (10 of 55 tested)

| # | Endpoint | Response | Impact |
|---|----------|----------|--------|
| API-001 | `/api/pre-auth/stats` | All zeros | Pre-Auth dashboard blank |
| API-002 | `/api/pre-auth/claims` | `[]` | No claims listed |
| API-003 | `/api/pre-auth/claims/recent` | `[]` | No recent claims |
| API-004 | `/api/pre-auth/agent-configs` | `[]` | No agent configs |
| API-005 | `/api/pre-auth/analytics/overview` | All zeros | Analytics blank |
| API-006 | `/api/fwa/heatmap` | All 13 regions fwaCount: 0 | Heatmap completely empty |
| API-007 | `/api/fwa/ml/stats` | providers: 0, members: 0, analyzed: 0, patterns: 0 | ML dashboard blank |
| API-008 | `/api/fwa/rules-library` | `[]` | Rule studio empty |
| API-009 | `/api/fwa/batches` | `[]` | Batch view empty |
| API-010 | `/api/fwa/pipeline-stats` | rules.active: 0, features.records: 0, detection.runs: 0 | Pipeline stats misleading |

### Data Quality Issues in Populated Endpoints (4)

| # | Endpoint | Issue |
|---|----------|-------|
| API-011 | `/api/fwa/high-risk-providers` | Several providers show totalClaims: 0, avgClaimAmount: 0.00, totalExposure: 0.00 yet classified as "critical" risk |
| API-012 | `/api/fwa/high-risk-patients` | All 20 patients have totalAmount: "0.00" despite multiple flagged claims |
| API-013 | `/api/fwa/kpi-stats` | topProviders field returns empty `[]` despite providers existing |
| API-014 | `/api/provider-relations/kpi-dashboard` | 25 KPI definitions exist but all have latestResult: null, calculatedValue: null, trend: null |

### Provider Relations Empty Data (3)

| # | Endpoint | Response |
|---|----------|----------|
| API-015 | `/api/provider-relations/contracts` | `[]` |
| API-016 | `/api/provider-relations/sessions` | `[]` |
| API-017 | `/api/claims-pipeline/batches` | `[]` |

---

## Prioritized Fix List

### P0 - CRITICAL (Platform-Breaking, Fix First)

| # | Issue | Location | Description |
|---|-------|----------|-------------|
| 1 | INFRA-001 | `server/index.ts:42-50` | Rate limiter max=100 too low - causes cascading 429 failures across 20+ endpoints |
| 2 | PA-001 to PA-011 | `client/src/App.tsx` | Pre-Auth module has no client routes - 11 pages return 404 |
| 3 | FWA-001 | `/fwa/flagged-claims` page | Blank page - `<main>` renders nothing |
| 4 | FWA-002 | `/fwa/engine-config` page | Blank page - `<main>` renders nothing |
| 5 | FWA-003 | `/fwa/rule-studio` page | Blank page - `<main>` renders nothing |

### P1 - HIGH (Broken Features, Fix Next)

| # | Issue | Location | Description |
|---|-------|----------|-------------|
| 6 | FWA-004 | `/fwa/history-agents` page | Image-only stub - no functional content |
| 7 | FWA-005 | `/fwa/behaviors` page | Image-only stub - no functional content |
| 8 | FWA-006 | `server/routes/fwa-routes.ts` | Missing `/api/fwa/phase-a2/categories` endpoint - page shows error |
| 9 | FWA-008 | `/fwa/kpi-dashboard` | Perpetual "Loading..." - no timeout/error fallback |
| 10 | MEM-009 | `server/routes/pillar-routes.ts:1548` | Find a Provider insurer code/name mismatch - never returns results |
| 11 | BIZ-010 | `server/routes/pillar-routes.ts` | HHI merger values exceed mathematical maximum (88,075 vs max 10,000) |
| 12 | FWA-028 | `server/routes/*.ts` | Missing `/api/claims/import/stats` endpoint |

### P2 - MEDIUM (Zero Data, Missing Seed Data)

| # | Issue | Location | Description |
|---|-------|----------|-------------|
| 13 | FWA-009 | `/fwa/enforcement` | All enforcement metrics zero - CHI API has data but UI doesn't consume it |
| 14 | FWA-010 | `/fwa/online-listening` | All metrics zero - API has 12 items but UI shows 0 |
| 15 | FWA-011 | `/fwa/knowledge-hub` | All document metrics zero |
| 16 | FWA-012 | `/fwa/audit-sessions` | All session metrics zero - API has 3 sessions but UI shows 0 |
| 17 | FWA-013 | `/fwa/regulatory-circulars` | All circular metrics zero - API has 3 but UI shows 0 |
| 18 | FWA-014 | `/fwa/reconciliation-findings` | All findings zero |
| 19 | FWA-015 | `/fwa/medical-kb` | No medical guidelines |
| 20 | FWA-018 | `/fwa/case-management` | Table rows render with empty cells |
| 21 | FWA-019 | `/fwa/coding-intelligence` | 4 metric cards perpetually loading |
| 22 | FWA-022 | `/fwa/graph-analysis` | Collusion Rings table cells empty |
| 23 | FWA-024 | `/fwa/rlhf-dashboard` | All metric cards perpetually loading |
| 24 | MEM-008 | `client/src/pages/members/my-coverage.tsx` | 16x "0 / 0 SAR" for null coverage limits |
| 25 | API-006 | `/api/fwa/heatmap` | All 13 regions fwaCount: 0 |
| 26 | API-007 | `/api/fwa/ml/stats` | ML feature store completely empty |
| 27 | API-008 | `/api/fwa/rules-library` | Rules library empty despite 30+ rules referenced |
| 28 | API-011 | `/api/fwa/high-risk-providers` | Providers with 0 claims classified as "critical" risk |
| 29 | API-012 | `/api/fwa/high-risk-patients` | All patients totalAmount: 0.00 |

### P3 - LOW (Polish & UX)

| # | Issue | Location | Description |
|---|-------|----------|-------------|
| 30 | INFRA-002 | `server/index.ts:21` | CSP blocks Google Fonts on every page |
| 31 | INFRA-003 | Vite config | HMR random redirects with unstaged changes |
| 32 | FWA-020 | `/fwa/phase-a3` | "Loading action data..." stuck at bottom |
| 33 | FWA-021 | `/fwa/agent-config` | Agent Config tab panel empty |
| 34 | FWA-023 | `/fwa/simulation-lab` | Digital Twins tab panel empty |
| 35 | FWA-025 | `/fwa/settings` | Semantic Embeddings stats never load |
| 36 | FWA-026 | `/fwa/high-risk-entities` | Initial tab appears empty before data loads |
| 37 | INT-010 | All Intelligence pages | "..." placeholder loading states, no skeleton screens |
| 38 | API-013 | `/api/fwa/kpi-stats` | topProviders returns empty despite data existing |
| 39 | API-014 | `/api/provider-relations/kpi-dashboard` | 25 KPI defs with null calculated values |

---

## Statistics

- **Total unique issues found:** 39
- **P0 (Critical):** 5
- **P1 (High):** 7
- **P2 (Medium):** 17
- **P3 (Low):** 10
- **Pages fully working:** 32 of 71 (45%)
- **Pages completely broken:** 21 of 71 (30%)
- **Pages partially broken:** 18 of 71 (25%)
- **API endpoints with data:** 45 of 55 (82%)
- **API endpoints empty/zero:** 10 of 55 (18%)

---

*Generated by automated Playwright + curl audit on 2026-03-02*
