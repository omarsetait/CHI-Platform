# Chatbot Audit, Hardening & Sample Document Seed — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix security issues, harden error handling, add observability logging, and seed a sample document so the full chat pipeline can be tested end-to-end.

**Architecture:** The existing chat pipeline (query router → document RAG / data agent / merger → SSE stream) is functionally complete. This plan fixes identified bugs, adds resilience, and creates test data. No new features or UI changes.

**Tech Stack:** TypeScript, drizzle-orm (with `sql` template literals), OpenAI API (gpt-4o, text-embedding-ada-002), pgvector, Express SSE

**Design doc:** `docs/plans/2026-03-02-chatbot-audit-hardening-design.md`

---

### Task 1: Fix SQL Injection in Data Agent Tools

**Files:**
- Modify: `server/services/chat-data-agent.ts:96-171` (the `executeDataTool` function)

**Context:** The `executeDataTool` function builds SQL queries using string interpolation with values controlled by GPT's function call arguments (e.g., `WHERE status = '${status}'`). While `executeSafeQuery` has pattern-based guards, string interpolation is still unsafe practice. Switch to drizzle's parameterized `sql` template literals using `db.execute()`.

**Step 1: Refactor `executeDataTool` to use parameterized queries**

Replace the entire `executeDataTool` function. Key changes:
- Import `db` and `sql` from drizzle instead of using `executeSafeQuery` for the pre-built tools
- Use `sql` template literals for parameterized values
- Validate enum values against allowlists before query construction
- Keep `executeSafeQuery` only for `run_custom_query` (which truly accepts arbitrary SQL)

