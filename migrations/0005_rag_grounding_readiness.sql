CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint

ALTER TABLE "knowledge_chunks"
ADD COLUMN IF NOT EXISTS "embedding" vector(1536);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "knowledge_chunks_embedding_idx"
ON "knowledge_chunks"
USING hnsw ("embedding" vector_cosine_ops);
--> statement-breakpoint

ALTER TABLE "chat_messages"
ADD COLUMN IF NOT EXISTS "retrieval_metadata" jsonb DEFAULT '{}'::jsonb;
