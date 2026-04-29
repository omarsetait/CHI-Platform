/**
 * High-Risk Entity Recompute Service
 *
 * Aggregates claim-level FWA detection results into per-entity (provider,
 * doctor, member/patient, payer) risk scores, trends, and evidence and
 * persists them to the authoritative `fwa_high_risk_*` and
 * `fwa_*_timeline` tables.
 *
 * Design notes:
 * - Eventually consistent: runs as a background job after every ingestion
 *   (real or AI-generated) completes; not part of the per-claim hot path.
 * - Idempotent: uses UPSERT (ON CONFLICT) on the unique entity id columns
 *   for the high-risk seed tables, and a stable `(entityId, batchId)` key
 *   for timeline rows. Re-running with the same window or jobId produces
 *   the same result.
 * - Window scoping: callers may pass `jobId` (resolved to the job's
 *   started/completed timestamps) or an explicit `since`/`until` window.
 *   When neither is provided the recompute considers all claims (full
 *   refresh).
 */
import { db } from "../db";
import { sql } from "drizzle-orm";
import { fwaIngestJobs } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface RecomputeOptions {
  jobId?: string | null;
  since?: Date | string | null;
  until?: Date | string | null;
  /**
   * Stable per-recompute identifier used for timeline row dedup. When omitted
   * we derive one from `jobId` or fall back to a date-bucketed value so two
   * recomputes on the same day collapse to the same timeline row.
   */
  batchId?: string | null;
}

export interface RecomputePerEntityStats {
  upserted: number;
  flagged: number;
}

export interface RecomputeResult {
  jobId: string | null;
  batchId: string;
  window: { since: Date | null; until: Date | null };
  startedAt: string;
  completedAt: string;
  durationMs: number;
  providers: RecomputePerEntityStats;
  doctors: RecomputePerEntityStats;
  patients: RecomputePerEntityStats;
  payers: RecomputePerEntityStats;
  errors: Array<{ entity: string; message: string }>;
}

const RISK_LEVEL_BUCKETS = ["critical", "high", "medium", "low"] as const;
type RiskLevel = (typeof RISK_LEVEL_BUCKETS)[number];

// Buckets must align with the `reconciliation_risk_level` enum
// ('critical' | 'high' | 'medium' | 'low'). We collapse anything below the
// medium threshold to 'low' rather than introducing a 'minimal' bucket so
// the SQL UPSERT casts continue to type-check.
function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 40) return "critical";
  if (score >= 30) return "high";
  if (score >= 20) return "medium";
  return "low";
}

function trendFromChange(change: number): "increasing" | "decreasing" | "stable" {
  if (change > 5) return "increasing";
  if (change < -5) return "decreasing";
  return "stable";
}

