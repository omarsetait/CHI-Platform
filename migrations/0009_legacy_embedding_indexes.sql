CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint

ALTER TABLE "policy_violation_catalogue"
ADD COLUMN IF NOT EXISTS "embedding" vector(1536);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "policy_violation_catalogue_embedding_idx"
ON "policy_violation_catalogue"
USING hnsw ("embedding" vector_cosine_ops);
--> statement-breakpoint

ALTER TABLE "clinical_pathway_rules"
ADD COLUMN IF NOT EXISTS "embedding" vector(1536);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "clinical_pathway_rules_embedding_idx"
ON "clinical_pathway_rules"
USING hnsw ("embedding" vector_cosine_ops);
--> statement-breakpoint

ALTER TABLE "fwa_regulatory_docs"
ADD COLUMN IF NOT EXISTS "embedding" vector(1536);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "fwa_regulatory_docs_embedding_idx"
ON "fwa_regulatory_docs"
USING hnsw ("embedding" vector_cosine_ops);
--> statement-breakpoint

ALTER TABLE "fwa_medical_guidelines"
ADD COLUMN IF NOT EXISTS "embedding" vector(1536);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "fwa_medical_guidelines_embedding_idx"
ON "fwa_medical_guidelines"
USING hnsw ("embedding" vector_cosine_ops);
--> statement-breakpoint

ALTER TABLE "provider_complaints"
ADD COLUMN IF NOT EXISTS "embedding" vector(1536);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "provider_complaints_embedding_idx"
ON "provider_complaints"
USING hnsw ("embedding" vector_cosine_ops);
