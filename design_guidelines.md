# Design Guidelines: TachyHealth iHop Platform

## Design Approach
**Brand**: TachyHealth - AI-driven healthcare solutions
**Reference**: https://www.tachyhealth.com/

**Key Principles**:
- Professional, modern healthcare aesthetic
- Clean, light backgrounds with vibrant accent colors
- Gradient hero sections for impactful landing areas
- Information clarity with professional trustworthiness

## Color Palette

### Primary Colors (TachyHealth Brand)
- **Primary Brand**: 196 78% 52% (#28AAE2 - cyan blue)
- **Primary Hover**: 196 78% 45%
- **Accent**: 216 79% 48% (#1863DC - deeper blue)
- **Accent Hover**: 216 79% 40%

### Light Mode
- **Background**: 0 0% 96% (#F6F6F6 - light gray)
- **Surface/Card**: 0 0% 100% (white)
- **Border**: 0 0% 88%
- **Text Primary**: 0 0% 0% (#000000)
- **Text Secondary**: 0 0% 40%

### Dark Mode
- **Background**: 0 0% 7%
- **Surface**: 0 0% 12%
- **Border**: 0 0% 20%
- **Text Primary**: 0 0% 95%
- **Text Secondary**: 0 0% 60%

### Status Colors (Both Modes)
- **High Risk**: 0 85% 60% (red)
- **Medium Risk**: 38 95% 50% (amber)
- **Low Risk**: 142 70% 45% (green)
- **Info**: 216 79% 48% (blue - matches accent)

### Gradient (Hero Sections)
- **Hero Gradient**: linear-gradient from magenta (#d946ef) through primary (#28AAE2) to teal (#0d9488)
- Used for hero sections and impactful landing areas

## Typography
- **Font Family**: "Nunito Sans", Arial, system-ui, sans-serif
- **Headings**: 
  - H1: text-4xl font-bold (Page titles)
  - H2: text-2xl font-semibold (Section headers)
  - H3: text-lg font-semibold (Card titles)
- **Body**: text-sm to text-base (Tables, cards, general content)
- **Labels**: text-xs font-medium uppercase tracking-wide (Table headers, badges)
- **Metrics**: text-4xl font-bold (Key statistics)

## Layout System
**Spacing**: Use Tailwind units of 2, 4, 6, and 8 consistently
- Component padding: p-4, p-6
- Section spacing: mb-6, mb-8
- Grid gaps: gap-4, gap-6
- Card padding: p-6
- Border radius: rounded-lg (8px)

**Grid Structure**:
- Sidebar: Fixed width with TachyHealth logo
- Main content: Remaining space
- Dashboard metrics: 4-column grid (lg:grid-cols-4)
- Module cards: 2-column grid (md:grid-cols-2)

## Component Library

### Navigation
- **Left Sidebar**: Clean with TachyHealth logo at top
- **Nav items**: Hover states with subtle background, active with primary color accent
- **Header**: Contains sidebar trigger and theme toggle

### Hero Sections
- **Home Page**: Large gradient background with welcome message
- **Text**: White text over gradient with dark overlay for readability
- **Style**: Matching TachyHealth website aesthetic

### Data Display

**Metric Cards**:
- White background with subtle border
- Large metric number (text-4xl) in primary color
- Label in secondary text color
- Rounded corners (rounded-lg)
- Subtle shadow on hover

**Data Tables**:
- Striped rows (even:bg-muted/50)
- Sticky header with background
- Text alignment: Left for text, right for numbers
- Row hover: subtle background highlight
- Compact padding (py-3 px-4)

**Badge System**:
- **Risk Badges**: Pill-shaped (rounded-full), small text
- **High Risk**: Red background
- **Medium Risk**: Amber background  
- **Low Risk**: Green background
- Padding: px-2.5 py-1

### Forms & Inputs
- **Border radius**: 8px (matching TachyHealth components)
- **Border color**: #CCCCCC for inputs
- **Focus states**: Primary color ring

### Buttons
- **Primary**: Background #28AAE2, white text, 8px radius
- **Secondary**: Background #1863DC, white text, 2px radius
- **Ghost**: Transparent with hover elevation

## Animations
Use sparingly:
- **Hover states**: Subtle elevation transition
- **Modal overlays**: Fade and scale entrance (duration-200)
- NO scroll animations, NO complex transitions

## Logo
- TachyHealth logo from attached_assets/logo.svg
- Displayed in sidebar header
- SVG format for crisp rendering at any size

## Accessibility
- WCAG AA contrast ratios for all text
- Keyboard navigation for tables and filters
- ARIA labels for interactive elements
- Focus indicators on interactive elements
- Dark mode toggle available

---

# Provider Relation Module - Design Specifications

## Overview
Comprehensive BI dashboard for provider benchmarking, KPI analysis, and commercial settlement support. Follows the "Dream Report" requirements for provider reconciliation.

## Page Structure

### Page 1: Provider Relation Dashboard (Main View)

**Header Section**
- TachyHealth logo (left) with separator
- Page title: "Provider Relation" with icon
- "Back to Home" button (right)

**Filter Bar**
- Search input: "Search Provider..." with search icon
- Dropdown filters: Region, Type, Network
- All filters in a horizontal row with gap-4 spacing

**KPI Summary Cards (4-column grid)**
```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Total Providers │  │  Avg CPM         │  │  Flagged         │  │  Pending         │
│      247         │  │    $1,245        │  │  Providers: 12   │  │  Settlement: 8   │
│   ▲ 12 new       │  │   ▲ +5.2% YoY    │  │   ▼ -3 vs last   │  │   $2.4M value    │
└──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘
```
- Each card: White background, rounded-lg, p-4
- Metric value: text-2xl font-bold
- Trend indicator: Small text with arrow icon, colored (green for positive, red for negative)

**Main Content - Two Column Layout**

*Left Column (60%): Provider Benchmarking Table*
- Card with header "Provider Benchmarking" and Export CSV button
- Table columns: Provider Name, Region, Type, CPM, Trend, Risk, Action (→)
- Risk badges: 🔴 High (red), 🟡 Medium (amber), 🟢 Low (green)
- Trend arrows: ▲ (green) for up, ▼ (red) for down
- Row hover: hover-elevate class
- Pagination at bottom

*Right Column (40%): Trend Charts*
- CPM Trends chart (Line chart, 2023 vs 2024)
- Billing Variance chart (Horizontal bar chart by provider type)
- Both using recharts library

**Automated Triggers Panel (Bottom, full width)**
- Card with header "Automated Triggers" and "View All" link
- List of trigger items with:
  - Icon (⚠️ warning, ℹ️ info)
  - Trigger type and description
  - [Review →] button

---

### Page 2: Provider Detail View

**Breadcrumb**: [← Back to Dashboard]

**Provider Header Card**
- Provider logo/avatar (initials if no logo)
- Provider name (large), Provider ID
- Horizontal divider
- Quick info row: Region | Type | Network | Specialty | Contract | Since
- Action buttons: [Generate Settlement Report] [Export Data] [View Contract]

**Provider Attributes Grid (3x2)**
```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  📍 Geographic      │  │  🏥 Services        │  │  📊 Volume          │
│  Region, City, Zone │  │  Service checklist  │  │  Members, Claims    │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  ⚠️ Risk Profile    │  │  📋 Top Policies    │  │  🔗 Networks        │
│  Fraud cases, score │  │  Ranked list        │  │  Network badges     │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```
- Each card: Icon + title in header, list content below
- Use consistent p-4 padding

**KPI Dashboard (2x2 grid)**
- Cost Per Member (CPM): Large metric, YoY comparison, vs peer average, trend sparkline
- Billing Variance: Percentage, peer comparison, rank
- Member Count Trend: Number with YoY change, line chart
- Claim Volume Trend: Monthly volume, bar chart

**Peer Comparison Table**
- Header: "Peer Comparison - Similar Providers (by region, type, tier)"
- Columns: Provider, CPM, Members, Claims, Variance
- Current provider highlighted with star (★)
- Peer average row at bottom (bold)

**Top Services Analysis Table**
- Columns: Service, Volume, Revenue, vs Peers, Trend, Flag
- Flag column shows ⚠️ for services significantly above peer average
- [View All Services] link at bottom

---

### Page 3: Claim Batches View

**Breadcrumb**: [← Back to Provider] > Provider Name > Claim Batches

**Header**
- Title: "Claim Batches"
- Subtitle: "Review claim submissions by batch for reconciliation"
- Filter row: Date Range dropdown, Status dropdown, Search Batch ID

**Batch Summary Cards (4-column)**
- Total Batches (count + value)
- Approved (count + percentage)
- Rejected (count + percentage)
- Pending Review (count + value)

**Batch List Table**
- Columns: Batch ID, Submit Date, Claims, Amount, Status, Issues, Action
- Status icons: ✓ Approved (green), ⚠ Partial (orange), ✗ Rejected (red), ⏳ Pending (gray)
- Issues column: Number badge
- Pagination at bottom

**Rejection Reasons Breakdown**
- Horizontal bar chart showing:
  - Cost Discrepancy (Pre-auth vs Claim)
  - Missing Documentation
  - Code Mismatch
  - Duplicate Billing
  - Policy Exclusion
- Each bar shows count and percentage

---

### Page 4: Individual Claim Detail

**Breadcrumb**: [← Back to Batch] > Batch ID > Claim ID

**Claim Header Card**
- Claim ID (large) with Status badge (right-aligned)
- Divider
- Info row: Member name (linked), Policy, Date of Service
- Action buttons: [Approve] [Reject] [Request Documentation] [Add to Settlement]

**Details Grid (2-column)**

*Left: Financial Details Card*
- Billed Amount
- Pre-Auth Amount
- Approved Amount
- Variance (with ⚠️ if significant)
- Discrepancy reason text

*Right: Clinical Details Card*
- Primary Diagnosis: ICD code + description
- Secondary Diagnoses
- Procedure code + description
- Length of Stay
- ICU indicator

**Code Validation Panel**
- Table columns: Service Code, Internal Code, Standard Code, Match, Issue
- Match column: ✓ (green) or ⚠️ (amber)
- Issue column: Text description (e.g., "Bundling Issue", "Out of Price List")
- Action buttons: [View Code Details] [Report Mismatch]

**Attachments Panel**
- Card header: "Claim Attachments" with [Download All] button
- List of attachments:
  - File icon (PDF/XLSX/etc)
  - File name + description
  - Upload date
  - [View] [Download] buttons
- Empty state if no attachments

**Claim History / Audit Trail**
- Timeline format (vertical)
- Each entry: Date/time | Action description
- Most recent at top

---

### Page 5: Commercial Settlement View

**Header**
- Title: "Commercial Settlement"
- Subtitle: "Prepare reconciliation packages for provider negotiations"
- Filter row: Provider dropdown, Period dropdown

**Settlement Summary Cards (4-column)**
- Total Billed (amount + claim count)
- Total Approved (amount + approval rate)
- Total Rejected (amount + claim count)
- Net Settlement (amount + status)

**Reconciliation Triggers Table**
- Header: "Reconciliation Triggers for Negotiation"
- Columns: Category (with colored dot), Claims, Value, Action, Status
- Categories with risk colors:
  - 🔴 High CPM vs Peers
  - 🔴 Cost Discrepancy
  - 🟡 Missing Documentation
  - 🟡 Code Mismatches
  - 🟢 Duplicate Billing (Resolved)
- Status: Open, Pending, Resolved badges

**Documentation Package Builder**
- Card with checkboxes for package contents:
  - ☑️ Executive Summary Report
  - ☑️ CPM Analysis with Peer Comparison
  - ☑️ Rejected Claims Detail
  - ☑️ Supporting Attachments
  - ☑️ Code Validation Report
  - ☑️ YoY Trend Analysis
  - ☐ Contract Terms Reference
  - ☐ Previous Settlement History
- Buttons: [Preview Package] [Download All] [Send to Provider]

**Quick Actions Row**
- 6 action buttons in 2 rows of 3:
  - [Generate Full Report] [Schedule Meeting] [Create Agreement]
  - [Export to Excel] [Print Summary] [Archive Period]

---

## Navigation Flow

```
HOME
  │
  └──► Provider Relation Dashboard
         │
         ├──► Provider Detail
         │      │
         │      ├──► Claim Batches
         │      │      │
         │      │      └──► Claim Detail
         │      │             - Attachments
         │      │             - Code Validation
         │      │             - Audit Trail
         │      │
         │      └──► Top Services Analysis
         │
         └──► Commercial Settlement
                - Reconciliation Triggers
                - Documentation Package
                - Settlement Actions
```

---

## Responsive Behavior

**Desktop (≥1280px)**
- Full layout as described
- 2-column layouts for detail pages
- 4-column KPI grids

**Tablet (768px-1279px)**
- KPI cards: 2-column grid
- Main content: Stacked layout
- Tables: Horizontal scroll if needed

**Mobile (<768px)**
- Single column layouts
- KPI cards: 1 or 2 columns
- Collapsible filter panels
- Card-based data display instead of tables

---

## Data Visualization (Recharts)

**Line Charts (Trend comparisons)**
- Dual lines for YoY comparison
- Colors: Primary (#28AAE2) for current, muted gray for previous
- Tooltip on hover

**Bar Charts (Volume/Value comparisons)**
- Horizontal bars for category breakdown
- Colored by status/risk level
- Value labels at end of bars

**Donut Charts (Distribution)**
- For status breakdown (Approved/Rejected/Pending)
- Center text showing total or key metric

---

## Approval Checklist

- [ ] Page 1: Provider Relation Dashboard layout
- [ ] Page 2: Provider Detail View with all attributes
- [ ] Page 3: Claim Batches View
- [ ] Page 4: Individual Claim Detail with attachments
- [ ] Page 5: Commercial Settlement View
- [ ] Navigation flow
- [ ] Responsive behavior
- [ ] Chart specifications
