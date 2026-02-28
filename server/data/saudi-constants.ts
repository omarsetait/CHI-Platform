/**
 * Saudi Healthcare Constants for CHI Demo
 *
 * Comprehensive reference data for the Council of Health Insurance (CHI)
 * demonstration platform. Contains all Saudi-specific provider, insurer,
 * patient-name, KPI, and bilingual-label data used by seed scripts and
 * UI components.
 */

// ---------------------------------------------------------------------------
// 1. SAUDI_REGIONS — 13 administrative regions
// ---------------------------------------------------------------------------

export const SAUDI_REGIONS = [
  { code: "RIY", nameEn: "Riyadh",          nameAr: "الرياض",          population: 8_600_000, weight: 0.271 },
  { code: "MAK", nameEn: "Makkah",          nameAr: "مكة المكرمة",     population: 9_000_000, weight: 0.257 },
  { code: "EST", nameEn: "Eastern Province", nameAr: "المنطقة الشرقية", population: 5_100_000, weight: 0.146 },
  { code: "ASR", nameEn: "Asir",            nameAr: "عسير",            population: 2_300_000, weight: 0.066 },
  { code: "MDN", nameEn: "Madinah",         nameAr: "المدينة المنورة",  population: 2_200_000, weight: 0.063 },
  { code: "QSM", nameEn: "Qassim",          nameAr: "القصيم",          population: 1_500_000, weight: 0.043 },
  { code: "TBK", nameEn: "Tabuk",           nameAr: "تبوك",            population: 950_000,   weight: 0.027 },
  { code: "HAL", nameEn: "Hail",            nameAr: "حائل",            population: 750_000,   weight: 0.021 },
  { code: "JZN", nameEn: "Jazan",           nameAr: "جازان",           population: 1_700_000, weight: 0.049 },
  { code: "NJR", nameEn: "Najran",          nameAr: "نجران",           population: 600_000,   weight: 0.017 },
  { code: "BAH", nameEn: "Al Baha",         nameAr: "الباحة",          population: 500_000,   weight: 0.014 },
  { code: "JOF", nameEn: "Al Jouf",         nameAr: "الجوف",           population: 530_000,   weight: 0.015 },
  { code: "NBR", nameEn: "Northern Borders", nameAr: "الحدود الشمالية", population: 400_000,   weight: 0.011 },
] as const;

export type RegionCode = (typeof SAUDI_REGIONS)[number]["code"];

// ---------------------------------------------------------------------------
// 2. SAUDI_CITIES — Cities keyed by region code
// ---------------------------------------------------------------------------

export const SAUDI_CITIES: Record<RegionCode, { nameEn: string; nameAr: string; region: RegionCode }[]> = {
  RIY: [
    { nameEn: "Riyadh",     nameAr: "الرياض",      region: "RIY" },
    { nameEn: "Al Kharj",   nameAr: "الخرج",       region: "RIY" },
    { nameEn: "Al Dawadmi", nameAr: "الدوادمي",    region: "RIY" },
  ],
  MAK: [
    { nameEn: "Jeddah",     nameAr: "جدة",         region: "MAK" },
    { nameEn: "Makkah",     nameAr: "مكة المكرمة",  region: "MAK" },
    { nameEn: "Taif",       nameAr: "الطائف",      region: "MAK" },
  ],
  EST: [
    { nameEn: "Dammam",     nameAr: "الدمام",      region: "EST" },
    { nameEn: "Al Khobar",  nameAr: "الخبر",       region: "EST" },
    { nameEn: "Dhahran",    nameAr: "الظهران",     region: "EST" },
    { nameEn: "Al Ahsa",    nameAr: "الأحساء",     region: "EST" },
  ],
  ASR: [
    { nameEn: "Abha",       nameAr: "أبها",        region: "ASR" },
    { nameEn: "Khamis Mushait", nameAr: "خميس مشيط", region: "ASR" },
  ],
  MDN: [
    { nameEn: "Madinah",    nameAr: "المدينة المنورة", region: "MDN" },
    { nameEn: "Yanbu",      nameAr: "ينبع",        region: "MDN" },
  ],
  QSM: [
    { nameEn: "Buraidah",   nameAr: "بريدة",       region: "QSM" },
  ],
  TBK: [
    { nameEn: "Tabuk",      nameAr: "تبوك",        region: "TBK" },
  ],
  HAL: [
    { nameEn: "Hail",       nameAr: "حائل",        region: "HAL" },
  ],
  JZN: [
    { nameEn: "Jazan",      nameAr: "جازان",       region: "JZN" },
  ],
  NJR: [
    { nameEn: "Najran",     nameAr: "نجران",       region: "NJR" },
  ],
  BAH: [
    { nameEn: "Al Baha",    nameAr: "الباحة",      region: "BAH" },
  ],
  JOF: [
    { nameEn: "Sakaka",     nameAr: "سكاكا",       region: "JOF" },
  ],
  NBR: [
    { nameEn: "Arar",       nameAr: "عرعر",        region: "NBR" },
  ],
};

