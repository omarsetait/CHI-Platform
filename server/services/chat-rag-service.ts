import OpenAI from "openai";
import { db } from "../db";
import { chatMessages, chatConversations } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import type { Response } from "express";
import { classifyQuery } from "./chat-query-router";
import { queryPlatformData } from "./chat-data-agent";
import { mergeResponses } from "./chat-response-merger";
import { EMBEDDING_MODEL } from "./embedding-config";

const openai = new OpenAI();

const SYSTEM_PROMPT = `You are Daman AI, the intelligent assistant for CHI's (Council of Health Insurance) regulatory platform — TachyHealth.
You are currently assisting in the {pillarName} module on the {pagePath} page.

Your expertise covers:
- FWA (Fraud, Waste & Abuse) detection and investigation
- Provider oversight, accreditation, and compliance monitoring
- Market regulation, employer compliance, and cost intelligence
- Beneficiary protection, coverage transparency, and member services
- Saudi healthcare regulatory context: CHI regulations, NPHIES, SBS V3.0, AR-DRG, ICD-10-AM/ACHI

Retrieved knowledge:
{ragChunks}

Instructions:
- Answer in the same language as the user's question (English or Arabic).
- Be precise, data-driven, and cite sources using [1], [2], etc. when referencing retrieved knowledge.
- After your response, include a "Sources:" section listing each cited source with document title and page number.
- If retrieved knowledge is relevant, prioritize it over general knowledge.
- If you don't know something, say so honestly rather than guessing.
- Format responses with markdown for readability (headers, bullet points, tables when appropriate).`;

const PILLAR_NAMES: Record<string, string> = {
  fwa: "Audit & FWA Unit",
  intelligence: "Daman Intelligence",
  business: "Daman Business",
  members: "Daman Members",
};

const MIN_SIMILARITY_THRESHOLD = 0.3;

/**
 * Embed a query using text-embedding-ada-002 and search knowledge_chunks via pgvector.
 * Optionally filter by document category and return enriched metadata from knowledge_documents.
 */
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
    model: EMBEDDING_MODEL,
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

/**
 * Re-rank retrieved chunks using GPT-4o-mini for improved relevance ordering.
 */
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
    return chunks.slice(0, topK);
  }
}

/**
 * Fetch the last N messages for a conversation to include as chat history.
 */
async function getConversationHistory(conversationId: string, limit = 10) {
  const messages = await db
    .select({
      role: chatMessages.role,
      content: chatMessages.content,
    })
    .from(chatMessages)
    .where(eq(chatMessages.conversationId, conversationId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);

  return messages.reverse();
}

/**
 * Build the system prompt with pillar context and RAG chunks formatted with citation references.
 */
function buildSystemPrompt(
  pillarId: string,
  pagePath: string,
  chunks: Array<{
    content: string;
    similarity: number;
    document_title?: string;
    section_title?: string;
    page_number?: number;
  }>
): string {
  const pillarName = PILLAR_NAMES[pillarId] || "General";
  const ragChunks =
    chunks.length > 0
      ? chunks
          .map(
            (c, i) =>
              `[${i + 1}] Document: "${c.document_title || "Unknown"}", Section: ${c.section_title || "N/A"}, Page: ${c.page_number || "N/A"}\n${c.content}`
          )
          .join("\n\n")
      : "No relevant documents found in the knowledge base.";

  return SYSTEM_PROMPT.replace("{pillarName}", pillarName)
    .replace("{pagePath}", pagePath)
    .replace("{ragChunks}", ragChunks);
}

/**
 * Auto-generate a conversation title from the first user message.
 */
function generateTitle(message: string): string {
  const trimmed = message.trim().slice(0, 80);
  return trimmed.length < message.trim().length ? `${trimmed}...` : trimmed;
}

/**
 * Query documents via the RAG pipeline (search + rerank + generate) without streaming.
 * Used by the response merger for mixed queries, and can also be called independently.
 */
export async function queryDocuments(
  userMessage: string,
  conversationHistory: Array<{ role: string; content: string }>,
  pillarId: string,
  pagePath: string,
  category?: string
): Promise<{
  content: string;
  sources: Array<{
    index: number;
    documentTitle: string;
    sectionTitle: string;
    pageNumber: number;
    similarity: number;
    chunkId: string;
    documentId: string;
  }>;
}> {
  // 1. Search with category filter (top 20)
  const chunks = await searchKnowledgeChunks(userMessage, 20, category);

  // 2. Re-rank to top 5
  const rankedChunks = (await rerankChunks(userMessage, chunks, 5)) as Array<{
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

  // 3. Build system prompt
  const systemPrompt = buildSystemPrompt(pillarId, pagePath, rankedChunks);

  // 4. Generate response (non-streaming)
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.4,
    max_tokens: 2000,
    messages: [
      { role: "system", content: systemPrompt },
      ...conversationHistory.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: userMessage },
    ],
  });

  const sources = rankedChunks.map((c, i) => ({
    index: i + 1,
    documentTitle: c.document_title,
    sectionTitle: c.section_title,
    pageNumber: c.page_number,
    similarity: c.similarity,
    chunkId: c.id,
    documentId: c.document_id,
  }));

  return {
    content: response.choices[0].message.content || "",
    sources,
  };
}

