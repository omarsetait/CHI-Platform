CREATE TYPE "public"."audit_checklist_status" AS ENUM('pending', 'in_progress', 'completed', 'not_applicable', 'failed');--> statement-breakpoint
CREATE TYPE "public"."audit_finding_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."audit_finding_status" AS ENUM('draft', 'confirmed', 'disputed', 'resolved', 'referred_to_enforcement');--> statement-breakpoint
CREATE TYPE "public"."document_processing_status" AS ENUM('pending', 'extracting_text', 'chunking', 'generating_embeddings', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."entity_risk_level" AS ENUM('critical', 'high', 'medium', 'low', 'minimal');--> statement-breakpoint
CREATE TYPE "public"."knowledge_document_category" AS ENUM('medical_guideline', 'clinical_pathway', 'policy_violation', 'regulation', 'circular', 'contract', 'procedure_manual', 'training_material', 'other');--> statement-breakpoint
CREATE TYPE "public"."knowledge_document_type" AS ENUM('pdf', 'word', 'image', 'text', 'html', 'excel');--> statement-breakpoint
ALTER TYPE "public"."fwa_detection_method" ADD VALUE 'semantic_validation';--> statement-breakpoint
CREATE TABLE "audit_checklists" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_session_id" text NOT NULL,
	"category" text NOT NULL,
	"item_code" text NOT NULL,
	"description" text NOT NULL,
	"requirement" text,
	"status" "audit_checklist_status" DEFAULT 'pending',
	"result" text,
	"notes" text,
	"evidence_required" boolean DEFAULT false,
	"evidence_provided" boolean DEFAULT false,
	"assigned_to" text,
	"completed_by" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_findings" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_session_id" text NOT NULL,
	"finding_number" text NOT NULL,
	"category" text NOT NULL,
	"severity" "audit_finding_severity" NOT NULL,
	"status" "audit_finding_status" DEFAULT 'draft',
	"title" text NOT NULL,
	"description" text NOT NULL,
	"evidence" text,
	"recommendation" text,
	"linked_claim_ids" text[] DEFAULT '{}',
	"linked_detection_ids" text[] DEFAULT '{}',
	"potential_amount" numeric(14, 2),
	"regulatory_reference" text,
	"provider_response" text,
	"auditor_notes" text,
	"enforcement_case_id" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cpt_embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(10) NOT NULL,
	"cpt_long_descriptor" text,
	"primary_term" text,
	"keywords" text,
	"explainer_json" jsonb,
	"embedding_text" text,
	"enriched_text" text,
	"embedding" vector(1536),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "cpt_embeddings_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "detection_thresholds" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"threshold_key" text NOT NULL,
	"category" text NOT NULL,
	"entity_type" text,
	"warning_threshold" numeric(10, 4),
	"critical_threshold" numeric(10, 4),
	"display_name" text NOT NULL,
	"display_name_ar" text,
	"description" text,
	"description_ar" text,
	"unit" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 100,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "detection_thresholds_threshold_key_unique" UNIQUE("threshold_key")
);
--> statement-breakpoint
CREATE TABLE "embedding_import_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_type" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"total_records" integer DEFAULT 0,
	"processed_records" integer DEFAULT 0,
	"embedded_records" integer DEFAULT 0,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fwa_doctor_detection_results" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" text NOT NULL,
	"batch_id" text,
	"run_id" text,
	"composite_score" numeric(5, 2) NOT NULL,
	"risk_level" "entity_risk_level" DEFAULT 'low',
	"rule_engine_score" numeric(5, 2),
	"statistical_score" numeric(5, 2),
	"unsupervised_score" numeric(5, 2),
	"rag_llm_score" numeric(5, 2),
	"semantic_score" numeric(5, 2),
	"rule_engine_findings" jsonb DEFAULT '{"matchedRules":[],"prescribingPatterns":[],"violationCount":0}'::jsonb,
	"statistical_findings" jsonb,
	"unsupervised_findings" jsonb,
	"rag_llm_findings" jsonb,
	"semantic_findings" jsonb,
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
CREATE TABLE "fwa_doctor_timeline" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"batch_date" timestamp,
	"claim_count" integer DEFAULT 0,
	"total_amount" numeric(15, 2) DEFAULT '0',
	"avg_claim_amount" numeric(10, 2),
	"unique_patients" integer DEFAULT 0,
	"unique_providers" integer DEFAULT 0,
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
CREATE TABLE "fwa_patient_detection_results" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" text NOT NULL,
	"batch_id" text,
	"run_id" text,
	"composite_score" numeric(5, 2) NOT NULL,
	"risk_level" "entity_risk_level" DEFAULT 'low',
	"rule_engine_score" numeric(5, 2),
	"statistical_score" numeric(5, 2),
	"unsupervised_score" numeric(5, 2),
	"rag_llm_score" numeric(5, 2),
	"semantic_score" numeric(5, 2),
	"rule_engine_findings" jsonb DEFAULT '{"matchedRules":[],"utilizationPatterns":[],"violationCount":0}'::jsonb,
	"statistical_findings" jsonb,
	"unsupervised_findings" jsonb,
	"rag_llm_findings" jsonb,
	"semantic_findings" jsonb,
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
CREATE TABLE "fwa_patient_timeline" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"batch_date" timestamp,
	"claim_count" integer DEFAULT 0,
	"total_amount" numeric(15, 2) DEFAULT '0',
	"avg_claim_amount" numeric(10, 2),
	"unique_providers" integer DEFAULT 0,
	"unique_doctors" integer DEFAULT 0,
	"flagged_claims_count" integer DEFAULT 0,
	"high_risk_claims_count" integer DEFAULT 0,
	"avg_risk_score" numeric(5, 2),
	"claim_count_change" numeric(8, 2),
	"amount_change" numeric(8, 2),
	"risk_score_change" numeric(5, 2),
	"trend_direction" text,
	"top_diagnoses" jsonb DEFAULT '[]'::jsonb,
	"provider_list" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fwa_provider_detection_results" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" text NOT NULL,
	"batch_id" text,
	"run_id" text,
	"composite_score" numeric(5, 2) NOT NULL,
	"risk_level" "entity_risk_level" DEFAULT 'low',
	"rule_engine_score" numeric(5, 2),
	"statistical_score" numeric(5, 2),
	"unsupervised_score" numeric(5, 2),
	"rag_llm_score" numeric(5, 2),
	"semantic_score" numeric(5, 2),
	"rule_engine_findings" jsonb DEFAULT '{"matchedRules":[],"patterns":[],"violationCount":0}'::jsonb,
	"statistical_findings" jsonb,
	"unsupervised_findings" jsonb,
	"rag_llm_findings" jsonb,
	"semantic_findings" jsonb,
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
CREATE TABLE "fwa_provider_timeline" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" text NOT NULL,
	"batch_id" text NOT NULL,
	"batch_date" timestamp,
	"claim_count" integer DEFAULT 0,
	"total_amount" numeric(15, 2) DEFAULT '0',
	"avg_claim_amount" numeric(10, 2),
	"unique_patients" integer DEFAULT 0,
	"unique_doctors" integer DEFAULT 0,
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
CREATE TABLE "icd10_embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(20) NOT NULL,
	"description" text,
	"chapter" integer,
	"chapter_description" text,
	"section" text,
	"section_description" text,
	"parent_code" varchar(20),
	"depth" integer,
	"includes" text,
	"inclusion_terms" text,
	"excludes1" text,
	"excludes2" text,
	"embedding_text" text,
	"enriched_text" text,
	"embedding" vector(1536),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "icd10_embeddings_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "knowledge_chunks" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"content_ar" text,
	"token_count" integer,
	"page_number" integer,
	"section_title" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge_documents" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"original_filename" text NOT NULL,
	"file_type" "knowledge_document_type" NOT NULL,
	"category" "knowledge_document_category" NOT NULL,
	"title" text NOT NULL,
	"title_ar" text,
	"description" text,
	"description_ar" text,
	"source_authority" text,
	"effective_date" timestamp,
	"expiry_date" timestamp,
	"file_path" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" text NOT NULL,
	"extracted_text" text,
	"page_count" integer,
	"language" text DEFAULT 'ar',
	"processing_status" "document_processing_status" DEFAULT 'pending',
	"processing_error" text,
	"chunk_count" integer DEFAULT 0,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"uploaded_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "listening_source_configs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" text NOT NULL,
	"source_name" text NOT NULL,
	"source_name_ar" text,
	"enabled" boolean DEFAULT true,
	"keywords" text[] DEFAULT ARRAY[]::text[],
	"keywords_ar" text[] DEFAULT ARRAY[]::text[],
	"provider_names" text[] DEFAULT ARRAY[]::text[],
	"provider_names_ar" text[] DEFAULT ARRAY[]::text[],
	"api_endpoint" text,
	"api_supported" boolean DEFAULT false,
	"last_fetched_at" timestamp,
	"fetch_frequency_minutes" integer DEFAULT 60,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "member_feature_store" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" text NOT NULL,
	"member_name" text,
	"policy_number" text,
	"claim_count_7d" integer DEFAULT 0,
	"claim_count_30d" integer DEFAULT 0,
	"claim_count_60d" integer DEFAULT 0,
	"claim_count_90d" integer DEFAULT 0,
	"total_amount_30d" numeric(14, 2) DEFAULT '0',
	"avg_amount_30d" numeric(14, 2) DEFAULT '0',
	"max_amount_30d" numeric(14, 2) DEFAULT '0',
	"total_amount_90d" numeric(14, 2) DEFAULT '0',
	"unique_providers_30d" integer DEFAULT 0,
	"unique_providers_90d" integer DEFAULT 0,
	"unique_hospitals_30d" integer DEFAULT 0,
	"unique_diagnoses_30d" integer DEFAULT 0,
	"surgery_count_90d" integer DEFAULT 0,
	"icu_count_90d" integer DEFAULT 0,
	"total_los_90d" integer DEFAULT 0,
	"avg_los_30d" numeric(6, 2) DEFAULT '0',
	"high_utilizer_flag" boolean DEFAULT false,
	"doctor_shopping_flag" boolean DEFAULT false,
	"frequent_claimant_flag" boolean DEFAULT false,
	"days_since_last_claim" integer,
	"avg_days_between_claims" numeric(6, 2),
	"claim_frequency_trend" numeric(6, 4) DEFAULT '0',
	"isolation_forest_score" numeric(5, 4),
	"lof_score" numeric(6, 4),
	"autoencoder_error" numeric(8, 6),
	"composite_risk_score" numeric(5, 2),
	"last_calculated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ml_claim_inference" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" text NOT NULL,
	"claim_number" text,
	"feature_vector" jsonb DEFAULT '{}'::jsonb,
	"isolation_forest_score" numeric(5, 4),
	"isolation_forest_depth" numeric(6, 2),
	"lof_score" numeric(6, 4),
	"lof_neighborhood" integer,
	"dbscan_cluster" integer,
	"dbscan_is_noise" boolean DEFAULT false,
	"autoencoder_error" numeric(8, 6),
	"autoencoder_reconstructed" jsonb,
	"deep_learning_score" numeric(5, 4),
	"composite_anomaly_score" numeric(5, 2),
	"risk_level" text,
	"top_contributing_features" jsonb DEFAULT '[]'::jsonb,
	"peer_group_id" text,
	"peer_percentile" numeric(5, 2),
	"provider_risk_score" numeric(5, 2),
	"member_risk_score" numeric(5, 2),
	"anomaly_reasons" text[] DEFAULT ARRAY[]::text[],
	"human_explanation" text,
	"human_explanation_ar" text,
	"model_versions" jsonb DEFAULT '{}'::jsonb,
	"processing_time_ms" integer,
	"inferred_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ml_learned_patterns" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern_name" text NOT NULL,
	"pattern_name_ar" text,
	"pattern_type" text NOT NULL,
	"pattern_definition" jsonb,
	"claim_count" integer DEFAULT 0,
	"total_amount" numeric(14, 2) DEFAULT '0',
	"avg_risk_score" numeric(5, 2),
	"confirmation_rate" numeric(5, 4),
	"example_claim_ids" text[] DEFAULT ARRAY[]::text[],
	"is_active" boolean DEFAULT true,
	"discovered_at" timestamp DEFAULT now(),
	"last_seen_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ml_model_registry" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_name" text NOT NULL,
	"model_version" text NOT NULL,
	"model_type" text NOT NULL,
	"hyperparameters" jsonb DEFAULT '{}'::jsonb,
	"feature_list" text[] DEFAULT ARRAY[]::text[],
	"feature_count" integer DEFAULT 0,
	"trained_at" timestamp,
	"training_data_size" integer,
	"training_duration_ms" integer,
	"validation_score" numeric(6, 4),
	"silhouette_score" numeric(6, 4),
	"reconstruction_error" numeric(8, 6),
	"model_artifacts" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT false,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "peer_group_baselines" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_type" text NOT NULL,
	"group_key" text NOT NULL,
	"group_name" text,
	"group_name_ar" text,
	"provider_count" integer DEFAULT 0,
	"total_claims_count" integer DEFAULT 0,
	"avg_claim_amount" numeric(14, 2) DEFAULT '0',
	"median_claim_amount" numeric(14, 2) DEFAULT '0',
	"std_claim_amount" numeric(14, 2) DEFAULT '0',
	"p25_claim_amount" numeric(14, 2) DEFAULT '0',
	"p75_claim_amount" numeric(14, 2) DEFAULT '0',
	"p95_claim_amount" numeric(14, 2) DEFAULT '0',
	"avg_claims_per_month" numeric(10, 2) DEFAULT '0',
	"median_claims_per_month" numeric(10, 2) DEFAULT '0',
	"avg_denial_rate" numeric(5, 4) DEFAULT '0',
	"avg_flag_rate" numeric(5, 4) DEFAULT '0',
	"avg_weekend_ratio" numeric(5, 4) DEFAULT '0',
	"avg_los" numeric(6, 2) DEFAULT '0',
	"avg_surgery_rate" numeric(5, 4) DEFAULT '0',
	"calculated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "population_statistics" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature_name" text NOT NULL,
	"feature_category" text NOT NULL,
	"mean" numeric(20, 6) NOT NULL,
	"median" numeric(20, 6),
	"mode" numeric(20, 6),
	"std_dev" numeric(20, 6) NOT NULL,
	"variance" numeric(24, 6),
	"iqr" numeric(20, 6),
	"mad" numeric(20, 6),
	"p1" numeric(20, 6),
	"p5" numeric(20, 6),
	"p10" numeric(20, 6),
	"p25" numeric(20, 6),
	"p50" numeric(20, 6),
	"p75" numeric(20, 6),
	"p90" numeric(20, 6),
	"p95" numeric(20, 6),
	"p99" numeric(20, 6),
	"min_value" numeric(20, 6),
	"max_value" numeric(20, 6),
	"skewness" numeric(10, 6),
	"kurtosis" numeric(10, 6),
	"sample_size" integer NOT NULL,
	"null_count" integer DEFAULT 0,
	"zero_count" integer DEFAULT 0,
	"window_days" integer DEFAULT 365,
	"window_start" timestamp,
	"window_end" timestamp,
	"calculated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_feature_store" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" text NOT NULL,
	"provider_name" text,
	"specialty" text,
	"region" text,
	"claim_count_7d" integer DEFAULT 0,
	"claim_count_30d" integer DEFAULT 0,
	"claim_count_60d" integer DEFAULT 0,
	"claim_count_90d" integer DEFAULT 0,
	"total_amount_30d" numeric(14, 2) DEFAULT '0',
	"avg_amount_30d" numeric(14, 2) DEFAULT '0',
	"std_amount_30d" numeric(14, 2) DEFAULT '0',
	"median_amount_30d" numeric(14, 2) DEFAULT '0',
	"max_amount_30d" numeric(14, 2) DEFAULT '0',
	"unique_patients_30d" integer DEFAULT 0,
	"unique_diagnoses_30d" integer DEFAULT 0,
	"unique_procedures_30d" integer DEFAULT 0,
	"denial_rate_90d" numeric(5, 4) DEFAULT '0',
	"flag_rate_90d" numeric(5, 4) DEFAULT '0',
	"weekend_ratio_30d" numeric(5, 4) DEFAULT '0',
	"surgery_rate_30d" numeric(5, 4) DEFAULT '0',
	"icu_rate_30d" numeric(5, 4) DEFAULT '0',
	"avg_los_30d" numeric(6, 2) DEFAULT '0',
	"avg_procedures_per_claim" numeric(6, 2) DEFAULT '0',
	"avg_diagnoses_per_claim" numeric(6, 2) DEFAULT '0',
	"claim_trend_7d_vs_30d" numeric(6, 4) DEFAULT '0',
	"amount_trend_7d_vs_30d" numeric(6, 4) DEFAULT '0',
	"peer_group_id" text,
	"peer_percentile_amount" numeric(5, 2) DEFAULT '50',
	"peer_percentile_volume" numeric(5, 2) DEFAULT '50',
	"peer_percentile_denial" numeric(5, 2) DEFAULT '50',
	"isolation_forest_score" numeric(5, 4),
	"lof_score" numeric(6, 4),
	"autoencoder_error" numeric(8, 6),
	"composite_risk_score" numeric(5, 2),
	"last_calculated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "statistical_learning_weights" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_version" text DEFAULT 'v1.0' NOT NULL,
	"model_name" text DEFAULT 'statistical_learning_v1' NOT NULL,
	"feature_name" text NOT NULL,
	"feature_category" text NOT NULL,
	"weight" numeric(10, 6) NOT NULL,
	"normalized_weight" numeric(10, 6),
	"low_threshold" numeric(20, 6),
	"medium_threshold" numeric(20, 6),
	"high_threshold" numeric(20, 6),
	"critical_threshold" numeric(20, 6),
	"direction" text DEFAULT 'positive',
	"trained_on" text,
	"validation_score" numeric(6, 4),
	"feature_importance_rank" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "online_listening_mentions" ALTER COLUMN "source" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."online_listening_source";--> statement-breakpoint
