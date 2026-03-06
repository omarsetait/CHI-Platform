/**
 * BRD-Aligned Data Seeder
 * Generates 5,000 claims across 6 normalized tables aligned with iHop Master Data Schema V2.
 * Seeding order: policies → providers → practitioners → members → claims → service_lines → detection results
 */

import { db } from "../db";
import {
  policies, members, providers, practitioners, claims, serviceLines,
  fwaDetectionResults, fwaProviderDetectionResults,
} from "@shared/schema";
import { count, sql } from "drizzle-orm";

// =============================================================================
// Reference Data
// =============================================================================

const SAUDI_CITIES = [
  { city: "Riyadh", region: "RIY" },
  { city: "Jeddah", region: "MAK" },
  { city: "Dammam", region: "EST" },
  { city: "Makkah", region: "MAK" },
  { city: "Madinah", region: "MAD" },
  { city: "Al Khobar", region: "EST" },
  { city: "Tabuk", region: "TAB" },
  { city: "Abha", region: "ASR" },
  { city: "Khamis Mushait", region: "ASR" },
  { city: "Buraidah", region: "QAS" },
  { city: "Hail", region: "HAL" },
  { city: "Najran", region: "NAJ" },
  { city: "Jazan", region: "JAZ" },
];

const PAYERS = [
  { id: "TAWUNIYA", name: "Tawuniya Insurance" },
  { id: "BUPA-ARABIA", name: "Bupa Arabia" },
  { id: "MEDGULF", name: "Medgulf Insurance" },
  { id: "CCHI", name: "CCHI National" },
  { id: "GULF-UNION", name: "Gulf Union Insurance" },
];

const PLAN_TIERS = [
  { tier: "Bronze", annualMax: 100000, copay: 30 },
  { tier: "Silver", annualMax: 500000, copay: 20 },
  { tier: "Gold", annualMax: 1000000, copay: 10 },
  { tier: "Platinum", annualMax: 2000000, copay: 5 },
];

const SPECIALTIES = [
  "Cardiology", "Orthopedics", "General Medicine", "Emergency Medicine",
  "Pediatrics", "OB-GYN", "Oncology", "Neurology", "Dermatology",
  "Psychiatry", "Ophthalmology", "ENT", "Urology", "Radiology", "General Surgery",
];

const PROVIDER_NAMES = [
  "King Faisal Specialist Hospital", "King Abdulaziz Medical City", "Saudi German Hospital",
  "Dr. Sulaiman Al Habib Hospital", "Dallah Hospital", "Al Noor Specialist Hospital",
  "International Medical Center", "King Fahad Medical City", "Riyadh Care Hospital",
  "Al Mouwasat Hospital", "National Guard Hospital", "King Khalid University Hospital",
  "Prince Sultan Military Medical City", "Al Hammadi Hospital", "Saad Specialist Hospital",
  "Johns Hopkins Aramco Healthcare", "Soliman Fakeeh Hospital", "East Jeddah Hospital",
  "Al Iman General Hospital", "King Saud Medical City", "Al Hayat National Hospital",
  "Magrabi Eye Hospital", "Al Habib Medical Group Olaya", "Almana General Hospital",
  "Dhahran Health Center", "Al Rashid Hospital", "Buraidah Central Hospital",
  "Abha Private Hospital", "Hail General Hospital", "Tabuk Health Complex",
  "Najran General Hospital", "Jazan General Hospital", "Prince Mohammed bin Abdulaziz Hospital",
  "Al Salam Hospital", "Kingdom Hospital", "Al Yamamah Hospital",
  "Security Forces Hospital", "Specialized Medical Center", "Al Jeddani Hospital",
  "Makkah Medical Center", "Al Ahsa Hospital", "King Abdullah Medical Complex",
  "Yanbu General Hospital", "Khamis Mushait General Hospital", "Al Qatif Central Hospital",
  "Riyadh National Hospital", "King Faisal Hospital Taif", "Maternity & Children Hospital Dammam",
  "Al Qurayyat General Hospital", "Prince Mansour Hospital",
  // Clinics
  "Al Nuzha Polyclinic", "Rawdah Medical Center", "Al Olaya Medical Complex",
  "Sahafa Family Clinic", "Al Salamah Clinic", "Green Crescent Clinic",
  "Al Manar Medical Center", "Al Waha Polyclinic", "Arabian Medical Center",
  "Jeddah Day Surgery Center", "Dammam Polyclinic", "Al Safa Medical Complex",
  "Riyadh Day Care Center", "Al Amal Clinic", "Makkah Polyclinic",
  // Pharmacies
  "Nahdi Pharmacy Central", "Al Dawaa Pharmacy Main", "Kunooz Pharmacy",
  "Whites Pharmacy", "United Pharmacy Hub", "Al Nahdi Pharmacy Olaya",
  "Al Dawaa Pharmacy Riyadh", "Kunooz Pharmacy Jeddah", "Care Pharmacy",
  "Nova Pharmacy",
  // Labs
  "Al Borg Medical Laboratories", "National Reference Lab", "KFSHRC Lab Services",
  "Saudi Diagnostics Lab", "Bio Lab Medical Center", "Unilabs Saudi Arabia",
  "iLab Medical", "PathCare Laboratories", "MedLab Central", "Saudi Lab Network",
  // Specialist Centers
  "Saudi Oncology Center", "Riyadh Eye Center", "National Cardiac Center",
  "Saudi Diabetes Center", "Neuroscience Center Riyadh",
];

