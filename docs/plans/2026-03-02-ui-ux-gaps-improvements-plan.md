# UI/UX Gaps & Improvements — Implementation Plan

**Design:** `2026-03-02-ui-ux-gaps-improvements-design.md`
**Date:** 2026-03-02

---

## Task 1: Create shared formatting utilities

Create `client/src/lib/format.ts`:

```ts
export function formatCurrency(amount: number, currency = "SAR"): string {
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString();
}

export function formatPercentage(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}
```

**Verify:** File exists and exports 3 functions. No runtime test needed — pure formatting.

---

## Task 2: Create shared risk utilities

Create `client/src/lib/risk-utils.ts`:

Extract `getRiskLevelBadgeClasses` from `client/src/pages/fwa/doctors.tsx` (L78-100) — it maps risk levels (Critical/High/Medium/Low/Minimal) to Tailwind badge classes. Also extract `getRiskLevelColor` for chart contexts.

**Verify:** File exists with both exports.

---

## Task 3: Create shared grid constants

Create `client/src/lib/grid.ts`:

```ts
export const METRIC_GRID = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4";
export const METRIC_GRID_5 = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4";
```

**Verify:** File exists with both exports.

---

## Task 4: Enhance shared MetricCard component

Edit `client/src/components/metric-card.tsx`:

Current: 44 lines with props `title`, `value`, `subtitle`, `icon`, `trend`.

Changes:
1. Add `loading?: boolean` prop — when true, render `Skeleton` elements instead of value/title
2. Change icon wrapper from `bg-primary/10 p-2 rounded-md` to `bg-muted p-3 rounded-lg` (consistent with the most common local variant)
3. Change icon size from `h-5 w-5` to `h-5 w-5` (keep same)
4. Change value from `text-3xl` to `text-2xl` (match KpiCard and most local variants)
5. Add `import { Skeleton } from "@/components/ui/skeleton"`
6. Keep existing `data-testid` pattern

The component should remain simple — no `format`, `borderColor`, `onClick` props (those belong to KpiCard).

**Verify:** Import `MetricCard` in a page and confirm it renders with skeleton when `loading={true}`.

---

## Task 5: Update FWA dashboard to use shared MetricCard

Edit `client/src/pages/fwa/dashboard.tsx`:

1. Remove the local `MetricCard` component definition (~L222)
2. Import `MetricCard` from `@/components/metric-card`
3. Import `formatCurrency` from `@/lib/format`
4. Replace all local `formatCurrency` calls with the shared version
5. Pass `loading={isLoading}` to each MetricCard
6. Replace the hardcoded metric grid class with import from `@/lib/grid`

**Verify:** Dashboard loads, metric cards render with SAR currency, skeleton shows during loading.

---

## Task 6: Update FWA doctors page to use shared utilities

Edit `client/src/pages/fwa/doctors.tsx`:

1. Remove local `StatsCard` component definition (~L127)
2. Remove local `formatCurrency` (~L106) — replace with import from `@/lib/format`
3. Remove local `getRiskLevelBadgeClasses` (~L78) — replace with import from `@/lib/risk-utils`
4. Import `MetricCard` from `@/components/metric-card`
5. Replace `StatsCard` usage with `MetricCard` — remove hardcoded `bg-purple-100` icon colors
6. Fix empty state: replace custom icon+text with `EmptyState` from `@/components/ui/empty-state`

**Verify:** Doctors page loads, cards show SAR (not $), no purple hardcoding.

---

## Task 7: Update FWA high-risk-entities page to use shared utilities

Edit `client/src/pages/fwa/high-risk-entities.tsx`:

1. Remove local `formatCurrency` (~L63) — replace with import from `@/lib/format`
2. Remove local `getRiskLevelBadgeClasses` (~L48) — replace with import from `@/lib/risk-utils`
3. Replace ad-hoc empty states in all 3 tabs with `EmptyState` component
4. Standardize metric grid class

**Verify:** Page loads, currency shows SAR, empty states use shared component.

---

## Task 8: Update FWA providers page to use shared utilities

