import pg from "pg";
const { Client } = pg;
import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env file manually
const envPath = resolve(process.cwd(), ".env");
const envContent = readFileSync(envPath, "utf-8");
envContent.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split("=");
    if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join("=").trim();
    }
});

const providers = [
    { id: "FAC-001", name: "King Faisal Specialist Hospital" },
    { id: "FAC-002", name: "Saudi German Hospital Riyadh" },
    { id: "FAC-003", name: "Mouwasat Hospital Dammam" },
    { id: "FAC-004", name: "Al Noor Polyclinic Jeddah" },
    { id: "FAC-005", name: "Dr. Sulaiman Al Habib Medical Center" },
];

const categories = [
    "Cardiac", "Orthopedic", "Emergency", "Pharmacy", "General Surgery",
    "Oncology", "Neurology", "Pediatrics", "Internal Medicine", "Radiology"
];

const claimTypes = ["Inpatient", "Outpatient", "Emergency", "Pharmacy"];
const statuses = ["approved", "denied", "pending", "flagged", "under_review"];

const diagnosisCodes = [
    "I25.10", "M54.5", "J06.9", "K21.0", "E11.9", "I10", "F32.9", "G43.909",
    "M79.3", "J18.9", "K59.00", "N39.0", "R10.9", "S72.001A", "Z23"
];

const cptCodes = [
    "99213", "99214", "99215", "99283", "99284", "99285", "71046", "73030",
    "20610", "36415", "93000", "97110", "99232", "99223", "43239"
];

// Service line items catalog for realistic claim services
const servicesCatalog = {
    inpatient: [
        { code: "99223", description: "Hospital admission - comprehensive", minPrice: 800, maxPrice: 2500 },
        { code: "99232", description: "Subsequent hospital care - moderate", minPrice: 300, maxPrice: 800 },
        { code: "99238", description: "Hospital discharge day management", minPrice: 200, maxPrice: 500 },
        { code: "36430", description: "Blood transfusion service", minPrice: 1500, maxPrice: 4000 },
        { code: "43239", description: "Upper GI endoscopy with biopsy", minPrice: 3000, maxPrice: 8000 },
        { code: "27447", description: "Total knee replacement arthroplasty", minPrice: 25000, maxPrice: 60000 },
        { code: "33533", description: "Coronary artery bypass graft", minPrice: 80000, maxPrice: 150000 },
        { code: "47562", description: "Laparoscopic cholecystectomy", minPrice: 15000, maxPrice: 35000 },
        { code: "99291", description: "Critical care - first hour", minPrice: 2000, maxPrice: 5000 },
        { code: "94003", description: "Ventilation management - initial", minPrice: 400, maxPrice: 1000 },
    ],
    outpatient: [
        { code: "99213", description: "Office visit - established patient, low complexity", minPrice: 150, maxPrice: 350 },
        { code: "99214", description: "Office visit - established patient, moderate complexity", minPrice: 250, maxPrice: 500 },
        { code: "99215", description: "Office visit - established patient, high complexity", minPrice: 400, maxPrice: 700 },
        { code: "93000", description: "Electrocardiogram (ECG) complete", minPrice: 100, maxPrice: 300 },
        { code: "71046", description: "Chest X-ray, 2 views", minPrice: 200, maxPrice: 500 },
        { code: "80053", description: "Comprehensive metabolic panel", minPrice: 80, maxPrice: 200 },
        { code: "85025", description: "Complete blood count with differential", minPrice: 50, maxPrice: 150 },
        { code: "81001", description: "Urinalysis with microscopy", minPrice: 30, maxPrice: 80 },
        { code: "36415", description: "Venipuncture for blood collection", minPrice: 20, maxPrice: 50 },
        { code: "97110", description: "Physical therapy - therapeutic exercises", minPrice: 120, maxPrice: 300 },
    ],
    emergency: [
        { code: "99284", description: "Emergency dept visit - moderate severity", minPrice: 600, maxPrice: 1500 },
        { code: "99285", description: "Emergency dept visit - high severity", minPrice: 1200, maxPrice: 3000 },
        { code: "99291", description: "Critical care - first hour", minPrice: 2000, maxPrice: 5000 },
        { code: "12001", description: "Simple wound repair - up to 2.5cm", minPrice: 300, maxPrice: 800 },
        { code: "12002", description: "Simple wound repair - 2.6 to 7.5cm", minPrice: 500, maxPrice: 1200 },
        { code: "70450", description: "CT scan head without contrast", minPrice: 800, maxPrice: 2000 },
        { code: "73030", description: "X-ray shoulder - complete", minPrice: 150, maxPrice: 400 },
        { code: "96374", description: "IV push injection - therapeutic/prophylactic", minPrice: 100, maxPrice: 250 },
        { code: "90471", description: "Immunization administration", minPrice: 50, maxPrice: 100 },
        { code: "J7120", description: "IV solution - Ringers lactate infusion", minPrice: 40, maxPrice: 120 },
    ],
    pharmacy: [
        { code: "J2540", description: "Injection, Penicillin G potassium", minPrice: 30, maxPrice: 80 },
        { code: "J0129", description: "Injection, Abatacept", minPrice: 1500, maxPrice: 3500 },
        { code: "J9035", description: "Injection, Bevacizumab", minPrice: 3000, maxPrice: 8000 },
        { code: "J1745", description: "Injection, Infliximab", minPrice: 2500, maxPrice: 6000 },
        { code: "J3301", description: "Injection, Triamcinolone acetonide", minPrice: 40, maxPrice: 120 },
        { code: "90686", description: "Flu vaccine, quadrivalent", minPrice: 50, maxPrice: 150 },
        { code: "J7050", description: "IV solution - normal saline 250ml", minPrice: 10, maxPrice: 40 },
        { code: "J2001", description: "Injection, Lidocaine", minPrice: 15, maxPrice: 50 },
    ]
};

