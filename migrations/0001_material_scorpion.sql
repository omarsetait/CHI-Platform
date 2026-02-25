CREATE TYPE "public"."audit_session_status" AS ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'follow_up_required', 'report_pending');--> statement-breakpoint
CREATE TYPE "public"."audit_session_type" AS ENUM('routine_inspection', 'complaint_investigation', 'follow_up_audit', 'risk_based_audit', 'desk_review', 'site_visit');--> statement-breakpoint
CREATE TYPE "public"."clinical_pathway_category" AS ENUM('care_level_mismatch', 'procedure_setting', 'length_of_stay', 'readmission', 'step_therapy', 'prior_auth_required');--> statement-breakpoint
CREATE TYPE "public"."enforcement_case_status" AS ENUM('finding', 'warning_issued', 'corrective_action', 'penalty_proposed', 'penalty_applied', 'appeal_submitted', 'appeal_review', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."online_listening_sentiment" AS ENUM('very_negative', 'negative', 'neutral', 'positive', 'very_positive');--> statement-breakpoint
CREATE TYPE "public"."online_listening_source" AS ENUM('twitter', 'linkedin', 'news_article', 'medical_journal', 'blog', 'forum', 'other');--> statement-breakpoint
CREATE TYPE "public"."policy_violation_sanction" AS ENUM('warning', 'fine', 'suspension', 'exclusion', 'license_revocation');--> statement-breakpoint
CREATE TYPE "public"."policy_violation_severity" AS ENUM('minor', 'moderate', 'major', 'critical');--> statement-breakpoint
CREATE TYPE "public"."policy_violation_status" AS ENUM('active', 'draft', 'deprecated');--> statement-breakpoint
CREATE TYPE "public"."provider_complaint_source" AS ENUM('chi_portal', 'nphies', 'patient_hotline', 'insurance_company', 'ministry_of_health', 'social_media', 'other');--> statement-breakpoint
CREATE TYPE "public"."provider_complaint_status" AS ENUM('received', 'under_review', 'investigated', 'resolved', 'dismissed', 'escalated');--> statement-breakpoint
CREATE TYPE "public"."regulatory_circular_status" AS ENUM('draft', 'review', 'approved', 'published', 'superseded', 'archived');--> statement-breakpoint
CREATE TYPE "public"."regulatory_circular_type" AS ENUM('policy_update', 'enforcement_notice', 'guidance', 'compliance_bulletin', 'market_alert', 'technical_bulletin');--> statement-breakpoint
CREATE TABLE "audit_sessions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"audit_number" text NOT NULL,
	"provider_id" text NOT NULL,
	"provider_name" text NOT NULL,
	"type" "audit_session_type" NOT NULL,
	"status" "audit_session_status" DEFAULT 'scheduled',
	"risk_score" numeric(5, 4),
	"risk_factors" text[] DEFAULT '{}',
	"scheduled_date" timestamp NOT NULL,
	"start_time" text,
	"end_time" text,
	"actual_start_time" timestamp,
	"actual_end_time" timestamp,
	"location" text,
	"audit_scope" text[] DEFAULT '{}',
	"audit_team" jsonb DEFAULT '[]'::jsonb,
	"linked_enforcement_ids" text[] DEFAULT '{}',
	"linked_complaint_ids" text[] DEFAULT '{}',
	"findings" jsonb DEFAULT '[]'::jsonb,
	"audit_report" text,
	"recommendations" text[] DEFAULT '{}',
	"follow_up_actions" jsonb DEFAULT '[]'::jsonb,
	"next_audit_date" timestamp,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "audit_sessions_audit_number_unique" UNIQUE("audit_number")
);
--> statement-breakpoint
CREATE TABLE "clinical_pathway_rules" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_code" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" "clinical_pathway_category" NOT NULL,
	"specialty" text,
	"procedure_codes" text[] DEFAULT '{}',
	"diagnosis_codes" text[] DEFAULT '{}',
	"allowed_settings" text[] DEFAULT '{}',
	"prohibited_settings" text[] DEFAULT '{}',
	"max_length_of_stay" integer,
	"min_days_between_visits" integer,
	"requires_prior_auth" boolean DEFAULT false,
	"clinical_evidence" text,
	"violation_id" text,
	"is_active" boolean DEFAULT true,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "clinical_pathway_rules_rule_code_unique" UNIQUE("rule_code")
);
--> statement-breakpoint
CREATE TABLE "enforcement_cases" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_number" text NOT NULL,
	"provider_id" text NOT NULL,
	"provider_name" text NOT NULL,
	"status" "enforcement_case_status" DEFAULT 'finding',
	"violation_id" text,
	"violation_code" text,
	"violation_title" text,
	"severity" "policy_violation_severity",
	"description" text NOT NULL,
	"evidence_summary" text,
	"finding_date" timestamp NOT NULL,
	"warning_issued_date" timestamp,
	"warning_due_date" timestamp,
	"corrective_action_description" text,
	"corrective_action_due_date" timestamp,
	"corrective_action_completed_date" timestamp,
	"penalty_type" "policy_violation_sanction",
	"fine_amount" numeric(14, 2),
	"suspension_start_date" timestamp,
	"suspension_end_date" timestamp,
	"penalty_applied_date" timestamp,
	"appeal_submitted_date" timestamp,
	"appeal_reason" text,
	"appeal_decision" text,
	"appeal_decision_date" timestamp,
	"resolution_date" timestamp,
	"resolution_notes" text,
	"linked_complaint_ids" text[] DEFAULT '{}',
	"linked_fwa_case_ids" text[] DEFAULT '{}',
	"assigned_investigator" text,
	"assigned_reviewer" text,
	"circular_reference" text,
	"audit_trail" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_by" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "enforcement_cases_case_number_unique" UNIQUE("case_number")
);
--> statement-breakpoint
CREATE TABLE "online_listening_mentions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" text,
	"provider_name" text,
	"source" "online_listening_source" NOT NULL,
	"source_url" text,
	"author_handle" text,
	"content" text NOT NULL,
	"sentiment" "online_listening_sentiment",
	"sentiment_score" numeric(5, 4),
	"topics" text[] DEFAULT '{}',
	"engagement_count" integer DEFAULT 0,
	"reach_estimate" integer,
	"is_verified" boolean DEFAULT false,
	"requires_action" boolean DEFAULT false,
	"published_at" timestamp,
	"captured_at" timestamp DEFAULT now(),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "policy_violation_catalogue" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"violation_code" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"severity" "policy_violation_severity" NOT NULL,
	"default_sanction" "policy_violation_sanction" NOT NULL,
	"fine_range_min" numeric(12, 2),
	"fine_range_max" numeric(12, 2),
	"suspension_days_min" integer,
	"suspension_days_max" integer,
	"escalation_path" text[] DEFAULT '{}',
	"regulatory_basis" text,
	"effective_date" timestamp NOT NULL,
	"expiry_date" timestamp,
	"status" "policy_violation_status" DEFAULT 'active',
	"repeat_offense_multiplier" numeric(3, 2) DEFAULT '1.5',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "policy_violation_catalogue_violation_code_unique" UNIQUE("violation_code")
);
--> statement-breakpoint
CREATE TABLE "provider_complaints" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"complaint_number" text NOT NULL,
	"provider_id" text NOT NULL,
	"provider_name" text NOT NULL,
	"source" "provider_complaint_source" NOT NULL,
	"category" text NOT NULL,
	"subcategory" text,
	"description" text NOT NULL,
	"complainant_type" text,
	"severity" "policy_violation_severity",
	"status" "provider_complaint_status" DEFAULT 'received',
	"received_date" timestamp NOT NULL,
	"due_date" timestamp,
	"resolved_date" timestamp,
	"resolution" text,
	"linked_violation_id" text,
	"linked_enforcement_id" text,
	"investigator_id" text,
	"ai_sentiment_score" numeric(5, 4),
	"ai_risk_score" numeric(5, 4),
	"external_reference_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "provider_complaints_complaint_number_unique" UNIQUE("complaint_number")
);
--> statement-breakpoint
CREATE TABLE "regulatory_circulars" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circular_number" text NOT NULL,
	"title" text NOT NULL,
	"type" "regulatory_circular_type" NOT NULL,
	"status" "regulatory_circular_status" DEFAULT 'draft',
	"summary" text NOT NULL,
	"content" text NOT NULL,
	"effective_date" timestamp,
	"expiry_date" timestamp,
	"target_audience" text[] DEFAULT '{}',
	"applicable_regions" text[] DEFAULT '{}',
	"related_violation_ids" text[] DEFAULT '{}',
	"related_circular_ids" text[] DEFAULT '{}',
	"superseded_circular_id" text,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"distribution_list" jsonb DEFAULT '[]'::jsonb,
	"acknowledgment_required" boolean DEFAULT false,
	"acknowledgment_deadline" timestamp,
	"total_recipients" integer DEFAULT 0,
	"acknowledged_count" integer DEFAULT 0,
	"drafted_by" text,
	"reviewed_by" text,
	"approved_by" text,
	"published_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "regulatory_circulars_circular_number_unique" UNIQUE("circular_number")
);
--> statement-breakpoint
ALTER TABLE "clinical_pathway_rules" ADD CONSTRAINT "clinical_pathway_rules_violation_id_policy_violation_catalogue_id_fk" FOREIGN KEY ("violation_id") REFERENCES "public"."policy_violation_catalogue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enforcement_cases" ADD CONSTRAINT "enforcement_cases_violation_id_policy_violation_catalogue_id_fk" FOREIGN KEY ("violation_id") REFERENCES "public"."policy_violation_catalogue"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_complaints" ADD CONSTRAINT "provider_complaints_linked_violation_id_policy_violation_catalogue_id_fk" FOREIGN KEY ("linked_violation_id") REFERENCES "public"."policy_violation_catalogue"("id") ON DELETE no action ON UPDATE no action;