// ---------------------------------------------------------------------------
// Provider type helper
// ---------------------------------------------------------------------------

export interface SaudiProvider {
  providerCode: string;
  nameEn: string;
  nameAr: string;
  city: string;
  region: RegionCode;
  type: string;
  specialty: string;
  tier: 1 | 2 | 3;
  riskScore?: number;
}

// ---------------------------------------------------------------------------
// 3. TIER1_PROVIDERS — 12 major hospital groups
// ---------------------------------------------------------------------------

export const TIER1_PROVIDERS: SaudiProvider[] = [
  { providerCode: "PRV-T1-001", nameEn: "King Fahad Medical City",            nameAr: "مدينة الملك فهد الطبية",              city: "Riyadh",  region: "RIY", type: "medical_city",      specialty: "Multi-Specialty",  tier: 1 },
  { providerCode: "PRV-T1-002", nameEn: "King Faisal Specialist Hospital",    nameAr: "مستشفى الملك فيصل التخصصي",          city: "Riyadh",  region: "RIY", type: "specialist_hospital", specialty: "Multi-Specialty", tier: 1 },
  { providerCode: "PRV-T1-003", nameEn: "Al Habib Medical Group",             nameAr: "مجموعة الحبيب الطبية",                city: "Riyadh",  region: "RIY", type: "hospital_group",     specialty: "Multi-Specialty",  tier: 1 },
  { providerCode: "PRV-T1-004", nameEn: "Saudi German Hospital",              nameAr: "المستشفى السعودي الألماني",           city: "Jeddah",  region: "MAK", type: "hospital_group",     specialty: "Multi-Specialty",  tier: 1 },
  { providerCode: "PRV-T1-005", nameEn: "Dallah Hospital",                    nameAr: "مستشفى دلة",                          city: "Riyadh",  region: "RIY", type: "hospital",          specialty: "Multi-Specialty",  tier: 1 },
  { providerCode: "PRV-T1-006", nameEn: "Mouwasat Medical Services",          nameAr: "شركة المواساة للخدمات الطبية",        city: "Dammam",  region: "EST", type: "hospital_group",     specialty: "Multi-Specialty",  tier: 1 },
  { providerCode: "PRV-T1-007", nameEn: "Al Hammadi Hospital",                nameAr: "مستشفى الحمادي",                      city: "Riyadh",  region: "RIY", type: "hospital",          specialty: "Multi-Specialty",  tier: 1 },
  { providerCode: "PRV-T1-008", nameEn: "National Guard Health Affairs",      nameAr: "الشؤون الصحية بالحرس الوطني",         city: "Riyadh",  region: "RIY", type: "government_hospital", specialty: "Multi-Specialty", tier: 1 },
  { providerCode: "PRV-T1-009", nameEn: "King Abdulaziz University Hospital", nameAr: "مستشفى جامعة الملك عبدالعزيز",        city: "Jeddah",  region: "MAK", type: "university_hospital", specialty: "Multi-Specialty", tier: 1 },
  { providerCode: "PRV-T1-010", nameEn: "Almana General Hospital",            nameAr: "مستشفى المانع العام",                  city: "Al Khobar", region: "EST", type: "hospital",        specialty: "Multi-Specialty",  tier: 1 },
  { providerCode: "PRV-T1-011", nameEn: "Al Moosa Specialist Hospital",       nameAr: "مستشفى الموسى التخصصي",               city: "Al Ahsa", region: "EST", type: "specialist_hospital", specialty: "Multi-Specialty", tier: 1 },
  { providerCode: "PRV-T1-012", nameEn: "Saad Specialist Hospital",           nameAr: "مستشفى سعد التخصصي",                  city: "Al Khobar", region: "EST", type: "hospital",          specialty: "Specialist",      tier: 1 },
];

