# CHI Demo Data Realism & Polish — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the CHI demo feel real to Saudi healthcare executives by seeding realistic data, adding 3 traceable fraud case studies, and polishing the 6 FWA demo-path pages.

**Architecture:** A comprehensive seed script (`server/scripts/seed-chi-demo.ts`) populates the existing schema with Saudi-realistic data. The 6 FWA pages are enhanced to display this data with drill-down, bilingual labels, and a Saudi Arabia heatmap. The 3 fraud case studies (dental ring, OB/GYN upcoding, cross-insurer duplicates) are traceable across all pages.

**Tech Stack:** TypeScript, Drizzle ORM, PostgreSQL, React, shadcn/ui, Recharts, Framer Motion, CPOE MCP tools

---

## Important Context

### Current Data Sources (What Needs to Change)

| Page | Current Data Source | Target |
|------|-------------------|--------|
| Command Center (`dashboard.tsx`) | Live DB queries (detection results) + hardcoded agent metrics | Live DB with Saudi-seeded data |
| High-Risk Entities (`high-risk-entities.tsx`) | Live DB (`fwa_*_detection_results`) populated by seeder | Replace seeder data with Saudi entities |
| Flagged Claims (`flagged-claims.tsx`) | **100% hardcoded in route handler** (6 static claims at `fwa-routes.ts:8399`) | DB-backed with seeded Saudi claims |
| Coding Intelligence (`coding-intelligence.tsx`) | **100% hardcoded in route handler** (trends, pairs, metrics at `fwa-routes.ts:8535-8650`) | Live CPOE MCP + Saudi context |
| Online Listening (`online-listening.tsx`) | Live DB, auto-seeds demo data | Replace seed data with Saudi-specific content |
| Enforcement (`enforcement.tsx`) | Live DB (`enforcement_cases`) — starts empty | Seed 3 case study enforcement cases |

### Key File Paths

| File | Lines | Purpose |
|------|-------|---------|
| `shared/schema.ts` | 5,026 | All Drizzle table definitions |
| `server/routes/fwa-routes.ts` | 8,697 | All FWA API endpoints |
| `server/services/demo-data-seeder.ts` | 3,102 | Current demo data seeder |
| `client/src/pages/fwa/dashboard.tsx` | 558 | Command Center page |
| `client/src/pages/fwa/high-risk-entities.tsx` | 505 | High-Risk Entities page |
| `client/src/pages/fwa/flagged-claims.tsx` | 408 | Flagged Claims page |
| `client/src/pages/fwa/coding-intelligence.tsx` | 598 | Coding Intelligence page |
| `client/src/pages/fwa/online-listening.tsx` | 809 | Online Listening page |
| `client/src/pages/fwa/enforcement.tsx` | 574 | Enforcement page |

### Schema Tables Used (from `shared/schema.ts`)

- `provider_directory` (line 2982): `id`, `npi`, `name`, `specialty`, `organization`, `city`, `region`, `licenseNumber`, `riskScore`
- `fwa_high_risk_providers` (line 1209): `providerId`, `providerName`, `riskScore`, `riskLevel`, `totalClaims`, `flaggedClaims`, `totalExposure`, `reasons`
- `fwa_high_risk_patients` (line 1242): `patientId`, `patientName`, `riskScore`, `riskLevel`, `totalClaims`, `flaggedClaims`, `reasons`
- `fwa_high_risk_doctors` (line 1269): `doctorId`, `doctorName`, `specialty`, `riskScore`, `riskLevel`, `totalClaims`, `flaggedClaims`, `reasons`
- `claims` (line 62): `claimNumber`, `providerName`, `patientName`, `amount`, `icd`, `cptCodes`, `status`, `flagged`, `flagReason`
- `enforcement_cases` (line 2115): `caseNumber`, `providerId`, `providerName`, `status`, `violationCode`, `severity`, `fineAmount`
- `online_listening_mentions` (line 1021): `providerId`, `providerName`, `source`, `content`, `sentiment`, `topics`
- `fwa_provider_detection_results`, `fwa_doctor_detection_results`, `fwa_patient_detection_results` — populated by detection seeder

---

## Task 1: Saudi Constants Data File

**Files:**
- Create: `server/data/saudi-constants.ts`

**Step 1: Create the constants file**

This file exports all Saudi-specific reference data used by the seed script and UI components. It includes:

```typescript
// server/data/saudi-constants.ts

// ── Regions & Cities ──
export const SAUDI_REGIONS = [
  { code: "RIY", nameEn: "Riyadh", nameAr: "الرياض", population: 8.6e6, weight: 0.35 },
  { code: "MAK", nameEn: "Makkah", nameAr: "مكة المكرمة", population: 9.0e6, weight: 0.25 },
  { code: "EST", nameEn: "Eastern Province", nameAr: "المنطقة الشرقية", population: 5.1e6, weight: 0.15 },
  { code: "MAD", nameEn: "Madinah", nameAr: "المدينة المنورة", population: 2.2e6, weight: 0.08 },
  { code: "ASR", nameEn: "Asir", nameAr: "عسير", population: 2.3e6, weight: 0.05 },
  { code: "QAS", nameEn: "Qassim", nameAr: "القصيم", population: 1.5e6, weight: 0.04 },
  { code: "TAB", nameEn: "Tabuk", nameAr: "تبوك", population: 0.9e6, weight: 0.03 },
  { code: "HAI", nameEn: "Hail", nameAr: "حائل", population: 0.7e6, weight: 0.02 },
  { code: "NAJ", nameEn: "Najran", nameAr: "نجران", population: 0.6e6, weight: 0.01 },
  { code: "JAZ", nameEn: "Jazan", nameAr: "جازان", population: 1.7e6, weight: 0.01 },
  { code: "BAH", nameEn: "Al Bahah", nameAr: "الباحة", population: 0.5e6, weight: 0.005 },
  { code: "JOF", nameEn: "Al Jouf", nameAr: "الجوف", population: 0.5e6, weight: 0.005 },
  { code: "NBO", nameEn: "Northern Borders", nameAr: "الحدود الشمالية", population: 0.4e6, weight: 0.005 },
] as const;

export const SAUDI_CITIES: Record<string, { nameEn: string; nameAr: string; region: string }[]> = {
  RIY: [
    { nameEn: "Riyadh", nameAr: "الرياض", region: "RIY" },
    { nameEn: "Al Kharj", nameAr: "الخرج", region: "RIY" },
  ],
  MAK: [
    { nameEn: "Jeddah", nameAr: "جدة", region: "MAK" },
    { nameEn: "Makkah", nameAr: "مكة", region: "MAK" },
    { nameEn: "Taif", nameAr: "الطائف", region: "MAK" },
  ],
  EST: [
    { nameEn: "Dammam", nameAr: "الدمام", region: "EST" },
    { nameEn: "Al Khobar", nameAr: "الخبر", region: "EST" },
    { nameEn: "Dhahran", nameAr: "الظهران", region: "EST" },
    { nameEn: "Al Ahsa", nameAr: "الأحساء", region: "EST" },
    { nameEn: "Jubail", nameAr: "الجبيل", region: "EST" },
  ],
  MAD: [{ nameEn: "Madinah", nameAr: "المدينة المنورة", region: "MAD" }],
  ASR: [{ nameEn: "Abha", nameAr: "أبها", region: "ASR" }],
  // ... others as needed
};

// ── Providers (Tier 1–3) ──
export const TIER1_PROVIDERS = [
  { id: "PRV-T1-001", nameEn: "King Fahad Medical City", nameAr: "مدينة الملك فهد الطبية", city: "Riyadh", region: "RIY", type: "hospital", specialty: "Multi-specialty", tier: 1 },
  { id: "PRV-T1-002", nameEn: "King Faisal Specialist Hospital & Research Centre", nameAr: "مستشفى الملك فيصل التخصصي", city: "Riyadh", region: "RIY", type: "hospital", specialty: "Specialist", tier: 1 },
  { id: "PRV-T1-003", nameEn: "Dr. Sulaiman Al Habib Medical Group", nameAr: "مجموعة د. سليمان الحبيب الطبية", city: "Riyadh", region: "RIY", type: "hospital_group", specialty: "Multi-specialty", tier: 1 },
  { id: "PRV-T1-004", nameEn: "Saudi German Hospital", nameAr: "المستشفى السعودي الألماني", city: "Jeddah", region: "MAK", type: "hospital", specialty: "Multi-specialty", tier: 1 },
  { id: "PRV-T1-005", nameEn: "Dallah Health Company", nameAr: "شركة دله الصحية", city: "Riyadh", region: "RIY", type: "hospital", specialty: "Multi-specialty", tier: 1 },
  { id: "PRV-T1-006", nameEn: "Mouwasat Medical Services", nameAr: "شركة المواساة للخدمات الطبية", city: "Dammam", region: "EST", type: "hospital_group", specialty: "Multi-specialty", tier: 1 },
  { id: "PRV-T1-007", nameEn: "Al Hammadi Hospital", nameAr: "مستشفى الحمادي", city: "Riyadh", region: "RIY", type: "hospital", specialty: "Multi-specialty", tier: 1 },
  { id: "PRV-T1-008", nameEn: "National Guard Health Affairs", nameAr: "الشؤون الصحية بالحرس الوطني", city: "Riyadh", region: "RIY", type: "hospital", specialty: "Multi-specialty", tier: 1 },
  { id: "PRV-T1-009", nameEn: "King Abdulaziz University Hospital", nameAr: "مستشفى جامعة الملك عبدالعزيز", city: "Jeddah", region: "MAK", type: "hospital", specialty: "Academic", tier: 1 },
  { id: "PRV-T1-010", nameEn: "Almana General Hospital", nameAr: "مستشفى المانع العام", city: "Dammam", region: "EST", type: "hospital", specialty: "Multi-specialty", tier: 1 },
  { id: "PRV-T1-011", nameEn: "Al Moosa Specialist Hospital", nameAr: "مستشفى الموسى التخصصي", city: "Al Ahsa", region: "EST", type: "hospital", specialty: "Specialist", tier: 1 },
  { id: "PRV-T1-012", nameEn: "Habib Medical Group", nameAr: "مجموعة حبيب الطبية", city: "Riyadh", region: "RIY", type: "hospital_group", specialty: "Multi-specialty", tier: 1 },
];

// Case Study 1 providers (dental ring)
export const CASE_STUDY_1_PROVIDERS = [
  { id: "PRV-CS1-001", nameEn: "Al Noor Dental Center", nameAr: "مركز النور لطب الأسنان", city: "Riyadh", region: "RIY", type: "dental_clinic", specialty: "Dentistry", tier: 2, riskScore: 94 },
  { id: "PRV-CS1-002", nameEn: "Smile Plus Clinic", nameAr: "عيادة سمايل بلس", city: "Riyadh", region: "RIY", type: "dental_clinic", specialty: "Dentistry", tier: 2, riskScore: 91 },
  { id: "PRV-CS1-003", nameEn: "Riyadh Dental Care", nameAr: "رعاية الرياض لطب الأسنان", city: "Riyadh", region: "RIY", type: "dental_clinic", specialty: "Dentistry", tier: 2, riskScore: 89 },
  { id: "PRV-CS1-004", nameEn: "Pearl Dental Center", nameAr: "مركز اللؤلؤة لطب الأسنان", city: "Riyadh", region: "RIY", type: "dental_clinic", specialty: "Dentistry", tier: 2, riskScore: 87 },
];

// Case Study 2 provider (OB/GYN)
export const CASE_STUDY_2_PROVIDERS = [
  { id: "PRV-CS2-001", nameEn: "Al Hayat Women's Hospital", nameAr: "مستشفى الحياة للنساء", city: "Jeddah", region: "MAK", type: "specialty_hospital", specialty: "OB/GYN", tier: 2, riskScore: 79 },
];

// Case Study 3 provider (cross-insurer)
export const CASE_STUDY_3_PROVIDERS = [
  { id: "PRV-CS3-001", nameEn: "Eastern Province Medical Center", nameAr: "المركز الطبي للمنطقة الشرقية", city: "Dammam", region: "EST", type: "medical_center", specialty: "Multi-specialty", tier: 2, riskScore: 72 },
];

// Tier 2 — Specialty Clinics (non-case-study)
export const TIER2_PROVIDERS = [
  { id: "PRV-T2-001", nameEn: "Al Jazeera Dental Center", nameAr: "مركز الجزيرة لطب الأسنان", city: "Jeddah", region: "MAK", type: "dental_clinic", specialty: "Dentistry", tier: 2 },
  { id: "PRV-T2-002", nameEn: "Elite Smile Dental", nameAr: "عيادة إيليت سمايل", city: "Dammam", region: "EST", type: "dental_clinic", specialty: "Dentistry", tier: 2 },
  { id: "PRV-T2-003", nameEn: "Rana Women's Clinic", nameAr: "عيادة رنا للنساء", city: "Riyadh", region: "RIY", type: "specialty_clinic", specialty: "OB/GYN", tier: 2 },
  { id: "PRV-T2-004", nameEn: "Al Amal Maternity Center", nameAr: "مركز الأمل للولادة", city: "Makkah", region: "MAK", type: "specialty_clinic", specialty: "OB/GYN", tier: 2 },
  { id: "PRV-T2-005", nameEn: "Al Razi Orthopedic Center", nameAr: "مركز الرازي لجراحة العظام", city: "Riyadh", region: "RIY", type: "specialty_clinic", specialty: "Orthopedics", tier: 2 },
  { id: "PRV-T2-006", nameEn: "Magrabi Eye Hospital", nameAr: "مستشفى المغربي للعيون", city: "Jeddah", region: "MAK", type: "specialty_hospital", specialty: "Ophthalmology", tier: 2 },
  { id: "PRV-T2-007", nameEn: "Al Basar Eye Center", nameAr: "مركز البصر للعيون", city: "Riyadh", region: "RIY", type: "specialty_clinic", specialty: "Ophthalmology", tier: 2 },
  { id: "PRV-T2-008", nameEn: "Al Shifa Medical Complex", nameAr: "مجمع الشفاء الطبي", city: "Madinah", region: "MAD", type: "medical_complex", specialty: "Multi-specialty", tier: 2 },
  { id: "PRV-T2-009", nameEn: "Al Salam Medical Center", nameAr: "مركز السلام الطبي", city: "Abha", region: "ASR", type: "medical_center", specialty: "Multi-specialty", tier: 2 },
  { id: "PRV-T2-010", nameEn: "Al Dawaa Medical Group", nameAr: "مجموعة الدواء الطبية", city: "Riyadh", region: "RIY", type: "pharmacy_chain", specialty: "Pharmacy", tier: 2 },
  // ... 10-15 more
];

// Tier 3 — Small practices
export const TIER3_PROVIDERS = [
  { id: "PRV-T3-001", nameEn: "Dr. Khalid Al-Rashidi Clinic", nameAr: "عيادة د. خالد الرشيدي", city: "Riyadh", region: "RIY", type: "solo_practice", specialty: "General Practice", tier: 3 },
  { id: "PRV-T3-002", nameEn: "Dr. Sarah Al-Dosari Clinic", nameAr: "عيادة د. سارة الدوسري", city: "Jeddah", region: "MAK", type: "solo_practice", specialty: "Dermatology", tier: 3 },
  { id: "PRV-T3-003", nameEn: "Al Hayah Pharmacy", nameAr: "صيدلية الحياة", city: "Dammam", region: "EST", type: "pharmacy", specialty: "Pharmacy", tier: 3 },
  { id: "PRV-T3-004", nameEn: "HomeHealth Saudi", nameAr: "الرعاية المنزلية السعودية", city: "Riyadh", region: "RIY", type: "home_health", specialty: "Home Health", tier: 3 },
  // ... 10-15 more
];

// ── Insurers ──
export const SAUDI_INSURERS = [
  { id: "INS-001", nameEn: "Bupa Arabia", nameAr: "بوبا العربية", marketShare: 0.22, segment: "premium" },
  { id: "INS-002", nameEn: "Tawuniya", nameAr: "التعاونية", marketShare: 0.18, segment: "broad" },
  { id: "INS-003", nameEn: "Medgulf", nameAr: "ميدغلف", marketShare: 0.12, segment: "mid-tier" },
  { id: "INS-004", nameEn: "GIG Saudi (AXA Cooperative)", nameAr: "أكسا التعاونية", marketShare: 0.10, segment: "international" },
  { id: "INS-005", nameEn: "Gulf Union Cooperative", nameAr: "الخليج التعاوني", marketShare: 0.08, segment: "regional" },
  { id: "INS-006", nameEn: "Walaa Cooperative", nameAr: "ولاء التعاونية", marketShare: 0.07, segment: "government" },
  { id: "INS-007", nameEn: "Arabian Shield", nameAr: "الدرع العربية", marketShare: 0.06, segment: "mid-market" },
  { id: "INS-008", nameEn: "ACIG (Allied Cooperative)", nameAr: "أليانز إس إف", marketShare: 0.05, segment: "growing" },
  { id: "INS-009", nameEn: "Malath Insurance", nameAr: "ملاذ للتأمين", marketShare: 0.04, segment: "niche" },
  { id: "INS-010", nameEn: "Al Rajhi Takaful", nameAr: "تكافل الراجحي", marketShare: 0.03, segment: "takaful" },
];

// ── Arabic Names (Patients & Doctors) ──
export const SAUDI_MALE_FIRST_NAMES = [
  "Abdullah", "Mohammed", "Khalid", "Fahad", "Sultan", "Faisal",
  "Ahmed", "Abdulrahman", "Ibrahim", "Omar", "Saad", "Nasser",
  "Turki", "Bandar", "Waleed", "Yousef", "Ali", "Hassan",
  "Saud", "Majed", "Tariq", "Hamad", "Rakan", "Nawaf",
];

export const SAUDI_FEMALE_FIRST_NAMES = [
  "Noura", "Fatimah", "Aisha", "Sarah", "Maha", "Huda",
  "Layla", "Reem", "Dana", "Lina", "Amira", "Hana",
  "Nadia", "Salma", "Dalal", "Lamia", "Mariam", "Jawaher",
];

export const SAUDI_FAMILY_NAMES = [
  "Al-Rashidi", "Al-Dosari", "Al-Ghamdi", "Al-Qahtani", "Al-Harbi",
  "Al-Shehri", "Al-Otaibi", "Al-Mutairi", "Al-Zahrani", "Al-Subaie",
  "Al-Shamrani", "Al-Anazi", "Al-Juhani", "Al-Bishi", "Al-Yami",
  "Al-Malki", "Al-Asiri", "Al-Tamimi", "Al-Omari", "Al-Hajri",
];

export const EXPAT_NAMES = [
  // South Asian
  { first: "Rajesh", last: "Kumar", nationality: "Indian" },
  { first: "Muhammad", last: "Iqbal", nationality: "Pakistani" },
  { first: "Arjun", last: "Patel", nationality: "Indian" },
  { first: "Amir", last: "Khan", nationality: "Pakistani" },
  // Filipino
  { first: "Juan", last: "Santos", nationality: "Filipino" },
  { first: "Maria", last: "Reyes", nationality: "Filipino" },
  // Egyptian
  { first: "Mostafa", last: "Hassan", nationality: "Egyptian" },
  { first: "Amr", last: "Mahmoud", nationality: "Egyptian" },
  // Bangladeshi
  { first: "Karim", last: "Rahman", nationality: "Bangladeshi" },
];

// ── KPI Baselines ──
export const CHI_KPI_BASELINES = {
  totalBeneficiaries: 11_500_000,
  annualClaimsVolume: 180_000_000,
  rejectionRate: 0.15,
  detectedFraudCasesPerYear: 200,
  adminCostRatio: 0.187,
  activeLicensedInsurers: 25,
  sbsV3ComplianceRate: 0.62,
  arDrgPilotHospitals: 12,
  avgClaimProcessingDays: 4.2,
  activeEnforcementCases: 47,
};

// ── Bilingual Labels ──
export const BILINGUAL_LABELS = {
  commandCenter: { en: "Command Center", ar: "مركز القيادة" },
  highRiskEntities: { en: "High-Risk Entities", ar: "الكيانات عالية المخاطر" },
  flaggedClaims: { en: "Flagged Claims", ar: "المطالبات المُبلَّغ عنها" },
  enforcement: { en: "Enforcement & Compliance", ar: "الإنفاذ والامتثال" },
  totalBeneficiaries: { en: "Total Beneficiaries", ar: "إجمالي المستفيدين" },
  rejectionRate: { en: "Rejection Rate", ar: "معدل الرفض" },
  fraudDetected: { en: "Fraud Detected", ar: "احتيال مكتشف" },
  totalExposure: { en: "Total Exposure", ar: "إجمالي التعرض" },
  riskScore: { en: "Risk Score", ar: "درجة المخاطر" },
  underInvestigation: { en: "Under Investigation", ar: "قيد التحقيق" },
  activeCases: { en: "Active Cases", ar: "الحالات النشطة" },
  pendingReview: { en: "Pending Review", ar: "قيد المراجعة" },
  nationalOverview: { en: "National Overview", ar: "نظرة وطنية" },
  claimsProcessed: { en: "Claims Processed", ar: "المطالبات المعالجة" },
  providerCompliance: { en: "Provider Compliance", ar: "امتثال مقدمي الخدمة" },
  fwaAlerts: { en: "FWA Alerts", ar: "تنبيهات الاحتيال" },
};

// ── Saudi Fraud Patterns ──
export const FRAUD_PATTERN_TYPES = [
  { code: "PHANTOM", labelEn: "Phantom Billing", labelAr: "فواتير وهمية", color: "red" },
  { code: "UPCODING", labelEn: "Upcoding", labelAr: "تصعيد الترميز", color: "orange" },
  { code: "DUPLICATE_XINSURER", labelEn: "Cross-Insurer Duplicate", labelAr: "تكرار عبر شركات التأمين", color: "purple" },
  { code: "UNBUNDLING", labelEn: "Unbundling", labelAr: "فك التجميع", color: "amber" },
  { code: "REFERRAL_CHURN", labelEn: "Referral Churning", labelAr: "تدوير الإحالات", color: "blue" },
  { code: "IMPOSSIBLE_SEQ", labelEn: "Impossible Sequence", labelAr: "تسلسل مستحيل", color: "rose" },
  { code: "UNNECESSARY_ADM", labelEn: "Unnecessary Admission", labelAr: "إدخال غير ضروري", color: "yellow" },
] as const;

// ── ICD-10-AM / ACHI Codes (Australian — Saudi standard) ──
export const COMMON_ICD10AM_CODES = [
  { code: "K04.7", description: "Periapical abscess without sinus" },
  { code: "K02.1", description: "Dentine caries" },
  { code: "K08.1", description: "Loss of teeth due to accident, extraction or local periodontal disease" },
  { code: "O80", description: "Single spontaneous delivery" },
  { code: "O82", description: "Single delivery by caesarean section" },
  { code: "O47.0", description: "False labour before 37 completed weeks of gestation" },
  { code: "Z34.0", description: "Supervision of normal first pregnancy" },
  { code: "J06.9", description: "Acute upper respiratory infection, unspecified" },
  { code: "M54.5", description: "Low back pain" },
  { code: "E11.9", description: "Type 2 diabetes mellitus without complications" },
  { code: "I10", description: "Essential (primary) hypertension" },
  { code: "Z23", description: "Need for immunization against single bacterial diseases" },
];

// SAR formatting helper
export function formatSAR(amount: number): string {
  return `SAR ${amount.toLocaleString("en-SA")}`;
}
```

