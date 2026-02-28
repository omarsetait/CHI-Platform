# CHI Demo Data Realism & Polish — Design Document

**Date:** 2026-02-28
**Author:** Product & Engineering
**Status:** Approved

---

## Context

TachyHealth's CHI demo platform has the architecture and pages in place. The next step is making the demo **feel real** to CHI executives. The primary weakness: data feels synthetic, UI needs polish on demo-path pages, and features lack drill-down depth.

**Goal:** CHI demo polish — make every screen a CHI executive sees feel like it reflects their actual ecosystem.

**Approach:** Data Realism Blitz (70%) + Connected Case Studies (20%) + Targeted UI Polish (10%)

**Demo scope:** FWA pillar only — Command Center, High-Risk Entities, Flagged Claims, Coding Intelligence, Online Listening, Enforcement & Compliance.

---

## 1. Saudi Healthcare Data Universe

### 1.1 Provider Directory (50+ entities)

**Tier 1 — Major Hospital Groups (10-12):**
- King Fahad Medical City (Riyadh) — government flagship
- King Faisal Specialist Hospital & Research Centre (Riyadh/Jeddah)
- Dr. Sulaiman Al Habib Medical Group (Riyadh, Jeddah, Khobar)
- Saudi German Hospital (Riyadh, Jeddah, Dammam, Madinah)
- Dallah Health Company (Riyadh)
- Mouwasat Medical Services (Riyadh, Dammam, Jubail, Qatif)
- Al Hammadi Hospital (Riyadh)
- National Guard Health Affairs — King Abdulaziz Medical City (Riyadh)
- King Abdulaziz University Hospital (Jeddah)
- Almana General Hospital (Dammam)
- Al Moosa Specialist Hospital (Al Ahsa)
- Habib Medical Group (Olaya, Riyadh)

**Tier 2 — Specialty Clinics & Mid-size (20-25):**
- Dental centers: Al Noor Dental Center, Smile Plus Clinic, Riyadh Dental Care, Pearl Dental Center, Al Jazeera Dental, Elite Smile Dental
- OB/GYN: Al Hayat Women's Hospital, Rana Women's Clinic, Al Amal Maternity Center
- Orthopedic: Al Razi Orthopedic Center, Bone & Joint Specialist Clinic
- Ophthalmology: Magrabi Eye Hospital, Al Basar Eye Center
- Multi-specialty: Al Shifa Medical Complex, Al Salam Medical Center, Al Dawaa Medical Group
- Distributed across: Riyadh, Jeddah, Dammam, Makkah, Madinah, Taif, Abha, Tabuk

**Tier 3 — Small/Solo Practices (15-20):**
- Individual physician practices (Dr. [Name] Clinic)
- Community pharmacies
- Home healthcare agencies
- Physiotherapy centers

### 1.2 Insurers (8-10)

| Insurer | Market Position |
|---------|----------------|
| Bupa Arabia | Largest, premium segment |
| Tawuniya (Company for Cooperative Insurance) | Second largest, broad market |
| Medgulf | Mid-tier, growing |
| AXA Cooperative (GIG Saudi) | International backing |
| Gulf Union Cooperative | Eastern Province focus |
| Walaa Cooperative | Government sector focus |
| Arabian Shield | Mid-market |
| ACIG (Allied Cooperative) | Growing player |
| Malath Insurance | Smaller, niche |
| Al Rajhi Takaful | Sharia-compliant focus |

### 1.3 Demographics

- **Patient names:** Mix of Saudi nationals (Abdullah, Mohammed, Fatimah, Noura, etc.) + expat workers (South Asian, Filipino, Arab expat names)
- **Doctor names:** Saudi + Arab-trained physicians, Western-trained specialists
- **ID formats:** Saudi National ID (10 digits starting with 1), Iqama (10 digits starting with 2)
- **Currency:** SAR throughout — no USD anywhere in the platform
- **Regional distribution:** Riyadh 35%, Makkah Province 25%, Eastern Province 15%, Madinah 8%, Asir 5%, Others 12%

### 1.4 KPI Baselines (Matched to CHI Published Data)

| Metric | Value | Source/Basis |
|--------|-------|--------------|
| Total beneficiaries | 11.5M | CHI annual report |
| Annual claims volume | ~180M transactions | NPHIES published stats |
| Overall rejection rate | 15% | CHI strategy documents |
| Detected fraud cases/year | ~200 | CHI enforcement data |
| Admin cost ratio | 18.7% | CHI strategy (vs 12% OECD benchmark) |
| Active licensed insurers | 25 | CHI licensed list |
| SBS V3.0 compliance rate | ~62% | Plausible estimate (went live Jan 2026) |
| AR-DRG pilot participation | 12 hospitals | CHI DRG initiative data |
| Average claim processing time | 4.2 days | Industry benchmark |
| Active enforcement cases | 47 | Scaled from ~200/year |

