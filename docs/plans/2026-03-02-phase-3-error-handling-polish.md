# Phase 3: Error Handling & UI Polish

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add error fallback UI to pages that show perpetual loading spinners on API failure, and fix minor UX issues. These are polish items -- the platform is functional after Phase 0-2.

**Architecture:** Add `error` state handling to `useQuery` hooks across FWA pages that currently show infinite loading. Use a shared error component pattern for consistency.

**Tech Stack:** React (TanStack Query), TypeScript

**Prerequisites:** Phase 0, 1, and 2 must be completed first. Most of these issues may self-resolve after the rate limiter fix.

---

### Task 1: Create a Shared Query Error Component

**Files:**
- Modify: `client/src/components/error-boundary.tsx`

**Step 1: Read the existing error boundary**

Read `client/src/components/error-boundary.tsx`. It already has a `QueryErrorState` component. Verify it exists and note its interface.

**Step 2: If QueryErrorState doesn't exist, add it**

If it doesn't exist, add after the existing ErrorBoundary class:

```typescript
export function QueryErrorState({
  title = "Failed to load data",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        {message && <p className="text-sm text-muted-foreground mb-4">{message}</p>}
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" /> Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

**Step 3: Commit**

```bash
git add client/src/components/error-boundary.tsx
git commit -m "feat: add shared QueryErrorState component"
```

---

### Task 2: Add Error Handling to Coding Intelligence Page

**Files:**
- Modify: `client/src/pages/fwa/coding-intelligence.tsx:102-112`

**Step 1: Read the current queries**

The page has 3 queries that all lack error handling:

```typescript
const { data: trendsData, isLoading: trendsLoading } = useQuery(...)
const { data: frequencyData, isLoading: frequencyLoading } = useQuery(...)
const { data: metricsData, isLoading: metricsLoading } = useQuery(...)
```

**Step 2: Add error destructuring to each query**

```typescript
const { data: trendsData, isLoading: trendsLoading, error: trendsError } = useQuery(...)
const { data: frequencyData, isLoading: frequencyLoading, error: frequencyError } = useQuery(...)
const { data: metricsData, isLoading: metricsLoading, error: metricsError } = useQuery(...)
```

**Step 3: Add error display in the metric cards section**

Where the metric cards show loading spinners, add a conditional:

```typescript
{metricsError ? (
  <QueryErrorState
    title="Failed to load CPOE metrics"
    message={metricsError.message}
    onRetry={() => window.location.reload()}
  />
) : (
  /* existing metric cards */
)}
```

**Step 4: Import QueryErrorState**

Add to imports:
```typescript
import { QueryErrorState } from "@/components/error-boundary";
```

**Step 5: Commit**

```bash
git add client/src/pages/fwa/coding-intelligence.tsx
git commit -m "fix: add error handling to Coding Intelligence metrics"
```

---

### Task 3: Add Error Handling to RLHF Dashboard

**Files:**
- Modify: `client/src/pages/fwa/rlhf-dashboard.tsx`

**Step 1: Find the useQuery calls**

Search for `useQuery` in the file. The page has metric cards that show loading spinners forever.

**Step 2: Add error destructuring and error UI**

Same pattern as Task 2:
- Add `error` to query destructuring
- Add `QueryErrorState` fallback when error exists
- Import the shared component

**Step 3: Commit**

```bash
git add client/src/pages/fwa/rlhf-dashboard.tsx
git commit -m "fix: add error handling to RLHF dashboard metrics"
```

---

### Task 4: Add Error Handling to Graph Analysis Page

**Files:**
- Modify: `client/src/pages/graph-analysis/graph-analysis.tsx`

**Step 1: Read the table rendering code**

The page renders Collusion Rings table with 3 rows that have ALL cells empty. This likely means the data is fetched but field names don't match, or the error state is swallowed.

**Step 2: Add error handling and verify field mapping**

Check the interface fields match the API response. Add error handling to the query.

**Step 3: Commit**

```bash
git add client/src/pages/graph-analysis/graph-analysis.tsx
git commit -m "fix: add error handling to Graph Analysis page"
```

---

### Task 5: Add Error Handling to Simulation Lab

**Files:**
- Modify: `client/src/pages/simulation/simulation-lab.tsx`

**Step 1: Read the queries**

Digital Twins tab appears empty. Check query and add error fallback.

**Step 2: Apply same pattern**

Add `error` to query, add `QueryErrorState` fallback, import shared component.

**Step 3: Commit**

```bash
git add client/src/pages/simulation/simulation-lab.tsx
git commit -m "fix: add error handling to Simulation Lab"
```

---

### Task 6: Fix Phase A3 "Loading action data..." Stuck

**Files:**
- Modify: `client/src/pages/fwa/phase-a3.tsx`

**Step 1: Find the loading section**

Search for "Loading action data" in the file. This text appears at the bottom of the page and never resolves.

**Step 2: Add error/timeout handling**

The query likely doesn't have a fallback for when the API returns empty data. Add:

```typescript
if (isLoading) return <Skeleton ... />;
if (error) return <QueryErrorState ... />;
if (!data || data.length === 0) return <p className="text-muted-foreground text-center py-8">No action data available yet.</p>;
```

**Step 3: Commit**

```bash
git add client/src/pages/fwa/phase-a3.tsx
git commit -m "fix: add empty state and error handling to Phase A3 actions"
```

---

### Task 7: Fix Settings Semantic Embeddings Loading

**Files:**
- Modify: `client/src/pages/fwa/settings.tsx`

**Step 1: Find the Semantic Embeddings section**

Search for "Loading stats" or "semantic" in the file. The section shows a perpetual loading state.

**Step 2: Add error fallback**

```typescript
if (statsError) {
  return <p className="text-sm text-muted-foreground">Semantic stats unavailable</p>;
}
```

**Step 3: Commit**

```bash
git add client/src/pages/fwa/settings.tsx
git commit -m "fix: add error fallback for Semantic Embeddings stats"
```

---

### Task 8: Add Skeleton Loading to Intelligence Pages

**Files:**
- Modify: Multiple files in `client/src/pages/intelligence/`

**Step 1: Identify the "..." placeholder pattern**

Intelligence pages show `"..."` as placeholder text while loading. This is functional but not visually appealing.

**Step 2: Replace "..." with Skeleton components**

In each Intelligence page dashboard file, where the metric values show "..." during loading:

```typescript
// Before:
<span>{isLoading ? "..." : data.value}</span>

