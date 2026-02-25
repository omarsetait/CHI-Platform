CREATE TYPE "public"."agent_report_status" AS ENUM('pending', 'generating', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."agent_report_type" AS ENUM('analysis', 'categorization', 'recovery', 'compliance', 'pattern_detection', 'network_analysis');--> statement-breakpoint
CREATE TYPE "public"."claim_service_adjudication_status" AS ENUM('pending', 'approved', 'denied', 'partial');--> statement-breakpoint
CREATE TYPE "public"."claim_service_approval_status" AS ENUM('pending', 'approved', 'rejected', 'modified');--> statement-breakpoint
CREATE TYPE "public"."evidence_pack_status" AS ENUM('draft', 'locked', 'presented', 'archived');--> statement-breakpoint
CREATE TYPE "public"."feedback_action_type" AS ENUM('initiate_recovery', 'apply_penalty', 'enhanced_monitoring', 'compliance_training', 'contract_review', 'escalate', 'approve', 'reject', 'request_info', 'flag_for_review', 'close_case', 'defer');--> statement-breakpoint
CREATE TYPE "public"."feedback_outcome" AS ENUM('successful', 'partial', 'unsuccessful', 'pending', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."finding_status" AS ENUM('detected', 'under_review', 'validated', 'invalid', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."fwa_action_status" AS ENUM('pending', 'in_progress', 'completed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."fwa_action_track" AS ENUM('live_claims', 'historical_claims');--> statement-breakpoint
CREATE TYPE "public"."fwa_action_type" AS ENUM('preventive', 'recovery');--> statement-breakpoint
CREATE TYPE "public"."fwa_agent_type" AS ENUM('analysis', 'categorization', 'action', 'history_retrieval');--> statement-breakpoint
CREATE TYPE "public"."fwa_batch_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."fwa_behavior_category" AS ENUM('impossible_procedures', 'duplicate_claims', 'lab_unbundling', 'coding_fraud', 'billing_fraud', 'identity_fraud', 'documentation_fraud', 'provider_pattern', 'patient_pattern');--> statement-breakpoint
CREATE TYPE "public"."fwa_behavior_decision" AS ENUM('auto_reject', 'manual_review');--> statement-breakpoint
CREATE TYPE "public"."fwa_behavior_severity" AS ENUM('fraud', 'waste', 'abuse');--> statement-breakpoint
CREATE TYPE "public"."fwa_behavior_status" AS ENUM('active', 'draft', 'deprecated');--> statement-breakpoint
CREATE TYPE "public"."fwa_case_phase" AS ENUM('a1_analysis', 'a2_categorization', 'a3_action');--> statement-breakpoint
CREATE TYPE "public"."fwa_case_status" AS ENUM('draft', 'analyzing', 'categorized', 'action_pending', 'resolved', 'escalated');--> statement-breakpoint
CREATE TYPE "public"."fwa_category" AS ENUM('coding', 'management', 'physician', 'patient');--> statement-breakpoint
CREATE TYPE "public"."fwa_category_type" AS ENUM('coding', 'management', 'physician', 'patient');--> statement-breakpoint
CREATE TYPE "public"."fwa_finding_source" AS ENUM('explainability_report', 'denial_data', 'claims_data');--> statement-breakpoint
CREATE TYPE "public"."fwa_finding_type" AS ENUM('pattern', 'correlation', 'trend', 'anomaly');--> statement-breakpoint
CREATE TYPE "public"."fwa_medical_guideline_category" AS ENUM('clinical_practice', 'treatment_pathway', 'medical_necessity', 'diagnosis_procedure');--> statement-breakpoint
CREATE TYPE "public"."fwa_priority" AS ENUM('critical', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."fwa_regulatory_doc_category" AS ENUM('nphies', 'cchi', 'moh', 'insurance_authority', 'other');--> statement-breakpoint
CREATE TYPE "public"."kpi_category" AS ENUM('financial', 'medical', 'operational', 'utilization', 'fwa', 'claims_adjudication', 'reconciliation', 'benchmarking', 'quality');--> statement-breakpoint
CREATE TYPE "public"."kpi_data_source" AS ENUM('claims', 'fwa_findings', 'adjudication', 'settlements', 'sessions', 'membership', 'providers', 'contracts', 'manual');--> statement-breakpoint
CREATE TYPE "public"."kpi_status" AS ENUM('active', 'draft', 'archived');--> statement-breakpoint
CREATE TYPE "public"."pipeline_decision" AS ENUM('approved', 'fwa_flagged', 'preauth_required', 'escalated');--> statement-breakpoint
CREATE TYPE "public"."pipeline_stage" AS ENUM('intake', 'validation', 'risk_scoring', 'pattern_matching', 'decision_routing', 'completed');--> statement-breakpoint
CREATE TYPE "public"."pipeline_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."pre_auth_batch_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."pre_auth_claim_status" AS ENUM('ingested', 'analyzing', 'aggregated', 'pending_review', 'approved', 'rejected', 'request_info');--> statement-breakpoint
CREATE TYPE "public"."pre_auth_document_status" AS ENUM('pending', 'processing', 'ready', 'failed');--> statement-breakpoint
CREATE TYPE "public"."pre_auth_document_type" AS ENUM('regulatory', 'policy', 'medical_guidelines', 'patient_history', 'declaration');--> statement-breakpoint
CREATE TYPE "public"."pre_auth_priority" AS ENUM('HIGH', 'NORMAL', 'LOW');--> statement-breakpoint
CREATE TYPE "public"."pre_auth_recommendation" AS ENUM('APPROVE', 'REJECT', 'PEND_REVIEW', 'REQUEST_INFO');--> statement-breakpoint
CREATE TYPE "public"."pre_auth_severity" AS ENUM('HIGH', 'MEDIUM', 'LOW');--> statement-breakpoint
CREATE TYPE "public"."pre_auth_signal_type" AS ENUM('regulatory_compliance', 'coverage_eligibility', 'clinical_necessity', 'past_patterns', 'disclosure_check');--> statement-breakpoint
CREATE TYPE "public"."reconciliation_entity_type" AS ENUM('provider', 'patient', 'doctor');--> statement-breakpoint
CREATE TYPE "public"."reconciliation_module_source" AS ENUM('pre_auth', 'claims', 'audit');--> statement-breakpoint
CREATE TYPE "public"."reconciliation_risk_level" AS ENUM('critical', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."reconciliation_session_status" AS ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'follow_up_required');--> statement-breakpoint
CREATE TYPE "public"."settlement_status" AS ENUM('proposed', 'negotiating', 'agreed', 'signed', 'finance_approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'claims_reviewer', 'fwa_analyst', 'provider_manager', 'auditor', 'viewer');--> statement-breakpoint
CREATE TABLE "agent_performance_metrics" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" text NOT NULL,
	"agent_name" text NOT NULL,
	"module" text NOT NULL,
	"total_recommendations" integer DEFAULT 0,
	"accepted_recommendations" integer DEFAULT 0,
	"overridden_recommendations" integer DEFAULT 0,
	"escalated_recommendations" integer DEFAULT 0,
	"acceptance_rate" numeric(5, 2),
	"confidence_accuracy" numeric(5, 2),
	"avg_reward_score" numeric(5, 2),
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "agent_reports" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_name" text NOT NULL,
	"agent_type" "agent_report_type" NOT NULL,
	"report_title" text NOT NULL,
	"status" "agent_report_status" DEFAULT 'pending',
	"executive_summary" text,
	"findings" jsonb DEFAULT '[]'::jsonb,
	"recommendations" jsonb DEFAULT '[]'::jsonb,
	"metrics" jsonb,
	"charts" jsonb DEFAULT '[]'::jsonb,
	"generated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"ip_address" text,
	"user_agent" text,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim_ingest_batches" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_name" text NOT NULL,
	"source_type" text NOT NULL,
	"file_name" text,
	"file_type" text,
	"total_claims" integer DEFAULT 0,
	"processed_claims" integer DEFAULT 0,
	"status" "pipeline_status" DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "claim_ingest_items" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" text,
	"claim_number" text NOT NULL,
	"patient_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"service_date" text,
	"procedure_code" text,
	"diagnosis_code" text,
	"amount" numeric(12, 2) NOT NULL,
	"description" text,
	"raw_data" jsonb,
	"current_stage" "pipeline_stage" DEFAULT 'intake',
	"status" "pipeline_status" DEFAULT 'pending',
	"risk_score" numeric(5, 2),
	"decision" "pipeline_decision",
	"decision_reason" text,
	"created_entity_id" text,
	"created_entity_type" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "claim_pipeline_events" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" text,
	"batch_id" text,
	"stage" "pipeline_stage" NOT NULL,
	"status" "pipeline_status" DEFAULT 'completed',
	"message" text NOT NULL,
	"details" jsonb,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" varchar PRIMARY KEY NOT NULL,
	"claim_number" text NOT NULL,
	"policy_number" text NOT NULL,
	"registration_date" timestamp NOT NULL,
	"claim_type" text NOT NULL,
	"hospital" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"outlier_score" numeric(3, 2) NOT NULL,
	"description" text,
	"icd" text,
	"has_surgery" text,
	"surgery_fee" numeric(12, 2),
	"has_icu" text,
	"length_of_stay" integer,
	"similar_claims" integer,
	"similar_claims_in_hospital" integer,
	"provider_id" text,
	"provider_name" text,
	"patient_id" text,
	"patient_name" text,
	"service_date" timestamp,
	"status" text DEFAULT 'pending',
	"category" text,
	"flagged" boolean DEFAULT false,
	"flag_reason" text,
	"cpt_codes" text[],
	"diagnosis_codes" text[]
);
--> statement-breakpoint
CREATE TABLE "claims_feedback_events" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" text NOT NULL,
	"provider_id" text,
	"patient_id" text,
	"agent_id" text,
	"adjudication_phase" integer,
	"ai_recommendation" jsonb,
	"human_action" "feedback_action_type" NOT NULL,
	"was_accepted" boolean DEFAULT false,
	"override_reason" text,
	"reviewer_notes" text,
	"reviewer_id" text,
	"outcome" "feedback_outcome" DEFAULT 'pending',
	"adjusted_amount" numeric(12, 2),
	"outcome_notes" text,
	"preference_score" integer,
	"curated_for_training" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "collusion_rings" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ring_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"ring_type" text NOT NULL,
	"detection_method" text,
	"members" jsonb DEFAULT '[]'::jsonb,
	"evidence" jsonb DEFAULT '[]'::jsonb,
	"financial_impact" jsonb,
	"risk_assessment" jsonb,
	"status" text DEFAULT 'detected',
	"investigation_status" text,
	"assigned_to" text,
	"referred_to" text,
	"ai_summary" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "collusion_rings_ring_id_unique" UNIQUE("ring_id")
);
--> statement-breakpoint
CREATE TABLE "digital_twins" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"twin_id" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"twin_data" jsonb,
	"status" text DEFAULT 'active',
	"expires_at" timestamp,
	"created_by" text,
	"purpose" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "digital_twins_twin_id_unique" UNIQUE("twin_id")
);
--> statement-breakpoint
CREATE TABLE "doctor_360" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" text NOT NULL,
	"doctor_name" text NOT NULL,
	"specialty" text,
	"credentials" text,
	"license_number" text,
	"primary_facility_id" text,
	"primary_facility_name" text,
	"affiliated_facilities" text[] DEFAULT '{}',
	"risk_level" text DEFAULT 'low',
	"risk_score" numeric(5, 2),
	"practice_patterns" jsonb,
	"peer_comparison" jsonb,
	"flags" jsonb DEFAULT '[]'::jsonb,
	"claims_summary" jsonb,
	"ai_assessment" text,
	"last_analyzed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "doctor_360_doctor_id_unique" UNIQUE("doctor_id")
);
--> statement-breakpoint
CREATE TABLE "dream_reports" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_number" text NOT NULL,
	"provider_id" text NOT NULL,
	"provider_name" text NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"status" text DEFAULT 'generating',
	"peer_group_id" text,
	"executive_summary" text,
	"benchmark_analysis" jsonb,
	"findings" jsonb DEFAULT '[]'::jsonb,
	"total_potential_amount" numeric(14, 2),
	"category_breakdown" jsonb DEFAULT '[]'::jsonb,
	"claim_samples" jsonb DEFAULT '[]'::jsonb,
	"recommendations" jsonb DEFAULT '[]'::jsonb,
	"ai_insights" text,
	"generated_by" text,
	"generated_at" timestamp,
	"exported_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "dream_reports_report_number_unique" UNIQUE("report_number")
);
--> statement-breakpoint
CREATE TABLE "evidence_packs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pack_number" text NOT NULL,
	"provider_id" text NOT NULL,
	"provider_name" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "evidence_pack_status" DEFAULT 'draft',
	"finding_ids" text[] DEFAULT '{}',
	"claim_ids" text[] DEFAULT '{}',
	"total_claim_count" integer DEFAULT 0,
	"target_amount" numeric(14, 2) NOT NULL,
	"categories" jsonb DEFAULT '[]'::jsonb,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"prepared_by" text,
	"locked_at" timestamp,
	"locked_by" text,
	"presented_at" timestamp,
	"session_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "evidence_packs_pack_number_unique" UNIQUE("pack_number")
);
--> statement-breakpoint
CREATE TABLE "fwa_actions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" text NOT NULL,
	"action_type" "fwa_action_type" NOT NULL,
	"action_track" "fwa_action_track" NOT NULL,
	"status" "fwa_action_status" DEFAULT 'pending',
	"target_claim_id" text,
	"amount" numeric(12, 2),
	"rejection_code" text,
	"justification" text NOT NULL,
	"audit_trail" jsonb DEFAULT '{}'::jsonb,
	"executed_by" text NOT NULL,
	"executed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fwa_agent_configs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_name" text NOT NULL,
	"agent_type" "fwa_agent_type" NOT NULL,
	"enabled" boolean DEFAULT true,
	"threshold" numeric(5, 2) DEFAULT '0.5',
	"parameters" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fwa_analysis_findings" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" text NOT NULL,
	"finding_type" "fwa_finding_type" NOT NULL,
	"source" "fwa_finding_source" NOT NULL,
	"description" text NOT NULL,
	"confidence" numeric(5, 2) NOT NULL,
	"severity" "fwa_priority" NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fwa_batches" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_name" text NOT NULL,
	"file_name" text,
	"file_size" integer,
	"status" "fwa_batch_status" DEFAULT 'pending',
	"total_claims" integer DEFAULT 0,
	"processed_claims" integer DEFAULT 0,
	"flagged_claims" integer DEFAULT 0,
	"failed_claims" integer DEFAULT 0,
	"progress" numeric(5, 2) DEFAULT '0',
	"uploaded_by" text NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fwa_behaviors" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"behavior_code" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" "fwa_behavior_category" NOT NULL,
	"severity" "fwa_behavior_severity" NOT NULL,
	"priority" "fwa_priority" DEFAULT 'medium',
	"status" "fwa_behavior_status" DEFAULT 'draft',
	"decision" "fwa_behavior_decision" DEFAULT 'manual_review',
	"rejection_message" text,
	"technical_logic" text,
	"data_required" text[],
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "fwa_behaviors_behavior_code_unique" UNIQUE("behavior_code")
);
--> statement-breakpoint
CREATE TABLE "fwa_cases" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" text NOT NULL,
	"claim_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"status" "fwa_case_status" DEFAULT 'draft',
	"phase" "fwa_case_phase" DEFAULT 'a1_analysis',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"priority" "fwa_priority" DEFAULT 'medium',
	"total_amount" numeric(12, 2) NOT NULL,
	"recovery_amount" numeric(12, 2),
	"assigned_to" text,
	CONSTRAINT "fwa_cases_case_id_unique" UNIQUE("case_id")
);
--> statement-breakpoint
CREATE TABLE "fwa_categories" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" text NOT NULL,
	"category_type" "fwa_category_type" NOT NULL,
	"sub_category" text NOT NULL,
	"evidence_chain" jsonb DEFAULT '{}'::jsonb,
	"confidence_score" numeric(5, 2) NOT NULL,
	"severity_score" numeric(5, 2) NOT NULL,
	"recommended_actions" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fwa_claim_services" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" text NOT NULL,
	"line_number" integer NOT NULL,
	"service_code" text NOT NULL,
	"service_code_system" text,
	"service_description" text NOT NULL,
	"service_date" timestamp,
	"quantity" numeric(10, 2) NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"total_price" numeric(12, 2) NOT NULL,
	"approved_amount" numeric(12, 2),
	"adjudication_status" "claim_service_adjudication_status" DEFAULT 'pending',
	"approval_status" "claim_service_approval_status" DEFAULT 'pending',
	"violations" text[] DEFAULT '{}',
	"denial_reason" text,
	"modifiers" text[] DEFAULT '{}',
	"diagnosis_pointers" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fwa_clinical_documentation" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" text NOT NULL,
	"chief_complaint" text,
	"history_of_present_illness" text,
	"vital_signs" jsonb,
	"lab_results" jsonb DEFAULT '[]'::jsonb,
	"diagnoses" jsonb DEFAULT '[]'::jsonb,
	"treatment_plan" text,
	"physician_notes" text,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fwa_feedback_events" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" text NOT NULL,
	"entity_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"agent_id" text,
	"phase" text NOT NULL,
	"ai_recommendation" jsonb,
	"human_action" "feedback_action_type" NOT NULL,
	"was_accepted" boolean DEFAULT false,
	"override_reason" text,
	"reviewer_notes" text,
	"reviewer_id" text,
	"outcome" "feedback_outcome" DEFAULT 'pending',
	"outcome_amount" numeric(12, 2),
	"outcome_notes" text,
	"preference_score" integer,
	"curated_for_training" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fwa_high_risk_doctors" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"doctor_id" text NOT NULL,
	"doctor_name" text NOT NULL,
	"specialty" text,
	"license_number" text,
	"organization" text,
	"risk_score" numeric(5, 2) NOT NULL,
	"risk_level" "reconciliation_risk_level" DEFAULT 'medium',
	"total_claims" integer DEFAULT 0,
	"flagged_claims" integer DEFAULT 0,
	"avg_claim_amount" numeric(12, 2),
	"total_exposure" numeric(12, 2),
	"fwa_case_count" integer DEFAULT 0,
	"reasons" text[] DEFAULT '{}',
	"last_flagged_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "fwa_high_risk_doctors_doctor_id_unique" UNIQUE("doctor_id")
);
--> statement-breakpoint
CREATE TABLE "fwa_high_risk_patients" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" text NOT NULL,
	"patient_name" text NOT NULL,
	"member_id" text,
	"risk_score" numeric(5, 2) NOT NULL,
	"risk_level" "reconciliation_risk_level" DEFAULT 'medium',
	"total_claims" integer DEFAULT 0,
	"flagged_claims" integer DEFAULT 0,
	"total_amount" numeric(12, 2),
	"fwa_case_count" integer DEFAULT 0,
	"primary_diagnosis" text,
	"reasons" text[] DEFAULT '{}',
	"last_claim_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "fwa_high_risk_patients_patient_id_unique" UNIQUE("patient_id")
);
--> statement-breakpoint
CREATE TABLE "fwa_high_risk_providers" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" text NOT NULL,
	"provider_name" text NOT NULL,
	"provider_type" text,
	"specialty" text,
	"organization" text,
	"risk_score" numeric(5, 2) NOT NULL,
	"risk_level" "reconciliation_risk_level" DEFAULT 'medium',
	"total_claims" integer DEFAULT 0,
	"flagged_claims" integer DEFAULT 0,
	"denial_rate" numeric(5, 2),
	"avg_claim_amount" numeric(12, 2),
	"total_exposure" numeric(12, 2),
	"claims_per_month" numeric(10, 2),
	"cpm_trend" numeric(5, 2),
	"cpm_peer_average" numeric(10, 2),
	"fwa_case_count" integer DEFAULT 0,
	"reasons" text[] DEFAULT '{}',
	"last_flagged_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "fwa_high_risk_providers_provider_id_unique" UNIQUE("provider_id")
);
--> statement-breakpoint
CREATE TABLE "fwa_medical_guidelines" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"category" "fwa_medical_guideline_category" NOT NULL,
	"content" text NOT NULL,
	"source_authority" text NOT NULL,
	"specialty_area" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fwa_regulatory_docs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"category" "fwa_regulatory_doc_category" NOT NULL,
	"content" text NOT NULL,
	"regulation_id" text NOT NULL,
	"effective_date" timestamp NOT NULL,
	"jurisdiction" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "fwa_work_queue_claims" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" text NOT NULL,
	"claim_number" text NOT NULL,
	"provider_id" text,
	"provider_name" text,
	"patient_id" text,
	"patient_name" text,
	"claim_amount" numeric(12, 2) NOT NULL,
	"risk_score" numeric(5, 2) NOT NULL,
	"risk_level" "reconciliation_risk_level" DEFAULT 'medium',
	"queue_status" text DEFAULT 'pending',
	"assigned_to" text,
	"priority" "fwa_priority" DEFAULT 'medium',
	"flag_reason" text,
	"claim_type" text,
	"service_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ghost_runs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" text NOT NULL,
	"agent_type" text NOT NULL,
	"phase" text,
	"entity_type" text,
	"target_id" text NOT NULL,
	"target_type" text NOT NULL,
	"input_data" jsonb,
	"ghost_output" jsonb,
	"production_output" jsonb,
	"comparison" jsonb,
	"status" text DEFAULT 'pending',
	"execution_time_ms" integer,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	CONSTRAINT "ghost_runs_run_id_unique" UNIQUE("run_id")
);
--> statement-breakpoint
CREATE TABLE "kpi_definitions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"category" "kpi_category" NOT NULL,
	"status" "kpi_status" DEFAULT 'active' NOT NULL,
	"numerator_label" text NOT NULL,
	"numerator_formula" text NOT NULL,
	"numerator_source" "kpi_data_source" NOT NULL,
	"denominator_label" text NOT NULL,
	"denominator_formula" text NOT NULL,
	"denominator_source" "kpi_data_source" NOT NULL,
	"inclusions" jsonb DEFAULT '[]'::jsonb,
	"exclusions" jsonb DEFAULT '[]'::jsonb,
	"unit" text DEFAULT 'number',
	"decimal_places" integer DEFAULT 2,
	"display_format" text,
	"enable_benchmarking" boolean DEFAULT false,
	"peer_group_dimensions" jsonb DEFAULT '[]'::jsonb,
	"warning_threshold" numeric(12, 4),
	"critical_threshold" numeric(12, 4),
	"threshold_direction" text DEFAULT 'above',
	"weight" numeric(5, 2) DEFAULT '1.0',
	"category_weight" numeric(5, 2),
	"rationale" text,
	"industry_standard" text,
	"calculation_methodology" text,
	"target_value" numeric(18, 4),
	"target_direction" text DEFAULT 'lower',
	"sort_order" integer DEFAULT 0,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "kpi_definitions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "kpi_results" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kpi_definition_id" text NOT NULL,
	"kpi_code" text NOT NULL,
	"provider_id" text,
	"provider_name" text,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"period_label" text,
	"numerator_value" numeric(18, 4),
	"denominator_value" numeric(18, 4),
	"calculated_value" numeric(18, 4),
	"peer_group_id" text,
	"peer_mean" numeric(18, 4),
	"peer_median" numeric(18, 4),
	"peer_std_dev" numeric(18, 4),
	"z_score" numeric(8, 4),
	"percentile_rank" integer,
	"prior_period_value" numeric(18, 4),
	"trend_direction" text,
	"trend_percentage" numeric(8, 2),
	"alert_level" text,
	"calculated_at" timestamp DEFAULT now(),
	"data_quality_score" numeric(5, 2),
	"record_count" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "operational_findings_ledger" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" text NOT NULL,
	"provider_name" text NOT NULL,
	"finding_type" text NOT NULL,
	"category" text NOT NULL,
	"sub_category" text,
	"status" "finding_status" DEFAULT 'detected',
	"potential_amount" numeric(14, 2) NOT NULL,
	"claim_count" integer DEFAULT 0,
	"claim_ids" text[] DEFAULT '{}',
	"description" text NOT NULL,
	"evidence_pack_id" text,
	"confidence" numeric(5, 2),
	"data_completeness" numeric(5, 2),
	"rule_strength" text,
	"attachment_availability" boolean DEFAULT false,
	"weakness_flags" text[] DEFAULT '{}',
	"period_start" timestamp,
	"period_end" timestamp,
	"detected_by" text,
	"validated_by" text,
	"validated_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "patient_360" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" text NOT NULL,
	"patient_name" text NOT NULL,
	"date_of_birth" timestamp,
	"gender" text,
	"policy_number" text,
	"member_since" timestamp,
	"risk_level" text DEFAULT 'low',
	"risk_score" numeric(5, 2),
	"chronic_conditions" jsonb DEFAULT '[]'::jsonb,
	"visit_history" jsonb DEFAULT '[]'::jsonb,
	"risk_factors" jsonb DEFAULT '[]'::jsonb,
	"claims_summary" jsonb,
	"fwa_alerts" jsonb DEFAULT '[]'::jsonb,
	"behavioral_patterns" jsonb,
	"ai_summary" text,
	"last_analyzed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "patient_360_patient_id_unique" UNIQUE("patient_id")
);
--> statement-breakpoint
CREATE TABLE "peer_groups" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_name" text NOT NULL,
	"region" text NOT NULL,
	"city" text,
	"provider_type" text NOT NULL,
	"network_tier" text NOT NULL,
	"service_types" text[] DEFAULT '{}',
	"volume_range_min" numeric(12, 2),
	"volume_range_max" numeric(12, 2),
	"policy_mix_threshold" numeric(5, 2) DEFAULT '0.50',
	"member_count" integer DEFAULT 0,
	"provider_ids" text[] DEFAULT '{}',
	"avg_cost_per_member" numeric(12, 2),
	"avg_claims_per_member" numeric(8, 2),
	"avg_billing_amount" numeric(12, 2),
	"std_dev_cpm" numeric(12, 2),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pre_auth_adjudicator_actions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" varchar NOT NULL,
	"decision_id" varchar,
	"user_id" varchar,
	"action" text NOT NULL,
	"original_recommendation" "pre_auth_recommendation",
	"final_verdict" "pre_auth_recommendation" NOT NULL,
	"override_reason" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pre_auth_agent_configs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" text NOT NULL,
	"agent_name" text NOT NULL,
	"layer" integer NOT NULL,
	"model_provider" text DEFAULT 'OpenAI',
	"model_name" text DEFAULT 'gpt-4o-mini',
	"temperature" numeric(3, 2) DEFAULT '0.2',
	"max_tokens" integer DEFAULT 4096,
	"system_prompt" text,
	"weight" numeric(3, 2) DEFAULT '1.0',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "pre_auth_agent_configs_agent_id_unique" UNIQUE("agent_id")
);
--> statement-breakpoint
CREATE TABLE "pre_auth_batches" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"status" "pre_auth_batch_status" DEFAULT 'pending',
	"priority" "pre_auth_priority" DEFAULT 'NORMAL',
	"total_claims" integer DEFAULT 0,
	"processed_claims" integer DEFAULT 0,
	"failed_claims" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pre_auth_claims" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" text NOT NULL,
	"payer_id" text NOT NULL,
	"member_id" text NOT NULL,
	"member_dob" text,
	"member_gender" text,
	"policy_plan_id" text,
	"provider_id" text,
	"specialty" text,
	"network_status" text,
	"encounter_type" text,
	"total_amount" numeric(12, 2),
	"diagnoses" jsonb DEFAULT '[]'::jsonb,
	"line_items" jsonb DEFAULT '[]'::jsonb,
	"clinical_documents" jsonb DEFAULT '[]'::jsonb,
	"status" "pre_auth_claim_status" DEFAULT 'ingested',
	"processing_phase" integer DEFAULT 1,
	"priority" "pre_auth_priority" DEFAULT 'NORMAL',
	"batch_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "pre_auth_claims_claim_id_unique" UNIQUE("claim_id")
);
--> statement-breakpoint
CREATE TABLE "pre_auth_decisions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" varchar NOT NULL,
	"aggregated_score" numeric(5, 4),
	"risk_level" "pre_auth_severity",
	"has_hard_stop" boolean DEFAULT false,
	"candidates" jsonb DEFAULT '[]'::jsonb,
	"top_recommendation" "pre_auth_recommendation",
	"safety_check_passed" boolean DEFAULT false,
	"conflicting_signals" jsonb DEFAULT '[]'::jsonb,
	"is_final" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pre_auth_document_chunks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" varchar NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"page_number" integer,
	"section_title" text,
	"token_count" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pre_auth_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"document_type" "pre_auth_document_type" NOT NULL,
	"file_name" text,
	"file_size" integer,
	"mime_type" text,
	"source_url" text,
	"status" "pre_auth_document_status" DEFAULT 'pending',
	"total_chunks" integer DEFAULT 0,
	"target_phase" integer,
	"policy_plan_id" text,
	"member_id" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pre_auth_policy_rules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" text NOT NULL,
	"rule_name" text NOT NULL,
	"rule_type" text NOT NULL,
	"layer" integer NOT NULL,
	"condition" jsonb,
	"action" text NOT NULL,
	"severity" "pre_auth_severity",
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "pre_auth_policy_rules_rule_id_unique" UNIQUE("rule_id")
);
--> statement-breakpoint
CREATE TABLE "pre_auth_rlhf_feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" varchar NOT NULL,
	"action_id" varchar,
	"feedback_type" text NOT NULL,
	"agent_id" text,
	"was_accepted" boolean,
	"preference_score" integer,
	"curated_for_training" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pre_auth_signals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" varchar NOT NULL,
	"detector" "pre_auth_signal_type" NOT NULL,
	"signal_id" text NOT NULL,
	"risk_flag" boolean DEFAULT false,
	"severity" "pre_auth_severity",
	"confidence" numeric(5, 4),
	"recommendation" "pre_auth_recommendation",
	"rationale" text,
	"evidence" jsonb DEFAULT '[]'::jsonb,
	"missing_info" text[],
	"is_hard_stop" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_360" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" text NOT NULL,
	"provider_name" text NOT NULL,
	"provider_type" text,
	"specialty" text,
	"region" text,
	"city" text,
	"network_tier" text,
	"license_number" text,
	"contract_status" text DEFAULT 'active',
	"risk_level" text DEFAULT 'low',
	"risk_score" numeric(5, 2),
	"peer_group_id" text,
	"specialty_benchmarks" jsonb,
	"peer_ranking" jsonb,
	"billing_patterns" jsonb,
	"flags" jsonb DEFAULT '[]'::jsonb,
	"claims_summary" jsonb,
	"compliance_history" jsonb DEFAULT '[]'::jsonb,
	"contract_performance" jsonb,
	"ai_assessment" text,
	"last_analyzed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "provider_360_provider_id_unique" UNIQUE("provider_id")
);
--> statement-breakpoint
CREATE TABLE "provider_benchmarks" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" text NOT NULL,
	"provider_name" text NOT NULL,
	"peer_group_id" text,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"total_claims" integer DEFAULT 0,
	"total_billed_amount" numeric(14, 2),
	"total_paid_amount" numeric(14, 2),
	"member_count" integer DEFAULT 0,
	"cost_per_member" numeric(12, 2),
	"claims_per_member" numeric(8, 2),
	"avg_claim_amount" numeric(12, 2),
	"peer_percentile" numeric(5, 2),
	"deviation_from_peer" numeric(8, 2),
	"standard_deviations" numeric(5, 2),
	"anomaly_score" numeric(5, 2),
	"anomaly_flags" jsonb DEFAULT '[]'::jsonb,
	"service_breakdown" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_communications" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" text NOT NULL,
	"provider_name" text NOT NULL,
	"type" text NOT NULL,
	"direction" text DEFAULT 'outbound',
	"subject" text NOT NULL,
	"body" text,
	"status" text DEFAULT 'Pending',
	"outcome" text,
	"assignee" text,
	"next_action_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_contracts" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contract_number" text NOT NULL,
	"provider_id" text NOT NULL,
	"provider_name" text NOT NULL,
	"contract_type" text NOT NULL,
	"status" text DEFAULT 'Draft',
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"value" numeric(14, 2),
	"terms" jsonb DEFAULT '{}'::jsonb,
	"fee_schedule" text,
	"auto_renewal" boolean DEFAULT false,
	"signed_by" text,
	"signed_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "provider_contracts_contract_number_unique" UNIQUE("contract_number")
);
--> statement-breakpoint
CREATE TABLE "provider_cpm_metrics" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" text NOT NULL,
	"provider_name" text NOT NULL,
	"region" text,
	"network_tier" text,
	"specialty" text,
	"quarter" text NOT NULL,
	"year" integer NOT NULL,
	"member_count" integer DEFAULT 0,
	"total_cost" numeric(14, 2),
	"cpm" numeric(12, 2),
	"peer_avg_cpm" numeric(12, 2),
	"percentile" numeric(5, 2),
	"deviation" numeric(8, 2),
	"trend" text,
	"benchmark_cpm" numeric(12, 2),
	"claims_count" integer DEFAULT 0,
	"avg_claim_amount" numeric(12, 2),
	"rejection_rate" numeric(5, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_directory" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"npi" text NOT NULL,
	"name" text NOT NULL,
	"specialty" text NOT NULL,
	"organization" text,
	"email" text,
	"phone" text,
	"address" text,
	"city" text,
	"region" text,
	"contract_status" text DEFAULT 'Pending',
	"network_tier" text DEFAULT 'Tier 2',
	"license_number" text,
	"license_expiry" timestamp,
	"member_count" integer DEFAULT 0,
	"risk_score" numeric(5, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "provider_directory_npi_unique" UNIQUE("npi")
);
--> statement-breakpoint
CREATE TABLE "reconciliation_entities" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" text NOT NULL,
	"entity_type" "reconciliation_entity_type" NOT NULL,
	"display_name" text NOT NULL,
	"specialty" text,
	"organization" text,
	"risk_score" numeric(5, 2) DEFAULT '0',
	"risk_level" "reconciliation_risk_level" DEFAULT 'low',
	"total_claims" integer DEFAULT 0,
	"flagged_claims" integer DEFAULT 0,
	"total_exposure" numeric(12, 2) DEFAULT '0',
	"last_activity" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reconciliation_findings" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" text NOT NULL,
	"module_source" "reconciliation_module_source" NOT NULL,
	"finding_type" text NOT NULL,
	"description" text NOT NULL,
	"severity" "reconciliation_risk_level" NOT NULL,
	"confidence" numeric(5, 2),
	"financial_exposure" numeric(12, 2),
	"recommended_action" text,
	"evidence" jsonb DEFAULT '{}'::jsonb,
	"related_claim_ids" text[] DEFAULT '{}',
	"fwa_category" "fwa_category",
	"status" text DEFAULT 'open',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reconciliation_sessions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_number" text NOT NULL,
	"provider_id" text NOT NULL,
	"provider_name" text NOT NULL,
	"status" "reconciliation_session_status" DEFAULT 'scheduled',
	"scheduled_date" timestamp NOT NULL,
	"start_time" text,
	"end_time" text,
	"location" text,
	"meeting_type" text DEFAULT 'in_person',
	"attendees" jsonb DEFAULT '[]'::jsonb,
	"agenda" text[] DEFAULT '{}',
	"evidence_pack_ids" text[] DEFAULT '{}',
	"proposed_amount" numeric(14, 2),
	"negotiated_amount" numeric(14, 2),
	"outcomes" jsonb DEFAULT '[]'::jsonb,
	"action_items" jsonb DEFAULT '[]'::jsonb,
	"minutes" text,
	"follow_up_date" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "reconciliation_sessions_session_number_unique" UNIQUE("session_number")
);
--> statement-breakpoint
CREATE TABLE "relationship_graphs" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"graph_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"graph_type" text NOT NULL,
	"nodes" jsonb DEFAULT '[]'::jsonb,
	"edges" jsonb DEFAULT '[]'::jsonb,
	"metrics" jsonb,
	"analysis_results" jsonb,
	"status" text DEFAULT 'active',
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "relationship_graphs_graph_id_unique" UNIQUE("graph_id")
);
--> statement-breakpoint
CREATE TABLE "settlement_ledger" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"settlement_number" text NOT NULL,
	"provider_id" text NOT NULL,
	"provider_name" text NOT NULL,
	"status" "settlement_status" DEFAULT 'proposed',
	"session_id" text,
	"evidence_pack_ids" text[] DEFAULT '{}',
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"proposed_amount" numeric(14, 2) NOT NULL,
	"negotiated_amount" numeric(14, 2),
	"agreed_amount" numeric(14, 2),
	"realized_savings" numeric(14, 2),
	"categories" jsonb DEFAULT '[]'::jsonb,
	"provider_acceptance" boolean,
	"provider_signatory" text,
	"provider_signed_at" timestamp,
	"tawuniya_signatory" text,
	"tawuniya_signed_at" timestamp,
	"finance_approved_by" text,
	"finance_approved_at" timestamp,
	"settlement_date" timestamp,
	"payment_reference" text,
	"notes" text,
	"audit_trail" jsonb DEFAULT '[]'::jsonb,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "settlement_ledger_settlement_number_unique" UNIQUE("settlement_number")
);
--> statement-breakpoint
CREATE TABLE "shadow_rules" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_set_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"base_rule_id" text,
	"rule_config" jsonb,
	"test_cases" jsonb DEFAULT '[]'::jsonb,
	"status" text DEFAULT 'draft',
	"validation_results" jsonb,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "shadow_rules_rule_set_id_unique" UNIQUE("rule_set_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" "user_role" DEFAULT 'viewer' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_ingest_items" ADD CONSTRAINT "claim_ingest_items_batch_id_claim_ingest_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."claim_ingest_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_pipeline_events" ADD CONSTRAINT "claim_pipeline_events_item_id_claim_ingest_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."claim_ingest_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_pipeline_events" ADD CONSTRAINT "claim_pipeline_events_batch_id_claim_ingest_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."claim_ingest_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dream_reports" ADD CONSTRAINT "dream_reports_peer_group_id_peer_groups_id_fk" FOREIGN KEY ("peer_group_id") REFERENCES "public"."peer_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fwa_actions" ADD CONSTRAINT "fwa_actions_case_id_fwa_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."fwa_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fwa_analysis_findings" ADD CONSTRAINT "fwa_analysis_findings_case_id_fwa_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."fwa_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fwa_categories" ADD CONSTRAINT "fwa_categories_case_id_fwa_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."fwa_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_results" ADD CONSTRAINT "kpi_results_kpi_definition_id_kpi_definitions_id_fk" FOREIGN KEY ("kpi_definition_id") REFERENCES "public"."kpi_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_auth_adjudicator_actions" ADD CONSTRAINT "pre_auth_adjudicator_actions_claim_id_pre_auth_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."pre_auth_claims"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_auth_adjudicator_actions" ADD CONSTRAINT "pre_auth_adjudicator_actions_decision_id_pre_auth_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."pre_auth_decisions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_auth_adjudicator_actions" ADD CONSTRAINT "pre_auth_adjudicator_actions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_auth_claims" ADD CONSTRAINT "pre_auth_claims_batch_id_pre_auth_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."pre_auth_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_auth_decisions" ADD CONSTRAINT "pre_auth_decisions_claim_id_pre_auth_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."pre_auth_claims"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_auth_document_chunks" ADD CONSTRAINT "pre_auth_document_chunks_document_id_pre_auth_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."pre_auth_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_auth_rlhf_feedback" ADD CONSTRAINT "pre_auth_rlhf_feedback_claim_id_pre_auth_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."pre_auth_claims"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_auth_rlhf_feedback" ADD CONSTRAINT "pre_auth_rlhf_feedback_action_id_pre_auth_adjudicator_actions_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."pre_auth_adjudicator_actions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pre_auth_signals" ADD CONSTRAINT "pre_auth_signals_claim_id_pre_auth_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."pre_auth_claims"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_benchmarks" ADD CONSTRAINT "provider_benchmarks_peer_group_id_peer_groups_id_fk" FOREIGN KEY ("peer_group_id") REFERENCES "public"."peer_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_findings" ADD CONSTRAINT "reconciliation_findings_entity_id_reconciliation_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."reconciliation_entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_ledger" ADD CONSTRAINT "settlement_ledger_session_id_reconciliation_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."reconciliation_sessions"("id") ON DELETE no action ON UPDATE no action;