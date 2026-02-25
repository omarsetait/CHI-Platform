import { db } from "../db";
import { claims, fwaClaimServices } from "@shared/schema";

const fwaViolationTypes = [
  { type: "upcoding", label: "Upcoding suspected", method: "rule_engine", severity: "high" },
  { type: "unbundling", label: "Unbundling detected", method: "rule_engine", severity: "high" },
  { type: "duplicate_billing", label: "Duplicate billing", method: "statistical", severity: "critical" },
  { type: "frequency_abuse", label: "Frequency exceeded", method: "statistical", severity: "medium" },
  { type: "phantom_billing", label: "Phantom services", method: "unsupervised", severity: "critical" },
  { type: "medical_necessity", label: "Medical necessity questioned", method: "rag_llm", severity: "medium" },
  { type: "modifier_misuse", label: "Modifier misuse", method: "rule_engine", severity: "medium" },
  { type: "excessive_charges", label: "Excessive charges", method: "unsupervised", severity: "high" },
  { type: "provider_collusion", label: "Collusion pattern", method: "unsupervised", severity: "critical" },
  { type: "credential_mismatch", label: "Credential mismatch", method: "rule_engine", severity: "high" },
];

const claimServiceTemplates = [
  { code: "99215", description: "Office visit, established patient, high complexity", unitPrice: 150, normalPrice: 95 },
  { code: "99214", description: "Office visit, established patient, moderate complexity", unitPrice: 120, normalPrice: 75 },
  { code: "99213", description: "Office visit, established patient, low complexity", unitPrice: 85, normalPrice: 55 },
  { code: "85025", description: "Complete blood count (CBC) with differential", unitPrice: 45, normalPrice: 25 },
  { code: "80053", description: "Comprehensive metabolic panel", unitPrice: 65, normalPrice: 40 },
  { code: "93000", description: "Electrocardiogram (ECG)", unitPrice: 120, normalPrice: 75 },
  { code: "71046", description: "Chest X-ray, 2 views", unitPrice: 180, normalPrice: 120 },
  { code: "36415", description: "Venipuncture blood draw", unitPrice: 35, normalPrice: 15 },
  { code: "20610", description: "Arthrocentesis, major joint", unitPrice: 250, normalPrice: 150 },
  { code: "11102", description: "Tangential biopsy of skin", unitPrice: 180, normalPrice: 100 },
  { code: "99283", description: "Emergency department visit, moderate", unitPrice: 350, normalPrice: 220 },
  { code: "99285", description: "Emergency department visit, high severity", unitPrice: 650, normalPrice: 450 },
  { code: "43239", description: "Upper GI endoscopy with biopsy", unitPrice: 1200, normalPrice: 850 },
  { code: "27447", description: "Total knee replacement", unitPrice: 25000, normalPrice: 18000 },
  { code: "33533", description: "Coronary artery bypass, single graft", unitPrice: 45000, normalPrice: 35000 },
];

const providers = [
  { id: "PRV-KSA-001", name: "King Fahd Medical City", city: "Riyadh", type: "Hospital", riskLevel: "medium" },
  { id: "PRV-KSA-002", name: "Dr. Sulaiman Al Habib", city: "Riyadh", type: "Hospital", riskLevel: "low" },
  { id: "PRV-KSA-003", name: "Saudi German Hospital", city: "Jeddah", type: "Hospital", riskLevel: "high" },
  { id: "PRV-KSA-004", name: "Al Mouwasat Hospital", city: "Dammam", type: "Hospital", riskLevel: "medium" },
  { id: "PRV-KSA-005", name: "Advanced Care Clinic", city: "Riyadh", type: "Clinic", riskLevel: "high" },
  { id: "PRV-KSA-006", name: "Gulf Medical Center", city: "Jeddah", type: "Clinic", riskLevel: "critical" },
  { id: "PRV-KSA-007", name: "Al Noor Specialist", city: "Mecca", type: "Hospital", riskLevel: "low" },
];

