# Provider Relation - Design Mockups

## Overview
Complete visual layouts for the Provider Relation "Dream Report" module. Review and approve before development.

---

## Page 1: Provider Relation Dashboard (Main View)

### Header Section
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [TachyHealth Logo]  │  Provider Relation                    [Back to Home]      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Provider Relation Dashboard                                                    │
│  Comprehensive benchmarking and reconciliation for provider settlements         │
│                                                                                 │
│  [Search Provider...________________________] [Region ▼] [Type ▼] [Network ▼]  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### KPI Summary Cards (Top Row)
```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Total Providers │  │  Avg CPM         │  │  Flagged         │  │  Pending         │
│                  │  │                  │  │  Providers       │  │  Settlement      │
│      247         │  │    $1,245        │  │      12          │  │      8           │
│   ▲ 12 new       │  │   ▲ +5.2% YoY    │  │   ▼ -3 vs last   │  │   $2.4M value    │
│                  │  │                  │  │                  │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Main Content Area - Two Column Layout

#### Left Column: Provider Benchmarking Table
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Provider Benchmarking                                          [Export CSV]   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Provider Name      │ Region   │ Type      │ CPM      │ Trend  │ Risk   │ ▶     │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  King Faisal Hosp   │ Central  │ Hospital  │ $1,450   │ ▲ +8%  │ 🔴 High │ →     │
│  Saudi German       │ Western  │ Hospital  │ $1,120   │ ▼ -2%  │ 🟢 Low  │ →     │
│  Dr. Sulaiman       │ Central  │ Clinic    │ $890     │ ▲ +3%  │ 🟡 Med  │ →     │
│  Al Habib Medical   │ Eastern  │ Hospital  │ $1,380   │ ▲ +12% │ 🔴 High │ →     │
│  Mouwasat Hospital  │ Central  │ Hospital  │ $1,050   │ ▼ -1%  │ 🟢 Low  │ →     │
│  ... (scrollable)                                                               │
│                                                                                 │
│  [< Prev]  Page 1 of 12  [Next >]                                              │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### Right Column: Trend Charts
```
┌─────────────────────────────────────────────────────────────────┐
│  CPM Trends - Year over Year                    [2023 vs 2024] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  $1,400 ┤                              ╭──●                     │
│  $1,200 ┤              ╭──●──●──●──●──╯                         │
│  $1,000 ┤     ╭──●──●─╯                     2024                │
│    $800 ┤ ●──╯                              ---- 2023           │
│         └────┬────┬────┬────┬────┬────┬────┬────┬               │
│             Jan  Feb  Mar  Apr  May  Jun  Jul  Aug              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Billing Variance by Provider Type                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Hospitals    ████████████████████████  +8.2%                   │
│  Clinics      ███████████████           +4.1%                   │
│  Pharmacies   ██████████████████        -2.3%                   │
│  Labs         ████████████              +1.8%                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Automated Triggers Panel (Bottom)
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🚨 Automated Triggers                                      [View All Triggers] │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ⚠️ High CPM Alert     King Faisal Hospital - CPM 35% above peers    [Review →]│
│  ⚠️ Billing Anomaly    Al Habib Medical - Duplicate billing detected [Review →]│
│  ⚠️ Code Mismatch      Saudi German - 15 claims with code issues     [Review →]│
│  ℹ️ Settlement Due     Mouwasat Hospital - Q3 reconciliation pending [Review →]│
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Page 2: Provider Detail View (Drill-down from Dashboard)

