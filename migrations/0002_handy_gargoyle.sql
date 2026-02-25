CREATE TYPE "public"."claim_document_type" AS ENUM('discharge_summary', 'lab_report', 'radiology_report', 'prescription', 'invoice', 'medical_record', 'referral_letter', 'prior_authorization', 'other');--> statement-breakpoint
CREATE TYPE "public"."fwa_detection_method" AS ENUM('rule_engine', 'statistical_learning', 'unsupervised_learning', 'rag_llm');--> statement-breakpoint
CREATE TYPE "public"."fwa_detection_run_status" AS ENUM('pending', 'running', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."fwa_rule_category" AS ENUM('upcoding', 'unbundling', 'phantom_billing', 'duplicate_claims', 'impossible_combinations', 'credential_mismatch', 'temporal_anomaly', 'geographic_anomaly', 'frequency_abuse', 'cost_outlier', 'service_mismatch', 'documentation_gap', 'network_violation', 'preauth_bypass', 'drug_abuse', 'lab_abuse', 'clinical_plausibility', 'provider_pattern', 'kickback', 'custom');--> statement-breakpoint
CREATE TYPE "public"."fwa_rule_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."rlhf_feedback_module" AS ENUM('fwa', 'claims');--> statement-breakpoint
CREATE TYPE "public"."weight_proposal_status" AS ENUM('pending', 'approved', 'rejected', 'applied');--> statement-breakpoint
CREATE TABLE "claim_documents" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" text,
	"claim_reference" text,
	"document_type" "claim_document_type" NOT NULL,
	"file_name" text NOT NULL,
	"file_size" integer,
	"mime_type" text,
	"ocr_text" text,
	"ocr_confidence" numeric(5, 2),
	"ocr_processed_at" timestamp,
	"extracted_diagnoses" text[],
	"extracted_procedures" text[],
	"extracted_dates" jsonb,
	"extracted_amounts" jsonb,
	"ai_comparison_result" jsonb,
	"uploaded_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "detection_engine_config" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_key" text NOT NULL,
	"method_id" text,
	"method_name" text,
	"method_description" text,
	"algorithm_name" text,
	"algorithm_description" text,
	"weight" numeric(4, 3) DEFAULT '0.25',
	"threshold" numeric(4, 2) DEFAULT '0.50',
	"is_enabled" boolean DEFAULT true,
	"parameters" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"updated_by" text DEFAULT 'system',
	CONSTRAINT "detection_engine_config_config_key_unique" UNIQUE("config_key")
);
--> statement-breakpoint
CREATE TABLE "fwa_analyzed_claims" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_reference" text NOT NULL,
	"batch_number" text,
	"batch_date" timestamp,
	"patient_id" text NOT NULL,
	"date_of_birth" timestamp,
	"gender" text,
	"is_newborn" boolean DEFAULT false,
	"is_chronic" boolean DEFAULT false,
	"is_pre_existing" boolean DEFAULT false,
	"policy_no" text,
	"policy_effective_date" timestamp,
	"policy_expiry_date" timestamp,
	"group_no" text,
	"provider_id" text NOT NULL,
	"practitioner_license" text,
	"specialty_code" text,
	"city" text,
	"provider_type" text,
	"claim_type" text,
	"claim_occurrence_date" timestamp,
	"claim_benefit_code" text,
	"length_of_stay" integer,
	"is_pre_authorized" boolean DEFAULT false,
	"authorization_id" text,
	"principal_diagnosis_code" text,
	"secondary_diagnosis_codes" text[],
	"claim_supporting_info" text,
	"service_type" text,
	"service_code" text,
	"service_description" text,
	"unit_price" numeric(12, 2),
	"quantity" integer,
	"total_amount" numeric(12, 2),
	"patient_share" numeric(12, 2),
	"original_status" text,
	"ai_status" text,
	"validation_results" jsonb,
	"embedding" text,
	"imported_at" timestamp DEFAULT now(),
	"source_file" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fwa_anomaly_clusters" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text,
	"cluster_id" integer NOT NULL,
	"cluster_type" text NOT NULL,
	"algorithm" text NOT NULL,
	"member_count" integer NOT NULL,
	"centroid" jsonb,
	"avg_anomaly_score" numeric(5, 2),
	"dominant_features" jsonb,
	"entity_type" text NOT NULL,
	"entity_ids" text[],
	"interpretation" text,
	"risk_level" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fwa_detection_configs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"method" "fwa_detection_method" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_enabled" boolean DEFAULT true,
	"weight" numeric(5, 2) DEFAULT '1.00',
	"threshold" numeric(5, 2) DEFAULT '0.70',
	"config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fwa_detection_results" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" text NOT NULL,
	"case_id" text,
	"provider_id" text,
	"patient_id" text,
	"composite_score" numeric(5, 2) NOT NULL,
	"composite_risk_level" "reconciliation_risk_level" DEFAULT 'low',
	"rule_engine_score" numeric(5, 2),
	"statistical_score" numeric(5, 2),
	"unsupervised_score" numeric(5, 2),
	"rag_llm_score" numeric(5, 2),
	"rule_engine_findings" jsonb DEFAULT '{"matchedRules":[],"totalRulesChecked":0,"violationCount":0}'::jsonb,
	"statistical_findings" jsonb DEFAULT '{"modelPrediction":0,"featureImportance":[],"peerComparison":{"mean":0,"stdDev":0,"zScore":0},"historicalTrend":"stable"}'::jsonb,
	"unsupervised_findings" jsonb DEFAULT '{"anomalyScore":0,"clusterAssignment":0,"clusterSize":0,"outlierReason":[],"isolationForestScore":0,"nearestClusterDistance":0}'::jsonb,
	"rag_llm_findings" jsonb DEFAULT '{"contextualAnalysis":"","similarCases":[],"knowledgeBaseMatches":[],"recommendation":"","confidence":0}'::jsonb,
	"primary_detection_method" "fwa_detection_method",
	"detection_summary" text,
	"recommended_action" text,
	"analyzed_at" timestamp DEFAULT now(),
	"analyzed_by" text DEFAULT 'system',
	"processing_time_ms" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fwa_detection_runs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_name" text NOT NULL,
	"run_type" text NOT NULL,
	"target_entity_type" text,
	"target_entity_id" text,
	"batch_id" text,
	"enabled_methods" text[] DEFAULT '{"rule_engine","statistical_learning","unsupervised_learning","rag_llm"}',
	"method_weights" jsonb DEFAULT '{"rule_engine":0.35,"statistical_learning":0.25,"unsupervised_learning":0.2,"rag_llm":0.2}'::jsonb,
	"status" "fwa_detection_run_status" DEFAULT 'pending',
	"total_claims" integer DEFAULT 0,
	"processed_claims" integer DEFAULT 0,
	"flagged_claims" integer DEFAULT 0,
	"avg_composite_score" numeric(5, 2),
	"high_risk_count" integer DEFAULT 0,
	"critical_risk_count" integer DEFAULT 0,
	"started_at" timestamp,
	"completed_at" timestamp,
	"processing_time_ms" integer,
	"error_message" text,
	"error_details" jsonb,
	"created_at" timestamp DEFAULT now(),
	"created_by" text DEFAULT 'system'
);
--> statement-breakpoint
CREATE TABLE "fwa_feature_store" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"claim_count" integer DEFAULT 0,
	"total_amount" numeric(18, 2),
	"avg_claim_amount" numeric(12, 2),
	"max_claim_amount" numeric(12, 2),
	"unique_patients" integer,
	"unique_providers" integer,
	"unique_doctors" integer,
	"unique_diagnoses" integer,
	"unique_services" integer,
	"avg_claims_per_day" numeric(8, 2),
	"weekend_claim_ratio" numeric(5, 4),
	"after_hours_ratio" numeric(5, 4),
	"avg_length_of_stay" numeric(6, 2),
	"inpatient_ratio" numeric(5, 4),
	"emergency_ratio" numeric(5, 4),
	"preauth_ratio" numeric(5, 4),
	"peer_group_id" text,
	"peer_mean" numeric(12, 2),
	"peer_std_dev" numeric(12, 2),
	"z_score" numeric(8, 4),
	"percentile_rank" integer,
	"rejection_rate" numeric(5, 4),
	"flag_rate" numeric(5, 4),
	"prior_fwa_count" integer,
	"velocity_score" numeric(5, 2),
	"diversity_score" numeric(5, 2),
	"consistency_score" numeric(5, 2),
	"computed_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fwa_rule_hits" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" text NOT NULL,
	"claim_id" text NOT NULL,
	"detection_result_id" text,
	"confidence" numeric(5, 2) NOT NULL,
	"matched_fields" jsonb,
	"explanation" text,
	"evidence_data" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fwa_rules_library" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_code" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" "fwa_rule_category" NOT NULL,
	"severity" "fwa_rule_severity" NOT NULL,
	"rule_type" text DEFAULT 'pattern' NOT NULL,
	"conditions" jsonb NOT NULL,
	"weight" numeric(5, 2) DEFAULT '1.00',
	"confidence_threshold" numeric(5, 2) DEFAULT '0.70',
	"min_occurrences" integer DEFAULT 1,
	"applicable_claim_types" text[],
	"applicable_specialties" text[],
	"applicable_provider_types" text[],
	"regulatory_reference" text,
	"evidence_requirements" text[],
	"is_active" boolean DEFAULT true,
	"is_system_rule" boolean DEFAULT false,
	"version" integer DEFAULT 1,
	"imported_from" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "fwa_rules_library_rule_code_unique" UNIQUE("rule_code")
);
--> statement-breakpoint
CREATE TABLE "rlhf_feedback" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module" "rlhf_feedback_module" NOT NULL,
	"case_id" text,
	"claim_id" text,
	"entity_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"agent_id" text,
	"phase" text,
	"adjudication_phase" integer,
	"ai_recommendation" jsonb,
	"human_action" text NOT NULL,
	"was_accepted" boolean DEFAULT false,
	"override_reason" text,
	"reviewer_notes" text,
	"reviewer_id" text,
	"outcome" text DEFAULT 'pending',
	"preference_score" integer DEFAULT 0,
	"curated_for_training" boolean DEFAULT false,
	"detection_method" text,
	"original_score" numeric(5, 2),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "weight_update_proposals" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"detection_method" text NOT NULL,
	"current_weight" numeric(4, 3) NOT NULL,
	"proposed_weight" numeric(4, 3) NOT NULL,
	"weight_delta" numeric(4, 3) NOT NULL,
	"feedback_count" integer NOT NULL,
	"acceptance_rate" numeric(5, 2) NOT NULL,
	"override_rate" numeric(5, 2) NOT NULL,
	"rationale" text NOT NULL,
	"evidence" jsonb,
	"status" "weight_proposal_status" DEFAULT 'pending',
	"reviewed_by" text,
	"reviewed_at" timestamp,
	"review_notes" text,
	"applied_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "fwa_anomaly_clusters" ADD CONSTRAINT "fwa_anomaly_clusters_run_id_fwa_detection_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."fwa_detection_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fwa_rule_hits" ADD CONSTRAINT "fwa_rule_hits_rule_id_fwa_rules_library_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."fwa_rules_library"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fwa_rule_hits" ADD CONSTRAINT "fwa_rule_hits_detection_result_id_fwa_detection_results_id_fk" FOREIGN KEY ("detection_result_id") REFERENCES "public"."fwa_detection_results"("id") ON DELETE no action ON UPDATE no action;