Edit `client/src/pages/fwa/providers.tsx`:

1. Remove local `formatCurrency` — replace with import from `@/lib/format`
2. Remove local `getRiskLevelBadgeClasses` if present — replace with import from `@/lib/risk-utils`
3. Replace local StatsCard with shared MetricCard if applicable
4. Fix currency from `$` to `SAR`

**Verify:** Page loads, SAR currency, no `$` signs.

---

## Task 9: Update FWA KPI dashboard to use shared utilities

Edit `client/src/pages/fwa/kpi-dashboard.tsx`:

1. Remove local `StatsCard` (~L76) — replace with shared `MetricCard`
2. Remove local `formatCurrency` (~L62) — replace with import from `@/lib/format`
3. Replace metric grid class with `METRIC_GRID_5` from `@/lib/grid`

**Verify:** Page loads, 5 metric cards render with SAR prefix.

---

## Task 10: Update Business dashboard loading states

Edit `client/src/pages/business/dashboard.tsx`:

1. Replace `?? "..."` fallbacks with `loading` prop on MetricCard (or add Skeleton)
2. Import `MetricCard` from `@/components/metric-card` if using local card variant
3. Pass `loading={isLoading}` to show skeletons instead of `"...%"` strings
4. Standardize metric grid class with `METRIC_GRID_5` (it uses 5 cards)

**Verify:** Dashboard shows skeleton during loading, not `"..."` strings.

---

## Task 11: Update Pre-Auth dashboard to remove hardcoded values

Edit `client/src/pages/pre-auth/dashboard.tsx`:

1. Remove local `PreAuthStatsCard` — replace with shared `MetricCard`
2. Remove hardcoded fallback `"2.3s"` for avg processing time — show skeleton when data unavailable
3. Remove hardcoded `"68%"`, `"12%"`, `"47 this week"` static strings in Processing Metrics card
4. Pass `loading` prop for skeleton support

**Verify:** Dashboard shows skeleton for missing data, no hardcoded values visible.

---

## Task 12: Update Claims Governance dashboard to use shared MetricCard

Edit `client/src/pages/claims-governance/dashboard.tsx`:

1. Remove local `StatsCard` (~L70) — replace with shared `MetricCard`
2. Replace ad-hoc empty state with `EmptyState` component

**Verify:** Page loads with shared MetricCard.

---

## Task 13: Wire Intelligence overview routes to DB

Edit `server/routes/pillar-routes.ts`:

Replace these hardcoded `build*` functions with DB queries using Drizzle:

**`buildAccreditationScorecardsResponse()`** — Replace with:
```sql
SELECT p.*, s.* FROM portal_providers p
LEFT JOIN provider_scorecards s ON s.provider_code = p.code
WHERE s.month = (SELECT MAX(month) FROM provider_scorecards)
```

**`buildSbsComplianceResponse()`** — Replace with:
```sql
SELECT region, AVG(sbs_compliance) as avg_compliance
FROM provider_scorecards s
JOIN portal_providers p ON s.provider_code = p.code
WHERE s.month = (SELECT MAX(month) FROM provider_scorecards)
GROUP BY region
```

**`buildDrgReadinessResponse()`** — Replace with:
```sql
SELECT status, COUNT(*) as count FROM provider_drg_assessments
GROUP BY status
```

**`buildRejectionPatternsResponse()`** — Replace with:
```sql
SELECT denial_category, COUNT(*) as count, SUM(amount_sar) as total
FROM provider_rejections GROUP BY denial_category
```

**`buildDocumentationQualityResponse()`** — Replace with:
```sql
SELECT AVG(documentation_quality) as avg, AVG(coding_accuracy) as coding_avg
FROM provider_scorecards WHERE month = (SELECT MAX(month) FROM provider_scorecards)
```

Use the existing Drizzle `db` import and table references already available in the file's DB-backed routes.

**Verify:** Hit each endpoint with curl/browser — confirm response shape matches what the frontend expects, but with real DB values.

---

## Task 14: Wire Business overview routes to DB

