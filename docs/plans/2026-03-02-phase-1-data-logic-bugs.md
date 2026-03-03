# Phase 1: Data & Logic Bug Fixes

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 3 confirmed data/logic bugs: the HHI merger calculation that produces impossible values, the Find a Provider insurer filter that never matches, and the My Coverage display showing "0 / 0 SAR" for null limits.

**Architecture:** These are surgical fixes -- each is a single function or template change with a clear before/after. No new features, no refactoring.

**Tech Stack:** TypeScript (server routes, React components)

**Prerequisites:** Phase 0 must be completed first (rate limiter fix).

---

### Task 1: Fix HHI Merger Calculation (Double-Scaling Bug)

**Files:**
- Modify: `server/routes/pillar-routes.ts:814-821`

**Step 1: Read the buggy code**

Read `server/routes/pillar-routes.ts` lines 764-838. The `buildMarketConcentrationResponse()` function computes HHI.

The bug is at lines 814-821:

```typescript
const resultingHHI =
  Math.round(
    (herfindahlIndex -
      a.share * a.share * 100 -      // BUG: extra *100
      b.share * b.share * 100 +      // BUG: extra *100
      combinedShare * combinedShare * 100) *  // BUG: extra *100
      100,
  ) / 100;
```

**Problem:** `herfindahlIndex` is already computed as `sum(share^2)` at line 773-774 (values like 1163). But the merger adjustment terms multiply by 100 again, producing values like 88,075 (the max HHI is 10,000).

**Step 2: Fix the formula**

Replace lines 814-821 with:

```typescript
    const resultingHHI =
      Math.round(
        (herfindahlIndex -
          a.share * a.share -
          b.share * b.share +
          combinedShare * combinedShare) *
          100,
      ) / 100;
```

This removes the extra `* 100` on each term while keeping the final `* 100 / 100` for 2-decimal rounding.

**Step 3: Verify the fix via API**

```bash
curl -s http://localhost:5001/api/business/market-concentration | jq '.mergerScenarios[] | {scenario, resultingHHI}'
```

Expected: All `resultingHHI` values should be between 0 and 10,000. For example:
- `Bupa Arabia + Tawuniya` should produce ~3,500-4,500 (not 88,075)

**Step 4: Commit**

```bash
git add server/routes/pillar-routes.ts
git commit -m "fix: correct HHI merger calculation double-scaling bug"
```

---

### Task 2: Fix Find a Provider Insurer Filter (Code vs Name Mismatch)

**Files:**
- Modify: `server/routes/pillar-routes.ts:1547-1551`

**Step 1: Understand the bug**

Read `server/routes/pillar-routes.ts` lines 1547-1551:

```typescript
if (insurer) {
  results = results.filter(p =>
    (p.acceptedInsurers || []).some(i => i.toLowerCase().includes((insurer as string).toLowerCase()))
  );
}
```

The problem:
- `p.acceptedInsurers` contains insurer CODES like `["INS-001", "INS-002", ...]`
- The `insurer` query param contains insurer NAMES like `"Bupa Arabia"`
- `"INS-001".includes("bupa arabia")` is always `false`

**Step 2: Read the insurer lookup data**

Read `server/data/portal-seed-data.ts` lines 7-14. The `PORTAL_INSURERS` array maps codes to names:
```typescript
{ code: "INS-001", name: "Bupa Arabia", ... },
{ code: "INS-002", name: "Tawuniya", ... },
```

**Step 3: Fix the filter to resolve codes to names**

Replace lines 1547-1551 with:

```typescript
      if (insurer) {
        const insurerLower = (insurer as string).toLowerCase();
        results = results.filter(p =>
          (p.acceptedInsurers || []).some(code => {
            // Match against code directly OR resolve code to name
            if (code.toLowerCase().includes(insurerLower)) return true;
            // Lookup name from known insurers
            const known = [
              { code: "INS-001", name: "Bupa Arabia" },
              { code: "INS-002", name: "Tawuniya" },
              { code: "INS-003", name: "MedGulf" },
              { code: "INS-004", name: "Al Rajhi Takaful" },
              { code: "INS-005", name: "SAICO" },
              { code: "INS-006", name: "Walaa Insurance" },
            ];
            const match = known.find(k => k.code === code);
            return match ? match.name.toLowerCase().includes(insurerLower) : false;
          })
        );
      }
```

**Step 4: Verify the fix**

```bash
curl -s "http://localhost:5001/api/members/portal/providers?city=Jeddah&insurer=Bupa+Arabia&sortBy=rating" | jq '.data | length'
```

Expected: `7` (not `0`)

**Step 5: Commit**

```bash
git add server/routes/pillar-routes.ts
git commit -m "fix: resolve insurer codes to names in Find a Provider filter"
```