// ---------------------------------------------------------------------------
// 4. CASE_STUDY_1_PROVIDERS — Dental clinics in Riyadh
// ---------------------------------------------------------------------------

export const CASE_STUDY_1_PROVIDERS: SaudiProvider[] = [
  { providerCode: "PRV-CS1-001", nameEn: "Al Noor Dental Center",  nameAr: "مركز النور لطب الأسنان",     city: "Riyadh", region: "RIY", type: "dental_clinic", specialty: "Dentistry", tier: 2, riskScore: 94 },
  { providerCode: "PRV-CS1-002", nameEn: "Smile Plus Clinic",      nameAr: "عيادة سمايل بلس",            city: "Riyadh", region: "RIY", type: "dental_clinic", specialty: "Dentistry", tier: 2, riskScore: 91 },
  { providerCode: "PRV-CS1-003", nameEn: "Riyadh Dental Care",     nameAr: "رعاية الرياض لطب الأسنان",   city: "Riyadh", region: "RIY", type: "dental_clinic", specialty: "Dentistry", tier: 2, riskScore: 89 },
  { providerCode: "PRV-CS1-004", nameEn: "Pearl Dental Center",    nameAr: "مركز اللؤلؤة لطب الأسنان",   city: "Riyadh", region: "RIY", type: "dental_clinic", specialty: "Dentistry", tier: 2, riskScore: 87 },
];

// ---------------------------------------------------------------------------
// 5. CASE_STUDY_2_PROVIDERS — OB/GYN provider in Jeddah
// ---------------------------------------------------------------------------

export const CASE_STUDY_2_PROVIDERS: SaudiProvider[] = [
  { providerCode: "PRV-CS2-001", nameEn: "Al Hayat Women's Hospital", nameAr: "مستشفى الحياة للنساء", city: "Jeddah", region: "MAK", type: "specialist_hospital", specialty: "OB/GYN", tier: 2, riskScore: 79 },
];

// ---------------------------------------------------------------------------
// 6. CASE_STUDY_3_PROVIDERS — Multi-specialty in Eastern Province
// ---------------------------------------------------------------------------

export const CASE_STUDY_3_PROVIDERS: SaudiProvider[] = [
  { providerCode: "PRV-CS3-001", nameEn: "Eastern Province Medical Center", nameAr: "مركز المنطقة الشرقية الطبي", city: "Dammam", region: "EST", type: "multi_specialty", specialty: "Multi-Specialty", tier: 2, riskScore: 72 },
];

// ---------------------------------------------------------------------------
// 7. TIER2_PROVIDERS — 14 specialty clinics
// ---------------------------------------------------------------------------