```typescript
import { db } from "../db";
import { sql } from "drizzle-orm";
import { executeSafeQuery, validateQuery } from "./sql-guard";

// Allowlists for enum validation
const CLAIMS_STATUS_VALUES = new Set(["approved", "rejected", "pending"]);
const CLAIMS_GROUP_BY = new Map([
  ["status", "status"],
  ["provider", "provider_name"],
  ["month", "DATE_TRUNC('month', created_at)"],
]);
const PROVIDER_SORT_COLUMNS = new Map([
  ["rejection_rate", "rejection_rate DESC"],
  ["compliance_score", "compliance_score DESC"],
  ["risk_score", "risk_score DESC"],
  ["claims_volume", "total_claims DESC"],
]);
const BENEFICIARY_GROUP_COLUMNS = new Map([
  ["region", "region"],
  ["coverage_status", "coverage_status"],
  ["employer", "employer_name"],
]);
const FWA_SEVERITY_VALUES = new Set(["high", "medium", "low"]);
const FWA_ENTITY_TYPE_VALUES = new Set(["provider", "doctor", "patient"]);
const DRG_GROUP_COLUMNS = new Set(["drg_code", "provider", "specialty"]);

async function executeDataTool(name: string, args: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case "get_claims_summary": {
        const { status, groupBy, limit = 10 } = args as any;
        const safeLimit = Math.min(Math.max(1, Number(limit) || 10), 100);

        if (groupBy && CLAIMS_GROUP_BY.has(groupBy)) {
          const groupCol = CLAIMS_GROUP_BY.get(groupBy)!;
          // groupCol is from our allowlist, safe to use in raw SQL
          let query = `SELECT ${groupCol} as group_key, COUNT(*) as count FROM claims`;
          if (status && status !== "all" && CLAIMS_STATUS_VALUES.has(status)) {
            query += ` WHERE status = '${status}'`;
          }
          query += ` GROUP BY 1 ORDER BY count DESC LIMIT ${safeLimit}`;
          const result = await db.execute(sql.raw(query));
          return JSON.stringify(result.rows);
        } else {
          if (status && status !== "all" && CLAIMS_STATUS_VALUES.has(status)) {
            const result = await db.execute(
              sql`SELECT COUNT(*) as total_claims FROM claims WHERE status = ${status} LIMIT ${safeLimit}`
            );
            return JSON.stringify(result.rows);
          }
          const result = await db.execute(
            sql`SELECT COUNT(*) as total_claims FROM claims LIMIT ${safeLimit}`
          );
          return JSON.stringify(result.rows);
        }
      }

      case "get_provider_stats": {
        const { sortBy = "claims_volume", limit = 10 } = args as any;
        const safeLimit = Math.min(Math.max(1, Number(limit) || 10), 100);
        const orderCol = PROVIDER_SORT_COLUMNS.get(sortBy) || "total_claims DESC";
        const result = await db.execute(
          sql.raw(`SELECT name, region, tier, total_claims, rejection_rate, compliance_score, risk_score FROM provider_directory ORDER BY ${orderCol} LIMIT ${safeLimit}`)
        );
        return JSON.stringify(result.rows);
      }

      case "get_beneficiary_stats": {
        const { groupBy = "coverage_status", limit = 10 } = args as any;
        const safeLimit = Math.min(Math.max(1, Number(limit) || 10), 100);
        const col = BENEFICIARY_GROUP_COLUMNS.get(groupBy) || "coverage_status";
        const result = await db.execute(
          sql.raw(`SELECT ${col}, COUNT(*) as count FROM portal_members GROUP BY 1 ORDER BY count DESC LIMIT ${safeLimit}`)
        );
        return JSON.stringify(result.rows);
      }

      case "get_fwa_alerts": {
        const { severity = "all", entityType = "all", limit = 10 } = args as any;
        const safeLimit = Math.min(Math.max(1, Number(limit) || 10), 100);
        const conditions: string[] = [];
        if (severity !== "all" && FWA_SEVERITY_VALUES.has(severity)) {
          conditions.push(`severity = '${severity}'`);
        }
        if (entityType !== "all" && FWA_ENTITY_TYPE_VALUES.has(entityType)) {
          conditions.push(`entity_type = '${entityType}'`);
        }
        let query = "SELECT id, entity_type, entity_name, risk_score, status, created_at FROM fwa_cases";
        if (conditions.length) query += " WHERE " + conditions.join(" AND ");
        query += ` ORDER BY risk_score DESC LIMIT ${safeLimit}`;
        const result = await db.execute(sql.raw(query));
        return JSON.stringify(result.rows);
      }

      case "get_drg_analysis": {
        const { groupBy = "drg_code", limit = 10 } = args as any;
        const safeLimit = Math.min(Math.max(1, Number(limit) || 10), 100);
        const safeGroupBy = DRG_GROUP_COLUMNS.has(groupBy) ? groupBy : "drg_code";
        const result = await db.execute(
          sql.raw(`SELECT ${safeGroupBy}, COUNT(*) as cases FROM digital_twins GROUP BY 1 ORDER BY cases DESC LIMIT ${safeLimit}`)
        );
        return JSON.stringify(result.rows);
      }

      case "run_custom_query": {
        const { query, explanation } = args as any;
        const validation = validateQuery(query);
        if (!validation.allowed) {
          return JSON.stringify({ error: validation.reason });
        }
        const result = await executeSafeQuery(query);
        return JSON.stringify({ explanation, data: result.rows, rowCount: result.rowCount });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err: any) {
    return JSON.stringify({ error: err.message });
  }
}
```

**Step 2: Verify the server compiles**

Run: `npx tsc --noEmit`
Expected: No new type errors

**Step 3: Commit**

```bash
git add server/services/chat-data-agent.ts
git commit -m "fix: parameterize data agent SQL queries to prevent injection"
```

---

### Task 2: RAG Pipeline Hardening — Similarity Threshold & Empty KB Short-Circuit

**Files:**
- Modify: `server/services/chat-rag-service.ts:44-96` (the `searchKnowledgeChunks` function)

**Context:** Currently `searchKnowledgeChunks` always calls the embedding API even when the knowledge base is empty, and returns chunks regardless of similarity score. Add a count check and a minimum similarity threshold.

**Step 1: Add empty KB check and similarity threshold**

Add these changes to `chat-rag-service.ts`:

At the top of the file, add the constant:
```typescript
const MIN_SIMILARITY_THRESHOLD = 0.3;
```

Replace the `searchKnowledgeChunks` function:

```typescript
async function searchKnowledgeChunks(
  query: string,
  limit = 20,
  category?: string
): Promise<Array<{
  id: string;
  content: string;
  document_id: string;
  chunk_index: number;
  similarity: number;
  document_title: string;
  section_title: string;
  page_number: number;
  document_category: string;
}>> {
  // Short-circuit: check if knowledge base has any completed chunks
  const countFilter = category
    ? sql`AND d.category = ${category}`
    : sql``;
  const countResult = await db.execute(sql`
    SELECT COUNT(*) as cnt FROM knowledge_chunks c
    JOIN knowledge_documents d ON c.document_id = d.id
    WHERE c.embedding IS NOT NULL AND d.processing_status = 'completed'
    ${countFilter}
  `);
  const chunkCount = parseInt((countResult.rows[0] as any).cnt, 10);
  if (chunkCount === 0) {
    console.info(`[Chat][RAG] Empty knowledge base (category=${category || "all"}), skipping embedding`);
    return [];
  }

  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: query,
  });
  const embedding = embeddingResponse.data[0].embedding;
  const embeddingStr = `[${embedding.join(",")}]`;

  const categoryFilter = category
    ? sql` AND d.category = ${category}`
    : sql``;

  const results = await db.execute(sql`
    SELECT c.id, c.content, c.document_id, c.chunk_index,
           c.section_title, c.page_number,
           1 - (c.embedding <=> ${embeddingStr}::vector) as similarity,
           d.title as document_title,
           d.category as document_category
    FROM knowledge_chunks c
    JOIN knowledge_documents d ON c.document_id = d.id
    WHERE c.embedding IS NOT NULL
      AND d.processing_status = 'completed'
      ${categoryFilter}
    ORDER BY c.embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `);

  // Filter by minimum similarity threshold
  const filtered = (results.rows as any[]).filter(
    (r) => parseFloat(r.similarity) >= MIN_SIMILARITY_THRESHOLD
  );

  if (filtered.length < results.rows.length) {
    console.info(
      `[Chat][RAG] Similarity filter: ${results.rows.length} raw → ${filtered.length} above threshold (${MIN_SIMILARITY_THRESHOLD})`
    );
  }

  return filtered as Array<{
    id: string;
    content: string;
    document_id: string;
    chunk_index: number;
    similarity: number;
    document_title: string;
    section_title: string;
    page_number: number;
    document_category: string;
  }>;
}
```

**Step 2: Verify the server compiles**

Run: `npx tsc --noEmit`
Expected: No new type errors

**Step 3: Commit**

```bash
git add server/services/chat-rag-service.ts
git commit -m "fix: add similarity threshold and empty KB short-circuit to RAG pipeline"
```

---

### Task 3: Reranker Resilience

**Files:**
- Modify: `server/services/chat-rag-service.ts:98-132` (the `rerankChunks` function)

**Context:** The reranker parses JSON from GPT with no error handling. If the model returns malformed JSON or the API call fails, the entire document pipeline crashes. Add try/catch with fallback to raw vector-sorted results.

**Step 1: Add resilience to `rerankChunks`**

Replace the `rerankChunks` function:

```typescript
async function rerankChunks(
  query: string,
  chunks: Array<{ id: string; content: string; similarity: number; [key: string]: any }>,
  topK = 5
): Promise<typeof chunks> {
  if (chunks.length <= topK) return chunks;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a relevance ranker. Given a query and a list of text chunks, score each chunk's relevance to the query from 0-10. Return JSON: {"scores": [{"index": 0, "score": 8}, ...]}`,
        },
        {
          role: "user",
          content: `Query: "${query}"\n\nChunks:\n${chunks.map((c, i) => `[${i}] ${c.content.slice(0, 300)}`).join("\n\n")}`,
        },
      ],
    });

    const parsed = JSON.parse(response.choices[0].message.content || "{}");
    const scores: Array<{ index: number; score: number }> = parsed.scores || [];

    if (scores.length === 0) {
      console.info("[Chat][RAG] Reranker returned empty scores, falling back to vector sort");
      return chunks.slice(0, topK);
    }

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((s) => chunks[s.index])
      .filter(Boolean);
  } catch (error) {
    console.error("[Chat][Error] stage=reranker error=" + JSON.stringify((error as Error).message) + " fallback=vector_sort");
    // Fallback: return top chunks by raw vector similarity
    return chunks.slice(0, topK);
  }
}
```

**Step 2: Verify the server compiles**

Run: `npx tsc --noEmit`
Expected: No new type errors

**Step 3: Commit**

```bash
git add server/services/chat-rag-service.ts
git commit -m "fix: add reranker resilience with vector-sort fallback"
```

---

### Task 4: Router Fallback Fix

**Files:**
- Modify: `server/services/chat-rag-service.ts:304-309` (the router catch block in `streamChatResponse`)

**Context:** When the query router fails, the fallback defaults to `"document"` intent, which triggers the full RAG pipeline unnecessarily (e.g., for a simple greeting). Change to `"general"`.

**Step 1: Change the router error fallback**

In `streamChatResponse`, find and replace:

```typescript
// Old:
  } catch {
    // If router fails, fall back to document intent
    routerResult = { intent: "document" as const, confidence: 0, reasoning: "Router fallback" };
  }
