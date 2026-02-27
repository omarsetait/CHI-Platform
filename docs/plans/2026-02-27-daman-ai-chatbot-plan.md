# Daman AI Chatbot & Knowledge Hub — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a RAG-powered chatbot ("Daman AI") available across all four pillars with streaming responses, plus a Knowledge Hub page in FWA for document upload and management.

**Architecture:** Leverage the existing document ingestion pipeline (PDF/Word/Image extraction), pgvector embeddings (text-embedding-ada-002, 1536D), and semantic search. Wire GPT-4o into a new chat endpoint that retrieves relevant knowledge chunks, enriches the prompt with pillar context, and streams the response via SSE. Frontend uses a floating action button + slide-out Sheet panel.

**Tech Stack:** TypeScript, Express, Drizzle ORM, pgvector, OpenAI GPT-4o, text-embedding-ada-002, React, shadcn/ui (Sheet), wouter, SSE streaming

---

## Task 1: Database Schema — Chat Tables

**Files:**
- Modify: `shared/schema.ts` (append after line ~4973)

**Step 1: Add chat_conversations and chat_messages tables**

Append these table definitions at the end of `shared/schema.ts`, after the existing `EmbeddingImportJob` type:

```typescript
// ── Chat / Daman AI ─────────────────────────────────────────────────
export const chatConversations = pgTable("chat_conversations", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull(),
  pillarContext: jsonb("pillar_context").$type<{
    pillarId: string;
    pagePath: string;
  }>(),
  title: text("title").default("New Conversation"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: text("conversation_id")
    .notNull()
    .references(() => chatConversations.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  ragChunkIds: jsonb("rag_chunk_ids").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChatConversationSchema = createInsertSchema(chatConversations);
export const insertChatMessageSchema = createInsertSchema(chatMessages);

export type ChatConversation = typeof chatConversations.$inferSelect;
export type InsertChatConversation = typeof chatConversations.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;
```

**Step 2: Push schema to database**

Run: `npx drizzle-kit push`
Expected: Tables `chat_conversations` and `chat_messages` created successfully.

**Step 3: Commit**

```bash
git add shared/schema.ts
git commit -m "feat(chat): add chat_conversations and chat_messages tables"
```

---

## Task 2: Chat RAG Service

**Files:**
- Create: `server/services/chat-rag-service.ts`

**Context:** The existing `server/services/embedding-service.ts` has a `semanticSearch()` function (line 134) that queries pgvector for similar chunks, and `ragKnowledgeBaseQuery()` (line 204) that builds a GPT-4o prompt from those results. The existing SSE streaming pattern is in `server/replit_integrations/chat/routes.ts` (lines 82-108). We'll build a new service that combines both patterns specifically for chat.

**Step 1: Create the chat RAG service**

Create `server/services/chat-rag-service.ts`:

```typescript
import { db } from "../db";
import { knowledgeChunks, chatMessages, chatConversations } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getOpenAIClient } from "../utils/openai-utils";
import type { Response } from "express";

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
  const openai = getOpenAIClient();
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
    // If no embeddings exist yet, continue without RAG
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
  const openai = getOpenAIClient();
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
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `chat-rag-service.ts`.

**Step 3: Commit**

```bash
git add server/services/chat-rag-service.ts
git commit -m "feat(chat): add RAG service with streaming GPT-4o responses"
```

---

## Task 3: Chat API Routes

**Files:**
- Create: `server/routes/chat-routes.ts`
- Modify: `server/routes.ts` (add auth exemption ~line 150, register route ~line 227)

**Step 1: Create chat routes file**

Create `server/routes/chat-routes.ts`:

```typescript
import { Router } from "express";
import type { Express } from "express";
import { db } from "../db";
import { chatConversations, chatMessages } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { streamChatResponse } from "../services/chat-rag-service";

