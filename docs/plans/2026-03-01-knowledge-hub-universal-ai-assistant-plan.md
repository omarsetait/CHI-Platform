# Knowledge Hub & Universal AI Assistant — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Daman AI chatbot into a universal assistant with enterprise-grade document RAG (category-filtered, re-ranked, with citations) + platform data access (hybrid API tools + SQL fallback) via a Query Router + Specialized Agents architecture.

**Architecture:** Query Router (GPT-4o-mini classifier) dispatches user queries to a Document RAG Agent (category-filtered pgvector + re-ranking + citations), a Platform Data Agent (8 pre-built tools + SQL generation fallback), or both in parallel for mixed queries. A Response Merger combines outputs for mixed intent.

**Tech Stack:** OpenAI GPT-4o / GPT-4o-mini, ada-002 embeddings, pgvector (PostgreSQL), Drizzle ORM, Express SSE streaming, React + shadcn/ui

**Design Doc:** `docs/plans/2026-03-01-knowledge-hub-universal-ai-assistant-design.md`

---

## Track 1: Schema & Category Updates

### Task 1: Update document category enum in schema

**Files:**
- Modify: `shared/schema.ts:758-768`
- Create: `migrations/0007_document_categories_update.sql`

**Step 1: Update the category enum in schema.ts**

In `shared/schema.ts`, replace the `knowledgeDocumentCategoryEnum` definition (lines 758-768):

```typescript
export const knowledgeDocumentCategoryEnum = pgEnum("knowledge_document_category", [
  "law_regulation",
  "resolution_circular",
  "chi_mandatory_policy",
  "clinical_manual",
  "drug_formulary",
  "training_material",
  "other"
]);
```

**Step 2: Create migration to update existing enum values**

Create `migrations/0007_document_categories_update.sql`:

```sql
-- Rename existing enum values to new document sub-types
DO $$ BEGIN
  -- Add new values
  ALTER TYPE "knowledge_document_category" ADD VALUE IF NOT EXISTS 'law_regulation';
  ALTER TYPE "knowledge_document_category" ADD VALUE IF NOT EXISTS 'resolution_circular';
  ALTER TYPE "knowledge_document_category" ADD VALUE IF NOT EXISTS 'chi_mandatory_policy';
  ALTER TYPE "knowledge_document_category" ADD VALUE IF NOT EXISTS 'clinical_manual';
  ALTER TYPE "knowledge_document_category" ADD VALUE IF NOT EXISTS 'drug_formulary';
END $$;

-- Migrate existing data to new categories
UPDATE knowledge_documents SET category = 'law_regulation' WHERE category = 'regulation';
UPDATE knowledge_documents SET category = 'resolution_circular' WHERE category = 'circular';
UPDATE knowledge_documents SET category = 'chi_mandatory_policy' WHERE category = 'policy_violation';
UPDATE knowledge_documents SET category = 'clinical_manual' WHERE category IN ('medical_guideline', 'clinical_pathway', 'procedure_manual');
-- 'contract' maps to 'other', 'training_material' stays, 'other' stays
UPDATE knowledge_documents SET category = 'other' WHERE category = 'contract';
```

**Step 3: Update the migration journal**

Update `migrations/meta/_journal.json` to include the new migration entry.

**Step 4: Run migration to verify**

Run: `npx drizzle-kit push` or apply migration manually.
Expected: Enum values added, existing rows migrated.

**Step 5: Commit**

```bash
git add shared/schema.ts migrations/0007_document_categories_update.sql migrations/meta/
git commit -m "feat: update knowledge document categories to match real-world sub-types"
```

---

### Task 2: Update document upload dialog categories

**Files:**
- Modify: `client/src/components/document-upload-dialog.tsx:38-48`

**Step 1: Replace the documentCategories array**

In `document-upload-dialog.tsx`, replace lines 38-48:

```typescript
const documentCategories = [
  { value: "law_regulation", label: "Law & Regulation", labelAr: "نظام ولائحة" },
  { value: "resolution_circular", label: "Resolution & Circular", labelAr: "قرار وتعميم" },
  { value: "chi_mandatory_policy", label: "CHI Mandatory Policy", labelAr: "سياسة مجلس الضمان الإلزامية" },
  { value: "clinical_manual", label: "Clinical Manual", labelAr: "دليل سريري" },
  { value: "drug_formulary", label: "Drug Formulary", labelAr: "قائمة الأدوية" },
  { value: "training_material", label: "Training Material", labelAr: "مادة تدريبية" },
  { value: "other", label: "Other", labelAr: "أخرى" },
];
```

**Step 2: Verify upload dialog renders correctly**

Run the dev server and open the upload dialog. Verify the dropdown shows the 7 new categories.

**Step 3: Commit**

```bash
git add client/src/components/document-upload-dialog.tsx
git commit -m "feat: update upload dialog categories to match document sub-types"
```

---

### Task 3: Update Knowledge Hub UI with category filter

**Files:**
- Modify: `client/src/pages/fwa/knowledge-hub.tsx`

**Step 1: Add category labels map**

Add near the top of the file (after the status badge definitions around line 130):

