# Daman Pillars — Persona Portals Design

**Date:** 2026-02-28
**Status:** APPROVED
**Approach:** Persona Portals (personalized self-service views per pillar)

## Context

The CHI Platform has three Daman pillars (excluding FWA) with 18 pages of static dashboards backed by hardcoded mock data. To convince CHI executives that these pillars belong in existing ecosystems, we need to transform them from read-only dashboards into personalized portals that solve real problems for real personas.

### Key Decisions

- **Demo format:** Live guided demo with scripted golden paths
- **Value proposition:** Single pane of glass for oversight — personalized to each user
- **Gaps addressed:** Interactivity, workflows, and data depth
- **Data strategy:** Database-backed with rich seed data (50+ providers, 100+ employers, 20-30 members)

### Personas

| Pillar | Persona | Role | Golden Path |
|--------|---------|------|-------------|
| Intelligence | Dr. Ahmed Al-Rashidi | Coding Director, Riyadh Care Hospital | Scorecard → Rejection deep-dive → DRG readiness |
| Business | Nora Al-Harbi | HR Director, Al Madinah Construction Group | Company profile → Workforce health → Cost optimization |
| Members | Fatimah Al-Dosari | Patient, working mother in Jeddah | Coverage transparency → Provider search → Complaint tracking |

---

## Section 1: Data Foundation

All pillar data moves from hardcoded JSON in route handlers to database tables with rich seed data.

### New Database Tables

**Shared / Cross-Pillar:**

- `providers` — 50+ Saudi healthcare facilities (name, name_ar, license_no, region, city, type, bed_count, specialties, accreditation_status, contact info)
- `insurers` — 25 licensed Saudi insurers (financials, market share, loss ratios)
- `regions` — 13 Saudi administrative regions (population, coverage stats)

**Intelligence Pillar:**

- `provider_scorecards` — Monthly scorecard snapshots per provider (coding_accuracy, rejection_rate, sbs_compliance, drg_readiness, documentation_quality, fwa_flag_count, overall_score)
- `provider_rejections` — Individual rejection records (provider, claim_ref, icd_code, cpt_code, denial_reason, denial_category, amount_sar, date) — ~500 records
- `provider_drg_assessments` — Per-provider DRG readiness (criteria checklist with status per item)

**Business Pillar:**

- `employers` — 100+ Saudi companies (name, cr_number, sector, size_band, employee_count, city, region, compliance_status, policy_id)
- `employer_policies` — Insurance policy details per employer (insurer, plan_tier, premium_per_employee, coverage_start/end, dependents_count)
- `workforce_health_profiles` — Aggregate health metrics per employer (avg_age, chronic_condition_prevalence, utilization_rate, top_diagnoses, wellness_score, absenteeism_rate, cost_per_employee)
- `employer_violations` — Compliance violation records with fine amounts

**Members Pillar:**

- `members` — 20-30 demo member profiles (name, iqama_no, policy_number, employer, insurer, plan_tier, dependents, city, region)
- `member_coverage` — Detailed coverage per member/plan (benefit_category, covered, limit_sar, used_sar, remaining_sar, copay_pct)
- `member_complaints` — Complaint tickets with status tracking (type, description, status, assigned_to, created_at, resolved_at, resolution_notes)
- `provider_directory` — Extended provider info for member search (specialties, accepted_insurers, rating, wait_time_mins, lat/lng, languages, gender)

### Seed Data Scale

| Entity | Count | Rationale |
|--------|-------|-----------|
| Providers | 50+ | Covers all 13 regions, mix of hospital types |
| Employers | 100+ | Mix of sectors (construction, tech, hospitality, oil & gas, retail, healthcare) |
| Members | 20-30 | Enough for demo personas with distinct profiles |
| Rejections | 500+ | Enables realistic pattern analysis |
| Scorecards | 50 x 6 months = 300 | Time-series for trend charts |
| Coverage items | 30 members x 10 categories = 300 | Detailed per-member benefits |

### Seed Data Realism Principles