export const TIER2_PROVIDERS: SaudiProvider[] = [
  { providerCode: "PRV-T2-001", nameEn: "Al Farabi Dental Center",           nameAr: "مركز الفارابي لطب الأسنان",         city: "Jeddah",     region: "MAK", type: "dental_clinic",      specialty: "Dentistry",       tier: 2 },
  { providerCode: "PRV-T2-002", nameEn: "Al Salama Hospital",                nameAr: "مستشفى السلامة",                    city: "Jeddah",     region: "MAK", type: "hospital",           specialty: "OB/GYN",          tier: 2 },
  { providerCode: "PRV-T2-003", nameEn: "Riyadh Care Hospital",              nameAr: "مستشفى رعاية الرياض",               city: "Riyadh",     region: "RIY", type: "hospital",           specialty: "Multi-Specialty",  tier: 2 },
  { providerCode: "PRV-T2-004", nameEn: "Al Sharq Orthopedic Center",        nameAr: "مركز الشرق لجراحة العظام",          city: "Dammam",     region: "EST", type: "orthopedic_clinic",  specialty: "Orthopedics",     tier: 2 },
  { providerCode: "PRV-T2-005", nameEn: "Magrabi Eye Hospital",              nameAr: "مستشفى مغربي للعيون",               city: "Jeddah",     region: "MAK", type: "ophthalmology_clinic", specialty: "Ophthalmology", tier: 2 },
  { providerCode: "PRV-T2-006", nameEn: "Al Amal Pharmacy Chain",            nameAr: "صيدليات الأمل",                     city: "Riyadh",     region: "RIY", type: "pharmacy",           specialty: "Pharmacy",        tier: 2 },
  { providerCode: "PRV-T2-007", nameEn: "Zahrat Al Rawdah Dental",           nameAr: "زهرة الروضة لطب الأسنان",           city: "Riyadh",     region: "RIY", type: "dental_clinic",      specialty: "Dentistry",       tier: 2 },
  { providerCode: "PRV-T2-008", nameEn: "Abha Private Hospital",             nameAr: "مستشفى أبها الأهلي",                city: "Abha",       region: "ASR", type: "hospital",           specialty: "Multi-Specialty",  tier: 2 },
  { providerCode: "PRV-T2-009", nameEn: "Al Baha Specialist Clinic",         nameAr: "عيادة الباحة التخصصية",             city: "Al Baha",    region: "BAH", type: "multi_specialty",    specialty: "Multi-Specialty",  tier: 2 },
  { providerCode: "PRV-T2-010", nameEn: "Najran General Clinic",             nameAr: "عيادة نجران العامة",                city: "Najran",     region: "NJR", type: "multi_specialty",    specialty: "Multi-Specialty",  tier: 2 },
  { providerCode: "PRV-T2-011", nameEn: "Tabuk Eye Center",                  nameAr: "مركز تبوك للعيون",                  city: "Tabuk",      region: "TBK", type: "ophthalmology_clinic", specialty: "Ophthalmology", tier: 2 },
  { providerCode: "PRV-T2-012", nameEn: "Madinah Women's Clinic",            nameAr: "عيادة المدينة للنساء",              city: "Madinah",    region: "MDN", type: "specialist_hospital", specialty: "OB/GYN",         tier: 2 },
  { providerCode: "PRV-T2-013", nameEn: "Hail Dental Polyclinic",            nameAr: "مجمع حائل لطب الأسنان",             city: "Hail",       region: "HAL", type: "dental_clinic",      specialty: "Dentistry",       tier: 2 },
  { providerCode: "PRV-T2-014", nameEn: "Jazan Orthopedic Center",           nameAr: "مركز جازان لجراحة العظام",          city: "Jazan",      region: "JZN", type: "orthopedic_clinic",  specialty: "Orthopedics",     tier: 2 },
];

// ---------------------------------------------------------------------------
// 8. TIER3_PROVIDERS — 19 small practices
// ---------------------------------------------------------------------------