```typescript
const categoryLabels: Record<string, string> = {
  law_regulation: "Law & Regulation",
  resolution_circular: "Resolution & Circular",
  chi_mandatory_policy: "CHI Mandatory Policy",
  clinical_manual: "Clinical Manual",
  drug_formulary: "Drug Formulary",
  training_material: "Training Material",
  other: "Other",
};
```

**Step 2: Add category filter dropdown**

Add a Select component next to the existing search input. When a category is selected, filter the document list by that category.

**Step 3: Use category labels in the document table**

Replace the plain `doc.category` display (line 482) with:

```typescript
<span className="text-sm">{categoryLabels[doc.category] || doc.category || "-"}</span>
```

**Step 4: Verify the filter works**

Run dev server, navigate to Knowledge Hub, verify category dropdown filters documents.

**Step 5: Commit**

```bash
git add client/src/pages/fwa/knowledge-hub.tsx
git commit -m "feat: add category filter and labels to Knowledge Hub"
```

---

## Track 2: Enterprise Document RAG Agent

### Task 4: Add category-filtered retrieval to RAG service

**Files:**
- Modify: `server/services/chat-rag-service.ts:39-63`

**Step 1: Update searchKnowledgeChunks to accept category filter**

Modify the `searchKnowledgeChunks` function signature and query:

```typescript
async function searchKnowledgeChunks(
  query: string,
  limit = 20,
  category?: string
): Promise<Array<{id: string; content: string; document_id: string; chunk_index: number; similarity: number; document_title: string; section_title: string; page_number: number; document_category: string}>>
```

Update the SQL query to:
- Add `WHERE d.category = $category` when category is provided
- Increase default limit from 5 to 20
- Join with knowledge_documents to get title, category, section_title, page_number

**Step 2: Verify the query works with and without category**

Test by calling `searchKnowledgeChunks("test query", 20)` — should return all categories.
Test by calling `searchKnowledgeChunks("test query", 20, "chi_mandatory_policy")` — should filter.

**Step 3: Commit**

```bash
git add server/services/chat-rag-service.ts
git commit -m "feat: add category-filtered retrieval to RAG search"
```

---

### Task 5: Add re-ranking step

**Files:**
- Modify: `server/services/chat-rag-service.ts`

**Step 1: Create rerankChunks function**

Add a new function after `searchKnowledgeChunks`:

```typescript
async function rerankChunks(
  query: string,
  chunks: Array<{id: string; content: string; similarity: number; [key: string]: any}>,
  topK = 5
): Promise<typeof chunks> {
  if (chunks.length <= topK) return chunks;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a relevance ranker. Given a query and a list of text chunks, score each chunk's relevance to the query from 0-10. Return JSON: {"scores": [{"index": 0, "score": 8}, ...]}`
      },
      {
        role: "user",
        content: `Query: "${query}"\n\nChunks:\n${chunks.map((c, i) => `[${i}] ${c.content.slice(0, 300)}`).join("\n\n")}`
      }
    ]
  });

  const result = JSON.parse(response.choices[0].message.content || "{}");
  const scores: Array<{index: number; score: number}> = result.scores || [];

  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(s => chunks[s.index])
    .filter(Boolean);
}
```

**Step 2: Wire re-ranking into streamChatResponse**

In `streamChatResponse`, after `searchKnowledgeChunks` returns 20 chunks, add:

```typescript
const rankedChunks = await rerankChunks(userMessage, chunks, 5);
```

Use `rankedChunks` instead of `chunks` for the rest of the function.

**Step 3: Commit**

```bash
git add server/services/chat-rag-service.ts
git commit -m "feat: add GPT-4o-mini re-ranking for enterprise-scale retrieval"
```

---

### Task 6: Add citation support (backend)

**Files:**
- Modify: `server/services/chat-rag-service.ts:85-104` (buildSystemPrompt)

**Step 1: Update system prompt to instruct citations**

Update `buildSystemPrompt` to format chunks with numbered references and instruct the LLM:

```typescript
function buildSystemPrompt(
  pillarId: string,
  pagePath: string,
  chunks: Array<{content: string; document_title: string; section_title: string; page_number: number; similarity: number}>
): string {
  const pillarName = PILLAR_NAMES[pillarId] || "TachyHealth Platform";

  let ragSection = "";
  if (chunks.length > 0) {
    ragSection = chunks.map((c, i) =>
      `[${i + 1}] Document: "${c.document_title}", Section: ${c.section_title || "N/A"}, Page: ${c.page_number || "N/A"}\n${c.content}`
    ).join("\n\n");
  } else {
    ragSection = "No relevant documents found in the knowledge base.";
  }

  return `You are Daman AI, the intelligent assistant for CHI's regulatory platform — TachyHealth.
You are currently assisting in the ${pillarName} module on the ${pagePath} page.

Your expertise covers:
- FWA (Fraud, Waste & Abuse) detection and investigation
- Provider oversight, accreditation, and compliance monitoring
- Market regulation, employer compliance, and cost intelligence
- Beneficiary protection, coverage transparency, and member services
- Saudi healthcare regulatory context: CHI regulations, NPHIES, SBS V3.0, AR-DRG, ICD-10-AM/ACHI

Retrieved knowledge:
${ragSection}

Instructions:
- Answer in the same language as the user's question (English or Arabic).
- Be precise, data-driven, and cite sources using [1], [2], etc. when referencing retrieved knowledge.
- After your response, include a "Sources:" section listing each cited source with document title and page number.
- If retrieved knowledge is relevant, prioritize it over general knowledge.
- If you don't know something, say so honestly rather than guessing.
- Format responses with markdown for readability.`;
}
```

**Step 2: Include source metadata in SSE response**

After the streaming response completes in `streamChatResponse`, send a final metadata event before `done`:

```typescript
// After streaming text, before done event:
const sourcesMetadata = rankedChunks.map((c, i) => ({
  index: i + 1,
  documentTitle: c.document_title,
  sectionTitle: c.section_title,
  pageNumber: c.page_number,
  similarity: c.similarity,
  chunkId: c.id,
  documentId: c.document_id
}));
res.write(`data: ${JSON.stringify({ sources: sourcesMetadata })}\n\n`);
res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
```

**Step 3: Commit**

```bash
git add server/services/chat-rag-service.ts
git commit -m "feat: add citation instructions and source metadata to RAG responses"
```

---

### Task 7: Add citation rendering (frontend)

**Files:**
- Modify: `client/src/components/chat/chat-provider.tsx`
- Modify: `client/src/components/chat/chat-panel.tsx`

**Step 1: Update ChatMessage interface to include sources**

In `chat-provider.tsx`, update the message type:

```typescript
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  sources?: Array<{
    index: number;
    documentTitle: string;
    sectionTitle: string;
    pageNumber: number;
    similarity: number;
  }>;
}
```

**Step 2: Parse sources from SSE stream**

In the SSE parsing loop in `sendMessage`, handle the `sources` event:

```typescript
if (data.sources) {
  setMessages(prev => prev.map(m =>
    m.id === assistantMsgId ? { ...m, sources: data.sources } : m
  ));
}
```

**Step 3: Add citation display in chat-panel.tsx**

After the message content `div`, add a collapsible sources section for assistant messages that have sources:

```tsx
{msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
  <div className="mt-2 border-t border-gray-200 pt-2">
    <p className="text-xs font-medium text-gray-500 mb-1">Sources</p>
    {msg.sources.map((src) => (
      <div key={src.index} className="text-xs text-gray-400 flex items-center gap-1">
        <span className="font-mono text-blue-500">[{src.index}]</span>
        <span>{src.documentTitle}</span>
        {src.pageNumber && <span>· p.{src.pageNumber}</span>}
      </div>
    ))}
  </div>
)}
```

**Step 4: Verify citations render correctly**

Run dev server, send a question that triggers document retrieval. Verify inline [1][2] references appear in text and source list renders below.

**Step 5: Commit**

```bash
git add client/src/components/chat/chat-provider.tsx client/src/components/chat/chat-panel.tsx
git commit -m "feat: render citation sources in chat panel"
```

---

## Track 3: Query Router

### Task 8: Create query router service

**Files:**
- Create: `server/services/chat-query-router.ts`

**Step 1: Create the router service file**

```typescript
import OpenAI from "openai";

const openai = new OpenAI();

export type QueryIntent = "document" | "data" | "mixed" | "general";
export type DocumentSubtype = "law_regulation" | "resolution_circular" | "chi_mandatory_policy" | "clinical_manual" | "drug_formulary" | "all";

export interface RouterResult {
  intent: QueryIntent;
  documentSubtype?: DocumentSubtype;
  confidence: number;
  reasoning: string;
}

const ROUTER_SYSTEM_PROMPT = `You are a query intent classifier for a healthcare regulatory platform (CHI - Council of Health Insurance, Saudi Arabia).

Classify user queries into one of these intents:
- "document": Questions about regulations, guidelines, policies, procedures, circulars, drug formulary. The user wants information from uploaded reference documents.
- "data": Questions about platform data — claims statistics, provider performance, encounter volumes, denial rates, beneficiary counts, DRG analysis, FWA alerts. The user wants numbers and analytics.
- "mixed": Questions requiring BOTH document knowledge AND platform data. Example: "Are providers complying with the MOH circular on DRG coding?" needs the circular text AND compliance data.
- "general": Greetings, clarifications, general questions not needing documents or data.

For "document" and "mixed" intents, also classify the document subtype:
- "law_regulation": Laws, royal decrees, regulatory frameworks
- "resolution_circular": MOH/CHI resolutions, circulars, directives
- "chi_mandatory_policy": CHI mandatory policies, medical necessity criteria
- "clinical_manual": Clinical pathways, procedure manuals, medical guidelines
- "drug_formulary": Drug formulary, pharmaceutical guidelines
- "all": Cannot determine specific subtype or spans multiple

Return JSON: {"intent": "...", "documentSubtype": "...", "confidence": 0.0-1.0, "reasoning": "..."}`;