- All provider names are real Saudi hospital names or realistic composites
- Employer names use real Saudi company archetypes (not real companies)
- Member names are common Saudi/Arabic names with realistic IQAMA formats
- Financial figures in SAR, scaled to market reality
- ICD-10-AM and ACHI codes (Saudi standard, not US)
- Regional distribution mirrors actual Saudi population density

---

## Section 2: Daman Intelligence Portal — Provider Persona

**Persona:** Dr. Ahmed Al-Rashidi, Coding Director at Riyadh Care Hospital

### Golden Path: Scorecard → Rejections → DRG Readiness

**Act 1 — "How does my hospital score?"**

New **Provider Profile** page (`/intelligence/provider/:id`). Dr. Ahmed sees:

- Overall score (92/100) with trend arrow
- Radar chart: 6 dimensions (Coding Accuracy, SBS Compliance, DRG Readiness, Documentation Quality, Rejection Rate inverted, FWA Risk)
- Peer benchmark overlay: "Top 15% of tertiary hospitals in the Central Region"
- 6-month trend line chart
- Quick-action cards: "3 items need attention" linking to specific issues

**Act 2 — "Why are my claims getting rejected?"**

Click rejection rate KPI → **Rejection Deep-Dive** (`/intelligence/provider/:id/rejections`):

- Summary: 47 rejections out of 573 claims this month
- Denial reason breakdown (bar chart): Missing documentation 34%, Code mismatch 28%, Medical necessity 21%, Pre-auth expired 17%
- Sortable/filterable table of individual rejected claims (claim ref, patient MRN, ICD, CPT, denial reason, amount SAR, date)
- Click row → Claim Detail Panel (slide-over): what went wrong + recommendation ("Tip: ICD J18.9 requires chest X-ray documentation to support medical necessity")
- 6-month rejection rate trend (was 12.1% → now 8.2%, improving)

**Act 3 — "Am I ready for DRG?"**

Click DRG readiness KPI → **DRG Assessment** (`/intelligence/provider/:id/drg`):

- 8-item readiness checklist with status (complete ✅ / in-progress 🔄 / not-started ❌):
  1. Clinical coder certification ✅
  2. ICD-10-AM V12 adoption ✅
  3. ACHI procedure coding ✅
  4. Grouper software installed 🔄
  5. DRG-based costing model 🔄
  6. Clinical documentation standards ✅
  7. Unbundling compliance ❌
  8. Staff training program ✅
- Per-criteria detail: gap description + recommended action
- Projected readiness date: "Full readiness by Q3 2026"
- Peer comparison: "67% of similar hospitals have completed grouper installation"

### New Pages

| Page | Route | Description |
|------|-------|-------------|
| Provider Profile | `/intelligence/provider/:id` | Scorecard with radar chart and peer benchmarks |
| Rejection Deep-Dive | `/intelligence/provider/:id/rejections` | Claim-level rejection analysis |
| DRG Assessment | `/intelligence/provider/:id/drg` | Readiness checklist with projections |

### New Components

- Provider Selector (sidebar dropdown to switch providers)
- Radar Chart (6-dimension scorecard)
- Peer Benchmark Bar (horizontal comparison)
- Claim Detail Panel (slide-over)

### Navigation

```
Daman Intelligence
├── Overview
│   └── Dashboard (regulator aggregate — existing)
├── My Hospital (NEW — provider portal)
│   ├── Provider Profile & Scorecard
│   ├── Rejection Analysis
│   └── DRG Readiness
└── Provider Oversight (existing)
    ├── Accreditation Scorecards
    ├── SBS V3.0 Compliance
    ├── DRG Readiness
    ├── Rejection Patterns
    └── Documentation Quality
```

### Demo Personas (3 providers for switching)

1. **Riyadh Care Hospital** — Top performer (92/100, 8.2% rejection, 78% DRG ready)
2. **Tabuk Care Center** — Struggling (55/100, 22% rejection, 25% DRG ready)
3. **Jeddah National Medical Center** — Mid-tier (74/100, 14% rejection, 52% DRG ready)

