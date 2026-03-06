import { db } from "../db";
import { sql } from "drizzle-orm";

const ALLOWED_TABLES = new Set([
  // Claims & Pre-Auth
  "claims", "claims_v2", "pre_auth_claims", "pre_auth_decisions", "pre_auth_signals",
  // FWA
  "fwa_cases", "fwa_analysis_findings", "fwa_high_risk_providers",
  "fwa_high_risk_patients", "fwa_high_risk_doctors", "fwa_analyzed_claims",
  "fwa_rule_hits", "fwa_detection_results",
  // Provider
  "provider_complaints", "provider_directory", "provider_scorecards",
  "provider_rejections", "provider_drg_assessments", "provider_benchmarks",
  // Portal
  "portal_providers", "portal_insurers", "portal_regions",
  "portal_employers", "portal_members",
  // Intelligence
  "operational_findings_ledger", "evidence_packs",
  "enforcement_cases", "regulatory_circulars",
  // Members
  "member_coverage", "member_complaints", "coverage_lookups",
  // ML
  "ml_model_registry", "ml_claim_inference",
  // Reports
  "agent_reports", "agent_performance_metrics",
  // DRG
  "digital_twins",
]);

const BLOCKED_PATTERNS = [
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\b/i,
  /\b(INTO|SET)\b/i,
  /;\s*\w/,  // multiple statements
  /--/,       // SQL comments (potential injection)
  /\/\*/,     // block comments
];

export interface SqlGuardResult {
  allowed: boolean;
  reason?: string;
}

export function validateQuery(query: string): SqlGuardResult {
  const trimmed = query.trim();

  // Must start with SELECT
  if (!/^\s*SELECT\b/i.test(trimmed)) {
    return { allowed: false, reason: "Only SELECT queries are allowed" };
  }

  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { allowed: false, reason: `Query contains blocked pattern: ${pattern}` };
    }
  }

  // Extract table names (simplified -- checks FROM and JOIN clauses)
  const tablePattern = /\b(?:FROM|JOIN)\s+["']?(\w+)["']?/gi;
  let match;
  while ((match = tablePattern.exec(trimmed)) !== null) {
    const table = match[1].toLowerCase();
    if (!ALLOWED_TABLES.has(table)) {
      return { allowed: false, reason: `Table "${table}" is not in the allowed list` };
    }
  }

  return { allowed: true };
}

export async function executeSafeQuery(
  query: string,
  rowLimit = 100,
  timeoutMs = 5000
): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
  const validation = validateQuery(query);
  if (!validation.allowed) {
    throw new Error(`Query blocked: ${validation.reason}`);
  }

  // Add LIMIT if not present
  const limitedQuery = /\bLIMIT\b/i.test(query)
    ? query
    : `${query.replace(/;\s*$/, "")} LIMIT ${rowLimit}`;

  const result = await Promise.race([
    db.execute(sql.raw(limitedQuery)),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Query timeout exceeded")), timeoutMs)
    )
  ]);

  const rows = Array.isArray(result) ? result : (result as any).rows || [];
  return { rows: rows.slice(0, rowLimit), rowCount: rows.length };
}