**Step 2: Verify the file compiles**

Run: `npx tsx --eval "import './server/data/saudi-constants'; console.log('OK')"`
Expected: `OK` (no type errors)

**Step 3: Commit**

```bash
git add server/data/saudi-constants.ts
git commit -m "feat(data): add Saudi healthcare constants for CHI demo"
```

---

## Task 2: Comprehensive CHI Demo Seed Script

**Files:**
- Create: `server/scripts/seed-chi-demo.ts`
- Read: `shared/schema.ts` (table definitions)
- Read: `server/data/saudi-constants.ts` (from Task 1)

**Step 1: Create the seed script**

This script populates the database with Saudi-realistic data for the demo. It seeds in dependency order:

1. **Provider Directory** — 50+ providers from all 3 tiers + case study providers
2. **High-Risk Providers/Patients/Doctors** — populated from case study data
3. **Claims** — ~200 claims including flagged claims for case studies
4. **Enforcement Cases** — 3 cases matching case studies + background cases
5. **Online Listening Mentions** — Saudi-specific social/news mentions
6. **FWA Cases** — cases linked to case studies

The script should:
- Import all constants from `server/data/saudi-constants.ts`
- Import Drizzle schema tables from `shared/schema.ts`
- Use the existing `db` connection from `server/db.ts`
- Be idempotent: check for existing data with a marker (e.g., a claim with `claimNumber = 'CHI-DEMO-MARKER'`) and skip if already seeded, or accept a `--force` flag to clear and re-seed
- Seed **Case Study 1** data: 4 dental clinics, 340 shared patients, 847 flagged claims with dental phantom billing patterns, network ownership links
- Seed **Case Study 2** data: Al Hayat Women's Hospital, 312 flagged OB/GYN claims with upcoding patterns (C-section rate 68%)
- Seed **Case Study 3** data: Eastern Province Medical Center, 156 duplicate claim pairs across Bupa Arabia and Gulf Union
- Seed **background data**: Tier 1 providers with normal risk scores, general claims, general enforcement cases at various stages