export async function classifyQuery(
  userMessage: string,
  recentMessages: Array<{role: string; content: string}> = []
): Promise<RouterResult> {
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

  return {
    intent: result.intent || "general",
    documentSubtype: result.documentSubtype || undefined,
    confidence: result.confidence || 0.5,
    reasoning: result.reasoning || ""
  };
}
```

**Step 2: Verify the file compiles**

Run: `npx tsc --noEmit server/services/chat-query-router.ts`
Expected: No errors

**Step 3: Commit**

```bash
git add server/services/chat-query-router.ts
git commit -m "feat: add query router service for intent classification"
```

---

## Track 4: Platform Data Agent

### Task 9: Create SQL guard service

**Files:**
- Create: `server/services/sql-guard.ts`

**Step 1: Create the SQL guard**

```typescript
import { db } from "../db";
import { sql } from "drizzle-orm";

const ALLOWED_TABLES = new Set([
  // Claims & Pre-Auth
  "claims", "pre_auth_claims", "pre_auth_decisions", "pre_auth_signals",
  // FWA
  "fwa_cases", "fwa_analysis_findings", "fwa_high_risk_providers",
  "fwa_high_risk_patients", "fwa_high_risk_doctors", "fwa_analyzed_claims",
  "fwa_rule_hits", "fwa_detection_results",
  // Provider
  "provider_complaints", "provider_directory", "provider_scorecards",
  "provider_rejections", "provider_drg_assessments", "provider_benchmarks",
  // Portal
  "portal_providers", "portal_insurers", "portal_regions",
  "portal_employers", "portal_members",
  // Intelligence
  "operational_findings_ledger", "evidence_packs",
  "enforcement_cases", "regulatory_circulars",
  // Members
  "member_coverage", "member_complaints", "coverage_lookups",
  // ML
  "ml_model_registry", "ml_claim_inference",
  // Reports
  "agent_reports", "agent_performance_metrics",
  // DRG
  "digital_twins",
]);

const BLOCKED_PATTERNS = [
  /\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE)\b/i,
  /\b(INTO|SET)\b/i,
  /;\s*\w/,  // multiple statements
  /--/,       // SQL comments (potential injection)
  /\/\*/,     // block comments
];

export interface SqlGuardResult {
  allowed: boolean;
  reason?: string;
}

export function validateQuery(query: string): SqlGuardResult {
  const trimmed = query.trim();

  // Must start with SELECT
  if (!/^\s*SELECT\b/i.test(trimmed)) {
    return { allowed: false, reason: "Only SELECT queries are allowed" };
  }

  // Check for blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { allowed: false, reason: `Query contains blocked pattern: ${pattern}` };
    }
  }

  // Extract table names (simplified — checks FROM and JOIN clauses)
  const tablePattern = /\b(?:FROM|JOIN)\s+["']?(\w+)["']?/gi;
  let match;
  while ((match = tablePattern.exec(trimmed)) !== null) {
    const table = match[1].toLowerCase();
    if (!ALLOWED_TABLES.has(table)) {
      return { allowed: false, reason: `Table "${table}" is not in the allowed list` };
    }
  }

  return { allowed: true };
}

export async function executeSafeQuery(
  query: string,
  rowLimit = 100,
  timeoutMs = 5000
): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
  const validation = validateQuery(query);
  if (!validation.allowed) {
    throw new Error(`Query blocked: ${validation.reason}`);
  }

  // Add LIMIT if not present
  const limitedQuery = /\bLIMIT\b/i.test(query)
    ? query
    : `${query.replace(/;\s*$/, "")} LIMIT ${rowLimit}`;

  const result = await Promise.race([
    db.execute(sql.raw(limitedQuery)),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Query timeout exceeded")), timeoutMs)
    )
  ]);

  const rows = Array.isArray(result) ? result : (result as any).rows || [];
  return { rows: rows.slice(0, rowLimit), rowCount: rows.length };
}
```

**Step 2: Commit**

```bash
git add server/services/sql-guard.ts
git commit -m "feat: add SQL guard with table whitelist and query validation"
```

---

### Task 10: Create platform data agent

**Files:**
- Create: `server/services/chat-data-agent.ts`

**Step 1: Create the data agent with pre-built tools**

```typescript
import OpenAI from "openai";
import { db } from "../db";
import { sql } from "drizzle-orm";
import { executeSafeQuery, validateQuery } from "./sql-guard";

const openai = new OpenAI();

