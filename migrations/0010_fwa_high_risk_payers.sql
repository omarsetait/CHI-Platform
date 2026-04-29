-- Task #44: payer-side high-risk modeling parallel to providers/doctors/patients.
-- Idempotent (CREATE ... IF NOT EXISTS) so it is safe to apply on environments
-- where `drizzle-kit push` already created the tables, and on fresh databases.

CREATE TABLE IF NOT EXISTS "fwa_high_risk_payers" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
    "payer_id" text NOT NULL,
    "payer_name" text NOT NULL,
    "payer_type" text,
    "risk_score" numeric(5, 2) NOT NULL,
    "risk_level" "reconciliation_risk_level" DEFAULT 'medium',
    "total_claims" integer DEFAULT 0,
    "flagged_claims" integer DEFAULT 0,
    "denial_rate" numeric(5, 2),
    "avg_claim_amount" numeric(12, 2),
    "total_amount" numeric(12, 2),
    "total_exposure" numeric(12, 2),
    "unique_providers" integer DEFAULT 0,
    "unique_members" integer DEFAULT 0,
    "fwa_case_count" integer DEFAULT 0,
    "reasons" text[] DEFAULT '{}'::text[],
    "last_flagged_date" timestamp,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now(),
    CONSTRAINT "fwa_high_risk_payers_payer_id_unique" UNIQUE("payer_id")
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "fwa_high_risk_payers_risk_score_idx"
    ON "fwa_high_risk_payers" ("risk_score" DESC);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "fwa_high_risk_payers_risk_level_idx"
    ON "fwa_high_risk_payers" ("risk_level");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "fwa_payer_detection_results" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
    "payer_id" text NOT NULL,
    "batch_id" text,
    "run_id" text,
    "composite_score" numeric(5, 2) NOT NULL,
    "risk_level" "entity_risk_level" DEFAULT 'low',
    "rule_engine_score" numeric(5, 2),
    "statistical_score" numeric(5, 2),
    "unsupervised_score" numeric(5, 2),
    "rag_llm_score" numeric(5, 2),
    "semantic_score" numeric(5, 2),
    "aggregated_metrics" jsonb,
    "primary_detection_method" "fwa_detection_method",
    "detection_summary" text,
    "recommended_action" text,
    "analyzed_at" timestamp DEFAULT now(),
    "processing_time_ms" integer,
    "created_at" timestamp DEFAULT now(),
    "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "fwa_payer_detection_results_payer_id_idx"
    ON "fwa_payer_detection_results" ("payer_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "fwa_payer_detection_results_batch_id_idx"
    ON "fwa_payer_detection_results" ("batch_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "fwa_payer_timeline" (
    "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
    "payer_id" text NOT NULL,
    "batch_id" text NOT NULL,
    "batch_date" timestamp,
    "claim_count" integer DEFAULT 0,
    "total_amount" numeric(15, 2) DEFAULT '0',
    "avg_claim_amount" numeric(10, 2),
    "unique_providers" integer DEFAULT 0,
    "unique_members" integer DEFAULT 0,
    "flagged_claims_count" integer DEFAULT 0,
    "high_risk_claims_count" integer DEFAULT 0,
    "avg_risk_score" numeric(5, 2),
    "claim_count_change" numeric(8, 2),
    "amount_change" numeric(8, 2),
    "risk_score_change" numeric(5, 2),
    "trend_direction" text,
    "top_procedures" jsonb DEFAULT '[]'::jsonb,
    "top_diagnoses" jsonb DEFAULT '[]'::jsonb,
    "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "fwa_payer_timeline_payer_batch_uniq"
    ON "fwa_payer_timeline" ("payer_id", "batch_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "fwa_payer_timeline_batch_date_idx"
    ON "fwa_payer_timeline" ("batch_date" DESC);