Key implementation details:
- Use `db.insert(table).values([...]).onConflictDoNothing()` to handle re-runs
- Generate patient names by combining `SAUDI_MALE_FIRST_NAMES`/`SAUDI_FEMALE_FIRST_NAMES` with `SAUDI_FAMILY_NAMES`
- Generate claim numbers in format `CLM-2026-SA-XXXXX`
- All amounts in SAR (claim amounts range: SAR 500 — SAR 150,000)
- Use ICD-10-AM codes from `COMMON_ICD10AM_CODES`
- Enforcement cases: Case Study 1 at "investigation" stage, Case Study 2 at "corrective_action" stage, Case Study 3 at "finding" stage

**Step 2: Run the seed script**

Run: `npx tsx server/scripts/seed-chi-demo.ts`
Expected: Console output showing counts for each entity type seeded

**Step 3: Verify data in DB**

Run: `npx tsx --eval "import { db } from './server/db'; import { providerDirectory } from './shared/schema'; db.select().from(providerDirectory).then(r => console.log('Providers:', r.length))"`
Expected: 50+ providers

**Step 4: Commit**

```bash
git add server/scripts/seed-chi-demo.ts
git commit -m "feat(seed): add comprehensive CHI demo data seeder with 3 fraud case studies"
```

---

## Task 3: Replace Hardcoded Flagged Claims with DB-Backed Data