// Tool definitions for OpenAI function calling
const DATA_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_claims_summary",
      description: "Get claims statistics: count, total amount, grouped by status or provider. Use for questions about claim volumes, amounts, approval/rejection rates.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", description: "Filter by claim status (e.g., 'approved', 'rejected', 'pending')", enum: ["approved", "rejected", "pending", "all"] },
          groupBy: { type: "string", description: "Group results by field", enum: ["status", "provider", "month"] },
          limit: { type: "number", description: "Max results to return", default: 10 }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_provider_stats",
      description: "Get provider performance: compliance rates, rejection rates, risk scores, scorecard data. Use for questions about provider performance, compliance, or risk.",
      parameters: {
        type: "object",
        properties: {
          sortBy: { type: "string", description: "Sort providers by metric", enum: ["rejection_rate", "compliance_score", "risk_score", "claims_volume"] },
          limit: { type: "number", description: "Max results", default: 10 }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_beneficiary_stats",
      description: "Get beneficiary/member statistics: counts, coverage status, demographics. Use for questions about members, insured populations, coverage.",
      parameters: {
        type: "object",
        properties: {
          groupBy: { type: "string", description: "Group results by", enum: ["region", "coverage_status", "employer"] },
          limit: { type: "number", description: "Max results", default: 10 }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_fwa_alerts",
      description: "Get fraud/waste/abuse detection alerts and cases. Use for questions about FWA patterns, high-risk entities, detection results.",
      parameters: {
        type: "object",
        properties: {
          severity: { type: "string", description: "Filter by severity", enum: ["high", "medium", "low", "all"] },
          entityType: { type: "string", description: "Filter by entity type", enum: ["provider", "doctor", "patient", "all"] },
          limit: { type: "number", description: "Max results", default: 10 }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_drg_analysis",
      description: "Get DRG (Diagnosis Related Group) analysis: distribution, cost outliers, case-mix index. Use for questions about DRG patterns, hospital costs, case complexity.",
      parameters: {
        type: "object",
        properties: {
          groupBy: { type: "string", description: "Group by", enum: ["drg_code", "provider", "specialty"] },
          limit: { type: "number", description: "Max results", default: 10 }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "run_custom_query",
      description: "Run a custom SQL SELECT query against the platform database. ONLY use this when none of the other tools can answer the question. The query must be a valid SELECT statement.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "SQL SELECT query to execute" },
          explanation: { type: "string", description: "Brief explanation of what this query does" }
        },
        required: ["query", "explanation"]
      }
    }
  }
];

// Tool implementations
async function executeDataTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "get_claims_summary": {
      const { status, groupBy, limit = 10 } = args as any;
      let query = "SELECT ";
      if (groupBy === "status") {
        query += "status, COUNT(*) as count, SUM(CAST(COALESCE(total_amount, '0') AS NUMERIC)) as total_amount FROM claims";
      } else if (groupBy === "provider") {
        query += "provider_name, COUNT(*) as count, SUM(CAST(COALESCE(total_amount, '0') AS NUMERIC)) as total_amount FROM claims";
      } else if (groupBy === "month") {
        query += "DATE_TRUNC('month', created_at) as month, COUNT(*) as count FROM claims";
      } else {
        query += "COUNT(*) as total_claims, SUM(CAST(COALESCE(total_amount, '0') AS NUMERIC)) as total_amount FROM claims";
      }
      if (status && status !== "all") query += ` WHERE status = '${status}'`;
      if (groupBy) query += ` GROUP BY ${groupBy === "month" ? "1" : groupBy === "status" ? "status" : "provider_name"} ORDER BY count DESC`;
      query += ` LIMIT ${limit}`;
      const result = await executeSafeQuery(query);
      return JSON.stringify(result.rows);
    }

    case "get_provider_stats": {
      const { sortBy = "claims_volume", limit = 10 } = args as any;
      const query = `SELECT name, region, tier, total_claims, rejection_rate, compliance_score, risk_score
        FROM provider_directory ORDER BY ${sortBy === "rejection_rate" ? "rejection_rate DESC" : sortBy === "compliance_score" ? "compliance_score DESC" : sortBy === "risk_score" ? "risk_score DESC" : "total_claims DESC"} LIMIT ${limit}`;
      const result = await executeSafeQuery(query);
      return JSON.stringify(result.rows);
    }

    case "get_beneficiary_stats": {
      const { groupBy = "coverage_status", limit = 10 } = args as any;
      const query = `SELECT ${groupBy === "region" ? "region" : groupBy === "employer" ? "employer_name" : "coverage_status"}, COUNT(*) as count
        FROM portal_members GROUP BY 1 ORDER BY count DESC LIMIT ${limit}`;
      const result = await executeSafeQuery(query);
      return JSON.stringify(result.rows);
    }

    case "get_fwa_alerts": {
      const { severity = "all", entityType = "all", limit = 10 } = args as any;
      let query = "SELECT id, entity_type, entity_name, risk_score, status, created_at FROM fwa_cases";
      const conditions: string[] = [];
      if (severity !== "all") conditions.push(`severity = '${severity}'`);
      if (entityType !== "all") conditions.push(`entity_type = '${entityType}'`);
      if (conditions.length) query += " WHERE " + conditions.join(" AND ");
      query += " ORDER BY risk_score DESC LIMIT " + limit;
      const result = await executeSafeQuery(query);
      return JSON.stringify(result.rows);
    }

    case "get_drg_analysis": {
      const { groupBy = "drg_code", limit = 10 } = args as any;
      const query = `SELECT ${groupBy}, COUNT(*) as cases, AVG(CAST(COALESCE(total_cost, '0') AS NUMERIC)) as avg_cost
        FROM digital_twins GROUP BY 1 ORDER BY cases DESC LIMIT ${limit}`;
      const result = await executeSafeQuery(query);
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
}

const DATA_AGENT_SYSTEM_PROMPT = `You are a data analyst for CHI's healthcare regulatory platform (TachyHealth).
You answer questions about platform data: claims, providers, encounters, DRGs, FWA alerts, beneficiaries.

When answering:
- Use the provided tools to query real platform data
- Present numbers clearly with context
- Use tables and bullet points for multiple data points
- If a pre-built tool can answer the question, prefer it over run_custom_query
- Only use run_custom_query for questions that can't be answered by other tools
- Always attribute data: "According to platform data..."
- If data seems unexpected, note it rather than hiding it`;

export async function queryPlatformData(
  userMessage: string,
  conversationHistory: Array<{role: string; content: string}> = []
): Promise<{ content: string; toolsUsed: string[] }> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: DATA_AGENT_SYSTEM_PROMPT },
    ...conversationHistory.slice(-5).map(m => ({
      role: m.role as "user" | "assistant",
      content: m.content
    })),
    { role: "user", content: userMessage }
  ];

  const toolsUsed: string[] = [];
  let iterations = 0;
  const maxIterations = 3; // Prevent infinite tool-calling loops

  while (iterations < maxIterations) {
    iterations++;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      max_tokens: 2000,
      tools: DATA_TOOLS,
      messages
    });

    const choice = response.choices[0];

    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
      messages.push(choice.message);

      for (const toolCall of choice.message.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);
        toolsUsed.push(toolName);

        let toolResult: string;
        try {
          toolResult = await executeDataTool(toolName, toolArgs);
        } catch (err: any) {
          toolResult = JSON.stringify({ error: err.message });
        }

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResult
        });
      }
    } else {
      // Final response — no more tool calls
      return {
        content: choice.message.content || "I couldn't find the data to answer that question.",
        toolsUsed
      };
    }
  }

  // Fallback if max iterations reached
  return {
    content: "I attempted to query the data but reached the processing limit. Please try a more specific question.",
    toolsUsed
  };
}
```

**Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add server/services/chat-data-agent.ts
git commit -m "feat: add platform data agent with 6 tools and SQL fallback"
```

