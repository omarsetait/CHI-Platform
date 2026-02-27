# CHI Demo Feature Enrichment — Design Document

**Date:** 2026-02-27
**Author:** Product & Engineering
**Status:** Approved

---

## Context

TachyHealth is preparing a demo for **Council of Health Insurance (CHI)** high-level stakeholders in Saudi Arabia. CHI is an independent governmental entity overseeing the entire private health insurance ecosystem — 11.5M+ beneficiaries, 25+ insurers, thousands of providers, growing to 25M beneficiaries and SAR 83B market by 2030.

**Positioning:**
- **Primary:** Sell FWA detection solution directly to CHI (vendor to CHI as regulator)
- **Secondary:** Ecosystem pillars (Intelligence, Business, Members) offered through CHI to insurers, providers, and beneficiaries

**Demo format:** Pitch deck + live platform demo
**Timeline:** 2-3 weeks
**Data:** Synthetic demo data
**Approach:** FWA Flagship (70% effort) + Ecosystem Showcase (30% effort)

---

## Research Summary: CHI Landscape

### What CHI Is
- Independent governmental regulator for Saudi private health insurance
- Enforces mandatory coverage, accredits providers, supervises insurers
- Oversees NPHIES (National Platform for Health and Insurance Exchange Services)
- Led by Secretary-General Dr. Shabbab bin Saad Al-Ghamdi

### Strategic Priorities (2025-2027 Strategy, 47 initiatives)
1. Beneficiary-centered healthcare ecosystem
2. Empowered employers with innovative coverage solutions
3. Data and smart technology-driven (AI adoption explicitly called for)
4. Value-based healthcare (AR-DRG transition)
5. Innovation, sustainability, digital excellence

### Key Pain Points
- Only ~196 fraud cases detected annually (massive undetected FWA)
- 15% claim rejection rate across the ecosystem
- 18.7% administrative costs (above international benchmarks)
- SBS V3.0 went live Jan 2026 — providers struggling with compliance
- Employer non-compliance with mandatory coverage (110 fined in Aug 2025)
- Insurer profitability challenges driving market consolidation

### Technology Landscape
- **NPHIES:** HL7 FHIR-based claims exchange (routing only, no adjudication)
- **Coding:** ICD-10-AM / ACHI (Australian-based, NOT US ICD-10-CM/CPT)
- **DRG:** AR-DRG (Australian Refined) for value-based payment transition
- **SBS V3.0:** Saudi Billing System Coding Standards, effective Jan 2026
- **Waseel:** Connects 98% of providers to 17 insurers (dominant intermediary)

### Competitor Landscape
- **Waseel:** Market-dominant intermediary, NPHIES integration, RCM
- **AYM Solutions (InCompliance):** AI-powered pre-payment FWA detection
- **ANOVA Health:** Coding, CDI, AR-DRG consulting
- **International:** Cotiviti, Alivia Analytics, Qlarant (not localized for Saudi)

---

## Design: Four-Pillar Feature Enrichment

### Pillar 1 — Audit & FWA Unit (Flagship — 70% effort)

**Mindset:** Regulatory oversight command center, NOT an insurance claims processor.

#### Simplified Navigation (6 items)

The current sidebar has ~20 items built for insurance operations. For CHI executives, we simplify to 6 regulatory-focused sections:

| Nav Item | Purpose |
|----------|---------|
| **Command Center** | National FWA heatmap, real-time alerts, executive KPIs |
| **High-Risk Entities** | Flagged providers, facilities, networks with risk scores |
| **Flagged Claims** | Claims flagged by AI across all insurers, pattern drill-down |
| **Online Listening** | Social media/news monitoring for fraud signals, public sentiment |
| **Enforcement & Compliance** | Active cases, penalties, insurer compliance scorecards |
| **Intelligence Reports** | AI-generated insights, trend analysis, executive summaries |

#### Hidden from Demo (stays in backend)
- Detection Engine (5-method) — too technical for executives
- Rule Studio, Agent Orchestration, Agent Config — implementation details
- ML Analysis — technical, not executive-level
- Regulatory Oversight phases (A1/A2/A3) — internal workflow
- Knowledge Hub, Settings, System Configuration — admin-only

#### New Features

**1.1 CPOE Medical Coding Intelligence**
Powered by the live CPOE MCP server:
- Engine decision lookup for ICD+CPT pairs (accept/reject with reasoning)
- Rejection trend analysis (monthly acceptance/rejection rates)
- Frequency analysis (top pairs by volume, acceptance rate heatmap)
- Encounter processing metrics (avg processing time, common rejection reasons)