export const TIER3_PROVIDERS: SaudiProvider[] = [
  { providerCode: "PRV-T3-001", nameEn: "Dr. Al-Otaibi Solo Clinic",      nameAr: "عيادة الدكتور العتيبي",              city: "Riyadh",        region: "RIY", type: "solo_clinic",    specialty: "General Practice",  tier: 3 },
  { providerCode: "PRV-T3-002", nameEn: "Shifa Pharmacy",                 nameAr: "صيدلية الشفاء",                      city: "Riyadh",        region: "RIY", type: "pharmacy",       specialty: "Pharmacy",          tier: 3 },
  { providerCode: "PRV-T3-003", nameEn: "Al Nuzha Family Clinic",         nameAr: "عيادة النزهة العائلية",              city: "Jeddah",        region: "MAK", type: "solo_clinic",    specialty: "Family Medicine",   tier: 3 },
  { providerCode: "PRV-T3-004", nameEn: "Green Crescent Pharmacy",        nameAr: "صيدلية الهلال الأخضر",               city: "Jeddah",        region: "MAK", type: "pharmacy",       specialty: "Pharmacy",          tier: 3 },
  { providerCode: "PRV-T3-005", nameEn: "Al Razi Home Health",            nameAr: "الرازي للرعاية المنزلية",            city: "Dammam",        region: "EST", type: "home_health",    specialty: "Home Health",       tier: 3 },
  { providerCode: "PRV-T3-006", nameEn: "Al Shifaa Solo Practice",        nameAr: "عيادة الشفاء الفردية",               city: "Dammam",        region: "EST", type: "solo_clinic",    specialty: "General Practice",  tier: 3 },
  { providerCode: "PRV-T3-007", nameEn: "Al Dawaa Pharmacy",              nameAr: "صيدلية الدواء",                      city: "Makkah",        region: "MAK", type: "pharmacy",       specialty: "Pharmacy",          tier: 3 },
  { providerCode: "PRV-T3-008", nameEn: "Dr. Al-Zahrani Clinic",          nameAr: "عيادة الدكتور الزهراني",             city: "Abha",          region: "ASR", type: "solo_clinic",    specialty: "General Practice",  tier: 3 },
  { providerCode: "PRV-T3-009", nameEn: "Buraidah Family Practice",       nameAr: "ممارسة بريدة العائلية",              city: "Buraidah",      region: "QSM", type: "solo_clinic",    specialty: "Family Medicine",   tier: 3 },
  { providerCode: "PRV-T3-010", nameEn: "Hayat Home Healthcare",          nameAr: "حياة للرعاية الصحية المنزلية",       city: "Riyadh",        region: "RIY", type: "home_health",    specialty: "Home Health",       tier: 3 },
  { providerCode: "PRV-T3-011", nameEn: "Al Mubarak Pharmacy",            nameAr: "صيدلية المبارك",                     city: "Madinah",       region: "MDN", type: "pharmacy",       specialty: "Pharmacy",          tier: 3 },
  { providerCode: "PRV-T3-012", nameEn: "Dr. Al-Harbi Clinic",            nameAr: "عيادة الدكتور الحربي",               city: "Tabuk",         region: "TBK", type: "solo_clinic",    specialty: "General Practice",  tier: 3 },
  { providerCode: "PRV-T3-013", nameEn: "Arar Medical Dispensary",        nameAr: "مستوصف عرعر الطبي",                  city: "Arar",          region: "NBR", type: "solo_clinic",    specialty: "General Practice",  tier: 3 },
  { providerCode: "PRV-T3-014", nameEn: "Sakaka Family Clinic",           nameAr: "عيادة سكاكا العائلية",               city: "Sakaka",        region: "JOF", type: "solo_clinic",    specialty: "Family Medicine",   tier: 3 },
  { providerCode: "PRV-T3-015", nameEn: "Jazan Community Pharmacy",       nameAr: "صيدلية جازان المجتمعية",             city: "Jazan",         region: "JZN", type: "pharmacy",       specialty: "Pharmacy",          tier: 3 },
  { providerCode: "PRV-T3-016", nameEn: "Najran Home Nursing",            nameAr: "نجران للتمريض المنزلي",              city: "Najran",        region: "NJR", type: "home_health",    specialty: "Home Health",       tier: 3 },
  { providerCode: "PRV-T3-017", nameEn: "Al Kharj Medical Dispensary",    nameAr: "مستوصف الخرج الطبي",                 city: "Al Kharj",      region: "RIY", type: "solo_clinic",    specialty: "General Practice",  tier: 3 },
  { providerCode: "PRV-T3-018", nameEn: "Yanbu Community Pharmacy",       nameAr: "صيدلية ينبع المجتمعية",              city: "Yanbu",         region: "MDN", type: "pharmacy",       specialty: "Pharmacy",          tier: 3 },
  { providerCode: "PRV-T3-019", nameEn: "Khamis Mushait Family Clinic",   nameAr: "عيادة خميس مشيط العائلية",           city: "Khamis Mushait", region: "ASR", type: "solo_clinic",   specialty: "Family Medicine",   tier: 3 },
];

