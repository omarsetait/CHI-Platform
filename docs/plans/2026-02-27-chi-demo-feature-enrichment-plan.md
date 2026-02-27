# CHI Demo Feature Enrichment — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enrich all four pillars of the CHI Platform for a high-stakeholder demo — simplify FWA to a regulatory command center (70% effort) and build out Intelligence, Business, and Members ecosystem pillars with research-backed features (30% effort).

**Architecture:** The platform uses a pillar-based architecture where each pillar has a config file (nav structure, theme), a layout wrapper, page components, and API routes. New features modify pillar configs, replace existing dashboard tab content, add new pages, and create API routes returning synthetic demo data. The CPOE MCP server data patterns inform the medical coding intelligence features.

**Tech Stack:** React 18 + TypeScript, Vite, Tailwind CSS + shadcn/ui, Recharts, Wouter routing, Express.js backend, Drizzle ORM + PostgreSQL, TanStack Query, Playwright E2E tests.

**Design doc:** `docs/plans/2026-02-27-chi-demo-feature-enrichment-design.md`

---

## Phase 1: FWA Pillar Simplification & Enhancement

### Task 1: Simplify FWA Navigation Config

**Files:**
- Modify: `client/src/pillars/config/fwa.ts`

**Step 1: Write the E2E test for new nav structure**

Add a test to verify the simplified 6-item FWA navigation.

Create: `e2e/fwa-simplified-nav.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

const expectedNavItems = [
  { testId: "nav-fwa-command-center", label: "Command Center" },
  { testId: "nav-fwa-high-risk-entities", label: "High-Risk Entities" },
  { testId: "nav-fwa-flagged-claims", label: "Flagged Claims" },
  { testId: "nav-fwa-online-listening", label: "Online Listening" },
  { testId: "nav-fwa-enforcement-compliance", label: "Enforcement & Compliance" },
  { testId: "nav-fwa-intelligence-reports", label: "Intelligence Reports" },
];

test.describe("FWA simplified navigation", () => {
  test("shows exactly 6 nav items in the sidebar", async ({ page }) => {
    await page.goto("/fwa/dashboard");
    for (const item of expectedNavItems) {
      await expect(page.getByTestId(item.testId)).toBeVisible();
    }
  });

  test("does NOT show old detection engine nav items", async ({ page }) => {
    await page.goto("/fwa/dashboard");
    await expect(page.getByTestId("nav-fwa-detection-engine")).not.toBeVisible();
    await expect(page.getByTestId("nav-fwa-rule-studio")).not.toBeVisible();
    await expect(page.getByTestId("nav-fwa-agent-orchestration")).not.toBeVisible();
    await expect(page.getByTestId("nav-fwa-ml-analysis")).not.toBeVisible();
    await expect(page.getByTestId("nav-fwa-settings")).not.toBeVisible();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx playwright test e2e/fwa-simplified-nav.spec.ts --headed`
Expected: FAIL — old nav items still visible, new items missing.

**Step 3: Rewrite FWA pillar config with simplified navigation**

Replace the contents of `client/src/pillars/config/fwa.ts`:

```typescript
import { Shield, Command, AlertTriangle, FileSearch, Rss, Gavel, BarChart3 } from "lucide-react";
import type { PillarConfig } from "../types";

export const fwaPillarConfig: PillarConfig = {
  id: "fwa",
  label: "Audit & FWA Unit",
  basePath: "/fwa",
  defaultRoute: "/fwa/dashboard",
  icon: Shield,
  subtitle: "National fraud intelligence command center",
  navSections: [
    {
      title: "Regulatory Oversight",
      items: [
        { label: "Command Center", href: "/fwa/dashboard", icon: Command },
        { label: "High-Risk Entities", href: "/fwa/high-risk-entities", icon: AlertTriangle },
        { label: "Flagged Claims", href: "/fwa/flagged-claims", icon: FileSearch },
        { label: "Online Listening", href: "/fwa/online-listening", icon: Rss, badge: "Live" },
      ],
    },
    {
      title: "Action & Intelligence",
      items: [
        { label: "Enforcement & Compliance", href: "/fwa/enforcement", icon: Gavel },
        { label: "Intelligence Reports", href: "/fwa/kpi-dashboard", icon: BarChart3 },
      ],
    },
  ],
  footer: {
    title: "Audit & FWA Unit",
    subtitle: "Council of Health Insurance",
  },
  theme: {
    borderClass: "border-purple-200 dark:border-purple-800",
    sectionLabelClass: "text-purple-500 dark:text-purple-400",
    headerIconClass: "text-purple-600 dark:text-purple-400",
    headerTextClass: "text-purple-700 dark:text-purple-300",
    badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    accentBackgroundClass: "bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-gray-950",
  },
  sidebarWidth: "17rem",
  sidebarIconWidth: "3.5rem",
};
```

**Step 4: Run test to verify it passes**

Run: `npx playwright test e2e/fwa-simplified-nav.spec.ts --headed`
Expected: PASS

**Step 5: Commit**

```bash
git add client/src/pillars/config/fwa.ts e2e/fwa-simplified-nav.spec.ts
git commit -m "refactor(fwa): simplify navigation to 6 regulatory-focused items"
```

---

### Task 2: Create Flagged Claims Page

**Files:**
- Create: `client/src/pages/fwa/flagged-claims.tsx`
- Modify: `client/src/App.tsx` (add route)
- Modify: `server/routes/fwa-routes.ts` (add API endpoint)

**Step 1: Add the API route for flagged claims**

Add to `server/routes/fwa-routes.ts` near the top of the route registrations, inside `registerFwaRoutes`:

```typescript
  // Flagged Claims endpoint - returns claims flagged by AI across insurers
  app.get("/api/fwa/flagged-claims", async (_req, res) => {
    try {
      const flaggedClaims = [
        {
          id: "FC-2026-001",
          claimId: "CLM-98234",
          patientName: "Ahmed Al-Dosari",
          providerId: "PRV-1042",
          providerName: "Al-Hayat Medical Center",
          insurerName: "Bupa Arabia",
          icdCode: "K02.9",
          icdDescription: "Dental caries, unspecified",
          cptCode: "D2740",
          cptDescription: "Crown - porcelain/ceramic",
          claimAmount: 4500,
          flagReason: "Phantom billing — crown procedure billed without prior examination record",
          flagCategory: "dental_phantom_billing",
          riskScore: 92,
          detectedAt: "2026-02-25T14:30:00Z",
          status: "under_review",
          detectionMethod: "Rule Engine + Statistical",
        },
        {
          id: "FC-2026-002",
          claimId: "CLM-87412",
          patientName: "Fatima Al-Harbi",
          providerId: "PRV-2087",
          providerName: "Riyadh Women's Hospital",
          insurerName: "Tawuniya",
          icdCode: "O80",
          icdDescription: "Single spontaneous delivery",
          cptCode: "59510",
          cptDescription: "Cesarean delivery with postpartum care",
          claimAmount: 28000,
          flagReason: "Upcoding — normal delivery billed as cesarean section",
          flagCategory: "obgyn_upcoding",
          riskScore: 88,
          detectedAt: "2026-02-24T09:15:00Z",
          status: "confirmed_fraud",
          detectionMethod: "Semantic Validation + RAG",
        },
        {
          id: "FC-2026-003",
          claimId: "CLM-76543",
          patientName: "Mohammed Al-Qahtani",
          providerId: "PRV-1042",
          providerName: "Al-Hayat Medical Center",
          insurerName: "MedGulf",
          icdCode: "M54.5",
          icdDescription: "Low back pain",
          cptCode: "99215",
          cptDescription: "Office visit, established patient, high complexity",
          claimAmount: 850,
          flagReason: "Specialist referral churning — 4th referral in circular pattern within 30 days",
          flagCategory: "referral_churning",
          riskScore: 76,
          detectedAt: "2026-02-26T11:45:00Z",
          status: "under_review",
          detectionMethod: "Graph Analysis",
        },
        {
          id: "FC-2026-004",
          claimId: "CLM-65321",
          patientName: "Sara Al-Otaibi",
          providerId: "PRV-3015",
          providerName: "Jeddah Dental Clinic",
          insurerName: "Bupa Arabia",
          icdCode: "K08.1",
          icdDescription: "Loss of teeth due to extraction",
          cptCode: "D7210",
          cptDescription: "Surgical removal of erupted tooth",
          claimAmount: 2200,
          flagReason: "Duplicate claim — same service submitted to Bupa and Tawuniya within 48 hours",
          flagCategory: "duplicate_cross_insurer",
          riskScore: 95,
          detectedAt: "2026-02-23T16:20:00Z",
          status: "confirmed_fraud",
          detectionMethod: "Rule Engine",
        },
        {
          id: "FC-2026-005",
          claimId: "CLM-54219",
          patientName: "Khalid Al-Shehri",
          providerId: "PRV-4023",
          providerName: "Eastern Province Medical Group",
          insurerName: "SAICO",
          icdCode: "J18.9",
          icdDescription: "Pneumonia, unspecified organism",
          cptCode: "99223",
          cptDescription: "Initial hospital care, high complexity",
          claimAmount: 15600,
          flagReason: "Billing anomaly — inpatient admission for condition typically treated outpatient",
          flagCategory: "unnecessary_admission",
          riskScore: 71,
          detectedAt: "2026-02-26T08:00:00Z",
          status: "pending_investigation",
          detectionMethod: "RAG/LLM + Statistical",
        },
        {
          id: "FC-2026-006",
          claimId: "CLM-43187",
          patientName: "Noura Al-Ghamdi",
          providerId: "PRV-2087",
          providerName: "Riyadh Women's Hospital",
          insurerName: "Walaa",
          icdCode: "O34.21",
          icdDescription: "Maternal care for scar from previous cesarean",
          cptCode: "59612",
          cptDescription: "VBAC with postpartum care",
          claimAmount: 32000,
          flagReason: "Unbundling — post-operative care separately billed despite global period",
          flagCategory: "unbundling",
          riskScore: 84,
          detectedAt: "2026-02-25T13:10:00Z",
          status: "under_review",
          detectionMethod: "Rule Engine + Semantic",
        },
      ];

      const summary = {
        totalFlagged: flaggedClaims.length,
        totalExposure: flaggedClaims.reduce((sum, c) => sum + c.claimAmount, 0),
        confirmedFraud: flaggedClaims.filter((c) => c.status === "confirmed_fraud").length,
        underReview: flaggedClaims.filter((c) => c.status === "under_review").length,
        pendingInvestigation: flaggedClaims.filter((c) => c.status === "pending_investigation").length,
        byCategory: {
          dental_phantom_billing: flaggedClaims.filter((c) => c.flagCategory === "dental_phantom_billing").length,
          obgyn_upcoding: flaggedClaims.filter((c) => c.flagCategory === "obgyn_upcoding").length,
          referral_churning: flaggedClaims.filter((c) => c.flagCategory === "referral_churning").length,
          duplicate_cross_insurer: flaggedClaims.filter((c) => c.flagCategory === "duplicate_cross_insurer").length,
          unnecessary_admission: flaggedClaims.filter((c) => c.flagCategory === "unnecessary_admission").length,
          unbundling: flaggedClaims.filter((c) => c.flagCategory === "unbundling").length,
        },
      };

      res.json({ claims: flaggedClaims, summary });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/flagged-claims", "fetching flagged claims");
    }
  });
```

