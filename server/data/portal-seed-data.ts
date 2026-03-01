/**
 * Portal Seed Data Constants
 * Raw data arrays for the Daman Pillars Persona Portals seed script.
 */

// ── Insurers (6 major) ─────────────────────────────────────────
export const PORTAL_INSURERS = [
  { code: "INS-001", name: "Bupa Arabia", nameAr: "بوبا العربية", licenseNo: "CCHI-INS-001", marketShare: "22.4", lossRatio: "78.2", capitalAdequacy: "185.0", healthStatus: "healthy", premiumVolumeSar: "8200000000.00" },
  { code: "INS-002", name: "Tawuniya", nameAr: "التعاونية", licenseNo: "CCHI-INS-002", marketShare: "19.4", lossRatio: "82.1", capitalAdequacy: "172.0", healthStatus: "healthy", premiumVolumeSar: "7100000000.00" },
  { code: "INS-003", name: "MedGulf", nameAr: "ميدغلف", licenseNo: "CCHI-INS-003", marketShare: "12.8", lossRatio: "85.4", capitalAdequacy: "148.0", healthStatus: "watch", premiumVolumeSar: "4700000000.00" },
  { code: "INS-004", name: "Al Rajhi Takaful", nameAr: "تكافل الراجحي", licenseNo: "CCHI-INS-004", marketShare: "8.6", lossRatio: "76.5", capitalAdequacy: "192.0", healthStatus: "healthy", premiumVolumeSar: "3150000000.00" },
  { code: "INS-005", name: "SAICO", nameAr: "سايكو", licenseNo: "CCHI-INS-005", marketShare: "5.4", lossRatio: "89.2", capitalAdequacy: "128.0", healthStatus: "at_risk", premiumVolumeSar: "1980000000.00" },
  { code: "INS-006", name: "Walaa Insurance", nameAr: "ولاء للتأمين", licenseNo: "CCHI-INS-006", marketShare: "4.2", lossRatio: "70.8", capitalAdequacy: "210.0", healthStatus: "healthy", premiumVolumeSar: "1540000000.00" },
] as const;

// ── Regions (13) ────────────────────────────────────────────────
export const PORTAL_REGIONS = [
  { code: "RIY", name: "Riyadh", nameAr: "الرياض", population: 8600000, insuredCount: 7740000, providerCount: 12, coverageRate: "90.0" },
  { code: "MAK", name: "Makkah", nameAr: "مكة المكرمة", population: 9000000, insuredCount: 7650000, providerCount: 8, coverageRate: "85.0" },
  { code: "EST", name: "Eastern Province", nameAr: "المنطقة الشرقية", population: 5100000, insuredCount: 4590000, providerCount: 6, coverageRate: "90.0" },
  { code: "ASR", name: "Asir", nameAr: "عسير", population: 2300000, insuredCount: 1725000, providerCount: 3, coverageRate: "75.0" },
  { code: "MDN", name: "Madinah", nameAr: "المدينة المنورة", population: 2200000, insuredCount: 1848000, providerCount: 4, coverageRate: "84.0" },
  { code: "QSM", name: "Qassim", nameAr: "القصيم", population: 1500000, insuredCount: 1200000, providerCount: 2, coverageRate: "80.0" },
  { code: "TBK", name: "Tabuk", nameAr: "تبوك", population: 950000, insuredCount: 712500, providerCount: 2, coverageRate: "75.0" },
  { code: "HAL", name: "Hail", nameAr: "حائل", population: 750000, insuredCount: 562500, providerCount: 2, coverageRate: "75.0" },
  { code: "JZN", name: "Jazan", nameAr: "جازان", population: 1700000, insuredCount: 1190000, providerCount: 2, coverageRate: "70.0" },
  { code: "NJR", name: "Najran", nameAr: "نجران", population: 600000, insuredCount: 420000, providerCount: 1, coverageRate: "70.0" },
  { code: "BAH", name: "Al Baha", nameAr: "الباحة", population: 500000, insuredCount: 350000, providerCount: 1, coverageRate: "70.0" },
  { code: "JOF", name: "Al Jouf", nameAr: "الجوف", population: 530000, insuredCount: 371000, providerCount: 1, coverageRate: "70.0" },
  { code: "NBR", name: "Northern Borders", nameAr: "الحدود الشمالية", population: 400000, insuredCount: 280000, providerCount: 1, coverageRate: "70.0" },
] as const;

// ── Providers (52) ──────────────────────────────────────────────
// [code, name, nameAr, licenseNo, region, city, type, bedCount, specialties[], rating, reviewCount, avgWait, languages[]]
type ProviderTuple = [string, string, string, string, string, string, string, number | null, string[], string, number, number, string[]];

const L_AEU = ["Arabic", "English", "Urdu"];
const L_AE = ["Arabic", "English"];
const L_AEUF = ["Arabic", "English", "Urdu", "Filipino"];

