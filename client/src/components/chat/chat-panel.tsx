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