const PRACTITIONER_FIRST_NAMES = [
  "Mohammed", "Ahmed", "Abdullah", "Khalid", "Omar", "Ali", "Hassan", "Ibrahim",
  "Faisal", "Saud", "Nawaf", "Saleh", "Nasser", "Fahad", "Turki",
  "Fatima", "Noura", "Sarah", "Maha", "Huda", "Layla", "Reem", "Dana",
  "Amal", "Nada", "Lina", "Razan", "Jawaher", "Asma", "Hanan",
];

const PRACTITIONER_LAST_NAMES = [
  "Al-Qahtani", "Al-Otaibi", "Al-Harbi", "Al-Ghamdi", "Al-Zahrani",
  "Al-Dosari", "Al-Shehri", "Al-Subaie", "Al-Mutairi", "Al-Rashidi",
  "Al-Enezi", "Al-Shammari", "Al-Tamimi", "Al-Juhani", "Al-Malki",
  "Al-Balawi", "Al-Amri", "Al-Thubaiti", "Al-Saleh", "Al-Ahmad",
];

const MEMBER_FIRST_NAMES_MALE = [
  "Mohammed", "Ahmed", "Abdullah", "Khalid", "Omar", "Ali", "Hassan", "Ibrahim",
  "Faisal", "Saud", "Nawaf", "Saleh", "Nasser", "Fahad", "Turki", "Bandar",
  "Saad", "Youssef", "Tariq", "Waleed", "Majed", "Rakan", "Sultan", "Hamad",
  "Mishari",
];

const MEMBER_FIRST_NAMES_FEMALE = [
  "Fatima", "Noura", "Sarah", "Maha", "Huda", "Layla", "Reem", "Dana",
  "Amal", "Nada", "Lina", "Razan", "Jawaher", "Asma", "Hanan", "Bushra",
  "Haifa", "Ghada", "Waad", "Abeer", "Maram", "Shahad", "Dania", "Yara",
  "Lamia",
];

const LAST_NAMES = [
  "Al-Qahtani", "Al-Otaibi", "Al-Harbi", "Al-Ghamdi", "Al-Zahrani",
  "Al-Dosari", "Al-Shehri", "Al-Subaie", "Al-Mutairi", "Al-Rashidi",
  "Al-Enezi", "Al-Shammari", "Al-Tamimi", "Al-Juhani", "Al-Malki",
  "Al-Balawi", "Al-Amri", "Al-Thubaiti", "Al-Saleh", "Al-Ahmad",
  "Al-Khaldi", "Al-Harthy", "Al-Shahrani", "Al-Bishi", "Al-Yamani",
  "Al-Anzi", "Al-Ruwaili", "Al-Dosseri", "Al-Sulaiman", "Al-Fadhli",
];

const NATIONALITIES = [
  ...Array(70).fill("Saudi"),
  ...Array(15).fill("Egyptian"),
  ...Array(5).fill("Indian"),
  ...Array(5).fill("Pakistani"),
  "Jordanian", "Syrian", "Yemeni", "Sudanese", "Filipino",
];

const ICD10_CODES = [
  { code: "E11.9", description: "Type 2 diabetes mellitus without complications", specialty: "General Medicine" },
  { code: "I10", description: "Essential hypertension", specialty: "Cardiology" },
  { code: "M54.5", description: "Low back pain", specialty: "Orthopedics" },
  { code: "J06.9", description: "Acute upper respiratory infection", specialty: "General Medicine" },
  { code: "J18.9", description: "Pneumonia, unspecified organism", specialty: "General Medicine" },
  { code: "K21.0", description: "Gastro-esophageal reflux with esophagitis", specialty: "General Medicine" },
  { code: "I25.10", description: "Atherosclerotic heart disease", specialty: "Cardiology" },
  { code: "N39.0", description: "Urinary tract infection", specialty: "Urology" },
  { code: "M17.11", description: "Primary osteoarthritis, right knee", specialty: "Orthopedics" },
  { code: "E78.5", description: "Hyperlipidemia, unspecified", specialty: "General Medicine" },
  { code: "J45.20", description: "Mild intermittent asthma, uncomplicated", specialty: "General Medicine" },
  { code: "G43.909", description: "Migraine, unspecified", specialty: "Neurology" },
  { code: "L30.9", description: "Dermatitis, unspecified", specialty: "Dermatology" },
  { code: "F41.1", description: "Generalized anxiety disorder", specialty: "Psychiatry" },
  { code: "H52.13", description: "Myopia, bilateral", specialty: "Ophthalmology" },
  { code: "J32.9", description: "Chronic sinusitis, unspecified", specialty: "ENT" },
  { code: "K80.20", description: "Calculus of gallbladder without obstruction", specialty: "General Surgery" },
  { code: "O80", description: "Encounter for full-term uncomplicated delivery", specialty: "OB-GYN" },
  { code: "C50.919", description: "Malignant neoplasm of unspecified site of breast", specialty: "Oncology" },
  { code: "J44.1", description: "Chronic obstructive pulmonary disease with acute exacerbation", specialty: "General Medicine" },
  { code: "I48.91", description: "Unspecified atrial fibrillation", specialty: "Cardiology" },
  { code: "E03.9", description: "Hypothyroidism, unspecified", specialty: "General Medicine" },
  { code: "M79.3", description: "Panniculitis, unspecified", specialty: "Dermatology" },
  { code: "K29.70", description: "Gastritis, unspecified, without bleeding", specialty: "General Medicine" },
  { code: "Z23", description: "Encounter for immunization", specialty: "Pediatrics" },
  { code: "J20.9", description: "Acute bronchitis, unspecified", specialty: "General Medicine" },
  { code: "R10.9", description: "Unspecified abdominal pain", specialty: "Emergency Medicine" },
  { code: "S52.509A", description: "Unspecified fracture of lower end of radius", specialty: "Emergency Medicine" },
  { code: "I21.3", description: "ST elevation myocardial infarction of unspecified site", specialty: "Emergency Medicine" },
  { code: "Z00.00", description: "Encounter for general adult medical examination", specialty: "General Medicine" },
];