---

## Section 3: Daman Business Portal — Employer Persona

**Persona:** Nora Al-Harbi, HR Director at Al Madinah Construction Group (1,200 employees)

### Golden Path: Compliance → Workforce Health → Cost Optimization

**Act 1 — "Is my company compliant and healthy?"**

New **Employer Profile** page (`/business/employer/:id`):

- Large compliance badge: green "Compliant" or red "Action Required"
- Employee coverage: 1,200 total, 1,164 insured (97%), 36 pending
- Current policy: Tawuniya Gold, 4,200 SAR/employee/year, renewal in 84 days
- Violation history: 1 past (late enrollment, 15,000 SAR fine, resolved)
- Alert: "36 employees missing coverage — enroll by March 15 to avoid penalty"

**Act 2 — "What does my workforce health look like?"**

Click Workforce Health → **Health Profile** (`/business/employer/:id/health`):

- Demographics donut: age distribution
- Chronic condition prevalence: Diabetes 14.2%, Hypertension 11.8%, Musculoskeletal 9.4% (construction-specific)
- Utilization: 3.2 visits/employee/year, 12% ER utilization (vs 8% benchmark)
- Cost: 5.04M SAR total, 4,200 SAR/employee, trending up 8% YoY
- Absenteeism: 4.8 days/employee (sector benchmark: 3.2)
- Wellness score: 62/100 with breakdown
- Insight cards: "High ER utilization suggests employees lack primary care access near worksites" and "Musculoskeletal claims 2.3x national average — ergonomics assessment recommended"

**Act 3 — "How can I optimize costs?"**

Click Cost Intelligence → **Cost Optimization** (`/business/employer/:id/costs`):

- Plan comparison table: current vs 2 alternatives (premium, coverage, network size, savings)
- What-if simulator: "Add wellness program → save 340K SAR/year"
- Benchmark: "Your 4,200 SAR/employee is 12% above construction sector average of 3,750"
- Renewal forecast: "Expect 6-9% increase. Improving ER utilization could reduce to 3-5%."

### New Pages

| Page | Route | Description |
|------|-------|-------------|
| Employer Profile | `/business/employer/:id` | Compliance status and company overview |
| Workforce Health | `/business/employer/:id/health` | Aggregate workforce health analytics |
| Cost Intelligence | `/business/employer/:id/costs` | Cost analysis and optimization |

### New Components

- Employer Selector (search/dropdown)
- Demographics Donut (age/gender distribution)
- Condition Prevalence Bars (with benchmark overlay)
- Plan Comparison Table (side-by-side)
- Insight Cards (actionable recommendations)

### Navigation

```
Daman Business
├── Overview
│   └── Dashboard (regulator aggregate — existing)
├── My Company (NEW — employer portal)
│   ├── Company Profile & Compliance
│   ├── Workforce Health Profile
│   └── Cost Intelligence
└── Market Oversight (existing)
    ├── Employer Compliance
    ├── Insurer Health Monitor
    ├── Market Concentration
    ├── Coverage Expansion
    └── Cost Containment
```

### Sector-Specific Health Profiles

Each employer's health data reflects their industry:

- **Construction** → high musculoskeletal, respiratory, workplace injury
- **Tech** → high mental health, sedentary conditions, vision
- **Hospitality** → infectious disease exposure, irregular hours impact
- **Oil & Gas** → respiratory, occupational hazards, remote location access
- **Healthcare** → burnout, needle-stick exposure, above-average preventive uptake
- **Retail** → lower acuity, foot/back conditions, shift work impact

### Demo Personas (3 employers for switching)

1. **Al Madinah Construction Group** — 1,200 employees, construction, high musculoskeletal
2. **Nujoom Tech Solutions** — 280 employees, tech, high mental health utilization
3. **Gulf Hospitality Co** — 600 employees, hospitality, mixed workforce nationalities

---

## Section 4: Daman Members Portal — Patient Persona