**Files:**
- Modify: `server/routes/fwa-routes.ts:8399-8530` (replace hardcoded flagged claims)
- Modify: `client/src/pages/fwa/flagged-claims.tsx` (add drill-down, fraud tags, detection methods)

**Step 1: Replace the server endpoint**

In `server/routes/fwa-routes.ts`, replace the hardcoded `GET /api/fwa/flagged-claims` handler (lines 8399-8530) with a real DB query:

```typescript
// Replace the hardcoded claims array with a DB query
app.get("/api/fwa/flagged-claims", async (req, res) => {
  const flaggedClaims = await db
    .select()
    .from(claims)
    .where(eq(claims.flagged, true))
    .orderBy(desc(claims.registrationDate))
    .limit(100);

  const summary = {
    totalFlagged: flaggedClaims.length,
    totalExposure: flaggedClaims.reduce((sum, c) => sum + Number(c.amount || 0), 0),
    confirmedFraud: flaggedClaims.filter(c => c.status === "confirmed_fraud").length,
    underReview: flaggedClaims.filter(c => c.status === "under_review").length,
  };

  res.json({ claims: flaggedClaims, summary });
});
```

Note: The claim objects seeded in Task 2 must include `flagged: true`, `flagReason` (matching `FRAUD_PATTERN_TYPES`), and enough detail fields for the UI to display.

