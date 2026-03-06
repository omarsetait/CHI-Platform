import { db } from "../db";
import { claims } from "@shared/schema";

const fwaPatterns = [
  { type: "upcoding", description: "Billing higher-cost procedures than performed" },
  { type: "unbundling", description: "Billing separately for bundled services" },
  { type: "phantom_billing", description: "Billing for services not rendered" },
  { type: "duplicate_billing", description: "Multiple bills for same service" },
  { type: "kickback_scheme", description: "Referral fee arrangements" },
  { type: "doctor_shopping", description: "Multiple providers for same condition" },
  { type: "prescription_fraud", description: "Obtaining excessive medications" },
];

const claimTypes = ["Inpatient", "Outpatient", "Emergency", "Pharmacy", "Lab", "Radiology", "Surgery"];
const diagnosisCodes = ["J18.9", "M54.5", "K21.0", "I10", "E11.9", "F32.9", "G43.909", "J06.9", "Z23"];
const cptCodes = ["99213", "99214", "99215", "99232", "99233", "99283", "99284", "99285", "36415", "80053"];
const specialties = ["Cardiology", "Orthopedics", "Internal Medicine", "General Surgery", "Radiology", "Neurology"];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Generate clustered providers - some are high-risk
const providers = Array.from({ length: 50 }, (_, i) => ({
  id: `PRV-GEN-${String(i + 1).padStart(4, "0")}`,
  specialty: specialties[i % specialties.length],
  fraudProbability: i < 8 ? 0.8 : i < 15 ? 0.4 : 0.05,
}));

const patients = Array.from({ length: 150 }, (_, i) => ({
  id: `PAT-GEN-${String(i + 1).padStart(5, "0")}`,
  doctorShoppingRisk: i < 20 ? 0.7 : 0.05,
}));

const doctors = Array.from({ length: 25 }, (_, i) => ({
  id: `DOC-GEN-${String(i + 1).padStart(4, "0")}`,
}));

export async function generateTestClaims(count: number = 500): Promise<{ generated: number; fraudulent: number }> {
  console.log(`[TestGen] Generating ${count} test claims with FWA patterns...`);
  
  const generatedClaims: any[] = [];
  const now = new Date();
  let fraudulentCount = 0;
  
  for (let i = 0; i < count; i++) {
    const provider = randomElement(providers);
    const patient = randomElement(patients);
    const doctor = randomElement(doctors);
    
    // Determine if claim should be fraudulent based on provider risk
    const isFraudulent = Math.random() < provider.fraudProbability;
    const fwaPattern = isFraudulent ? randomElement(fwaPatterns) : null;
    
    if (isFraudulent) fraudulentCount++;
    
    const serviceDate = new Date(now.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000);
    
    // Fraudulent claims have higher amounts and specific patterns
    let amount: number;
    if (isFraudulent) {
      switch (fwaPattern?.type) {
        case "upcoding":
          amount = Math.round((Math.random() * 80000 + 20000) * 100) / 100;
          break;
        case "phantom_billing":
          amount = Math.round((Math.random() * 50000 + 15000) * 100) / 100;
          break;
        case "duplicate_billing":
          amount = Math.round((Math.random() * 30000 + 5000) * 100) / 100;
          break;
        default:
          amount = Math.round((Math.random() * 40000 + 10000) * 100) / 100;
      }
    } else {
      amount = Math.round((Math.random() * 8000 + 200) * 100) / 100;
    }
    
    const claim = {
      claimNumber: `CLM-GEN-${Date.now().toString(36).toUpperCase()}-${String(i).padStart(4, "0")}`,
      providerId: provider.id,
      memberId: patient.id,
      practitionerId: doctor.id,
      claimType: randomElement(claimTypes),
      serviceDate,
      registrationDate: new Date(serviceDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000),
      amount: String(amount),
      approvedAmount: isFraudulent ? String(Math.round(amount * 0.2 * 100) / 100) : String(Math.round(amount * 0.85 * 100) / 100),
      status: isFraudulent
        ? (Math.random() > 0.6 ? "rejected" : (Math.random() > 0.5 ? "pending" : "approved"))
        : (Math.random() > 0.1 ? "approved" : "pending"),
      primaryDiagnosis: randomElement(diagnosisCodes),
      cptCodes: [randomElement(cptCodes)],
      description: isFraudulent
        ? `[FWA:${fwaPattern?.type}] ${fwaPattern?.description}`
        : `Standard ${randomElement(claimTypes)} medical service`,
      specialty: provider.specialty,
      hospital: randomElement(["Hospital", "Clinic", "Lab", "Pharmacy", "Ambulatory Center"]),
    };
    
    generatedClaims.push(claim);
  }

  // Insert in batches
  const batchSize = 100;
  for (let i = 0; i < generatedClaims.length; i += batchSize) {
    const batch = generatedClaims.slice(i, i + batchSize);
    await db.insert(claims).values(batch);
    console.log(`[TestGen] Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(generatedClaims.length / batchSize)}`);
  }

  console.log(`[TestGen] Generated ${generatedClaims.length} claims (${fraudulentCount} fraudulent)`);
  return { generated: generatedClaims.length, fraudulent: fraudulentCount };
}
