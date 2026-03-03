DO $$
BEGIN
  CREATE TYPE knowledge_upload_job_status AS ENUM (
    'queued',
    'in_progress',
    'completed',
    'completed_with_errors',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
--> statement-breakpoint

DO $$
BEGIN
  CREATE TYPE knowledge_upload_job_item_status AS ENUM (
    'queued',
    'in_progress',
    'completed',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "knowledge_upload_jobs" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
  "status" "knowledge_upload_job_status" NOT NULL DEFAULT 'queued',
  "created_by" text,
  "total_files" integer NOT NULL DEFAULT 0,
  "queued_files" integer NOT NULL DEFAULT 0,
  "in_progress_files" integer NOT NULL DEFAULT 0,
  "completed_files" integer NOT NULL DEFAULT 0,
  "failed_files" integer NOT NULL DEFAULT 0,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "started_at" timestamp,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "knowledge_upload_job_items" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
  "job_id" text NOT NULL REFERENCES "knowledge_upload_jobs"("id") ON DELETE CASCADE,
  "document_id" text NOT NULL REFERENCES "knowledge_documents"("id") ON DELETE CASCADE,
  "original_filename" text NOT NULL,
  "title" text NOT NULL,
  "category" "knowledge_document_category" NOT NULL,
  "source_authority" text,
  "status" "knowledge_upload_job_item_status" NOT NULL DEFAULT 'queued',
  "attempts" integer NOT NULL DEFAULT 0,
  "max_attempts" integer NOT NULL DEFAULT 3,
  "next_run_at" timestamp NOT NULL DEFAULT now(),
  "last_error" text,
  "started_at" timestamp,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "knowledge_upload_job_items_status_next_run_created_idx"
  ON "knowledge_upload_job_items" ("status", "next_run_at", "created_at");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "knowledge_upload_job_items_job_status_idx"
  ON "knowledge_upload_job_items" ("job_id", "status");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "knowledge_upload_jobs_status_created_at_idx"
  ON "knowledge_upload_jobs" ("status", "created_at");