const approvalStatuses = ["approved", "rejected", "pending", "modified"];
const adjudicationStatuses = ["approved", "denied", "pending", "partial"];

const violationTypes = [
    "Duplicate service on same date",
    "Service not covered under policy",
    "Exceeds maximum allowable charge",
    "Prior authorization required",
    "Documentation missing",
    "Medical necessity not established",
    "Frequency limit exceeded",
    "Invalid diagnosis code pairing",
];

function randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomAmount(min: number, max: number): string {
    return (Math.random() * (max - min) + min).toFixed(2);
}

function randomOutlierScore(): string {
    // 20% chance of high outlier score (> 0.7)
    if (Math.random() < 0.2) {
        return (0.7 + Math.random() * 0.3).toFixed(2);
    }
    return (Math.random() * 0.6).toFixed(2);
}

function randomDate(start: Date, end: Date): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateServicesForClaim(claimId: string, claimType: string, serviceDate: Date, isFlagged: boolean): any[] {
    const services: any[] = [];
    const catalogKey = claimType.toLowerCase() as keyof typeof servicesCatalog;
    const catalog = servicesCatalog[catalogKey] || servicesCatalog.outpatient;

    // Generate 2-6 services per claim based on claim type
    const numServices = claimType === "Inpatient" ?
        Math.floor(Math.random() * 4) + 3 :  // 3-6 for inpatient
        Math.floor(Math.random() * 3) + 2;   // 2-4 for others

    // Shuffle and pick services
    const shuffled = [...catalog].sort(() => 0.5 - Math.random());
    const selectedServices = shuffled.slice(0, numServices);

    for (let i = 0; i < selectedServices.length; i++) {
        const svc = selectedServices[i];
        const quantity = Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 2 : 1;
        const unitPrice = parseFloat(randomAmount(svc.minPrice, svc.maxPrice));
        const totalPrice = unitPrice * quantity;

        // Determine approval status
        let approvalStatus = "approved";
        let adjudicationStatus = "approved";
        let approvedAmount: number | null = totalPrice;
        let violations: string[] = [];
        let denialReason: string | null = null;

        // Higher chance of issues for flagged claims
        if (isFlagged && Math.random() < 0.4) {
            if (Math.random() < 0.5) {
                approvalStatus = "rejected";
                adjudicationStatus = "denied";
                approvedAmount = 0;
                violations = [randomFrom(violationTypes)];
                denialReason = violations[0];
            } else {
                approvalStatus = "modified";
                adjudicationStatus = "partial";
                approvedAmount = totalPrice * (0.5 + Math.random() * 0.3); // 50-80% approved
                violations = [randomFrom(violationTypes)];
            }
        } else if (Math.random() < 0.1) {
            // 10% chance for non-flagged claims to have issues
            approvalStatus = "pending";
            adjudicationStatus = "pending";
            approvedAmount = null;
        }

        services.push({
            id: randomUUID(),
            claimId,
            lineNumber: i + 1,
            serviceCode: svc.code,
            serviceCodeSystem: "CPT",
            serviceDescription: svc.description,
            serviceDate,
            quantity: quantity.toFixed(2),
            unitPrice: unitPrice.toFixed(2),
            totalPrice: totalPrice.toFixed(2),
            approvedAmount: approvedAmount !== null ? approvedAmount.toFixed(2) : null,
            adjudicationStatus,
            approvalStatus,
            violations,
            denialReason,
            modifiers: [],
            diagnosisPointers: [],
        });
    }

    return services;
}

