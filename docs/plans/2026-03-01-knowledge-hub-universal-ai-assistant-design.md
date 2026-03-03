# Knowledge Hub & Universal AI Assistant — Design Document

**Date:** 2026-03-01
**Status:** Approved
**Scope:** Enterprise-grade Knowledge Hub with document RAG + platform data access

---

## 1. Vision

Transform the existing Daman AI chatbot from a document-only RAG assistant into a **universal AI assistant** that can:

1. Answer questions from **uploaded Knowledge Hub documents** (regulations, circulars, clinical manuals, drug formulary, CHI policies)
2. Answer questions from **platform seeded data** (claims, providers, encounters, DRGs, FWA alerts, beneficiaries)
3. Handle **mixed queries** that require both document knowledge and live platform data

Architecture: **Query Router + Specialized Agents** with clean separation of concerns.

---

## 2. Current State (What Exists)

### Fully Built & Working:
- **Knowledge Hub UI** — Document library, upload dialog (drag-drop, multi-file), search, stats dashboard
- **Bulk Upload Queue** — Background worker with exponential backoff retry (3 concurrent, 1s polling)
- **Document Ingestion** — Text extraction (PDF/Word/Excel/Image via GPT-4o vision), chunking (500 tokens, 50 overlap), ada-002 embeddings
- **RAG Pipeline** — pgvector cosine similarity search (top 5), GPT-4o streaming with 10-message context window
- **Chat UI** — FAB + slide-out panel, pillar-aware, SSE streaming, starter questions
- **Database** — 6 tables with pgvector HNSW indexes, all migrations applied

### Gaps to Address:
- No platform data access from chatbot
- No document sub-type category filtering in retrieval
- No citation UI in chat responses
- No re-ranking for enterprise-scale retrieval quality
- No document management (delete, re-process)
- Category enum doesn't match real-world document types

---

## 3. Architecture: Query Router + Specialized Agents

```
User Message
    │
    ▼
┌──────────────────┐
│   Query Router    │  GPT-4o-mini classifier (~100ms)
│  (chat-query-     │  Input: message + last 3 messages
│   router.ts)      │  Output: { intent, documentSubtype, confidence }
└──────┬───────────┘
       │
       ├── intent: "document" ──────► Document RAG Agent
       │                              (category-filtered retrieval)
       │
       ├── intent: "data" ──────────► Platform Data Agent
       │                              (API tools + SQL fallback)
       │
       ├── intent: "mixed" ─────────► Both agents (parallel)
       │                              → Response Merger
       │
       └── intent: "general" ───────► Direct GPT-4o response
```

---

## 4. Query Router

**File:** `server/services/chat-query-router.ts`

**Classification output:**
```typescript
interface RouterResult {
  intent: "document" | "data" | "mixed" | "general";
  documentSubtype?: "law_regulation" | "resolution_circular" | "chi_mandatory_policy" | "clinical_manual" | "drug_formulary" | "all";
  confidence: number;
  reasoning: string;
}
```

**Model:** GPT-4o-mini with JSON mode (structured output)
**Input:** User message + last 3 conversation messages for context
**Latency:** ~100ms, ~$0.001/query

**Document sub-types and their mapping to knowledge_documents.category:**

| Sub-type | Category value | Description |
|----------|---------------|-------------|
| `law_regulation` | `law_regulation` | Laws, royal decrees, regulatory frameworks |
| `resolution_circular` | `resolution_circular` | MOH/CHI resolutions, circulars, directives |
| `chi_mandatory_policy` | `chi_mandatory_policy` | CHI mandatory policies, medical necessity criteria |
| `clinical_manual` | `clinical_manual` | Clinical pathways, procedure manuals, medical guidelines |
| `drug_formulary` | `drug_formulary` | Daman drug formulary, pharmaceutical guidelines |

**Routing examples:**

