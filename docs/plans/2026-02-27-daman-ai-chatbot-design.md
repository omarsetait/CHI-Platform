# Daman AI Chatbot & Knowledge Hub — Design Document

**Date:** 2026-02-27
**Author:** Product & Engineering
**Status:** Approved

---

## Context

The CHI Platform needs an intelligent chatbot available across all four pillars (FWA, Intelligence, Business, Members) that can answer domain questions using uploaded documents via RAG. The chatbot serves CHI executives during demo presentations and ongoing platform usage.

**Existing infrastructure leveraged:**
- Document upload with PDF/Word/Image extraction (`server/services/document-ingestion-service.ts`)
- Chunking and embedding pipeline using `text-embedding-ada-002` (1536D)
- pgvector semantic search on `knowledge_chunks` table
- OpenAI client with retry logic (`server/utils/openai-utils.ts`)
- 55+ shadcn UI components

---

## Approach: RAG-First Chat with Existing Infrastructure

Leverage the existing document ingestion pipeline, pgvector embeddings, and semantic search. Wire GPT-4o into a chat endpoint that retrieves relevant knowledge chunks, enriches the prompt with pillar context, and streams the response.

---

## Architecture

### System Prompt

A single system prompt defines the chatbot as "Daman AI" — CHI's intelligent regulatory assistant. It receives the active pillar ID and current page path as context, which shapes its focus area without changing personality. The system prompt includes CHI domain knowledge (SBS V3.0, NPHIES, AR-DRG, Saudi regulatory landscape).

### RAG Pipeline Flow

```
User message → Embed query (ada-002) → Semantic search (pgvector, top 5 chunks) →
System prompt + pillar context + retrieved chunks + last 10 messages + user message →
GPT-4o streaming → SSE to client → Persist messages to DB
```

### Knowledge Sources (Prioritized)

1. Uploaded documents via Knowledge Hub (RAG — primary)
2. Platform's synthetic data via API (injected as context summaries in system prompt)
3. GPT-4o's built-in knowledge (fallback)

### Conversation Persistence

Each conversation stores its pillar context. Message history (last 10 turns) included in the prompt for multi-turn context. Conversations scoped per browser session (no auth needed for demo).

---

## Backend Design

### Chat Routes — `server/routes/chat-routes.ts`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chat/conversations` | POST | Create new conversation (stores pillar context) |
| `/api/chat/conversations` | GET | List conversations for current session |
| `/api/chat/conversations/:id/messages` | POST | Send message, returns SSE stream |
| `/api/chat/conversations/:id/messages` | GET | Get message history for a conversation |

### RAG Service — `server/services/chat-rag-service.ts`

Core intelligence layer. When a message arrives:

1. **Embed the query** — call `text-embedding-ada-002` on the user's message
2. **Semantic search** — query `knowledge_chunks` via pgvector cosine similarity, top 5 chunks
3. **Build prompt** — system prompt + pillar context + retrieved chunks + last 10 messages + user message
4. **Stream response** — call GPT-4o with streaming, pipe SSE chunks to client
5. **Persist** — save user message and assistant response to `chat_messages` table

### Database Tables — added to `shared/schema.ts`

**chat_conversations:**
- id (UUID), sessionId, pillarContext (pillar ID + page path), title (auto-generated from first message), createdAt, updatedAt

**chat_messages:**
- id (UUID), conversationId (FK), role (user/assistant/system), content, ragChunkIds (JSON array of knowledge chunk IDs used), createdAt

### System Prompt Structure

```
You are Daman AI, the intelligent assistant for CHI's regulatory platform.
You are currently assisting in the {pillarName} module on the {pageName} page.
Your expertise: FWA detection, provider oversight, market regulation, beneficiary protection.
Saudi context: CHI regulator, NPHIES, SBS V3.0, AR-DRG, ICD-10-AM/ACHI.

Retrieved knowledge:
{ragChunks}

Answer in the same language as the user's question. Be precise, cite sources when available.
```

---

## Frontend Design

### Floating Action Button — `client/src/components/chat/chat-fab.tsx`

Circular button fixed at bottom-right of every pillar page. Uses the pillar's theme color. Renders inside the pillar shell layout — available on every pillar page but not on the home screen.

### Chat Panel — `client/src/components/chat/chat-panel.tsx`

Slide-out panel from the right (~400px wide) using shadcn `Sheet` component:

- **Header**: "Daman AI" title + current pillar badge + close button + "New Chat" button
- **Message list**: Scrollable area with user bubbles (right) and assistant bubbles (left, markdown rendering). Typing indicator during streaming.
- **Input area**: Textarea with send button. Enter to send, Shift+Enter for newline. Suggested starter questions when conversation is empty.

### Suggested Starters (per pillar)

- **FWA**: "What are the top fraud patterns detected this month?"
- **Intelligence**: "Which providers have the lowest SBS V3.0 compliance?"
- **Business**: "What's the current employer compliance rate by sector?"
- **Members**: "How many uninsured beneficiaries are there by region?"

### Streaming

Client uses `fetch` with `ReadableStream` to consume SSE from the backend. Tokens append to the assistant message in real-time.

### State Management

React context `ChatProvider` wraps the pillar shell, holding current conversation ID, message list, and panel open/closed state. Persists conversation ID in `sessionStorage`.

---

## Knowledge Hub Page

### Page — `client/src/pages/fwa/knowledge-hub.tsx`

Added to FWA pillar sidebar under "Knowledge & AI" nav section:

- **Upload zone**: Uses existing `document-upload-dialog.tsx` (drag-and-drop, bilingual, category/authority selection)
- **Document library**: Table with status badges (pending/processing/completed/failed), file type icons, category tags, chunk count, upload date
- **Search**: Text search + semantic search preview to test RAG retrieval
- **Stats header**: Total documents, total chunks, knowledge coverage by category

### FWA Nav Additions

| Nav Item | Path | Purpose |
|----------|------|---------|
| Knowledge Hub | `/fwa/knowledge-hub` | Document management & upload |
| Daman AI Chat | `/fwa/chat` | Full-page chat alternative to floating panel |

Knowledge Hub is only in FWA (flagship pillar) since it's an admin function. The chatbot floating button appears across all pillars.

---

## Auth & Routing

- Chat routes (`/api/chat`) added to auth exempt list in `server/routes.ts`
- Knowledge document routes (`/api/knowledge-documents`) already exempt
- No user authentication required for demo

---

## Success Criteria

- [ ] Floating chat button visible on all pillar pages
- [ ] Chat panel opens/closes smoothly with slide animation
- [ ] Messages stream in real-time (word by word)
- [ ] RAG retrieves relevant chunks from uploaded documents
- [ ] Multi-turn conversation maintains context (10-turn window)
- [ ] Knowledge Hub allows document upload with processing status
- [ ] Document library shows all uploaded docs with metadata
- [ ] Suggested starter questions adapt per pillar
- [ ] Chat works in both English and Arabic
- [ ] E2E test verifies chat panel opens and sends a message
