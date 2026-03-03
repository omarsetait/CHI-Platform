# Chatbot Audit, Hardening & Sample Document Seed — Design

**Date:** 2026-03-02
**Status:** Approved
**Approach:** C — Audit + Harden + Add Sample Document Seed

## Goal

Verify the full chat pipeline works end-to-end, fix identified issues, harden error handling, and create a sample document seed so the chatbot can be tested immediately without manual document uploads.

## Audit Findings

### Critical
1. **SQL injection in data agent tools** — `get_claims_summary`, `get_fwa_alerts` interpolate GPT-controlled values directly into SQL (`WHERE status = '${status}'`). Need parameterized queries.

### Functional Gaps
2. **No similarity threshold** — RAG returns top 20 chunks regardless of relevance. Low-similarity chunks produce hallucinated citations.
3. **Empty knowledge base = wasted API calls** — `searchKnowledgeChunks()` calls the embedding API even when `knowledge_chunks` is empty.
4. **Reranker JSON parsing is fragile** — `JSON.parse` with no catch. Malformed JSON from GPT crashes the pipeline.
5. **No graceful degradation** — If `rerankChunks` fails, the entire document intent fails.

### Hardening
6. **No agent-level error logging** — No structured logs for which agent ran, what intent was classified, what tools were called.
7. **Router fallback defaults to `"document"` on error** — Triggers RAG even for greetings when the router is down.

## Fix Plan

### 1. Data Agent SQL Injection Fix

**File:** `server/services/chat-data-agent.ts`

Replace string interpolation with parameterized queries in all affected tools:
- `get_claims_summary` — parameterize `status` filter
- `get_fwa_alerts` — parameterize `severity` and `entityType` filters
- `get_provider_stats` — sanitize `limit`
- `get_beneficiary_stats` — validate `groupBy` against allowed values

### 2. RAG Pipeline Hardening

**File:** `server/services/chat-rag-service.ts`

**Similarity threshold gate:**
- Minimum similarity threshold of 0.3 — discard chunks below it before reranking
- If zero chunks pass threshold, skip reranker and return "No relevant documents found"

**Empty knowledge base short-circuit:**
- `SELECT COUNT(*) FROM knowledge_chunks` before calling embedding API
- If zero rows, skip embedding + search, return empty array immediately

**Reranker resilience:**
- Wrap `JSON.parse` in try/catch — fallback to raw vector-sorted chunks (top 5 by similarity)
- If reranker API call fails, same fallback

**Router fallback fix:**
- Change error default from `"document"` to `"general"`

### 3. Error Logging & Observability

**Files:** `chat-rag-service.ts`, `chat-data-agent.ts`, `chat-query-router.ts`, `chat-response-merger.ts`

Structured console logs at key pipeline points:
- `[Chat][Router] intent=document subtype=law_regulation confidence=0.92 latency=87ms`
- `[Chat][RAG] query chunks_found=14 above_threshold=8 after_rerank=5 latency=320ms`
- `[Chat][DataAgent] tools_called=get_claims_summary,get_provider_stats iterations=2 latency=1200ms`
- `[Chat][Merger] doc_available=true data_available=true latency=450ms`
- `[Chat][Error] stage=reranker error="JSON parse failed" fallback=vector_sort`

### 4. Sample Document Seed

**New file:** `server/seeds/seed-knowledge-document.ts`

Content: A sample "CHI Mandatory Health Insurance Policy" covering coverage requirements, minimum benefit standards, provider network requirements, claims submission timelines, and penalties for non-compliance.

Approach:
- Insert `knowledge_documents` row (status: `completed`)
- Chunk text using same `chunkText()` logic as real pipeline
- Call OpenAI embedding API for real embeddings
- Insert `knowledge_chunks` rows with embeddings
- Requires `OPENAI_API_KEY` at seed time
- Add npm script: `npm run seed:knowledge`
- Idempotent — checks if sample doc already exists before inserting

Expected: ~15-25 chunks with real embeddings.

## Scope Summary

| Area | What changes | Files touched |
|---|---|---|
| SQL injection fix | Parameterize all data agent tool queries | `chat-data-agent.ts` |
| Similarity threshold | Gate chunks at 0.3, skip reranker if none pass | `chat-rag-service.ts` |
| Empty KB short-circuit | Count check before embedding API call | `chat-rag-service.ts` |
| Reranker resilience | try/catch JSON parse, fallback to vector sort | `chat-rag-service.ts` |
| Router fallback | Change error default from `"document"` to `"general"` | `chat-rag-service.ts` |
| Structured logging | Console logs at router, RAG, data agent, merger | `chat-rag-service.ts`, `chat-data-agent.ts`, `chat-query-router.ts`, `chat-response-merger.ts` |
| Sample document seed | Seed script with real embeddings | New: `server/seeds/seed-knowledge-document.ts` |

## Not In Scope

- No new features or tools
- No UI changes
- No new agent types