// ---------------------------------------------------------------------------
// Aggregate all providers for convenience
// ---------------------------------------------------------------------------

export const ALL_PROVIDERS: SaudiProvider[] = [
  ...TIER1_PROVIDERS,
  ...CASE_STUDY_1_PROVIDERS,
  ...CASE_STUDY_2_PROVIDERS,
  ...CASE_STUDY_3_PROVIDERS,
  ...TIER2_PROVIDERS,
  ...TIER3_PROVIDERS,
];

// ---------------------------------------------------------------------------
// 9. SAUDI_INSURERS — 10 major insurers
// ---------------------------------------------------------------------------

export interface SaudiInsurer {
  id: string;
  nameEn: string;
  nameAr: string;
  marketShare: number;
  segment: string;
}

export const SAUDI_INSURERS: SaudiInsurer[] = [
  { id: "INS-001", nameEn: "Bupa Arabia",            nameAr: "بوبا العربية",           marketShare: 0.24,  segment: "premium" },
  { id: "INS-002", nameEn: "Tawuniya",               nameAr: "التعاونية",              marketShare: 0.20,  segment: "comprehensive" },
  { id: "INS-003", nameEn: "Medgulf",                nameAr: "ميدغلف",                 marketShare: 0.12,  segment: "mid-market" },
  { id: "INS-004", nameEn: "GIG Saudi (AXA)",        nameAr: "جي آي جي السعودية (أكسا)", marketShare: 0.10, segment: "comprehensive" },
  { id: "INS-005", nameEn: "Gulf Union",             nameAr: "الاتحاد الخليجي",         marketShare: 0.08,  segment: "mid-market" },
  { id: "INS-006", nameEn: "Walaa",                  nameAr: "ولاء",                   marketShare: 0.07,  segment: "cooperative" },
  { id: "INS-007", nameEn: "Arabian Shield",         nameAr: "الدرع العربية",           marketShare: 0.06,  segment: "cooperative" },
  { id: "INS-008", nameEn: "ACIG",                   nameAr: "أسيج",                   marketShare: 0.05,  segment: "cooperative" },
  { id: "INS-009", nameEn: "Malath Insurance",       nameAr: "ملاذ للتأمين",            marketShare: 0.05,  segment: "cooperative" },
  { id: "INS-010", nameEn: "Al Rajhi Takaful",       nameAr: "الراجحي تكافل",           marketShare: 0.03,  segment: "takaful" },
];

// ---------------------------------------------------------------------------
// 10. SAUDI_MALE_FIRST_NAMES — 24 names
// ---------------------------------------------------------------------------

export const SAUDI_MALE_FIRST_NAMES: string[] = [
  "Mohammed", "Abdullah", "Abdulrahman", "Faisal", "Khalid",
  "Sultan", "Nasser", "Fahad", "Omar", "Turki",
  "Bandar", "Saud", "Mansour", "Yousef", "Ibrahim",
  "Ahmed", "Ali", "Majed", "Saad", "Waleed",
  "Hamad", "Nawaf", "Meshal", "Badr",
];

// ---------------------------------------------------------------------------
// 11. SAUDI_FEMALE_FIRST_NAMES — 18 names
// ---------------------------------------------------------------------------

export const SAUDI_FEMALE_FIRST_NAMES: string[] = [
  "Noura", "Sara", "Fatima", "Maha", "Haya",
  "Lama", "Reem", "Alanoud", "Abeer", "Dalal",
  "Haifa", "Mona", "Amira", "Latifa", "Nora",
  "Shahad", "Ghada", "Wafa",
];

// ---------------------------------------------------------------------------
// 12. SAUDI_FAMILY_NAMES — 20 family names
// ---------------------------------------------------------------------------