function toDate(v: Date | string | null | undefined): Date | null {
  if (!v) return null;
  if (v instanceof Date) return Number.isFinite(v.getTime()) ? v : null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

async function resolveWindow(opts: RecomputeOptions): Promise<{ since: Date | null; until: Date | null; jobId: string | null }> {
  let since = toDate(opts.since);
  let until = toDate(opts.until);
  let jobId = opts.jobId ?? null;

  if (jobId && (!since || !until)) {
    const [job] = await db.select().from(fwaIngestJobs).where(eq(fwaIngestJobs.id, jobId)).limit(1);
    if (job) {
      since = since ?? toDate(job.startedAt);
      until = until ?? toDate(job.completedAt) ?? new Date();
    }
  }

  return { since, until, jobId };
}

function deriveBatchId(opts: RecomputeOptions, jobId: string | null): string {
  if (opts.batchId) return opts.batchId;
  if (jobId) return `recompute-${jobId}`;
  return `recompute-${new Date().toISOString().slice(0, 10)}`;
}

/**
 * Aggregate provider-level metrics from claims_v2 + fwa_detection_results,
 * then upsert into fwa_high_risk_providers and the provider timeline.
 */
async function recomputeProviders(window: { since: Date | null; until: Date | null }, batchId: string): Promise<RecomputePerEntityStats> {
  const since = window.since ? sql`${window.since.toISOString()}::timestamp` : sql`NULL`;
  const until = window.until ? sql`${window.until.toISOString()}::timestamp` : sql`NULL`;

  // The CTE collects per-provider aggregates across the *entire* claim history
  // (so the high-risk row reflects cumulative state) but the window is used
  // to decide which providers are in scope for this recompute pass.
  const inScopeFilter = window.since || window.until
    ? sql`ca.provider_id IN (
        SELECT DISTINCT c.provider_id FROM claims_v2 c
        WHERE c.provider_id IS NOT NULL AND c.provider_id != ''
          ${window.since ? sql`AND COALESCE(c.registration_date, c.service_date, c.created_at) >= ${since}` : sql``}
          ${window.until ? sql`AND COALESCE(c.registration_date, c.service_date, c.created_at) <= ${until}` : sql``}
      )`
    : sql`TRUE`;

  const upserted = await db.execute(sql`
    WITH claim_aggs AS (
      SELECT
        c.provider_id,
        COUNT(*)::int                                                     AS total_claims,
        COUNT(DISTINCT c.member_id)::int                                  AS unique_members,
        COUNT(DISTINCT c.practitioner_id)::int                            AS unique_doctors,
        COALESCE(SUM(c.amount::numeric), 0)::numeric                      AS total_amount,
        COALESCE(AVG(c.amount::numeric), 0)::numeric                      AS avg_claim_amount,
        SUM(CASE WHEN c.status ILIKE 'denied%' THEN 1 ELSE 0 END)::int    AS denied_claims,
        MAX(COALESCE(c.registration_date, c.service_date, c.created_at))  AS last_claim_date,
        MAX(c.provider_type)                                              AS provider_type,
        MAX(c.specialty)                                                  AS specialty,
        MAX(c.hospital)                                                   AS organization
      FROM claims_v2 c
      WHERE c.provider_id IS NOT NULL AND c.provider_id != ''
      GROUP BY c.provider_id
    ),
    detection_aggs AS (
      SELECT
        c.provider_id,
        COUNT(*) FILTER (WHERE dr.composite_risk_level IN ('high', 'critical'))::int AS flagged_claims,
        COUNT(*) FILTER (WHERE dr.composite_risk_level = 'critical')::int            AS critical_claims,
        COALESCE(AVG(dr.composite_score::numeric), 0)::numeric                       AS avg_score,
        MAX(dr.analyzed_at)                                                          AS last_flagged_date
      FROM fwa_detection_results dr
      JOIN claims_v2 c ON c.id = dr.claim_id
      WHERE c.provider_id IS NOT NULL AND c.provider_id != ''
      GROUP BY c.provider_id
    ),
    case_aggs AS (
      SELECT provider_id, COUNT(*)::int AS fwa_case_count
      FROM fwa_cases
      WHERE provider_id IS NOT NULL AND provider_id != ''
      GROUP BY provider_id
    ),
    provider_meta AS (
      SELECT id AS provider_id, name AS provider_name, provider_type, specialty, organization
      FROM providers
    )
    INSERT INTO fwa_high_risk_providers (
      provider_id, provider_name, provider_type, specialty, organization,
      risk_score, risk_level, total_claims, flagged_claims, denial_rate,
      avg_claim_amount, total_exposure, claims_per_month, fwa_case_count,
      reasons, last_flagged_date, updated_at
    )
    SELECT
      ca.provider_id,
      COALESCE(pm.provider_name, ca.provider_id)                AS provider_name,
      COALESCE(pm.provider_type, ca.provider_type)              AS provider_type,
      COALESCE(pm.specialty, ca.specialty)                      AS specialty,
      COALESCE(pm.organization, ca.organization)                AS organization,
      LEAST(100, GREATEST(0, COALESCE(da.avg_score, 0)))::numeric(5,2) AS risk_score,
      (CASE
        WHEN COALESCE(da.avg_score, 0) >= 40 THEN 'critical'
        WHEN COALESCE(da.avg_score, 0) >= 30 THEN 'high'
        WHEN COALESCE(da.avg_score, 0) >= 20 THEN 'medium'
        WHEN COALESCE(da.avg_score, 0) >= 10 THEN 'low'
        ELSE 'low'
      END)::reconciliation_risk_level                            AS risk_level,
      ca.total_claims,
      COALESCE(da.flagged_claims, 0)                            AS flagged_claims,
      CASE WHEN ca.total_claims > 0
        THEN ((ca.denied_claims::numeric * 100) / ca.total_claims)::numeric(5,2)
        ELSE 0::numeric(5,2)
      END                                                       AS denial_rate,
      ca.avg_claim_amount::numeric(12,2)                        AS avg_claim_amount,
      ca.total_amount::numeric(12,2)                            AS total_exposure,
      (ca.total_claims::numeric / 6)::numeric(10,2)             AS claims_per_month,
      COALESCE(cs.fwa_case_count, 0)                            AS fwa_case_count,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN COALESCE(da.flagged_claims, 0) > 0
          THEN COALESCE(da.flagged_claims, 0) || ' flagged claims detected' END,
        CASE WHEN COALESCE(da.avg_score, 0) >= 40
          THEN 'Critical composite risk score: ' || ROUND(da.avg_score, 1) || '%' END,
        CASE WHEN ca.total_amount > 500000
          THEN 'High exposure: SAR ' || ROUND(ca.total_amount)::text END,
        CASE WHEN ca.total_claims > 30
          THEN 'High volume: ' || ca.total_claims || ' claims' END
      ], NULL)                                                  AS reasons,
      COALESCE(da.last_flagged_date, ca.last_claim_date)        AS last_flagged_date,
      NOW()                                                     AS updated_at
    FROM claim_aggs ca
    LEFT JOIN detection_aggs da ON da.provider_id = ca.provider_id
    LEFT JOIN case_aggs cs      ON cs.provider_id = ca.provider_id
    LEFT JOIN provider_meta pm  ON pm.provider_id = ca.provider_id
    WHERE ${inScopeFilter}
    ON CONFLICT (provider_id) DO UPDATE SET
      provider_name     = EXCLUDED.provider_name,
      provider_type     = EXCLUDED.provider_type,
      specialty         = EXCLUDED.specialty,
      organization      = EXCLUDED.organization,
      risk_score        = EXCLUDED.risk_score,
      risk_level        = EXCLUDED.risk_level,
      total_claims      = EXCLUDED.total_claims,
      flagged_claims    = EXCLUDED.flagged_claims,
      denial_rate       = EXCLUDED.denial_rate,
      avg_claim_amount  = EXCLUDED.avg_claim_amount,
      total_exposure    = EXCLUDED.total_exposure,
      claims_per_month  = EXCLUDED.claims_per_month,
      fwa_case_count    = EXCLUDED.fwa_case_count,
      reasons           = EXCLUDED.reasons,
      last_flagged_date = EXCLUDED.last_flagged_date,
      updated_at        = NOW()
  `);

  // Upsert today's timeline row (idempotent on the synthetic batchId).
  await db.execute(sql`
    WITH base AS (
      SELECT
        c.provider_id,
        COUNT(*)::int                                                                AS claim_count,
        COALESCE(SUM(c.amount::numeric), 0)::numeric                                 AS total_amount,
        COALESCE(AVG(c.amount::numeric), 0)::numeric                                 AS avg_claim_amount,
        COUNT(DISTINCT c.member_id)::int                                             AS unique_patients,
        COUNT(DISTINCT c.practitioner_id)::int                                       AS unique_doctors,
        COUNT(*) FILTER (WHERE dr.composite_risk_level IN ('high', 'critical'))::int AS flagged_claims_count,
        COUNT(*) FILTER (WHERE dr.composite_risk_level = 'critical')::int            AS high_risk_claims_count,
        COALESCE(AVG(dr.composite_score::numeric), 0)::numeric(5,2)                  AS avg_risk_score
      FROM claims_v2 c
      LEFT JOIN fwa_detection_results dr ON dr.claim_id = c.id
      WHERE c.provider_id IS NOT NULL AND c.provider_id != ''
      GROUP BY c.provider_id
    ),
    prev AS (
      SELECT DISTINCT ON (provider_id)
        provider_id, claim_count AS prev_claim_count, total_amount AS prev_total_amount,
        avg_risk_score AS prev_avg_risk_score
      FROM fwa_provider_timeline
      WHERE batch_id <> ${batchId}
      ORDER BY provider_id, batch_date DESC NULLS LAST, created_at DESC NULLS LAST
    ),
    payload AS (
      SELECT
        b.*,
        CASE WHEN p.prev_claim_count > 0
          THEN (((b.claim_count - p.prev_claim_count)::numeric * 100) / p.prev_claim_count)::numeric(8,2)
          ELSE NULL END AS claim_count_change,
        CASE WHEN p.prev_total_amount > 0
          THEN (((b.total_amount - p.prev_total_amount) * 100) / p.prev_total_amount)::numeric(8,2)
          ELSE NULL END AS amount_change,
        (b.avg_risk_score - COALESCE(p.prev_avg_risk_score, 0))::numeric(5,2) AS risk_score_change,
        CASE
          WHEN (b.avg_risk_score - COALESCE(p.prev_avg_risk_score, 0)) > 5  THEN 'increasing'
          WHEN (b.avg_risk_score - COALESCE(p.prev_avg_risk_score, 0)) < -5 THEN 'decreasing'
          ELSE 'stable'
        END AS trend_direction
      FROM base b
      LEFT JOIN prev p ON p.provider_id = b.provider_id
    ),
    upsert_existing AS (
      UPDATE fwa_provider_timeline t SET
        batch_date           = NOW(),
        claim_count          = pl.claim_count,
        total_amount         = pl.total_amount,
        avg_claim_amount     = pl.avg_claim_amount,
        unique_patients      = pl.unique_patients,
        unique_doctors       = pl.unique_doctors,
        flagged_claims_count = pl.flagged_claims_count,
        high_risk_claims_count = pl.high_risk_claims_count,
        avg_risk_score       = pl.avg_risk_score,
        claim_count_change   = pl.claim_count_change,
        amount_change        = pl.amount_change,
        risk_score_change    = pl.risk_score_change,
        trend_direction      = pl.trend_direction
      FROM payload pl
      WHERE t.provider_id = pl.provider_id AND t.batch_id = ${batchId}
      RETURNING t.provider_id
    )
    INSERT INTO fwa_provider_timeline (
      provider_id, batch_id, batch_date, claim_count, total_amount,
      avg_claim_amount, unique_patients, unique_doctors,
      flagged_claims_count, high_risk_claims_count, avg_risk_score,
      claim_count_change, amount_change, risk_score_change, trend_direction
    )
    SELECT
      pl.provider_id, ${batchId}, NOW(), pl.claim_count, pl.total_amount,
      pl.avg_claim_amount, pl.unique_patients, pl.unique_doctors,
      pl.flagged_claims_count, pl.high_risk_claims_count, pl.avg_risk_score,
      pl.claim_count_change, pl.amount_change, pl.risk_score_change, pl.trend_direction
    FROM payload pl
    WHERE pl.provider_id NOT IN (SELECT provider_id FROM upsert_existing)
  `);

  const flaggedRow = await db.execute(sql`
    SELECT COUNT(*)::int AS cnt FROM fwa_high_risk_providers
    WHERE risk_level IN ('critical', 'high', 'medium')
  `);

  return {
    upserted: ((upserted as any).rowCount as number) ?? 0,
    flagged: parseInt(String((flaggedRow.rows?.[0] as any)?.cnt ?? 0)) || 0,
  };
}

async function recomputeDoctors(window: { since: Date | null; until: Date | null }, batchId: string): Promise<RecomputePerEntityStats> {
  const since = window.since ? sql`${window.since.toISOString()}::timestamp` : sql`NULL`;
  const until = window.until ? sql`${window.until.toISOString()}::timestamp` : sql`NULL`;

  const inScopeFilter = window.since || window.until
    ? sql`ca.doctor_id IN (
        SELECT DISTINCT c.practitioner_id FROM claims_v2 c
        WHERE c.practitioner_id IS NOT NULL AND c.practitioner_id != ''
          ${window.since ? sql`AND COALESCE(c.registration_date, c.service_date, c.created_at) >= ${since}` : sql``}
          ${window.until ? sql`AND COALESCE(c.registration_date, c.service_date, c.created_at) <= ${until}` : sql``}
      )`
    : sql`TRUE`;

  const upserted = await db.execute(sql`
    WITH claim_aggs AS (
      SELECT
        c.practitioner_id                                                AS doctor_id,
        COUNT(*)::int                                                    AS total_claims,
        COUNT(DISTINCT c.member_id)::int                                 AS unique_members,
        COUNT(DISTINCT c.provider_id)::int                               AS unique_providers,
        COALESCE(SUM(c.amount::numeric), 0)::numeric                     AS total_amount,
        COALESCE(AVG(c.amount::numeric), 0)::numeric                     AS avg_claim_amount,
        MAX(COALESCE(c.registration_date, c.service_date, c.created_at)) AS last_claim_date,
        MAX(c.specialty)                                                 AS specialty,
        MAX(c.hospital)                                                  AS organization
      FROM claims_v2 c
      WHERE c.practitioner_id IS NOT NULL AND c.practitioner_id != ''
      GROUP BY c.practitioner_id
    ),
    detection_aggs AS (
      SELECT
        c.practitioner_id AS doctor_id,
        COUNT(*) FILTER (WHERE dr.composite_risk_level IN ('high', 'critical'))::int AS flagged_claims,
        COALESCE(AVG(dr.composite_score::numeric), 0)::numeric                       AS avg_score,
        MAX(dr.analyzed_at)                                                          AS last_flagged_date
      FROM fwa_detection_results dr
      JOIN claims_v2 c ON c.id = dr.claim_id
      WHERE c.practitioner_id IS NOT NULL AND c.practitioner_id != ''
      GROUP BY c.practitioner_id
    ),
    case_aggs AS (
      -- fwa_cases doesn't carry a doctor/practitioner FK; bridge via claim
      SELECT c.practitioner_id AS doctor_id, COUNT(*)::int AS fwa_case_count
      FROM fwa_cases fc
      JOIN claims_v2 c ON c.id = fc.claim_id
      WHERE c.practitioner_id IS NOT NULL AND c.practitioner_id != ''
      GROUP BY c.practitioner_id
    ),
    doctor_meta AS (
      SELECT id AS doctor_id, name AS doctor_name, specialty, license_number
      FROM practitioners
    )
    INSERT INTO fwa_high_risk_doctors (
      doctor_id, doctor_name, specialty, license_number, organization,
      risk_score, risk_level, total_claims, flagged_claims,
      avg_claim_amount, total_exposure, fwa_case_count,
      reasons, last_flagged_date, updated_at
    )
    SELECT
      ca.doctor_id,
      COALESCE(dm.doctor_name, 'Dr. ' || ca.doctor_id)                  AS doctor_name,
      COALESCE(dm.specialty, ca.specialty)                              AS specialty,
      COALESCE(dm.license_number, ca.doctor_id)                         AS license_number,
      ca.organization                                                   AS organization,
      LEAST(100, GREATEST(0, COALESCE(da.avg_score, 0)))::numeric(5,2)  AS risk_score,
      (CASE
        WHEN COALESCE(da.avg_score, 0) >= 40 THEN 'critical'
        WHEN COALESCE(da.avg_score, 0) >= 30 THEN 'high'
        WHEN COALESCE(da.avg_score, 0) >= 20 THEN 'medium'
        WHEN COALESCE(da.avg_score, 0) >= 10 THEN 'low'
        ELSE 'low'
      END)::reconciliation_risk_level                                   AS risk_level,
      ca.total_claims,
      COALESCE(da.flagged_claims, 0)                                    AS flagged_claims,
      ca.avg_claim_amount::numeric(12,2)                                AS avg_claim_amount,
      ca.total_amount::numeric(12,2)                                    AS total_exposure,
      COALESCE(cs.fwa_case_count, 0)                                    AS fwa_case_count,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN COALESCE(da.flagged_claims, 0) > 0
          THEN COALESCE(da.flagged_claims, 0) || ' flagged claims detected' END,
        CASE WHEN COALESCE(da.avg_score, 0) >= 40
          THEN 'Critical composite risk score: ' || ROUND(da.avg_score, 1) || '%' END,
        CASE WHEN ca.total_amount > 100000
          THEN 'High exposure: SAR ' || ROUND(ca.total_amount)::text END
      ], NULL)                                                          AS reasons,
      COALESCE(da.last_flagged_date, ca.last_claim_date)                AS last_flagged_date,
      NOW()                                                             AS updated_at
    FROM claim_aggs ca
    LEFT JOIN detection_aggs da ON da.doctor_id = ca.doctor_id
    LEFT JOIN case_aggs cs      ON cs.doctor_id = ca.doctor_id
    LEFT JOIN doctor_meta dm    ON dm.doctor_id = ca.doctor_id
    WHERE ${inScopeFilter}
    ON CONFLICT (doctor_id) DO UPDATE SET
      doctor_name       = EXCLUDED.doctor_name,
      specialty         = EXCLUDED.specialty,
      license_number    = EXCLUDED.license_number,
      organization      = EXCLUDED.organization,
      risk_score        = EXCLUDED.risk_score,
      risk_level        = EXCLUDED.risk_level,
      total_claims      = EXCLUDED.total_claims,
      flagged_claims    = EXCLUDED.flagged_claims,
      avg_claim_amount  = EXCLUDED.avg_claim_amount,
      total_exposure    = EXCLUDED.total_exposure,
      fwa_case_count    = EXCLUDED.fwa_case_count,
      reasons           = EXCLUDED.reasons,
      last_flagged_date = EXCLUDED.last_flagged_date,
      updated_at        = NOW()
  `);

  await db.execute(sql`
    WITH base AS (
      SELECT
        c.practitioner_id AS doctor_id,
        COUNT(*)::int                                                                AS claim_count,
        COALESCE(SUM(c.amount::numeric), 0)::numeric                                 AS total_amount,
        COALESCE(AVG(c.amount::numeric), 0)::numeric                                 AS avg_claim_amount,
        COUNT(DISTINCT c.member_id)::int                                             AS unique_patients,
        COUNT(DISTINCT c.provider_id)::int                                           AS unique_providers,
        COUNT(*) FILTER (WHERE dr.composite_risk_level IN ('high', 'critical'))::int AS flagged_claims_count,
        COUNT(*) FILTER (WHERE dr.composite_risk_level = 'critical')::int            AS high_risk_claims_count,
        COALESCE(AVG(dr.composite_score::numeric), 0)::numeric(5,2)                  AS avg_risk_score
      FROM claims_v2 c
      LEFT JOIN fwa_detection_results dr ON dr.claim_id = c.id
      WHERE c.practitioner_id IS NOT NULL AND c.practitioner_id != ''
      GROUP BY c.practitioner_id
    ),
    prev AS (
      SELECT DISTINCT ON (doctor_id)
        doctor_id, claim_count AS prev_claim_count, total_amount AS prev_total_amount,
        avg_risk_score AS prev_avg_risk_score
      FROM fwa_doctor_timeline
      WHERE batch_id <> ${batchId}
      ORDER BY doctor_id, batch_date DESC NULLS LAST, created_at DESC NULLS LAST
    ),
    payload AS (
      SELECT
        b.*,
        CASE WHEN p.prev_claim_count > 0
          THEN (((b.claim_count - p.prev_claim_count)::numeric * 100) / p.prev_claim_count)::numeric(8,2)
          ELSE NULL END AS claim_count_change,
        CASE WHEN p.prev_total_amount > 0
          THEN (((b.total_amount - p.prev_total_amount) * 100) / p.prev_total_amount)::numeric(8,2)
          ELSE NULL END AS amount_change,
        (b.avg_risk_score - COALESCE(p.prev_avg_risk_score, 0))::numeric(5,2) AS risk_score_change,
        CASE
          WHEN (b.avg_risk_score - COALESCE(p.prev_avg_risk_score, 0)) > 5  THEN 'increasing'
          WHEN (b.avg_risk_score - COALESCE(p.prev_avg_risk_score, 0)) < -5 THEN 'decreasing'
          ELSE 'stable'
        END AS trend_direction
      FROM base b
      LEFT JOIN prev p ON p.doctor_id = b.doctor_id
    ),
    upsert_existing AS (
      UPDATE fwa_doctor_timeline t SET
        batch_date           = NOW(),
        claim_count          = pl.claim_count,
        total_amount         = pl.total_amount,
        avg_claim_amount     = pl.avg_claim_amount,
        unique_patients      = pl.unique_patients,
        unique_providers     = pl.unique_providers,
        flagged_claims_count = pl.flagged_claims_count,
        high_risk_claims_count = pl.high_risk_claims_count,
        avg_risk_score       = pl.avg_risk_score,
        claim_count_change   = pl.claim_count_change,
        amount_change        = pl.amount_change,
        risk_score_change    = pl.risk_score_change,
        trend_direction      = pl.trend_direction
      FROM payload pl
      WHERE t.doctor_id = pl.doctor_id AND t.batch_id = ${batchId}
      RETURNING t.doctor_id
    )
    INSERT INTO fwa_doctor_timeline (
      doctor_id, batch_id, batch_date, claim_count, total_amount,
      avg_claim_amount, unique_patients, unique_providers,
      flagged_claims_count, high_risk_claims_count, avg_risk_score,
      claim_count_change, amount_change, risk_score_change, trend_direction
    )
    SELECT
      pl.doctor_id, ${batchId}, NOW(), pl.claim_count, pl.total_amount,
      pl.avg_claim_amount, pl.unique_patients, pl.unique_providers,
      pl.flagged_claims_count, pl.high_risk_claims_count, pl.avg_risk_score,
      pl.claim_count_change, pl.amount_change, pl.risk_score_change, pl.trend_direction
    FROM payload pl
    WHERE pl.doctor_id NOT IN (SELECT doctor_id FROM upsert_existing)
  `);

  const flaggedRow = await db.execute(sql`
    SELECT COUNT(*)::int AS cnt FROM fwa_high_risk_doctors
    WHERE risk_level IN ('critical', 'high', 'medium')
  `);

  return {
    upserted: ((upserted as any).rowCount as number) ?? 0,
    flagged: parseInt(String((flaggedRow.rows?.[0] as any)?.cnt ?? 0)) || 0,
  };
}

async function recomputePatients(window: { since: Date | null; until: Date | null }, batchId: string): Promise<RecomputePerEntityStats> {
  const since = window.since ? sql`${window.since.toISOString()}::timestamp` : sql`NULL`;
  const until = window.until ? sql`${window.until.toISOString()}::timestamp` : sql`NULL`;

  const inScopeFilter = window.since || window.until
    ? sql`ca.patient_id IN (
        SELECT DISTINCT c.member_id FROM claims_v2 c
        WHERE c.member_id IS NOT NULL AND c.member_id != ''
          ${window.since ? sql`AND COALESCE(c.registration_date, c.service_date, c.created_at) >= ${since}` : sql``}
          ${window.until ? sql`AND COALESCE(c.registration_date, c.service_date, c.created_at) <= ${until}` : sql``}
      )`
    : sql`TRUE`;

  const upserted = await db.execute(sql`
    WITH claim_aggs AS (
      SELECT
        c.member_id                                                       AS patient_id,
        COUNT(*)::int                                                     AS total_claims,
        COUNT(DISTINCT c.provider_id)::int                                AS unique_providers,
        COUNT(DISTINCT c.practitioner_id)::int                            AS unique_doctors,
        COALESCE(SUM(c.amount::numeric), 0)::numeric                      AS total_amount,
        COALESCE(AVG(c.amount::numeric), 0)::numeric                      AS avg_claim_amount,
        MAX(COALESCE(c.registration_date, c.service_date, c.created_at))  AS last_claim_date,
        MAX(c.primary_diagnosis)                                          AS primary_diagnosis
      FROM claims_v2 c
      WHERE c.member_id IS NOT NULL AND c.member_id != ''
      GROUP BY c.member_id
    ),
    detection_aggs AS (
      SELECT
        c.member_id AS patient_id,
        COUNT(*) FILTER (WHERE dr.composite_risk_level IN ('high', 'critical'))::int AS flagged_claims,
        COALESCE(AVG(dr.composite_score::numeric), 0)::numeric                       AS avg_score,
        MAX(dr.analyzed_at)                                                          AS last_flagged_date
      FROM fwa_detection_results dr
      JOIN claims_v2 c ON c.id = dr.claim_id
      WHERE c.member_id IS NOT NULL AND c.member_id != ''
      GROUP BY c.member_id
    ),
    case_aggs AS (
      SELECT patient_id, COUNT(*)::int AS fwa_case_count
      FROM fwa_cases
      WHERE patient_id IS NOT NULL AND patient_id != ''
      GROUP BY patient_id
    ),
    member_meta AS (
      SELECT id AS member_id, name AS member_name FROM members
    )
    INSERT INTO fwa_high_risk_patients (
      patient_id, patient_name, member_id, risk_score, risk_level,
      total_claims, flagged_claims, total_amount, fwa_case_count,
      primary_diagnosis, reasons, last_claim_date, updated_at
    )
    SELECT
      ca.patient_id,
      COALESCE(mm.member_name, 'Member ' || ca.patient_id)              AS patient_name,
      ca.patient_id                                                     AS member_id,
      LEAST(100, GREATEST(0, COALESCE(da.avg_score, 0)))::numeric(5,2)  AS risk_score,
      (CASE
        WHEN COALESCE(da.avg_score, 0) >= 40 THEN 'critical'
        WHEN COALESCE(da.avg_score, 0) >= 30 THEN 'high'
        WHEN COALESCE(da.avg_score, 0) >= 20 THEN 'medium'
        WHEN COALESCE(da.avg_score, 0) >= 10 THEN 'low'
        ELSE 'low'
      END)::reconciliation_risk_level                                   AS risk_level,
      ca.total_claims,
      COALESCE(da.flagged_claims, 0)                                    AS flagged_claims,
      ca.total_amount::numeric(12,2)                                    AS total_amount,
      COALESCE(cs.fwa_case_count, 0)                                    AS fwa_case_count,
      ca.primary_diagnosis,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN COALESCE(da.flagged_claims, 0) > 0
          THEN COALESCE(da.flagged_claims, 0) || ' flagged claims detected' END,
        CASE WHEN COALESCE(ca.unique_providers, 0) > 5
          THEN 'Provider shopping suspected: ' || ca.unique_providers || ' providers' END,
        CASE WHEN ca.total_amount > 100000
          THEN 'High claim volume: SAR ' || ROUND(ca.total_amount)::text END
      ], NULL)                                                          AS reasons,
      COALESCE(da.last_flagged_date, ca.last_claim_date)                AS last_claim_date,
      NOW()                                                             AS updated_at
    FROM claim_aggs ca
    LEFT JOIN detection_aggs da ON da.patient_id = ca.patient_id
    LEFT JOIN case_aggs cs      ON cs.patient_id = ca.patient_id
    LEFT JOIN member_meta mm    ON mm.member_id = ca.patient_id
    WHERE ${inScopeFilter}
    ON CONFLICT (patient_id) DO UPDATE SET
      patient_name      = EXCLUDED.patient_name,
      member_id         = EXCLUDED.member_id,
      risk_score        = EXCLUDED.risk_score,
      risk_level        = EXCLUDED.risk_level,
      total_claims      = EXCLUDED.total_claims,
      flagged_claims    = EXCLUDED.flagged_claims,
      total_amount      = EXCLUDED.total_amount,
      fwa_case_count    = EXCLUDED.fwa_case_count,
      primary_diagnosis = EXCLUDED.primary_diagnosis,
      reasons           = EXCLUDED.reasons,
      last_claim_date   = EXCLUDED.last_claim_date,
      updated_at        = NOW()
  `);

  await db.execute(sql`
    WITH base AS (
      SELECT
        c.member_id AS patient_id,
        COUNT(*)::int                                                                AS claim_count,
        COALESCE(SUM(c.amount::numeric), 0)::numeric                                 AS total_amount,
        COALESCE(AVG(c.amount::numeric), 0)::numeric                                 AS avg_claim_amount,
        COUNT(DISTINCT c.provider_id)::int                                           AS unique_providers,
        COUNT(DISTINCT c.practitioner_id)::int                                       AS unique_doctors,
        COUNT(*) FILTER (WHERE dr.composite_risk_level IN ('high', 'critical'))::int AS flagged_claims_count,
        COUNT(*) FILTER (WHERE dr.composite_risk_level = 'critical')::int            AS high_risk_claims_count,
        COALESCE(AVG(dr.composite_score::numeric), 0)::numeric(5,2)                  AS avg_risk_score
      FROM claims_v2 c
      LEFT JOIN fwa_detection_results dr ON dr.claim_id = c.id
      WHERE c.member_id IS NOT NULL AND c.member_id != ''
      GROUP BY c.member_id
    ),
    prev AS (
      SELECT DISTINCT ON (patient_id)
        patient_id, claim_count AS prev_claim_count, total_amount AS prev_total_amount,
        avg_risk_score AS prev_avg_risk_score
      FROM fwa_patient_timeline
      WHERE batch_id <> ${batchId}
      ORDER BY patient_id, batch_date DESC NULLS LAST, created_at DESC NULLS LAST
    ),
    payload AS (
      SELECT
        b.*,
        CASE WHEN p.prev_claim_count > 0
          THEN (((b.claim_count - p.prev_claim_count)::numeric * 100) / p.prev_claim_count)::numeric(8,2)
          ELSE NULL END AS claim_count_change,
        CASE WHEN p.prev_total_amount > 0
          THEN (((b.total_amount - p.prev_total_amount) * 100) / p.prev_total_amount)::numeric(8,2)
          ELSE NULL END AS amount_change,
        (b.avg_risk_score - COALESCE(p.prev_avg_risk_score, 0))::numeric(5,2) AS risk_score_change,
        CASE
          WHEN (b.avg_risk_score - COALESCE(p.prev_avg_risk_score, 0)) > 5  THEN 'increasing'
          WHEN (b.avg_risk_score - COALESCE(p.prev_avg_risk_score, 0)) < -5 THEN 'decreasing'
          ELSE 'stable'
        END AS trend_direction
      FROM base b
      LEFT JOIN prev p ON p.patient_id = b.patient_id
    ),
    upsert_existing AS (
      UPDATE fwa_patient_timeline t SET
        batch_date           = NOW(),
        claim_count          = pl.claim_count,
        total_amount         = pl.total_amount,
        avg_claim_amount     = pl.avg_claim_amount,
        unique_providers     = pl.unique_providers,
        unique_doctors       = pl.unique_doctors,
        flagged_claims_count = pl.flagged_claims_count,
        high_risk_claims_count = pl.high_risk_claims_count,
        avg_risk_score       = pl.avg_risk_score,
        claim_count_change   = pl.claim_count_change,
        amount_change        = pl.amount_change,
        risk_score_change    = pl.risk_score_change,
        trend_direction      = pl.trend_direction
      FROM payload pl
      WHERE t.patient_id = pl.patient_id AND t.batch_id = ${batchId}
      RETURNING t.patient_id
    )
    INSERT INTO fwa_patient_timeline (
      patient_id, batch_id, batch_date, claim_count, total_amount,
      avg_claim_amount, unique_providers, unique_doctors,
      flagged_claims_count, high_risk_claims_count, avg_risk_score,
      claim_count_change, amount_change, risk_score_change, trend_direction
    )
    SELECT
      pl.patient_id, ${batchId}, NOW(), pl.claim_count, pl.total_amount,
      pl.avg_claim_amount, pl.unique_providers, pl.unique_doctors,
      pl.flagged_claims_count, pl.high_risk_claims_count, pl.avg_risk_score,
      pl.claim_count_change, pl.amount_change, pl.risk_score_change, pl.trend_direction
    FROM payload pl
    WHERE pl.patient_id NOT IN (SELECT patient_id FROM upsert_existing)
  `);

  const flaggedRow = await db.execute(sql`
    SELECT COUNT(*)::int AS cnt FROM fwa_high_risk_patients
    WHERE risk_level IN ('critical', 'high', 'medium')
  `);

  return {
    upserted: ((upserted as any).rowCount as number) ?? 0,
    flagged: parseInt(String((flaggedRow.rows?.[0] as any)?.cnt ?? 0)) || 0,
  };
}

/**
 * Payer recompute. Payer identity is derived from `claims_v2.insurer_id`,
 * with a fallback to `members.payer_id` when the claim doesn't carry one.
 */
async function recomputePayers(window: { since: Date | null; until: Date | null }, batchId: string): Promise<RecomputePerEntityStats> {
  const since = window.since ? sql`${window.since.toISOString()}::timestamp` : sql`NULL`;
  const until = window.until ? sql`${window.until.toISOString()}::timestamp` : sql`NULL`;

  const inScopeFilter = window.since || window.until
    ? sql`ca.payer_id IN (
        SELECT DISTINCT COALESCE(NULLIF(c.insurer_id, ''), m.payer_id) AS payer_id
        FROM claims_v2 c
        LEFT JOIN members m ON m.id = c.member_id
        WHERE COALESCE(NULLIF(c.insurer_id, ''), m.payer_id) IS NOT NULL
          ${window.since ? sql`AND COALESCE(c.registration_date, c.service_date, c.created_at) >= ${since}` : sql``}
          ${window.until ? sql`AND COALESCE(c.registration_date, c.service_date, c.created_at) <= ${until}` : sql``}
      )`
    : sql`TRUE`;

  const upserted = await db.execute(sql`
    WITH claim_aggs AS (
      SELECT
        COALESCE(NULLIF(c.insurer_id, ''), m.payer_id)                    AS payer_id,
        COUNT(*)::int                                                     AS total_claims,
        COUNT(DISTINCT c.provider_id)::int                                AS unique_providers,
        COUNT(DISTINCT c.member_id)::int                                  AS unique_members,
        COALESCE(SUM(c.amount::numeric), 0)::numeric                      AS total_amount,
        COALESCE(AVG(c.amount::numeric), 0)::numeric                      AS avg_claim_amount,
        SUM(CASE WHEN c.status ILIKE 'denied%' THEN 1 ELSE 0 END)::int    AS denied_claims,
        MAX(COALESCE(c.registration_date, c.service_date, c.created_at))  AS last_claim_date
      FROM claims_v2 c
      LEFT JOIN members m ON m.id = c.member_id
      WHERE COALESCE(NULLIF(c.insurer_id, ''), m.payer_id) IS NOT NULL
      GROUP BY COALESCE(NULLIF(c.insurer_id, ''), m.payer_id)
    ),
    detection_aggs AS (
      SELECT
        COALESCE(NULLIF(c.insurer_id, ''), m.payer_id)                                AS payer_id,
        COUNT(*) FILTER (WHERE dr.composite_risk_level IN ('high', 'critical'))::int  AS flagged_claims,
        COUNT(*) FILTER (WHERE dr.composite_risk_level = 'critical')::int             AS critical_claims,
        COALESCE(AVG(dr.composite_score::numeric), 0)::numeric                        AS avg_score,
        MAX(dr.analyzed_at)                                                           AS last_flagged_date
      FROM fwa_detection_results dr
      JOIN claims_v2 c ON c.id = dr.claim_id
      LEFT JOIN members m ON m.id = c.member_id
      WHERE COALESCE(NULLIF(c.insurer_id, ''), m.payer_id) IS NOT NULL
      GROUP BY COALESCE(NULLIF(c.insurer_id, ''), m.payer_id)
    ),
    case_aggs AS (
      -- fwa_cases doesn't carry a payer FK; bridge via claim
      SELECT
        COALESCE(NULLIF(c.insurer_id, ''), m.payer_id) AS payer_id,
        COUNT(*)::int AS fwa_case_count
      FROM fwa_cases fc
      JOIN claims_v2 c ON c.id = fc.claim_id
      LEFT JOIN members m ON m.id = c.member_id
      WHERE COALESCE(NULLIF(c.insurer_id, ''), m.payer_id) IS NOT NULL
      GROUP BY COALESCE(NULLIF(c.insurer_id, ''), m.payer_id)
    )
    INSERT INTO fwa_high_risk_payers (
      payer_id, payer_name, payer_type, risk_score, risk_level,
      total_claims, flagged_claims, denial_rate, avg_claim_amount,
      total_amount, total_exposure, unique_providers, unique_members,
      fwa_case_count, reasons, last_flagged_date, updated_at
    )
    SELECT
      ca.payer_id,
      ca.payer_id                                                       AS payer_name,
      'insurer'                                                         AS payer_type,
      LEAST(100, GREATEST(0, COALESCE(da.avg_score, 0)))::numeric(5,2)  AS risk_score,
      (CASE
        WHEN COALESCE(da.avg_score, 0) >= 40 THEN 'critical'
        WHEN COALESCE(da.avg_score, 0) >= 30 THEN 'high'
        WHEN COALESCE(da.avg_score, 0) >= 20 THEN 'medium'
        WHEN COALESCE(da.avg_score, 0) >= 10 THEN 'low'
        ELSE 'low'
      END)::reconciliation_risk_level                                   AS risk_level,
      ca.total_claims,
      COALESCE(da.flagged_claims, 0)                                    AS flagged_claims,
      CASE WHEN ca.total_claims > 0
        THEN ((ca.denied_claims::numeric * 100) / ca.total_claims)::numeric(5,2)
        ELSE 0::numeric(5,2)
      END                                                               AS denial_rate,
      ca.avg_claim_amount::numeric(12,2)                                AS avg_claim_amount,
      ca.total_amount::numeric(12,2)                                    AS total_amount,
      ca.total_amount::numeric(12,2)                                    AS total_exposure,
      ca.unique_providers,
      ca.unique_members,
      COALESCE(cs.fwa_case_count, 0)                                    AS fwa_case_count,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN COALESCE(da.flagged_claims, 0) > 0
          THEN COALESCE(da.flagged_claims, 0) || ' flagged claims across network' END,
        CASE WHEN COALESCE(da.avg_score, 0) >= 40
          THEN 'Critical aggregate risk score: ' || ROUND(da.avg_score, 1) || '%' END,
        CASE WHEN ca.denied_claims > 0 AND ca.total_claims > 0 AND
             (ca.denied_claims::numeric / ca.total_claims) > 0.15
          THEN 'Elevated denial rate: ' || ROUND((ca.denied_claims::numeric * 100) / ca.total_claims, 1) || '%' END,
        CASE WHEN ca.total_amount > 1000000
          THEN 'High exposure: SAR ' || ROUND(ca.total_amount)::text END
      ], NULL)                                                          AS reasons,
      COALESCE(da.last_flagged_date, ca.last_claim_date)                AS last_flagged_date,
      NOW()                                                             AS updated_at
    FROM claim_aggs ca
    LEFT JOIN detection_aggs da ON da.payer_id = ca.payer_id
    LEFT JOIN case_aggs cs      ON cs.payer_id = ca.payer_id
    WHERE ${inScopeFilter}
    ON CONFLICT (payer_id) DO UPDATE SET
      payer_name        = EXCLUDED.payer_name,
      payer_type        = EXCLUDED.payer_type,
      risk_score        = EXCLUDED.risk_score,
      risk_level        = EXCLUDED.risk_level,
      total_claims      = EXCLUDED.total_claims,
      flagged_claims    = EXCLUDED.flagged_claims,
      denial_rate       = EXCLUDED.denial_rate,
      avg_claim_amount  = EXCLUDED.avg_claim_amount,
      total_amount      = EXCLUDED.total_amount,
      total_exposure    = EXCLUDED.total_exposure,
      unique_providers  = EXCLUDED.unique_providers,
      unique_members    = EXCLUDED.unique_members,
      fwa_case_count    = EXCLUDED.fwa_case_count,
      reasons           = EXCLUDED.reasons,
      last_flagged_date = EXCLUDED.last_flagged_date,
      updated_at        = NOW()
  `);

  // Payer timeline upsert (idempotent on (payer_id, batch_id))
  await db.execute(sql`
    WITH base AS (
      SELECT
        COALESCE(NULLIF(c.insurer_id, ''), m.payer_id) AS payer_id,
        COUNT(*)::int                                                                AS claim_count,
        COALESCE(SUM(c.amount::numeric), 0)::numeric                                 AS total_amount,
        COALESCE(AVG(c.amount::numeric), 0)::numeric                                 AS avg_claim_amount,
        COUNT(DISTINCT c.provider_id)::int                                           AS unique_providers,
        COUNT(DISTINCT c.member_id)::int                                             AS unique_members,
        COUNT(*) FILTER (WHERE dr.composite_risk_level IN ('high', 'critical'))::int AS flagged_claims_count,
        COUNT(*) FILTER (WHERE dr.composite_risk_level = 'critical')::int            AS high_risk_claims_count,
        COALESCE(AVG(dr.composite_score::numeric), 0)::numeric(5,2)                  AS avg_risk_score
      FROM claims_v2 c
      LEFT JOIN members m ON m.id = c.member_id
      LEFT JOIN fwa_detection_results dr ON dr.claim_id = c.id
      WHERE COALESCE(NULLIF(c.insurer_id, ''), m.payer_id) IS NOT NULL
      GROUP BY COALESCE(NULLIF(c.insurer_id, ''), m.payer_id)
    ),
    prev AS (
      SELECT DISTINCT ON (payer_id)
        payer_id, claim_count AS prev_claim_count, total_amount AS prev_total_amount,
        avg_risk_score AS prev_avg_risk_score
      FROM fwa_payer_timeline
      WHERE batch_id <> ${batchId}
      ORDER BY payer_id, batch_date DESC NULLS LAST, created_at DESC NULLS LAST
    ),
    payload AS (
      SELECT
        b.*,
        CASE WHEN p.prev_claim_count > 0
          THEN (((b.claim_count - p.prev_claim_count)::numeric * 100) / p.prev_claim_count)::numeric(8,2)
          ELSE NULL END AS claim_count_change,
        CASE WHEN p.prev_total_amount > 0
          THEN (((b.total_amount - p.prev_total_amount) * 100) / p.prev_total_amount)::numeric(8,2)
          ELSE NULL END AS amount_change,
        (b.avg_risk_score - COALESCE(p.prev_avg_risk_score, 0))::numeric(5,2) AS risk_score_change,
        CASE
          WHEN (b.avg_risk_score - COALESCE(p.prev_avg_risk_score, 0)) > 5  THEN 'increasing'
          WHEN (b.avg_risk_score - COALESCE(p.prev_avg_risk_score, 0)) < -5 THEN 'decreasing'
          ELSE 'stable'
        END AS trend_direction
      FROM base b
      LEFT JOIN prev p ON p.payer_id = b.payer_id
    ),
    upsert_existing AS (
      UPDATE fwa_payer_timeline t SET
        batch_date           = NOW(),
        claim_count          = pl.claim_count,
        total_amount         = pl.total_amount,
        avg_claim_amount     = pl.avg_claim_amount,
        unique_providers     = pl.unique_providers,
        unique_members       = pl.unique_members,
        flagged_claims_count = pl.flagged_claims_count,
        high_risk_claims_count = pl.high_risk_claims_count,
        avg_risk_score       = pl.avg_risk_score,
        claim_count_change   = pl.claim_count_change,
        amount_change        = pl.amount_change,
        risk_score_change    = pl.risk_score_change,
        trend_direction      = pl.trend_direction
      FROM payload pl
      WHERE t.payer_id = pl.payer_id AND t.batch_id = ${batchId}
      RETURNING t.payer_id
    )
    INSERT INTO fwa_payer_timeline (
      payer_id, batch_id, batch_date, claim_count, total_amount,
      avg_claim_amount, unique_providers, unique_members,
      flagged_claims_count, high_risk_claims_count, avg_risk_score,
      claim_count_change, amount_change, risk_score_change, trend_direction
    )
    SELECT
      pl.payer_id, ${batchId}, NOW(), pl.claim_count, pl.total_amount,
      pl.avg_claim_amount, pl.unique_providers, pl.unique_members,
      pl.flagged_claims_count, pl.high_risk_claims_count, pl.avg_risk_score,
      pl.claim_count_change, pl.amount_change, pl.risk_score_change, pl.trend_direction
    FROM payload pl
    WHERE pl.payer_id NOT IN (SELECT payer_id FROM upsert_existing)
  `);

  const flaggedRow = await db.execute(sql`
    SELECT COUNT(*)::int AS cnt FROM fwa_high_risk_payers
    WHERE risk_level IN ('critical', 'high', 'medium')
  `);

  return {
    upserted: ((upserted as any).rowCount as number) ?? 0,
    flagged: parseInt(String((flaggedRow.rows?.[0] as any)?.cnt ?? 0)) || 0,
  };
}

/**
 * Coalesced single-flight runner.
 *
 * While one recompute is running, additional triggers do NOT just piggyback
 * on the in-flight promise — that would cause a real correctness gap when
 * multiple ingestion jobs finish in quick succession (job B's window/jobId
 * could be silently dropped while job A's recompute is still running).
 *
 * Instead, every trigger that arrives during an in-flight run is enqueued
 * into a single "pending" follow-up slot. When the current run finishes,
 * exactly one follow-up run is performed that covers ALL queued triggers.
 *
 * Coalescing rule for the follow-up:
 *   - If every queued trigger has identical options (e.g. the same jobId or
 *     all-empty), the follow-up runs with those options.
 *   - Otherwise, the follow-up runs with NO window (full refresh) so no
 *     entity / window is missed.
 *
 * This bounds the work to at most 2 runs per N triggers (current + one
 * coalesced follow-up) while guaranteeing every trigger's intent is honored.
 */
let inFlight: Promise<RecomputeResult> | null = null;
let pendingTriggers: RecomputeOptions[] = [];
let pendingPromise: Promise<RecomputeResult> | null = null;
let pendingResolve: ((r: RecomputeResult) => void) | null = null;
let pendingReject: ((e: unknown) => void) | null = null;

function coalesceOptions(triggers: RecomputeOptions[]): RecomputeOptions {
  if (triggers.length === 0) return {};
  if (triggers.length === 1) return triggers[0];
  // All identical → safe to reuse.
  const [first, ...rest] = triggers;
  const key = JSON.stringify({ jobId: first.jobId ?? null, since: first.since ?? null, until: first.until ?? null, batchId: first.batchId ?? null });
  const allSame = rest.every(t => JSON.stringify({ jobId: t.jobId ?? null, since: t.since ?? null, until: t.until ?? null, batchId: t.batchId ?? null }) === key);
  if (allSame) return first;
  // Mixed triggers → fall back to a full refresh so nothing is missed.
  return {};
}

export async function recomputeHighRiskEntities(opts: RecomputeOptions = {}): Promise<RecomputeResult> {
  if (inFlight) {
    pendingTriggers.push(opts);
    if (!pendingPromise) {
      pendingPromise = new Promise<RecomputeResult>((resolve, reject) => {
        pendingResolve = resolve;
        pendingReject = reject;
      });
    }
    return pendingPromise;
  }

  const startedAt = new Date();
  const run = (async (): Promise<RecomputeResult> => {
    const window = await resolveWindow(opts);
    const batchId = deriveBatchId(opts, window.jobId);
    const errors: Array<{ entity: string; message: string }> = [];

    const empty: RecomputePerEntityStats = { upserted: 0, flagged: 0 };
    let providers = empty;
    let doctors = empty;
    let patients = empty;
    let payers = empty;

    try { providers = await recomputeProviders(window, batchId); }
    catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      console.error("[HighRiskRecompute] providers failed:", m);
      errors.push({ entity: "providers", message: m });
    }
    try { doctors = await recomputeDoctors(window, batchId); }
    catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      console.error("[HighRiskRecompute] doctors failed:", m);
      errors.push({ entity: "doctors", message: m });
    }
    try { patients = await recomputePatients(window, batchId); }
    catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      console.error("[HighRiskRecompute] patients failed:", m);
      errors.push({ entity: "patients", message: m });
    }
    try { payers = await recomputePayers(window, batchId); }
    catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      console.error("[HighRiskRecompute] payers failed:", m);
      errors.push({ entity: "payers", message: m });
    }

    const completedAt = new Date();
    const result: RecomputeResult = {
      jobId: window.jobId,
      batchId,
      window: { since: window.since, until: window.until },
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs: completedAt.getTime() - startedAt.getTime(),
      providers,
      doctors,
      patients,
      payers,
      errors,
    };
    console.log(
      `[HighRiskRecompute] done jobId=${window.jobId ?? "-"} batch=${batchId} ` +
      `providers=${providers.upserted} doctors=${doctors.upserted} ` +
      `patients=${patients.upserted} payers=${payers.upserted} ` +
      `duration=${result.durationMs}ms errors=${errors.length}`
    );
    return result;
  })();

  inFlight = run;
  inFlight
    .catch(() => { /* swallow — caller of this run already gets the error */ })
    .finally(() => {
      inFlight = null;
      // Drain any triggers that arrived during this run by kicking off
      // exactly one coalesced follow-up run.
      if (pendingPromise && pendingResolve && pendingReject) {
        const triggers = pendingTriggers;
        const resolve = pendingResolve;
        const reject = pendingReject;
        pendingTriggers = [];
        pendingPromise = null;
        pendingResolve = null;
        pendingReject = null;
        const merged = coalesceOptions(triggers);
        recomputeHighRiskEntities(merged).then(resolve, reject);
      }
    });
  return inFlight;
}

// Re-export risk helpers for tests / callers that want the same buckets.
export { riskLevelFromScore, trendFromChange, RISK_LEVEL_BUCKETS };