const CPT_CODES = [
  { code: "99213", description: "Office visit, established patient, moderate", basePrice: 350, type: "Outpatient" },
  { code: "99214", description: "Office visit, established patient, high", basePrice: 550, type: "Outpatient" },
  { code: "99215", description: "Office visit, established patient, comprehensive", basePrice: 800, type: "Outpatient" },
  { code: "99283", description: "Emergency dept visit, moderate severity", basePrice: 1200, type: "Emergency" },
  { code: "99284", description: "Emergency dept visit, high severity", basePrice: 2500, type: "Emergency" },
  { code: "99285", description: "Emergency dept visit, highest severity", basePrice: 5000, type: "Emergency" },
  { code: "99223", description: "Initial hospital care, high complexity", basePrice: 3500, type: "Inpatient" },
  { code: "99232", description: "Subsequent hospital care, moderate", basePrice: 1500, type: "Inpatient" },
  { code: "99238", description: "Hospital discharge day management", basePrice: 1200, type: "Inpatient" },
  { code: "71046", description: "Radiologic exam, chest, 2 views", basePrice: 400, type: "Outpatient" },
  { code: "73721", description: "MRI lower extremity joint without contrast", basePrice: 2500, type: "Outpatient" },
  { code: "93000", description: "Electrocardiogram, routine ECG", basePrice: 200, type: "Outpatient" },
  { code: "80053", description: "Comprehensive metabolic panel", basePrice: 150, type: "Outpatient" },
  { code: "85025", description: "Complete blood count (CBC)", basePrice: 80, type: "Outpatient" },
  { code: "36415", description: "Collection of venous blood", basePrice: 50, type: "Outpatient" },
  { code: "90686", description: "Influenza vaccine, quadrivalent", basePrice: 120, type: "Outpatient" },
  { code: "27447", description: "Total knee replacement", basePrice: 45000, type: "Inpatient" },
  { code: "47562", description: "Laparoscopic cholecystectomy", basePrice: 28000, type: "Inpatient" },
  { code: "63030", description: "Lumbar laminotomy", basePrice: 35000, type: "Inpatient" },
  { code: "59400", description: "Routine obstetric care", basePrice: 15000, type: "Inpatient" },
  { code: "99201", description: "New patient office visit, straightforward", basePrice: 250, type: "Outpatient" },
  { code: "90834", description: "Psychotherapy, 45 minutes", basePrice: 600, type: "Outpatient" },
  { code: "92014", description: "Ophthalmological exam, comprehensive", basePrice: 450, type: "Outpatient" },
  { code: "69210", description: "Removal of impacted cerumen", basePrice: 300, type: "ENT" },
  { code: "10060", description: "Incision and drainage of abscess", basePrice: 800, type: "Emergency" },
];

const PHARMACY_ITEMS = [
  { code: "NDC-0002-4462", description: "Metformin 500mg tablets", basePrice: 45, daysSupply: 30 },
  { code: "NDC-0069-1085", description: "Amlodipine 5mg tablets", basePrice: 55, daysSupply: 30 },
  { code: "NDC-0071-0156", description: "Atorvastatin 20mg tablets", basePrice: 80, daysSupply: 30 },
  { code: "NDC-0093-7180", description: "Omeprazole 20mg capsules", basePrice: 35, daysSupply: 30 },
  { code: "NDC-0378-6150", description: "Amoxicillin 500mg capsules", basePrice: 25, daysSupply: 10 },
  { code: "NDC-0054-0087", description: "Prednisone 10mg tablets", basePrice: 15, daysSupply: 14 },
  { code: "NDC-0310-0795", description: "Salbutamol inhaler 100mcg", basePrice: 65, daysSupply: 30 },
  { code: "NDC-0049-4900", description: "Insulin Glargine pen", basePrice: 280, daysSupply: 30 },
];

const CHRONIC_CONDITIONS = [
  "Type 2 Diabetes", "Hypertension", "Asthma", "COPD",
  "Coronary Artery Disease", "Chronic Kidney Disease", "Hypothyroidism", "Hyperlipidemia",
];

const FWA_FLAG_REASONS = [
  { reason: "Suspected upcoding - service billed at higher complexity than documented", weight: 3 },
  { reason: "Unbundling detected - services should be billed as a package", weight: 2 },
  { reason: "Duplicate claim submission within 7-day window", weight: 2 },
  { reason: "Phantom billing - no corresponding patient visit record", weight: 1 },
  { reason: "Credential mismatch - service outside provider scope", weight: 1 },
  { reason: "Frequency abuse - service exceeds normal utilization threshold", weight: 1 },
];

const DENIAL_REASONS = [
  "Prior authorization not obtained",
  "Service not covered under plan",
  "Duplicate claim submission",
  "Exceeds benefit maximum",
  "Out-of-network provider without referral",
  "Incomplete documentation",
  "Coding error - ICD/CPT mismatch",
  "Pre-existing condition exclusion period",
];