---

### Task 3: Fix My Coverage "0 / 0 SAR" Display

**Files:**
- Modify: `client/src/pages/members/my-coverage.tsx:289-334`

**Step 1: Read the current rendering code**

Read `client/src/pages/members/my-coverage.tsx` lines 287-340.

The bug is at lines 289-295 and 323-328:

```typescript
const limitSar = Number(cat.limitSar);    // null -> NaN -> 0
const usedSar = Number(cat.usedSar);
// ...
<span>
  {usedSar.toLocaleString()} / {limitSar.toLocaleString()} SAR
</span>
```

When `limitSar` is `null` (meaning unlimited or unit-based), `Number(null)` = `0`, displaying "0 / 0 SAR".

**Step 2: Fix the display logic**

Replace lines 289-295 with:

```typescript
            const limitSar = cat.limitSar ? Number(cat.limitSar) : null;
            const usedSar = Number(cat.usedSar || 0);
            const limitUnits = cat.limitUnits ? Number(cat.limitUnits) : null;
            const usedUnits = cat.usedUnits ? Number(cat.usedUnits) : null;
            const copay = Number(cat.copayPercent || 0);
            const usedPercent =
              limitSar && limitSar > 0 ? Math.min((usedSar / limitSar) * 100, 100) : 0;
```

Then replace lines 322-329 (the SAR display span) with:

```typescript
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {limitSar !== null
                          ? `${usedSar.toLocaleString()} / ${limitSar.toLocaleString()} SAR`
                          : limitUnits !== null
                            ? `${usedUnits ?? 0} / ${limitUnits} units`
                            : "Unlimited"}
                      </span>
                      <span>
                        {limitSar !== null ? `${usedPercent.toFixed(0)}%` :
                         limitUnits !== null && limitUnits > 0
                           ? `${Math.min(((usedUnits ?? 0) / limitUnits) * 100, 100).toFixed(0)}%`
                           : ""}
                      </span>
                    </div>
```

**Step 3: Verify the fix**

Navigate to `http://localhost:5001/members/my-health`. The Coverage Breakdown cards should now show:
- SAR-based categories: `1,200 / 50,000 SAR` with percentage
- Unit-based categories: `12 / 150 units` with percentage
- Unlimited categories: `Unlimited`

No cards should show `0 / 0 SAR`.

**Step 4: Commit**

```bash
git add client/src/pages/members/my-coverage.tsx
git commit -m "fix: display Unlimited or units for null SAR coverage limits"
```

---

### Task 4: Add Error State to KPI Dashboard

**Files:**
- Modify: `client/src/pages/fwa/kpi-dashboard.tsx:87-115`

**Step 1: Read the current loading state**

Read `client/src/pages/fwa/kpi-dashboard.tsx` lines 87-115. The query has no error handling:

```typescript
const { data: stats, isLoading } = useQuery<KpiStats>({
  queryKey: ["/api/fwa/kpi-stats"],
});

if (isLoading) {
  return ( /* Skeleton forever if API fails */ );
}
```

**Step 2: Add error handling to the query**

Replace lines 87-89 with:

```typescript
  const { data: stats, isLoading, error } = useQuery<KpiStats>({
    queryKey: ["/api/fwa/kpi-stats"],
    retry: 2,
    staleTime: 5 * 60 * 1000,
  });
```

**Step 3: Add error UI**

After the `if (isLoading)` block (after line 115), add:

```typescript
  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">FWA Impact Dashboard</h1>
          <p className="text-muted-foreground">Real-time fraud analytics</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load KPI data</h3>
            <p className="text-muted-foreground mb-4">{error.message}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
```

**Step 4: Verify imports**

Make sure `AlertCircle` is imported from lucide-react and `Button` and `Card`/`CardContent` are imported. Check the existing imports at the top of the file.

**Step 5: Verify the error state renders properly**

Temporarily change the query key to a non-existent endpoint, verify the error UI shows, then revert.

**Step 6: Commit**

```bash
git add client/src/pages/fwa/kpi-dashboard.tsx
git commit -m "fix: add error handling and retry to KPI dashboard"
```

---

## Phase 1 Summary

| Task | Bug | Files Changed | Impact |
|------|-----|--------------|--------|
| HHI Fix | Merger values 88,075 instead of max 10,000 | `pillar-routes.ts` | Business Market Concentration |
| Insurer Filter | Find a Provider always returns empty | `pillar-routes.ts` | Members Find a Provider |
| Coverage Display | "0 / 0 SAR" for null limits | `my-coverage.tsx` | Members My Coverage |
| KPI Error State | Perpetual loading on API failure | `kpi-dashboard.tsx` | FWA KPI Dashboard |
