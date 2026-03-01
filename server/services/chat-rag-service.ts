import OpenAI from "openai";
import { db } from "../db";
import { chatMessages, chatConversations } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import type { Response } from "express";

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

  return results.rows as Array<{
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

  const result = JSON.parse(response.choices[0].message.content || "{}");
  const scores: Array<{ index: number; score: number }> = result.scores || [];

  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => chunks[s.index])
    .filter(Boolean);
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

  // 4. Embed query & semantic search, then re-rank
  let rankedChunks: Array<{
    id: string;
    content: string;
    document_id: string;
    chunk_index: number;
    similarity: number;
    document_title: string;
    section_title: string;
    page_number: number;
    document_category: string;
  }> = [];
  try {
    const retrievedChunks = await searchKnowledgeChunks(userMessage, 20);
    rankedChunks = await rerankChunks(userMessage, retrievedChunks, 5) as typeof rankedChunks;
  } catch {
    // If no embeddings exist yet or OpenAI fails, continue without RAG
  }

  // 5. Build messages array
  const systemPrompt = buildSystemPrompt(pillarCtx.pillarId, pillarCtx.pagePath, rankedChunks);
  const history = await getConversationHistory(conversationId, 10);

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: userMessage },
  ];

  // 6. Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // 7. Stream GPT-4o response
  let fullResponse = "";

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      stream: true,
      temperature: 0.4,
      max_tokens: 2000,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      if (content) {
        fullResponse += content;
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // 8. Save assistant message
    const ragChunkIds = rankedChunks.map((c) => c.id);
    await db.insert(chatMessages).values({
      conversationId,
      role: "assistant",
      content: fullResponse,
      ragChunkIds,
    });

    // 9. Update conversation timestamp
    await db
      .update(chatConversations)
      .set({ updatedAt: new Date() })
      .where(eq(chatConversations.id, conversationId));

    // 10. Send sources metadata before done
    const sourcesMetadata = rankedChunks.map((c, i) => ({
      index: i + 1,
      documentTitle: c.document_title,
      sectionTitle: c.section_title,
      pageNumber: c.page_number,
      similarity: c.similarity,
      chunkId: c.id,
      documentId: c.document_id,
    }));
    res.write(`data: ${JSON.stringify({ sources: sourcesMetadata })}\n\n`);

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