### 1.5 Medical Coding

- **Diagnosis codes:** ICD-10-AM (Australian Modification — Saudi standard, NOT US ICD-10-CM)
- **Procedure codes:** ACHI (Australian Classification of Health Interventions — Saudi standard, NOT US CPT)
- **DRG:** AR-DRG (Australian Refined Diagnosis Related Groups)
- **SBS V3.0:** Saudi Billing System coding standards (effective Jan 2026)

---

## 2. Fraud Case Studies (Golden Demo Paths)

### Case Study 1: "The Riyadh Dental Ring"
**Fraud vector:** Phantom billing (CHI's #1 fraud type)

**Story:** A network of 4 dental clinics in Riyadh — Al Noor Dental Center, Smile Plus Clinic, Riyadh Dental Care, Pearl Dental Center — all controlled by the same beneficial owner through shell companies. They submit phantom billing for procedures never performed, spreading claims across 3 insurers (Bupa Arabia, Tawuniya, Medgulf) to avoid single-insurer detection.

**Data trail across pages:**

| Page | What appears |
|------|-------------|
| Command Center | Dental fraud alert in Riyadh region, "4 linked entities flagged" |
| High-Risk Entities | All 4 clinics with risk scores 87-94/100, linked by ownership network, 340 shared patients |
| Flagged Claims | 847 flagged claims — root canals on extracted teeth, multiple crowns in 2-week windows, claims during clinic closures |
| Coding Intelligence | ICD-10 K04.7 (Periapical abscess) + full mouth reconstruction — CPOE flags as implausible |
| Enforcement | Active case, investigation phase, SAR 2.3M estimated fraud, licenses under review |

**Detection methods:**
- Rule Engine: Duplicate procedure on same tooth within 30 days
- Statistical: Claim volume 4.2x peer group average
- Network Analysis: Shared beneficial owner + 340-patient overlap
- Semantic: ICD-CPT mismatch on 23% of claims (vs 3% normal)

---

### Case Study 2: "The Jeddah OB/GYN Upcoding Cluster"
**Fraud vector:** Systematic upcoding (CHI's #2 fraud type)

**Story:** Al Hayat Women's Hospital in Jeddah systematically upcodes routine prenatal visits as high-complexity consultations and bills normal deliveries as C-sections (SAR 12,000 vs SAR 4,500). Their C-section rate is 68% vs the national average of 23%.

**Data trail:**

| Page | What appears |
|------|-------------|
| Command Center | OB/GYN upcoding alert in Makkah region |
| High-Risk Entities | Al Hayat Women's Hospital, risk score 79/100, C-section rate 68% vs 23% national |
| Flagged Claims | 312 flagged claims — C-section billing anomaly, prenatal upcoding, rebilling follow-ups |
| Online Listening | 2 social media posts about pressure for unnecessary C-sections, 1 news article |
| Enforcement | Preliminary investigation, SAR 890K estimated overpayment, enhanced monitoring |

**Detection methods:**
- Statistical: C-section rate 2.96x national average
- Rule Engine: Prenatal visit complexity mismatch
- RAG/LLM: AI analysis flags systematic pattern
- Online Listening: Patient complaints corroborate billing pattern

---

### Case Study 3: "Cross-Insurer Duplicate Billing"
**Fraud vector:** Duplicate claims across insurers (unique to multi-insurer ecosystems)

**Story:** Eastern Province Medical Center in Dammam submits the same procedure for the same patient to 2 different insurers — exploiting employer transitions where old policies haven't terminated.

**Data trail:**

| Page | What appears |
|------|-------------|
| Command Center | Duplicate claims alert in Eastern Province |
| High-Risk Entities | Eastern Province Medical Center, risk score 72/100 |
| Flagged Claims | 156 duplicate pairs — same patient, same procedure, same date, different insurer |
| Coding Intelligence | High processing times on second submissions (CPOE flags) |
| Enforcement | Early detection, SAR 1.1M in duplicate payments, coordinating with Bupa Arabia + Gulf Union |

**Detection methods:**
- Cross-insurer matching (TachyHealth's unique value — only possible at regulator level)
- Rule Engine: Same patient + same procedure + same date + different payer
- Statistical: Abnormal dual-coverage claim rate

---

## 3. Page-by-Page Enhancements

### 3.1 Command Center (`/fwa/dashboard`)

| Enhancement | Details |
|-------------|---------|
| Saudi Arabia regional heatmap | Custom SVG map, 13 regions, color-coded by FWA activity. Clickable regions. |
| Real-time alert feed | Ticker with case study alerts + background alerts for ecosystem feel |
| Executive KPI cards | SAR amounts, CHI-baseline numbers, trend arrows, bilingual labels |
| Arabic labels | Bilingual on KPI cards and section headers (English primary, Arabic subtitle) |
| NPHIES claim flow | Framer Motion animation: Provider → NPHIES → TachyHealth AI → Accept/Flag → Insurer |

### 3.2 High-Risk Entities (`/fwa/high-risk-entities`)

| Enhancement | Details |
|-------------|---------|
| Saudi provider names | Full names, facility types, cities, license numbers |
| Risk score badges | Color-coded: Critical >85, High 70-84, Elevated 50-69 |
| Drill-down panel | Side panel with risk breakdown, flagged claims count, peer comparison chart, behavior timeline |
| Network visualization | For dental ring: ownership graph connecting 4 clinics |
| Functional filters | Region, specialty, risk tier, insurer |

### 3.3 Flagged Claims (`/fwa/flagged-claims`)

| Enhancement | Details |
|-------------|---------|
| Realistic claim data | ICD-10-AM codes, ACHI procedures, SAR amounts, Saudi names |
| Fraud pattern tags | "Phantom Billing", "Upcoding", "Cross-Insurer Duplicate", "Impossible Sequence" as colored badges |
| Detection method breakdown | Which of 5 methods flagged, with confidence scores |
| Claim detail modal | Service lines, AI summary, similar claims, recommended action |
| Batch actions | "Escalate", "Request Documentation", "Clear Flag" — functional status updates |

### 3.4 Coding Intelligence (`/fwa/coding-intelligence`)

| Enhancement | Details |
|-------------|---------|
| Live query demo | Pre-populated with case study ICD-CPT pairs for real-time CPOE engine decisions |
| Rejection trends chart | Monthly rates from CPOE data, annotated with policy change dates |
| Top flagged pairs | Frequency table of most commonly rejected combinations |
| Processing metrics | Avg processing time, common rejection reasons, volume trends |

### 3.5 Online Listening (`/fwa/online-listening`)

| Enhancement | Details |
|-------------|---------|
| Saudi social posts | Realistic Arabic/English posts about healthcare fraud, billing complaints |
| News articles | Plausible Saudi Gazette / Arab News headlines about healthcare regulation |
| Sentiment timeline | Spike in dental fraud mentions correlating with Case Study 1 |
| Source breakdown | Twitter/X, news outlets, patient forums, with sentiment scoring |
| FWA case links | Posts that triggered investigation, connected to case studies |

### 3.6 Enforcement & Compliance (`/fwa/enforcement`)

| Enhancement | Details |
|-------------|---------|
| 3 active cases | Case studies at different enforcement stages |
| Case timeline | Visual pipeline: Detection → Review → Investigation → Evidence → Hearing → Decision → Penalty → Recovery |
| SAR penalty amounts | Realistic fines per CHI enforcement history |
| Insurer compliance scorecards | 8-10 insurers rated on response time, cooperation, documentation |
| Case detail view | Evidence summary, provider response, regulatory recommendation |

---

## 4. Technical Implementation

### 4.1 Data Seeding

**Single comprehensive seed script:** `server/scripts/seed-chi-demo.ts`
- Clears existing demo data
- Seeds in dependency order: Insurers → Providers → Doctors → Patients → Claims → FWA Cases → Enforcement
- Case studies as anchor data, ecosystem fills around them
- Idempotent — re-runnable without duplicates
- Saudi constants file: `server/data/saudi-constants.ts` (regions, cities, names, codes)

### 4.2 UI Implementation

- Existing component library only: shadcn/ui + Recharts + Framer Motion
- Saudi heatmap: custom SVG component
- Arabic labels: simple `{en, ar}` bilingual text pattern, no i18n framework
- Drill-down: Sheet/Dialog components from shadcn/ui
- NPHIES animation: Framer Motion step-by-step

### 4.3 What We Don't Build

- No authentication changes (stay bypassed for demo)
- No Intelligence/Business/Members changes (not in demo path)
- No new backend services — existing storage layer + seeded data
- No real NPHIES integration — visualization only
- No full Arabic RTL — bilingual labels only on key screens

---

## 5. Success Criteria

- [ ] Every page in demo path shows Saudi-realistic data (provider names, SAR amounts, Arabic names)
- [ ] All 3 case studies are traceable end-to-end across pages
- [ ] Command Center heatmap shows Saudi regions with FWA activity
- [ ] Flagged Claims shows realistic ICD-10-AM/ACHI codes with fraud pattern tags
- [ ] High-Risk Entities supports drill-down to provider detail
- [ ] Coding Intelligence shows live CPOE engine decisions
- [ ] Online Listening has plausible Saudi social media/news content
- [ ] Enforcement shows 3 cases at different stages with SAR amounts
- [ ] Arabic bilingual labels on Command Center and executive-facing KPI cards
- [ ] No dead ends — clicking any entity in the demo path leads to detail, not a blank page