---

### Task 11: Create response merger

**Files:**
- Create: `server/services/chat-response-merger.ts`

**Step 1: Create the merger service**

```typescript
import OpenAI from "openai";

const openai = new OpenAI();

interface MergerInput {
  userMessage: string;
  documentResponse?: {
    content: string;
    sources: Array<{index: number; documentTitle: string; sectionTitle: string; pageNumber: number}>;
  };
  dataResponse?: {
    content: string;
    toolsUsed: string[];
  };
}

export async function mergeResponses(input: MergerInput): Promise<string> {
  const { userMessage, documentResponse, dataResponse } = input;

  // If only one source has content, return it directly
  if (documentResponse && !dataResponse) return documentResponse.content;
  if (dataResponse && !documentResponse) return dataResponse.content;
  if (!documentResponse && !dataResponse) return "I couldn't find relevant information to answer your question.";

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

  return response.choices[0].message.content || "Unable to merge responses.";
}
```

**Step 2: Commit**

```bash
git add server/services/chat-response-merger.ts
git commit -m "feat: add response merger for mixed document + data queries"
```

---

## Track 5: Wire Everything Together

### Task 12: Refactor chat-rag-service to export agent functions

**Files:**
- Modify: `server/services/chat-rag-service.ts`

**Step 1: Export document agent function**

Extract the document RAG logic from `streamChatResponse` into a standalone function that returns content + sources (without streaming). The main `streamChatResponse` will call the router and dispatch to agents.

Add a new exported function:

```typescript
export async function queryDocuments(
  userMessage: string,
  conversationHistory: Array<{role: string; content: string}>,
  pillarId: string,
  pagePath: string,
  category?: string
): Promise<{content: string; sources: Array<{index: number; documentTitle: string; sectionTitle: string; pageNumber: number; similarity: number; chunkId: string; documentId: string}>}> {
  // 1. Search with category filter
  const chunks = await searchKnowledgeChunks(userMessage, 20, category);

  // 2. Re-rank
  const rankedChunks = await rerankChunks(userMessage, chunks, 5);

  // 3. Build prompt
  const systemPrompt = buildSystemPrompt(pillarId, pagePath, rankedChunks);

  // 4. Generate response (non-streaming for merger compatibility)
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.4,
    max_tokens: 2000,
    messages: [
      { role: "system", content: systemPrompt },
      ...conversationHistory.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user", content: userMessage }
    ]
  });

  const sources = rankedChunks.map((c, i) => ({
    index: i + 1,
    documentTitle: c.document_title,
    sectionTitle: c.section_title,
    pageNumber: c.page_number,
    similarity: c.similarity,
    chunkId: c.id,
    documentId: c.document_id
  }));

  return {
    content: response.choices[0].message.content || "",
    sources
  };
}
```

**Step 2: Commit**

```bash
git add server/services/chat-rag-service.ts
git commit -m "feat: export queryDocuments function for agent dispatch"
```

---

### Task 13: Refactor streamChatResponse to use router + agents

**Files:**
- Modify: `server/services/chat-rag-service.ts`