Edit `server/routes/pillar-routes.ts`:

**`buildEmployerComplianceResponse()`** — Replace with:
```sql
SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE v.id IS NULL) as compliant
FROM portal_employers e LEFT JOIN employer_violations v ON v.employer_code = e.code AND v.resolved_date IS NULL
```

**`buildInsurerHealthResponse()`** — Replace with:
```sql
SELECT * FROM portal_insurers ORDER BY market_share DESC
```

**`buildMarketConcentrationResponse()`** — Replace with:
```sql
SELECT SUM(market_share * market_share) * 100 as hhi FROM portal_insurers
```
Plus insurer market shares for the merger scenario table.

**`buildCoverageExpansionResponse()`** — Replace with:
```sql
SELECT name, population, insured_count, coverage_rate FROM portal_regions
```

**`buildCostContainmentResponse()`** — Replace with:
```sql
SELECT SUM(total_annual_premium) as total_premium FROM employer_policies
```

**Verify:** Each endpoint returns data shaped correctly from DB.

---

## Task 15: Wire Members overview routes to DB

Edit `server/routes/pillar-routes.ts`:

**`buildMembersComplaintsResponse()`** — Replace with:
```sql
SELECT status, COUNT(*) as count FROM member_complaints GROUP BY status
```
Plus type breakdown and monthly trend.

**`buildMembersCoverageGapsResponse()`** — Replace with:
```sql
SELECT name, population, insured_count, coverage_rate FROM portal_regions
ORDER BY coverage_rate ASC
```

**`buildMembersProviderQualityResponse()`** — Replace with:
```sql
SELECT name, city, rating, avg_wait_minutes, review_count, accreditation_status
FROM portal_providers ORDER BY rating DESC
```

**`buildMembersBenefitsAwarenessResponse()`** — Replace with:
```sql
SELECT benefit_category, status, limit_sar FROM member_coverage
GROUP BY benefit_category, status, limit_sar
```

**Verify:** Each endpoint returns DB data. Frontend pages render correctly.

---

## Task 16: Wire FWA dashboard heatmap and alerts to DB

Edit `client/src/pages/fwa/dashboard.tsx`:

1. Replace hardcoded `heatmapData` array (~L42-56) with a `useQuery` call to a new endpoint
2. Replace hardcoded `alerts` array (~L62-71) with a `useQuery` call to a new endpoint

Add to `server/routes/fwa-routes.ts`:

**`GET /api/fwa/heatmap`** — Query `fwa_provider_detection_results` or `fwa_cases` grouped by region, return `{region, fwaCount, riskLevel}[]`

**`GET /api/fwa/recent-alerts`** — Query recent entries from `fwa_cases` + `enforcement_cases` + `fwa_provider_detection_results`, order by created desc, limit 8, return `{text, severity, time}[]`

**Verify:** Dashboard heatmap shows data from DB. Alert feed shows recent real activity.

---

## Task 17: Wire FWA Phase A2 and A3 to DB

Edit `client/src/pages/fwa/phase-a2.tsx`:
1. Remove hardcoded `fwaCategories` array
2. Add `useQuery` to fetch from a new endpoint `GET /api/fwa/phase-a2/categories`

Add endpoint to `server/routes/fwa-routes.ts`:
```sql
SELECT category, COUNT(*) as count FROM fwa_analysis_findings
GROUP BY category
```

Edit `client/src/pages/fwa/phase-a3.tsx`:
1. Remove hardcoded `prospectiveActions` and `retrospectiveActions` arrays
2. Remove hardcoded `financialMetrics` object
3. Add `useQuery` calls to fetch from `GET /api/fwa/phase-a3/actions`

Add endpoint:
```sql
SELECT * FROM fwa_work_queue_claims WHERE phase = 'a3_corrective'
UNION ALL
SELECT * FROM enforcement_cases WHERE status = 'active'
```

**Verify:** Phase A2 shows category counts from DB. Phase A3 shows actions from DB.

---

## Task 18: Wire FWA History Agents to DB

