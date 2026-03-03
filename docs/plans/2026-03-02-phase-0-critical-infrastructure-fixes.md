# Phase 0: Critical Infrastructure Fixes

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the 2 infrastructure issues that cause 80%+ of all audit failures: the aggressive rate limiter and the missing Pre-Auth client routes.

**Architecture:** The rate limiter at 100 req/15min causes 429 errors after browsing ~15 pages, making fully-implemented pages appear blank. The Pre-Auth module has all 13 page components, a sidebar layout, and server APIs -- only the client router entry in App.tsx is missing.

**Tech Stack:** Express (rate-limit), React (wouter router), Helmet (CSP)

---

### Task 1: Fix API Rate Limiter

**Files:**
- Modify: `server/index.ts:42-50`

**Step 1: Open the rate limiter config**

Read `server/index.ts` lines 42-50. You'll see:

```typescript
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.path.startsWith('/api'), // Only limit API routes
});
app.use(apiLimiter);
```

**Step 2: Increase the limit and make it environment-aware**

Replace lines 42-50 with:

```typescript
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 300 : 1000,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.path.startsWith('/api'),
});
app.use(apiLimiter);
```

**Step 3: Verify the server restarts without errors**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5001/api/fwa/stats`
Expected: `200`

**Step 4: Verify rate limiting no longer blocks normal browsing**

Run this rapid-fire test (30 requests in quick succession):
```bash
for i in $(seq 1 30); do curl -s -o /dev/null -w "%{http_code} " http://localhost:5001/api/fwa/stats; done
```
Expected: All `200` (no `429`)

**Step 5: Commit**

```bash
git add server/index.ts
git commit -m "fix: increase API rate limit to prevent 429 errors during normal browsing"
```

---

### Task 2: Fix CSP to Allow Google Fonts

**Files:**
- Modify: `server/index.ts:16-28`

**Step 1: Read the current Helmet CSP config**

Read `server/index.ts` lines 16-28:

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
```

**Step 2: Add Google Fonts domains**

Replace lines 16-28 with:

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
```

**Step 3: Verify no console errors**

Open browser to `http://localhost:5001/` and check console. Should see zero CSP errors.

**Step 4: Commit**

```bash
git add server/index.ts
git commit -m "fix: add Google Fonts domains to CSP directives"
```

---

### Task 3: Add Pre-Auth Client Routes

**Files:**
- Modify: `client/src/App.tsx:1-242`

**Step 1: Add Pre-Auth page imports**

After line 82 (after the last FWA import `import KnowledgeHub from ...`), add:

```typescript
import { PreAuthLayout } from "@/components/pre-auth/pre-auth-layout";
import PreAuthDashboard from "@/pages/pre-auth/dashboard";
import PreAuthClaims from "@/pages/pre-auth/claims";
import PreAuthPending from "@/pages/pre-auth/pending";
import PreAuthNewClaim from "@/pages/pre-auth/new-claim";
import PreAuthAnalytics from "@/pages/pre-auth/analytics";
import PreAuthKnowledgeBase from "@/pages/pre-auth/knowledge-base";
import PreAuthPolicyRules from "@/pages/pre-auth/policy-rules";
import PreAuthAgentConfig from "@/pages/pre-auth/agent-config";
import PreAuthBatchUpload from "@/pages/pre-auth/batch-upload";
import PreAuthRLHF from "@/pages/pre-auth/rlhf";
import PreAuthSettings from "@/pages/pre-auth/settings";
import PreAuthClaimDetail from "@/pages/pre-auth/claim-detail";
import PreAuthWorkflowPhase from "@/pages/pre-auth/workflow-phase";
```

**Step 2: Add PreAuthRouter function**

After `MembersRouter()` (after line 151), add:

