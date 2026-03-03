# UI/UX Gaps & Improvements Design

**Status:** APPROVED
**Date:** 2026-03-02
**Approach:** Systematic layer-by-layer (shared utilities -> components -> data layer -> pages -> navigation)

---

## Problem Statement

The CHI-Platform has accumulated significant UI/UX debt across five dimensions:

1. **Duplicated utilities** - 6+ local `formatCurrency()` implementations (some using `$USD` in a Saudi platform), duplicated `getRiskLevelBadgeClasses`, inconsistent grid constants
2. **Fragmented components** - 6 different local MetricCard/StatsCard variants; shared `EmptyState` component never used; inconsistent loading states
3. **Hardcoded data** - Intelligence, Business, Members overview routes return static JS objects; FWA dashboard heatmap/alerts are inline; Phase A2/A3 are fully static
4. **Page-level inconsistencies** - mixed `$`/`SAR` currencies, `"..."` string fallbacks, hardcoded metrics, varying grid breakpoints and gaps, ad-hoc empty states
5. **Sidebar grouping** - FWA nav has imbalanced sections (7/2/2), items don't follow workflow pipeline order

---

## Layer 1: Shared Utilities & Constants

### `client/src/lib/format.ts`

Single source for formatting functions, replacing all local implementations:

- `formatCurrency(amount: number, currency = "SAR")` - SAR prefix, `toLocaleString` with 2 decimal places
- `formatNumber(n: number)` - compact formatting with locale separators
- `formatPercentage(n: number, decimals = 1)` - consistent `X.X%`

### `client/src/lib/risk-utils.ts`

Risk display helpers:

- `getRiskLevelBadgeClasses(level: string)` - extracted from duplicated code in doctors.tsx and high-risk-entities.tsx
- `getRiskLevelColor(level: string)` - for charts and non-badge contexts

### `client/src/lib/grid.ts`

Standardized grid class constants:

- `METRIC_GRID = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"`
- `METRIC_GRID_5 = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"`

---

## Layer 2: UI Component Consolidation

### MetricCard (shared, enhanced)

File: `components/metric-card.tsx` - enhanced to be the single metric card.
Props: `title`, `value`, `icon`, `trend?`, `loading?`, `className?`
Standard styling: `p-6`, value `text-2xl font-bold`, icon in `bg-muted p-3 rounded-lg`

Replaces all local variants in dashboard.tsx, kpi-dashboard.tsx, doctors.tsx, CG dashboard, pre-auth dashboard, pre-auth analytics.

### KpiCard (portal pages, unchanged)

File: `components/portal/kpi-card.tsx` - kept as-is for portal detail pages.

### EmptyState (adopted everywhere)

File: `components/ui/empty-state.tsx` - existing component with `emptyStatePresets` becomes standard for all tables and data sections.

### Loading States

Every metric card uses `Skeleton` when `isLoading` is true. No more `"..."` fallbacks or hardcoded values.

---

## Layer 3: Data Layer - Wire Pillar Routes to DB

### Intelligence Overview Routes

| Route | New Source |
|---|---|
| `/api/intelligence/accreditation-scorecards` | `portalProviders` + `providerScorecards` |
| `/api/intelligence/sbs-compliance` | `providerScorecards` SBS fields |
| `/api/intelligence/drg-readiness` | `providerDrgAssessments` |
| `/api/intelligence/rejection-patterns` | `providerRejections` by specialty/insurer |
| `/api/intelligence/documentation-quality` | `providerScorecards` coding/documentation fields |

### Business Overview Routes

| Route | New Source |
|---|---|
| `/api/business/employer-compliance` | `portalEmployers` + `employerViolations` |
| `/api/business/insurer-health` | `portalInsurers` (activate unused table) |
| `/api/business/market-concentration` | `portalInsurers` market share |
| `/api/business/coverage-expansion` | `portalRegions` (activate unused table) |
| `/api/business/cost-containment` | `employerPolicies` aggregate |

### Members Overview Routes

| Route | New Source |
|---|---|
| `/api/members/complaints` | `memberComplaints` aggregate |
| `/api/members/coverage-gaps` | `portalRegions` population vs insured |
| `/api/members/provider-quality` | `portalProviders` ratings |
| `/api/members/benefits-awareness` | `memberCoverage` benefit categories |

### FWA Hardcoded Sections

| Section | New Source |
|---|---|
| Dashboard heatmap | `fwa_cases` / `fwa_provider_detection_results` by region |
| Dashboard alerts | Recent `fwa_cases` + `enforcement_cases` |
| Phase A2 categories | `fwa_categories` / `fwa_analysis_findings` |
| Phase A3 actions | `fwa_work_queue_claims` + `enforcement_cases` |
| History Agents stats | `agent_performance_metrics` |

### Unused Tables Activated

- `portalInsurers` -> Business insurer-health
- `portalRegions` -> Business coverage-expansion + Members coverage-gaps

### Broken Queries Fixed

Create 5 missing `/api/pre-auth/analytics/*` endpoints.

---

## Layer 4: Page-Level Fixes

- Replace local card variants with shared `MetricCard`
- Replace local `formatCurrency` with shared import (SAR)
- Replace ad-hoc empty states with `EmptyState`
- Replace hardcoded loading fallbacks with `Skeleton`
- Standardize metric row grids
- Fix table header alignment consistency

---

## Layer 5: Sidebar Navigation

### FWA (Major Restructure)

```
Command Center
--- Detection & Analysis ---
  Detection Engine | 5 Detection Methods | Coding Intelligence | Flagged Claims
--- Risk & Entities ---
  High-Risk Entities | Online Listening [Live]
--- Enforcement & Compliance ---
  Enforcement & Compliance | Intelligence Reports
--- Knowledge & AI ---
  Knowledge Hub | Daman AI Chat
```

### Intelligence (Minor)

Rename portal "DRG Readiness" to "DRG Assessment".

### Business (No Changes)

### Members (Minor)

Move "Report Fraud" after "Complaints & Disputes".