### Provider Header
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [← Back to Dashboard]                                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌────────┐   King Faisal Specialist Hospital                                  │
│  │  Logo  │   Provider ID: PR-2024-0156                                         │
│  │   KF   │   ─────────────────────────────────────────────────────────────     │
│  └────────┘   Region: Central     │  Type: Hospital    │  Network: Premium     │
│               Specialty: Multi    │  Contract: Tier 1  │  Since: 2018          │
│                                                                                 │
│  [Generate Settlement Report]  [Export Data]  [View Contract]                   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Provider Attributes Grid
```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  📍 Geographic      │  │  🏥 Services        │  │  📊 Volume          │
│  ─────────────────  │  │  ─────────────────  │  │  ─────────────────  │
│  Region: Central    │  │  Inpatient: ✓       │  │  Members: 45,230    │
│  City: Riyadh       │  │  Outpatient: ✓      │  │  Claims/Mo: 8,450   │
│  Zone: Zone 1       │  │  Emergency: ✓       │  │  Avg Claim: $285    │
│                     │  │  Lab: ✓             │  │                     │
│                     │  │  Radiology: ✓       │  │                     │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘

┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  ⚠️ Risk Profile    │  │  📋 Top Policies    │  │  🔗 Networks        │
│  ─────────────────  │  │  ─────────────────  │  │  ─────────────────  │
│  Fraud Cases: 2     │  │  1. Gold Plus       │  │  Premium Network    │
│  Complaints: 5      │  │  2. Corporate Elite │  │  VIP Network        │
│  Last Audit: 2024   │  │  3. Family Care     │  │  Standard Network   │
│  Risk Score: 72/100 │  │  4. Basic Health    │  │                     │
│                     │  │  5. Senior Shield   │  │                     │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

### KPI Dashboard for Provider
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Performance Metrics                                              [2024 ▼]     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────┐   ┌─────────────────────────────────────┐ │
│  │  Cost Per Member (CPM)          │   │  Billing Variance                   │ │
│  │                                 │   │                                     │ │
│  │     $1,450                      │   │     +8.2%                           │ │
│  │     ▲ +$180 vs last year        │   │     vs peer average                 │ │
│  │     ▲ +35% vs peer average      │   │                                     │ │
│  │                                 │   │     Peer Avg: $1,074                │ │
│  │  [CPM Trend Chart]              │   │     Your Rank: 42 of 247            │ │
│  │   ╭──●──●                       │   │                                     │ │
│  │  ●╯                             │   │  [View Breakdown]                   │ │
│  └─────────────────────────────────┘   └─────────────────────────────────────┘ │
│                                                                                 │
│  ┌─────────────────────────────────┐   ┌─────────────────────────────────────┐ │
│  │  Member Count Trend             │   │  Claim Volume Trend                 │ │
│  │                                 │   │                                     │ │
│  │     45,230 members              │   │     8,450 claims/month              │ │
│  │     ▲ +12% YoY                  │   │     ▲ +18% YoY                       │ │
│  │                                 │   │                                     │ │
│  │  [Member Trend Line Chart]      │   │  [Claims Bar Chart by Month]        │ │
│  └─────────────────────────────────┘   └─────────────────────────────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Peer Comparison Section
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Peer Comparison - Similar Providers (Central Region, Hospital, Tier 1)        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Provider              │  CPM      │  Members  │  Claims   │  Variance │        │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  ★ King Faisal (You)   │  $1,450   │  45,230   │  8,450    │  +35%     │        │
│  Saudi German          │  $1,120   │  38,100   │  6,200    │  +4%      │        │
│  Dr. Sulaiman          │  $890     │  52,400   │  9,100    │  -17%     │        │
│  Al Habib Medical      │  $1,380   │  41,000   │  7,800    │  +28%     │        │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  Peer Average          │  $1,074   │  42,600   │  7,700    │  --       │        │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Top Services Analysis
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Top Utilized Services                                    [Compare to Peers]   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Service                   │ Volume  │ Revenue    │ vs Peers  │ Trend │ Flag   │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  Cardiac Catheterization   │ 245     │ $1.2M      │ +45%      │ ▲     │ ⚠️     │
│  MRI Scans                 │ 890     │ $445K      │ +12%      │ ▲     │        │
│  ICU Days                  │ 1,240   │ $2.1M      │ +28%      │ ▲     │ ⚠️     │
│  Laboratory Tests          │ 12,400  │ $620K      │ -5%       │ ▼     │        │
│  Pharmacy Dispensing       │ 8,900   │ $890K      │ +8%       │ ▲     │        │
│                                                                                 │
│  [View All Services]                                                            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Page 3: Claim Batches View (Drill-down from Provider)

### Claim Batches Header
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [← Back to Provider]  King Faisal Hospital > Claim Batches                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Claim Batches                                                                  │
│  Review claim submissions by batch for reconciliation                           │
│                                                                                 │
│  [Date Range: Last 90 Days ▼]  [Status: All ▼]  [Search Batch ID...]           │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Batch Summary Cards
```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Total Batches   │  │  Approved        │  │  Rejected        │  │  Pending Review  │
│                  │  │                  │  │                  │  │                  │
│      156         │  │      124         │  │      18          │  │      14          │
│   $4.2M value    │  │   $3.1M (74%)    │  │   $580K (14%)    │  │   $520K (12%)    │
│                  │  │                  │  │                  │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Batch List Table
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Batch ID        │ Submit Date │ Claims │ Amount    │ Status    │ Issues │ ▶    │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  B2024-1125-001  │ Nov 25      │ 145    │ $42,500   │ ✓ Approved│ 2      │ →    │
│  B2024-1124-003  │ Nov 24      │ 198    │ $58,200   │ ⚠ Partial │ 12     │ →    │
│  B2024-1123-002  │ Nov 23      │ 167    │ $51,800   │ ✓ Approved│ 0      │ →    │
│  B2024-1122-001  │ Nov 22      │ 89     │ $28,400   │ ✗ Rejected│ 15     │ →    │
│  B2024-1121-004  │ Nov 21      │ 212    │ $67,300   │ ⏳ Pending│ --     │ →    │
│  ... (scrollable)                                                               │
│                                                                                 │
│  [< Prev]  Page 1 of 8  [Next >]                                               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Rejection Reasons Breakdown
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Rejection Reasons Analysis                                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Cost Discrepancy (Pre-auth vs Claim)  ████████████████████  42 claims  │  38% │
│  Missing Documentation                  ██████████████       28 claims  │  25% │
│  Code Mismatch                         ████████████         24 claims  │  22% │
│  Duplicate Billing                     ██████               12 claims  │  11% │
│  Policy Exclusion                      ███                   5 claims  │   4% │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Page 4: Individual Claim Detail (Drill-down from Batch)