export function registerChatRoutes(app: Express) {
  const router = Router();

  // POST /api/chat/conversations — Create a new conversation
  router.post("/conversations", async (req, res) => {
    try {
      const { sessionId, pillarContext } = req.body;

      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required" });
      }

      const [conversation] = await db
        .insert(chatConversations)
        .values({
          sessionId,
          pillarContext: pillarContext || { pillarId: "fwa", pagePath: "/fwa/dashboard" },
        })
        .returning();

      res.json(conversation);
    } catch (error) {
      console.error("Failed to create conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // GET /api/chat/conversations — List conversations for a session
  router.get("/conversations", async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string;

      if (!sessionId) {
        return res.status(400).json({ error: "sessionId query param is required" });
      }

      const conversations = await db
        .select()
        .from(chatConversations)
        .where(eq(chatConversations.sessionId, sessionId))
        .orderBy(desc(chatConversations.updatedAt));

      res.json(conversations);
    } catch (error) {
      console.error("Failed to list conversations:", error);
      res.status(500).json({ error: "Failed to list conversations" });
    }
  });

  // POST /api/chat/conversations/:id/messages — Send message (SSE stream)
  router.post("/conversations/:id/messages", async (req, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;

      if (!content || typeof content !== "string") {
        return res.status(400).json({ error: "content is required" });
      }

      await streamChatResponse(id, content, res);
    } catch (error) {
      console.error("Failed to send message:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });

  // GET /api/chat/conversations/:id/messages — Get message history
  router.get("/conversations/:id/messages", async (req, res) => {
    try {
      const { id } = req.params;

      const messages = await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.conversationId, id))
        .orderBy(chatMessages.createdAt);

      res.json(messages);
    } catch (error) {
      console.error("Failed to get messages:", error);
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  app.use("/api/chat", router);
}
```

**Step 2: Add `/api/chat` to auth exempt list**

In `server/routes.ts`, find the `exemptAuthPaths` array (starts at ~line 118) and add `'/api/chat'` alongside the existing exempt paths. Add it near the other API paths (around line 150 area, near `/api/intelligence`).

**Step 3: Register chat routes**

In `server/routes.ts`, find the route registration section (~line 215-227) and add:

```typescript
import { registerChatRoutes } from "./routes/chat-routes";
```

at the top with other imports, then:

```typescript
registerChatRoutes(app);
```

after the last `register*Routes` call (~line 227).

**Step 4: Verify server starts**

Run: `npx tsx server/index.ts &` then `curl -s http://localhost:5001/api/chat/conversations?sessionId=test | head -5`
Expected: Returns `[]` (empty array, no errors).

**Step 5: Commit**

```bash
git add server/routes/chat-routes.ts server/routes.ts
git commit -m "feat(chat): add chat API routes with auth exemption"
```

---

## Task 4: Chat Provider (React Context)

**Files:**
- Create: `client/src/components/chat/chat-provider.tsx`

**Context:** This React context wraps the pillar shell and manages chat state: current conversation ID, messages, panel open/closed, and streaming state. It persists the session ID in `sessionStorage`.

**Step 1: Create chat provider**

Create `client/src/components/chat/chat-provider.tsx`:

```typescript
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

interface ChatContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  messages: ChatMessage[];
  conversationId: string | null;
  isStreaming: boolean;
  sendMessage: (content: string, pillarId: string, pagePath: string) => Promise<void>;
  startNewChat: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}

function getSessionId(): string {
  let sessionId = sessionStorage.getItem("chat-session-id");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("chat-session-id", sessionId);
  }
  return sessionId;
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startNewChat = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setIsStreaming(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const createConversation = useCallback(async (pillarId: string, pagePath: string) => {
    const response = await fetch("/api/chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: getSessionId(),
        pillarContext: { pillarId, pagePath },
      }),
    });
    const conversation = await response.json();
    return conversation.id as string;
  }, []);

  const sendMessage = useCallback(
    async (content: string, pillarId: string, pagePath: string) => {
      if (isStreaming) return;

      let currentConvId = conversationId;
      if (!currentConvId) {
        currentConvId = await createConversation(pillarId, pagePath);
        setConversationId(currentConvId);
      }

      // Add user message to UI immediately
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // Create placeholder for assistant message
      const assistantMsgId = crypto.randomUUID();
      const assistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      setIsStreaming(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch(
          `/api/chat/conversations/${currentConvId}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content }),
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Failed to send message");
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error("No reader available");

        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.done) break;
                if (data.content) {
                  accumulated += data.content;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, content: accumulated }
                        : m
                    )
                  );
                }
                if (data.error) {
                  throw new Error(data.error);
                }
              } catch (e) {
                if (e instanceof SyntaxError) continue;
                throw e;
              }
            }
          }
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        // Update assistant message with error
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: "Sorry, I encountered an error. Please try again." }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [conversationId, isStreaming, createConversation]
  );

  return (
    <ChatContext.Provider
      value={{
        isOpen,
        setIsOpen,
        messages,
        conversationId,
        isStreaming,
        sendMessage,
        startNewChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep chat-provider`
Expected: No errors.

**Step 3: Commit**

```bash
git add client/src/components/chat/chat-provider.tsx
git commit -m "feat(chat): add ChatProvider context with SSE streaming"
```

---

## Task 5: Chat FAB (Floating Action Button)

**Files:**
- Create: `client/src/components/chat/chat-fab.tsx`

**Step 1: Create the floating action button component**

Create `client/src/components/chat/chat-fab.tsx`:

```typescript
import { MessageCircle, X } from "lucide-react";
import { useChatContext } from "./chat-provider";
import { cn } from "@/lib/utils";

const PILLAR_COLORS: Record<string, string> = {
  fwa: "bg-amber-500 hover:bg-amber-400 shadow-amber-500/30",
  intelligence: "bg-blue-500 hover:bg-blue-400 shadow-blue-500/30",
  business: "bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/30",
  members: "bg-purple-500 hover:bg-purple-400 shadow-purple-500/30",
};

interface ChatFabProps {
  pillarId: string;
}

export function ChatFab({ pillarId }: ChatFabProps) {
  const { isOpen, setIsOpen } = useChatContext();

  const colorClass = PILLAR_COLORS[pillarId] || PILLAR_COLORS.fwa;

  return (
    <button
      onClick={() => setIsOpen(!isOpen)}
      data-testid="button-chat-fab"
      className={cn(
        "fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center",
        "text-white shadow-lg transition-all duration-300",
        "hover:scale-110 active:scale-95",
        colorClass
      )}
      aria-label={isOpen ? "Close Daman AI chat" : "Open Daman AI chat"}
    >
      {isOpen ? (
        <X className="h-6 w-6" />
      ) : (
        <MessageCircle className="h-6 w-6" />
      )}
    </button>
  );
}
```

**Step 2: Commit**

```bash
git add client/src/components/chat/chat-fab.tsx
git commit -m "feat(chat): add floating action button with pillar theming"
```

---

## Task 6: Chat Panel (Sheet Slide-Out)

**Files:**
- Create: `client/src/components/chat/chat-panel.tsx`

**Context:** Uses the existing shadcn Sheet component (`client/src/components/ui/sheet.tsx`) for the slide-out panel. Renders a message list with markdown, a typing indicator during streaming, and an input area.

**Step 1: Create the chat panel**

Create `client/src/components/chat/chat-panel.tsx`:

```typescript
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Plus, Bot, User, Loader2 } from "lucide-react";
import { useChatContext } from "./chat-provider";
import { cn } from "@/lib/utils";

const PILLAR_LABELS: Record<string, { label: string; color: string }> = {
  fwa: { label: "Audit & FWA", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  intelligence: { label: "Intelligence", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  business: { label: "Business", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  members: { label: "Members", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
};

const SUGGESTED_STARTERS: Record<string, string[]> = {
  fwa: [
    "What are the top fraud patterns detected this month?",
    "Summarize the latest FWA investigation findings",
    "Which providers have the highest claim rejection rates?",
  ],
  intelligence: [
    "Which providers have the lowest SBS V3.0 compliance?",
    "What is the current DRG readiness across hospitals?",
    "Show the top rejection patterns by category",
  ],
  business: [
    "What's the current employer compliance rate by sector?",
    "Which insurers show financial risk indicators?",
    "Summarize market concentration trends",
  ],
  members: [
    "How many uninsured beneficiaries are there by region?",
    "What are the most common member complaints?",
    "Summarize coverage gap findings",
  ],
};

interface ChatPanelProps {
  pillarId: string;
}

export function ChatPanel({ pillarId }: ChatPanelProps) {
  const { isOpen, setIsOpen, messages, isStreaming, sendMessage, startNewChat } =
    useChatContext();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [location] = useLocation();

  const pillarInfo = PILLAR_LABELS[pillarId] || PILLAR_LABELS.fwa;
  const starters = SUGGESTED_STARTERS[pillarId] || SUGGESTED_STARTERS.fwa;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || isStreaming) return;

    setInput("");
    await sendMessage(content, pillarId, location);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStarter = (starter: string) => {
    sendMessage(starter, pillarId, location);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent
        side="right"
        className="w-[420px] sm:w-[420px] p-0 flex flex-col"
        data-testid="panel-chat"
      >
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SheetTitle className="text-lg font-bold">Daman AI</SheetTitle>
              <Badge
                variant="outline"
                className={cn("text-xs font-medium", pillarInfo.color)}
              >
                {pillarInfo.label}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={startNewChat}
              className="h-8 px-2 text-muted-foreground"
              data-testid="button-new-chat"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Chat
            </Button>
          </div>
        </SheetHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full pt-12 pb-8">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Bot className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-1">Daman AI Assistant</h3>
              <p className="text-sm text-muted-foreground text-center mb-6 max-w-[280px]">
                Ask me anything about CHI regulations, providers, claims, or compliance.
              </p>
              <div className="flex flex-col gap-2 w-full">
                {starters.map((starter) => (
                  <button
                    key={starter}
                    onClick={() => handleStarter(starter)}
                    className="text-left px-3 py-2.5 text-sm rounded-lg border border-border hover:bg-accent transition-colors"
                    data-testid="button-chat-starter"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-2",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex-shrink-0 flex items-center justify-center mt-0.5">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                    data-testid={`chat-message-${msg.role}`}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {msg.content || (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Thinking...
                        </span>
                      )}
                    </div>
                  </div>
                  {msg.role === "user" && (
                    <div className="w-7 h-7 rounded-full bg-primary flex-shrink-0 flex items-center justify-center mt-0.5">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input area */}
        <div className="border-t p-3 flex-shrink-0">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Daman AI..."
              className="min-h-[44px] max-h-[120px] resize-none text-sm"
              rows={1}
              disabled={isStreaming}
              data-testid="input-chat-message"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="h-11 w-11 flex-shrink-0"
              data-testid="button-chat-send"
            >
              {isStreaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep chat-panel`
Expected: No errors.

**Step 3: Commit**

```bash
git add client/src/components/chat/chat-panel.tsx
git commit -m "feat(chat): add slide-out chat panel with streaming messages"
```

---

## Task 7: Integrate Chat into Pillar Shell

**Files:**
- Modify: `client/src/pillars/pillar-shell.tsx` (~line 1 for imports, ~line 118-131 for FAB/Panel injection)

**Context:** The `PillarLayout` component (pillar-shell.tsx) wraps every pillar page. We need to wrap it with `ChatProvider` and add the `ChatFab` + `ChatPanel` components.

**Step 1: Add imports**

At the top of `client/src/pillars/pillar-shell.tsx`, add:

```typescript
import { ChatProvider } from "@/components/chat/chat-provider";
import { ChatFab } from "@/components/chat/chat-fab";
import { ChatPanel } from "@/components/chat/chat-panel";
```

**Step 2: Wrap layout with ChatProvider and add chat components**

The `PillarLayout` component needs to:
1. Wrap its entire return value with `<ChatProvider>`
2. Add `<ChatFab pillarId={config.id} />` and `<ChatPanel pillarId={config.id} />` inside the layout, after the `</main>` tag (around line 131)

The config object is available as `config` from the function props — check if `config.id` exists. If the config uses a different field for the pillar ID, adapt accordingly. The pillar IDs are: `fwa`, `intelligence`, `business`, `members`.

**Step 3: Verify the app loads**

Run the dev server and navigate to `/fwa/dashboard`. Verify:
- The floating chat button appears at bottom-right in amber color
- Clicking it opens the slide-out panel
- The panel shows "Daman AI" with "Audit & FWA" badge
- Suggested starter questions appear

**Step 4: Commit**

```bash
git add client/src/pillars/pillar-shell.tsx
git commit -m "feat(chat): integrate chat FAB and panel into pillar shell"
```

---

## Task 8: Knowledge Hub Page

**Files:**
- Create: `client/src/pages/fwa/knowledge-hub.tsx`

**Context:** The Knowledge Hub is an admin page for uploading documents to the RAG knowledge base. It uses the existing upload endpoint at `POST /api/knowledge-documents/upload` and lists documents from `GET /api/knowledge-documents`. The existing `document-upload-dialog.tsx` component handles drag-and-drop upload with bilingual support.

**Step 1: Create Knowledge Hub page**

Create `client/src/pages/fwa/knowledge-hub.tsx`:

```typescript
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DocumentUploadDialog } from "@/components/document-upload-dialog";
import {
  Upload,
  FileText,
  Search,
  Database,
  FileType,
  Clock,
  Layers,
} from "lucide-react";

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  completed: { label: "Completed", variant: "default" },
  processing: { label: "Processing", variant: "secondary" },
  pending: { label: "Pending", variant: "outline" },
  failed: { label: "Failed", variant: "destructive" },
};

const FILE_TYPE_ICONS: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "image/png": "PNG",
  "image/jpeg": "JPG",
  "text/plain": "TXT",
  "text/html": "HTML",
};

export default function KnowledgeHub() {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: documents = [], refetch } = useQuery<any[]>({
    queryKey: ["/api/knowledge-documents"],
  });

  const filteredDocs = documents.filter((doc: any) =>
    (doc.filename || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.category || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    totalDocs: documents.length,
    totalChunks: documents.reduce((sum: number, d: any) => sum + (d.chunkCount || 0), 0),
    completed: documents.filter((d: any) => d.processingStatus === "completed").length,
    processing: documents.filter((d: any) => d.processingStatus === "processing").length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalDocs}</p>
              <p className="text-sm text-muted-foreground">Total Documents</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Layers className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalChunks}</p>
              <p className="text-sm text-muted-foreground">Knowledge Chunks</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Database className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.completed}</p>
              <p className="text-sm text-muted-foreground">Indexed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Clock className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.processing}</p>
              <p className="text-sm text-muted-foreground">Processing</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Library */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Document Library</CardTitle>
            <Button onClick={() => setUploadOpen(true)} data-testid="button-upload-document">
              <Upload className="h-4 w-4 mr-2" />
              Upload Documents
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
              data-testid="input-search-documents"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredDocs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No documents yet</p>
              <p className="text-sm">Upload documents to build the knowledge base for Daman AI</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Chunks</TableHead>
                  <TableHead>Uploaded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs.map((doc: any) => {
                  const statusInfo = STATUS_BADGES[doc.processingStatus] || STATUS_BADGES.pending;
                  const fileType = FILE_TYPE_ICONS[doc.mimeType] || "FILE";
                  return (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{doc.title || doc.filename}</p>
                          <p className="text-xs text-muted-foreground">{doc.filename}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-mono">
                          <FileType className="h-3 w-3 mr-1" />
                          {fileType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{doc.category || "—"}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {doc.chunkCount || 0}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {doc.createdAt
                          ? new Date(doc.createdAt).toLocaleDateString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <DocumentUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUploadComplete={() => {
          refetch();
          setUploadOpen(false);
        }}
      />
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep knowledge-hub`
Expected: No errors (may need to adjust `DocumentUploadDialog` props based on actual component interface).

**Step 3: Commit**

```bash
git add client/src/pages/fwa/knowledge-hub.tsx
git commit -m "feat(knowledge): add Knowledge Hub page with document library"
```

---

## Task 9: FWA Navigation & Routing Updates

**Files:**
- Modify: `client/src/pillars/config/fwa.ts` (add nav items)
- Modify: `client/src/App.tsx` (add routes for Knowledge Hub and Chat page)

**Step 1: Add "Knowledge & AI" nav section to FWA config**

In `client/src/pillars/config/fwa.ts`, after the existing "Action & Intelligence" section (ends ~line 27), add a third section:

```typescript
{
  title: "Knowledge & AI",
  items: [
    {
      label: "Knowledge Hub",
      path: "/fwa/knowledge-hub",
      icon: "Database",
    },
    {
      label: "Daman AI Chat",
      path: "/fwa/chat",
      icon: "MessageCircle",
    },
  ],
},
```

Make sure the `Database` and `MessageCircle` icons are imported if the config references them by string name.

**Step 2: Add routes in App.tsx**

In `client/src/App.tsx`:

1. Add import at the top (near other FWA page imports, around line 39-72):
```typescript
import KnowledgeHub from "@/pages/fwa/knowledge-hub";
```

2. Inside the `FWARouter` function's `<Switch>` block (before the `NotFound` fallback around line 169), add:
```tsx
<Route path="/fwa/knowledge-hub" component={KnowledgeHub} />
```

Note: We don't need a separate `/fwa/chat` route since the chat is accessible via the floating button on every page. If the full-page chat is desired later, it can be added.

**Step 3: Verify navigation works**

Run the dev server and:
1. Navigate to `/fwa/dashboard`
2. Verify "Knowledge & AI" section appears in the sidebar
3. Click "Knowledge Hub" — should navigate to `/fwa/knowledge-hub`
4. Verify the Knowledge Hub page renders with stats and document library

**Step 4: Commit**

```bash
git add client/src/pillars/config/fwa.ts client/src/App.tsx
git commit -m "feat(nav): add Knowledge Hub route and FWA nav section"
```

---

## Task 10: Database Migration & Schema Push

**Files:**
- Run migration commands

**Context:** After all code changes, we need to push the new schema tables to the database.

**Step 1: Push schema changes**

Run: `npx drizzle-kit push`
Expected: `chat_conversations` and `chat_messages` tables created.

If `drizzle-kit push` requires confirmation, type `yes`.

**Step 2: Verify tables exist**

Run: `npx tsx -e "import { db } from './server/db'; import { chatConversations } from '@shared/schema'; const r = await db.select().from(chatConversations).limit(1); console.log('chat_conversations OK:', r); process.exit(0);"`
Expected: `chat_conversations OK: []`

**Step 3: Commit any migration files generated**

```bash
git add -A drizzle/ shared/schema.ts
git commit -m "chore(db): push chat tables migration"
```

---

## Task 11: End-to-End Test — Chat Panel Opens and Sends a Message

**Files:**
- Create: `e2e/chat-panel.spec.ts`

**Step 1: Write the E2E test**

Create `e2e/chat-panel.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Daman AI Chat", () => {
  test("chat FAB opens panel and displays starter questions", async ({ page }) => {
    await page.goto("/fwa/dashboard");

    // FAB should be visible
    const fab = page.getByTestId("button-chat-fab");
    await expect(fab).toBeVisible();

    // Click to open panel
    await fab.click();

    // Panel should appear
    const panel = page.getByTestId("panel-chat");
    await expect(panel).toBeVisible();

    // Should show starter questions
    const starters = page.getByTestId("button-chat-starter");
    await expect(starters.first()).toBeVisible();

    // Should show input field
    await expect(page.getByTestId("input-chat-message")).toBeVisible();

    // Should show "New Chat" button
    await expect(page.getByTestId("button-new-chat")).toBeVisible();
  });

  test("chat FAB appears on all pillar pages", async ({ page }) => {
    const pillarPages = [
      "/fwa/dashboard",
      "/intelligence/dashboard",
      "/business/dashboard",
      "/members/dashboard",
    ];

    for (const path of pillarPages) {
      await page.goto(path);
      await expect(page.getByTestId("button-chat-fab")).toBeVisible();
    }
  });
});
```

**Step 2: Run the test**

Run: `npx playwright test e2e/chat-panel.spec.ts --headed`
Expected: Both tests pass — FAB visible on all pillar pages, panel opens with starters.

**Step 3: Commit**

```bash
git add e2e/chat-panel.spec.ts
git commit -m "test(chat): add E2E tests for chat FAB and panel"
```

---

## Task 12: Knowledge Hub E2E Test

**Files:**
- Create: `e2e/knowledge-hub.spec.ts`

**Step 1: Write the test**

Create `e2e/knowledge-hub.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("Knowledge Hub", () => {
  test("Knowledge Hub page loads with upload button and empty state", async ({ page }) => {
    await page.goto("/fwa/knowledge-hub");

    // Upload button should be visible
    await expect(page.getByTestId("button-upload-document")).toBeVisible();

    // Search input should be visible
    await expect(page.getByTestId("input-search-documents")).toBeVisible();

    // Stats cards should render
    await expect(page.getByText("Total Documents")).toBeVisible();
    await expect(page.getByText("Knowledge Chunks")).toBeVisible();
  });

  test("navigates to Knowledge Hub from FWA sidebar", async ({ page }) => {
    await page.goto("/fwa/dashboard");

    // Click Knowledge Hub in sidebar
    const navItem = page.getByTestId("nav-fwa-knowledge-hub");
    await expect(navItem).toBeVisible();
    await navItem.click();

    await expect(page).toHaveURL(/\/fwa\/knowledge-hub$/);
  });
});
```

**Step 2: Run the test**

Run: `npx playwright test e2e/knowledge-hub.spec.ts --headed`
Expected: Both tests pass.

**Step 3: Commit**

```bash
git add e2e/knowledge-hub.spec.ts
git commit -m "test(knowledge): add E2E tests for Knowledge Hub page"
```

---

## Task 13: Run All E2E Tests & Fix Regressions

**Files:**
- Possibly modify any file if regressions are found

**Step 1: Run all E2E tests**

Run: `npx playwright test`
Expected: All tests pass (existing pillar smoke tests + new chat + knowledge hub tests).

**Step 2: Fix any failures**

If any tests fail, fix the root cause. Common issues:
- Missing `data-testid` attributes
- Route mismatches
- Import errors
- Nav test counts if we added new nav items

**Step 3: Commit fixes if any**

```bash
git add -A
git commit -m "fix: resolve E2E test regressions"
```

---

## Task 14: Update FWA Nav E2E Test

**Files:**
- Modify: `e2e/fwa-simplified-nav.spec.ts`

**Context:** The FWA nav test currently expects exactly 7 items. Adding the "Knowledge & AI" section introduces 2 more nav items: Knowledge Hub and Daman AI Chat. We need to update the expected items.

**Step 1: Update expected nav items**

In `e2e/fwa-simplified-nav.spec.ts`, add the new items to the `expectedNavItems` array:

```typescript
{ testId: "nav-fwa-knowledge-hub", label: "Knowledge Hub" },
{ testId: "nav-fwa-daman-ai-chat", label: "Daman AI Chat" },
```

Update the test name to reflect the new count (e.g., "shows exactly 9 regulatory-focused nav items").

**Step 2: Run the nav test**

Run: `npx playwright test e2e/fwa-simplified-nav.spec.ts`
Expected: Test passes with 9 items.

**Step 3: Commit**

```bash
git add e2e/fwa-simplified-nav.spec.ts
git commit -m "test(nav): update FWA nav test to include Knowledge & AI items"
```

---

## Task 15: Final Integration Test in Browser

**Files:** None (manual verification)

**Step 1: Start the dev server**

Run: `npm run dev`

**Step 2: Verify the full flow**

1. Navigate to `/fwa/dashboard` — verify chat FAB appears (amber)
2. Click FAB — panel slides out with "Daman AI" title and "Audit & FWA" badge
3. Click a starter question — message appears in chat (may error without documents, but streaming should work)
4. Navigate to `/intelligence/dashboard` — FAB is blue
5. Navigate to `/business/dashboard` — FAB is green
6. Navigate to `/members/dashboard` — FAB is purple
7. Navigate to `/fwa/knowledge-hub` — page loads with stats and document library
8. Click "Upload Documents" — upload dialog opens

**Step 3: Run all E2E tests one final time**

Run: `npx playwright test`
Expected: All tests pass.

**Step 4: Final commit (if any remaining changes)**

```bash
git add -A
git commit -m "feat(chat): complete Daman AI chatbot and Knowledge Hub integration"
```