CREATE TYPE "public"."online_listening_source" AS ENUM('twitter', 'alriyadh', 'almadina', 'alsharq_alawsat', 'okaz', 'sabq', 'news_article', 'medical_journal', 'blog', 'forum', 'other');--> statement-breakpoint
ALTER TABLE "online_listening_mentions" ALTER COLUMN "source" SET DATA TYPE "public"."online_listening_source" USING "source"::"public"."online_listening_source";--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "mdgf_claim_number" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "lot_no" integer;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "batch_type" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "secondary_icds" text[];--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "discharge_diagnosis_codes" text[];--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "discharge_other_diag" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "claim_icd10_descriptions" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "insured_id" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "date_of_birth" timestamp;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "nationality" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "coverage_relationship" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "hcp_id" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "hcp_code" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "practitioner_id" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "specialty_code" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "specialty" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "provider_type" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "provider_city" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "provider_region" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "provider_network" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "provider_contract_id" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "service_type" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "service_code" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "service_description" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "provider_service_description" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "listed_service_code" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "listed_service_desc" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "start_date" timestamp;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "r_quantity" integer;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "duration" integer;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "unit_price" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "patient_share_lc" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "service_line_no" integer;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "service_claimed_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "net_payable_amount" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "claim_benefit" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "pre_authorization_id" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "pre_authorization_status" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "pre_authorization_patient_id" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "pre_authorization_practitioner_id" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "pre_authorization_chief_complaint" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "pre_authorization_icd10s" text[];--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "is_pre_authorization_required" boolean;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "is_pre_authorized" boolean;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "policy_effective_date" timestamp;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "policy_expiry_date" timestamp;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "group_no" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "maternity_flag" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "newborn_flag" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "chronic_flag" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "pre_existing_flag" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "resubmission" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "occurrence_date" timestamp;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "date_of_claim_submission" timestamp;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "discharge_date" timestamp;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "discharge_disposition" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "on_admission" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "admission_date" timestamp;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "ai_status" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "ai_top_features" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "ai_provider_status" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "ai_patient_status" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "ai_top_feature_positive" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "is_retrieved_by_wq" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "wq_action" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "tachy_activity_type" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "medication_duration" integer;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "work_queue_feedback" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "adjudication_status" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "adjudication_source" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "source" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "validation_status" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "validation_comment" text;--> statement-breakpoint
ALTER TABLE "fwa_batches" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "fwa_cases" ADD COLUMN "category" text DEFAULT 'coding';--> statement-breakpoint
ALTER TABLE "audit_checklists" ADD CONSTRAINT "audit_checklists_audit_session_id_audit_sessions_id_fk" FOREIGN KEY ("audit_session_id") REFERENCES "public"."audit_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_findings" ADD CONSTRAINT "audit_findings_audit_session_id_audit_sessions_id_fk" FOREIGN KEY ("audit_session_id") REFERENCES "public"."audit_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_document_id_knowledge_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."knowledge_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cpt_embedding_idx" ON "cpt_embeddings" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "icd10_embedding_idx" ON "icd10_embeddings" USING hnsw ("embedding" vector_cosine_ops);