| Query | Intent | Subtype |
|-------|--------|---------|
| "What does CHI regulation say about prior authorization?" | `document` | `chi_mandatory_policy` |
| "How many claims were rejected last month?" | `data` | — |
| "Are providers complying with the MOH circular on DRG coding?" | `mixed` | `resolution_circular` |
| "Hello, how can you help me?" | `general` | — |

---

## 5. Document RAG Agent (Enterprise-Grade)

Upgrades the existing `chat-rag-service.ts` for 200+ document scale.

### Key changes from current implementation:

1. **Category-filtered retrieval**
   - Router provides `documentSubtype` → translates to `WHERE category = ?` on pgvector search
   - Reduces search space from 200+ docs to relevant subset
   - Falls back to all categories if subtype is `"all"` or confidence < 0.7

2. **Expanded retrieval + re-ranking**
   - Initial pgvector search: top 20 chunks (up from 5)
   - Re-ranking step: GPT-4o-mini scores each chunk's relevance to the query (0-10)
   - Select top 5 highest-scored chunks for the final prompt
   - Adds ~200ms but significantly improves answer quality at scale

3. **Inline citations**
   - System prompt instructs LLM to cite sources as `[1]`, `[2]`, etc.
   - Response includes a Sources footer with document title, section, and page number
   - Citation metadata stored in `retrievalMetadata` JSONB

4. **Improved chunking** (for new uploads)
   - Respect section boundaries (headings, numbered articles)
   - Preserve section titles in chunk metadata for better citation context
   - No change to existing chunks — only applies to new document processing

### Flow:
```
Query + documentSubtype
  → Embed query (ada-002)
  → pgvector search WHERE category = subtype (top 20)
  → Re-rank with GPT-4o-mini (select top 5)
  → Build prompt with ranked chunks + conversation history
  → GPT-4o streaming response with inline citations [1][2]
  → Save message + ragChunkIds + retrievalMetadata
```

### Citation format:
```
Prior authorization is required for all elective surgeries
with an expected cost exceeding SAR 50,000 [1]. The referring
physician must submit the PA request within 5 business days [2].

Sources:
[1] CHI Mandatory Policy v3.2, Page 47
[2] Medical Necessity Guidelines, Section 4.1
```

---

## 6. Platform Data Agent

**File:** `server/services/chat-data-agent.ts`

### Pre-built API Tools (8 tools):

| Tool | Description | Source |
|------|-------------|--------|
| `get_claims_summary` | Claims count, amounts, by status/provider | `claims` table |
| `get_provider_stats` | Provider compliance, rejection rates, risk scores | `providers` table |
| `get_encounter_analysis` | Encounter volumes, denial codes, ML vs final status | CPOE MCP |
| `get_denial_trends` | Monthly rejection/acceptance trends | CPOE MCP |
| `get_frequency_pairs` | ICD-CPT acceptance rates, top pairs | CPOE MCP |
| `get_beneficiary_stats` | Member counts, coverage, demographics | `beneficiaries` table |
| `get_drg_analysis` | DRG distribution, cost outliers, case-mix | `drg_cases` table |
| `get_fwa_alerts` | Fraud/waste/abuse alerts, risk scoring | `fwa_alerts` table |

### SQL Generation Fallback

When no pre-built tool matches, the LLM generates SQL with guardrails:

- **Read-only:** Only `SELECT` statements (validated via regex before execution)
- **Table whitelist:** Only platform data tables (claims, providers, encounters, beneficiaries, drg_cases, fwa_alerts, etc.)
- **Blocked tables:** users, sessions, auth, knowledge_*, chat_*
- **Row limit:** MAX 100 rows
- **Query timeout:** 5 seconds
- **No mutations:** Reject any INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE
- **Result formatting:** LLM summarizes raw SQL results into natural language

### Flow:
```
Query (intent: "data")
  → Platform Data Agent receives query + conversation history
  → GPT-4o with function calling decides: tool call OR SQL generation
  → Execute tool/SQL → structured data result
  → LLM formats into natural language with data attribution
  → Stream response
```