**Step 1: Update streamChatResponse to use the full pipeline**

Refactor the main `streamChatResponse` function to:
1. Get conversation history
2. Save user message
3. Auto-title conversation
4. Call query router
5. Dispatch to appropriate agent(s)
6. Stream the response
7. Save assistant message with metadata

```typescript
import { classifyQuery } from "./chat-query-router";
import { queryPlatformData } from "./chat-data-agent";
import { mergeResponses } from "./chat-response-merger";

export async function streamChatResponse(
  conversationId: string,
  userMessage: string,
  res: Response
) {
  // 1. Get conversation + history
  const conversation = await db.query.chatConversations.findFirst({
    where: eq(chatConversations.id, conversationId)
  });
  if (!conversation) throw new Error("Conversation not found");

  const history = await getConversationHistory(conversationId);
  const pillarId = (conversation.pillarContext as any)?.pillarId || "fwa";
  const pagePath = (conversation.pillarContext as any)?.pagePath || "/";

  // 2. Save user message
  await db.insert(chatMessages).values({
    id: crypto.randomUUID(),
    conversationId,
    role: "user",
    content: userMessage,
    createdAt: new Date()
  });

  // 3. Auto-title on first message
  if (!conversation.title || conversation.title === "New conversation") {
    const title = userMessage.slice(0, 60) + (userMessage.length > 60 ? "..." : "");
    await db.update(chatConversations).set({ title }).where(eq(chatConversations.id, conversationId));
  }

  // 4. Classify query
  const routerResult = await classifyQuery(userMessage, history);

  // 5. Dispatch to agents
  let finalContent = "";
  let sources: any[] = [];
  let retrievalMetadata: Record<string, unknown> = { routerIntent: routerResult.intent, routerConfidence: routerResult.confidence };

  if (routerResult.intent === "general") {
    // Direct response — no agents needed
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.4,
      max_tokens: 2000,
      messages: [
        { role: "system", content: buildSystemPrompt(pillarId, pagePath, []) },
        ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user", content: userMessage }
      ]
    });
    finalContent = response.choices[0].message.content || "";

  } else if (routerResult.intent === "document") {
    const category = routerResult.confidence >= 0.7 ? routerResult.documentSubtype : undefined;
    const docResult = await queryDocuments(userMessage, history, pillarId, pagePath, category === "all" ? undefined : category);
    finalContent = docResult.content;
    sources = docResult.sources;
    retrievalMetadata.documentSubtype = routerResult.documentSubtype;

  } else if (routerResult.intent === "data") {
    const dataResult = await queryPlatformData(userMessage, history);
    finalContent = dataResult.content;
    retrievalMetadata.toolsUsed = dataResult.toolsUsed;

  } else if (routerResult.intent === "mixed") {
    // Run both agents in parallel
    const category = routerResult.confidence >= 0.7 ? routerResult.documentSubtype : undefined;
    const [docResult, dataResult] = await Promise.all([
      queryDocuments(userMessage, history, pillarId, pagePath, category === "all" ? undefined : category).catch(() => null),
      queryPlatformData(userMessage, history).catch(() => null)
    ]);

    finalContent = await mergeResponses({
      userMessage,
      documentResponse: docResult ? { content: docResult.content, sources: docResult.sources } : undefined,
      dataResponse: dataResult ? { content: dataResult.content, toolsUsed: dataResult.toolsUsed } : undefined
    });
    sources = docResult?.sources || [];
    retrievalMetadata.toolsUsed = dataResult?.toolsUsed;
    retrievalMetadata.documentSubtype = routerResult.documentSubtype;
  }

  // 6. Stream the response via SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Stream content in chunks for smooth UI rendering
  const words = finalContent.split(" ");
  for (let i = 0; i < words.length; i += 3) {
    const chunk = words.slice(i, i + 3).join(" ") + (i + 3 < words.length ? " " : "");
    res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
  }

  // Send sources metadata
  if (sources.length > 0) {
    res.write(`data: ${JSON.stringify({ sources })}\n\n`);
  }
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();

  // 7. Save assistant message
  await db.insert(chatMessages).values({
    id: crypto.randomUUID(),
    conversationId,
    role: "assistant",
    content: finalContent,
    ragChunkIds: sources.map(s => s.chunkId),
    retrievalMetadata,
    createdAt: new Date()
  });

  await db.update(chatConversations).set({ updatedAt: new Date() }).where(eq(chatConversations.id, conversationId));
}
```

**Step 2: Remove old inline RAG logic that is now handled by queryDocuments**

Clean up any now-dead code paths in the function.

