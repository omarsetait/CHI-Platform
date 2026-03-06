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

function generateServicesForClaim(claimId: string, claimType: string, serviceDate: Date | null, isFlagged: boolean): any[] {
    const services: any[] = [];
    const typeKey = (claimType || "outpatient").toLowerCase();
    const catalogKey = (typeKey === "inpatient" || typeKey === "outpatient" || typeKey === "emergency" || typeKey === "pharmacy")
        ? typeKey as keyof typeof servicesCatalog
        : "outpatient";
    const catalog = servicesCatalog[catalogKey];

    // Generate 2-6 services per claim based on claim type
    const numServices = catalogKey === "inpatient" ?
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
                approvedAmount = totalPrice * (0.5 + Math.random() * 0.3);
                violations = [randomFrom(violationTypes)];
            }
        } else if (Math.random() < 0.1) {
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
            serviceDate: serviceDate || new Date(),
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

async function seedServicesForExistingClaims() {
    const connectionString = process.env.DATABASE_URL;
    const isPooler = connectionString?.includes(':6543');

    const client = new Client({
        connectionString,
        ssl: isPooler ? false : { rejectUnauthorized: false }
    });

    await client.connect();
    console.log("Connected to database");

    // Get all claims that don't have services
    const claimsResult = await client.query(`
        SELECT c.id, c.claim_type, c.service_date, c.flagged
        FROM claims_v2 c
        LEFT JOIN fwa_claim_services s ON c.id = s.claim_id
        WHERE s.id IS NULL
    `);

    console.log(`Found ${claimsResult.rows.length} claims without services`);

    let servicesInserted = 0;
    for (const claim of claimsResult.rows) {
        const services = generateServicesForClaim(
            claim.id,
            claim.claim_type,
            claim.service_date,
            claim.flagged
        );

        for (const svc of services) {
            try {
                await client.query(`
                    INSERT INTO fwa_claim_services (
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
    }

    console.log(`Successfully added ${servicesInserted} services to existing claims`);
    await client.end();
}

seedServicesForExistingClaims().catch(console.error);