```

With:

```typescript
  } catch (routerError) {
    console.error("[Chat][Error] stage=router error=" + JSON.stringify((routerError as Error).message) + " fallback=general");
    routerResult = { intent: "general" as const, confidence: 0, reasoning: "Router fallback" };
  }
```

**Step 2: Commit**

```bash
git add server/services/chat-rag-service.ts
git commit -m "fix: change router error fallback from document to general intent"
```

---

### Task 5: Structured Logging Across Pipeline

**Files:**
- Modify: `server/services/chat-query-router.ts:33-65` (add timing + log)
- Modify: `server/services/chat-rag-service.ts` (add logs in `streamChatResponse` dispatch)
- Modify: `server/services/chat-data-agent.ts:185-243` (add timing + log)
- Modify: `server/services/chat-response-merger.ts:17-53` (add timing + log)

**Step 1: Add logging to the query router**

In `chat-query-router.ts`, wrap the `classifyQuery` function body with timing:

```typescript
export async function classifyQuery(
  userMessage: string,
  recentMessages: Array<{role: string; content: string}> = []
): Promise<RouterResult> {
  const start = Date.now();
  const contextMessages = recentMessages.slice(-3).map(m =>
    `${m.role}: ${m.content}`
  ).join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    max_tokens: 200,
    messages: [
      { role: "system", content: ROUTER_SYSTEM_PROMPT },
      {
        role: "user",
        content: contextMessages
          ? `Recent conversation:\n${contextMessages}\n\nNew message to classify: "${userMessage}"`
          : `Classify this message: "${userMessage}"`
      }
    ]
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");

  const routerResult: RouterResult = {
    intent: result.intent || "general",
    documentSubtype: result.documentSubtype || undefined,
    confidence: result.confidence || 0.5,
    reasoning: result.reasoning || ""
  };

  console.info(
    `[Chat][Router] intent=${routerResult.intent} subtype=${routerResult.documentSubtype || "none"} confidence=${routerResult.confidence} latency=${Date.now() - start}ms`
  );

  return routerResult;
}
```

**Step 2: Add logging to the data agent**

In `chat-data-agent.ts`, wrap the `queryPlatformData` function with timing:

Add `const start = Date.now();` as the first line inside `queryPlatformData`.

Change the two return statements:

```typescript
// After the while loop's else branch (line ~232):
      console.info(
        `[Chat][DataAgent] tools_called=${toolsUsed.join(",") || "none"} iterations=${iterations} latency=${Date.now() - start}ms`
      );
      return {
        content: choice.message.content || "I couldn't find the data to answer that question.",
        toolsUsed
      };

// After the max iterations fallback (line ~239):
  console.info(
    `[Chat][DataAgent] tools_called=${toolsUsed.join(",") || "none"} iterations=${iterations} hit_limit=true latency=${Date.now() - start}ms`
  );
  return {
    content: "I attempted to query the data but reached the processing limit. Please try a more specific question.",
    toolsUsed
  };