async function seedClaims() {
    const connectionString = process.env.DATABASE_URL;
    // Supabase pooler (port 6543) doesn't support SSL, direct connection (port 5432) does
    const isPooler = connectionString?.includes(':6543');

    const client = new Client({
        connectionString,
        ssl: isPooler ? false : { rejectUnauthorized: false }
    });

    await client.connect();
    console.log("Connected to database");

    const claims = [];
    const allServices: any[] = [];
    const now = new Date();
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    for (let i = 0; i < 150; i++) {
        const provider = randomFrom(providers);
        const category = randomFrom(categories);
        const claimType = randomFrom(claimTypes);
        const status = randomFrom(statuses);
        const outlierScore = randomOutlierScore();
        const flagged = parseFloat(outlierScore) >= 0.7 || status === "flagged";
        const claimId = randomUUID();
        const serviceDate = randomDate(threeMonthsAgo, now);

        // Generate services for this claim
        const claimServices = generateServicesForClaim(claimId, claimType, serviceDate, flagged);
        allServices.push(...claimServices);

        // Calculate total from services
        const totalAmount = claimServices.reduce((sum, svc) => sum + parseFloat(svc.totalPrice), 0);

        claims.push({
            id: claimId,
            claimNumber: `CLM-${now.getFullYear()}-${String(i + 1).padStart(5, "0")}`,
            policyNumber: `POL-${Math.floor(100000 + Math.random() * 900000)}`,
            registrationDate: randomDate(threeMonthsAgo, now),
            claimType,
            hospital: provider.name,
            amount: totalAmount.toFixed(2),
            outlierScore,
            description: `${category} services - ${claimType} claim`,
            icd: randomFrom(diagnosisCodes),
            hasSurgery: claimType === "Inpatient" && Math.random() > 0.5 ? "Yes" : "No",
            surgeryFee: claimType === "Inpatient" && Math.random() > 0.5 ? randomAmount(5000, 80000) : null,
            hasIcu: claimType === "Inpatient" && Math.random() > 0.7 ? "Yes" : "No",
            lengthOfStay: claimType === "Inpatient" ? Math.floor(Math.random() * 14) + 1 : null,
            similarClaims: Math.floor(Math.random() * 50),
            similarClaimsInHospital: Math.floor(Math.random() * 20),
            providerId: provider.id,
            providerName: provider.name,
            patientId: `PAT-${Math.floor(1000 + Math.random() * 9000)}`,
            patientName: `Patient ${i + 1}`,
            serviceDate,
            status,
            category,
            flagged,
            flagReason: flagged ? `High outlier score: ${outlierScore}` : null,
            cptCodes: [randomFrom(cptCodes), randomFrom(cptCodes)],
            diagnosisCodes: [randomFrom(diagnosisCodes), randomFrom(diagnosisCodes)]
        });
    }

    console.log(`Prepared ${claims.length} claims and ${allServices.length} services for insertion`);

    // Insert claims
    for (const claim of claims) {
        try {
            await client.query(`
        INSERT INTO ihop.claims (
          id, claim_number, policy_number, registration_date, claim_type, hospital, amount, outlier_score,
          description, icd, has_surgery, surgery_fee, has_icu, length_of_stay, similar_claims, similar_claims_in_hospital,
          provider_id, provider_name, patient_id, patient_name, service_date, status, category, flagged, flag_reason, cpt_codes, diagnosis_codes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
        ON CONFLICT (id) DO UPDATE SET
          amount = EXCLUDED.amount,
          outlier_score = EXCLUDED.outlier_score,
          status = EXCLUDED.status,
          flagged = EXCLUDED.flagged,
          flag_reason = EXCLUDED.flag_reason
      `, [
                claim.id, claim.claimNumber, claim.policyNumber, claim.registrationDate, claim.claimType, claim.hospital,
                claim.amount, claim.outlierScore, claim.description, claim.icd, claim.hasSurgery, claim.surgeryFee,
                claim.hasIcu, claim.lengthOfStay, claim.similarClaims, claim.similarClaimsInHospital,
                claim.providerId, claim.providerName, claim.patientId, claim.patientName, claim.serviceDate,
                claim.status, claim.category, claim.flagged, claim.flagReason, claim.cptCodes, claim.diagnosisCodes
            ]);
        } catch (err) {
            console.error(`Error inserting claim ${claim.claimNumber}:`, err);
        }
    }

    console.log(`Successfully seeded ${claims.length} claims to ihop.claims`);

    // Insert services
    let servicesInserted = 0;
    for (const svc of allServices) {
        try {
            await client.query(`
        INSERT INTO ihop.fwa_claim_services (
          id, claim_id, line_number, service_code, service_code_system, service_description,
          service_date, quantity, unit_price, total_price, approved_amount,
          adjudication_status, approval_status, violations, denial_reason, modifiers, diagnosis_pointers
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        ON CONFLICT (id) DO NOTHING
      `, [
                svc.id, svc.claimId, svc.lineNumber, svc.serviceCode, svc.serviceCodeSystem, svc.serviceDescription,
                svc.serviceDate, svc.quantity, svc.unitPrice, svc.totalPrice, svc.approvedAmount,
                svc.adjudicationStatus, svc.approvalStatus, svc.violations, svc.denialReason, svc.modifiers, svc.diagnosisPointers
            ]);
            servicesInserted++;
        } catch (err) {
            console.error(`Error inserting service for claim ${svc.claimId}:`, err);
        }
    }

    console.log(`Successfully seeded ${servicesInserted} services to ihop.fwa_claim_services`);
    await client.end();
}

seedClaims().catch(console.error);