/**
 * Main entry: process a chat message with RAG and stream the response via SSE.
 */
export async function streamChatResponse(
  conversationId: string,
  userMessage: string,
  res: Response
) {
  // 1. Fetch conversation for pillar context
  const [conversation] = await db
    .select()
    .from(chatConversations)
    .where(eq(chatConversations.id, conversationId))
    .limit(1);

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const pillarCtx = (conversation.pillarContext as { pillarId: string; pagePath: string }) || {
    pillarId: "fwa",
    pagePath: "/fwa/dashboard",
  };

  // 2. Save user message
  await db.insert(chatMessages).values({
    conversationId,
    role: "user",
    content: userMessage,
  });

  // 3. Auto-title on first message
  if (conversation.title === "New Conversation") {
    await db
      .update(chatConversations)
      .set({ title: generateTitle(userMessage), updatedAt: new Date() })
      .where(eq(chatConversations.id, conversationId));
  }

  // 4. Get conversation history for context
  const history = await getConversationHistory(conversationId, 10);

  // 5. Classify query intent via router
  let routerResult;
  try {
    routerResult = await classifyQuery(userMessage, history);
  } catch (routerError) {
    console.error("[Chat][Error] stage=router error=" + JSON.stringify((routerError as Error).message) + " fallback=general");
    routerResult = { intent: "general" as const, confidence: 0, reasoning: "Router fallback" };
  }

  // 6. Dispatch to agent(s) based on intent
  let finalContent = "";
  let sourcesMetadata: Array<{
    index: number;
    documentTitle: string;
    sectionTitle: string;
    pageNumber: number;
    similarity: number;
    chunkId: string;
    documentId: string;
  }> = [];
  let ragChunkIds: string[] = [];
  let dataResult: { content: string; toolsUsed: string[] } | undefined;

  try {
    switch (routerResult.intent) {
      case "general": {
        // Direct GPT-4o response — no RAG, no data
        const generalResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          temperature: 0.4,
          max_tokens: 2000,
          messages: [
            {
              role: "system",
              content: buildSystemPrompt(pillarCtx.pillarId, pillarCtx.pagePath, []),
            },
            ...history.map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
            { role: "user", content: userMessage },
          ],
        });
        finalContent = generalResponse.choices[0].message.content || "";
        break;
      }

      case "document": {
        // Document RAG pipeline
        const docCategory =
          routerResult.documentSubtype && routerResult.documentSubtype !== "all"
            ? routerResult.documentSubtype
            : undefined;
        const docResult = await queryDocuments(
          userMessage,
          history,
          pillarCtx.pillarId,
          pillarCtx.pagePath,
          docCategory
        );
        finalContent = docResult.content;
        sourcesMetadata = docResult.sources;
        ragChunkIds = docResult.sources.map((s) => s.chunkId);
        break;
      }

      case "data": {
        // Platform data agent
        dataResult = await queryPlatformData(userMessage, history);
        finalContent = dataResult.content;
        break;
      }

      case "mixed": {
        // Run document and data agents in parallel, then merge
        const docCategory =
          routerResult.documentSubtype && routerResult.documentSubtype !== "all"
            ? routerResult.documentSubtype
            : undefined;

        const [docResult, platformResult] = await Promise.all([
          queryDocuments(
            userMessage,
            history,
            pillarCtx.pillarId,
            pillarCtx.pagePath,
            docCategory
          ).catch(() => null),
          queryPlatformData(userMessage, history).catch(() => null),
        ]);

        dataResult = platformResult ?? undefined;

        if (docResult) {
          sourcesMetadata = docResult.sources;
          ragChunkIds = docResult.sources.map((s) => s.chunkId);
        }

        finalContent = await mergeResponses({
          userMessage,
          documentResponse: docResult
            ? { content: docResult.content, sources: docResult.sources }
            : undefined,
          dataResponse: platformResult
            ? { content: platformResult.content, toolsUsed: platformResult.toolsUsed }
            : undefined,
        });
        break;
      }

      default: {
        // Fallback: treat as document query
        const fallbackResult = await queryDocuments(
          userMessage,
          history,
          pillarCtx.pillarId,
          pillarCtx.pagePath
        );
        finalContent = fallbackResult.content;
        sourcesMetadata = fallbackResult.sources;
        ragChunkIds = fallbackResult.sources.map((s) => s.chunkId);
      }
    }

    console.info(
      `[Chat][Pipeline] intent=${routerResult.intent} sources=${sourcesMetadata.length} chunks=${ragChunkIds.length} tools=${dataResult?.toolsUsed?.join(",") || "none"}`
    );
  } catch (agentError) {
    // If all agent dispatch fails, produce a direct GPT response as last-resort fallback
    try {
      const fallbackResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        temperature: 0.4,
        max_tokens: 2000,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(pillarCtx.pillarId, pillarCtx.pagePath, []),
          },
          ...history.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
          { role: "user", content: userMessage },
        ],
      });
      finalContent = fallbackResponse.choices[0].message.content || "";
    } catch {
      finalContent = "I'm sorry, I encountered an error processing your request. Please try again.";
    }
  }

  // 7. Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // 8. Stream pre-generated content in word chunks for smooth UI
  try {
    const words = finalContent.split(" ");
    for (let i = 0; i < words.length; i += 3) {
      const chunk = words.slice(i, i + 3).join(" ") + (i + 3 < words.length ? " " : "");
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }

    // 9. Save assistant message with retrieval metadata
    const retrievalMetadata = {
      usedGrounding: ragChunkIds.length > 0,
      retrievalCount: ragChunkIds.length,
      routerIntent: routerResult.intent,
      routerConfidence: routerResult.confidence,
      documentSubtype: routerResult.documentSubtype,
      toolsUsed: dataResult?.toolsUsed,
      sources: sourcesMetadata.map((s) => ({
        chunkId: s.chunkId,
        documentId: s.documentId,
        documentTitle: s.documentTitle,
        similarity: s.similarity,
        chunkIndex: s.index,
      })),
      ragStatus: ragChunkIds.length > 0 ? "success" : routerResult.intent === "general" ? "skipped" : null,
    };

    await db.insert(chatMessages).values({
      conversationId,
      role: "assistant",
      content: finalContent,
      ragChunkIds,
      retrievalMetadata,
    });

    // 10. Update conversation timestamp
    await db
      .update(chatConversations)
      .set({ updatedAt: new Date() })
      .where(eq(chatConversations.id, conversationId));

    // 11. Send sources metadata before done
    if (sourcesMetadata.length > 0) {
      res.write(`data: ${JSON.stringify({ sources: sourcesMetadata })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Stream failed";
    if (!res.headersSent) {
      res.status(500).json({ error: errMsg });
    } else {
      res.write(`data: ${JSON.stringify({ error: errMsg })}\n\n`);
      res.end();
    }
  }
}
