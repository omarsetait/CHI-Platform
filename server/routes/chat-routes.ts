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