export const PROVIDER_TUPLES: ProviderTuple[] = [
  // ── Riyadh (12) ──
  ["PRV-001", "Riyadh Care Hospital", "مستشفى رعاية الرياض", "MOH-RC-001", "RIY", "Riyadh", "tertiary_hospital", 450, ["Internal Medicine","Cardiology","Oncology","Orthopedics","Pediatrics","Obstetrics"], "4.6", 342, 18, L_AEU],
  ["PRV-002", "King Fahd Medical City", "مدينة الملك فهد الطبية", "MOH-KF-002", "RIY", "Riyadh", "tertiary_hospital", 1200, ["All Specialties"], "4.8", 1205, 15, L_AE],
  ["PRV-003", "King Saud Medical City", "مدينة الملك سعود الطبية", "MOH-KS-003", "RIY", "Riyadh", "tertiary_hospital", 1100, ["All Specialties"], "4.5", 890, 22, L_AE],
  ["PRV-004", "Dr. Sulaiman Al Habib Hospital", "مستشفى الدكتور سليمان الحبيب", "MOH-SH-004", "RIY", "Riyadh", "tertiary_hospital", 400, ["Cardiology","Neurology","Orthopedics","Oncology","IVF"], "4.7", 678, 20, L_AEU],
  ["PRV-005", "Al Noor Specialist Hospital Riyadh", "مستشفى النور التخصصي", "MOH-NS-005", "RIY", "Riyadh", "specialist_clinic", 180, ["Ophthalmology","Dermatology","ENT"], "4.2", 234, 25, L_AEU],
  ["PRV-006", "Riyadh National Hospital", "المستشفى الوطني بالرياض", "MOH-RN-006", "RIY", "Riyadh", "secondary_hospital", 280, ["Internal Medicine","Surgery","Pediatrics","Obstetrics"], "4.0", 456, 28, L_AEU],
  ["PRV-007", "Al Hammadi Hospital", "مستشفى الحمادي", "MOH-HM-007", "RIY", "Riyadh", "secondary_hospital", 200, ["Internal Medicine","Orthopedics","ENT","Dental"], "3.9", 312, 30, L_AEU],
  ["PRV-008", "Kingdom Hospital Riyadh", "مستشفى المملكة بالرياض", "MOH-KH-008", "RIY", "Riyadh", "secondary_hospital", 220, ["General Surgery","Orthopedics","Urology","Dermatology"], "4.1", 267, 22, L_AE],
  ["PRV-009", "Al Iman General Hospital", "مستشفى الإيمان العام", "MOH-IG-009", "RIY", "Riyadh", "secondary_hospital", 300, ["Internal Medicine","Surgery","Pediatrics","Emergency"], "3.8", 189, 35, L_AEU],
  ["PRV-010", "Dallah Hospital", "مستشفى دلة", "MOH-DL-010", "RIY", "Riyadh", "tertiary_hospital", 350, ["Cardiology","Orthopedics","Neurology","Oncology"], "4.4", 523, 20, L_AE],
  ["PRV-011", "Al Kharj General Hospital", "مستشفى الخرج العام", "MOH-KJ-011", "RIY", "Al Kharj", "primary_care_center", 80, ["General Practice","Emergency","Obstetrics"], "3.5", 98, 40, L_AEU],
  ["PRV-012", "Al Dawadmi Hospital", "مستشفى الدوادمي", "MOH-DW-012", "RIY", "Al Dawadmi", "primary_care_center", 60, ["General Practice","Emergency"], "3.3", 67, 45, L_AEU],
  // ── Makkah / Jeddah (8) ──
  ["PRV-013", "King Abdulaziz University Hospital", "مستشفى جامعة الملك عبدالعزيز", "MOH-KA-013", "MAK", "Jeddah", "tertiary_hospital", 800, ["All Specialties"], "4.7", 945, 18, L_AE],
  ["PRV-014", "Saudi German Hospital Jeddah", "المستشفى السعودي الألماني", "MOH-SG-014", "MAK", "Jeddah", "tertiary_hospital", 300, ["Cardiology","Neurology","Orthopedics","Obstetrics"], "4.3", 567, 22, L_AEU],
  ["PRV-015", "Jeddah National Medical Center", "المركز الوطني الطبي بجدة", "MOH-JN-015", "MAK", "Jeddah", "secondary_hospital", 250, ["Internal Medicine","Surgery","Pediatrics","Dermatology"], "3.9", 345, 28, L_AEU],
  ["PRV-016", "Dr. Bakhsh Hospital", "مستشفى الدكتور باخشب", "MOH-BK-016", "MAK", "Jeddah", "secondary_hospital", 150, ["Internal Medicine","Surgery","Obstetrics"], "3.7", 234, 32, L_AEUF],
  ["PRV-017", "Al Jedaani Hospital", "مستشفى الجدعاني", "MOH-JD-017", "MAK", "Jeddah", "secondary_hospital", 180, ["Internal Medicine","Pediatrics","Dermatology","ENT"], "4.0", 298, 25, L_AEU],
  ["PRV-018", "Makkah Eye Specialist Hospital", "مستشفى مكة التخصصي للعيون", "MOH-ME-018", "MAK", "Makkah", "specialist_clinic", 50, ["Ophthalmology"], "4.4", 189, 20, L_AE],
  ["PRV-019", "King Faisal Hospital Makkah", "مستشفى الملك فيصل بمكة", "MOH-FM-019", "MAK", "Makkah", "secondary_hospital", 300, ["Internal Medicine","Surgery","Emergency","Pediatrics"], "4.1", 412, 30, L_AE],
  ["PRV-020", "King Faisal Hospital Taif", "مستشفى الملك فيصل بالطائف", "MOH-FT-020", "MAK", "Taif", "secondary_hospital", 200, ["Internal Medicine","Surgery","Pediatrics","Obstetrics"], "3.8", 178, 35, L_AE],
  // ── Eastern Province (6) ──
  ["PRV-021", "Dammam Medical Complex", "مجمع الدمام الطبي", "MOH-DM-021", "EST", "Dammam", "tertiary_hospital", 600, ["All Specialties"], "4.3", 678, 20, L_AEU],
  ["PRV-022", "Al Mouwasat Hospital Dammam", "مستشفى المواساة بالدمام", "MOH-MW-022", "EST", "Dammam", "secondary_hospital", 250, ["Internal Medicine","Cardiology","Orthopedics","Obstetrics"], "4.2", 456, 22, L_AEU],
  ["PRV-023", "Saad Specialist Hospital", "مستشفى سعد التخصصي", "MOH-SS-023", "EST", "Al Khobar", "specialist_clinic", 200, ["Oncology","Cardiology","Neurology"], "4.5", 534, 18, L_AE],
  ["PRV-024", "Al Khobar General Hospital", "مستشفى الخبر العام", "MOH-KG-024", "EST", "Al Khobar", "secondary_hospital", 180, ["Internal Medicine","Surgery","Pediatrics"], "3.9", 234, 28, L_AEU],
  ["PRV-025", "Dhahran Health Center", "مركز الظهران الصحي", "MOH-DH-025", "EST", "Dhahran", "primary_care_center", 60, ["General Practice","Emergency","Dental"], "4.0", 156, 25, L_AE],
  ["PRV-026", "Johns Hopkins Aramco Healthcare", "جونز هوبكنز أرامكو الصحية", "MOH-JH-026", "EST", "Dhahran", "tertiary_hospital", 350, ["All Specialties"], "4.6", 789, 15, L_AE],
  // ── Madinah (4) ──
  ["PRV-027", "King Fahd Hospital Madinah", "مستشفى الملك فهد بالمدينة", "MOH-FM-027", "MDN", "Madinah", "tertiary_hospital", 500, ["All Specialties"], "4.2", 567, 22, L_AE],
  ["PRV-028", "Madinah General Hospital", "مستشفى المدينة العام", "MOH-MG-028", "MDN", "Madinah", "secondary_hospital", 200, ["Internal Medicine","Surgery","Pediatrics"], "3.8", 234, 30, L_AEU],
  ["PRV-029", "Uhud Hospital", "مستشفى أحد", "MOH-UH-029", "MDN", "Madinah", "secondary_hospital", 180, ["Internal Medicine","Obstetrics","Emergency"], "3.7", 189, 32, L_AEU],
  ["PRV-030", "Madinah National Hospital", "المستشفى الوطني بالمدينة", "MOH-MN-030", "MDN", "Madinah", "secondary_hospital", 150, ["General Surgery","Orthopedics","Dental"], "3.9", 145, 28, L_AE],
  // ── Asir (3) ──
  ["PRV-031", "Asir Central Hospital", "مستشفى عسير المركزي", "MOH-AC-031", "ASR", "Abha", "tertiary_hospital", 450, ["All Specialties"], "4.1", 456, 25, L_AE],
  ["PRV-032", "Abha Private Hospital", "مستشفى أبها الخاص", "MOH-AP-032", "ASR", "Abha", "secondary_hospital", 150, ["Internal Medicine","Surgery","Pediatrics"], "3.8", 198, 30, L_AEU],
  ["PRV-033", "Khamis Mushait General Hospital", "مستشفى خميس مشيط العام", "MOH-KM-033", "ASR", "Khamis Mushait", "secondary_hospital", 200, ["Internal Medicine","Surgery","Emergency","Obstetrics"], "3.6", 167, 35, L_AEU],
  // ── Qassim (2) ──
  ["PRV-034", "Qassim University Medical City", "مدينة القصيم الطبية الجامعية", "MOH-QU-034", "QSM", "Buraydah", "tertiary_hospital", 400, ["All Specialties"], "4.0", 345, 25, L_AE],
  ["PRV-035", "Buraydah Central Hospital", "مستشفى بريدة المركزي", "MOH-BC-035", "QSM", "Buraydah", "secondary_hospital", 200, ["Internal Medicine","Surgery","Pediatrics"], "3.7", 198, 30, L_AEU],
  // ── Tabuk (2) ──
  ["PRV-036", "King Salman Armed Forces Hospital Tabuk", "مستشفى الملك سلمان للقوات المسلحة بتبوك", "MOH-KS-036", "TBK", "Tabuk", "tertiary_hospital", 300, ["Internal Medicine","Surgery","Pediatrics","Orthopedics"], "4.0", 267, 28, L_AE],
  ["PRV-048", "Tabuk Care Center", "مركز تبوك للرعاية", "MOH-TC-048", "TBK", "Tabuk", "primary_care_center", 50, ["General Practice","Emergency"], "3.1", 78, 55, L_AEU],
  // ── Hail (2) ──
  ["PRV-037", "Hail General Hospital", "مستشفى حائل العام", "MOH-HG-037", "HAL", "Hail", "secondary_hospital", 250, ["Internal Medicine","Surgery","Pediatrics","Emergency"], "3.8", 198, 32, L_AE],
  ["PRV-038", "King Khalid Hospital Hail", "مستشفى الملك خالد بحائل", "MOH-KK-038", "HAL", "Hail", "secondary_hospital", 200, ["Internal Medicine","Orthopedics","Obstetrics"], "3.7", 156, 35, L_AE],
  // ── Jazan (2) ──
  ["PRV-039", "King Fahd Central Hospital Jazan", "مستشفى الملك فهد المركزي بجازان", "MOH-FJ-039", "JZN", "Jazan", "tertiary_hospital", 350, ["All Specialties"], "3.9", 289, 28, L_AE],
  ["PRV-040", "Abu Arish General Hospital", "مستشفى أبو عريش العام", "MOH-AA-040", "JZN", "Abu Arish", "primary_care_center", 80, ["General Practice","Emergency","Obstetrics"], "3.4", 89, 40, L_AEU],
  // ── Najran (1) ──
  ["PRV-041", "King Khalid Hospital Najran", "مستشفى الملك خالد بنجران", "MOH-KN-041", "NJR", "Najran", "secondary_hospital", 200, ["Internal Medicine","Surgery","Pediatrics","Emergency"], "3.7", 167, 32, L_AE],
  // ── Al Baha (1) ──
  ["PRV-042", "King Fahd Hospital Al Baha", "مستشفى الملك فهد بالباحة", "MOH-FB-042", "BAH", "Al Baha", "secondary_hospital", 180, ["Internal Medicine","Surgery","Pediatrics"], "3.6", 134, 38, L_AE],
  // ── Al Jouf (1) ──
  ["PRV-043", "Prince Abdul Mohsin Hospital", "مستشفى الأمير عبدالمحسن", "MOH-AM-043", "JOF", "Sakaka", "secondary_hospital", 200, ["Internal Medicine","Surgery","Emergency","Obstetrics"], "3.7", 145, 35, L_AE],
  // ── Northern Borders (1) ──
  ["PRV-044", "Arar Central Hospital", "مستشفى عرعر المركزي", "MOH-AR-044", "NBR", "Arar", "secondary_hospital", 180, ["Internal Medicine","Surgery","Pediatrics","Emergency"], "3.5", 112, 40, L_AE],
  // ── Additional specialty / dental / rehab to reach 52 ──
  ["PRV-045", "Saudi German Hospital Riyadh", "المستشفى السعودي الألماني بالرياض", "MOH-SR-045", "RIY", "Riyadh", "tertiary_hospital", 300, ["Cardiology","Neurology","Orthopedics","Gastroenterology"], "4.3", 489, 20, L_AE],
  ["PRV-046", "Al Moosa Specialist Hospital", "مستشفى الموسى التخصصي", "MOH-MS-046", "EST", "Al Ahsa", "specialist_clinic", 200, ["Oncology","Nephrology","Cardiology"], "4.4", 378, 22, L_AEU],
  ["PRV-047", "Dental Care Center Jeddah", "مركز رعاية الأسنان بجدة", "MOH-DC-047", "MAK", "Jeddah", "dental_clinic", null, ["Dental","Orthodontics","Oral Surgery"], "4.2", 267, 15, L_AEUF],
  ["PRV-049", "Riyadh Rehabilitation Center", "مركز الرياض للتأهيل", "MOH-RR-049", "RIY", "Riyadh", "rehabilitation_center", 80, ["Physical Therapy","Occupational Therapy","Speech Therapy"], "4.1", 189, 20, L_AEU],
  ["PRV-050", "Al Hayat National Hospital", "مستشفى الحياة الوطني", "MOH-HN-050", "RIY", "Riyadh", "secondary_hospital", 200, ["Internal Medicine","Dermatology","ENT","Urology"], "4.0", 234, 25, L_AEU],
  ["PRV-051", "Jeddah Polyclinic", "مجمع عيادات جدة", "MOH-JP-051", "MAK", "Jeddah", "polyclinic", null, ["General Practice","Dermatology","Dental","Pediatrics"], "3.8", 345, 20, L_AEUF],
  ["PRV-052", "Eastern Medical Tower", "البرج الطبي الشرقي", "MOH-EM-052", "EST", "Dammam", "medical_tower", null, ["Internal Medicine","Cardiology","Gastroenterology","Endocrinology"], "4.1", 267, 18, L_AEU],
];

// All providers accept all 6 major insurers by default
export const ALL_INSURER_CODES = PORTAL_INSURERS.map(i => i.code);