**Step 3: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add server/services/chat-rag-service.ts
git commit -m "feat: wire query router + specialized agents into chat pipeline"
```

---

## Track 6: Document Management

### Task 14: Add document management actions to Knowledge Hub

**Files:**
- Modify: `client/src/pages/fwa/knowledge-hub.tsx`
- Modify: `server/routes/document-routes.ts`

**Step 1: Add delete and re-process API endpoints**

In `document-routes.ts`, add:

```typescript
// DELETE /api/knowledge-documents/:id
app.delete("/api/knowledge-documents/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(knowledgeDocuments).where(eq(knowledgeDocuments.id, id));
    // Chunks cascade-deleted via FK
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/knowledge-documents/:id/reprocess
app.post("/api/knowledge-documents/:id/reprocess", async (req, res) => {
  try {
    const { id } = req.params;
    // Clear existing chunks and reset status
    await db.delete(knowledgeChunks).where(eq(knowledgeChunks.documentId, id));
    await db.update(knowledgeDocuments).set({
      processingStatus: "pending",
      processingError: null,
      chunkCount: 0
    }).where(eq(knowledgeDocuments.id, id));
    // Trigger reprocessing
    await documentIngestionService.processDocument(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

**Step 2: Add action buttons to Knowledge Hub document table**

In `knowledge-hub.tsx`, add a dropdown menu to each document row with Delete and Re-process actions using shadcn DropdownMenu.

**Step 3: Add confirmation dialog for delete**

Use an AlertDialog to confirm document deletion.

**Step 4: Wire up mutations with React Query**

Use `useMutation` for delete and reprocess, invalidate `knowledge-documents` query on success.

**Step 5: Verify actions work**

Test delete: document + chunks removed from DB.
Test reprocess: status resets to "pending", pipeline re-runs.

**Step 6: Commit**

```bash
git add client/src/pages/fwa/knowledge-hub.tsx server/routes/document-routes.ts
git commit -m "feat: add document delete and reprocess actions to Knowledge Hub"
```

---

## Track 7: Testing & Verification

### Task 15: Add E2E tests for new features

**Files:**
- Modify: `e2e/chat-panel.spec.ts`

**Step 1: Add test for citation rendering**

```typescript
test("chat response displays citation sources", async ({ page }) => {
  // Mock the chat message SSE endpoint to return sources
  await page.route("**/api/chat/conversations/*/messages", async (route) => {
    if (route.request().method() === "POST") {
      const body = [
        `data: ${JSON.stringify({ content: "According to the regulation [1], prior auth is required." })}\n\n`,
        `data: ${JSON.stringify({ sources: [{ index: 1, documentTitle: "CHI Policy v3.2", sectionTitle: "Prior Auth", pageNumber: 47, similarity: 0.92 }] })}\n\n`,
        `data: ${JSON.stringify({ done: true })}\n\n`,
      ].join("");
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
        body,
      });
    }
  });
  // ... trigger chat and verify [1] and Sources section render
});
```

**Step 2: Add test for category filter on Knowledge Hub**

```typescript
test("knowledge hub category filter narrows document list", async ({ page }) => {
  // Navigate to Knowledge Hub, verify category dropdown exists
  // Select a category, verify the document table updates
});
```

**Step 3: Run tests**

Run: `npx playwright test e2e/chat-panel.spec.ts`
Expected: All tests pass

**Step 4: Commit**

```bash
git add e2e/chat-panel.spec.ts
git commit -m "test: add E2E tests for citations and category filter"
```

---

### Task 16: Integration test — full pipeline verification

**Step 1: Start the dev server**

Run: `npm run dev`

**Step 2: Upload a test document**

Navigate to Knowledge Hub, upload a small PDF, verify it processes through all stages (pending → extracting → chunking → embedding → completed).

**Step 3: Test document query**

Open the chat panel, ask a question about the uploaded document. Verify:
- Query router classifies as "document"
- Response includes inline citations [1]
- Sources section renders below the response

**Step 4: Test data query**

Ask "How many claims are in the system?" Verify:
- Query router classifies as "data"
- Response includes real platform data
- Response says "According to platform data..."

**Step 5: Test mixed query**

Ask "Are providers complying with the regulations on prior authorization?" Verify:
- Router classifies as "mixed"
- Response combines document knowledge and platform data
- Citations from documents preserved

**Step 6: Test category filter**

On Knowledge Hub, select a category from the dropdown. Verify the document list filters correctly.

**Step 7: Test document management**

Delete a document, verify it's removed. Re-process a document, verify chunks regenerate.

---

## Summary of New/Modified Files

### New Files (5):
| File | Purpose |
|------|---------|
| `server/services/chat-query-router.ts` | Intent classification (GPT-4o-mini) |
| `server/services/chat-data-agent.ts` | Platform data agent with 6 tools + SQL |
| `server/services/chat-response-merger.ts` | Merges document + data responses |
| `server/services/sql-guard.ts` | SQL validation and safe execution |
| `migrations/0007_document_categories_update.sql` | Category enum migration |

### Modified Files (7):
| File | Changes |
|------|---------|
| `shared/schema.ts` | Updated category enum values |
| `server/services/chat-rag-service.ts` | Category filter, re-ranking, citations, router integration |
| `server/routes/document-routes.ts` | Delete + reprocess endpoints |
| `client/src/components/document-upload-dialog.tsx` | Updated category dropdown |
| `client/src/components/chat/chat-provider.tsx` | Sources in message type + SSE parsing |
| `client/src/components/chat/chat-panel.tsx` | Citation rendering UI |
| `client/src/pages/fwa/knowledge-hub.tsx` | Category filter, labels, document actions |