export const SAUDI_FAMILY_NAMES: string[] = [
  "Al-Rashidi", "Al-Dosari", "Al-Otaibi", "Al-Harbi", "Al-Zahrani",
  "Al-Ghamdi", "Al-Shehri", "Al-Malki", "Al-Qahtani", "Al-Subaie",
  "Al-Mutairi", "Al-Anazi", "Al-Shammari", "Al-Tamimi", "Al-Juhani",
  "Al-Thubaiti", "Al-Yami", "Al-Dossary", "Al-Khaldi", "Al-Salem",
];

// ---------------------------------------------------------------------------
// 13. EXPAT_NAMES — 9 expat names with nationality
// ---------------------------------------------------------------------------

export interface ExpatName {
  firstName: string;
  lastName: string;
  nationality: string;
}

export const EXPAT_NAMES: ExpatName[] = [
  { firstName: "Rajesh",    lastName: "Kumar",       nationality: "Indian" },
  { firstName: "Priya",     lastName: "Sharma",      nationality: "Indian" },
  { firstName: "Muhammad",  lastName: "Iqbal",       nationality: "Pakistani" },
  { firstName: "Aisha",     lastName: "Khan",        nationality: "Pakistani" },
  { firstName: "Jose",      lastName: "Dela Cruz",   nationality: "Filipino" },
  { firstName: "Maria",     lastName: "Santos",      nationality: "Filipino" },
  { firstName: "Ahmed",     lastName: "Hassan",      nationality: "Egyptian" },
  { firstName: "Fatma",     lastName: "El-Sayed",    nationality: "Egyptian" },
  { firstName: "Rahman",    lastName: "Hossain",     nationality: "Bangladeshi" },
];

// ---------------------------------------------------------------------------
// 14. CHI_KPI_BASELINES — Key performance indicators
// ---------------------------------------------------------------------------

export const CHI_KPI_BASELINES = {
  totalBeneficiaries:       11_500_000,
  annualClaimsVolume:       180_000_000,
  rejectionRate:            0.15,
  detectedFraudCasesPerYear: 200,
  adminCostRatio:           0.187,
  activeLicensedInsurers:   25,
  sbsV3ComplianceRate:      0.62,
  arDrgPilotHospitals:      12,
  avgClaimProcessingDays:   4.2,
  activeEnforcementCases:   47,
} as const;

// ---------------------------------------------------------------------------
// 15. BILINGUAL_LABELS — en/ar label pairs for UI
// ---------------------------------------------------------------------------

export const BILINGUAL_LABELS = {
  commandCenter:       { en: "Command Center",        ar: "مركز القيادة" },
  highRiskEntities:    { en: "High-Risk Entities",     ar: "الكيانات عالية المخاطر" },
  flaggedClaims:       { en: "Flagged Claims",         ar: "المطالبات المُبلَّغ عنها" },
  enforcement:         { en: "Enforcement",            ar: "الإنفاذ" },
  totalBeneficiaries:  { en: "Total Beneficiaries",    ar: "إجمالي المستفيدين" },
  rejectionRate:       { en: "Rejection Rate",         ar: "نسبة الرفض" },
  fraudDetected:       { en: "Fraud Detected",         ar: "احتيال مكتشف" },
  totalExposure:       { en: "Total Exposure",         ar: "إجمالي التعرض" },
  riskScore:           { en: "Risk Score",             ar: "درجة المخاطر" },
  underInvestigation:  { en: "Under Investigation",    ar: "قيد التحقيق" },
  activeCases:         { en: "Active Cases",           ar: "الحالات النشطة" },
  pendingReview:       { en: "Pending Review",         ar: "بانتظار المراجعة" },
  nationalOverview:    { en: "National Overview",      ar: "النظرة الوطنية الشاملة" },
  claimsProcessed:     { en: "Claims Processed",       ar: "المطالبات المعالجة" },
  providerCompliance:  { en: "Provider Compliance",    ar: "امتثال مقدمي الخدمة" },
  fwaAlerts:           { en: "FWA Alerts",             ar: "تنبيهات الاحتيال والهدر" },
  codingIntelligence:  { en: "Coding Intelligence",    ar: "ذكاء الترميز الطبي" },
  onlineListening:     { en: "Online Listening",        ar: "الرصد الإلكتروني" },
} as const;