---

## 7. Response Merger (Mixed Queries)

When router classifies intent as `mixed`:

1. Both Document RAG Agent and Platform Data Agent execute **in parallel**
2. Both return their raw outputs (chunks + data results)
3. Final GPT-4o call receives both outputs and produces unified response
4. Document citations preserved inline `[1]`, `[2]`
5. Platform data attributed as "According to platform data..."
6. If one agent returns nothing useful, response gracefully relies on the other

### Example:
> **Query:** "Are providers complying with the MOH circular on DRG coding?"
>
> **Document Agent:** Retrieves MOH circular text about DRG coding requirements
> **Data Agent:** Calls `get_provider_stats(metric: 'drg_compliance')` → 78% compliance
>
> **Merged:** "The MOH Circular No. 2024/15 requires all providers to use AR-DRG v10.0 coding [1]. According to platform data, current compliance is at 78% — 42 out of 54 providers are fully compliant..."

---

## 8. Knowledge Hub Improvements

### Category enum update:
Replace current categories with document sub-types:
- `law_regulation`
- `resolution_circular`
- `chi_mandatory_policy`
- `clinical_manual`
- `drug_formulary`
- `training_material` (keep)
- `other` (keep)

### Document management:
- Delete document action (cascades to chunks via FK)
- Re-process document action (clears chunks, re-runs ingestion pipeline)
- Category reassignment (update category, optionally re-index)

### Upload improvements:
- Duplicate detection by filename hash
- Per-category document/chunk counts on dashboard
- Category filter dropdown on search bar

---

## 9. New Files

| File | Purpose |
|------|---------|
| `server/services/chat-query-router.ts` | Query intent classifier |
| `server/services/chat-data-agent.ts` | Platform data agent with API tools + SQL |
| `server/services/chat-response-merger.ts` | Combines document + data agent outputs |
| `server/services/sql-guard.ts` | SQL validation, whitelist, and execution sandbox |
| `migrations/0007_document_categories_update.sql` | Update category enum values |

## 10. Modified Files

| File | Changes |
|------|---------|
| `server/services/chat-rag-service.ts` | Add category filtering, re-ranking, citation prompting |
| `server/services/document-ingestion-service.ts` | Section-aware chunking, new categories |
| `server/routes/chat-routes.ts` | Wire router → agents → merger flow |
| `client/src/components/chat/chat-panel.tsx` | Citation rendering, source attribution UI |
| `client/src/pages/fwa/knowledge-hub.tsx` | Document management actions, category filter |
| `client/src/components/document-upload-dialog.tsx` | Updated category dropdown |
| `shared/schema.ts` | Updated category enum, any new tables |

---

## 11. Models & Costs

| Component | Model | Est. Cost/Query |
|-----------|-------|----------------|
| Query Router | GPT-4o-mini | ~$0.001 |
| Re-ranking (20 chunks) | GPT-4o-mini | ~$0.005 |
| Document RAG response | GPT-4o | ~$0.03 |
| Platform Data response | GPT-4o | ~$0.03 |
| Response Merger (mixed) | GPT-4o | ~$0.03 |
| Embeddings (query) | ada-002 | ~$0.0001 |

**Typical query cost:** $0.03-0.07 (single agent) or $0.07-0.10 (mixed)

---

## 12. Success Criteria

1. Chat can answer document questions with inline citations and source attribution
2. Chat can answer platform data questions using pre-built tools
3. Chat can handle mixed queries combining document knowledge + live data
4. Knowledge Hub supports 200+ documents with category-filtered retrieval
5. Re-ranking improves retrieval precision (measured by citation relevance)
6. SQL fallback handles ad-hoc data queries safely (read-only, whitelisted)
7. Upload dialog reflects new document categories
8. Document management (delete, re-process) works from Knowledge Hub