**Persona:** Fatimah Al-Dosari, 34, Saudi, works in retail, mother of two, Jeddah

### Golden Path: Coverage → Provider Search → Complaint Tracking

**Act 1 — "What am I covered for?"**

New **My Coverage** page (`/members/my-coverage`):

- Profile header: name, policy SA-2024-00789, Bupa Arabia Gold, employer Nujoom Retail Group, valid through Dec 2026
- Coverage grid — each category as a card:
  - Icon + name (English and Arabic)
  - Status: Covered ✅ / Partial ⚠️ / Not Covered ❌
  - Annual limit + used (progress bar)
  - Copay percentage
  - Plain-language note (no insurance jargon)

| Category | Status | Limit | Used | Copay | Note |
|----------|--------|-------|------|-------|------|
| Emergency Care | ✅ | Unlimited | — | 0% | "Walk into any ER. No pre-approval needed." |
| Maternity | ✅ | 45,000 SAR | 0 | 10% | "Prenatal, delivery, postnatal. Pre-approval for C-section." |
| Outpatient Visits | ✅ | 150 visits/yr | 12 | 20% | "GP and specialist. 12 of 150 used this year." |
| Mental Health | ⚠️ | 5,000 SAR | 1,200 | 25% | "10 sessions/year. Psychiatry requires referral." |
| Dental | ✅ | 8,000 SAR | 3,400 | 20% | "Cleanings, fillings. Orthodontics not covered." |
| Optical | ✅ | 2,000 SAR | 0 | 15% | "One exam + one pair of glasses per year." |
| Chronic Conditions | ✅ | 80,000 SAR | 14,200 | 10% | "Diabetes, hypertension, asthma. Meds included." |
| Prescription Drugs | ✅ | 25,000 SAR | 6,800 | 15% | "Generic preferred. Brand-name needs pre-approval." |
| Physiotherapy | ⚠️ | 12 sessions/yr | 4 | 20% | "Requires referral from treating physician." |
| Cosmetic | ❌ | — | — | — | "Elective cosmetic procedures excluded." |

- "Is X covered?" search box — pre-loaded with 30 common lookups returning plain-language answers

**Act 2 — "Find me the right provider"**

New **Provider Search** page (`/members/find-provider`):

- Filter bar: specialty dropdown, city (default Jeddah), "Accepts my insurance" toggle, sort by rating/wait/distance
- Results as cards: name, type, rating (stars + review count), wait time, distance, accepted insurers, specialties, languages, open/closed status
- Click → Provider Detail Panel (slide-over): address, phone, hours, department-level detail with doctors, patient satisfaction breakdown (cleanliness, staff, wait, quality), "Covered under your plan" badge

**Act 3 — "I have a problem"**

New **Complaint Tracker** page (`/members/my-complaints`):

- Active complaint:
  - Ticket #CM-2026-04821, Claim Denial
  - "Dermatology denied as cosmetic — was eczema treatment"
  - Visual status timeline (stepper): Submitted ✅ → Under Review ✅ → Investigation 🔄 → Resolution ⬜ → Closed ⬜
  - Estimated resolution: 5-7 business days
  - Message thread between member and review team
- "File New Complaint" button (complaint types: Claim Denial, Billing Dispute, Coverage Question, Provider Quality, Other)
- Historical complaints (1 resolved, 8-day resolution)

### New Pages

| Page | Route | Description |
|------|-------|-------------|
| My Coverage | `/members/my-coverage` | Plain-language benefits with search |
| Find a Provider | `/members/find-provider` | Filterable provider directory |
| My Complaints | `/members/my-complaints` | Complaint tracking with timeline |

### New Components

- Member Profile Header (name, policy, insurer, plan)
- Coverage Search (pre-loaded lookup)
- Provider Card (search result)
- Provider Detail Panel (slide-over)
- Status Timeline (visual stepper)

### Navigation