// ---------------------------------------------------------------------------
// 16. FRAUD_PATTERN_TYPES — 7 fraud patterns
// ---------------------------------------------------------------------------

export const FRAUD_PATTERN_TYPES = [
  { code: "PHANTOM",           labelEn: "Phantom Billing",              labelAr: "فوترة وهمية",                color: "#DC2626" },
  { code: "UPCODING",          labelEn: "Upcoding",                    labelAr: "ترميز مبالغ فيه",             color: "#EA580C" },
  { code: "DUPLICATE_XINSURER", labelEn: "Cross-Insurer Duplicate",    labelAr: "تكرار عبر شركات التأمين",     color: "#D97706" },
  { code: "UNBUNDLING",        labelEn: "Unbundling",                   labelAr: "تفكيك الخدمات",              color: "#CA8A04" },
  { code: "REFERRAL_CHURN",    labelEn: "Referral Churning",            labelAr: "تدوير الإحالات",             color: "#9333EA" },
  { code: "IMPOSSIBLE_SEQ",    labelEn: "Impossible Service Sequence",  labelAr: "تسلسل خدمات مستحيل",         color: "#2563EB" },
  { code: "UNNECESSARY_ADM",   labelEn: "Unnecessary Admission",        labelAr: "تنويم غير ضروري",            color: "#0891B2" },
] as const;

export type FraudPatternCode = (typeof FRAUD_PATTERN_TYPES)[number]["code"];

// ---------------------------------------------------------------------------
// 17. COMMON_ICD10AM_CODES — 12 diagnosis codes
// ---------------------------------------------------------------------------

export interface ICD10AMCode {
  code: string;
  descriptionEn: string;
  descriptionAr: string;
  category: string;
}

export const COMMON_ICD10AM_CODES: ICD10AMCode[] = [
  { code: "K04.7", descriptionEn: "Periapical abscess without sinus",       descriptionAr: "خُراج حول الذروة بدون ناسور",     category: "dental" },
  { code: "K02.1", descriptionEn: "Dental caries of dentine",               descriptionAr: "تسوس عاج الأسنان",                category: "dental" },
  { code: "K08.1", descriptionEn: "Loss of teeth due to accident or extraction", descriptionAr: "فقدان الأسنان بسبب حادث أو قلع", category: "dental" },
  { code: "O80",   descriptionEn: "Single spontaneous delivery",            descriptionAr: "ولادة عفوية مفردة",               category: "obstetrics" },
  { code: "O82",   descriptionEn: "Encounter for cesarean delivery",        descriptionAr: "ولادة قيصرية",                    category: "obstetrics" },
  { code: "O47.0", descriptionEn: "False labour before 37 weeks",           descriptionAr: "مخاض كاذب قبل 37 أسبوعًا",        category: "obstetrics" },
  { code: "Z34.0", descriptionEn: "Supervision of normal first pregnancy",  descriptionAr: "متابعة الحمل الأول الطبيعي",      category: "obstetrics" },
  { code: "J06.9", descriptionEn: "Acute upper respiratory infection",      descriptionAr: "عدوى حادة في الجهاز التنفسي العلوي", category: "respiratory" },
  { code: "M54.5", descriptionEn: "Low back pain",                          descriptionAr: "ألم أسفل الظهر",                   category: "musculoskeletal" },
  { code: "E11.9", descriptionEn: "Type 2 diabetes mellitus without complications", descriptionAr: "داء السكري من النوع الثاني بدون مضاعفات", category: "endocrine" },
  { code: "I10",   descriptionEn: "Essential (primary) hypertension",       descriptionAr: "ارتفاع ضغط الدم الأساسي",          category: "cardiovascular" },
  { code: "Z23",   descriptionEn: "Encounter for immunization",             descriptionAr: "زيارة للتطعيم",                    category: "preventive" },
];

// ---------------------------------------------------------------------------
// 18. formatSAR — Currency formatter
// ---------------------------------------------------------------------------

export function formatSAR(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