Edit `client/src/pages/fwa/history-agents.tsx`:
1. Remove hardcoded `patientHistoryAgents` and `providerHistoryAgents` arrays
2. Add `useQuery` call to `GET /api/fwa/agent-performance`

The endpoint already exists via `agentPerformanceMetrics` table. Check `fwa-routes.ts` for existing agent metrics routes. If not exposed at this path, add a simple route:
```sql
SELECT * FROM agent_performance_metrics ORDER BY module, agent_name
```

**Verify:** History agents page shows real agent metrics from DB.

---

## Task 19: Create Pre-Auth analytics endpoints

Add to `server/routes/preauth-routes.ts`:

**`GET /api/pre-auth/analytics/overview`** — Aggregate from `pre_auth_claims`:
```sql
SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='approved') as approved,
AVG(processing_time_ms) as avg_time FROM pre_auth_claims
```

**`GET /api/pre-auth/analytics/claims-by-status`** — Group by status.

**`GET /api/pre-auth/analytics/claims-trend`** — Group by date/month.

**`GET /api/pre-auth/analytics/agent-performance`** — From `agent_performance_metrics` where module='pre-auth'.

**`GET /api/pre-auth/analytics/override-patterns`** — From `pre_auth_decisions` where `overrideReason IS NOT NULL`.

**Verify:** `pre-auth/analytics.tsx` page loads without 404 errors in network tab.

---

## Task 20: Reorganize FWA sidebar navigation

Edit `client/src/pillars/config/fwa.ts`:

Replace `navSections` with:
```ts
navSections: [
  {
    title: "Detection & Analysis",
    items: [
      { label: "Detection Engine", href: "/fwa/detection-engine", icon: Shield },
      { label: "5 Detection Methods", href: "/fwa/engine-config", icon: Settings2 },
      { label: "Coding Intelligence", href: "/fwa/coding-intelligence", icon: Stethoscope },
      { label: "Flagged Claims", href: "/fwa/flagged-claims", icon: FileSearch },
    ],
  },
  {
    title: "Risk & Entities",
    items: [
      { label: "High-Risk Entities", href: "/fwa/high-risk-entities", icon: AlertTriangle },
      { label: "Online Listening", href: "/fwa/online-listening", icon: Rss, badge: "Live" },
    ],
  },
  {
    title: "Enforcement & Compliance",
    items: [
      { label: "Enforcement & Compliance", href: "/fwa/enforcement", icon: Gavel },
      { label: "Intelligence Reports", href: "/fwa/kpi-dashboard", icon: BarChart3 },
    ],
  },
  {
    title: "Knowledge & AI",
    items: [
      { label: "Knowledge Hub", href: "/fwa/knowledge-hub", icon: Database },
      { label: "Daman AI Chat", href: "/fwa/chat", icon: MessageCircle },
    ],
  },
],
```

Keep "Command Center" as the `defaultRoute` (it's not in a section — it's the dashboard).

**Verify:** FWA sidebar shows 4 balanced sections. Command Center still loads as default.

---

## Task 21: Minor sidebar adjustments for Intelligence and Members

Edit `client/src/pillars/config/intelligence.ts`:
- Change "DRG Readiness" label in My Hospital section to "DRG Assessment"

Edit `client/src/pillars/config/members.ts`:
- Move "Report Fraud" item to position immediately after "Complaints & Disputes" in Beneficiary Services

**Verify:** Intelligence sidebar shows "DRG Assessment" in My Hospital. Members sidebar has Report Fraud after Complaints.

---

## Task 22: Final verification pass

1. Start dev server (`npm run dev`)
2. Navigate through each pillar dashboard — confirm no `$` signs, no `"..."`, no hardcoded values
3. Check FWA sidebar grouping matches design
4. Check Intelligence "DRG Assessment" label
5. Check Members "Report Fraud" position
6. Verify metric cards show Skeleton during loading
7. Verify empty states use shared EmptyState component
8. Check browser console for any new errors

**Verify:** Full manual walkthrough confirms all improvements.