```
Daman Members
├── Overview
│   └── Dashboard (regulator aggregate — existing)
├── My Health (NEW — member portal)
│   ├── My Coverage
│   ├── Find a Provider
│   └── My Complaints
└── Beneficiary Services (existing)
    ├── Complaints & Disputes
    ├── Coverage Gap Monitor
    ├── Provider Quality
    ├── Report Fraud
    └── Benefits Awareness
```

### Demo Personas (3 members for switching)

1. **Fatimah Al-Dosari** — Gold plan, active complaint, mother of two, Jeddah
2. **Omar Al-Zahrani** — Bronze plan, diabetic (high chronic usage), Riyadh
3. **Priya Sharma** — Expat Silver plan, pregnant, Dammam

---

## Section 5: Shared UI Patterns

### Persona Switcher

Sidebar dropdown that switches between pre-loaded personas per pillar. Switching reloads all portal pages with that entity's data. Each pillar has 3 personas showing contrasting stories.

### Entity Profile Header

Reusable banner: entity name + type badge, key identifiers, status indicator, last updated, pillar-themed color bar.

### KPI Cards with Drill-Down

Existing Card components enhanced: clickable (navigates to detail), trend indicator (arrow + % vs last month), benchmark line, consistent sizing.

### Insight Cards

Actionable recommendations: icon (lightbulb/warning/check), headline, body with recommendation, relevance tag (Cost Impact/Compliance/Quality). Seeded per entity.

### Data Tables with Filter/Sort

Shared filterable table: column sorting, text search, category filters, pagination, row click → detail panel. Used for rejections, employees, complaints, providers.

### Timeline/Stepper

Vertical status timeline for: complaint progression (Members), DRG milestones (Intelligence), violation resolution (Business).

---

## Section 6: Demo Script — 15-Minute Executive Walkthrough

### Opening (1 min)

Home page showing all three pillars. "Each pillar serves a different user in the healthcare ecosystem. Let me show you what each of them sees."

### Act 1 — Intelligence: Dr. Ahmed (4 min)

1. Intelligence → My Hospital → Riyadh Care Hospital
2. Scorecard: 92/100, top 15% Central Region (30s)
3. Rejection Analysis: 8.2% rate, 34% from missing docs, click a claim → specific fix recommendation (90s)
4. DRG Readiness: 6/8 complete, projected Q3 2026 (60s)
5. Switch to Tabuk Care Center: score 55, 22% rejection — "same portal, different story" (30s)

### Act 2 — Business: Nora (4 min)

1. Business → My Company → Al Madinah Construction Group
2. Profile: 97% coverage, 36 pending, 1 past violation (30s)
3. Workforce Health: construction-specific profile, musculoskeletal 2.3x average, actionable insights (90s)
4. Cost Intelligence: 12% above sector, plan alternatives, wellness program savings (60s)
5. Switch to Nujoom Tech: mental health focus — "sector-specific intelligence" (30s)

### Act 3 — Members: Fatimah (4 min)

1. Members → My Health → Fatimah Al-Dosari
2. Coverage: maternity covered, 45K limit, 10% copay — plain language (60s)
3. "Is IVF covered?" search → not covered, available as rider (20s)
4. Find Provider: pediatrician in Jeddah, Bupa network, ratings and wait times (60s)
5. Complaints: claim denial tracked step-by-step, no phone calls needed (60s)

### Closing (2 min)

Return to home. "Three pillars, three personas, three problems solved. Providers see their CHI standing. Employers see workforce health intelligence. Members see their coverage in plain language. One platform, every stakeholder served."

---

## Scope Boundaries

**Building:**
- 9 new portal pages (3 per pillar)
- 12+ new components (shared across pillars)
- 15+ new database tables with rich seed data
- Persona switcher for live demo
- Enhanced existing dashboards with clickable KPI cards

**NOT building:**
- Authentication/login — personas selected via switcher
- Real-time data — seed data only, refreshed on restart
- Email/SMS notifications — insights shown in-portal only
- Arabic RTL layout — bilingual labels yes, full RTL no
- Mobile-specific views — responsive but desktop-first
- Integration with real systems (Nphies, Yakeen) — referenced but not connected
