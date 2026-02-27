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