**1.2 Saudi-Specific FWA Detection Scenarios**
Pre-loaded scenarios based on CHI's actual fraud landscape:
- Dental phantom billing (CHI's #1 fraud vector)
- OB/GYN upcoding (CHI's #2 fraud vector)
- Specialist referral churning (circular referrals)
- Duplicate claims across insurers
- NPHIES bypass detection

**1.3 CHI Regulatory Dashboard**
Executive view with CHI-branded KPIs:
- National FWA heatmap by region/city
- Insurer compliance scorecards
- Enforcement tracker (detection → investigation → penalty)
- SBS V3.0 compliance rate
- KPIs aligned to CHI 2025-2027 strategy

**1.4 NPHIES Integration Flow**
Visual claim journey positioning us as the intelligence layer:
```
Provider → NPHIES → TachyHealth Detection → Accept/Flag/Reject → Insurer → NPHIES → Provider
```

**1.5 Arabic Labels**
Bilingual headers, KPI labels, and risk categories on Command Center, Flagged Claims, and Regulatory Dashboard. Strategic Arabic alongside English — not full RTL.

---

### Pillar 2 — Daman Intelligence (Provider Oversight — 10% effort)

**Audience:** CHI's view of provider performance (CHI accredits and classifies providers)

| Feature | What it shows | Why CHI needs it |
|---------|---------------|------------------|
| **Provider Accreditation Scorecards** | Data-driven scoring: coding accuracy, rejection rate, FWA flags, compliance rate | CHI runs the accreditation program — needs data to grade providers |
| **SBS V3.0 Compliance Monitor** | Which providers are compliant with new coding standards vs. submitting old-format codes | SBS V3.0 went live Jan 2026, providers are struggling |
| **DRG Readiness Tracker** | Provider readiness for AR-DRG value-based reimbursement | AR-DRG transition is a top CHI strategic priority |
| **Rejection Pattern Analytics** | Rejection patterns by region, specialty, and insurer | 15% rejection rate is costly — CHI needs to know where to intervene |
| **Clinical Documentation Quality Index** | Documentation completeness scores driving coding accuracy | CDI is an active CHI initiative |

---

### Pillar 3 — Daman Business (Market & Employer Oversight — 10% effort)

**Audience:** CHI's view of market health and employer compliance

| Feature | What it shows | Why CHI needs it |
|---------|---------------|------------------|
| **Employer Compliance Tracker** | National view: compliant employers, at-risk, lapsed, fined | CHI enforces mandatory coverage (110 fined in Aug 2025) |
| **Insurer Financial Health Monitor** | Loss ratios, capital adequacy, premium growth, claims reserves | CHI supervises insurer solvency, pushing mergers |
| **Market Concentration Analytics** | Market share, Herfindahl index, merger impact scenarios | CHI is actively driving insurer consolidation |
| **Coverage Expansion Modeler** | Impact of adding mandatory groups (domestic workers, Saudi dependents = +3.2M lives) | Vision 2030 universal coverage target |
| **Cost Containment Dashboard** | Where money goes, comparison to OECD benchmarks (18.7% admin vs ~12% international) | CHI mandate to reduce administrative waste |

---

### Pillar 4 — Daman Members (Beneficiary Protection — 10% effort)

**Audience:** CHI's view of beneficiary welfare (11.5M → 25M by 2030)

| Feature | What it shows | Why CHI needs it |
|---------|---------------|------------------|
| **Complaint & Dispute Analytics** | Complaint volume, resolution time, repeat offenders, trending issues | CHI processes complaints against insurers and providers |
| **Coverage Gap Monitor** | Uninsured segments, lapsed policies, geographic gaps | Vision 2030 universal coverage — who's falling through? |
| **Provider Quality Transparency** | Provider ratings, wait times, patient satisfaction | Person-centric care mission — informed beneficiaries |
| **Fraud Reporting Hub** | Modern "Inform CHI" with anonymous reporting, AI triage, Pillar 1 connection | Enhances existing CHI portal with better UX and AI |
| **Benefits Awareness Dashboard** | Coverage lookup by condition/procedure from Basic Benefits Package | Many beneficiaries don't know what they're covered for |

---

## Cross-Pillar Intelligence

All four pillars feed each other — this is the platform's unique selling point:

| Signal | From | To | Action |
|--------|------|----|--------|
| Member fraud report | Pillar 4 (Members) | Pillar 1 (FWA) | Triggers investigation |
| FWA flag on provider | Pillar 1 (FWA) | Pillar 2 (Intelligence) | Lowers accreditation score |
| Employer coverage lapse | Pillar 3 (Business) | Pillar 4 (Members) | Coverage gap alert |
| Provider rejection spike | Pillar 2 (Intelligence) | Pillar 3 (Business) | Cost containment signal |
| Insurer non-compliance | Pillar 3 (Business) | Pillar 1 (FWA) | Regulatory enforcement trigger |

---

## Technical Integration

### CPOE MCP Server (Available Now)
The following MCP tools are connected and will power live demo features:
- `get_cpoe_engine_decision` — ICD+CPT accept/reject decisions
- `get_rejection_trends` — Monthly trend analysis
- `get_frequency_table` — ICD-CPT pair frequency and acceptance rates
- `get_encounter_processing_metrics` — Processing metrics and common rejection reasons
- `search_encounters` — Search by status and date range
- `get_processed_encounter` — Individual encounter details

### Existing Infrastructure to Leverage
- 5-method FWA detection engine (backend — powers Pillar 1 without being visible)
- 50+ database tables with healthcare domain models
- OpenAI integration for AI-powered analysis
- pgvector for semantic search
- Recharts for data visualization
- shadcn/ui component library

---

## Demo Narrative Flow

1. **Pitch deck** — CHI context, Vision 2030 alignment, our value proposition
2. **Pillar 1 live demo** — Command Center → High-Risk Entities → Flagged Claims → Online Listening (15-20 min)
3. **Pillar 2 quick tour** — Provider Scorecards → SBS Compliance → DRG Readiness (5 min)
4. **Pillar 3 quick tour** — Employer Compliance → Insurer Health → Coverage Expansion (5 min)
5. **Pillar 4 quick tour** — Complaint Analytics → Coverage Gaps → Fraud Reporting (5 min)
6. **Cross-pillar moment** — Show a fraud report flowing from Members → FWA → Provider score impact
7. **Q&A**

---

## Success Criteria

- [ ] FWA Command Center shows compelling national oversight view
- [ ] High-Risk Entities and Flagged Claims are interactive with drill-down
- [ ] Online Listening shows real-time sentiment monitoring
- [ ] CPOE MCP powers live medical coding intelligence in the demo
- [ ] Each ecosystem pillar has 3-5 interactive screens with synthetic data
- [ ] Arabic labels present on key executive-facing screens
- [ ] Cross-pillar data flow is demonstrable in at least one scenario
- [ ] All navigation works without errors (E2E tested)