const patients = [
  { id: "PAT-KSA-1001", name: "محمد عبدالله الحربي", dob: "1978-05-12", gender: "male" },
  { id: "PAT-KSA-1002", name: "فاطمة أحمد السعيد", dob: "1985-03-22", gender: "female" },
  { id: "PAT-KSA-1003", name: "خالد سعود المطيري", dob: "1965-11-08", gender: "male" },
  { id: "PAT-KSA-1004", name: "نورة عبدالرحمن", dob: "1990-07-15", gender: "female" },
  { id: "PAT-KSA-1005", name: "عبدالعزيز محمد الشمري", dob: "1972-01-30", gender: "male" },
  { id: "PAT-KSA-1006", name: "سارة علي القحطاني", dob: "1988-09-18", gender: "female" },
  { id: "PAT-KSA-1007", name: "يوسف إبراهيم العتيبي", dob: "1955-04-25", gender: "male" },
  { id: "PAT-KSA-1008", name: "هند فهد الدوسري", dob: "1992-12-03", gender: "female" },
];

const diagnosisCodes = [
  { code: "I10", desc: "Essential hypertension" },
  { code: "E11.9", desc: "Type 2 diabetes without complications" },
  { code: "J18.9", desc: "Pneumonia, unspecified" },
  { code: "M54.5", desc: "Low back pain" },
  { code: "K21.0", desc: "GERD with esophagitis" },
  { code: "I21.0", desc: "STEMI of anterior wall" },
  { code: "J44.1", desc: "COPD with acute exacerbation" },
  { code: "N18.3", desc: "Chronic kidney disease, stage 3" },
  { code: "F32.9", desc: "Major depressive disorder" },
  { code: "G43.909", desc: "Migraine, unspecified" },
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateClaimServices(claimId: string, hasFwa: boolean, fwaTypes: string[]): any[] {
  const serviceCount = Math.floor(Math.random() * 5) + 2;
  const services: any[] = [];
  const usedCodes = new Set<string>();

  for (let i = 0; i < serviceCount; i++) {
    let template = randomElement(claimServiceTemplates);
    while (usedCodes.has(template.code) && usedCodes.size < claimServiceTemplates.length) {
      template = randomElement(claimServiceTemplates);
    }
    usedCodes.add(template.code);

    const qty = Math.floor(Math.random() * 3) + 1;
    const isViolation = hasFwa && Math.random() < 0.4;
    const violation = isViolation ? randomElement(fwaTypes) : null;
    
    let unitPrice = template.unitPrice;
    let adjudicationStatus = "approved";
    let approvalStatus = "approved";

    if (violation) {
      switch (violation) {
        case "upcoding":
          unitPrice = Math.round(template.unitPrice * (1.3 + Math.random() * 0.4));
          adjudicationStatus = "denied";
          approvalStatus = "rejected";
          break;
        case "unbundling":
          adjudicationStatus = "partial";
          approvalStatus = "modified";
          break;
        case "frequency_abuse":
          adjudicationStatus = "denied";
          approvalStatus = "rejected";
          break;
        case "duplicate_billing":
          adjudicationStatus = "denied";
          approvalStatus = "rejected";
          break;
        case "excessive_charges":
          unitPrice = Math.round(template.unitPrice * (1.5 + Math.random() * 0.5));
          adjudicationStatus = "partial";
          approvalStatus = "modified";
          break;
        default:
          adjudicationStatus = Math.random() > 0.5 ? "pending" : "denied";
          approvalStatus = Math.random() > 0.5 ? "pending" : "rejected";
      }
    }

    const totalPrice = unitPrice * qty;
    services.push({
      claimId,
      lineNumber: i + 1,
      serviceCode: template.code,
      serviceCodeSystem: "CPT",
      serviceDescription: template.description,
      serviceDate: new Date(),
      quantity: String(qty),
      unitPrice: String(unitPrice),
      totalPrice: String(totalPrice),
      approvedAmount: isViolation ? String(Math.round(totalPrice * 0.3)) : String(totalPrice),
      adjudicationStatus,
      approvalStatus,
      rejectionReason: isViolation ? fwaViolationTypes.find(v => v.type === violation)?.label : null,
      modifierCodes: [],
      createdAt: new Date(),
    });
  }

  return services;
}

export async function generateFwaBatch(batchSize: number = 100): Promise<{
  generated: number;
  withViolations: number;
  servicesGenerated: number;
  byMethod: Record<string, number>;
}> {
  console.log(`[FWA Batch] Generating ${batchSize} claims with diverse FWA patterns...`);
  
  const generatedClaims: any[] = [];
  const allServices: any[] = [];
  let withViolations = 0;
  const byMethod: Record<string, number> = {
    rule_engine: 0,
    statistical: 0,
    unsupervised: 0,
    rag_llm: 0,
    clean: 0,
  };

  const batchId = `BATCH-${Date.now().toString(36).toUpperCase()}`;

  for (let i = 0; i < batchSize; i++) {
    const provider = randomElement(providers);
    const patient = randomElement(patients);
    const diagnosis = randomElement(diagnosisCodes);
    
    const hasFwa = Math.random() < 0.35;
    const fwaType = hasFwa ? randomElement(fwaViolationTypes) : null;
    
    if (hasFwa && fwaType) {
      withViolations++;
      byMethod[fwaType.method]++;
    } else {
      byMethod.clean++;
    }

    const baseAmount = Math.random() * 50000 + 500;
    const amount = hasFwa ? baseAmount * (1.5 + Math.random()) : baseAmount;
    const outlierScore = hasFwa ? (0.7 + Math.random() * 0.29) : (Math.random() * 0.5);

    const claimId = `claim-fwa-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`;
    const claimNumber = `CLM-FWA-${new Date().getFullYear()}-${String(i + 1).padStart(5, "0")}`;

    const serviceDate = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000);

    const claim = {
      id: claimId,
      claimNumber,
      policyNumber: `POL-${Math.floor(Math.random() * 100000)}`,
      registrationDate: new Date(),
      claimType: randomElement(["Inpatient", "Outpatient", "Emergency", "Surgery", "Lab"]),
      hospital: provider.name,
      amount: String(Math.round(amount * 100) / 100),
      outlierScore: String(Math.round(outlierScore * 100) / 100),
      description: hasFwa 
        ? `${diagnosis.desc}. [FWA Indicator: ${fwaType?.label}]`
        : `${diagnosis.desc}. Standard care provided.`,
      icd: diagnosis.code,
      hasSurgery: Math.random() > 0.7 ? "Yes" : "No",
      surgeryFee: Math.random() > 0.7 ? String(Math.round(amount * 0.4)) : null,
      hasIcu: Math.random() > 0.8 ? "Yes" : "No",
      lengthOfStay: Math.floor(Math.random() * 14) + 1,
      similarClaims: Math.floor(Math.random() * 20),
      similarClaimsInHospital: Math.floor(Math.random() * 10),
      providerId: provider.id,
      providerName: provider.name,
      patientId: patient.id,
      patientName: patient.name,
      serviceDate,
      status: hasFwa 
        ? randomElement(["pending", "under_review", "rejected"])
        : randomElement(["approved", "approved", "approved", "pending"]),
      category: randomElement(["Surgery", "Consultation", "Therapy", "Diagnostics", "Emergency"]),
      flagged: hasFwa,
      flagReason: hasFwa ? fwaType?.label : null,
      cptCodes: [],
      diagnosisCodes: [diagnosis.code],
      principalDiagnosisCode: diagnosis.code,
      batchNumber: batchId,
    };

    generatedClaims.push(claim);

    const fwaTypes = hasFwa && fwaType ? [fwaType.type] : [];
    if (hasFwa && Math.random() > 0.6) {
      const additionalViolation = randomElement(fwaViolationTypes);
      if (additionalViolation.type !== fwaType?.type) {
        fwaTypes.push(additionalViolation.type);
      }
    }

    const services = generateClaimServices(claimId, hasFwa, fwaTypes);
    allServices.push(...services);
  }

  console.log(`[FWA Batch] Inserting ${generatedClaims.length} claims...`);
  const chunkSize = 50;
  for (let i = 0; i < generatedClaims.length; i += chunkSize) {
    const chunk = generatedClaims.slice(i, i + chunkSize);
    await db.insert(claims).values(chunk);
  }

  console.log(`[FWA Batch] Inserting ${allServices.length} claim services...`);
  for (let i = 0; i < allServices.length; i += chunkSize) {
    const chunk = allServices.slice(i, i + chunkSize);
    await db.insert(fwaClaimServices).values(chunk);
  }

  console.log(`[FWA Batch] Complete. Generated ${generatedClaims.length} claims, ${withViolations} with violations`);
  
  return {
    generated: generatedClaims.length,
    withViolations,
    servicesGenerated: allServices.length,
    byMethod,
  };
}

export async function getRandomClaimForAnalysis(): Promise<any> {
  const result = await db.select()
    .from(claims)
    .orderBy(claims.registrationDate)
    .limit(50);
  
  if (result.length === 0) return null;
  
  const claim = randomElement(result);
  
  const services = await db.select()
    .from(fwaClaimServices)
    .where(require("drizzle-orm").eq(fwaClaimServices.claimId, claim.id));

  return {
    ...claim,
    claimServices: services,
  };
}
