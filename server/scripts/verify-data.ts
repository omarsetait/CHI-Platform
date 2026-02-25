import pg from "pg";
const { Client } = pg;

async function verifyData() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const tables = [
            "ihop.fwa_cases",
            "ihop.pre_auth_claims",
            "ihop.provider_directory",
            "ihop.provider_benchmarks",
            "ihop.kpi_definitions",
            "ihop.claims"
        ];

        console.log("Verifying table counts in 'ihop' schema:");
        for (const table of tables) {
            const res = await client.query(`SELECT COUNT(*) FROM ${table}`);
            console.log(`${table}: ${res.rows[0].count} rows`);
        }
    } catch (err) {
        console.error("Verification error:", err);
    } finally {
        await client.end();
    }
}

verifyData();