// After:
<span>{isLoading ? <Skeleton className="h-5 w-16 inline-block" /> : data.value}</span>
```

Apply to:
- `client/src/pages/intelligence/dashboard.tsx`
- `client/src/pages/intelligence/accreditation-scorecards.tsx`
- Other Intelligence pages with "..." loading states

**Step 3: Commit**

```bash
git add client/src/pages/intelligence/
git commit -m "fix: replace '...' loading placeholders with Skeleton components"
```

---

### Task 9: Final Full-Platform Verification

**Step 1: Navigate through ALL pillars**

Visit every page across all 5 pillars plus home. For each:
- Does it load? (not stuck on loading)
- Does it show data? (not all zeros)
- Are there console errors? (no CSP, no 429, no 404)

**Step 2: Create final audit summary**

Compare against the original audit log. Document:
- Issues fixed (should be majority)
- Issues remaining (if any)
- New issues discovered (if any)

**Step 3: Commit final audit**

```bash
git add docs/plans/
git commit -m "docs: final audit verification after all 4 phases"
```

---

## Phase 3 Summary

| Task | Page | Issue | Fix |
|------|------|-------|-----|
| Shared Component | N/A | No reusable error UI | Create `QueryErrorState` |
| Coding Intelligence | `/fwa/coding-intelligence` | 4 metrics stuck loading | Add error fallback |
| RLHF Dashboard | `/fwa/rlhf-dashboard` | 4 metrics stuck loading | Add error fallback |
| Graph Analysis | `/fwa/graph-analysis` | Empty table cells | Error handling + field check |
| Simulation Lab | `/fwa/simulation-lab` | Empty Digital Twins tab | Error handling |
| Phase A3 | `/fwa/phase-a3` | "Loading action data..." stuck | Empty state + error |
| Settings | `/fwa/settings` | Semantic stats loading | Error fallback |
| Intelligence Pages | `/intelligence/*` | "..." placeholders | Skeleton components |
| Verification | All | Final check | Full sweep |