// ── Provider Trajectories (for scorecards) ──────────────────────
// Maps provider code → base scores and trajectory
export interface ProviderTrajectory {
  overallBase: number; overallDelta: number;
  codingBase: number; codingDelta: number;
  rejectionBase: number; rejectionDelta: number; // positive delta = rejection DECREASING (improving)
  sbsBase: number; sbsDelta: number;
  drgBase: number; drgDelta: number;
  docBase: number; docDelta: number;
  fwaRisk: number;
  peerRank: number;
  trend: string;
}

const TOP: ProviderTrajectory = { overallBase: 88, overallDelta: 0.8, codingBase: 90, codingDelta: 0.5, rejectionBase: 10, rejectionDelta: 0.3, sbsBase: 82, sbsDelta: 1.2, drgBase: 72, drgDelta: 1.5, docBase: 84, docDelta: 0.6, fwaRisk: 8, peerRank: 88, trend: "improving" };
const MID: ProviderTrajectory = { overallBase: 70, overallDelta: 0.3, codingBase: 72, codingDelta: 0.2, rejectionBase: 15, rejectionDelta: 0.1, sbsBase: 60, sbsDelta: 0.8, drgBase: 48, drgDelta: 0.6, docBase: 65, docDelta: 0.3, fwaRisk: 18, peerRank: 52, trend: "stable" };
const LOW: ProviderTrajectory = { overallBase: 58, overallDelta: -0.5, codingBase: 55, codingDelta: -0.3, rejectionBase: 22, rejectionDelta: -0.2, sbsBase: 42, sbsDelta: 0.4, drgBase: 25, drgDelta: 0.2, docBase: 52, docDelta: -0.2, fwaRisk: 28, peerRank: 18, trend: "declining" };

// Top performers, mid-tier, and struggling providers
const TOP_PROVIDERS = ["PRV-001", "PRV-002", "PRV-003", "PRV-004", "PRV-010", "PRV-013", "PRV-023", "PRV-026", "PRV-031", "PRV-034"];
const LOW_PROVIDERS = ["PRV-048", "PRV-012", "PRV-040", "PRV-044", "PRV-011"];