### Claim Header
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [← Back to Batch]  B2024-1124-003 > Claim CLM-2024-78542                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Claim: CLM-2024-78542                              Status: ⚠️ Partial Reject   │
│  ───────────────────────────────────────────────────────────────────────────    │
│  Member: Ahmad Al-Rashid (MEM-45621)  │  Policy: Gold Plus  │  DOS: Nov 15, 2024│
│                                                                                 │
│  [Approve Claim]  [Reject Claim]  [Request Documentation]  [Add to Settlement] │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Claim Details Grid
```
┌─────────────────────────────────────────┐  ┌─────────────────────────────────────┐
│  💰 Financial Details                   │  │  🏥 Clinical Details                │
│  ─────────────────────────────────────  │  │  ─────────────────────────────────  │
│  Billed Amount:        $2,450           │  │  Primary Diagnosis: I25.1           │
│  Pre-Auth Amount:      $1,800           │  │  (Coronary Artery Disease)          │
│  Approved Amount:      $1,650           │  │                                     │
│  Variance:             -$650 ⚠️         │  │  Secondary: E11.9, I10              │
│  ─────────────────────────────────────  │  │                                     │
│  Cost Discrepancy: Pre-auth < Billed    │  │  Procedure: 92928 (PCI)             │
│                                         │  │  LOS: 3 days                        │
│                                         │  │  ICU: Yes (1 day)                   │
└─────────────────────────────────────────┘  └─────────────────────────────────────┘
```

### Code Validation Panel
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🔍 Code Validation                                                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Service Code     │ Internal Code │ Standard Code │ Match  │ Issue             │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  Cardiac Cath     │ CARD-001      │ 93458         │ ✓      │ --                │
│  PCI Stent        │ CARD-015      │ 92928         │ ✓      │ --                │
│  ICU Daily        │ ICU-001       │ 99291         │ ⚠️     │ Bundling Issue    │
│  Lab Panel        │ LAB-COMP-01   │ 80053         │ ✓      │ --                │
│  Pharmacy         │ PHARM-045     │ --            │ ⚠️     │ Out of Price List │
│                                                                                 │
│  [View Code Details]  [Report Mismatch]                                         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Attachments Panel
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  📎 Claim Attachments                                         [Download All]   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────┐  Medical Report.pdf          Uploaded: Nov 16   [View] [Download] │
│  │   PDF   │  Dr. Ahmed - Cardiology                                           │
│  └─────────┘                                                                    │
│                                                                                 │
│  ┌─────────┐  Lab Results.pdf             Uploaded: Nov 15   [View] [Download] │
│  │   PDF   │  Complete Blood Panel                                              │
│  └─────────┘                                                                    │
│                                                                                 │
│  ┌─────────┐  Pre-Authorization.pdf       Uploaded: Nov 10   [View] [Download] │
│  │   PDF   │  Approval Reference: PA-78542                                      │
│  └─────────┘                                                                    │
│                                                                                 │
│  ┌─────────┐  Invoice_Itemized.xlsx       Uploaded: Nov 16   [View] [Download] │
│  │  XLSX   │  Detailed service breakdown                                        │
│  └─────────┘                                                                    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Claim History / Audit Trail
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  📜 Claim History                                                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Nov 25, 10:30  │  Claim flagged for cost discrepancy review                   │
│  Nov 24, 14:15  │  Auto-adjudication: Partial approval ($1,650)                │
│  Nov 16, 09:00  │  Claim submitted in batch B2024-1124-003                     │
│  Nov 15, 16:45  │  Attachments uploaded (4 files)                              │
│  Nov 10, 11:20  │  Pre-authorization approved ($1,800)                         │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Page 5: Commercial Settlement View