// =============================================================================
// Utility Functions
// =============================================================================

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDecimal(min: number, max: number, precision: number = 2): string {
  const val = Math.random() * (max - min) + min;
  return val.toFixed(precision);
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedRandom<T>(items: T[], weights: number[]): T {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) return items[i];
  }
  return items[items.length - 1];
}

function padId(num: number, length: number): string {
  return String(num).padStart(length, "0");
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Bell-curve-ish age centered around 35
function randomAge(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const age = Math.round(35 + normal * 15);
  return Math.max(0, Math.min(80, age));
}

// =============================================================================
// Seeder Functions
// =============================================================================

let seededPolicyIds: string[] = [];
let seededProviderIds: string[] = [];
let seededPractitionerIds: string[] = [];
let seededMemberIds: string[] = [];
let seededClaimData: { id: string; claimNumber: string; providerId: string; memberId: string; practitionerId: string | null; amount: string; status: string; flagged: boolean; flagReason: string | null; primaryDiagnosis: string }[] = [];

async function seedPolicies(): Promise<void> {
  console.log("[BRD Seeder] Seeding 30 policies...");
  const rows: any[] = [];
  let idx = 0;
  for (const payer of PAYERS) {
    for (const tier of PLAN_TIERS) {
      // ~1-2 policies per payer-tier combo, some get extras
      const count = idx < 20 ? 1 : (idx < 28 ? 1 : 1);
      for (let i = 0; i < count && rows.length < 30; i++) {
        idx++;
        const id = `POL-${padId(idx, 4)}`;
        const year = randomElement([2024, 2025, 2026]);
        const effectiveDate = `${year}-01-01`;
        const expiryDate = `${year}-12-31`;
        rows.push({
          id,
          planName: `${payer.name} ${tier.tier} Plan`,
          payerId: payer.id,
          effectiveDate,
          expiryDate,
          coverageLimits: { outpatient: tier.annualMax * 0.3, inpatient: tier.annualMax * 0.6, pharmacy: tier.annualMax * 0.1 },
          exclusions: ["Cosmetic surgery", "Experimental treatments"],
          copaySchedule: { outpatient: tier.copay, inpatient: tier.copay / 2, pharmacy: tier.copay },
          waitingPeriods: { maternity: 12, dental: 6, preExisting: tier.tier === "Platinum" ? 0 : 3 },
          preAuthRequiredServices: ["Surgery", "MRI", "CT Scan", "Inpatient admission"],
          networkRequirements: tier.tier === "Bronze" ? "In-network only" : "In-network preferred",
          annualMaximum: String(tier.annualMax),
          lifetimeMaximum: String(tier.annualMax * 5),
        });
        seededPolicyIds.push(id);
      }
    }
  }
  // Fill remaining slots
  while (rows.length < 30) {
    idx++;
    const payer = randomElement(PAYERS);
    const tier = randomElement(PLAN_TIERS);
    const id = `POL-${padId(idx, 4)}`;
    rows.push({
      id,
      planName: `${payer.name} ${tier.tier} Special`,
      payerId: payer.id,
      effectiveDate: "2025-07-01",
      expiryDate: "2026-06-30",
      coverageLimits: { outpatient: tier.annualMax * 0.3, inpatient: tier.annualMax * 0.6, pharmacy: tier.annualMax * 0.1 },
      exclusions: ["Cosmetic surgery"],
      copaySchedule: { outpatient: tier.copay, inpatient: tier.copay / 2 },
      annualMaximum: String(tier.annualMax),
      lifetimeMaximum: String(tier.annualMax * 5),
    });
    seededPolicyIds.push(id);
  }

  // Batch insert
  for (let i = 0; i < rows.length; i += 50) {
    await db.insert(policies).values(rows.slice(i, i + 50));
  }
  console.log(`[BRD Seeder] Seeded ${rows.length} policies`);
}

async function seedProviders(): Promise<void> {
  console.log("[BRD Seeder] Seeding 100 providers...");
  const rows: any[] = [];
  // Type distribution: hospital 40, clinic 30, pharmacy 15, lab 10, specialist 5
  const typeDistribution = [
    ...Array(40).fill("Hospital"),
    ...Array(30).fill("Clinic"),
    ...Array(15).fill("Pharmacy"),
    ...Array(10).fill("Laboratory"),
    ...Array(5).fill("Specialist Center"),
  ];

  for (let i = 1; i <= 100; i++) {
    const id = `PRV-${padId(i, 4)}`;
    const cityData = SAUDI_CITIES[i % SAUDI_CITIES.length];
    const providerType = typeDistribution[i - 1];
    const name = PROVIDER_NAMES[i - 1] || `${cityData.city} Medical Center ${i}`;
    const specialty = providerType === "Pharmacy" ? "Pharmacy" :
      providerType === "Laboratory" ? "Laboratory Medicine" :
      randomElement(SPECIALTIES);
    const tierRoll = Math.random();
    const networkTier = tierRoll < 0.3 ? "Tier 1" : tierRoll < 0.7 ? "Tier 2" : "Tier 3";

    rows.push({
      id,
      npi: `CCHI-${padId(randomInt(100000, 999999), 6)}`,
      name,
      providerType,
      specialty,
      region: cityData.region,
      city: cityData.city,
      networkTier,
      address: `${randomInt(1, 500)} King Fahd Road, ${cityData.city}`,
      organization: name.includes("Hospital") ? name.split(" ").slice(0, 3).join(" ") + " Group" : null,
      email: `info@${name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15)}.sa`,
      phone: `+966-${randomInt(10, 59)}-${randomInt(100, 999)}-${randomInt(1000, 9999)}`,
      licenseNumber: `LIC-${padId(randomInt(10000, 99999), 5)}`,
      licenseExpiry: formatDate(randomDate(new Date("2026-01-01"), new Date("2028-12-31"))),
      contractStatus: randomElement(["Active", "Active", "Active", "Under Review", "Pending Renewal"]),
      hcpCode: `HCP-${padId(i, 4)}`,
      memberCount: randomInt(500, 50000),
    });
    seededProviderIds.push(id);
  }

  for (let i = 0; i < rows.length; i += 50) {
    await db.insert(providers).values(rows.slice(i, i + 50));
  }
  console.log(`[BRD Seeder] Seeded ${rows.length} providers`);
}

async function seedPractitioners(): Promise<void> {
  console.log("[BRD Seeder] Seeding 50 practitioners...");
  const rows: any[] = [];

  for (let i = 1; i <= 50; i++) {
    const id = `DOC-${padId(i, 4)}`;
    const firstName = randomElement(PRACTITIONER_FIRST_NAMES);
    const lastName = randomElement(PRACTITIONER_LAST_NAMES);
    const specialty = SPECIALTIES[(i - 1) % SPECIALTIES.length];
    // Affiliate to 1-3 hospital/clinic providers
    const hospitalProviders = seededProviderIds.filter((_, idx) => idx < 70); // first 70 are hospitals+clinics
    const primaryFacility = hospitalProviders[randomInt(0, hospitalProviders.length - 1)];
    const numAffiliations = randomInt(1, 3);
    const affiliations = [primaryFacility];
    for (let j = 1; j < numAffiliations; j++) {
      const otherFacility = hospitalProviders[randomInt(0, hospitalProviders.length - 1)];
      if (!affiliations.includes(otherFacility)) affiliations.push(otherFacility);
    }

    rows.push({
      id,
      name: `Dr. ${firstName} ${lastName}`,
      specialty,
      specialtyCode: `SP-${padId((i - 1) % SPECIALTIES.length + 1, 3)}`,
      credentials: randomElement(["MD", "MD, FRCS", "MD, PhD", "MBBS", "MD, FACC", "MD, FACS"]),
      licenseNumber: `SCL-${padId(randomInt(10000, 99999), 5)}`,
      primaryFacilityId: primaryFacility,
      primaryFacilityName: PROVIDER_NAMES[parseInt(primaryFacility.replace("PRV-", "")) - 1] || "Unknown Facility",
      affiliatedFacilities: affiliations,
    });
    seededPractitionerIds.push(id);
  }

  for (let i = 0; i < rows.length; i += 50) {
    await db.insert(practitioners).values(rows.slice(i, i + 50));
  }
  console.log(`[BRD Seeder] Seeded ${rows.length} practitioners`);
}

async function seedMembers(): Promise<void> {
  console.log("[BRD Seeder] Seeding 500 members...");
  const rows: any[] = [];

  for (let i = 1; i <= 500; i++) {
    const id = `MEM-${padId(i, 4)}`;
    const gender = Math.random() < 0.5 ? "Male" : "Female";
    const firstName = gender === "Male"
      ? randomElement(MEMBER_FIRST_NAMES_MALE)
      : randomElement(MEMBER_FIRST_NAMES_FEMALE);
    const lastName = randomElement(LAST_NAMES);
    const age = randomAge();
    const dob = new Date();
    dob.setFullYear(dob.getFullYear() - age);

    const hasChronic = Math.random() < 0.15;
    const hasPreExisting = Math.random() < 0.08;
    const chronicList = hasChronic
      ? Array.from({ length: randomInt(1, 3) }, () => randomElement(CHRONIC_CONDITIONS))
        .filter((v, idx, arr) => arr.indexOf(v) === idx)
      : null;

    rows.push({
      id,
      policyId: seededPolicyIds[i % seededPolicyIds.length],
      payerId: PAYERS[i % PAYERS.length].id,
      name: `${firstName} ${lastName}`,
      dateOfBirth: formatDate(dob),
      gender,
      nationality: randomElement(NATIONALITIES),
      region: SAUDI_CITIES[i % SAUDI_CITIES.length].region,
      groupNumber: `GRP-${padId(randomInt(100, 999), 3)}`,
      coverageRelationship: randomElement(["Self", "Self", "Self", "Spouse", "Child", "Dependent"]),
      chronicConditions: chronicList,
      preExistingFlag: hasPreExisting,
      maritalStatus: randomElement(["Single", "Married", "Married", "Married", "Divorced", "Widowed"]),
      networkTier: randomElement(["Tier 1", "Tier 2", "Tier 3"]),
    });
    seededMemberIds.push(id);
  }

  for (let i = 0; i < rows.length; i += 50) {
    await db.insert(members).values(rows.slice(i, i + 50));
  }
  console.log(`[BRD Seeder] Seeded ${rows.length} members`);
}

async function seedClaims(): Promise<void> {
  console.log("[BRD Seeder] Seeding 5,000 claims...");

  // Type distribution: 60% outpatient, 20% inpatient, 10% emergency, 10% pharmacy
  const claimTypes = [
    ...Array(60).fill("Outpatient"),
    ...Array(20).fill("Inpatient"),
    ...Array(10).fill("Emergency"),
    ...Array(10).fill("Pharmacy"),
  ];

  // Status: 50% approved, 20% pending, 15% under_review, 10% denied, 5% flagged
  const statusDistribution = [
    ...Array(50).fill("approved"),
    ...Array(20).fill("pending"),
    ...Array(15).fill("under_review"),
    ...Array(10).fill("denied"),
    ...Array(5).fill("flagged"),
  ];

  const rows: any[] = [];
  const now = new Date();
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  for (let i = 1; i <= 5000; i++) {
    const claimNumber = `CLM-2026-${padId(i, 5)}`;
    const claimType = randomElement(claimTypes);
    const status = randomElement(statusDistribution);

    // Pick member and their associated provider/practitioner
    const memberId = seededMemberIds[randomInt(0, seededMemberIds.length - 1)];
    const providerId = seededProviderIds[randomInt(0, seededProviderIds.length - 1)];
    const practitionerId = claimType !== "Pharmacy"
      ? seededPractitionerIds[randomInt(0, seededPractitionerIds.length - 1)]
      : null;
    const policyId = seededPolicyIds[randomInt(0, seededPolicyIds.length - 1)];

    // Amount based on type
    let amount: number;
    switch (claimType) {
      case "Outpatient": amount = parseFloat(randomDecimal(100, 5000)); break;
      case "Inpatient": amount = parseFloat(randomDecimal(5000, 200000)); break;
      case "Emergency": amount = parseFloat(randomDecimal(500, 50000)); break;
      case "Pharmacy": amount = parseFloat(randomDecimal(50, 3000)); break;
      default: amount = parseFloat(randomDecimal(100, 5000));
    }

    // Diagnosis based on specialty/type
    const diagnosisCandidates = claimType === "Emergency"
      ? ICD10_CODES.filter(d => d.specialty === "Emergency Medicine" || d.specialty === "General Medicine")
      : ICD10_CODES;
    const primaryDiag = randomElement(diagnosisCandidates);
    const additionalIcds = Array.from(
      { length: randomInt(0, 2) },
      () => randomElement(ICD10_CODES).code
    );
    const icdCodes = [primaryDiag.code, ...additionalIcds].filter((v, idx, arr) => arr.indexOf(v) === idx);

    // CPT codes
    const cptCandidates = CPT_CODES.filter(c =>
      claimType === "Inpatient" ? c.type === "Inpatient" || c.type === "Outpatient" :
      claimType === "Emergency" ? c.type === "Emergency" || c.type === "Outpatient" :
      c.type === "Outpatient"
    );
    const cptCodes = Array.from(
      { length: randomInt(1, 3) },
      () => randomElement(cptCandidates).code
    ).filter((v, idx, arr) => arr.indexOf(v) === idx);

    // Dates
    const serviceDate = randomDate(twelveMonthsAgo, now);
    const registrationDate = new Date(serviceDate);
    registrationDate.setDate(registrationDate.getDate() + randomInt(0, 3));

    // Approved amount
    const approvedAmount = status === "approved"
      ? (amount * (0.7 + Math.random() * 0.3)).toFixed(2)
      : status === "denied" ? "0.00" : null;

    // FWA flagging (~10%)
    const isFlagged = Math.random() < 0.10;
    const flagReason = isFlagged ? randomElement(FWA_FLAG_REASONS).reason : null;

    const denialReason = status === "denied" ? randomElement(DENIAL_REASONS) : null;

    // Inpatient-specific
    const lengthOfStay = claimType === "Inpatient" ? randomInt(1, 21) : null;
    const hasSurgery = claimType === "Inpatient" ? Math.random() < 0.4 : false;
    const hasIcu = claimType === "Inpatient" ? Math.random() < 0.15 : false;
    const admissionDate = claimType === "Inpatient" ? serviceDate : null;
    const dischargeDate = claimType === "Inpatient" && lengthOfStay
      ? new Date(serviceDate.getTime() + lengthOfStay * 86400000) : null;

    const cityData = SAUDI_CITIES[i % SAUDI_CITIES.length];

    const row = {
      claimNumber,
      policyId,
      memberId,
      providerId,
      practitionerId,
      claimType,
      registrationDate,
      serviceDate,
      amount: amount.toFixed(2),
      approvedAmount,
      denialReason,
      status,
      primaryDiagnosis: primaryDiag.code,
      icdCodes,
      cptCodes,
      description: primaryDiag.description,
      specialty: primaryDiag.specialty,
      hospital: PROVIDER_NAMES[parseInt(providerId.replace("PRV-", "")) - 1] || "Unknown Hospital",
      hasSurgery,
      surgeryFee: hasSurgery ? (amount * 0.6).toFixed(2) : null,
      hasIcu,
      lengthOfStay,
      preAuthRef: claimType === "Inpatient" || amount > 10000 ? `PA-${padId(i, 6)}` : null,
      category: claimType,
      insurerId: PAYERS[i % PAYERS.length].id,
      isNewborn: false,
      isChronic: Math.random() < 0.15,
      isPreExisting: Math.random() < 0.05,
      isPreAuthorized: claimType === "Inpatient" || amount > 10000,
      isMaternity: primaryDiag.code === "O80",
      city: cityData.city,
      providerType: i <= 40 ? "Hospital" : i <= 70 ? "Clinic" : i <= 85 ? "Pharmacy" : "Laboratory",
      coverageRelationship: randomElement(["Self", "Spouse", "Child"]),
      admissionDate,
      dischargeDate,
      dischargeDisposition: claimType === "Inpatient" ? randomElement(["Home", "Home", "Transfer", "AMA"]) : null,
      source: "BRD_SEEDER",
      flagged: isFlagged,
      flagReason,
      outlierScore: isFlagged ? randomDecimal(0.5, 0.99, 4) : randomDecimal(0.01, 0.4, 4),
    };

    rows.push(row);
    seededClaimData.push({
      id: claimNumber, // will be replaced with actual UUID after insert
      claimNumber,
      providerId,
      memberId,
      practitionerId,
      amount: amount.toFixed(2),
      status,
      flagged: isFlagged,
      flagReason,
      primaryDiagnosis: primaryDiag.code,
    });
  }

  // Batch insert in chunks of 100
  for (let i = 0; i < rows.length; i += 100) {
    await db.insert(claims).values(rows.slice(i, i + 100));
  }
  console.log(`[BRD Seeder] Seeded ${rows.length} claims`);
}

async function seedServiceLineData(): Promise<void> {
  console.log("[BRD Seeder] Seeding service lines (~12,500)...");

  // Get all claim IDs from DB
  const claimRows = await db.execute(sql`SELECT id, claim_number, claim_type, amount FROM claims_v2 ORDER BY claim_number`);
  const dbClaims = (claimRows as any).rows || claimRows;

  const rows: any[] = [];
  let totalLines = 0;

  for (const claim of dbClaims) {
    const claimType = claim.claim_type;
    const claimAmount = parseFloat(claim.amount);

    // Lines per claim based on type
    let numLines: number;
    switch (claimType) {
      case "Outpatient": numLines = randomInt(1, 3); break;
      case "Inpatient": numLines = randomInt(3, 8); break;
      case "Emergency": numLines = randomInt(2, 5); break;
      case "Pharmacy": numLines = randomInt(1, 2); break;
      default: numLines = randomInt(1, 3);
    }

    // Distribute claim amount across service lines
    const lineAmounts: number[] = [];
    let remaining = claimAmount;
    for (let l = 0; l < numLines - 1; l++) {
      const portion = remaining * (0.1 + Math.random() * 0.5);
      lineAmounts.push(Math.round(portion * 100) / 100);
      remaining -= portion;
    }
    lineAmounts.push(Math.round(remaining * 100) / 100);

    for (let l = 0; l < numLines; l++) {
      const isPharmacy = claimType === "Pharmacy";
      const lineAmount = lineAmounts[l];
      const quantity = isPharmacy ? randomInt(1, 3) : 1;
      const unitPrice = (lineAmount / quantity).toFixed(2);

      const serviceItem = isPharmacy
        ? randomElement(PHARMACY_ITEMS)
        : randomElement(CPT_CODES);

      rows.push({
        claimId: claim.id,
        lineNumber: l + 1,
        serviceCode: serviceItem.code,
        serviceDescription: serviceItem.description,
        serviceCodeSystem: isPharmacy ? "NDC" : "CPT",
        serviceType: claimType,
        quantity: String(quantity),
        unitPrice,
        totalPrice: lineAmount.toFixed(2),
        daysSupply: isPharmacy ? (serviceItem as any).daysSupply || 30 : null,
      });
      totalLines++;
    }

    // Batch insert every 500 lines
    if (rows.length >= 500) {
      await db.insert(serviceLines).values(rows.splice(0, rows.length));
    }
  }

  // Insert remaining
  if (rows.length > 0) {
    await db.insert(serviceLines).values(rows);
  }
  console.log(`[BRD Seeder] Seeded ${totalLines} service lines`);
}

async function seedDetectionResultsV2(): Promise<void> {
  console.log("[BRD Seeder] Seeding detection results for flagged claims...");

  // Get all flagged claims from claims_v2
  const flaggedClaims = await db.execute(sql`
    SELECT id, claim_number, provider_id, member_id, practitioner_id, amount,
           primary_diagnosis, flag_reason, specialty, claim_type
    FROM claims_v2
    WHERE flagged = true
    LIMIT 500
  `);
  const claims = (flaggedClaims as any).rows || flaggedClaims;

  if (claims.length === 0) {
    console.log("[BRD Seeder] No flagged claims found, skipping detection results");
    return;
  }

  const detectionRows: any[] = [];
  const ruleTypes = ["rule_based", "statistical", "ml_unsupervised", "network_analysis", "temporal_pattern"];
  const severities = ["critical", "high", "medium", "low"];

  for (const claim of claims) {
    // 1-3 detection results per flagged claim
    const numResults = randomInt(1, 3);
    for (let r = 0; r < numResults; r++) {
      const ruleType = randomElement(ruleTypes);
      const severity = weightedRandom(severities, [10, 30, 40, 20]);
      const confidence = parseFloat(randomDecimal(0.6, 0.99));

      const ruleScore = ruleType === "rule_based" ? parseFloat(randomDecimal(40, 95)) : parseFloat(randomDecimal(10, 50));
      const statScore = ruleType === "statistical" ? parseFloat(randomDecimal(40, 95)) : parseFloat(randomDecimal(10, 50));
      const unsupScore = ruleType === "ml_unsupervised" ? parseFloat(randomDecimal(40, 95)) : parseFloat(randomDecimal(10, 50));
      const compositeScore = (ruleScore * 0.4 + statScore * 0.3 + unsupScore * 0.3);
      const compositeRiskLevel = compositeScore >= 75 ? "critical" : compositeScore >= 55 ? "high" : compositeScore >= 35 ? "medium" : "low";

      detectionRows.push({
        claimId: claim.claim_number,
        providerId: claim.provider_id,
        patientId: claim.member_id,
        compositeScore: compositeScore.toFixed(2),
        compositeRiskLevel,
        ruleEngineScore: ruleScore.toFixed(2),
        statisticalScore: statScore.toFixed(2),
        unsupervisedScore: unsupScore.toFixed(2),
        detectionSummary: claim.flag_reason || "Anomalous pattern detected",
        recommendedAction: "Review claim for potential FWA indicators",
      });
    }
  }

  // Batch insert detection results
  for (let i = 0; i < detectionRows.length; i += 100) {
    await db.insert(fwaDetectionResults).values(detectionRows.slice(i, i + 100));
  }
  console.log(`[BRD Seeder] Seeded ${detectionRows.length} detection results`);

  // Aggregate provider detection results
  console.log("[BRD Seeder] Aggregating provider detection results...");
  const providerStats = await db.execute(sql`
    SELECT
      dr.provider_id,
      COUNT(DISTINCT dr.claim_id) as total_claims,
      COUNT(CASE WHEN dr.composite_risk_level = 'critical' THEN 1 END) as critical_count,
      COUNT(CASE WHEN dr.composite_risk_level = 'high' THEN 1 END) as high_count,
      COUNT(*) as total_flags,
      AVG(dr.composite_score::numeric) as avg_score,
      COALESCE(SUM(c.amount::numeric), 0) as total_amount,
      COALESCE(AVG(c.amount::numeric), 0) as avg_claim_amount
    FROM fwa_detection_results dr
    LEFT JOIN claims_v2 c ON dr.claim_id = c.claim_number
    WHERE dr.provider_id LIKE 'PRV-%'
    GROUP BY dr.provider_id
    HAVING COUNT(DISTINCT dr.claim_id) >= 2
    ORDER BY total_flags DESC
    LIMIT 50
  `);
  const provStats = (providerStats as any).rows || providerStats;

  const providerDetectionRows: any[] = [];
  for (const stat of provStats) {
    const totalClaims = parseInt(stat.total_claims);
    const critCount = parseInt(stat.critical_count);
    const highCount = parseInt(stat.high_count);

    // Composite score: weighted by severity
    const compositeScore = Math.min(99.99,
      (critCount * 25 + highCount * 15 + totalClaims * 5) + Math.random() * 10
    );
    const riskLevel = compositeScore >= 75 ? "critical" : compositeScore >= 55 ? "high" : compositeScore >= 35 ? "medium" : "low";

    providerDetectionRows.push({
      providerId: stat.provider_id,
      compositeScore: compositeScore.toFixed(2),
      riskLevel,
      ruleEngineScore: randomDecimal(30, 90),
      statisticalScore: randomDecimal(20, 80),
      unsupervisedScore: randomDecimal(20, 80),
      aggregatedMetrics: {
        totalAmount: parseFloat(stat.total_amount || 0),
        avgClaimAmount: parseFloat(stat.avg_claim_amount || 0),
        totalClaims,
        uniquePatients: randomInt(5, totalClaims),
        uniqueDoctors: randomInt(1, 10),
        flaggedClaimsCount: totalClaims,
        flaggedClaimsPercent: 100,
        highRiskClaimsCount: critCount + highCount,
        topProcedureCodes: [],
        topDiagnosisCodes: [],
        claimsPerMonth: Math.round(totalClaims / 12 * 100) / 100,
        denialRate: randomInt(5, 30),
      },
      detectionSummary: `Provider flagged with ${totalClaims} suspicious claims (${critCount} critical, ${highCount} high severity)`,
      recommendedAction: compositeScore >= 75 ? "Immediate investigation required" : "Schedule review",
    });
  }

  if (providerDetectionRows.length > 0) {
    await db.insert(fwaProviderDetectionResults).values(providerDetectionRows);
  }
  console.log(`[BRD Seeder] Seeded ${providerDetectionRows.length} provider detection results`);
}

// =============================================================================
// Main Orchestrator
// =============================================================================

export async function seedBrdDemoData(): Promise<void> {
  console.log("[BRD Seeder] ========================================");
  console.log("[BRD Seeder] Starting BRD-aligned data seeding...");
  console.log("[BRD Seeder] ========================================");

  // Check if already seeded
  const existingCount = await db.select({ count: count() }).from(claims);
  if (Number(existingCount[0]?.count || 0) >= 1000) {
    console.log(`[BRD Seeder] claims_v2 already has ${existingCount[0]?.count} records, skipping`);
    return;
  }

  const start = Date.now();

  try {
    // Seed in FK order
    await seedPolicies();
    await seedProviders();
    await seedPractitioners();
    await seedMembers();
    await seedClaims();
    await seedServiceLineData();
    await seedDetectionResultsV2();

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log("[BRD Seeder] ========================================");
    console.log(`[BRD Seeder] Complete! Seeded in ${elapsed}s`);
    console.log(`[BRD Seeder]   Policies:       ${seededPolicyIds.length}`);
    console.log(`[BRD Seeder]   Providers:       ${seededProviderIds.length}`);
    console.log(`[BRD Seeder]   Practitioners:   ${seededPractitionerIds.length}`);
    console.log(`[BRD Seeder]   Members:         ${seededMemberIds.length}`);
    console.log(`[BRD Seeder]   Claims:          ${seededClaimData.length}`);
    console.log("[BRD Seeder] ========================================");
  } catch (error) {
    console.error("[BRD Seeder] Error during seeding:", error);
    throw error;
  }
}