```typescript
function PreAuthRouter() {
  return (
    <PreAuthLayout>
      <Switch>
        <Route path="/pre-auth">{() => <Redirect to="/pre-auth/dashboard" />}</Route>
        <Route path="/pre-auth/dashboard" component={PreAuthDashboard} />
        <Route path="/pre-auth/claims" component={PreAuthClaims} />
        <Route path="/pre-auth/claims/:id" component={PreAuthClaimDetail} />
        <Route path="/pre-auth/pending" component={PreAuthPending} />
        <Route path="/pre-auth/new-claim" component={PreAuthNewClaim} />
        <Route path="/pre-auth/analytics" component={PreAuthAnalytics} />
        <Route path="/pre-auth/knowledge-base" component={PreAuthKnowledgeBase} />
        <Route path="/pre-auth/policy-rules" component={PreAuthPolicyRules} />
        <Route path="/pre-auth/agent-config" component={PreAuthAgentConfig} />
        <Route path="/pre-auth/batch-upload" component={PreAuthBatchUpload} />
        <Route path="/pre-auth/rlhf" component={PreAuthRLHF} />
        <Route path="/pre-auth/settings" component={PreAuthSettings} />
        <Route path="/pre-auth/workflow/:phase" component={PreAuthWorkflowPhase} />
        <Route component={NotFound} />
      </Switch>
    </PreAuthLayout>
  );
}
```

**Step 3: Register the router in AppRouter**

In the `AppRouter()` function, add a Pre-Auth condition. After the `/members` block (after line 239), and before the `return <NotFound />;` line, add:

```typescript
  if (location.startsWith("/pre-auth")) {
    return <PreAuthRouter />;
  }
```

**Step 4: Verify Pre-Auth pages load**

Navigate to `http://localhost:5001/pre-auth/dashboard` in the browser.
Expected: Pre-Auth dashboard renders with sidebar navigation.

**Step 5: Verify all Pre-Auth routes work**

Test each route:
```bash
for path in dashboard claims pending new-claim analytics knowledge-base policy-rules agent-config batch-upload rlhf settings; do
  echo -n "/pre-auth/$path -> "
  curl -s -o /dev/null -w "%{http_code}" "http://localhost:5001/pre-auth/$path"
  echo
done
```
Expected: All return `200` (not `404`)

**Step 6: Commit**

```bash
git add client/src/App.tsx
git commit -m "feat: add Pre-Auth module client routes (11 pages)"
```

---

### Task 4: Re-Audit After Infrastructure Fixes

**Step 1: Restart the server**

The server should auto-restart via Vite HMR. If not:
```bash
npm run dev
```

**Step 2: Quick-audit previously "blank" FWA pages**

Navigate to each of these pages and verify they now render content:
- `http://localhost:5001/fwa/flagged-claims` -- should show claims table
- `http://localhost:5001/fwa/engine-config` -- should show ML feature config
- `http://localhost:5001/fwa/rule-studio` -- should show rules management
- `http://localhost:5001/fwa/history-agents` -- should show agent metrics
- `http://localhost:5001/fwa/behaviors` -- should show behavior rules
- `http://localhost:5001/fwa/kpi-dashboard` -- should show KPI metrics
- `http://localhost:5001/fwa/regulatory-oversight` -- should show dashboard
- `http://localhost:5001/fwa/phase-a2` -- should show categories

**Step 3: Document which issues persist**

After the rate limiter fix, create a checklist of which pages still have issues. These become the Phase 1/2/3 targets.

**Step 4: Commit the updated audit log**

```bash
git add docs/plans/
git commit -m "docs: update audit log after Phase 0 infrastructure fixes"
```

---

## Phase 0 Summary

| Task | What It Fixes | Issues Resolved |
|------|--------------|-----------------|
| Rate Limiter | 429 errors causing blank/loading pages | ~20 pages that appeared broken |
| CSP Fonts | Console errors on every page | 2 errors per page globally |
| Pre-Auth Routes | 11 pages returning 404 | PA-001 through PA-011 |
| Re-Audit | Identifies remaining real issues | Reduces P1-P3 scope |