### Settlement Dashboard Header
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ [TachyHealth Logo]  │  Provider Relation > Settlement        [Back to Dashboard]│
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Commercial Settlement                                                          │
│  Prepare reconciliation packages for provider negotiations                      │
│                                                                                 │
│  Provider: [King Faisal Hospital ▼]    Period: [Q4 2024 ▼]                     │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Settlement Summary Cards
```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Total Billed    │  │  Total Approved  │  │  Total Rejected  │  │  Net Settlement  │
│                  │  │                  │  │                  │  │                  │
│    $4.2M         │  │    $3.1M         │  │    $580K         │  │    $3.1M         │
│   1,245 claims   │  │   74% approval   │  │   111 claims     │  │   Ready to pay   │
│                  │  │                  │  │                  │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Reconciliation Triggers
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🎯 Reconciliation Triggers for Negotiation                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Category                        │ Claims │ Value    │ Action      │ Status    │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  🔴 High CPM vs Peers (+35%)     │ All    │ $580K    │ [Discuss]   │ Open      │
│  🔴 Cost Discrepancy             │ 42     │ $125K    │ [Review]    │ Open      │
│  🟡 Missing Documentation        │ 28     │ $84K     │ [Request]   │ Pending   │
│  🟡 Code Mismatches              │ 24     │ $72K     │ [Validate]  │ Open      │
│  🟢 Duplicate Billing (Resolved) │ 12     │ $36K     │ [Closed]    │ Resolved  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Documentation Package
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  📦 Settlement Documentation Package                      [Generate Package]   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ☑️  Executive Summary Report (Auto-generated)                                  │
│  ☑️  CPM Analysis with Peer Comparison                                          │
│  ☑️  Rejected Claims Detail (111 claims)                                        │
│  ☑️  Supporting Attachments (342 files)                                         │
│  ☑️  Code Validation Report                                                     │
│  ☑️  YoY Trend Analysis                                                         │
│  ☐  Contract Terms Reference                                                   │
│  ☐  Previous Settlement History                                                │
│                                                                                 │
│  [Preview Package]  [Download All (.zip)]  [Send to Provider]                  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Settlement Actions
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  ⚡ Quick Actions                                                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  [📊 Generate Full Report]     [📧 Schedule Meeting]    [✍️ Create Agreement]  │
│                                                                                 │
│  [📋 Export to Excel]          [🖨️ Print Summary]       [📁 Archive Period]    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Navigation Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│  HOME                                                                           │
│    │                                                                            │
│    └──► Provider Relation Dashboard (Page 1)                                    │
│           │                                                                     │
│           ├──► Provider Detail (Page 2)                                         │
│           │      │                                                              │
│           │      ├──► Claim Batches (Page 3)                                    │
│           │      │      │                                                       │
│           │      │      └──► Claim Detail (Page 4)                              │
│           │      │             - Attachments                                    │
│           │      │             - Code Validation                                │
│           │      │             - Audit Trail                                    │
│           │      │                                                              │
│           │      └──► Top Services Analysis                                     │
│           │                                                                     │
│           └──► Commercial Settlement (Page 5)                                   │
│                  - Reconciliation Triggers                                      │
│                  - Documentation Package                                        │
│                  - Settlement Actions                                           │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Color & Style Notes (TachyHealth Brand)

- **Primary Color**: #28AAE2 (Cyan) - Used for primary buttons, links, highlights
- **Accent Color**: #1863DC (Blue) - Used for secondary actions, charts
- **Risk Colors**:
  - High Risk: Red (#EF4444)
  - Medium Risk: Amber (#F59E0B)
  - Low Risk: Green (#22C55E)
- **Status Colors**:
  - Approved: Green
  - Rejected: Red
  - Pending: Amber
  - Partial: Orange
- **Typography**: Nunito Sans
- **Border Radius**: 8px (0.5rem)
- **Cards**: Light background with subtle border, consistent padding

---

## Approval Checklist

Please review and approve:

- [ ] Page 1: Provider Relation Dashboard layout
- [ ] Page 2: Provider Detail View with all attributes
- [ ] Page 3: Claim Batches View
- [ ] Page 4: Individual Claim Detail with attachments
- [ ] Page 5: Commercial Settlement View
- [ ] Navigation flow
- [ ] Overall visual style

Once approved, I will proceed with development.