export function getTrajectory(code: string): ProviderTrajectory {
  if (TOP_PROVIDERS.includes(code)) return { ...TOP, overallBase: TOP.overallBase + hash(code) % 5 };
  if (LOW_PROVIDERS.includes(code)) return { ...LOW, overallBase: LOW.overallBase + hash(code) % 5 };
  return { ...MID, overallBase: MID.overallBase + hash(code) % 8 };
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ── DRG Criteria ────────────────────────────────────────────────
export const DRG_CRITERIA = [
  { name: "Clinical Coder Certification", description: "All clinical coders hold ACHI/ICD-10-AM certification", peerRate: "72" },
  { name: "ICD-10-AM V12 Adoption", description: "Facility uses ICD-10-AM Version 12 for all coding", peerRate: "85" },
  { name: "ACHI Procedure Coding", description: "All procedures coded using Australian Classification of Health Interventions", peerRate: "78" },
  { name: "Grouper Software Installed", description: "AR-DRG grouper software installed and tested", peerRate: "67" },
  { name: "DRG-Based Costing Model", description: "Activity-based costing aligned with DRG weights", peerRate: "45" },
  { name: "Clinical Documentation Standards", description: "Standardized clinical documentation templates in use", peerRate: "82" },
  { name: "Unbundling Compliance", description: "Claims review for unbundled or fragmented billing", peerRate: "38" },
  { name: "Staff Training Program", description: "Ongoing DRG training for clinical and coding staff", peerRate: "71" },
];

// ── Rejection Data ──────────────────────────────────────────────
export const DENIAL_CATEGORIES = [
  { category: "missing_documentation", weight: 34, reasons: ["Clinical notes not attached to claim", "Imaging report missing from submission", "Lab results not provided", "Referral letter absent"], recommendation: "Ensure all supporting documents are attached before claim submission. Consider implementing a pre-submission checklist." },
  { category: "code_mismatch", weight: 28, reasons: ["ICD code does not match billed procedure", "Unbundled procedure codes detected", "Incorrect modifier usage", "Gender-specific code mismatch"], recommendation: "Review ICD-10-AM coding guidelines for this procedure. The primary diagnosis must support the billed procedure." },
  { category: "medical_necessity", weight: 21, reasons: ["Insufficient clinical justification provided", "Alternative treatment available at lower cost", "Service frequency exceeds clinical guidelines", "Duplicate service within 30 days"], recommendation: "Include detailed clinical notes explaining why this specific treatment was chosen over alternatives." },
  { category: "preauth_expired", weight: 17, reasons: ["Pre-authorization expired before service date", "Service date outside approved window", "Pre-auth number invalid or revoked", "Exceeded approved quantity limits"], recommendation: "Set calendar reminders for pre-authorization expiry dates. Re-submit pre-auth if service is delayed beyond 30 days." },
];

export const ICD_CODES = [
  { code: "J18.9", desc: "Pneumonia, unspecified organism" },
  { code: "E11.9", desc: "Type 2 diabetes mellitus without complications" },
  { code: "K80.2", desc: "Calculus of gallbladder without cholecystitis" },
  { code: "M54.5", desc: "Low back pain" },
  { code: "I10", desc: "Essential (primary) hypertension" },
  { code: "J06.9", desc: "Acute upper respiratory infection" },
  { code: "K21.0", desc: "Gastro-oesophageal reflux disease with oesophagitis" },
  { code: "N39.0", desc: "Urinary tract infection, site not specified" },
  { code: "L30.9", desc: "Dermatitis, unspecified" },
  { code: "S82.0", desc: "Fracture of patella" },
  { code: "G43.9", desc: "Migraine, unspecified" },
  { code: "R10.4", desc: "Other and unspecified abdominal pain" },
  { code: "E78.5", desc: "Hyperlipidaemia, unspecified" },
  { code: "J45.9", desc: "Asthma, unspecified" },
  { code: "F32.9", desc: "Depressive episode, unspecified" },
];

export const CPT_CODES = [
  { code: "71046", desc: "Chest X-ray, 2 views" },
  { code: "99213", desc: "Office/outpatient visit, established" },
  { code: "47562", desc: "Laparoscopic cholecystectomy" },
  { code: "73721", desc: "MRI lower extremity joint" },
  { code: "80053", desc: "Comprehensive metabolic panel" },
  { code: "99214", desc: "Office/outpatient visit, detailed" },
  { code: "43239", desc: "Upper GI endoscopy with biopsy" },
  { code: "81001", desc: "Urinalysis with microscopy" },
  { code: "11102", desc: "Skin biopsy, tangential" },
  { code: "27447", desc: "Total knee arthroplasty" },
  { code: "70553", desc: "MRI brain with contrast" },
  { code: "76700", desc: "Ultrasound abdomen, complete" },
  { code: "83036", desc: "Hemoglobin A1c" },
  { code: "94010", desc: "Spirometry" },
  { code: "90837", desc: "Psychotherapy, 60 minutes" },
];

// ── Employer Data ───────────────────────────────────────────────
// [code, name, nameAr, crNumber, sector, employeeCount, insuredCount, pendingEnrollment, city, region, complianceStatus]
type EmployerTuple = [string, string, string, string, string, number, number, number, string, string, string];

export const EMPLOYER_TUPLES: EmployerTuple[] = [
  // ── Demo personas ──
  ["EMP-001", "Al Madinah Construction Group", "مجموعة المدينة للمقاولات", "CR-1010234567", "construction", 1200, 1164, 36, "Riyadh", "RIY", "compliant"],
  ["EMP-002", "Nujoom Tech Solutions", "نجوم للحلول التقنية", "CR-1010345678", "technology", 280, 280, 0, "Riyadh", "RIY", "compliant"],
  ["EMP-003", "Gulf Hospitality Co", "شركة الخليج للضيافة", "CR-4030456789", "hospitality", 600, 571, 29, "Jeddah", "MAK", "action_required"],
  // ── Construction (17 more) ──
  ["EMP-004", "Bina Al Khaleej Contracting", "بناء الخليج للمقاولات", "CR-1010456001", "construction", 850, 833, 17, "Riyadh", "RIY", "compliant"],
  ["EMP-005", "Saudi Build Corp", "شركة البناء السعودية", "CR-1010456002", "construction", 2200, 2134, 66, "Riyadh", "RIY", "compliant"],
  ["EMP-006", "Al Rajhi Development", "الراجحي للتطوير", "CR-4030456003", "construction", 1500, 1455, 45, "Jeddah", "MAK", "compliant"],
  ["EMP-007", "Eastern Builders LLC", "البناؤون الشرقيون", "CR-2050456004", "construction", 680, 646, 34, "Dammam", "EST", "action_required"],
  ["EMP-008", "Tameer Construction", "تعمير للبناء", "CR-1010456005", "construction", 320, 320, 0, "Riyadh", "RIY", "compliant"],
  ["EMP-009", "Al Watania Contracting", "الوطنية للمقاولات", "CR-4030456006", "construction", 450, 432, 18, "Makkah", "MAK", "compliant"],
  ["EMP-010", "Gulf Cement Industries", "صناعات الأسمنت الخليجية", "CR-2050456007", "construction", 180, 180, 0, "Al Khobar", "EST", "compliant"],
  ["EMP-011", "Madinah Roads Co", "طرق المدينة", "CR-3550456008", "construction", 220, 209, 11, "Madinah", "MDN", "compliant"],
  ["EMP-012", "Tabuk Infrastructure", "تبوك للبنية التحتية", "CR-3750456009", "construction", 140, 133, 7, "Tabuk", "TBK", "compliant"],
  ["EMP-013", "Saudi Steel Structures", "الهياكل الفولاذية السعودية", "CR-1010456010", "construction", 95, 95, 0, "Riyadh", "RIY", "compliant"],
  ["EMP-014", "Al Yamama Group", "مجموعة اليمامة", "CR-1010456011", "construction", 3500, 3395, 105, "Riyadh", "RIY", "compliant"],
  ["EMP-015", "Hail Construction Est", "مؤسسة حائل للبناء", "CR-3450456012", "construction", 75, 68, 7, "Hail", "HAL", "action_required"],
  ["EMP-016", "Qassim Builders", "بناة القصيم", "CR-3250456013", "construction", 110, 110, 0, "Buraydah", "QSM", "compliant"],
  ["EMP-017", "Asir Development Co", "شركة عسير للتطوير", "CR-3150456014", "construction", 160, 152, 8, "Abha", "ASR", "compliant"],
  ["EMP-018", "Najran Civil Works", "الأعمال المدنية بنجران", "CR-3350456015", "construction", 65, 62, 3, "Najran", "NJR", "compliant"],
  ["EMP-019", "Jazan Port Services", "خدمات ميناء جازان", "CR-3400456016", "construction", 200, 190, 10, "Jazan", "JZN", "compliant"],
  ["EMP-020", "Northern Build Est", "مؤسسة البناء الشمالية", "CR-3700456017", "construction", 50, 47, 3, "Arar", "NBR", "compliant"],
  // ── Technology (15) ──
  ["EMP-021", "Raqami Digital Services", "رقمي للخدمات الرقمية", "CR-1010567001", "technology", 150, 150, 0, "Riyadh", "RIY", "compliant"],
  ["EMP-022", "Saudi Cloud Systems", "الأنظمة السحابية السعودية", "CR-1010567002", "technology", 420, 420, 0, "Riyadh", "RIY", "compliant"],
  ["EMP-023", "Byte Valley Technologies", "وادي البايت للتقنية", "CR-1010567003", "technology", 85, 85, 0, "Riyadh", "RIY", "compliant"],
  ["EMP-024", "Taqnia Information Tech", "تقنية لتكنولوجيا المعلومات", "CR-4030567004", "technology", 310, 310, 0, "Jeddah", "MAK", "compliant"],
  ["EMP-025", "Elm Information Security", "علم لأمن المعلومات", "CR-1010567005", "technology", 520, 520, 0, "Riyadh", "RIY", "compliant"],
  ["EMP-026", "Gulf Data Analytics", "تحليلات بيانات الخليج", "CR-2050567006", "technology", 95, 95, 0, "Al Khobar", "EST", "compliant"],
  ["EMP-027", "Mawarid Software", "موارد للبرمجيات", "CR-1010567007", "technology", 180, 180, 0, "Riyadh", "RIY", "compliant"],
  ["EMP-028", "SmartCity Solutions", "حلول المدن الذكية", "CR-4030567008", "technology", 65, 65, 0, "Jeddah", "MAK", "compliant"],
  ["EMP-029", "Al Faris IT Consulting", "الفارس لاستشارات تقنية", "CR-1010567009", "technology", 45, 45, 0, "Riyadh", "RIY", "compliant"],
  ["EMP-030", "Sahab Cloud", "سحاب كلاود", "CR-1010567010", "technology", 120, 120, 0, "Riyadh", "RIY", "compliant"],
  ["EMP-031", "Bayan Analytics", "بيان للتحليلات", "CR-2050567011", "technology", 75, 75, 0, "Dammam", "EST", "compliant"],
  ["EMP-032", "Tatweer Digital", "تطوير الرقمية", "CR-4030567012", "technology", 200, 200, 0, "Jeddah", "MAK", "compliant"],
  ["EMP-033", "Wateen Telecom", "واتين للاتصالات", "CR-1010567013", "technology", 350, 350, 0, "Riyadh", "RIY", "compliant"],
  ["EMP-034", "Innovate KSA", "ابتكار السعودية", "CR-1010567014", "technology", 55, 55, 0, "Riyadh", "RIY", "compliant"],
  ["EMP-035", "Eastern Digital Hub", "المحور الرقمي الشرقي", "CR-2050567015", "technology", 40, 40, 0, "Al Khobar", "EST", "compliant"],
  // ── Hospitality (12) ──
  ["EMP-036", "Diyafa Hotels Group", "مجموعة ضيافة للفنادق", "CR-4030678001", "hospitality", 450, 428, 22, "Jeddah", "MAK", "compliant"],
  ["EMP-037", "Saudi Catering Co", "شركة التموين السعودية", "CR-1010678002", "hospitality", 800, 776, 24, "Riyadh", "RIY", "compliant"],
  ["EMP-038", "Makkah Grand Hotels", "فنادق مكة الكبرى", "CR-4030678003", "hospitality", 1200, 1140, 60, "Makkah", "MAK", "action_required"],
  ["EMP-039", "Taif Resort Management", "إدارة منتجعات الطائف", "CR-4030678004", "hospitality", 180, 171, 9, "Taif", "MAK", "compliant"],
  ["EMP-040", "Red Sea Tourism", "سياحة البحر الأحمر", "CR-4030678005", "hospitality", 350, 343, 7, "Jeddah", "MAK", "compliant"],
  ["EMP-041", "Madinah Pilgrim Services", "خدمات حجاج المدينة", "CR-3550678006", "hospitality", 500, 480, 20, "Madinah", "MDN", "compliant"],
  ["EMP-042", "Eastern Hotels Chain", "سلسلة الفنادق الشرقية", "CR-2050678007", "hospitality", 280, 280, 0, "Al Khobar", "EST", "compliant"],
  ["EMP-043", "Riyadh Event Catering", "تموين فعاليات الرياض", "CR-1010678008", "hospitality", 120, 114, 6, "Riyadh", "RIY", "compliant"],
  ["EMP-044", "Abha Mountain Lodge", "نزل جبل أبها", "CR-3150678009", "hospitality", 60, 57, 3, "Abha", "ASR", "compliant"],
  ["EMP-045", "Tabuk Oasis Resort", "منتجع واحة تبوك", "CR-3750678010", "hospitality", 45, 45, 0, "Tabuk", "TBK", "compliant"],
  ["EMP-046", "NEOM Hospitality Services", "نيوم لخدمات الضيافة", "CR-3750678011", "hospitality", 200, 200, 0, "Tabuk", "TBK", "compliant"],
  ["EMP-047", "Hail Heritage Hotels", "فنادق تراث حائل", "CR-3450678012", "hospitality", 35, 33, 2, "Hail", "HAL", "compliant"],
  // ── Oil & Gas (8) ──
  ["EMP-048", "Petroserv Energy", "بتروسيرف للطاقة", "CR-2050789001", "oil_gas", 2500, 2475, 25, "Dhahran", "EST", "compliant"],
  ["EMP-049", "Arabian Drilling Co", "الحفر العربية", "CR-2050789002", "oil_gas", 1800, 1764, 36, "Al Khobar", "EST", "compliant"],
  ["EMP-050", "Gulf Petrochemicals", "بتروكيماويات الخليج", "CR-2050789003", "oil_gas", 650, 650, 0, "Dammam", "EST", "compliant"],
  ["EMP-051", "Saudi Refining Services", "خدمات التكرير السعودية", "CR-2050789004", "oil_gas", 400, 396, 4, "Al Khobar", "EST", "compliant"],
  ["EMP-052", "Riyadh Gas Distribution", "توزيع غاز الرياض", "CR-1010789005", "oil_gas", 180, 180, 0, "Riyadh", "RIY", "compliant"],
  ["EMP-053", "Jeddah Marine Energy", "طاقة جدة البحرية", "CR-4030789006", "oil_gas", 120, 120, 0, "Jeddah", "MAK", "compliant"],
  ["EMP-054", "Jazan Refinery Services", "خدمات مصفاة جازان", "CR-3400789007", "oil_gas", 300, 294, 6, "Jazan", "JZN", "compliant"],
  ["EMP-055", "Northern Pipeline Co", "أنابيب الشمال", "CR-3700789008", "oil_gas", 85, 85, 0, "Arar", "NBR", "compliant"],
  // ── Retail (18) ──
  ["EMP-056", "Nujoom Retail Group", "مجموعة نجوم للتجزئة", "CR-4030890001", "retail", 900, 882, 18, "Jeddah", "MAK", "compliant"],
  ["EMP-057", "Al Othaim Markets", "أسواق العثيم", "CR-1010890002", "retail", 3200, 3136, 64, "Riyadh", "RIY", "compliant"],
  ["EMP-058", "BinDawood Stores", "متاجر بن داود", "CR-4030890003", "retail", 2800, 2744, 56, "Jeddah", "MAK", "compliant"],
  ["EMP-059", "Riyadh Fashion Mall", "مول أزياء الرياض", "CR-1010890004", "retail", 150, 147, 3, "Riyadh", "RIY", "compliant"],
  ["EMP-060", "Eastern Electronics", "إلكترونيات الشرقية", "CR-2050890005", "retail", 200, 200, 0, "Dammam", "EST", "compliant"],
  ["EMP-061", "Al Baik Foods", "البيك للأغذية", "CR-4030890006", "retail", 4000, 3920, 80, "Jeddah", "MAK", "compliant"],
  ["EMP-062", "Jarir Bookstore", "مكتبة جرير", "CR-1010890007", "retail", 1500, 1500, 0, "Riyadh", "RIY", "compliant"],
  ["EMP-063", "Extra Electronics", "اكسترا للإلكترونيات", "CR-1010890008", "retail", 1200, 1176, 24, "Riyadh", "RIY", "compliant"],
  ["EMP-064", "Panda Retail Company", "شركة بنده للتجزئة", "CR-4030890009", "retail", 5000, 4900, 100, "Jeddah", "MAK", "action_required"],
  ["EMP-065", "Nahdi Medical Co", "النهدي الطبية", "CR-4030890010", "retail", 2200, 2200, 0, "Jeddah", "MAK", "compliant"],
  ["EMP-066", "Madinah Souq", "سوق المدينة", "CR-3550890011", "retail", 80, 76, 4, "Madinah", "MDN", "compliant"],
  ["EMP-067", "Qassim Fresh Markets", "أسواق القصيم الطازجة", "CR-3250890012", "retail", 120, 120, 0, "Buraydah", "QSM", "compliant"],
  ["EMP-068", "Abha City Mall", "مول مدينة أبها", "CR-3150890013", "retail", 60, 57, 3, "Abha", "ASR", "compliant"],
  ["EMP-069", "Taif Garden Center", "مركز حدائق الطائف", "CR-4030890014", "retail", 35, 35, 0, "Taif", "MAK", "compliant"],
  ["EMP-070", "Hail Supermarket", "سوبرماركت حائل", "CR-3450890015", "retail", 45, 43, 2, "Hail", "HAL", "compliant"],
  ["EMP-071", "Najran Trading Est", "مؤسسة نجران التجارية", "CR-3350890016", "retail", 30, 30, 0, "Najran", "NJR", "compliant"],
  ["EMP-072", "Al Jouf Superstore", "متجر الجوف الكبير", "CR-3600890017", "retail", 25, 25, 0, "Sakaka", "JOF", "compliant"],
  ["EMP-073", "Al Baha Market", "سوق الباحة", "CR-3500890018", "retail", 20, 20, 0, "Al Baha", "BAH", "compliant"],
  // ── Healthcare (10) ──
  ["EMP-074", "Saudi Home Healthcare", "الرعاية المنزلية السعودية", "CR-1010901001", "healthcare", 350, 350, 0, "Riyadh", "RIY", "compliant"],
  ["EMP-075", "MedStaff Recruitment", "ميدستاف للتوظيف", "CR-4030901002", "healthcare", 200, 200, 0, "Jeddah", "MAK", "compliant"],
  ["EMP-076", "Riyadh Dental Group", "مجموعة الرياض لطب الأسنان", "CR-1010901003", "healthcare", 80, 80, 0, "Riyadh", "RIY", "compliant"],
  ["EMP-077", "Eastern Province Clinics", "عيادات المنطقة الشرقية", "CR-2050901004", "healthcare", 120, 120, 0, "Dammam", "EST", "compliant"],
  ["EMP-078", "Saudi Pharmacy Chain", "سلسلة صيدليات السعودية", "CR-1010901005", "healthcare", 600, 588, 12, "Riyadh", "RIY", "compliant"],
  ["EMP-079", "Jeddah Lab Services", "خدمات مختبرات جدة", "CR-4030901006", "healthcare", 90, 90, 0, "Jeddah", "MAK", "compliant"],
  ["EMP-080", "National Ambulance Co", "الإسعاف الوطني", "CR-1010901007", "healthcare", 450, 450, 0, "Riyadh", "RIY", "compliant"],
  ["EMP-081", "Madinah Medical Supplies", "مستلزمات المدينة الطبية", "CR-3550901008", "healthcare", 55, 55, 0, "Madinah", "MDN", "compliant"],
  ["EMP-082", "Makkah Eye Care", "رعاية عيون مكة", "CR-4030901009", "healthcare", 40, 40, 0, "Makkah", "MAK", "compliant"],
  ["EMP-083", "Saudi Rehab Centers", "مراكز إعادة التأهيل السعودية", "CR-1010901010", "healthcare", 150, 147, 3, "Riyadh", "RIY", "compliant"],
  // ── Manufacturing (10) ──
  ["EMP-084", "Saudi Plastics Factory", "مصنع البلاستيك السعودي", "CR-1010012001", "manufacturing", 400, 392, 8, "Riyadh", "RIY", "compliant"],
  ["EMP-085", "Al Zamil Industrial", "الزامل الصناعية", "CR-2050012002", "manufacturing", 1500, 1470, 30, "Dammam", "EST", "compliant"],
  ["EMP-086", "Jeddah Food Processing", "تصنيع أغذية جدة", "CR-4030012003", "manufacturing", 350, 343, 7, "Jeddah", "MAK", "compliant"],
  ["EMP-087", "Riyadh Packaging Co", "شركة تعبئة الرياض", "CR-1010012004", "manufacturing", 180, 180, 0, "Riyadh", "RIY", "compliant"],
  ["EMP-088", "Eastern Chemicals", "كيماويات الشرقية", "CR-2050012005", "manufacturing", 250, 245, 5, "Al Khobar", "EST", "compliant"],
  ["EMP-089", "Saudi Glass Industries", "صناعات الزجاج السعودية", "CR-1010012006", "manufacturing", 120, 120, 0, "Riyadh", "RIY", "compliant"],
  ["EMP-090", "Qassim Dairy Factory", "مصنع ألبان القصيم", "CR-3250012007", "manufacturing", 90, 88, 2, "Buraydah", "QSM", "compliant"],
  ["EMP-091", "Taif Water Bottling", "تعبئة مياه الطائف", "CR-4030012008", "manufacturing", 65, 65, 0, "Taif", "MAK", "compliant"],
  ["EMP-092", "Hail Furniture Factory", "مصنع أثاث حائل", "CR-3450012009", "manufacturing", 45, 43, 2, "Hail", "HAL", "compliant"],
  ["EMP-093", "Jazan Fisheries", "مصايد جازان", "CR-3400012010", "manufacturing", 80, 76, 4, "Jazan", "JZN", "compliant"],
  // ── Education (5) ──
  ["EMP-094", "Riyadh International Schools", "مدارس الرياض الدولية", "CR-1010023001", "education", 400, 400, 0, "Riyadh", "RIY", "compliant"],
  ["EMP-095", "Jeddah Knowledge Academy", "أكاديمية جدة المعرفية", "CR-4030023002", "education", 250, 250, 0, "Jeddah", "MAK", "compliant"],
  ["EMP-096", "Saudi Language Institute", "معهد اللغات السعودي", "CR-1010023003", "education", 80, 80, 0, "Riyadh", "RIY", "compliant"],
  ["EMP-097", "Eastern Technical College", "الكلية التقنية الشرقية", "CR-2050023004", "education", 120, 120, 0, "Dammam", "EST", "compliant"],
  ["EMP-098", "Madinah Training Center", "مركز تدريب المدينة", "CR-3550023005", "education", 45, 45, 0, "Madinah", "MDN", "compliant"],
  // ── Financial Services (5) ──
  ["EMP-099", "Saudi Fintech Corp", "فنتك السعودية", "CR-1010034001", "financial_services", 180, 180, 0, "Riyadh", "RIY", "compliant"],
  ["EMP-100", "Al Jazira Insurance Brokers", "وسطاء تأمين الجزيرة", "CR-1010034002", "financial_services", 90, 90, 0, "Riyadh", "RIY", "compliant"],
  ["EMP-101", "Jeddah Exchange House", "بيت الصرافة بجدة", "CR-4030034003", "financial_services", 150, 147, 3, "Jeddah", "MAK", "compliant"],
  ["EMP-102", "Gulf Accounting Firm", "مكتب محاسبة الخليج", "CR-2050034004", "financial_services", 60, 60, 0, "Al Khobar", "EST", "compliant"],
  ["EMP-103", "Saudi Audit Partners", "شركاء التدقيق السعوديون", "CR-1010034005", "financial_services", 40, 40, 0, "Riyadh", "RIY", "compliant"],
  // ── Transportation (7) ──
  ["EMP-104", "Saudi Logistics Co", "اللوجستيات السعودية", "CR-1010045001", "transportation", 800, 784, 16, "Riyadh", "RIY", "compliant"],
  ["EMP-105", "Jeddah Port Services", "خدمات ميناء جدة", "CR-4030045002", "transportation", 600, 588, 12, "Jeddah", "MAK", "compliant"],
  ["EMP-106", "Eastern Freight Lines", "خطوط الشحن الشرقية", "CR-2050045003", "transportation", 350, 343, 7, "Dammam", "EST", "compliant"],
  ["EMP-107", "Saudi Express Delivery", "التوصيل السريع السعودي", "CR-1010045004", "transportation", 1200, 1176, 24, "Riyadh", "RIY", "compliant"],
  ["EMP-108", "Madinah Bus Co", "حافلات المدينة", "CR-3550045005", "transportation", 180, 180, 0, "Madinah", "MDN", "compliant"],
  ["EMP-109", "Gulf Shipping Agency", "وكالة الشحن الخليجية", "CR-2050045006", "transportation", 95, 95, 0, "Al Khobar", "EST", "compliant"],
  ["EMP-110", "National Taxi Fleet", "أسطول التاكسي الوطني", "CR-1010045007", "transportation", 500, 485, 15, "Riyadh", "RIY", "action_required"],
];

// ── Sector Health Profiles ──────────────────────────────────────
export interface SectorHealth {
  avgAge: number; malePercent: number;
  chronicConditions: { name: string; prevalence: number; benchmark: number }[];
  topSpecialties: { name: string; utilizationPercent: number }[];
  erUtilization: number; erBenchmark: number;
  absenteeismDays: number; absenteeismBenchmark: number;
  wellnessBase: number; wellnessRange: number;
  insights: { icon: string; headline: string; body: string; tag: string }[];
}

export const SECTOR_HEALTH: Record<string, SectorHealth> = {
  construction: {
    avgAge: 34.2, malePercent: 92,
    chronicConditions: [{ name: "Diabetes", prevalence: 14.2, benchmark: 11.8 }, { name: "Hypertension", prevalence: 11.8, benchmark: 10.2 }, { name: "Musculoskeletal", prevalence: 9.4, benchmark: 4.1 }, { name: "Respiratory", prevalence: 6.1, benchmark: 3.8 }],
    topSpecialties: [{ name: "Orthopedics", utilizationPercent: 22 }, { name: "General Practice", utilizationPercent: 19 }, { name: "Pulmonology", utilizationPercent: 14 }],
    erUtilization: 12.0, erBenchmark: 8.0, absenteeismDays: 4.8, absenteeismBenchmark: 3.2, wellnessBase: 58, wellnessRange: 7,
    insights: [
      { icon: "alert-triangle", headline: "High ER utilization detected", body: "ER utilization at 12% vs 8% benchmark suggests employees lack access to primary care clinics near worksites. Consider on-site clinic or telemedicine benefit.", tag: "Cost Impact" },
      { icon: "activity", headline: "Musculoskeletal claims 2.3x national average", body: "Construction workforce shows significantly elevated musculoskeletal claims. Workplace ergonomics assessment recommended.", tag: "Quality" },
    ],
  },
  technology: {
    avgAge: 29.8, malePercent: 68,
    chronicConditions: [{ name: "Mental Health", prevalence: 8.7, benchmark: 5.2 }, { name: "Vision/Eye Strain", prevalence: 12.4, benchmark: 6.8 }, { name: "Back/Posture", prevalence: 7.8, benchmark: 4.1 }, { name: "Metabolic Syndrome", prevalence: 5.2, benchmark: 4.8 }],
    topSpecialties: [{ name: "Ophthalmology", utilizationPercent: 18 }, { name: "Psychiatry/Psychology", utilizationPercent: 16 }, { name: "General Practice", utilizationPercent: 22 }],
    erUtilization: 5.2, erBenchmark: 8.0, absenteeismDays: 2.1, absenteeismBenchmark: 3.2, wellnessBase: 75, wellnessRange: 7,
    insights: [
      { icon: "brain", headline: "Mental health utilization above benchmark", body: "Psychiatry/psychology visits 3.1x higher than national average. Consider Employee Assistance Program (EAP) and mental health first-aid training.", tag: "Quality" },
      { icon: "eye", headline: "Vision-related claims trending up 15% YoY", body: "Consider blue-light screen filters, annual eye exams, and ergonomic monitor positioning guidelines.", tag: "Prevention" },
    ],
  },
  hospitality: {
    avgAge: 31.5, malePercent: 65,
    chronicConditions: [{ name: "Infectious Disease", prevalence: 7.2, benchmark: 3.5 }, { name: "Irregular Hours Conditions", prevalence: 5.8, benchmark: 3.2 }, { name: "Diabetes", prevalence: 10.5, benchmark: 11.8 }, { name: "Respiratory", prevalence: 4.8, benchmark: 3.8 }],
    topSpecialties: [{ name: "General Practice", utilizationPercent: 25 }, { name: "Internal Medicine", utilizationPercent: 18 }, { name: "Dermatology", utilizationPercent: 12 }],
    erUtilization: 9.5, erBenchmark: 8.0, absenteeismDays: 3.8, absenteeismBenchmark: 3.2, wellnessBase: 58, wellnessRange: 10,
    insights: [
      { icon: "shield", headline: "Infectious disease exposure above average", body: "High customer-facing workforce shows elevated infectious disease claims. Ensure vaccination programs and hygiene protocols are up to date.", tag: "Prevention" },
      { icon: "clock", headline: "Shift-work related conditions trending up", body: "Irregular hours contribute to sleep disorders and metabolic issues. Consider shift scheduling optimization.", tag: "Quality" },
    ],
  },
  oil_gas: {
    avgAge: 36.8, malePercent: 88,
    chronicConditions: [{ name: "Respiratory", prevalence: 8.4, benchmark: 3.8 }, { name: "Occupational Hazards", prevalence: 6.2, benchmark: 2.1 }, { name: "Hypertension", prevalence: 12.5, benchmark: 10.2 }, { name: "Musculoskeletal", prevalence: 5.8, benchmark: 4.1 }],
    topSpecialties: [{ name: "Pulmonology", utilizationPercent: 20 }, { name: "Orthopedics", utilizationPercent: 16 }, { name: "Occupational Medicine", utilizationPercent: 14 }],
    erUtilization: 7.8, erBenchmark: 8.0, absenteeismDays: 3.5, absenteeismBenchmark: 3.2, wellnessBase: 60, wellnessRange: 8,
    insights: [
      { icon: "wind", headline: "Respiratory claims 2.2x national average", body: "Exposure to petrochemical environments drives elevated respiratory conditions. Regular spirometry screening recommended.", tag: "Quality" },
      { icon: "map-pin", headline: "Remote location care access gap", body: "Employees in remote sites report longer times to access healthcare. Telemedicine and on-site medic coverage recommended.", tag: "Access" },
    ],
  },
  retail: {
    avgAge: 28.5, malePercent: 58,
    chronicConditions: [{ name: "Foot/Back Conditions", prevalence: 6.8, benchmark: 4.1 }, { name: "Shift Work Impact", prevalence: 4.2, benchmark: 3.2 }, { name: "Diabetes", prevalence: 9.8, benchmark: 11.8 }, { name: "Hypertension", prevalence: 8.2, benchmark: 10.2 }],
    topSpecialties: [{ name: "General Practice", utilizationPercent: 28 }, { name: "Orthopedics", utilizationPercent: 14 }, { name: "Dermatology", utilizationPercent: 10 }],
    erUtilization: 8.2, erBenchmark: 8.0, absenteeismDays: 3.0, absenteeismBenchmark: 3.2, wellnessBase: 62, wellnessRange: 10,
    insights: [
      { icon: "footprints", headline: "Standing-related conditions elevated", body: "Long retail shifts drive foot and lower back complaints. Consider anti-fatigue mats and scheduled rest breaks.", tag: "Quality" },
      { icon: "clock", headline: "Shift work impacts emerging", body: "Extended retail hours affect sleep patterns. Wellness programs targeting shift workers could reduce absenteeism.", tag: "Prevention" },
    ],
  },
  healthcare: {
    avgAge: 33.2, malePercent: 45,
    chronicConditions: [{ name: "Mental Health/Burnout", prevalence: 6.5, benchmark: 5.2 }, { name: "Needle-Stick Exposure", prevalence: 2.1, benchmark: 0.8 }, { name: "Respiratory", prevalence: 3.2, benchmark: 3.8 }, { name: "Musculoskeletal", prevalence: 5.5, benchmark: 4.1 }],
    topSpecialties: [{ name: "Psychiatry/Psychology", utilizationPercent: 15 }, { name: "General Practice", utilizationPercent: 22 }, { name: "Preventive Care", utilizationPercent: 18 }],
    erUtilization: 4.8, erBenchmark: 8.0, absenteeismDays: 2.8, absenteeismBenchmark: 3.2, wellnessBase: 72, wellnessRange: 8,
    insights: [
      { icon: "heart", headline: "Burnout markers above baseline", body: "Healthcare workers show elevated mental health utilization. Structured resilience programs and protected rest time recommended.", tag: "Quality" },
      { icon: "shield-check", headline: "Above-average preventive care uptake", body: "Healthcare employees proactively use preventive screenings. Continue supporting annual health check programs.", tag: "Positive" },
    ],
  },
  manufacturing: {
    avgAge: 35.5, malePercent: 85,
    chronicConditions: [{ name: "Musculoskeletal", prevalence: 7.8, benchmark: 4.1 }, { name: "Respiratory", prevalence: 5.5, benchmark: 3.8 }, { name: "Hearing Loss", prevalence: 3.8, benchmark: 1.2 }, { name: "Diabetes", prevalence: 11.2, benchmark: 11.8 }],
    topSpecialties: [{ name: "Orthopedics", utilizationPercent: 20 }, { name: "ENT", utilizationPercent: 14 }, { name: "General Practice", utilizationPercent: 22 }],
    erUtilization: 9.0, erBenchmark: 8.0, absenteeismDays: 3.8, absenteeismBenchmark: 3.2, wellnessBase: 58, wellnessRange: 8,
    insights: [
      { icon: "ear", headline: "Hearing loss prevalence 3x above average", body: "Factory noise exposure drives hearing-related claims. Mandatory hearing protection and annual audiometry recommended.", tag: "Compliance" },
      { icon: "activity", headline: "Repetitive strain injuries trending up", body: "Assembly line workers show increased musculoskeletal complaints. Rotation schedules and ergonomic workstation review recommended.", tag: "Quality" },
    ],
  },
  education: {
    avgAge: 38.2, malePercent: 42,
    chronicConditions: [{ name: "Voice/Throat", prevalence: 8.5, benchmark: 2.0 }, { name: "Mental Health", prevalence: 5.8, benchmark: 5.2 }, { name: "Back Pain", prevalence: 6.2, benchmark: 4.1 }, { name: "Allergies", prevalence: 5.5, benchmark: 4.5 }],
    topSpecialties: [{ name: "ENT", utilizationPercent: 18 }, { name: "General Practice", utilizationPercent: 24 }, { name: "Psychiatry/Psychology", utilizationPercent: 12 }],
    erUtilization: 4.5, erBenchmark: 8.0, absenteeismDays: 2.5, absenteeismBenchmark: 3.2, wellnessBase: 70, wellnessRange: 8,
    insights: [
      { icon: "mic", headline: "Voice-related conditions 4x above average", body: "Teaching profession drives elevated ENT claims. Voice training and amplification equipment recommended.", tag: "Quality" },
      { icon: "brain", headline: "Moderate mental health utilization", body: "End-of-term stress patterns visible. Consider structured wellness check-ins during peak periods.", tag: "Prevention" },
    ],
  },
  financial_services: {
    avgAge: 32.0, malePercent: 60,
    chronicConditions: [{ name: "Mental Health", prevalence: 7.2, benchmark: 5.2 }, { name: "Metabolic Syndrome", prevalence: 6.8, benchmark: 4.8 }, { name: "Back Pain", prevalence: 5.5, benchmark: 4.1 }, { name: "Vision", prevalence: 8.2, benchmark: 6.8 }],
    topSpecialties: [{ name: "General Practice", utilizationPercent: 26 }, { name: "Ophthalmology", utilizationPercent: 14 }, { name: "Psychiatry/Psychology", utilizationPercent: 12 }],
    erUtilization: 4.2, erBenchmark: 8.0, absenteeismDays: 2.0, absenteeismBenchmark: 3.2, wellnessBase: 74, wellnessRange: 6,
    insights: [
      { icon: "brain", headline: "Stress-related mental health claims above benchmark", body: "Financial sector deadline pressure shows in utilization data. Structured EAP and work-life balance initiatives recommended.", tag: "Quality" },
      { icon: "monitor", headline: "Screen-time related conditions elevated", body: "Extended screen exposure drives vision and posture issues. Ergonomic assessments and break reminders recommended.", tag: "Prevention" },
    ],
  },
  transportation: {
    avgAge: 37.0, malePercent: 90,
    chronicConditions: [{ name: "Back Pain", prevalence: 8.5, benchmark: 4.1 }, { name: "Hypertension", prevalence: 13.2, benchmark: 10.2 }, { name: "Diabetes", prevalence: 12.8, benchmark: 11.8 }, { name: "Sleep Disorders", prevalence: 5.5, benchmark: 2.8 }],
    topSpecialties: [{ name: "General Practice", utilizationPercent: 24 }, { name: "Orthopedics", utilizationPercent: 18 }, { name: "Cardiology", utilizationPercent: 12 }],
    erUtilization: 10.5, erBenchmark: 8.0, absenteeismDays: 4.2, absenteeismBenchmark: 3.2, wellnessBase: 56, wellnessRange: 8,
    insights: [
      { icon: "truck", headline: "Driver-related health conditions elevated", body: "Long-haul drivers show elevated back, cardiovascular, and sleep disorder claims. Mandatory health screenings and rest protocols recommended.", tag: "Compliance" },
      { icon: "alert-triangle", headline: "ER utilization 31% above benchmark", body: "Transportation workers use ER more than average. Improve access to occupational health clinics along major routes.", tag: "Cost Impact" },
    ],
  },
};

// ── Members (28) ────────────────────────────────────────────────
// [code, name, nameAr, iqamaNo, policyNumber, employerCode, employerName, insurerCode, insurerName, planTier, nationality, age, gender, city, region, dependents]
type MemberTuple = [string, string, string, string, string, string, string, string, string, string, string, number, string, string, string, number];

export const MEMBER_TUPLES: MemberTuple[] = [
  // ── Demo Personas ──
  ["MEM-001", "Fatimah Al-Dosari", "فاطمة الدوسري", "1098765432", "SA-2024-00789", "EMP-056", "Nujoom Retail Group", "INS-001", "Bupa Arabia", "gold", "Saudi", 34, "female", "Jeddah", "MAK", 2],
  ["MEM-002", "Omar Al-Zahrani", "عمر الزهراني", "1087654321", "SA-2024-01204", "EMP-025", "Elm Information Security", "INS-002", "Tawuniya", "bronze", "Saudi", 52, "male", "Riyadh", "RIY", 0],
  ["MEM-003", "Priya Sharma", "بريا شارما", "2345678901", "SA-2025-00341", "EMP-003", "Gulf Hospitality Co", "INS-003", "MedGulf", "silver", "Indian", 28, "female", "Dammam", "EST", 1],
  // ── Supporting Cast ──
  ["MEM-004", "Khalid Al-Otaibi", "خالد العتيبي", "1076543210", "SA-2024-02105", "EMP-001", "Al Madinah Construction Group", "INS-002", "Tawuniya", "silver", "Saudi", 41, "male", "Riyadh", "RIY", 3],
  ["MEM-005", "Nora Al-Qahtani", "نورة القحطاني", "1065432109", "SA-2024-03067", "EMP-094", "Riyadh International Schools", "INS-001", "Bupa Arabia", "platinum", "Saudi", 38, "female", "Riyadh", "RIY", 2],
  ["MEM-006", "Ahmed Hassan", "أحمد حسن", "2234567890", "SA-2024-04012", "EMP-048", "Petroserv Energy", "INS-004", "Al Rajhi Takaful", "gold", "Egyptian", 45, "male", "Dhahran", "EST", 4],
  ["MEM-007", "Maria Santos", "ماريا سانتوس", "2456789012", "SA-2025-05034", "EMP-037", "Saudi Catering Co", "INS-005", "SAICO", "bronze", "Filipino", 26, "female", "Riyadh", "RIY", 0],
  ["MEM-008", "Mohammed Al-Harbi", "محمد الحربي", "1054321098", "SA-2024-06078", "EMP-022", "Saudi Cloud Systems", "INS-001", "Bupa Arabia", "gold", "Saudi", 29, "male", "Riyadh", "RIY", 1],
  ["MEM-009", "Amina Ibrahim", "أمينة إبراهيم", "2567890123", "SA-2024-07023", "EMP-075", "MedStaff Recruitment", "INS-003", "MedGulf", "silver", "Sudanese", 33, "female", "Jeddah", "MAK", 2],
  ["MEM-010", "Imran Khan", "عمران خان", "2678901234", "SA-2025-08045", "EMP-004", "Bina Al Khaleej Contracting", "INS-006", "Walaa Insurance", "bronze", "Pakistani", 38, "male", "Riyadh", "RIY", 3],
  ["MEM-011", "Sarah Al-Mutairi", "سارة المطيري", "1043210987", "SA-2024-09089", "EMP-099", "Saudi Fintech Corp", "INS-001", "Bupa Arabia", "platinum", "Saudi", 31, "female", "Riyadh", "RIY", 0],
  ["MEM-012", "Abdulrahman Al-Ghamdi", "عبدالرحمن الغامدي", "1032109876", "SA-2024-10034", "EMP-085", "Al Zamil Industrial", "INS-002", "Tawuniya", "silver", "Saudi", 47, "male", "Dammam", "EST", 5],
  ["MEM-013", "Ravi Patel", "رافي باتيل", "2789012345", "SA-2025-11056", "EMP-050", "Gulf Petrochemicals", "INS-004", "Al Rajhi Takaful", "gold", "Indian", 42, "male", "Dammam", "EST", 2],
  ["MEM-014", "Huda Al-Shammari", "هدى الشمري", "1021098765", "SA-2024-12078", "EMP-057", "Al Othaim Markets", "INS-002", "Tawuniya", "silver", "Saudi", 25, "female", "Riyadh", "RIY", 0],
  ["MEM-015", "Ali Al-Qahtani", "علي القحطاني", "1010987654", "SA-2024-13012", "EMP-104", "Saudi Logistics Co", "INS-005", "SAICO", "bronze", "Saudi", 55, "male", "Riyadh", "RIY", 4],
  ["MEM-016", "Layla Al-Rashid", "ليلى الراشد", "1009876543", "SA-2024-14034", "EMP-036", "Diyafa Hotels Group", "INS-003", "MedGulf", "gold", "Saudi", 30, "female", "Jeddah", "MAK", 1],
  ["MEM-017", "Tariq Al-Malki", "طارق المالكي", "1098765430", "SA-2024-15056", "EMP-031", "Asir Central Hospital", "INS-001", "Bupa Arabia", "gold", "Saudi", 48, "male", "Abha", "ASR", 3],
  ["MEM-018", "Josephine Cruz", "جوزفين كروز", "2890123456", "SA-2025-16078", "EMP-074", "Saudi Home Healthcare", "INS-006", "Walaa Insurance", "silver", "Filipino", 32, "female", "Riyadh", "RIY", 1],
  ["MEM-019", "Yousef Al-Dosari", "يوسف الدوسري", "1087654320", "SA-2024-17023", "EMP-005", "Saudi Build Corp", "INS-002", "Tawuniya", "bronze", "Saudi", 36, "male", "Riyadh", "RIY", 2],
  ["MEM-020", "Aisha Mohammed", "عائشة محمد", "2901234567", "SA-2025-18045", "EMP-038", "Makkah Grand Hotels", "INS-005", "SAICO", "silver", "Yemeni", 27, "female", "Makkah", "MAK", 0],
  ["MEM-021", "Hassan Al-Otaibi", "حسن العتيبي", "1076543211", "SA-2024-19089", "EMP-084", "Saudi Plastics Factory", "INS-004", "Al Rajhi Takaful", "bronze", "Saudi", 44, "male", "Riyadh", "RIY", 3],
  ["MEM-022", "Maryam Al-Enazi", "مريم العنزي", "1065432108", "SA-2024-20034", "EMP-095", "Jeddah Knowledge Academy", "INS-001", "Bupa Arabia", "gold", "Saudi", 35, "female", "Jeddah", "MAK", 2],
  ["MEM-023", "Rizwan Ahmed", "رضوان أحمد", "2012345678", "SA-2025-21056", "EMP-049", "Arabian Drilling Co", "INS-003", "MedGulf", "silver", "Pakistani", 40, "male", "Al Khobar", "EST", 4],
  ["MEM-024", "Sultan Al-Shahrani", "سلطان الشهراني", "1054321097", "SA-2024-22078", "EMP-034", "Qassim University Medical City", "INS-002", "Tawuniya", "gold", "Saudi", 50, "male", "Buraydah", "QSM", 2],
  ["MEM-025", "Nouf Al-Dossary", "نوف الدوسري", "1043210986", "SA-2024-23012", "EMP-062", "Jarir Bookstore", "INS-001", "Bupa Arabia", "silver", "Saudi", 22, "female", "Riyadh", "RIY", 0],
  ["MEM-026", "James Wilson", "جيمس ويلسون", "2123456789", "SA-2025-24034", "EMP-026", "Gulf Data Analytics", "INS-004", "Al Rajhi Takaful", "platinum", "British", 39, "male", "Al Khobar", "EST", 2],
  ["MEM-027", "Faisal Al-Tamimi", "فيصل التميمي", "1032109875", "SA-2024-25056", "EMP-107", "Saudi Express Delivery", "INS-006", "Walaa Insurance", "bronze", "Saudi", 58, "male", "Riyadh", "RIY", 5],
  ["MEM-028", "Deepa Nair", "ديبا ناير", "2234567891", "SA-2025-26078", "EMP-078", "Saudi Pharmacy Chain", "INS-003", "MedGulf", "gold", "Indian", 31, "female", "Riyadh", "RIY", 1],
];

// ── Coverage Lookups (30) ───────────────────────────────────────
export const COVERAGE_LOOKUPS = [
  { question: "Can I see a dermatologist?", questionAr: "هل يمكنني زيارة طبيب الجلدية؟", answer: "Yes, covered under Outpatient Visits. 20% copay for Gold plan. No referral needed.", answerAr: "نعم، مغطى ضمن زيارات العيادات الخارجية", planTiers: ["gold", "silver", "platinum"], category: "specialist" },
  { question: "Is IVF covered?", questionAr: "هل يغطي التأمين التلقيح الصناعي؟", answer: "Not covered under standard plans. Available as add-on rider — contact your employer's HR department.", answerAr: "غير مغطى في الخطط القياسية", planTiers: [], category: "maternity" },
  { question: "Do I need pre-approval for an MRI?", questionAr: "هل أحتاج موافقة مسبقة للرنين المغناطيسي؟", answer: "Yes. Your provider submits the request. Typical approval: 2-3 business days.", answerAr: "نعم، يقدم مقدم الخدمة الطلب", planTiers: ["bronze", "silver", "gold", "platinum"], category: "diagnostic" },
  { question: "Is mental health counseling covered?", questionAr: "هل الاستشارات النفسية مغطاة؟", answer: "Covered for up to 10 sessions/year on Gold plan. Psychiatry requires referral. Bronze plans: not covered.", answerAr: "مغطاة حتى 10 جلسات سنوياً في الخطة الذهبية", planTiers: ["gold", "silver", "platinum"], category: "mental_health" },
  { question: "Are dental braces covered?", questionAr: "هل تقويم الأسنان مغطى؟", answer: "Orthodontics are not covered under standard dental benefits. Basic dental (cleanings, fillings) is covered.", answerAr: "تقويم الأسنان غير مغطى", planTiers: [], category: "dental" },
  { question: "Can I get a second opinion?", questionAr: "هل يمكنني الحصول على رأي طبي ثاني؟", answer: "Yes, specialist consultations are covered under Outpatient Visits benefit.", answerAr: "نعم، استشارات الأخصائيين مغطاة", planTiers: ["bronze", "silver", "gold", "platinum"], category: "specialist" },
  { question: "Is physiotherapy covered without referral?", questionAr: "هل العلاج الطبيعي مغطى بدون تحويل؟", answer: "No, physiotherapy requires a referral from your treating physician.", answerAr: "لا، يتطلب العلاج الطبيعي تحويلاً", planTiers: ["gold", "silver", "platinum"], category: "physiotherapy" },
  { question: "Are vaccinations covered?", questionAr: "هل اللقاحات مغطاة؟", answer: "Preventive vaccinations are covered at 0% copay for all plan tiers.", answerAr: "اللقاحات الوقائية مغطاة بدون تحمل", planTiers: ["bronze", "silver", "gold", "platinum"], category: "preventive" },
  { question: "Can I use any hospital?", questionAr: "هل يمكنني استخدام أي مستشفى؟", answer: "You can use any provider in your insurer's approved network. Out-of-network visits may not be covered.", answerAr: "يمكنك استخدام أي مقدم خدمة في شبكة التأمين", planTiers: ["bronze", "silver", "gold", "platinum"], category: "general" },
  { question: "Is cosmetic surgery covered?", questionAr: "هل تغطي عمليات التجميل؟", answer: "Elective cosmetic procedures are not covered. Reconstructive surgery after accident/illness may be covered with pre-approval.", answerAr: "عمليات التجميل الاختيارية غير مغطاة", planTiers: [], category: "cosmetic" },
  { question: "Does my plan cover childbirth?", questionAr: "هل خطتي تغطي الولادة؟", answer: "Yes, maternity benefits cover prenatal, delivery, and postnatal care. C-section requires pre-approval.", answerAr: "نعم، تغطي الأمومة الرعاية قبل وأثناء وبعد الولادة", planTiers: ["bronze", "silver", "gold", "platinum"], category: "maternity" },
  { question: "Are prescription glasses covered?", questionAr: "هل النظارات الطبية مغطاة؟", answer: "One eye exam plus one pair of corrective lenses per year under Optical benefit.", answerAr: "فحص عين واحد ونظارة واحدة سنوياً", planTiers: ["bronze", "silver", "gold", "platinum"], category: "optical" },
  { question: "Is ER visit covered abroad?", questionAr: "هل زيارة الطوارئ مغطاة في الخارج؟", answer: "Emergency care abroad is covered up to 50,000 SAR per incident with Gold and Platinum plans only.", answerAr: "رعاية الطوارئ بالخارج مغطاة حتى 50,000 ريال", planTiers: ["gold", "platinum"], category: "emergency" },
  { question: "Can I see a specialist without referral?", questionAr: "هل يمكنني زيارة أخصائي بدون تحويل؟", answer: "Gold and Platinum plans allow direct specialist access. Silver and Bronze require GP referral.", answerAr: "الخطط الذهبية والبلاتينية تسمح بالوصول المباشر", planTiers: ["gold", "platinum"], category: "specialist" },
  { question: "Is home healthcare covered?", questionAr: "هل الرعاية المنزلية مغطاة؟", answer: "Post-surgical home nursing is covered for up to 14 days with pre-approval on Gold and Platinum plans.", answerAr: "التمريض المنزلي بعد الجراحة مغطى حتى 14 يوم", planTiers: ["gold", "platinum"], category: "home_care" },
  { question: "Are chronic disease medications covered?", questionAr: "هل أدوية الأمراض المزمنة مغطاة؟", answer: "Yes, medications for diabetes, hypertension, asthma, and other chronic conditions are covered under Chronic Conditions benefit.", answerAr: "نعم، أدوية الأمراض المزمنة مغطاة", planTiers: ["bronze", "silver", "gold", "platinum"], category: "chronic" },
  { question: "Is weight loss surgery covered?", questionAr: "هل جراحة إنقاص الوزن مغطاة؟", answer: "Bariatric surgery is covered only with BMI > 40 (or > 35 with comorbidities) and pre-approval. Not available on Bronze.", answerAr: "تغطى جراحة السمنة بشروط محددة", planTiers: ["silver", "gold", "platinum"], category: "surgery" },
  { question: "Can my family use my insurance?", questionAr: "هل يمكن لعائلتي استخدام تأميني؟", answer: "Dependents (spouse and children under 26) listed on your policy are covered. Check your policy for dependent details.", answerAr: "المعالون المدرجون في وثيقتك مغطون", planTiers: ["bronze", "silver", "gold", "platinum"], category: "general" },
  { question: "Is allergy testing covered?", questionAr: "هل فحص الحساسية مغطى؟", answer: "Allergy testing is covered under Outpatient Visits when ordered by a physician.", answerAr: "فحص الحساسية مغطى عند طلب الطبيب", planTiers: ["bronze", "silver", "gold", "platinum"], category: "diagnostic" },
  { question: "Are lab tests covered without referral?", questionAr: "هل التحاليل مغطاة بدون تحويل؟", answer: "Lab tests ordered by your treating physician are covered. Self-requested labs are not covered.", answerAr: "التحاليل المطلوبة من الطبيب مغطاة", planTiers: ["bronze", "silver", "gold", "platinum"], category: "diagnostic" },
  { question: "Is hearing aid covered?", questionAr: "هل سماعة الأذن مغطاة؟", answer: "Hearing aids are covered up to 5,000 SAR once every 3 years on Gold and Platinum plans.", answerAr: "سماعات الأذن مغطاة حتى 5,000 ريال", planTiers: ["gold", "platinum"], category: "specialist" },
  { question: "Does my plan cover diabetes supplies?", questionAr: "هل خطتي تغطي مستلزمات السكري؟", answer: "Glucose monitors, test strips, insulin syringes, and pumps are covered under Chronic Conditions benefit.", answerAr: "مستلزمات السكري مغطاة ضمن الأمراض المزمنة", planTiers: ["bronze", "silver", "gold", "platinum"], category: "chronic" },
  { question: "Is childbirth class covered?", questionAr: "هل دورة الإعداد للولادة مغطاة؟", answer: "Prenatal classes are not covered as a standard benefit. Check with your employer for wellness program options.", answerAr: "دورات ما قبل الولادة غير مغطاة كمنفعة قياسية", planTiers: [], category: "maternity" },
  { question: "Can I get speech therapy?", questionAr: "هل يمكنني الحصول على علاج النطق؟", answer: "Speech therapy is covered under Rehabilitation benefit with referral, up to 12 sessions/year on Gold.", answerAr: "علاج النطق مغطى ضمن إعادة التأهيل بتحويل", planTiers: ["gold", "platinum"], category: "rehabilitation" },
  { question: "Is ambulance service covered?", questionAr: "هل خدمة الإسعاف مغطاة؟", answer: "Emergency ambulance transport is covered at 0% copay for all plan tiers.", answerAr: "نقل الإسعاف الطارئ مغطى بدون تحمل", planTiers: ["bronze", "silver", "gold", "platinum"], category: "emergency" },
  { question: "Are annual health checkups covered?", questionAr: "هل الفحص الطبي السنوي مغطى؟", answer: "One comprehensive annual health checkup is covered at 0% copay for all plans.", answerAr: "فحص صحي شامل واحد سنوياً مغطى", planTiers: ["bronze", "silver", "gold", "platinum"], category: "preventive" },
  { question: "Is acupuncture covered?", questionAr: "هل الوخز بالإبر مغطى؟", answer: "Alternative medicine including acupuncture is not covered under standard CHI-compliant plans.", answerAr: "الطب البديل غير مغطى في الخطط القياسية", planTiers: [], category: "alternative" },
  { question: "Can I refill prescriptions online?", questionAr: "هل يمكنني تجديد الوصفات إلكترونياً؟", answer: "Yes, chronic medication refills can be done through your insurer's app or approved pharmacies.", answerAr: "نعم، يمكن تجديد أدوية الأمراض المزمنة إلكترونياً", planTiers: ["bronze", "silver", "gold", "platinum"], category: "pharmacy" },
  { question: "Is telemedicine covered?", questionAr: "هل الاستشارة عن بعد مغطاة؟", answer: "Virtual consultations are covered as outpatient visits with the same copay. Available 24/7 through your insurer.", answerAr: "الاستشارات الافتراضية مغطاة كزيارات خارجية", planTiers: ["bronze", "silver", "gold", "platinum"], category: "general" },
  { question: "Is organ transplant covered?", questionAr: "هل زراعة الأعضاء مغطاة؟", answer: "Organ transplant is covered up to 500,000 SAR with pre-approval on Gold and Platinum. Not covered on Bronze/Silver.", answerAr: "زراعة الأعضاء مغطاة حتى 500,000 ريال بموافقة مسبقة", planTiers: ["gold", "platinum"], category: "surgery" },
];
