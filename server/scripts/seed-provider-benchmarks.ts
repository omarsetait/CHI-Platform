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

// Provider benchmarks with realistic Saudi healthcare data
const providerBenchmarks = [
    {
        providerId: "a31f8512-8688-4325-9fcb-9aa5becc4f54",
        providerName: "King Faisal Specialist Hospital",
        memberCount: 45000,
        costPerMember: 1850,
        peerAvgCpm: 1450,
        percentile: 82,
        deviation: 27.6,
        anomalyScore: 75,
    },
    {
        providerId: "97817751-fb40-4c57-86e3-8e234a61132d",
        providerName: "Dallah Health Clinic",
        memberCount: 28000,
        costPerMember: 1320,
        peerAvgCpm: 1200,
        percentile: 68,
        deviation: 10.0,
        anomalyScore: 45,
    },
    {
        providerId: "c33c5199-671f-4a98-84c8-19f36727963a",
        providerName: "International Medical Center",
        memberCount: 35000,
        costPerMember: 1680,
        peerAvgCpm: 1380,
        percentile: 76,
        deviation: 21.7,
        anomalyScore: 65,
    },
    {
        providerId: "FAC-002",
        providerName: "Saudi German Hospital Riyadh",
        memberCount: 52000,
        costPerMember: 1520,
        peerAvgCpm: 1350,
        percentile: 72,
        deviation: 12.6,
        anomalyScore: 55,
    },
    {
        providerId: "FAC-001",
        providerName: "King Faisal Specialist Hospital",
        memberCount: 45000,
        costPerMember: 1850,
        peerAvgCpm: 1450,
        percentile: 82,
        deviation: 27.6,
        anomalyScore: 75,
    },
    {
        providerId: "FAC-003",
        providerName: "Mouwasat Hospital Dammam",
        memberCount: 22000,
        costPerMember: 1180,
        peerAvgCpm: 1100,
        percentile: 58,
        deviation: 7.3,
        anomalyScore: 35,
    },
    {
        providerId: "FAC-004",
        providerName: "Al Noor Polyclinic Jeddah",
        memberCount: 15000,
        costPerMember: 980,
        peerAvgCpm: 920,
        percentile: 52,
        deviation: 6.5,
        anomalyScore: 28,
    },
    {
        providerId: "FAC-005",
        providerName: "Dr. Sulaiman Al Habib Medical Center",
        memberCount: 62000,
        costPerMember: 1720,
        peerAvgCpm: 1400,
        percentile: 78,
        deviation: 22.9,
        anomalyScore: 68,
    },
];

async function seedBenchmarks() {
    const connectionString = process.env.DATABASE_URL;
    const isPooler = connectionString?.includes(':6543');

    const client = new Client({
        connectionString,
        ssl: isPooler ? false : { rejectUnauthorized: false }
    });

    await client.connect();
    console.log("Connected to database");

    for (const benchmark of providerBenchmarks) {
        try {
            // Calculate derived values
            const totalClaims = Math.floor(benchmark.memberCount * 0.45); // Avg 0.45 claims per member
            const avgClaimAmount = benchmark.costPerMember * 0.15; // ~15% of CPM per claim
            const claimsPerMember = totalClaims / benchmark.memberCount;
            const totalBilledAmount = benchmark.memberCount * benchmark.costPerMember;
            const totalPaidAmount = totalBilledAmount * 0.85; // 85% paid rate

            // Check if benchmark exists
            const existing = await client.query(
                `SELECT id FROM ihop.provider_benchmarks WHERE provider_id = $1`,
                [benchmark.providerId]
            );

            if (existing.rows.length > 0) {
                // Update existing benchmark
                await client.query(`
                    UPDATE ihop.provider_benchmarks SET
                        total_claims = $1,
                        total_billed_amount = $2,
                        total_paid_amount = $3,
                        member_count = $4,
                        cost_per_member = $5,
                        claims_per_member = $6,
                        avg_claim_amount = $7,
                        peer_percentile = $8,
                        deviation_from_peer = $9,
                        anomaly_score = $10,
                        updated_at = NOW()
                    WHERE provider_id = $11
                `, [
                    totalClaims,
                    totalBilledAmount.toFixed(2),
                    totalPaidAmount.toFixed(2),
                    benchmark.memberCount,
                    benchmark.costPerMember.toFixed(2),
                    claimsPerMember.toFixed(2),
                    avgClaimAmount.toFixed(2),
                    benchmark.percentile,
                    benchmark.deviation.toFixed(2),
                    benchmark.anomalyScore,
                    benchmark.providerId
                ]);
                console.log(`Updated benchmark for: ${benchmark.providerName}`);
            } else {
                // Insert new benchmark
                const periodStart = new Date();
                periodStart.setMonth(periodStart.getMonth() - 3);
                const periodEnd = new Date();

                await client.query(`
                    INSERT INTO ihop.provider_benchmarks (
                        id, provider_id, provider_name, peer_group_id,
                        period_start, period_end,
                        total_claims, total_billed_amount, total_paid_amount,
                        member_count, cost_per_member, claims_per_member, avg_claim_amount,
                        peer_percentile, deviation_from_peer, standard_deviations, anomaly_score
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                    ON CONFLICT (id) DO NOTHING
                `, [
                    randomUUID(),
                    benchmark.providerId,
                    benchmark.providerName,
                    null,  // peer_group_id
                    periodStart,
                    periodEnd,
                    totalClaims,
                    totalBilledAmount.toFixed(2),
                    totalPaidAmount.toFixed(2),
                    benchmark.memberCount,
                    benchmark.costPerMember.toFixed(2),
                    claimsPerMember.toFixed(2),
                    avgClaimAmount.toFixed(2),
                    benchmark.percentile,
                    benchmark.deviation.toFixed(2),
                    benchmark.deviation / 10, // Standard deviations
                    benchmark.anomalyScore
                ]);
                console.log(`Created benchmark for: ${benchmark.providerName}`);
            }
        } catch (err: any) {
            console.error(`Error seeding benchmark for ${benchmark.providerName}:`, err.message);
        }
    }

    console.log("\nBenchmark seeding complete!");
    await client.end();
}

seedBenchmarks().catch(console.error);