```

**Step 3: Add logging to the response merger**

In `chat-response-merger.ts`, wrap the function with timing:

```typescript
export async function mergeResponses(input: MergerInput): Promise<string> {
  const { userMessage, documentResponse, dataResponse } = input;

  // If only one source has content, return it directly
  if (documentResponse && !dataResponse) {
    console.info("[Chat][Merger] doc_available=true data_available=false passthrough=doc");
    return documentResponse.content;
  }
  if (dataResponse && !documentResponse) {
    console.info("[Chat][Merger] doc_available=false data_available=true passthrough=data");
    return dataResponse.content;
  }
  if (!documentResponse && !dataResponse) {
    console.info("[Chat][Merger] doc_available=false data_available=false passthrough=empty");
    return "I couldn't find relevant information to answer your question.";
  }

  const start = Date.now();
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.3,
    max_tokens: 2000,
    messages: [
      {
        role: "system",
        content: `You are a response merger. Combine two information sources into a single coherent response.
Preserve citation references [1], [2] from the document source.
Attribute data from the platform source as "According to platform data..."
Create a unified narrative that flows naturally.`
      },
      {
        role: "user",
        content: `User question: "${userMessage}"

Document knowledge response:
${documentResponse?.content || "No document information found."}

Platform data response:
${dataResponse?.content || "No platform data found."}

Merge these into a single, well-structured response.`
      }
    ]
  });

  console.info(`[Chat][Merger] doc_available=true data_available=true latency=${Date.now() - start}ms`);

  return response.choices[0].message.content || "Unable to merge responses.";
}
```

**Step 4: Add logging to the RAG dispatch in `streamChatResponse`**

In `chat-rag-service.ts`, add a log line after the intent dispatch completes (before the SSE streaming section, around line 425):

```typescript
    }
  } catch (agentError) {
```

Add before this catch block:

```typescript
    console.info(
      `[Chat][Pipeline] intent=${routerResult.intent} sources=${sourcesMetadata.length} chunks=${ragChunkIds.length} tools=${dataResult?.toolsUsed?.join(",") || "none"}`
    );
```

**Step 5: Verify the server compiles**

Run: `npx tsc --noEmit`
Expected: No new type errors

**Step 6: Commit**

```bash
git add server/services/chat-query-router.ts server/services/chat-data-agent.ts server/services/chat-response-merger.ts server/services/chat-rag-service.ts
git commit -m "feat: add structured logging across chat pipeline"
```

---

### Task 6: Sample Document Seed Script

**Files:**
- Create: `server/seeds/seed-knowledge-document.ts`
- Modify: `package.json` (add `seed:knowledge` script)

**Context:** Create a seed script that inserts a realistic CHI regulatory document into `knowledge_documents` and `knowledge_chunks` with real embeddings from the OpenAI API. The script must be idempotent (skip if document already exists) and use the same chunking logic as the real pipeline.

**Step 1: Create the seed script**

Create `server/seeds/seed-knowledge-document.ts`:

```typescript
import { db, closePool } from "../db";
import { sql } from "drizzle-orm";
import OpenAI from "openai";

const openai = new OpenAI();

const SEED_DOCUMENT_TITLE = "CHI Mandatory Health Insurance Policy — Sample";

const DOCUMENT_TEXT = `CHI Mandatory Health Insurance Policy
Council of Health Insurance — Kingdom of Saudi Arabia

Chapter 1: General Provisions and Definitions

Article 1: Scope and Applicability
This policy establishes the mandatory health insurance requirements for all employers operating within the Kingdom of Saudi Arabia, as mandated by the Council of Health Insurance (CHI). All entities employing one or more workers, whether Saudi nationals or expatriates, must provide cooperative health insurance coverage that meets the minimum standards set forth in this document.

Article 2: Definitions
For the purposes of this policy:
- "Employer" refers to any natural or legal person who employs one or more workers under a valid employment contract.
- "Beneficiary" refers to any individual entitled to health insurance coverage under this policy, including the insured worker and their eligible dependents (spouse and children under 25).
- "Health Insurance Company" refers to any insurance company licensed by CHI to provide cooperative health insurance.
- "Provider" refers to any healthcare facility licensed by the Ministry of Health or other competent authority to provide healthcare services.
- "Essential Benefits Package" refers to the minimum set of healthcare services that must be covered under any cooperative health insurance policy.

Chapter 2: Employer Obligations

Article 3: Mandatory Coverage Requirements
Every employer shall:
a) Provide health insurance coverage to all workers from the first day of employment.
b) Cover eligible dependents of Saudi national workers.
c) Maintain continuous coverage without gaps exceeding 30 days during policy transitions.
d) Select an insurance plan that meets or exceeds the Essential Benefits Package.
e) Bear the full cost of worker insurance premiums; dependent premiums may be shared with the worker.

Article 4: Coverage Continuity
Employers must ensure coverage continuity during the following events:
a) Transfer of sponsorship: The new sponsor must activate coverage within 15 days.
b) Policy renewal: The employer must initiate renewal at least 30 days before expiry.
c) Termination of employment: Coverage must continue for 30 days after the last working day.
d) Disputes between employer and insurer: Coverage must not be interrupted during dispute resolution.

Chapter 3: Minimum Benefit Standards

Article 5: Essential Benefits Package
All cooperative health insurance policies must cover, at minimum:
a) Outpatient consultations and treatments, including specialist referrals.
b) Inpatient hospitalization, including room, board, nursing, and physician services.
c) Emergency services, including ambulance transport.
d) Maternity care, including prenatal visits, delivery, and postnatal care.
e) Prescription medications listed in the Saudi National Formulary.
f) Laboratory tests and diagnostic imaging as medically necessary.
g) Mental health services, including psychiatric consultations and therapy sessions.
h) Dental services, limited to emergency dental treatment and preventive care for children under 12.
i) Chronic disease management for conditions including diabetes, hypertension, and asthma.
j) Preventive care including vaccinations per the MOH immunization schedule.

Article 6: Coverage Limits
Minimum annual coverage limit: SAR 500,000 per beneficiary per policy year. Policies may set sub-limits for specific services (e.g., dental, optical) provided the aggregate meets the minimum. No lifetime maximum limits are permitted.

Article 7: Pre-Existing Conditions
Health insurance companies may not deny coverage or apply waiting periods for pre-existing conditions for policies renewing with the same insurer. For new policies, a maximum waiting period of 6 months may apply for pre-existing conditions, except for emergency treatment which must be covered immediately.

Chapter 4: Provider Network Requirements

Article 8: Network Adequacy
Insurance companies must maintain provider networks that ensure:
a) At least one primary care provider within 30 kilometers of every beneficiary.
b) Access to specialist services within the same region.
c) 24/7 emergency care access through network or non-network facilities.
d) All network providers must be licensed and accredited per CHI standards.
e) Minimum network size: 3 hospitals and 10 clinics per region where beneficiaries reside.

Article 9: Provider Compliance and Quality
Network providers must:
a) Submit claims electronically via NPHIES within 30 days of service delivery.
b) Follow ICD-10-AM coding standards for diagnoses and ACHI for procedures.
c) Maintain patient medical records for a minimum of 10 years.
d) Participate in CHI quality monitoring programs and report quality indicators quarterly.
e) Comply with DRG-based payment models where applicable.

Chapter 5: Claims Submission and Processing

Article 10: Claims Submission Timelines
a) Providers must submit claims within 30 calendar days of service delivery.
b) Insurance companies must process and adjudicate claims within 15 business days of receipt.
c) Clean claims (no errors or missing information) must be paid within 30 calendar days of submission.
d) Disputed claims must be resolved within 60 calendar days, with interest payable on delayed payments.

Article 11: Claims Rejection Criteria
Insurance companies may reject claims only for the following reasons:
a) Service not covered under the policy benefits.
b) Treatment not medically necessary (must be supported by clinical guidelines).
c) Claim submitted after the deadline without valid justification.
d) Duplicate claim submission.
e) Incorrect coding (ICD-10-AM / ACHI mismatch).
f) Policy was not active at the time of service.
g) Pre-authorization not obtained for services requiring prior approval.

Article 12: Pre-Authorization Requirements
The following services require pre-authorization from the insurance company:
a) Elective surgical procedures.
b) Inpatient admissions exceeding 24 hours (except emergencies).
c) Advanced diagnostic imaging (MRI, CT, PET scans).
d) Specialty medications not on the standard formulary.
e) Rehabilitation services exceeding 10 sessions.
Pre-authorization decisions must be communicated within 5 business days for non-urgent requests and 4 hours for urgent requests.

Chapter 6: Penalties and Enforcement

Article 13: Employer Non-Compliance Penalties
Employers found in violation of this policy shall be subject to:
a) First offense: Warning letter and 30-day compliance deadline.
b) Second offense: Fine of SAR 10,000 per uninsured worker.
c) Third offense: Fine of SAR 50,000 per uninsured worker and referral to the Ministry of Human Resources for potential suspension of work permits.
d) Continued non-compliance: Revocation of commercial registration until compliance is achieved.

Article 14: Insurance Company Non-Compliance Penalties
Insurance companies found in violation shall be subject to:
a) Failure to process claims on time: Interest at 1% per month on delayed amounts.
b) Unjustified claim rejections: Reversal of rejection plus SAR 5,000 penalty per instance.
c) Network adequacy failures: SAR 100,000 fine per region below minimum standards.
d) Systematic violations: Suspension or revocation of CHI license.

Article 15: Provider Non-Compliance Penalties
Providers found in violation shall be subject to:
a) Late claims submission: Forfeiture of claim amount.
b) Coding errors: Mandatory resubmission; repeated errors trigger audit.
c) Quality indicator non-reporting: SAR 20,000 fine per quarter.
d) Patient record violations: SAR 50,000 fine and potential license review.

Chapter 7: Effective Date and Transitional Provisions

Article 16: Effective Date
This policy takes effect from 1 Muharram 1446 (corresponding to July 7, 2024). Employers with existing policies have a 90-day grace period to align with the updated requirements.

Article 17: Amendments
CHI reserves the right to amend this policy through official circulars. Amendments take effect 60 days after publication unless otherwise specified.`;

const MAX_CHUNK_TOKENS = 500;
const CHUNK_OVERLAP = 50;
const BATCH_SIZE = 20;

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = "";
  let estimatedTokens = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = Math.ceil(paragraph.length / 4);
    if (estimatedTokens + paragraphTokens > MAX_CHUNK_TOKENS && currentChunk) {
      chunks.push(currentChunk.trim());
      const lastWords = currentChunk.split(/\s+/).slice(-CHUNK_OVERLAP);
      currentChunk = lastWords.join(" ") + " " + paragraph;
      estimatedTokens = Math.ceil(currentChunk.length / 4);
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
      estimatedTokens += paragraphTokens;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter((c) => c.length > 10);
}

async function main() {
  console.log("[Seed] Starting knowledge document seed...");

  // Idempotency check
  const existing = await db.execute(
    sql`SELECT id FROM knowledge_documents WHERE title = ${SEED_DOCUMENT_TITLE} LIMIT 1`
  );
  if (existing.rows.length > 0) {
    console.log("[Seed] Sample document already exists, skipping.");
    await closePool();
    return;
  }

  // 1. Insert document record
  const docResult = await db.execute(sql`
    INSERT INTO knowledge_documents (
      filename, original_filename, file_type, category, title,
      description, source_authority, file_path, file_size, mime_type,
      extracted_text, page_count, language, processing_status
    ) VALUES (
      'seed_chi_mandatory_policy.txt',
      'CHI Mandatory Health Insurance Policy.txt',
      'text',
      'chi_mandatory_policy',
      ${SEED_DOCUMENT_TITLE},
      'Sample CHI mandatory health insurance policy covering employer obligations, minimum benefits, provider networks, claims processing, and penalties.',
      'CHI',
      'seed://chi-mandatory-policy',
      ${DOCUMENT_TEXT.length},
      'text/plain',
      ${DOCUMENT_TEXT},
      ${1},
      'en',
      'generating_embeddings'
    ) RETURNING id
  `);
  const documentId = (docResult.rows[0] as any).id;
  console.log(`[Seed] Created document: ${documentId}`);

  // 2. Chunk the text
  const chunks = chunkText(DOCUMENT_TEXT);
  console.log(`[Seed] Created ${chunks.length} chunks`);

  // 3. Generate embeddings and insert chunks
  let totalInserted = 0;
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    console.log(`[Seed] Generating embeddings for batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}...`);

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: batch.map((t) => t.slice(0, 8000)),
    });

    for (let j = 0; j < batch.length; j++) {
      const chunkIndex = i + j;
      const embedding = embeddingResponse.data[j].embedding;
      const embeddingStr = `[${embedding.join(",")}]`;

      // Detect section title from the chunk content
      const sectionMatch = batch[j].match(/^(Chapter \d+|Article \d+)[:\s]*(.*)/m);
      const sectionTitle = sectionMatch ? `${sectionMatch[1]}: ${sectionMatch[2]}`.trim() : null;

      await db.execute(sql`
        INSERT INTO knowledge_chunks (
          document_id, chunk_index, content, token_count, section_title, page_number, embedding
        ) VALUES (
          ${documentId},
          ${chunkIndex},
          ${batch[j]},
          ${Math.ceil(batch[j].length / 4)},
          ${sectionTitle},
          ${1},
          ${embeddingStr}::vector
        )
      `);
      totalInserted++;
    }
  }

  // 4. Mark document as completed
  await db.execute(sql`
    UPDATE knowledge_documents
    SET processing_status = 'completed', chunk_count = ${totalInserted}, updated_at = NOW()
    WHERE id = ${documentId}
  `);

  console.log(`[Seed] Done! Inserted ${totalInserted} chunks with embeddings for document ${documentId}`);
  await closePool();
}