**Step 2: Create the Flagged Claims page component**

Create: `client/src/pages/fwa/flagged-claims.tsx`

```tsx
import { useQuery } from "@tanstack/react-query";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  FileSearch, AlertTriangle, DollarSign, ShieldAlert, Clock, CheckCircle2,
} from "lucide-react";
import { useState } from "react";

interface FlaggedClaim {
  id: string;
  claimId: string;
  patientName: string;
  providerId: string;
  providerName: string;
  insurerName: string;
  icdCode: string;
  icdDescription: string;
  cptCode: string;
  cptDescription: string;
  claimAmount: number;
  flagReason: string;
  flagCategory: string;
  riskScore: number;
  detectedAt: string;
  status: string;
  detectionMethod: string;
}

interface FlaggedClaimsSummary {
  totalFlagged: number;
  totalExposure: number;
  confirmedFraud: number;
  underReview: number;
  pendingInvestigation: number;
  byCategory: Record<string, number>;
}

const categoryLabels: Record<string, string> = {
  dental_phantom_billing: "Dental Phantom Billing",
  obgyn_upcoding: "OB/GYN Upcoding",
  referral_churning: "Referral Churning",
  duplicate_cross_insurer: "Duplicate Cross-Insurer",
  unnecessary_admission: "Unnecessary Admission",
  unbundling: "Unbundling",
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  confirmed_fraud: { label: "Confirmed Fraud", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", icon: ShieldAlert },
  under_review: { label: "Under Review", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200", icon: Clock },
  pending_investigation: { label: "Pending Investigation", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: FileSearch },
};

function formatCurrency(amount: number): string {
  return `SAR ${amount.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-SA", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function FlaggedClaimsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading } = useQuery<{ claims: FlaggedClaim[]; summary: FlaggedClaimsSummary }>({
    queryKey: ["/api/fwa/flagged-claims"],
  });

  const claims = data?.claims ?? [];
  const summary = data?.summary;

  const filtered = claims.filter((c) => {
    const matchesSearch =
      !searchTerm ||
      c.providerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.claimId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.patientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || c.flagCategory === categoryFilter;
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSearch className="h-6 w-6 text-purple-600" />
          Flagged Claims
          <span className="text-base text-muted-foreground font-normal mr-2">المطالبات المُبلّغة</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          Claims flagged by AI detection across all insurers
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Flagged</p>
                <p className="text-2xl font-bold">{summary?.totalFlagged ?? 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Exposure</p>
                <p className="text-2xl font-bold">{formatCurrency(summary?.totalExposure ?? 0)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confirmed Fraud</p>
                <p className="text-2xl font-bold text-red-600">{summary?.confirmedFraud ?? 0}</p>
              </div>
              <ShieldAlert className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Under Review</p>
                <p className="text-2xl font-bold text-amber-600">{summary?.underReview ?? 0}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by provider, claim ID, or patient..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(categoryLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="confirmed_fraud">Confirmed Fraud</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="pending_investigation">Pending Investigation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Claims Table */}
      <Card>
        <CardHeader>
          <CardTitle>Flagged Claims ({filtered.length})</CardTitle>
          <CardDescription>AI-detected anomalies across Saudi healthcare insurers</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim ID</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Insurer</TableHead>
                <TableHead>ICD / CPT</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Detected</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((claim) => {
                const status = statusConfig[claim.status];
                return (
                  <TableRow key={claim.id}>
                    <TableCell className="font-mono text-sm">{claim.claimId}</TableCell>
                    <TableCell>
                      <div className="font-medium">{claim.providerName}</div>
                      <div className="text-xs text-muted-foreground">{claim.patientName}</div>
                    </TableCell>
                    <TableCell>{claim.insurerName}</TableCell>
                    <TableCell>
                      <div className="text-xs font-mono">
                        <span className="text-blue-600">{claim.icdCode}</span>
                        {" / "}
                        <span className="text-green-600">{claim.cptCode}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {claim.flagReason}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">{formatCurrency(claim.claimAmount)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={claim.riskScore} className="w-16 h-2" />
                        <span className="text-sm font-medium">{claim.riskScore}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs whitespace-nowrap">
                        {categoryLabels[claim.flagCategory] ?? claim.flagCategory}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${status?.color ?? ""}`}>
                        {status?.label ?? claim.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(claim.detectedAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: Add the route in App.tsx**

In `client/src/App.tsx`, inside the FWA router's `<Switch>`, add:

```tsx
<Route path="/fwa/flagged-claims" component={FlaggedClaimsPage} />
```

And add the import at the top:

```tsx
import FlaggedClaimsPage from "@/pages/fwa/flagged-claims";
```

**Step 4: Run E2E test to verify navigation works**

Run: `npx playwright test e2e/fwa-simplified-nav.spec.ts --headed`
Expected: PASS — Flagged Claims nav item visible and navigable.

**Step 5: Commit**

```bash
git add client/src/pages/fwa/flagged-claims.tsx server/routes/fwa-routes.ts client/src/App.tsx
git commit -m "feat(fwa): add flagged claims page with Saudi-specific fraud scenarios"
```

---

### Task 3: Enhance Command Center (Operations Center Rename)

**Files:**
- Modify: `client/src/pages/fwa/dashboard.tsx`

**Step 1: Update the dashboard header to "Command Center" with Arabic**

In `client/src/pages/fwa/dashboard.tsx`, find the page title section and update:

Replace the existing title/header with:

```tsx
<h1 className="text-2xl font-bold flex items-center gap-2">
  <Command className="h-6 w-6 text-purple-600" />
  Command Center
  <span className="text-base text-muted-foreground font-normal mr-2">مركز القيادة</span>
</h1>
<p className="text-muted-foreground">
  National fraud intelligence overview — Council of Health Insurance
</p>
```

Add `Command` to the lucide-react imports.

**Step 2: Add NPHIES integration flow card**

Add a new card section after the existing Key Metrics section:

```tsx
{/* NPHIES Integration Flow */}
<Card>
  <CardHeader>
    <CardTitle className="text-lg">NPHIES Detection Pipeline</CardTitle>
    <CardDescription>Claim journey through the TachyHealth intelligence layer</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="flex items-center justify-between gap-2 text-sm">
      {[
        { label: "Provider", sublabel: "مقدم الخدمة", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
        { label: "NPHIES", sublabel: "نفيس", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
        { label: "TachyHealth AI", sublabel: "الكشف الذكي", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
        { label: "Decision", sublabel: "القرار", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
        { label: "Insurer", sublabel: "شركة التأمين", color: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200" },
      ].map((step, i) => (
        <div key={step.label} className="flex items-center gap-2">
          <div className={`px-4 py-3 rounded-lg text-center ${step.color}`}>
            <div className="font-semibold">{step.label}</div>
            <div className="text-xs opacity-75">{step.sublabel}</div>
          </div>
          {i < 4 && <span className="text-muted-foreground text-lg">→</span>}
        </div>
      ))}
    </div>
  </CardContent>
</Card>
```

**Step 3: Verify the page renders**

Run: `npx playwright test e2e/fwa-simplified-nav.spec.ts --headed`
Expected: PASS — Command Center loads with updated title and NPHIES flow.

**Step 4: Commit**

```bash
git add client/src/pages/fwa/dashboard.tsx
git commit -m "feat(fwa): rename operations center to command center with NPHIES flow"
```

---

### Task 4: Create CPOE Medical Coding Intelligence Page

This page shows medical coding intelligence powered by CPOE data patterns. It provides ICD-CPT pair validation, rejection trends, and frequency analysis.

**Files:**
- Create: `client/src/pages/fwa/coding-intelligence.tsx`
- Modify: `server/routes/fwa-routes.ts` (add API endpoints)
- Modify: `client/src/App.tsx` (add route)
- Modify: `client/src/pillars/config/fwa.ts` (add nav item)

**Step 1: Add CPOE API routes**

Add to `server/routes/fwa-routes.ts`:

```typescript
  // CPOE Medical Coding Intelligence endpoints
  app.get("/api/fwa/cpoe/rejection-trends", async (_req, res) => {
    try {
      const trends = [
        { month: "Sep 2025", total: 12450, accepted: 10580, rejected: 1870, acceptanceRate: 85.0 },
        { month: "Oct 2025", total: 13200, accepted: 11352, rejected: 1848, acceptanceRate: 86.0 },
        { month: "Nov 2025", total: 14100, accepted: 12267, rejected: 1833, acceptanceRate: 87.0 },
        { month: "Dec 2025", total: 13800, accepted: 11868, rejected: 1932, acceptanceRate: 86.0 },
        { month: "Jan 2026", total: 15200, accepted: 13376, rejected: 1824, acceptanceRate: 88.0 },
        { month: "Feb 2026", total: 14500, accepted: 12905, rejected: 1595, acceptanceRate: 89.0 },
      ];
      res.json({ trends });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/cpoe/rejection-trends", "fetching rejection trends");
    }
  });

  app.get("/api/fwa/cpoe/frequency-table", async (_req, res) => {
    try {
      const pairs = [
        { icd: "Z23", icdDesc: "Encounter for immunization", cpt: "90686", cptDesc: "Influenza vaccine", total: 8420, acceptanceRate: 94.2 },
        { icd: "J18.9", icdDesc: "Pneumonia, unspecified", cpt: "71046", cptDesc: "Chest X-ray, 2 views", total: 5230, acceptanceRate: 91.8 },
        { icd: "E11.9", icdDesc: "Type 2 diabetes", cpt: "99213", cptDesc: "Office visit, established", total: 12100, acceptanceRate: 96.1 },
        { icd: "K02.9", icdDesc: "Dental caries", cpt: "D2740", cptDesc: "Crown porcelain", total: 3400, acceptanceRate: 72.3 },
        { icd: "M54.5", icdDesc: "Low back pain", cpt: "97110", cptDesc: "Therapeutic exercises", total: 6800, acceptanceRate: 88.5 },
        { icd: "I10", icdDesc: "Essential hypertension", cpt: "99214", cptDesc: "Office visit, moderate", total: 9500, acceptanceRate: 95.7 },
        { icd: "O80", icdDesc: "Spontaneous delivery", cpt: "59510", cptDesc: "Cesarean delivery", total: 1200, acceptanceRate: 34.1 },
        { icd: "J06.9", icdDesc: "Upper respiratory infection", cpt: "99215", cptDesc: "Office visit, high", total: 2800, acceptanceRate: 41.2 },
        { icd: "N39.0", icdDesc: "Urinary tract infection", cpt: "81001", cptDesc: "Urinalysis", total: 7200, acceptanceRate: 97.3 },
        { icd: "F32.9", icdDesc: "Major depressive disorder", cpt: "90834", cptDesc: "Psychotherapy, 45 min", total: 4100, acceptanceRate: 92.6 },
      ];
      res.json({ pairs });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/cpoe/frequency-table", "fetching frequency table");
    }
  });

  app.post("/api/fwa/cpoe/validate-pair", async (req, res) => {
    try {
      const { icdCode, cptCode } = req.body;
      // Demo decision logic
      const knownRejections: Record<string, string> = {
        "O80-59510": "Diagnosis O80 (spontaneous delivery) is inconsistent with CPT 59510 (cesarean). Expected 59400 for vaginal delivery.",
        "J06.9-99215": "J06.9 (URI) does not support high-complexity visit 99215. Recommend 99213 or 99212.",
        "K02.9-D2740": "Low acceptance rate (72.3%). Crown procedure requires documented prior exam and X-ray.",
      };
      const key = `${icdCode}-${cptCode}`;
      const isRejected = key in knownRejections;
      res.json({
        icdCode,
        cptCode,
        decision: isRejected ? "REJECT" : "ACCEPT",
        confidence: isRejected ? 0.92 : 0.88,
        reason: isRejected
          ? knownRejections[key]
          : `ICD ${icdCode} and CPT ${cptCode} are clinically consistent. Pair has high historical acceptance rate.`,
        historicalAcceptanceRate: isRejected ? 34.1 : 94.2,
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/cpoe/validate-pair", "validating ICD-CPT pair");
    }
  });

  app.get("/api/fwa/cpoe/processing-metrics", async (_req, res) => {
    try {
      res.json({
        avgProcessingTimeMs: 847,
        totalProcessed: 83150,
        commonRejectionReasons: [
          { reason: "Diagnosis-procedure mismatch", count: 2340, percentage: 28.1 },
          { reason: "Missing pre-authorization", count: 1890, percentage: 22.7 },
          { reason: "Duplicate claim submission", count: 1450, percentage: 17.4 },
          { reason: "Service not in benefits package", count: 1120, percentage: 13.5 },
          { reason: "Provider not accredited for service", count: 870, percentage: 10.5 },
          { reason: "Exceeded frequency limit", count: 650, percentage: 7.8 },
        ],
      });
    } catch (error) {
      handleRouteError(res, error, "/api/fwa/cpoe/processing-metrics", "fetching processing metrics");
    }
  });
```

**Step 2: Create the CPOE Intelligence page component**

Create: `client/src/pages/fwa/coding-intelligence.tsx`

```tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  Stethoscope, Search, CheckCircle2, XCircle, TrendingUp, Clock, AlertTriangle,
} from "lucide-react";

interface ValidationResult {
  icdCode: string;
  cptCode: string;
  decision: "ACCEPT" | "REJECT";
  confidence: number;
  reason: string;
  historicalAcceptanceRate: number;
}

export default function CodingIntelligencePage() {
  const [icdInput, setIcdInput] = useState("");
  const [cptInput, setCptInput] = useState("");
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const { data: trends } = useQuery<{ trends: Array<{ month: string; total: number; accepted: number; rejected: number; acceptanceRate: number }> }>({
    queryKey: ["/api/fwa/cpoe/rejection-trends"],
  });

  const { data: frequency } = useQuery<{ pairs: Array<{ icd: string; icdDesc: string; cpt: string; cptDesc: string; total: number; acceptanceRate: number }> }>({
    queryKey: ["/api/fwa/cpoe/frequency-table"],
  });

  const { data: metrics } = useQuery<{
    avgProcessingTimeMs: number;
    totalProcessed: number;
    commonRejectionReasons: Array<{ reason: string; count: number; percentage: number }>;
  }>({
    queryKey: ["/api/fwa/cpoe/processing-metrics"],
  });

  const handleValidate = async () => {
    if (!icdInput || !cptInput) return;
    setIsValidating(true);
    try {
      const response = await apiRequest("POST", "/api/fwa/cpoe/validate-pair", {
        icdCode: icdInput.toUpperCase(),
        cptCode: cptInput,
      });
      const result = await response.json();
      setValidationResult(result);
    } catch {
      setValidationResult(null);
    } finally {
      setIsValidating(false);
    }
  };

  const COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#06b6d4", "#10b981"];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Stethoscope className="h-6 w-6 text-purple-600" />
          Medical Coding Intelligence
          <span className="text-base text-muted-foreground font-normal mr-2">ذكاء الترميز الطبي</span>
        </h1>
        <p className="text-muted-foreground mt-1">
          CPOE engine decisions, rejection analytics, and ICD-CPT validation
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Claims Processed</p>
                <p className="text-2xl font-bold">{(metrics?.totalProcessed ?? 0).toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Processing</p>
                <p className="text-2xl font-bold">{metrics?.avgProcessingTimeMs ?? 0}ms</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Acceptance</p>
                <p className="text-2xl font-bold text-green-600">
                  {trends?.trends?.[trends.trends.length - 1]?.acceptanceRate ?? 0}%
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Top Rejection</p>
                <p className="text-sm font-semibold text-red-600 truncate max-w-[160px]">
                  {metrics?.commonRejectionReasons?.[0]?.reason ?? "—"}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="validator">
        <TabsList>
          <TabsTrigger value="validator">Pair Validator</TabsTrigger>
          <TabsTrigger value="trends">Rejection Trends</TabsTrigger>
          <TabsTrigger value="frequency">Frequency Analysis</TabsTrigger>
          <TabsTrigger value="reasons">Rejection Reasons</TabsTrigger>
        </TabsList>

        {/* ICD-CPT Validator */}
        <TabsContent value="validator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>ICD-CPT Pair Validation</CardTitle>
              <CardDescription>Enter a diagnosis and procedure code to check engine decision</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3 items-end">
                <div>
                  <label className="text-sm font-medium">ICD-10 Code</label>
                  <Input
                    placeholder="e.g. O80, J18.9, Z23"
                    value={icdInput}
                    onChange={(e) => setIcdInput(e.target.value)}
                    className="w-48"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">CPT Code</label>
                  <Input
                    placeholder="e.g. 59510, 71046, 90686"
                    value={cptInput}
                    onChange={(e) => setCptInput(e.target.value)}
                    className="w-48"
                  />
                </div>
                <Button onClick={handleValidate} disabled={isValidating || !icdInput || !cptInput}>
                  <Search className="h-4 w-4 mr-2" />
                  {isValidating ? "Checking..." : "Validate Pair"}
                </Button>
              </div>

              {validationResult && (
                <Card className={`border-2 ${validationResult.decision === "ACCEPT" ? "border-green-300 bg-green-50 dark:bg-green-950/20" : "border-red-300 bg-red-50 dark:bg-red-950/20"}`}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      {validationResult.decision === "ACCEPT" ? (
                        <CheckCircle2 className="h-10 w-10 text-green-600 shrink-0" />
                      ) : (
                        <XCircle className="h-10 w-10 text-red-600 shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge className={validationResult.decision === "ACCEPT" ? "bg-green-600" : "bg-red-600"}>
                            {validationResult.decision}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Confidence: {(validationResult.confidence * 100).toFixed(0)}%
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Historical acceptance: {validationResult.historicalAcceptanceRate}%
                          </span>
                        </div>
                        <p className="mt-2 text-sm">{validationResult.reason}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="text-sm text-muted-foreground">
                <p className="font-medium">Try these demo pairs:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li><code>O80</code> + <code>59510</code> — Spontaneous delivery billed as cesarean (REJECT)</li>
                  <li><code>J06.9</code> + <code>99215</code> — URI with high-complexity visit (REJECT)</li>
                  <li><code>Z23</code> + <code>90686</code> — Immunization encounter (ACCEPT)</li>
                  <li><code>E11.9</code> + <code>99213</code> — Diabetes follow-up (ACCEPT)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rejection Trends */}
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Acceptance/Rejection Trends</CardTitle>
              <CardDescription>6-month view of claim processing outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={trends?.trends ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="accepted" name="Accepted" fill="#22c55e" stackId="a" />
                  <Bar dataKey="rejected" name="Rejected" fill="#ef4444" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trends?.trends ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[80, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="acceptanceRate" name="Acceptance Rate %" stroke="#8b5cf6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Frequency Analysis */}
        <TabsContent value="frequency">
          <Card>
            <CardHeader>
              <CardTitle>ICD-CPT Pair Frequency Table</CardTitle>
              <CardDescription>Top pairs by volume with acceptance rates</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ICD Code</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>CPT Code</TableHead>
                    <TableHead>Procedure</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead className="text-right">Acceptance Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(frequency?.pairs ?? []).map((pair) => (
                    <TableRow key={`${pair.icd}-${pair.cpt}`}>
                      <TableCell className="font-mono text-blue-600">{pair.icd}</TableCell>
                      <TableCell className="text-sm">{pair.icdDesc}</TableCell>
                      <TableCell className="font-mono text-green-600">{pair.cpt}</TableCell>
                      <TableCell className="text-sm">{pair.cptDesc}</TableCell>
                      <TableCell className="text-right font-semibold">{pair.total.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Badge className={pair.acceptanceRate >= 80 ? "bg-green-100 text-green-800" : pair.acceptanceRate >= 50 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800"}>
                          {pair.acceptanceRate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rejection Reasons */}
        <TabsContent value="reasons">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Common Rejection Reasons</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={metrics?.commonRejectionReasons ?? []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="reason"
                    >
                      {(metrics?.commonRejectionReasons ?? []).map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Rejection Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(metrics?.commonRejectionReasons ?? []).map((reason, i) => (
                    <div key={reason.reason} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{reason.reason}</div>
                        <div className="text-xs text-muted-foreground">{reason.count.toLocaleString()} claims ({reason.percentage}%)</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**Step 3: Add to FWA nav config**

In `client/src/pillars/config/fwa.ts`, add `Stethoscope` to lucide imports and add this item to the "Regulatory Oversight" section items array, after Online Listening:

```typescript
{ label: "Coding Intelligence", href: "/fwa/coding-intelligence", icon: Stethoscope },
```

**Step 4: Add route in App.tsx**

In the FWA router's `<Switch>`:

```tsx
<Route path="/fwa/coding-intelligence" component={CodingIntelligencePage} />
```

Import: `import CodingIntelligencePage from "@/pages/fwa/coding-intelligence";`

**Step 5: Run the app and verify**

Run: `npm run dev`
Navigate to `/fwa/coding-intelligence` — verify the page loads, tabs work, and pair validation returns results.

**Step 6: Commit**

```bash
git add client/src/pages/fwa/coding-intelligence.tsx client/src/pillars/config/fwa.ts client/src/App.tsx server/routes/fwa-routes.ts
git commit -m "feat(fwa): add CPOE medical coding intelligence page with pair validation"
```

---

## Phase 2: Intelligence Pillar Rebuild

### Task 5: Rebuild Intelligence Pillar Config & API Routes

**Files:**
- Modify: `client/src/pillars/config/intelligence.ts`
- Modify: `server/routes/pillar-routes.ts`

**Step 1: Rewrite Intelligence pillar config**

Replace contents of `client/src/pillars/config/intelligence.ts`:

```typescript
import { Brain, LayoutDashboard, Award, FileCode, Activity, ClipboardCheck, BarChart } from "lucide-react";
import type { PillarConfig } from "../types";

export const intelligencePillarConfig: PillarConfig = {
  id: "intelligence",
  label: "Daman Intelligence",
  basePath: "/intelligence",
  defaultRoute: "/intelligence/dashboard",
  icon: Brain,
  subtitle: "Provider oversight, coding compliance, and DRG readiness",
  navSections: [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", href: "/intelligence/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: "Provider Oversight",
      items: [
        { label: "Accreditation Scorecards", href: "/intelligence/accreditation-scorecards", icon: Award },
        { label: "SBS V3.0 Compliance", href: "/intelligence/sbs-compliance", icon: FileCode },
        { label: "DRG Readiness", href: "/intelligence/drg-readiness", icon: Activity },
        { label: "Rejection Patterns", href: "/intelligence/rejection-patterns", icon: BarChart },
        { label: "Documentation Quality", href: "/intelligence/documentation-quality", icon: ClipboardCheck },
      ],
    },
  ],
  footer: {
    title: "Daman Intelligence",
    subtitle: "Provider Oversight Platform",
  },
  theme: {
    borderClass: "border-violet-200 dark:border-violet-800",
    sectionLabelClass: "text-violet-500 dark:text-violet-400",
    headerIconClass: "text-violet-600 dark:text-violet-400",
    headerTextClass: "text-violet-700 dark:text-violet-300",
    badgeClass: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
    accentBackgroundClass: "bg-gradient-to-br from-violet-50/50 to-white dark:from-violet-950/20 dark:to-gray-950",
  },
  sidebarWidth: "17.5rem",
  sidebarIconWidth: "3.5rem",
};
```

**Step 2: Add Intelligence API routes**

Add to `server/routes/pillar-routes.ts`, inside `registerPillarRoutes`:

```typescript
  // Intelligence - Accreditation Scorecards
  app.get("/api/intelligence/accreditation-scorecards", async (_req, res) => {
    try {
      const providers = [
        { id: "PRV-1042", name: "Al-Hayat Medical Center", city: "Riyadh", specialty: "Multi-specialty", overallScore: 72, codingAccuracy: 68, rejectionRate: 18.2, fwaFlags: 3, sbsCompliance: 74, drgReady: false, trend: "declining" },
        { id: "PRV-2087", name: "Riyadh Women's Hospital", city: "Riyadh", specialty: "OB/GYN", overallScore: 65, codingAccuracy: 61, rejectionRate: 22.5, fwaFlags: 5, sbsCompliance: 70, drgReady: false, trend: "declining" },
        { id: "PRV-3015", name: "Jeddah Dental Clinic", city: "Jeddah", specialty: "Dental", overallScore: 58, codingAccuracy: 55, rejectionRate: 28.1, fwaFlags: 4, sbsCompliance: 62, drgReady: false, trend: "stable" },
        { id: "PRV-4023", name: "Eastern Province Medical Group", city: "Dammam", specialty: "Multi-specialty", overallScore: 85, codingAccuracy: 88, rejectionRate: 8.3, fwaFlags: 0, sbsCompliance: 91, drgReady: true, trend: "improving" },
        { id: "PRV-5001", name: "King Fahd Medical City", city: "Riyadh", specialty: "Tertiary", overallScore: 92, codingAccuracy: 94, rejectionRate: 5.1, fwaFlags: 0, sbsCompliance: 96, drgReady: true, trend: "improving" },
        { id: "PRV-6012", name: "Al-Moosa Specialist Hospital", city: "Al-Ahsa", specialty: "Multi-specialty", overallScore: 81, codingAccuracy: 83, rejectionRate: 11.4, fwaFlags: 1, sbsCompliance: 85, drgReady: true, trend: "improving" },
        { id: "PRV-7034", name: "Magrabi Eye Hospital", city: "Jeddah", specialty: "Ophthalmology", overallScore: 88, codingAccuracy: 91, rejectionRate: 6.8, fwaFlags: 0, sbsCompliance: 93, drgReady: true, trend: "stable" },
        { id: "PRV-8021", name: "Saudi German Hospital", city: "Jeddah", specialty: "Multi-specialty", overallScore: 78, codingAccuracy: 76, rejectionRate: 14.2, fwaFlags: 2, sbsCompliance: 80, drgReady: false, trend: "improving" },
      ];
      const summary = {
        totalProviders: providers.length,
        avgScore: Math.round(providers.reduce((sum, p) => sum + p.overallScore, 0) / providers.length),
        drgReadyCount: providers.filter((p) => p.drgReady).length,
        highRiskCount: providers.filter((p) => p.overallScore < 70).length,
        avgRejectionRate: +(providers.reduce((sum, p) => sum + p.rejectionRate, 0) / providers.length).toFixed(1),
      };
      res.json({ providers, summary });
    } catch (error) {
      handleRouteError(res, error, "/api/intelligence/accreditation-scorecards", "fetching scorecards");
    }
  });

  // Intelligence - SBS V3.0 Compliance
  app.get("/api/intelligence/sbs-compliance", async (_req, res) => {
    try {
      res.json({
        overall: { compliant: 62, total: 100, rate: 62 },
        byRegion: [
          { region: "Riyadh", compliant: 78, total: 100, rate: 78 },
          { region: "Jeddah", compliant: 65, total: 100, rate: 65 },
          { region: "Dammam", compliant: 71, total: 100, rate: 71 },
          { region: "Makkah", compliant: 52, total: 100, rate: 52 },
          { region: "Madinah", compliant: 48, total: 100, rate: 48 },
        ],
        commonIssues: [
          { issue: "Using old ICD-10-AM 8th edition codes", count: 342, severity: "high" },
          { issue: "Missing ACHI procedure codes", count: 289, severity: "high" },
          { issue: "Incorrect SBSCS billing format", count: 215, severity: "medium" },
          { issue: "DRG grouper errors", count: 178, severity: "medium" },
          { issue: "SNOMED CT mapping gaps", count: 134, severity: "low" },
        ],
        trend: [
          { month: "Oct 2025", rate: 41 },
          { month: "Nov 2025", rate: 47 },
          { month: "Dec 2025", rate: 53 },
          { month: "Jan 2026", rate: 58 },
          { month: "Feb 2026", rate: 62 },
        ],
      });
    } catch (error) {
      handleRouteError(res, error, "/api/intelligence/sbs-compliance", "fetching SBS compliance");
    }
  });

  // Intelligence - DRG Readiness
  app.get("/api/intelligence/drg-readiness", async (_req, res) => {
    try {
      res.json({
        overall: { ready: 38, inProgress: 34, notStarted: 28 },
        criteria: [
          { name: "ICD-10-AM 10th Ed. adoption", progress: 72 },
          { name: "ACHI procedure coding", progress: 58 },
          { name: "Clinical coder certification", progress: 45 },
          { name: "DRG grouper software installed", progress: 62 },
          { name: "Cost accounting system", progress: 31 },
          { name: "CDI program active", progress: 40 },
        ],
        projectedTimeline: [
          { quarter: "Q1 2026", ready: 38 },
          { quarter: "Q2 2026", ready: 48 },
          { quarter: "Q3 2026", ready: 60 },
          { quarter: "Q4 2026", ready: 72 },
          { quarter: "Q1 2027", ready: 85 },
        ],
      });
    } catch (error) {
      handleRouteError(res, error, "/api/intelligence/drg-readiness", "fetching DRG readiness");
    }
  });

  // Intelligence - Rejection Patterns
  app.get("/api/intelligence/rejection-patterns", async (_req, res) => {
    try {
      res.json({
        overallRate: 15.2,
        bySpecialty: [
          { specialty: "Dental", rate: 28.1, volume: 34200 },
          { specialty: "OB/GYN", rate: 22.5, volume: 18400 },
          { specialty: "Orthopedics", rate: 16.8, volume: 22100 },
          { specialty: "General Practice", rate: 12.3, volume: 67800 },
          { specialty: "Cardiology", rate: 9.7, volume: 15600 },
          { specialty: "Ophthalmology", rate: 6.8, volume: 12300 },
        ],
        byInsurer: [
          { insurer: "Bupa Arabia", rate: 13.2 },
          { insurer: "Tawuniya", rate: 14.8 },
          { insurer: "MedGulf", rate: 16.1 },
          { insurer: "SAICO", rate: 18.3 },
          { insurer: "Walaa", rate: 15.7 },
          { insurer: "Al Rajhi Takaful", rate: 17.2 },
        ],
        byRegion: [
          { region: "Riyadh", rate: 12.8 },
          { region: "Jeddah", rate: 15.4 },
          { region: "Dammam", rate: 14.1 },
          { region: "Makkah", rate: 18.7 },
          { region: "Madinah", rate: 19.2 },
        ],
      });
    } catch (error) {
      handleRouteError(res, error, "/api/intelligence/rejection-patterns", "fetching rejection patterns");
    }
  });

  // Intelligence - Documentation Quality
  app.get("/api/intelligence/documentation-quality", async (_req, res) => {
    try {
      res.json({
        overallIndex: 68,
        metrics: [
          { name: "Diagnosis specificity", score: 72, benchmark: 85 },
          { name: "Procedure documentation", score: 65, benchmark: 80 },
          { name: "Clinical notes completeness", score: 58, benchmark: 75 },
          { name: "Discharge summary quality", score: 74, benchmark: 80 },
          { name: "Comorbidity capture", score: 61, benchmark: 78 },
          { name: "Complication documentation", score: 70, benchmark: 82 },
        ],
        impact: {
          revenueAtRisk: 124000000,
          drgDowngrades: 8420,
          preventableRejections: 12300,
        },
      });
    } catch (error) {
      handleRouteError(res, error, "/api/intelligence/documentation-quality", "fetching documentation quality");
    }
  });
```

**Step 3: Commit**

```bash
git add client/src/pillars/config/intelligence.ts server/routes/pillar-routes.ts
git commit -m "feat(intelligence): rebuild config with 5 provider oversight features and API routes"
```

---

### Task 6: Rebuild Intelligence Dashboard Page

**Files:**
- Modify: `client/src/pages/intelligence/dashboard.tsx` (full rewrite)
- Create: `client/src/pages/intelligence/accreditation-scorecards.tsx`
- Create: `client/src/pages/intelligence/sbs-compliance.tsx`
- Create: `client/src/pages/intelligence/drg-readiness.tsx`
- Create: `client/src/pages/intelligence/rejection-patterns.tsx`
- Create: `client/src/pages/intelligence/documentation-quality.tsx`
- Modify: `client/src/App.tsx` (update Intelligence routes)

**Step 1: Rewrite the Intelligence dashboard**

Replace `client/src/pages/intelligence/dashboard.tsx` with a new CHI-branded overview page that shows aggregated metrics from all 5 features. This should use `useQuery` to fetch from all 5 API endpoints and show summary cards.

The dashboard should include:
- Overall provider ecosystem health score
- SBS V3.0 compliance rate gauge
- DRG readiness percentage
- Average rejection rate
- Documentation quality index
- Quick links to each sub-page

**Step 2: Create sub-pages**

Each sub-page (accreditation-scorecards.tsx, sbs-compliance.tsx, drg-readiness.tsx, rejection-patterns.tsx, documentation-quality.tsx) should:
- Fetch from its respective API endpoint
- Display data with appropriate charts (BarChart for comparisons, LineChart for trends, PieChart for distributions)
- Include Arabic subtitles on the page title
- Use shadcn/ui Card, Table, Badge, and Progress components
- Follow the existing pattern: `useQuery` → loading skeleton → data display

**Step 3: Update App.tsx routes**

In the IntelligenceRouter function, replace the existing routes with:

```tsx
function IntelligenceRouter() {
  return (
    <IntelligenceLayout>
      <Switch>
        <Route path="/intelligence">{() => <Redirect to="/intelligence/dashboard" />}</Route>
        <Route path="/intelligence/dashboard" component={IntelligenceDashboard} />
        <Route path="/intelligence/accreditation-scorecards" component={AccreditationScorecardsPage} />
        <Route path="/intelligence/sbs-compliance" component={SbsCompliancePage} />
        <Route path="/intelligence/drg-readiness" component={DrgReadinessPage} />
        <Route path="/intelligence/rejection-patterns" component={RejectionPatternsPage} />
        <Route path="/intelligence/documentation-quality" component={DocumentationQualityPage} />
        <Route component={NotFound} />
      </Switch>
    </IntelligenceLayout>
  );
}
```

**Step 4: Run and verify all 6 Intelligence pages load**

Run: `npm run dev`
Navigate through each page in the sidebar.

**Step 5: Commit**

```bash
git add client/src/pages/intelligence/ client/src/App.tsx
git commit -m "feat(intelligence): build 5 provider oversight pages with CHI data"
```

---

## Phase 3: Business Pillar Rebuild

### Task 7: Rebuild Business Pillar Config & API Routes

**Files:**
- Modify: `client/src/pillars/config/business.ts`
- Modify: `server/routes/pillar-routes.ts`

**Step 1: Rewrite Business pillar config**

Replace contents of `client/src/pillars/config/business.ts`:

```typescript
import { Building2, LayoutDashboard, ShieldCheck, Landmark, GitMerge, Users, PiggyBank } from "lucide-react";
import type { PillarConfig } from "../types";

export const businessPillarConfig: PillarConfig = {
  id: "business",
  label: "Daman Business",
  basePath: "/business",
  defaultRoute: "/business/dashboard",
  icon: Building2,
  subtitle: "Market oversight, employer compliance, and cost intelligence",
  navSections: [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", href: "/business/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: "Market Oversight",
      items: [
        { label: "Employer Compliance", href: "/business/employer-compliance", icon: ShieldCheck },
        { label: "Insurer Health Monitor", href: "/business/insurer-health", icon: Landmark },
        { label: "Market Concentration", href: "/business/market-concentration", icon: GitMerge },
        { label: "Coverage Expansion", href: "/business/coverage-expansion", icon: Users },
        { label: "Cost Containment", href: "/business/cost-containment", icon: PiggyBank },
      ],
    },
  ],
  footer: {
    title: "Daman Business",
    subtitle: "Market & Employer Oversight",
  },
  theme: {
    borderClass: "border-sky-200 dark:border-sky-800",
    sectionLabelClass: "text-sky-500 dark:text-sky-400",
    headerIconClass: "text-sky-600 dark:text-sky-400",
    headerTextClass: "text-sky-700 dark:text-sky-300",
    badgeClass: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300",
    accentBackgroundClass: "bg-gradient-to-br from-sky-50/50 to-white dark:from-sky-950/20 dark:to-gray-950",
  },
  sidebarWidth: "17.5rem",
  sidebarIconWidth: "3.5rem",
};
```

**Step 2: Add Business API routes**

Add to `server/routes/pillar-routes.ts`:

```typescript
  // Business - Employer Compliance
  app.get("/api/business/employer-compliance", async (_req, res) => {
    try {
      res.json({
        summary: { total: 48500, compliant: 41225, atRisk: 4850, violated: 2425, complianceRate: 85 },
        bySector: [
          { sector: "Construction", total: 12000, compliant: 9120, rate: 76 },
          { sector: "Hospitality", total: 8500, compliant: 6800, rate: 80 },
          { sector: "Retail", total: 9200, compliant: 8004, rate: 87 },
          { sector: "Technology", total: 4800, compliant: 4560, rate: 95 },
          { sector: "Healthcare", total: 6500, compliant: 6175, rate: 95 },
          { sector: "Manufacturing", total: 7500, compliant: 6566, rate: 88 },
        ],
        recentViolations: [
          { employer: "Al-Faisal Construction Co.", sector: "Construction", employees: 1200, coveredPercent: 62, fineAmount: 250000, date: "2026-02-15" },
          { employer: "Gulf Hospitality Group", sector: "Hospitality", employees: 800, coveredPercent: 71, fineAmount: 150000, date: "2026-02-10" },
          { employer: "Saudi Builders Ltd.", sector: "Construction", employees: 450, coveredPercent: 55, fineAmount: 180000, date: "2026-02-08" },
        ],
        totalFinesYTD: 2500000,
      });
    } catch (error) {
      handleRouteError(res, error, "/api/business/employer-compliance", "fetching employer compliance");
    }
  });

  // Business - Insurer Financial Health
  app.get("/api/business/insurer-health", async (_req, res) => {
    try {
      res.json({
        insurers: [
          { name: "Bupa Arabia", premiums: 8200, claims: 6560, lossRatio: 80, capitalAdequacy: 142, marketShare: 22.1, trend: "stable" },
          { name: "Tawuniya", premiums: 6800, claims: 5712, lossRatio: 84, capitalAdequacy: 128, marketShare: 18.3, trend: "declining" },
          { name: "MedGulf", premiums: 4500, claims: 3825, lossRatio: 85, capitalAdequacy: 115, marketShare: 12.1, trend: "at_risk" },
          { name: "Al Rajhi Takaful", premiums: 3200, claims: 2560, lossRatio: 80, capitalAdequacy: 138, marketShare: 8.6, trend: "improving" },
          { name: "SAICO", premiums: 2800, claims: 2436, lossRatio: 87, capitalAdequacy: 108, marketShare: 7.5, trend: "at_risk" },
          { name: "Walaa", premiums: 2400, claims: 1920, lossRatio: 80, capitalAdequacy: 132, marketShare: 6.5, trend: "stable" },
        ],
        marketTotals: { premiums: 37100, claims: 29672, avgLossRatio: 82.7 },
      });
    } catch (error) {
      handleRouteError(res, error, "/api/business/insurer-health", "fetching insurer health");
    }
  });

  // Business - Market Concentration
  app.get("/api/business/market-concentration", async (_req, res) => {
    try {
      res.json({
        herfindahlIndex: 1420,
        interpretation: "Moderately concentrated",
        top5Share: 68.6,
        mergerScenarios: [
          { scenario: "MedGulf + SAICO", newHHI: 1602, deltaHHI: 182, impact: "Would increase concentration significantly" },
          { scenario: "Tawuniya + Walaa", newHHI: 1658, deltaHHI: 238, impact: "Would create dominant duopoly with Bupa" },
        ],
        historicalHHI: [
          { year: "2022", hhi: 1280 },
          { year: "2023", hhi: 1340 },
          { year: "2024", hhi: 1380 },
          { year: "2025", hhi: 1420 },
        ],
      });
    } catch (error) {
      handleRouteError(res, error, "/api/business/market-concentration", "fetching market concentration");
    }
  });

  // Business - Coverage Expansion
  app.get("/api/business/coverage-expansion", async (_req, res) => {
    try {
      res.json({
        current: { covered: 11500000, target: 25000000, progress: 46 },
        segments: [
          { name: "Private sector employees", covered: 8200000, target: 9000000, progress: 91 },
          { name: "Saudi dependents (private)", covered: 2100000, target: 3200000, progress: 66 },
          { name: "Domestic workers", covered: 800000, target: 4500000, progress: 18 },
          { name: "Gig economy workers", covered: 200000, target: 2800000, progress: 7 },
          { name: "Visit visa holders", covered: 200000, target: 5500000, progress: 4 },
        ],
        premiumImpact: {
          currentMarket: 37100,
          projectedWithExpansion: 83000,
          additionalCapacity: 45900,
        },
      });
    } catch (error) {
      handleRouteError(res, error, "/api/business/coverage-expansion", "fetching coverage expansion");
    }
  });

  // Business - Cost Containment
  app.get("/api/business/cost-containment", async (_req, res) => {
    try {
      res.json({
        adminCostRatio: 18.7,
        oecdBenchmark: 12.0,
        savingsOpportunity: 2490,
        breakdown: [
          { category: "Claims processing", percent: 32, amount: 5920 },
          { category: "Provider network mgmt", percent: 22, amount: 4070 },
          { category: "Customer service", percent: 18, amount: 3330 },
          { category: "IT infrastructure", percent: 15, amount: 2775 },
          { category: "Compliance & regulatory", percent: 13, amount: 2405 },
        ],
        costTrend: [
          { year: "2022", ratio: 20.1 },
          { year: "2023", ratio: 19.5 },
          { year: "2024", ratio: 19.0 },
          { year: "2025", ratio: 18.7 },
        ],
      });
    } catch (error) {
      handleRouteError(res, error, "/api/business/cost-containment", "fetching cost containment");
    }
  });
```

**Step 3: Commit**

```bash
git add client/src/pillars/config/business.ts server/routes/pillar-routes.ts
git commit -m "feat(business): rebuild config with 5 market oversight features and API routes"
```

---

### Task 8: Rebuild Business Dashboard & Sub-Pages

**Files:**
- Modify: `client/src/pages/business/dashboard.tsx` (full rewrite)
- Create: `client/src/pages/business/employer-compliance.tsx`
- Create: `client/src/pages/business/insurer-health.tsx`
- Create: `client/src/pages/business/market-concentration.tsx`
- Create: `client/src/pages/business/coverage-expansion.tsx`
- Create: `client/src/pages/business/cost-containment.tsx`
- Modify: `client/src/App.tsx` (update Business routes)

**Step 1: Rewrite Business dashboard**

Overview page showing market health at a glance: compliance rate, avg loss ratio, market concentration (HHI), coverage progress toward 25M, admin cost ratio vs benchmark.

**Step 2: Create sub-pages**

Each sub-page fetches from its API endpoint and displays:
- **Employer Compliance:** Table of sectors, violation list, compliance rate gauge
- **Insurer Health:** Table of insurers with loss ratios, capital adequacy, trend badges
- **Market Concentration:** HHI visualization, merger scenario cards
- **Coverage Expansion:** Progress bars per segment, premium impact projections
- **Cost Containment:** Admin cost breakdown, OECD benchmark comparison, trend line

Follow the same patterns as Intelligence pages — `useQuery`, Cards, Tables, Recharts.

**Step 3: Update App.tsx routes**

```tsx
function BusinessRouter() {
  return (
    <BusinessLayout>
      <Switch>
        <Route path="/business">{() => <Redirect to="/business/dashboard" />}</Route>
        <Route path="/business/dashboard" component={BusinessDashboard} />
        <Route path="/business/employer-compliance" component={EmployerCompliancePage} />
        <Route path="/business/insurer-health" component={InsurerHealthPage} />
        <Route path="/business/market-concentration" component={MarketConcentrationPage} />
        <Route path="/business/coverage-expansion" component={CoverageExpansionPage} />
        <Route path="/business/cost-containment" component={CostContainmentPage} />
        <Route component={NotFound} />
      </Switch>
    </BusinessLayout>
  );
}
```

**Step 4: Verify all pages load**

**Step 5: Commit**

```bash
git add client/src/pages/business/ client/src/App.tsx
git commit -m "feat(business): build 5 market oversight pages with CHI data"
```

---

## Phase 4: Members Pillar Rebuild

### Task 9: Rebuild Members Pillar Config & API Routes

**Files:**
- Modify: `client/src/pillars/config/members.ts`
- Modify: `server/routes/pillar-routes.ts`

**Step 1: Rewrite Members pillar config**

Replace contents of `client/src/pillars/config/members.ts`:

```typescript
import { HeartPulse, LayoutDashboard, MessageSquare, MapPin, Star, ShieldAlert, BookOpen } from "lucide-react";
import type { PillarConfig } from "../types";

export const membersPillarConfig: PillarConfig = {
  id: "members",
  label: "Daman Members",
  basePath: "/members",
  defaultRoute: "/members/dashboard",
  icon: HeartPulse,
  subtitle: "Beneficiary protection, coverage transparency, and fraud reporting",
  navSections: [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", href: "/members/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: "Beneficiary Services",
      items: [
        { label: "Complaints & Disputes", href: "/members/complaints", icon: MessageSquare },
        { label: "Coverage Gap Monitor", href: "/members/coverage-gaps", icon: MapPin },
        { label: "Provider Quality", href: "/members/provider-quality", icon: Star },
        { label: "Report Fraud", href: "/members/report-fraud", icon: ShieldAlert },
        { label: "Benefits Awareness", href: "/members/benefits-awareness", icon: BookOpen },
      ],
    },
  ],
  footer: {
    title: "Daman Members",
    subtitle: "Beneficiary Protection",
  },
  theme: {
    borderClass: "border-teal-200 dark:border-teal-800",
    sectionLabelClass: "text-teal-500 dark:text-teal-400",
    headerIconClass: "text-teal-600 dark:text-teal-400",
    headerTextClass: "text-teal-700 dark:text-teal-300",
    badgeClass: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
    accentBackgroundClass: "bg-gradient-to-br from-teal-50/50 to-white dark:from-teal-950/20 dark:to-gray-950",
  },
  sidebarWidth: "17.5rem",
  sidebarIconWidth: "3.5rem",
};
```

**Step 2: Add Members API routes**

Add to `server/routes/pillar-routes.ts`:

```typescript
  // Members - Complaints & Disputes
  app.get("/api/members/complaints", async (_req, res) => {
    try {
      res.json({
        summary: { total: 14200, resolved: 11360, pending: 2130, escalated: 710, avgResolutionDays: 12.4 },
        byType: [
          { type: "Claim denial dispute", count: 4820, percentage: 33.9 },
          { type: "Coverage confusion", count: 3410, percentage: 24.0 },
          { type: "Provider billing issue", count: 2560, percentage: 18.0 },
          { type: "Pre-authorization delay", count: 1990, percentage: 14.0 },
          { type: "Quality of care", count: 1420, percentage: 10.0 },
        ],
        topOffenders: [
          { entity: "MedGulf Insurance", type: "insurer", complaints: 2840, resolutionRate: 72 },
          { entity: "SAICO", type: "insurer", complaints: 2130, resolutionRate: 68 },
          { entity: "Al-Hayat Medical Center", type: "provider", complaints: 890, resolutionRate: 81 },
        ],
        trend: [
          { month: "Sep 2025", count: 2100 },
          { month: "Oct 2025", count: 2350 },
          { month: "Nov 2025", count: 2180 },
          { month: "Dec 2025", count: 2450 },
          { month: "Jan 2026", count: 2680 },
          { month: "Feb 2026", count: 2440 },
        ],
      });
    } catch (error) {
      handleRouteError(res, error, "/api/members/complaints", "fetching complaints");
    }
  });

  // Members - Coverage Gaps
  app.get("/api/members/coverage-gaps", async (_req, res) => {
    try {
      res.json({
        totalUninsured: 1850000,
        bySegment: [
          { segment: "Domestic workers (unregistered)", count: 680000, riskLevel: "critical" },
          { segment: "Gig economy workers", count: 520000, riskLevel: "high" },
          { segment: "Expired policies (private)", count: 340000, riskLevel: "high" },
          { segment: "Saudi dependents gap", count: 210000, riskLevel: "medium" },
          { segment: "Rural areas access gap", count: 100000, riskLevel: "medium" },
        ],
        byRegion: [
          { region: "Riyadh", insured: 4200000, gap: 380000, rate: 91.7 },
          { region: "Makkah", insured: 2800000, gap: 420000, rate: 86.9 },
          { region: "Eastern Province", insured: 2100000, gap: 290000, rate: 87.9 },
          { region: "Madinah", insured: 980000, gap: 185000, rate: 84.1 },
          { region: "Asir", insured: 520000, gap: 175000, rate: 74.8 },
        ],
      });
    } catch (error) {
      handleRouteError(res, error, "/api/members/coverage-gaps", "fetching coverage gaps");
    }
  });

  // Members - Provider Quality
  app.get("/api/members/provider-quality", async (_req, res) => {
    try {
      res.json({
        providers: [
          { name: "King Fahd Medical City", city: "Riyadh", rating: 4.8, waitTime: 15, satisfaction: 94, accredited: true },
          { name: "Al-Moosa Specialist Hospital", city: "Al-Ahsa", rating: 4.6, waitTime: 20, satisfaction: 91, accredited: true },
          { name: "Magrabi Eye Hospital", city: "Jeddah", rating: 4.5, waitTime: 25, satisfaction: 89, accredited: true },
          { name: "Saudi German Hospital", city: "Jeddah", rating: 4.2, waitTime: 35, satisfaction: 82, accredited: true },
          { name: "Eastern Province Medical", city: "Dammam", rating: 4.1, waitTime: 30, satisfaction: 84, accredited: true },
          { name: "Al-Hayat Medical Center", city: "Riyadh", rating: 3.4, waitTime: 55, satisfaction: 64, accredited: true },
          { name: "Jeddah Dental Clinic", city: "Jeddah", rating: 3.1, waitTime: 45, satisfaction: 58, accredited: false },
        ],
        avgNationalRating: 4.0,
        avgWaitTime: 32,
      });
    } catch (error) {
      handleRouteError(res, error, "/api/members/provider-quality", "fetching provider quality");
    }
  });

  // Members - Benefits Awareness
  app.get("/api/members/benefits-awareness", async (_req, res) => {
    try {
      res.json({
        categories: [
          {
            name: "Preventive Care",
            nameAr: "الرعاية الوقائية",
            services: [
              { service: "Annual health checkup", serviceAr: "الفحص الصحي السنوي", covered: true, limit: "1 per year" },
              { service: "Vaccinations", serviceAr: "التطعيمات", covered: true, limit: "As per MOH schedule" },
              { service: "Cancer screening", serviceAr: "فحص السرطان", covered: true, limit: "As clinically indicated" },
            ],
          },
          {
            name: "Maternity",
            nameAr: "الأمومة",
            services: [
              { service: "Prenatal visits", serviceAr: "زيارات ما قبل الولادة", covered: true, limit: "Up to 12 visits" },
              { service: "Delivery (normal/cesarean)", serviceAr: "الولادة", covered: true, limit: "Full coverage" },
              { service: "Postnatal care", serviceAr: "رعاية ما بعد الولادة", covered: true, limit: "6 weeks" },
            ],
          },
          {
            name: "Emergency",
            nameAr: "الطوارئ",
            services: [
              { service: "Emergency room visit", serviceAr: "زيارة غرفة الطوارئ", covered: true, limit: "No limit" },
              { service: "Ambulance service", serviceAr: "خدمة الإسعاف", covered: true, limit: "No limit" },
              { service: "ICU admission", serviceAr: "العناية المركزة", covered: true, limit: "As needed" },
            ],
          },
          {
            name: "Mental Health",
            nameAr: "الصحة النفسية",
            services: [
              { service: "Psychiatry consultation", serviceAr: "استشارة نفسية", covered: true, limit: "12 sessions/year" },
              { service: "Psychotherapy", serviceAr: "العلاج النفسي", covered: true, limit: "24 sessions/year" },
              { service: "Inpatient psychiatric", serviceAr: "العلاج النفسي الداخلي", covered: true, limit: "30 days/year" },
            ],
          },
        ],
      });
    } catch (error) {
      handleRouteError(res, error, "/api/members/benefits-awareness", "fetching benefits");
    }
  });
```

**Step 3: Commit**

```bash
git add client/src/pillars/config/members.ts server/routes/pillar-routes.ts
git commit -m "feat(members): rebuild config with 5 beneficiary protection features and API routes"
```

---

### Task 10: Rebuild Members Dashboard & Sub-Pages

**Files:**
- Modify: `client/src/pages/members/dashboard.tsx` (full rewrite)
- Create: `client/src/pages/members/complaints.tsx`
- Create: `client/src/pages/members/coverage-gaps.tsx`
- Create: `client/src/pages/members/provider-quality.tsx`
- Create: `client/src/pages/members/report-fraud.tsx`
- Create: `client/src/pages/members/benefits-awareness.tsx`
- Modify: `client/src/App.tsx` (update Members routes)

**Step 1: Rewrite Members dashboard**

Overview showing: total beneficiaries (11.5M), active complaints, coverage gap size, avg provider rating, fraud reports filed. Use teal theme consistently.

**Step 2: Create sub-pages**

- **Complaints:** Complaint volume chart, type breakdown pie chart, top offenders table, resolution trend
- **Coverage Gaps:** Map-style regional view, segment progress bars, risk badges
- **Provider Quality:** Star rating system, wait time comparisons, satisfaction scores, accreditation badges
- **Report Fraud:** Form with: anonymous toggle, issue type select, provider lookup, description textarea, file upload zone. On submit, show confirmation with tracking number. Connect narrative to Pillar 1.
- **Benefits Awareness:** Searchable accordion of coverage categories with Arabic translations, covered/not-covered badges, limit info

**Step 3: Update App.tsx routes**

```tsx
function MembersRouter() {
  return (
    <MembersLayout>
      <Switch>
        <Route path="/members">{() => <Redirect to="/members/dashboard" />}</Route>
        <Route path="/members/dashboard" component={MembersDashboard} />
        <Route path="/members/complaints" component={ComplaintsPage} />
        <Route path="/members/coverage-gaps" component={CoverageGapsPage} />
        <Route path="/members/provider-quality" component={ProviderQualityPage} />
        <Route path="/members/report-fraud" component={ReportFraudPage} />
        <Route path="/members/benefits-awareness" component={BenefitsAwarenessPage} />
        <Route component={NotFound} />
      </Switch>
    </MembersLayout>
  );
}
```

**Step 4: Verify all pages load**

**Step 5: Commit**

```bash
git add client/src/pages/members/ client/src/App.tsx
git commit -m "feat(members): build 5 beneficiary protection pages with CHI data"
```

---

## Phase 5: Integration & Polish

### Task 11: Update Home Page Pillar Cards

**Files:**
- Modify: `client/src/pages/home.tsx`

**Step 1: Update pillar card descriptions**

Update the 4 pillar cards on the home page to reflect the new feature sets:

- **FWA:** "Command Center, High-Risk Entities, Flagged Claims, Online Listening, Enforcement, Coding Intelligence"
- **Intelligence:** "Accreditation Scorecards, SBS V3.0 Compliance, DRG Readiness, Rejection Patterns, Documentation Quality"
- **Business:** "Employer Compliance, Insurer Health, Market Concentration, Coverage Expansion, Cost Containment"
- **Members:** "Complaints & Disputes, Coverage Gaps, Provider Quality, Report Fraud, Benefits Awareness"

Also update subtitles to match the new pillar subtitles from config files.

**Step 2: Commit**

```bash
git add client/src/pages/home.tsx
git commit -m "feat(home): update pillar cards with new feature descriptions"
```

---

### Task 12: Update E2E Smoke Tests

**Files:**
- Modify: `e2e/pillars-smoke.spec.ts`

**Step 1: Update smoke test journeys**

Update the pillar journeys to reflect new navigation:

```typescript
const journeys: PillarJourney[] = [
  {
    pillarId: "fwa",
    homeCardTestId: "card-module-audit-fwa",
    expectedLandingPath: "/fwa/dashboard",
    sidebarNavTestId: "nav-fwa-high-risk-entities",
    expectedSecondaryPath: "/fwa/high-risk-entities",
  },
  {
    pillarId: "intelligence",
    homeCardTestId: "card-module-daman-intelligence",
    expectedLandingPath: "/intelligence/dashboard",
    sidebarNavTestId: "nav-intelligence-rejection-patterns",
    expectedSecondaryPath: "/intelligence/rejection-patterns",
  },
  {
    pillarId: "business",
    homeCardTestId: "card-module-daman-business",
    expectedLandingPath: "/business/dashboard",
    sidebarNavTestId: "nav-business-employer-compliance",
    expectedSecondaryPath: "/business/employer-compliance",
  },
  {
    pillarId: "members",
    homeCardTestId: "card-module-daman-members",
    expectedLandingPath: "/members/dashboard",
    sidebarNavTestId: "nav-members-report-fraud",
    expectedSecondaryPath: "/members/report-fraud",
  },
];
```

**Step 2: Run the full E2E suite**

Run: `npx playwright test e2e/ --headed`
Expected: All pillar smoke tests PASS.

**Step 3: Commit**

```bash
git add e2e/
git commit -m "test: update E2E smoke tests for new pillar navigation structure"
```

---

### Task 13: Cross-Pillar Data Flow Demo

**Files:**
- Modify: `client/src/pages/members/report-fraud.tsx`
- Modify: `server/routes/pillar-routes.ts`

**Step 1: Add cross-pillar link in Report Fraud page**

When a fraud report is submitted in Pillar 4 (Members), show a success message that includes:
- A tracking number
- A link: "View in FWA Command Center" → `/fwa/high-risk-entities`
- Text: "This report has been routed to the Audit & FWA Unit for investigation"

This demonstrates the cross-pillar intelligence flow in the demo narrative.

**Step 2: Add a cross-pillar indicator in FWA High-Risk Entities**

Add a small badge or indicator showing "3 member reports linked" on the Al-Hayat Medical Center entity card, connecting it back to the Members pillar.

**Step 3: Commit**

```bash
git add client/src/pages/members/report-fraud.tsx client/src/pages/fwa/high-risk-entities.tsx
git commit -m "feat: add cross-pillar data flow between Members fraud reports and FWA"
```

---

### Task 14: Final Verification

**Step 1: Run full E2E test suite**

Run: `npx playwright test --headed`
Expected: All tests PASS.

**Step 2: Run TypeScript type check**

Run: `npx tsc --noEmit`
Expected: No type errors.

**Step 3: Manual demo walkthrough**

Follow the demo narrative from the design doc:
1. Home page → FWA Command Center
2. FWA: Command Center → High-Risk Entities → Flagged Claims → Online Listening → Coding Intelligence
3. Intelligence: Dashboard → Accreditation Scorecards → SBS Compliance → DRG Readiness
4. Business: Dashboard → Employer Compliance → Insurer Health → Coverage Expansion
5. Members: Dashboard → Complaints → Coverage Gaps → Report Fraud (submit, see cross-pillar link)

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final verification and cleanup for CHI demo"
```

---

## Task Summary

| Phase | Tasks | Effort |
|-------|-------|--------|
| **Phase 1: FWA** | Tasks 1-4 (nav simplify, flagged claims, command center, CPOE) | 70% |
| **Phase 2: Intelligence** | Tasks 5-6 (config + 5 pages) | 10% |
| **Phase 3: Business** | Tasks 7-8 (config + 5 pages) | 10% |
| **Phase 4: Members** | Tasks 9-10 (config + 5 pages) | 10% |
| **Phase 5: Integration** | Tasks 11-14 (home, E2E, cross-pillar, verification) | Polish |

**Total: 14 tasks, ~28 commits**

Each ecosystem pillar page should take 30-60 minutes to implement. FWA tasks are larger (1-2 hours each). Full implementation: ~3-5 days of focused work.