**Step 2: Enhance the client page**

In `client/src/pages/fwa/flagged-claims.tsx`, add:
- Fraud pattern badge component using `FRAUD_PATTERN_TYPES` colors
- Detection method breakdown (show which of 5 methods flagged each claim — stored in claim `metadata` JSON field)
- Click-to-expand claim detail (use `Sheet` or `Dialog` from shadcn/ui) showing: service lines, AI analysis summary, detection confidence scores
- SAR currency formatting
- Arabic provider/patient names display

**Step 3: Verify the page loads with seeded data**

Run: `npm run dev` and navigate to `/fwa/flagged-claims`
Expected: Page shows claims from DB with Saudi provider names, SAR amounts, fraud pattern badges

**Step 4: Commit**

```bash
git add server/routes/fwa-routes.ts client/src/pages/fwa/flagged-claims.tsx
git commit -m "feat(flagged-claims): replace hardcoded data with DB-backed Saudi claims"
```

---

## Task 4: Enhance Coding Intelligence with CPOE MCP

**Files:**
- Modify: `server/routes/fwa-routes.ts:8535-8650` (replace hardcoded CPOE data with MCP calls)
- Modify: `client/src/pages/fwa/coding-intelligence.tsx` (enhance charts, add Saudi context)

**Step 1: Replace hardcoded CPOE endpoints with MCP proxies**

The CPOE MCP server is already connected (tools: `get_rejection_trends`, `get_frequency_table`, `get_encounter_processing_metrics`, `get_cpoe_engine_decision`). Replace the 4 hardcoded endpoints:

- `GET /api/fwa/cpoe/rejection-trends` → Call `mcp__claude_ai_CPOE_MCP__get_rejection_trends` and transform response
- `GET /api/fwa/cpoe/frequency-table` → Call `mcp__claude_ai_CPOE_MCP__get_frequency_table` and transform response
- `GET /api/fwa/cpoe/processing-metrics` → Call `mcp__claude_ai_CPOE_MCP__get_encounter_processing_metrics`
- `POST /api/fwa/cpoe/validate-pair` → Call `mcp__claude_ai_CPOE_MCP__get_cpoe_engine_decision` with the ICD+CPT pair

**Important consideration:** The CPOE MCP tools are available to Claude (this AI agent) but may NOT be callable from the Express server at runtime. If the MCP server is only accessible during development (Claude sessions), then we should:
- Fetch a snapshot of CPOE data during development and store it as a JSON fixture
- OR keep the data hardcoded but make it much richer and Saudi-contextualized

**Decision needed at implementation time:** Check if the MCP server has an HTTP endpoint the Express server can call. If not, enhance the hardcoded data to be more realistic using CPOE MCP data fetched during development.

**Step 2: Enhance the client page**

- Pre-populate the validator with case study ICD-CPT pairs as demo hints
- Add Saudi context to rejection reasons (SBS V3.0 compliance issues, ICD-10-AM specific patterns)
- Improve chart styling with CHI brand colors

**Step 3: Commit**

```bash
git add server/routes/fwa-routes.ts client/src/pages/fwa/coding-intelligence.tsx
git commit -m "feat(coding-intelligence): enrich CPOE data with Saudi medical coding context"
```

---

## Task 5: Saudi Arabia Heatmap Component

**Files:**
- Create: `client/src/components/fwa/saudi-heatmap.tsx`

**Step 1: Create the SVG heatmap component**

Build a React component that renders a simplified SVG map of Saudi Arabia's 13 administrative regions. Each region is a clickable `<path>` element colored by FWA activity level (from green=low to red=high).

Props:
```typescript
interface SaudiHeatmapProps {
  data: Array<{
    regionCode: string;    // matches SAUDI_REGIONS[].code
    fwaCount: number;      // number of FWA flags in this region
    riskLevel: "low" | "medium" | "high" | "critical";
  }>;
  onRegionClick?: (regionCode: string) => void;
  className?: string;
}
```

