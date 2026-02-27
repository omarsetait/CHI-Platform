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
- Be precise, data-driven, and cite sources when available from retrieved knowledge.
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
 */
async function searchKnowledgeChunks(query: string, limit = 5) {
  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: query,
  });
  const embedding = embeddingResponse.data[0].embedding;
  const embeddingStr = `[${embedding.join(",")}]`;

  const results = await db.execute(sql`
    SELECT id, content, document_id, chunk_index,
           1 - (embedding <=> ${embeddingStr}::vector) as similarity
    FROM knowledge_chunks
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT ${limit}
  `);

  return results.rows as Array<{
    id: string;
    content: string;
    document_id: string;
    chunk_index: number;
    similarity: number;
  }>;
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
 * Build the system prompt with pillar context and RAG chunks.
 */
function buildSystemPrompt(
  pillarId: string,
  pagePath: string,
  chunks: Array<{ content: string; similarity: number }>
): string {
  const pillarName = PILLAR_NAMES[pillarId] || "General";
  const ragChunks =
    chunks.length > 0
      ? chunks
          .map(
            (c, i) =>
              `[Source ${i + 1}] (relevance: ${(c.similarity * 100).toFixed(0)}%)\n${c.content}`
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

  // 4. Embed query & semantic search
  let chunks: Array<{ id: string; content: string; similarity: number }> = [];
  try {
    chunks = await searchKnowledgeChunks(userMessage, 5);
  } catch {
    // If no embeddings exist yet or OpenAI fails, continue without RAG
  }

  // 5. Build messages array
  const systemPrompt = buildSystemPrompt(pillarCtx.pillarId, pillarCtx.pagePath, chunks);
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
    const ragChunkIds = chunks.map((c) => c.id);
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