main().catch((err) => {
  console.error("[Seed] Fatal error:", err);
  process.exit(1);
});
```

**Step 2: Add npm script**

Add to `package.json` scripts:

```json
"seed:knowledge": "tsx --env-file=.env server/seeds/seed-knowledge-document.ts"
```

**Step 3: Verify the script compiles**

Run: `npx tsc --noEmit`
Expected: No new type errors

**Step 4: Commit**

```bash
mkdir -p server/seeds
git add server/seeds/seed-knowledge-document.ts package.json
git commit -m "feat: add sample CHI policy document seed with real embeddings"
```

---

### Task 7: End-to-End Verification

**Files:** None (manual testing)

**Step 1: Run the seed script**

Run: `npm run seed:knowledge`
Expected output:
```
[Seed] Starting knowledge document seed...
[Seed] Created document: <uuid>
[Seed] Created N chunks
[Seed] Generating embeddings for batch 1/...
...
[Seed] Done! Inserted N chunks with embeddings for document <uuid>
```

**Step 2: Start the dev server**

Run: `npm run dev`
Expected: Server starts without errors

**Step 3: Verify structured logs appear**

Test the chat endpoint with curl to verify logs are emitted:

```bash
# Create a conversation
curl -s -X POST http://localhost:5000/api/chat/conversations \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-123","pillarContext":{"pillarId":"fwa","pagePath":"/fwa/dashboard"}}' | jq .id
```

Then send a message (replace `<conv-id>` with the returned id):

```bash
# Test document intent
curl -N -X POST http://localhost:5000/api/chat/conversations/<conv-id>/messages \
  -H "Content-Type: application/json" \
  -d '{"content":"What are the coverage requirements for employers under the CHI mandatory health insurance policy?"}'
```

Expected server logs should include:
- `[Chat][Router] intent=document ...`
- `[Chat][RAG] ...` (if chunks found)
- `[Chat][Pipeline] intent=document sources=... chunks=...`

**Step 4: Test data intent**

```bash
curl -N -X POST http://localhost:5000/api/chat/conversations/<conv-id>/messages \
  -H "Content-Type: application/json" \
  -d '{"content":"How many claims are in the system grouped by status?"}'
```

Expected server logs:
- `[Chat][Router] intent=data ...`
- `[Chat][DataAgent] tools_called=get_claims_summary ...`

**Step 5: Test general intent**

```bash
curl -N -X POST http://localhost:5000/api/chat/conversations/<conv-id>/messages \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello, what can you help me with?"}'
```

Expected server logs:
- `[Chat][Router] intent=general ...`

**Step 6: Final commit**

If any adjustments were needed during testing, commit them:

```bash
git add -A
git commit -m "chore: final adjustments from end-to-end verification"
```
