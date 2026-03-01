import React, { createContext, useContext, useState, useCallback, useRef } from "react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
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
                if (data.sources) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, sources: data.sources }
                        : m
                    )
                  );
                }
                if (data.done) break;
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