Implementation notes:
- SVG paths for Saudi Arabia regions can be simplified outlines (doesn't need to be cartographically perfect — a recognizable shape is sufficient for the demo)
- Use Tailwind color classes for risk levels: green-200/yellow-300/orange-400/red-500
- Tooltip on hover showing region name (bilingual), FWA count, risk level
- Use `@/components/ui/tooltip` from shadcn/ui for the hover tooltip
- The component should be roughly 400x350px and responsive

**Step 2: Verify it renders**

Create a quick test: import into `dashboard.tsx` and render with static data matching seeded regions.

**Step 3: Commit**

```bash
git add client/src/components/fwa/saudi-heatmap.tsx
git commit -m "feat(ui): add Saudi Arabia regional heatmap component"
```

---

## Task 6: Command Center Enhancement

**Files:**
- Modify: `client/src/pages/fwa/dashboard.tsx`
- Read: `client/src/components/fwa/saudi-heatmap.tsx` (from Task 5)

**Step 1: Add the Saudi heatmap**

Replace or supplement the existing Command Center layout with:
- Saudi Arabia heatmap at the top (spanning full width or 2/3 width)
- Heatmap data derived from the operations-summary API (aggregate FWA counts by region)

**Step 2: Add bilingual KPI labels**

Import `BILINGUAL_LABELS` from constants (or inline the key labels). Update the 4 KPI metric cards to show bilingual text:
```tsx
<span className="text-sm text-muted-foreground">
  {label.en}
  <span className="block text-xs text-muted-foreground/70 font-arabic">{label.ar}</span>
</span>
```

**Step 3: Add real-time alert feed**

Add a "Recent Alerts" section below the KPIs showing the 3 case study alerts as a live-looking feed:
- "Dental network flagged in Riyadh — 4 linked entities" (red dot)
- "OB/GYN upcoding cluster detected in Jeddah" (orange dot)
- "Cross-insurer duplicates identified in Eastern Province" (purple dot)
- Plus 5-7 background alerts for ecosystem feel

These can be hardcoded in the UI since they're narrative anchors for the demo.

**Step 4: Enhance NPHIES flow animation**

The existing NPHIES flow is static HTML. Wrap it with Framer Motion to animate step-by-step:
```tsx
<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.3 }}>
```

**Step 5: Update KPI values**

Ensure the operations-summary endpoint returns CHI-realistic numbers (or add them to the response). The existing endpoint does live DB queries — after Task 2 seeding, these should return realistic counts.

**Step 6: Commit**

```bash
git add client/src/pages/fwa/dashboard.tsx
git commit -m "feat(command-center): add Saudi heatmap, bilingual labels, and alert feed"
```

---

## Task 7: High-Risk Entities Enhancement

**Files:**
- Modify: `client/src/pages/fwa/high-risk-entities.tsx`

**Step 1: Add drill-down side panel**

When a user clicks "View Profile" on a provider row, open a `Sheet` (slide-out panel from shadcn/ui) instead of navigating away. The panel shows:
- Provider name (bilingual), city, region, specialty
- Risk score gauge (circular or semicircular)
- Risk breakdown: which detection methods contributed to the score
- Flagged claims count with link to filtered Flagged Claims view
- Peer comparison chart (Recharts BarChart: this provider vs peer group average)
- Behavioral timeline (last 6 months of escalating risk)

**Step 2: Add network visualization for Case Study 1**

For the 4 dental ring providers (identified by `PRV-CS1-*` IDs), add a visual indicator:
- "Network Link" badge on each of the 4 providers
- Clicking any of them shows a network diagram in the drill-down panel (can be a simple SVG with 4 nodes connected by lines, or use a basic force layout)
- Shared patient count: "340 patients in common"

**Step 3: Add functional filters**

The page already has a search input. Add:
- Region filter (`Select` dropdown with Saudi regions)
- Specialty filter (`Select` dropdown)
- Risk tier filter (`Select` dropdown: Critical, High, Elevated, All)

All filtering is client-side (filter the fetched array).

**Step 4: Commit**

```bash
git add client/src/pages/fwa/high-risk-entities.tsx
git commit -m "feat(high-risk-entities): add drill-down panel, network viz, and filters"
```

---

## Task 8: Online Listening Saudi Content

**Files:**
- Modify: `server/routes/fwa-routes.ts` (update the CHI demo seed data for online listening)
- Possibly modify: `client/src/pages/fwa/online-listening.tsx` (minor tweaks)

**Step 1: Update the server-side CHI demo seed data**

The online listening auto-seeder (called in the GET route) already seeds demo mentions. Update `seedCHIDemoData()` in `fwa-routes.ts` to include:

- **Case Study 1 mentions:** 2-3 social media posts about dental billing issues in Riyadh
  - "My dental clinic charged Bupa for 3 root canals I never had — anyone else experiencing this? مركز النور لطب الأسنان"
  - "@CHI_Saudi I was billed SAR 4,500 for procedures I didn't receive at Pearl Dental Center. This is fraud!"

- **Case Study 2 mentions:** 2 posts about C-section pressure
  - "My wife was pressured into a C-section at Al Hayat Hospital even though the doctor said natural delivery was fine. SAR 12,000 bill! #مستشفى_الحياة"
  - Arab News headline: "Rising C-section rates in Saudi private hospitals spark regulatory concern"

- **Background mentions:** 5-7 general healthcare posts about billing, insurance complaints, NPHIES issues, CHI regulations

All mentions should have appropriate sentiment scores, topics, and source types.

**Step 2: Verify the page**

Navigate to `/fwa/online-listening`. Confirm mentions appear with Saudi context, correct sentiment coloring, and topic tags that connect to case studies.

**Step 3: Commit**

```bash
git add server/routes/fwa-routes.ts
git commit -m "feat(online-listening): seed Saudi-specific social media mentions for case studies"
```

---

## Task 9: Enforcement Page Enhancement

**Files:**
- Modify: `client/src/pages/fwa/enforcement.tsx`

**Step 1: Enhance the case timeline visualization**

The page already has an 8-stage workflow bar. Enhance it:
- Make each stage clickable (filters the table to show cases at that stage)
- Add a visual "current stage" indicator for each case in the detail view
- Add progression arrows with dates showing when each stage was reached

**Step 2: Add case detail view enhancements**

The existing case detail dialog shows basic info. Enhance to show:
- Full case narrative (description from enforcement case)
- SAR fine amounts prominently displayed
- Timeline of case progression (which stages completed, with dates)
- Link to related provider in High-Risk Entities
- Link to related flagged claims

**Step 3: Ensure case study data appears**

After Task 2 seeding, verify that:
- Case Study 1 (dental ring) appears at "investigation" stage with SAR 2.3M
- Case Study 2 (OB/GYN upcoding) appears at "corrective_action" stage with SAR 890K
- Case Study 3 (cross-insurer) appears at "finding" stage with SAR 1.1M
- 5-7 background cases at various stages

**Step 4: Add insurer compliance scorecards**

Add a new tab or section showing a table of the 8-10 insurers with:
- Response time to investigation requests (days)
- Documentation quality score (0-100)
- Cooperation rating (Excellent/Good/Needs Improvement)
- Open cases count

This data can be hardcoded since it's supplementary to the main enforcement flow.

**Step 5: Commit**

```bash
git add client/src/pages/fwa/enforcement.tsx
git commit -m "feat(enforcement): enhance timeline, case detail, and insurer compliance view"
```

---

## Task 10: Integration Testing & Demo Walkthrough

**Files:**
- Possibly modify: `e2e/` test files if existing smoke tests break

**Step 1: Run the seed script**

Run: `npx tsx server/scripts/seed-chi-demo.ts`
Verify: No errors, all entity counts printed

**Step 2: Start the dev server**

Run: `npm run dev`

**Step 3: Walk through the demo path**

Manually verify each page in order:

1. **Command Center** (`/fwa/dashboard`)
   - [ ] Saudi heatmap renders with regional coloring
   - [ ] KPI cards show SAR amounts with bilingual labels
   - [ ] Alert feed shows 3 case study alerts
   - [ ] NPHIES flow animation works

2. **High-Risk Entities** (`/fwa/high-risk-entities`)
   - [ ] Providers tab shows Saudi names with risk scores
   - [ ] Case Study 1 dental clinics appear with high risk scores
   - [ ] Drill-down panel opens on click
   - [ ] Filters work (region, specialty, risk tier)

3. **Flagged Claims** (`/fwa/flagged-claims`)
   - [ ] Claims show SAR amounts, ICD-10-AM codes
   - [ ] Fraud pattern badges visible (Phantom, Upcoding, Duplicate)
   - [ ] Claim detail modal opens on click
   - [ ] Case study claims are identifiable

4. **Coding Intelligence** (`/fwa/coding-intelligence`)
   - [ ] Pair validator works with demo hints
   - [ ] Rejection trends chart renders
   - [ ] Frequency table populated
   - [ ] Processing metrics display

5. **Online Listening** (`/fwa/online-listening`)
   - [ ] Saudi social media posts appear
   - [ ] Case study-related mentions visible
   - [ ] Sentiment coloring correct
   - [ ] Provider summary table populated

6. **Enforcement** (`/fwa/enforcement`)
   - [ ] 3 case study cases visible at correct stages
   - [ ] Case detail shows full narrative
   - [ ] SAR amounts displayed
   - [ ] Workflow stages show case counts

**Step 4: Run existing E2E tests**

Run: `npx playwright test`
Expected: Existing smoke tests pass (or update if navigation changed)

**Step 5: Final commit**

```bash
git commit -m "test: verify CHI demo walkthrough with Saudi data"
```

---

## Execution Order & Dependencies

```
Task 1 (Saudi Constants)
    └──> Task 2 (Seed Script)
              ├──> Task 3 (Flagged Claims — needs seeded data)
              ├──> Task 8 (Online Listening — needs seeded data)
              └──> Task 9 (Enforcement — needs seeded data)
    └──> Task 5 (Heatmap Component — no data dep)
              └──> Task 6 (Command Center — needs heatmap + seeded data)
    └──> Task 4 (Coding Intelligence — independent)
    └──> Task 7 (High-Risk Entities — needs seeded data)
    └──────────> Task 10 (Integration — needs all above)
```

**Parallelizable groups:**
- After Task 1+2: Tasks 3, 4, 5, 7, 8, 9 can all start in parallel
- Task 6 depends on Task 5
- Task 10 depends on all others

---

## What We Don't Build (Explicit Scope Boundaries)

- No auth/login flow changes
- No Intelligence/Business/Members pillar changes
- No new backend services — use existing storage layer + seeded data
- No real NPHIES integration — visualization only
- No full Arabic RTL — bilingual labels only on executive-facing KPI cards
- No new database tables — use existing schema
- No i18n framework — simple `{en, ar}` inline pattern
