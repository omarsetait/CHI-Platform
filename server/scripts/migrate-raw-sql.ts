import fs from "fs";
import path from "path";

const files = [
    "server/db-indexes.ts",
    "server/db-constraints.ts"
];

const tables = [
    "fwa_cases", "fwa_analysis_findings", "fwa_categories", "fwa_actions", "fwa_behaviors",
    "pre_auth_claims", "pre_auth_signals", "pre_auth_decisions", "pre_auth_batches",
    "claim_ingest_items", "claim_ingest_batches", "provider_benchmarks",
    "operational_findings_ledger", "evidence_packs", "reconciliation_sessions",
    "patient_360", "provider_360", "doctor_360", "digital_twins", "ghost_runs",
    "collusion_rings", "audit_logs", "users", "agent_reports",
    "fwa_feedback_events", "claims_feedback_events", "agent_performance_metrics", "reconciliation_entities"
];

for (const file of files) {
    const filePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, "utf-8");

    for (const table of tables) {
        // Avoid double prefixing
        const regex = new RegExp(`(?<!ihop\\.)\\b${table}\\b`, 'g');
        content = content.replace(regex, `ihop.${table}`);
    }

    fs.writeFileSync(filePath, content);
    console.log(`Migrated ${file} to 'ihop' namespace`);
}
